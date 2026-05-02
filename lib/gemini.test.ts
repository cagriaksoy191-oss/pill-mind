import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  getInteractionContext,
  isOutputSafe,
  isExplanationComplete,
  shouldUseFallback
} from './gemini.ts';

describe('Gemini Library', () => {

  describe('getInteractionContext', () => {
    const mockInteractions = new Map([
      ['int-1', {
        id: 'int-1',
        drug1: 'd1',
        drug2: 'd2',
        severity: 'high',
        summary: 'Serious interaction',
        source: 'Source A'
      }]
    ]);

    const mockDrugs = new Map([
      ['d1', {
        id: 'd1',
        name: 'Drug One',
        activeIngredient: 'Ingredient One',
        category: 'Cat A'
      }],
      ['d2', {
        id: 'd2',
        name: 'Drug Two',
        activeIngredient: 'Ingredient Two',
        category: 'Cat B'
      }]
    ]);

    test('returns correct context for valid interaction', () => {
      const result = getInteractionContext('int-1', mockInteractions, mockDrugs);
      assert.notStrictEqual(result, null);
      if (result) {
        assert.strictEqual(result.drug1Name, 'Drug One');
        assert.strictEqual(result.drug2Name, 'Drug Two');
        assert.strictEqual(result.drug1Ingredient, 'Ingredient One');
        assert.strictEqual(result.drug2Ingredient, 'Ingredient Two');
        assert.strictEqual(result.interaction.id, 'int-1');
      }
    });

    test('falls back to IDs when drug data is missing', () => {
      const emptyDrugs = new Map();
      const result = getInteractionContext('int-1', mockInteractions, emptyDrugs);
      assert.notStrictEqual(result, null);
      if (result) {
        assert.strictEqual(result.drug1Name, 'd1');
        assert.strictEqual(result.drug2Name, 'd2');
        assert.strictEqual(result.drug1Ingredient, '');
        assert.strictEqual(result.drug2Ingredient, '');
      }
    });

    test('returns null for unknown interaction ID', () => {
      const result = getInteractionContext('unknown', mockInteractions, mockDrugs);
      assert.strictEqual(result, null);
    });
  });

  describe('isOutputSafe', () => {
    test('returns true for safe text', () => {
      assert.strictEqual(isOutputSafe('Bu iki ilaç birlikte kullanılabilir ama dikkatli olunmalıdır.'), true);
    });

    test('returns false for unsafe text (kullanmayın)', () => {
      assert.strictEqual(isOutputSafe('Bu ilacı kesinlikle kullanmayın.'), false);
    });

    test('returns false for unsafe text (doz ayarla)', () => {
      assert.strictEqual(isOutputSafe('Doktorunuzla doz ayarlaması yapın.'), false);
    });

    test('is case-insensitive and handles Turkish characters', () => {
      assert.strictEqual(isOutputSafe('REÇETE YAZILMALIDIR'), false);
    });
  });

  describe('isExplanationComplete', () => {
    test('returns true for long, punctuated text', () => {
      const longText = 'Bu iki ilaç arasında orta düzeyde bir etkileşim olabilir. Birini almadan önce diğerinin etkisini beklemek faydalı olabilir. Lütfen bu durumu doktorunuza danışınız. Bu açıklama yeterince uzundur ve sonunda nokta vardır.';
      assert.strictEqual(isExplanationComplete(longText), true);
    });

    test('returns false for very short text', () => {
      assert.strictEqual(isExplanationComplete('Çok kısa.'), false);
    });

    test('returns false for text without proper ending punctuation', () => {
      const noPunctuation = 'Bu metin yeterince uzun olmasına rağmen sonunda herhangi bir noktalama işareti bulunmadığı için başarısız olması beklenmektedir ve şimdi yeterince uzadı herhalde';
      assert.strictEqual(isExplanationComplete(noPunctuation), false);
    });

    test('returns false for conversational filler that is too short', () => {
      assert.strictEqual(isExplanationComplete('Merhaba, tabii ki yardımcı olabilirim. Bu iki ilaç etkilidir.'), false);
    });
  });

  describe('shouldUseFallback', () => {
    test('returns true if DEMO_MODE is true', () => {
      assert.strictEqual(shouldUseFallback(true, 'some-key'), true);
    });

    test('returns true if API key is missing', () => {
      assert.strictEqual(shouldUseFallback(false, ''), true);
    });

    test('returns false if DEMO_MODE is false and API key exists', () => {
      assert.strictEqual(shouldUseFallback(false, 'some-key'), false);
    });
  });
});
