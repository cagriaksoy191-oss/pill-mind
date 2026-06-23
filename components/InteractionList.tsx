import ResultCard from "@/components/ResultCard";
import { CheckResult } from "@/lib/interactions";

interface ExplanationData {
  explanation?: string;
  source?: string;
  generatedAt?: string;
  reason?: string;
  error?: string;
}

interface InteractionListProps {
  interactions: CheckResult[];
  explanations: Record<string, ExplanationData>;
  loadingExplanations: Record<string, boolean>;
  onExplainRequested: (interactionId: string, force: boolean) => Promise<void>;
  handleRequestCoverageExplanation: () => Promise<void>;
  isCoverageLoading: boolean;
}

export default function InteractionList({
  interactions,
  explanations,
  loadingExplanations,
  onExplainRequested,
  handleRequestCoverageExplanation,
  isCoverageLoading,
}: InteractionListProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        {interactions.map((res) => (
          <ResultCard
            key={res.interaction.id}
            interactionId={res.interaction.id}
            drug1Name={res.drug1Name}
            drug2Name={res.drug2Name}
            severity={res.interaction.severity}
            summary={res.interaction.summary}
            source={res.interaction.source}
            sourceLabel={res.interaction.sourceLabel}
            verificationStatus={res.interaction.verificationStatus}
            evidenceLevel={res.interaction.evidenceLevel}
            clinicalDetail={res.interaction.clinicalDetail}
            explanationData={explanations[res.interaction.id]}
            isExplanationLoading={loadingExplanations[res.interaction.id]}
            onExplainRequested={onExplainRequested}
          />
        ))}
      </div>

      {/* Additional option to run a collective full-combination coverage report */}
      <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-5 text-center mt-2">
        <h4 className="font-bold text-white text-xs flex items-center justify-center gap-1.5">
          <span>🧬</span> Tüm Kombinasyonun Canlı AI Analizi
        </h4>
        <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
          Kutudaki tüm ilaçları bir bütün olarak değerlendiren kapsamlı bir tıbbi yapay zeka analizi alın.
        </p>
        <button
          onClick={handleRequestCoverageExplanation}
          disabled={isCoverageLoading}
          className="mt-3 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold text-xs rounded-xl border border-indigo-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
        >
          {isCoverageLoading ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Yükleniyor...
            </>
          ) : (
            "Kapsamlı Canlı AI Analizi Yap"
          )}
        </button>
      </div>
    </div>
  );
}
