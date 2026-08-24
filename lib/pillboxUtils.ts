import { CheckResult } from "@/lib/interactions";

/**
 * Determines border/shadow risk glow based on interactions involving the given drug.
 */
export function getDrugSeverityGlow(drugId: string, interactions: CheckResult[] = []): string {
  if (!interactions || interactions.length === 0) return "";

  const drugInteractions = interactions.filter(
    (int) => int.interaction.drug1 === drugId || int.interaction.drug2 === drugId
  );

  if (drugInteractions.length === 0) return "";

  const severities = drugInteractions.map((int) => int.interaction.severity.toLowerCase());

  if (severities.includes("high")) {
    return "shadow-[0_0_15px_rgba(239,68,68,0.4)] border-red-500/50";
  }
  if (severities.includes("medium")) {
    return "shadow-[0_0_15px_rgba(245,158,11,0.4)] border-amber-500/50";
  }
  if (severities.includes("low")) {
    return "shadow-[0_0_15px_rgba(16,185,129,0.4)] border-emerald-500/50";
  }
  return "";
}
