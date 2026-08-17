import { Drug, CheckResult, ExplanationData, AccumulationWarning, ContraindicationResult, PolypharmacyReport, FoodInteractionResult } from "@/lib/interactions";
import LiveContraindications from "./LiveContraindications";
import LivePolypharmacy from "./LivePolypharmacy";
import LiveAccumulationWarnings from "./LiveAccumulationWarnings";
import LiveSafeState from "./LiveSafeState";
import LiveFoodInteractions from "./LiveFoodInteractions";
import InteractionList from "@/components/InteractionList";
import CoveragePanel from "@/components/CoveragePanel";

interface LiveReportsPanelProps {
  selectedDrugs: Drug[];
  interactions: CheckResult[];
  explanations: Record<string, ExplanationData>;
  accumulationWarnings: AccumulationWarning[];
  contraindications: ContraindicationResult[];
  polypharmacyReport: PolypharmacyReport | null;
  foodInteractions: FoodInteractionResult[];
  loadingExplanations: Record<string, boolean>;
  onExplainRequested: (id: string, force: boolean) => void;
  handleRequestCoverageExplanation: () => void;
  isCoverageLoading: boolean;
  showCoveragePanel: boolean;
  setShowCoveragePanel: (show: boolean) => void;
  coverageExplanation: string | null;
}

export default function LiveReportsPanel({
  selectedDrugs,
  interactions,
  explanations,
  accumulationWarnings,
  contraindications,
  polypharmacyReport,
  foodInteractions,
  loadingExplanations,
  onExplainRequested,
  handleRequestCoverageExplanation,
  isCoverageLoading,
  showCoveragePanel,
  setShowCoveragePanel,
  coverageExplanation,
}: LiveReportsPanelProps) {
  return (
    <>
      {/* 1. Contraindications (Tıbbi Uyumsuzluk) Uyarıları */}
      <LiveContraindications contraindications={contraindications} />

      {/* 2. Polifarmasi & Beers Kriteri Göstergesi */}
      <LivePolypharmacy polypharmacyReport={polypharmacyReport} />

      {/* Accumulation & Overdose Warnings */}
      <LiveAccumulationWarnings accumulationWarnings={accumulationWarnings} />

      {interactions.length === 0 ? (
        /* Reassuring Emerald Green Safe State (Clean check, no interactions) */
        <LiveSafeState
          selectedDrugs={selectedDrugs}
          handleRequestCoverageExplanation={handleRequestCoverageExplanation}
          isCoverageLoading={isCoverageLoading}
        />
      ) : (
        /* Risky Interactions Listed State */
        <InteractionList
          interactions={interactions}
          explanations={explanations}
          loadingExplanations={loadingExplanations}
          onExplainRequested={onExplainRequested}
          handleRequestCoverageExplanation={handleRequestCoverageExplanation}
          isCoverageLoading={isCoverageLoading}
        />
      )}

      {/* 3. Gıda ve Besin Etkileşim Uyarıları */}
      <LiveFoodInteractions foodInteractions={foodInteractions} />

      {/* Global Coverage AI Explanation Display Panel */}
      <CoveragePanel
        showCoveragePanel={showCoveragePanel}
        setShowCoveragePanel={setShowCoveragePanel}
        isCoverageLoading={isCoverageLoading}
        coverageExplanation={coverageExplanation}
        handleRequestCoverageExplanation={handleRequestCoverageExplanation}
        interactions={interactions}
      />
    </>
  );
}
