import { getDrugSeverityGlow } from "@/lib/pillboxUtils";
import { CheckResult } from "@/lib/interactions";

describe("pillboxUtils - getDrugSeverityGlow", () => {
  it("returns empty string when interactions is empty or undefined", () => {
    expect(getDrugSeverityGlow("drug1", [])).toBe("");
    expect(getDrugSeverityGlow("drug1", undefined as unknown as CheckResult[])).toBe("");
  });

  it("returns empty string when drug is not in any interaction", () => {
    const interactions: CheckResult[] = [
      {
        interaction: {
          id: "int1",
          drug1: "drug2",
          drug2: "drug3",
          severity: "high",
          title: "High Risk",
          description: "Desc",
          recommendation: "Rec",
        },
      },
    ];
    expect(getDrugSeverityGlow("drug1", interactions)).toBe("");
  });

  it("returns high severity glow classes when drug has a high severity interaction", () => {
    const interactions: CheckResult[] = [
      {
        interaction: {
          id: "int1",
          drug1: "drug1",
          drug2: "drug2",
          severity: "high",
          title: "High Risk",
          description: "Desc",
          recommendation: "Rec",
        },
      },
    ];
    expect(getDrugSeverityGlow("drug1", interactions)).toBe("shadow-[0_0_15px_rgba(239,68,68,0.4)] border-red-500/50");
  });

  it("returns medium severity glow classes when highest severity is medium", () => {
    const interactions: CheckResult[] = [
      {
        interaction: {
          id: "int1",
          drug1: "drug1",
          drug2: "drug2",
          severity: "medium",
          title: "Medium Risk",
          description: "Desc",
          recommendation: "Rec",
        },
      },
    ];
    expect(getDrugSeverityGlow("drug1", interactions)).toBe("shadow-[0_0_15px_rgba(245,158,11,0.4)] border-amber-500/50");
  });

  it("returns low severity glow classes when highest severity is low", () => {
    const interactions: CheckResult[] = [
      {
        interaction: {
          id: "int1",
          drug1: "drug2",
          drug2: "drug1",
          severity: "low",
          title: "Low Risk",
          description: "Desc",
          recommendation: "Rec",
        },
      },
    ];
    expect(getDrugSeverityGlow("drug1", interactions)).toBe("shadow-[0_0_15px_rgba(16,185,129,0.4)] border-emerald-500/50");
  });
});
