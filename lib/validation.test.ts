import { validateDrugIds, MAX_DRUGS_PER_CHECK } from './validation.ts';
import assert from 'node:assert';
import { test, describe } from 'node:test';

describe('Drug ID Validation', () => {
  test('rejects less than 2 drugs', () => {
    const result = validateDrugIds(['drug1']);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.error, "En az 2 ilaç ID'si gereklidir.");
    assert.strictEqual(result.status, 400);
  });

  test('rejects more than MAX_DRUGS_PER_CHECK drugs', () => {
    const drugIds = Array.from({ length: MAX_DRUGS_PER_CHECK + 1 }, (_, i) => `drug-${i}`);
    const result = validateDrugIds(drugIds);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.error, `Tek seferde en fazla ${MAX_DRUGS_PER_CHECK} ilaç kontrol edilebilir.`);
    assert.strictEqual(result.status, 400);
  });

  test('accepts exactly 2 drugs', () => {
    const result = validateDrugIds(['drug1', 'drug2']);
    assert.strictEqual(result.valid, true);
  });

  test('accepts exactly MAX_DRUGS_PER_CHECK drugs', () => {
    const drugIds = Array.from({ length: MAX_DRUGS_PER_CHECK }, (_, i) => `drug-${i}`);
    const result = validateDrugIds(drugIds);
    assert.strictEqual(result.valid, true);
  });

  test('rejects non-array input', () => {
    const result = validateDrugIds('not-an-array');
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.status, 400);
  });
});
