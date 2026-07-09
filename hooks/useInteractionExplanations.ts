import { useState, useCallback } from "react";
import { ExplanationData } from "@/lib/interactions";

export function useInteractionExplanations() {
  const [explanations, setExplanations] = useState<Record<string, ExplanationData>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});

  const handleExplainRequested = useCallback(async (interactionId: string, _force: boolean) => {
    if (loadingExplanations[interactionId]) return;

    if (_force) {
      console.info(`[PillMind Explain Engine] Force explanation requested for: ${interactionId}`);
    }

    setLoadingExplanations((prev) => ({ ...prev, [interactionId]: true }));
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ interactionId, stream: true }),
      });

      if (!res.ok) {
        throw new Error("Canlı AI açıklaması şu anda üretilemedi.");
      }

      const contentType = res.headers.get("Content-Type") || "";
      if (contentType.includes("text/event-stream")) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let explanationText = "";

        setExplanations((prev) => ({
          ...prev,
          [interactionId]: { source: "gemini_live", explanation: "" },
        }));

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") {
                break;
              }
              try {
                const dataObj = JSON.parse(dataStr);
                if (dataObj.error) {
                  setExplanations((prev) => ({
                    ...prev,
                    [interactionId]: {
                      source: "error",
                      error: dataObj.error,
                      reason: dataObj.code === "UNSAFE_ALERT" || dataObj.code === "REJECTED" ? "safety_block" : "api_error",
                    },
                  }));
                  return;
                }

                if (dataObj.chunk) {
                  explanationText += dataObj.chunk;
                  setExplanations((prev) => ({
                    ...prev,
                    [interactionId]: {
                      source: "gemini_live",
                      explanation: explanationText,
                      generatedAt: dataObj.generatedAt,
                    },
                  }));
                }

                if (dataObj.done) {
                  setExplanations((prev) => ({
                    ...prev,
                    [interactionId]: {
                      source: "gemini_live",
                      explanation: explanationText,
                      generatedAt: dataObj.generatedAt,
                    },
                  }));
                }
              } catch {
                // Ignore parsing errors on split chunks
              }
            }
          }
        }
      } else {
        const data = await res.json();
        setExplanations((prev) => ({ ...prev, [interactionId]: data }));
      }
    } catch (err) {
      console.error("[PillMind Explain Engine] Error:", err);
      setExplanations((prev) => ({
        ...prev,
        [interactionId]: {
          source: "error",
          error: "Canlı AI açıklaması şu anda alınamadı. Lütfen tekrar deneyin.",
          reason: "api_error",
        },
      }));
    } finally {
      setLoadingExplanations((prev) => ({ ...prev, [interactionId]: false }));
    }
  }, [loadingExplanations]);

  return {
    explanations,
    loadingExplanations,
    handleExplainRequested,
  };
}
