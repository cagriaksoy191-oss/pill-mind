export function getGeminiApiKey(): string {
  return process.env.GOOGLE_API_KEY ?? "";
}

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function getPrimaryModel(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
}

export function getModelChain(): string[] {
  const primaryModel = getPrimaryModel();
  return Array.from(
    new Set(["gemini-2.5-flash-lite", primaryModel, "gemini-2.5-flash"])
  );
}

let workingModelIndex = 0;

export function getWorkingModelIndex(): number {
  return workingModelIndex;
}

export function setWorkingModelIndex(index: number): void {
  workingModelIndex = index;
}
