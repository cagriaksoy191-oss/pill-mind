export interface Evidence {
  source: {
    id: string;
    title: string;
    url: string;
  };
  evidenceLevel: string;
  summary: string;
}

interface Mechanism {
  type: string;
  mechanism: string;
  pharmacokinetic: boolean;
  pharmacodynamic: boolean;
}

export interface InteractionRecord {
  id: string;
  drug1: string;
  drug2: string;
  severity: string;
  summary: string;
  source: string;
  evidences?: Evidence[];
  mechanisms?: Mechanism[];
}

export interface DrugRecord {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
}

export interface InteractionContext {
  interaction: InteractionRecord;
  drug1Name: string;
  drug2Name: string;
  drug1Ingredient: string;
  drug2Ingredient: string;
}

export interface CoverageContext {
  drugNames: string[];
  drugIngredients: string[];
}

export interface GeminiExplanationResponse {
  girisCumlesi?: string;
  klinikEtkiAciklamasi?: string;
  hastalaraOneriler?: string | string[];
  hekimYonlendirmesi?: string;
  kaynakOzeti?: string;
  belirsizlikNotu?: string;
  hastaDiliRiskEtiketi?: string;
  hekimModuKisaMekanizma?: string;
  yasakliEylemKontrolu?: string;
  sourceIds?: string[];
}

export interface GeminiResult {
  explanation: string;
  generatedAt: string;
  parsedJSON?: GeminiExplanationResponse;
}

export const EXPLANATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    girisCumlesi: {
      type: "STRING",
      description: "İlaçların adlarını ve etken maddelerini içeren, hastayı paniğe sevk etmeyen Türkçe giriş cümlesi."
    },
    klinikEtkiAciklamasi: {
      type: "STRING",
      description: "Etkileşimin vücutta nasıl gerçekleştiğini, tıp dilinden uzak, sade bir Türkçe ile anlatan açıklama paragrafı."
    },
    hastalaraOneriler: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Hastanın dikkat etmesi gereken önemli belirtiler, semptomlar veya pratik tavsiyeler listesi (en az 2 madde)."
    },
    hekimYonlendirmesi: {
      type: "STRING",
      description: "Hastayı doktoruna veya eczacısına danışması yönünde ikna eden, kesinlikle panik havası yaratmayan son yönlendirme cümlesi."
    },
    kaynakOzeti: {
      type: "STRING",
      description: "AI'nın yalnızca doğrulanmış veritabanı kaynaklarını (Prisma UUID kaynakları) temel aldığını belirten, bilimsel kanıtlara dayalı çok kısa tıbbi referans özeti."
    },
    belirsizlikNotu: {
      type: "STRING",
      description: "Klinik verilerde belirsizlik, eksiklik veya kısıtlı kanıt düzeyi varsa hastayı korkutmayacak şefkatli bir uyarı. Eksiklik yoksa boş bırakılabilir."
    },
    hastaDiliRiskEtiketi: {
      type: "STRING",
      description: "Hastayı paniğe sevk etmeyen, klinik risk derecelendirmesi (örn. 'Hafif Etkileşim / İzlem Önerisi', 'Dikkat Edilmesi Gereken Etkileşim', 'Önemli Etkileşim Riski')."
    },
    hekimModuKisaMekanizma: {
      type: "STRING",
      description: "Hekim modunda gösterilecek farmakokinetik/farmakodinamik mekanizmanın kısa ve net açıklaması."
    },
    yasakliEylemKontrolu: {
      type: "STRING",
      description: "Çıktıda dozaj değişikliği önerilmediği, tedaviyi kesme yönlendirmesi yapılmadığı ve teşhis koyulmadığına dair AI'nın içsel güvenlik beyanı (örn. 'Doz önerisi, tedavi kesme veya teşhis eylemlerinden kaçınılmıştır')."
    },
    sourceIds: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Sağlanan klinik verilerden elde edilen kaynak UUID (Prisma id) listesi."
    }
  },
  required: [
    "girisCumlesi",
    "klinikEtkiAciklamasi",
    "hastalaraOneriler",
    "hekimYonlendirmesi",
    "kaynakOzeti",
    "belirsizlikNotu",
    "hastaDiliRiskEtiketi",
    "hekimModuKisaMekanizma",
    "yasakliEylemKontrolu",
    "sourceIds"
  ]
};
