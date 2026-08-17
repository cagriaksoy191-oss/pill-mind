import { useState } from "react";

export type CoverageExplanation = {
  explanation?: string;
  source?: string;
  generatedAt?: string;
  error?: string;
  reason?: string;
};

async function processEventStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  setCoverageExplanation: (val: CoverageExplanation) => void
) {
  const decoder = new TextDecoder("utf-8");
  let explanationText = "";
  let buffer = "";

  setCoverageExplanation({ source: "gemini_live", explanation: "" });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    buffer += chunk;

    let newlineIdx;
    let lastIdx = 0;
    let hasError = false;

    while ((newlineIdx = buffer.indexOf("\n", lastIdx)) !== -1) {
      const line = buffer.slice(lastIdx, newlineIdx);
      lastIdx = newlineIdx + 1;
      if (line.startsWith("data: ")) {
        const dataStr = line.slice(6).trim();
        if (dataStr === "[DONE]") {
          break;
        }
        try {
          const dataObj = JSON.parse(dataStr);
          if (dataObj.error) {
            setCoverageExplanation({
              source: "error",
              error: dataObj.error,
              reason: dataObj.code === "UNSAFE_ALERT" || dataObj.code === "REJECTED" ? "safety_block" : "api_error",
            });
            hasError = true;
            break;
          }

          if (dataObj.chunk) {
            explanationText += dataObj.chunk;
            setCoverageExplanation({
              source: "gemini_live",
              explanation: explanationText,
              generatedAt: dataObj.generatedAt,
            });
          }

          if (dataObj.done) {
            setCoverageExplanation({
              source: "gemini_live",
              explanation: explanationText,
              generatedAt: dataObj.generatedAt,
            });
          }
        } catch {
          // Ignore parsing errors on split chunks
        }
      }
    }
    if (hasError) {
      return;
    }
    buffer = buffer.slice(lastIdx);
  }
}

export function useCoverageExplanation(selectedDrugIds: string[]) {
  const [coverageExplanation, setCoverageExplanation] = useState<CoverageExplanation | null>(null);
  const [isCoverageLoading, setIsCoverageLoading] = useState(false);
  const [showCoveragePanel, setShowCoveragePanel] = useState(false);

  const handleRequestCoverageExplanation = async () => {
    if (selectedDrugIds.length < 2 || isCoverageLoading) return;

    setIsCoverageLoading(true);
    setShowCoveragePanel(true);
    setCoverageExplanation(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ drugIds: selectedDrugIds, stream: true }),
      });

      if (!res.ok) {
        throw new Error("Canlı AI kombinasyon analizi şu anda oluşturulamadı.");
      }

      const contentType = res.headers.get("Content-Type") || "";
      if (contentType.includes("text/event-stream")) {
        const reader = res.body?.getReader();
        if (reader) {
          await processEventStream(reader, setCoverageExplanation as (val: CoverageExplanation) => void);
        }
      } else {
        const data = await res.json();
        setCoverageExplanation(data);
      }
    } catch (err) {
      console.error("[PillMind Coverage Engine] Error:", err);
      setCoverageExplanation({
        source: "error",
        error: "Canlı AI kombinasyon analizi şu anda oluşturulamadı. Lütfen daha sonra tekrar deneyin.",
        reason: "api_error",
      });
    } finally {
      setIsCoverageLoading(false);
    }
  };

  return {
    coverageExplanation,
    setCoverageExplanation,
    isCoverageLoading,
    showCoveragePanel,
    setShowCoveragePanel,
    handleRequestCoverageExplanation,
  };
}
