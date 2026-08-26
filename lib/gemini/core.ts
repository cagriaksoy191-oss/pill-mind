import {
  InteractionContext,
  CoverageContext,
  GeminiResult,
} from "./types";
import {
  getGeminiApiKey,
  getModelChain,
  getWorkingModelIndex,
  setWorkingModelIndex,
} from "./config";
import {
  isOutputSafe,
  isExplanationComplete,
  runReviewerAgent,
} from "./safety";
import {
  buildInteractionPrompt,
  buildCoveragePrompt,
  buildGeminiPayload,
} from "./prompts";
import { parseGeminiResponse, formatExplanation } from "./formatter";

function createTimeoutReject(ms: number, message: string) {
  let timeoutId: NodeJS.Timeout;
  const promise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });
  return {
    promise,
    cancel: () => clearTimeout(timeoutId),
  };
}

async function executeGeminiRequest(model: string, payload: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "unknown");
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const finishReason: string | undefined = candidate?.finishReason;

  let rawText = "";
  const parts = candidate?.content?.parts ?? [];
  const partsLen = parts.length;
  for (let i = 0; i < partsLen; i++) {
    const part = parts[i];
    if (typeof part?.text === "string" && part.text) {
      rawText += part.text;
    }
  }

  if (!rawText) {
    throw new Error("Modelden boş yanıt alındı.");
  }

  if (finishReason && finishReason !== "STOP") {
    throw new Error(`Model yanıtı tamamlanamadı (${finishReason})`);
  }

  return rawText;
}

async function executeGeminiChainTask(
  model: string,
  payload: string
): Promise<GeminiResult> {
  const rawText = await executeGeminiRequest(model, payload);
  const parsedJSON = parseGeminiResponse(rawText);
  const compiledExplanation = formatExplanation(parsedJSON);

  if (!isOutputSafe(compiledExplanation)) {
    throw new Error("AI çıktısı klinik güvenlik kurallarını (regex) ihlal ediyor.");
  }

  const safetyCheckResult = await runReviewerAgent(compiledExplanation, model);
  if (!safetyCheckResult) {
    throw new Error("AI çıktısı klinik güvenlik kurallarını (Reviewer Agent) ihlal ediyor.");
  }

  if (!isExplanationComplete(compiledExplanation)) {
    throw new Error("Üretilen klinik açıklama yetersiz uzunlukta.");
  }

  return {
    explanation: compiledExplanation,
    generatedAt: new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date()),
    parsedJSON: parsedJSON,
  };
}

async function callGeminiWithPrompt(prompt: string): Promise<GeminiResult> {
  const payload = buildGeminiPayload(prompt);
  const SPECULATIVE_TIMEOUT_MS = 2500; // Launch next model if current takes longer than this

  const runningTasks: Promise<GeminiResult>[] = [];
  const modelChain = getModelChain();
  let workingIndex = getWorkingModelIndex();

  for (let i = 0; i < modelChain.length; i++) {
    const actualIndex = (workingIndex + i) % modelChain.length;
    const model = modelChain[actualIndex];

    // Start the current task
    const taskPromise = executeGeminiChainTask(model, payload)
      .then((res) => {
        setWorkingModelIndex(actualIndex);
        return res;
      })
      .catch((error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        console.warn(`[GEMINI] Model ${model} başarısız oldu: ${err.message}`);
        throw err;
      });

    runningTasks.push(taskPromise);

    // If this is the last model, just wait for the fastest successful one we have running
    if (i === modelChain.length - 1) {
      break;
    }

    // Wait for either ANY running task to succeed/fail OR the speculative timeout to trigger
    const timeout = createTimeoutReject(SPECULATIVE_TIMEOUT_MS, "SPECULATIVE_TIMEOUT");
    try {
      // Race the timeout against the first running task to resolve (successfully or otherwise)
      const result = await Promise.race([
        Promise.any(runningTasks),
        timeout.promise,
      ]);
      timeout.cancel();
      // If ANY task succeeds before timeout, return immediately!
      return result;
    } catch (error) {
      timeout.cancel();
      if (error instanceof Error && error.message === "SPECULATIVE_TIMEOUT") {
        // Models are taking too long. Continue to the next iteration to start the fallback model speculatively.
        console.info(
          `[GEMINI] Model ${model} is taking longer than ${SPECULATIVE_TIMEOUT_MS}ms. Launching fallback speculatively.`
        );
      } else {
        // All currently running models failed quickly.
        // Record error and continue to start the next model.
      }
    }
  }

  try {
    return await Promise.any(runningTasks);
  } catch {
    console.error("[GEMINI] Tüm modeller başarısız oldu.");
    throw new Error("Tüm Gemini modelleri başarısız oldu.");
  }
}

export async function callGeminiForInteraction(
  ctx: InteractionContext
): Promise<GeminiResult> {
  return callGeminiWithPrompt(buildInteractionPrompt(ctx));
}

export async function callGeminiForCoverage(
  ctx: CoverageContext
): Promise<GeminiResult> {
  return callGeminiWithPrompt(buildCoveragePrompt(ctx));
}

async function executeSpeculativeStreamFetch(
  payload: string,
  controller: AbortController
): Promise<Response> {
  const SPECULATIVE_TIMEOUT_MS = 1500;
  const apiKey = getGeminiApiKey();
  const modelChain = getModelChain();
  let workingIndex = getWorkingModelIndex();

  const fetchModel = async (model: string): Promise<Response> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`API Error ${response.status}`);
    }
    if (!response.body) {
      throw new Error("No response body");
    }
    return response;
  };

  const runningTasks: Promise<Response>[] = [];
  let successResponse: Response | null = null;
  let lastError: Error | null = null;

  for (let i = 0; i < modelChain.length; i++) {
    const actualIndex = (workingIndex + i) % modelChain.length;
    const model = modelChain[actualIndex];

    const taskPromise = fetchModel(model)
      .then((res) => {
        setWorkingModelIndex(actualIndex);
        return res;
      })
      .catch((err) => {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[GEMINI STREAM] Model ${model} failed:`, err);
        throw err;
      });
    runningTasks.push(taskPromise);

    if (i === modelChain.length - 1) {
      break;
    }

    const timeout = createTimeoutReject(SPECULATIVE_TIMEOUT_MS, "SPECULATIVE_TIMEOUT");
    try {
      successResponse = await Promise.race([
        Promise.any(runningTasks),
        timeout.promise,
      ]);
      timeout.cancel();
      break;
    } catch (error) {
      timeout.cancel();
      if (error instanceof Error && error.message === "SPECULATIVE_TIMEOUT") {
        console.info(
          `[GEMINI STREAM] Model ${model} is taking longer than ${SPECULATIVE_TIMEOUT_MS}ms. Launching fallback speculatively.`
        );
      }
    }
  }

  if (!successResponse) {
    try {
      successResponse = await Promise.any(runningTasks);
    } catch {
      throw lastError || new Error("All models in the stream chain failed.");
    }
  }

  return successResponse;
}

async function* parseGeminiStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<string, void, unknown> {
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let braceCount = 0;
  let startIdx = -1;
  let scanIndex = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (scanIndex < buffer.length) {
      const char = buffer[scanIndex];
      if (char === "{") {
        if (braceCount === 0) {
          startIdx = scanIndex;
        }
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0 && startIdx !== -1) {
          const jsonStr = buffer.substring(startIdx, scanIndex + 1);
          try {
            const obj = JSON.parse(jsonStr);
            const chunkText = obj?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (typeof chunkText === "string" && chunkText) {
              yield chunkText;
            }
          } catch {
            // parsing errors are silently ignored on partial chunks
          }
          // Remove parsed chunk from buffer
          buffer = buffer.substring(scanIndex + 1);
          scanIndex = -1;
          startIdx = -1;
        }
      }
      scanIndex++;
    }
  }
}

export async function* streamGeminiContent(
  prompt: string
): AsyncGenerator<string, void, unknown> {
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 512,
      topP: 0.92,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
    ],
  });

  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  try {
    const response = await executeSpeculativeStreamFetch(payload, controller);
    reader = response.body!.getReader();
    yield* parseGeminiStream(reader);
  } finally {
    if (reader && typeof reader.releaseLock === "function") reader.releaseLock();
    controller.abort();
  }
}
