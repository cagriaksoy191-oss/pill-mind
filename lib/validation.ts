
// Abstract validation logic for easier testing
export const MAX_DRUGS_PER_CHECK = 50;

export function validateDrugIds(drugIds: unknown): { valid: true } | { valid: false; error: string; status: number } {
  if (!drugIds || !Array.isArray(drugIds) || drugIds.length < 2) {
    return {
      valid: false,
      error: "En az 2 ilaç ID'si gereklidir.",
      status: 400
    };
  }

  if (drugIds.length > MAX_DRUGS_PER_CHECK) {
    return {
      valid: false,
      error: `Tek seferde en fazla ${MAX_DRUGS_PER_CHECK} ilaç kontrol edilebilir.`,
      status: 400
    };
  }

  return { valid: true };
}
