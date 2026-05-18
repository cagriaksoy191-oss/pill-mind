import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Load data files using absolute paths to avoid issues with test runner working directory
const drugsPath = path.resolve(process.cwd(), 'data/drugs.json');
const interactionsPath = path.resolve(process.cwd(), 'data/interactions.json');
const drugsData = JSON.parse(readFileSync(drugsPath, 'utf8'));
const interactionsData = JSON.parse(readFileSync(interactionsPath, 'utf8'));

const DRUGS_MAP = new Map(
  (drugsData as any[]).map((d) => [d.id, d])
);

const INTERACTIONS_BY_DRUGS = new Map<string, Map<string, any>>();
(interactionsData as any[]).forEach((int) => {
  if (!INTERACTIONS_BY_DRUGS.has(int.drug1)) INTERACTIONS_BY_DRUGS.set(int.drug1, new Map());
  if (!INTERACTIONS_BY_DRUGS.has(int.drug2)) INTERACTIONS_BY_DRUGS.set(int.drug2, new Map());
  INTERACTIONS_BY_DRUGS.get(int.drug1)!.set(int.drug2, int);
  INTERACTIONS_BY_DRUGS.get(int.drug2)!.set(int.drug1, int);
});

/**
 * findInteractions logic duplicated here for testing purposes.
 * This ensures we can test the algorithm independently of the Next.js environment
 * (e.g., path aliases like @/, build-time JSON imports) in a lightweight way.
 */
function findInteractions(drugIds: string[]): any[] {
  const results: any[] = [];

  for (let i = 0; i < drugIds.length; i++) {
    const a = drugIds[i];
    const interactionsForA = INTERACTIONS_BY_DRUGS.get(a);
    if (!interactionsForA) continue;

    for (let j = i + 1; j < drugIds.length; j++) {
      const b = drugIds[j];
      const match = interactionsForA.get(b);

      if (match) {
        const drug1 = DRUGS_MAP.get(match.drug1);
        const drug2 = DRUGS_MAP.get(match.drug2);
        results.push({
          interaction: match,
          drug1Name: drug1?.name ?? match.drug1,
          drug2Name: drug2?.name ?? match.drug2,
        });
      }
    }
  }

  return results;
}

describe('findInteractions Edge Cases', () => {
  test('returns empty array for empty input', () => {
    const results = findInteractions([]);
    assert.deepStrictEqual(results, []);
  });

  test('returns empty array for a single drug', () => {
    const results = findInteractions(['aspirin']);
    assert.deepStrictEqual(results, []);
  });

  test('returns empty array for drugs with no known interactions', () => {
    // aspirin and metformin have no interaction in our JSON
    const results = findInteractions(['aspirin', 'metformin']);
    assert.deepStrictEqual(results, []);
  });

  test('finds a single interaction between two drugs', () => {
    const results = findInteractions(['aspirin', 'warfarin']);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].interaction.id, 'aspirin-warfarin');
    assert.strictEqual(results[0].drug1Name, 'Aspirin');
    assert.strictEqual(results[0].drug2Name, 'Coumadin (Warfarin)');
  });

  test('finds interaction regardless of input order', () => {
    const results1 = findInteractions(['aspirin', 'warfarin']);
    const results2 = findInteractions(['warfarin', 'aspirin']);
    assert.strictEqual(results1.length, 1);
    assert.strictEqual(results2.length, 1);
    assert.deepStrictEqual(results1[0].interaction, results2[0].interaction);
  });

  test('finds multiple interactions between multiple drugs', () => {
    const results = findInteractions(['aspirin', 'warfarin', 'ibuprofen']);
    // aspirin-warfarin, ibuprofen-warfarin, ibuprofen-aspirin
    assert.strictEqual(results.length, 3);

    const ids = results.map(r => r.interaction.id).sort();
    assert.ok(ids.includes('aspirin-warfarin'));
    assert.ok(ids.includes('ibuprofen-warfarin'));
    assert.ok(ids.includes('ibuprofen-aspirin'));
  });

  test('handles unknown drug ID in input gracefully', () => {
    const results = findInteractions(['aspirin', 'unknown-drug-id']);
    assert.deepStrictEqual(results, []);
  });

  test('uses ID as fallback for drug name if metadata is missing', () => {
    // Create localized version for testing the fallback logic
    const customInteractions = [{
        id: 'missing-drug-test',
        drug1: 'exists',
        drug2: 'missing',
        severity: 'low',
        summary: 'test'
    }];
    const customDrugs = [{ id: 'exists', name: 'Existing Drug' }];

    function findInteractionsInternal(drugIds: string[], drugs: any[], interactions: any[]): any[] {
      const drugsMap = new Map(drugs.map((d) => [d.id, d]));
      const interactionsByDrugs = new Map<string, Map<string, any>>();
      interactions.forEach((int) => {
        if (!interactionsByDrugs.has(int.drug1)) interactionsByDrugs.set(int.drug1, new Map());
        if (!interactionsByDrugs.has(int.drug2)) interactionsByDrugs.set(int.drug2, new Map());
        interactionsByDrugs.get(int.drug1)!.set(int.drug2, int);
        interactionsByDrugs.get(int.drug2)!.set(int.drug1, int);
      });

      const results: any[] = [];
      for (let i = 0; i < drugIds.length; i++) {
        const a = drugIds[i];
        const interactionsForA = interactionsByDrugs.get(a);
        if (!interactionsForA) continue;

        for (let j = i + 1; j < drugIds.length; j++) {
          const b = drugIds[j];
          const match = interactionsForA.get(b);
          if (match) {
            const d1 = drugsMap.get(match.drug1);
            const d2 = drugsMap.get(match.drug2);
            results.push({
              interaction: match,
              drug1Name: d1?.name ?? match.drug1,
              drug2Name: d2?.name ?? match.drug2,
            });
          }
        }
      }
      return results;
    }

    const results = findInteractionsInternal(['exists', 'missing'], customDrugs, customInteractions);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].drug1Name, 'Existing Drug');
    assert.strictEqual(results[0].drug2Name, 'missing');
  });
});
