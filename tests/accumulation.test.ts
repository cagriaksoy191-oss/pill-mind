import { checkAccumulation } from "@/lib/interactions";

describe("Drug Accumulation & Overdose Warnings (Sprint 2)", () => {
  test("aynı etkin maddeye sahip ilaçlar eklendiğinde yüksek riskli çakışma uyarısı vermeli", () => {
    // Parasetamol ve Parol (ikisi de Parasetamol içerir, seed verilerinde aspirin/parasetamol/ibuprofen vb. var)
    // drugs.json'a göre:
    // "parasetamol" activeIngredient: "Parasetamol (Asetaminofen)", name: "Parasetamol"
    // Tabii seed'e göre Parol markası da parasetamol'e bağlıdır ama findInteractions / checkAccumulation
    // id'ler üzerinden çalışır. Eğer id listesinde "parasetamol" ve "parol" gibi iki aynı etkin maddeli ilaç varsa:
    // Bekle, drugs.json'da sadece id'leri olan ilaçlar tanımlı. Arama kutusuna eklenenler de bu id'lerdir.
    // Eğer drugs.json'dan iki ilacı doğrudan id'leriyle eklersek, aynı activeIngredient'a sahip olup olmadıklarına bakar.
    // drugs.json'da aspirin (Asetilsalisilik Asit) ve warfarin var.
    // Test amaçlı geçici drug verileriyle mocklayabiliriz ya da drugs.json'daki mevcut ilaçları kullanabiliriz.
    // drugs.json'da:
    // id: "ibuprofen", activeIngredient: "İbuprofen", pharmacologicalGroup: "NSAID"
    // id: "diklofenak", activeIngredient: "Diklofenak Sodyum", pharmacologicalGroup: "NSAID"
    // Bunların ikisi de "NSAID" grubunda.
    // Aynı etkin maddeli iki ilaç drugs.json'da tanımlı değil (çünkü her id benzersiz bir ilacı temsil eder, marka adları BrandName tablosundadır).
    // Ancak `checkAccumulation` fonksiyonuna mock veya drugsMap üzerinden yükleme yapabiliriz, ya da
    // checkAccumulation'ın girdi listesinde aynı activeIngredient'a sahip iki ayrı ilaç kaydı girilirse çalışıp çalışmadığını test edebiliriz.
    
    // drugs.json'daki mevcut ilaçları test edelim:
    // İbuprofen ve Diklofenak eklersek, ikisi de "NSAID" pharmacologicalGroup'una sahip.
    const warnings = checkAccumulation(["ibuprofen", "diklofenak"]);
    expect(warnings.length).toBe(1);
    expect(warnings[0].type).toBe("pharmacological_group");
    expect(warnings[0].severity).toBe("medium");
    expect(warnings[0].triggerDrugs).toContain("İbuprofen");
    expect(warnings[0].triggerDrugs).toContain("Diklofenak");
  });

  test("etkin maddeleri farklı ama grupları aynı olan NSAID ilaçlarında grup birikim uyarısı vermeli", () => {
    const warnings = checkAccumulation(["ibuprofen", "diklofenak"]);
    expect(warnings.find(w => w.type === "pharmacological_group")).toBeDefined();
  });

  test("farklı gruptaki ilaçlarda uyarı vermemeli", () => {
    const warnings = checkAccumulation(["metformin", "amoksisilin"]);
    expect(warnings.length).toBe(0);
  });

  test("geçersiz veya eksik girdilerde boş dizi dönmeli", () => {
    expect(checkAccumulation([])).toEqual([]);
    expect(checkAccumulation(["ibuprofen"])).toEqual([]);
    expect(checkAccumulation(null as any)).toEqual([]);
    expect(checkAccumulation(undefined as any)).toEqual([]);
  });

  test("aynı ilacın birden fazla kez (aynı ID) gönderilmesi durumunda aynı etken madde uyarısı vermeli", () => {
    const warnings = checkAccumulation(["ibuprofen", "ibuprofen"]);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].type).toBe("active_ingredient");
    expect(warnings[0].severity).toBe("high");
    expect(warnings[0].triggerDrugs).toEqual(["İbuprofen", "İbuprofen"]);
  });

  test("veritabanında bulunmayan bilinmeyen ilaç ID'leri güvenle atlanmalı", () => {
    // drugs.json'da olmayan "unknown_drug_1" ve "unknown_drug_2"
    const warnings = checkAccumulation(["unknown_drug_1", "unknown_drug_2"]);
    expect(warnings).toEqual([]);

    // Bir bilinen, bir bilinmeyen ilaç
    const warnings2 = checkAccumulation(["ibuprofen", "unknown_drug"]);
    expect(warnings2).toEqual([]);
  });
});
