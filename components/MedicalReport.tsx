import { CheckResult, AccumulationWarning, FoodInteractionResult, ContraindicationResult, PolypharmacyReport, ExplanationData, Drug } from "@/lib/interactions";
import ReportHeader from "./MedicalReportSections/ReportHeader";
import SelectedDrugsList from "./MedicalReportSections/SelectedDrugsList";
import AccumulationWarnings from "./MedicalReportSections/AccumulationWarnings";
import Contraindications from "./MedicalReportSections/Contraindications";
import PolypharmacyReportSection from "./MedicalReportSections/PolypharmacyReport";
import FoodInteractions from "./MedicalReportSections/FoodInteractions";
import DrugInteractions from "./MedicalReportSections/DrugInteractions";
import Disclaimer from "./MedicalReportSections/Disclaimer";

interface MedicalReportProps {
  selectedDrugs: Drug[];
  accumulationWarnings: AccumulationWarning[];
  contraindications: ContraindicationResult[];
  polypharmacyReport: PolypharmacyReport | null;
  foodInteractions: FoodInteractionResult[];
  interactions: CheckResult[];
  explanations: Record<string, ExplanationData>;
}

export default function MedicalReport({
  selectedDrugs,
  accumulationWarnings,
  contraindications,
  polypharmacyReport,
  foodInteractions,
  interactions,
  explanations,
}: MedicalReportProps) {
  return (
    <>
      {/* Print Only Content (A4 Medical Report Template) */}
      <div className="hidden print:block w-full max-w-4xl mx-auto p-6 bg-white text-slate-950 font-sans">
        <ReportHeader />

        {/* İlaç Kutusu İçeriği */}
        <SelectedDrugsList selectedDrugs={selectedDrugs} />

        {/* Aşırı Doz / Duplicate Uyarıları (Baskıda gösterilir) */}
        <AccumulationWarnings accumulationWarnings={accumulationWarnings} />

        {/* Kontrendikasyon Raporu (Baskıda gösterilir) */}
        <Contraindications contraindications={contraindications} />

        {/* Polifarmasi ve Beers Kriterleri Raporu (Baskıda gösterilir) */}
        <PolypharmacyReportSection polypharmacyReport={polypharmacyReport} />

        {/* Gıda ve Besin Etkileşim Raporu (Baskıda gösterilir) */}
        <FoodInteractions foodInteractions={foodInteractions} />

        {/* Etkileşim Raporu (Baskıda gösterilir) */}
        <DrugInteractions interactions={interactions} explanations={explanations} />

        {/* Klinik Yasal Uyarı Disclaimer */}
        <Disclaimer />
      </div>
    </>
  );
}
