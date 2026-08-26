import { InteractionContext, CoverageContext, EXPLANATION_SCHEMA } from "./types";

export function buildInteractionPrompt(ctx: InteractionContext): string {
  const severityLabel =
    ctx.interaction.severity === "high"
      ? "yüksek"
      : ctx.interaction.severity === "medium"
        ? "orta"
        : "düşük";

  return `Sen Sağlık İletişim Asistanı ve Tıbbi Yapay Zeka Güvenlik Uzmanısın.
Görevin, doğrulanmış ilaç etkileşim özetini hastanın anlayacağı sade Türkçe ile açıklamak.

HAYATİ KURALLAR:
- Asla "Merhaba" veya hitap cümlesi kullanma.
- Tıbbi jargonu basit dille açıkla.
- Teşhis koyma, tedavi önerme, doz önerme, muadil önerme.
- "kesinlikle güvenli", "kullanmayın", "bırakın" gibi hekim yerine geçen kesin klinik yönlendirmeler ASLA yapma.
- Son cümlede mutlaka doktor veya eczacıya danışılması gerektiğini belirt.
- YALNIZCA aşağıdaki doğrulanmış kanıt ve mekanizma verilerine sadık kal (RAG Grounding). Kesinlikle veride bulunmayan kaynak uydurma.

İlaç 1: ${ctx.drug1Name} (Etken madde: ${ctx.drug1Ingredient})
İlaç 2: ${ctx.drug2Name} (Etken madde: ${ctx.drug2Ingredient})
Şiddet Derecesi: ${severityLabel}
Doğrulanmış Tıbbi Özet: ${ctx.interaction.summary}

Doğrulanmış Veritabanı Kanıtları:
${(() => {
  const evs = ctx.interaction.evidences;
  if (!evs || evs.length === 0) return "Bulunmuyor";
  const len = evs.length;
  const arr = new Array(len);
  for (let i = 0; i < len; i++) {
    const e = evs[i];
    arr[i] = "- Kaynak ID: " + e.source.id + ", Başlık: " + e.source.title + ", URL: " + e.source.url + ", Seviye: " + e.evidenceLevel + ", Özet: " + e.summary;
  }
  return arr.join("\n");
})()}

Doğrulanmış Veritabanı Mekanizmaları:
${(() => {
  const mecs = ctx.interaction.mechanisms;
  if (!mecs || mecs.length === 0) return "Bulunmuyor";
  const len = mecs.length;
  const arr = new Array(len);
  for (let i = 0; i < len; i++) {
    const m = mecs[i];
    arr[i] = "- Tür: " + m.type + ", Detay: " + m.mechanism + ", Farmakokinetik: " + (m.pharmacokinetic ? "Evet" : "Hayır") + ", Farmakodinamik: " + (m.pharmacodynamic ? "Evet" : "Hayır");
  }
  return arr.join("\n");
})()}

JSON şemasındaki 'sourceIds' alanını mutlaka yukarıda listelenen Kaynak ID'leri (UUID formatında) ile doldur. 'kaynakOzeti' kısmında ise sadece bu kanıtlara dayalı bir özet yaz.
Şimdi, tanımlanan JSON şemasındaki alanları yukarıdaki kurallara tam olarak uyarak doldur.`;
}

export function buildCoveragePrompt(ctx: CoverageContext): string {
  return `Sen Sağlık İletişim Asistanı ve Tıbbi Yapay Zeka Güvenlik Uzmanısın.
Görevin: Aşağıdaki ilaç kombinasyonu için doğrulanmış demo veri setimizde hazır bir etkileşim kaydı bulunmadığını kullanıcıya sade Türkçe ile açıklamak.

HAYATİ KURALLAR:
- Gerçek hayatta bu ilaçlar arasında etkileşim vardır veya yoktur diye hüküm verme.
- Risk değerlendirmesi uydurma.
- Teşhis, tanı veya doz önerisi yapma.
- "kullanmayın", "bırakın" gibi hekim kararı yerine geçen kesin klinik emirler verme.
- Şunu net olarak anlat: Bu kombinasyon mevcut sınırlı doğrulanmış demo veri setimizde kayıtlı değil, bu yüzden sistem kesin bir tıbbi yorum yapmıyor.
- Son cümlede mutlaka hekime veya eczacıya danışılması gerektiğini belirt.

Seçilen ilaçlar: ${ctx.drugNames.join(", ")}
Etken maddeler: ${ctx.drugIngredients.join(", ")}

Şimdi, tanımlanan JSON şemasındaki alanları yukarıdaki kurallara tam olarak uyarak doldur.`;
}

export function buildGeminiPayload(prompt: string): string {
  return JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 512,
      topP: 0.92,
      responseMimeType: "application/json",
      responseSchema: EXPLANATION_SCHEMA
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
    ],
  });
}

export function buildInteractionStreamPrompt(ctx: InteractionContext): string {
  const severityLabel =
    ctx.interaction.severity === "high"
      ? "yüksek"
      : ctx.interaction.severity === "medium"
        ? "orta"
        : "düşük";

  return `Sen Sağlık İletişim Asistanı ve Tıbbi Yapay Zeka Güvenlik Uzmanısın.
Görevin, doğrulanmış ilaç etkileşim özetini hastanın anlayacağı sade Türkçe ile açıklamak.

HAYATİ KURALLAR:
- Asla "Merhaba" veya hitap cümlesi kullanma.
- Tıbbi jargonu basit dille açıkla.
- Teşhis koyma, tedavi önerme, doz önerme, muadil önerme.
- "kesinlikle güvenli", "kullanmayın", "bırakın" gibi hekim yerine geçen kesin klinik yönlendirmeler ASLA yapma.
- Son cümlede mutlaka doktor veya eczacıya danışılması gerektiğini belirt.

İlaç 1: ${ctx.drug1Name} (Etken madde: ${ctx.drug1Ingredient})
İlaç 2: ${ctx.drug2Name} (Etken madde: ${ctx.drug2Ingredient})
Şiddet Derecesi: ${severityLabel}
Doğrulanmış Tıbbi Özet: ${ctx.interaction.summary}

Lütfen yukarıdaki kurallara tam olarak uyarak sade bir Türkçe ile doğrudan açıklama metnini oluştur.`;
}

export function buildCoverageStreamPrompt(ctx: CoverageContext): string {
  return `Sen Sağlık İletişim Asistanı ve Tıbbi Yapay Zeka Güvenlik Uzmanısın.
Görevin: Aşağıdaki ilaç kombinasyonu için doğrulanmış demo veri setimizde hazır bir etkileşim kaydı bulunmadığını kullanıcıya sade Türkçe ile açıklamak.

HAYATİ KURALLAR:
- Gerçek hayatta bu ilaçlar arasında etkileşim vardır veya yoktur diye hüküm verme.
- Risk değerlendirmesi uydurma.
- Teşhis, tanı veya doz önerisi yapma.
- "kullanmayın", "bırakın" gibi hekim kararı yerine geçen kesin klinik emirler verme.
- Şunu net olarak anlat: Bu kombinasyon mevcut sınırlı doğrulanmış demo veri setimizde kayıtlı değil, bu yüzden sistem kesin bir tıbbi yorum yapmıyor.
- Son cümlede mutlaka hekime veya eczacıya danışılması gerektiğini belirt.

Seçilen ilaçlar: ${ctx.drugNames.join(", ")}
Etken maddeler: ${ctx.drugIngredients.join(", ")}

Lütfen yukarıdaki kurallara tam olarak uyarak sade bir Türkçe ile doğrudan açıklama metnini oluştur.`;
}
