import { useState } from "react";

export function useCoverageExplanation(selectedDrugIds: string[]) {
  const [coverageExplanation, setCoverageExplanation] = useState<{
    explanation?: string;
    source?: string;
    generatedAt?: string;
    error?: string;
    reason?: string;
  } | null>(null);
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
        const decoder = new TextDecoder("utf-8");
        let explanationText = "";

        setCoverageExplanation({ source: "gemini_live", explanation: "" });

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
                  setCoverageExplanation({
                    source: "error",
                    error: dataObj.error,
                    reason: dataObj.code === "UNSAFE_ALERT" || dataObj.code === "REJECTED" ? "safety_block" : "api_error",
                  });
                  return;
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
