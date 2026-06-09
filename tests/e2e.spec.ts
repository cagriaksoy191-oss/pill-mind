// tests/e2e.spec.ts
import { test, expect } from "@playwright/test";

test.describe("PillMind Faz 4 & 5 E2E ve WCAG Erişilebilirlik Testleri", () => {
  
  test.beforeEach(async ({ page }) => {
    // Portalı aç
    await page.goto("http://localhost:3000/kontrol");
  });

  test("Başlangıç durumunun doğrulanması (Initial State Check)", async ({ page }) => {
    // Sayfa başlığını doğrula
    await expect(page).toHaveTitle(/PillMind/);

    // Başlangıçta boş ilaç kutusu mesajını doğrula
    const emptyBoxMsg = page.locator("text=Kutunuz şu an boş");
    await expect(emptyBoxMsg).toBeVisible();

    // Durum rozetinin başlangıç durumunu doğrula
    const statusBadge = page.locator(".border", { hasText: "İlaç Bekleniyor" });
    await expect(statusBadge).toBeVisible();
  });

  test("Fuzzy Search Klavye ile Gezinme ve Seçim (Autocomplete & Accessibility Keys)", async ({ page }) => {
    const searchInput = page.locator("input[aria-label='İlaç Arama ve Ekleme Kutusu']");
    
    // Arama kutusuna yanlış yazımla "aspirin" arat
    await searchInput.fill("asprn");
    await expect(searchInput).toHaveAttribute("aria-expanded", "true");

    const dropdownList = page.locator("role=listbox");
    await expect(dropdownList).toBeVisible();

    // Klavyeyle gezinmeyi simüle et (ArrowDown ve Enter)
    await searchInput.press("ArrowDown");
    
    const highlightedOption = dropdownList.locator("button[aria-selected='true']");
    await expect(highlightedOption).toBeVisible();

    // Enter tuşuna basarak ilacı kutuya ekle
    await searchInput.press("Enter");

    // Arama kutusunun temizlendiğini ve dropdown'ın kapandığını doğrula
    await expect(searchInput).toHaveValue("");
    await expect(dropdownList).not.toBeVisible();

    // İlacın 3D kutuya eklendiğini ve chip olarak göründüğünü doğrula
    const selectedChip = page.locator("[aria-live='polite']").locator("text=Aspirin");
    await expect(selectedChip).toBeVisible();

    const activeCountBadge = page.locator("text=1 Aktif İlaç");
    await expect(activeCountBadge).toBeVisible();
  });

  test("Çoklu İlaç Etkileşim Kontrolü ve Canlı AI Çekmecesi (Multi-drug Check & AI Explainer)", async ({ page }) => {
    const searchInput = page.locator("input[aria-label='İlaç Arama ve Ekleme Kutusu']");

    // 1. İlacı Ekle (Aspirin)
    await searchInput.fill("Aspirin");
    await page.locator("role=option", { hasText: "Aspirin" }).click();

    // 2. İlacı Ekle (Coumadin)
    await searchInput.fill("Coumadin");
    await page.locator("role=option", { hasText: "Coumadin" }).first().click();

    // Durum rozetinin "Potansiyel Ciddi Etkileşim!" durumuna geçtiğini doğrula
    const statusBadge = page.locator("text=Potansiyel Ciddi Etkileşim!");
    await expect(statusBadge).toBeVisible();

    // Etkileşim kartının render edildiğini doğrula
    const resultCard = page.locator("text=Potansiyel Önemli Etkileşim");
    await expect(resultCard).toBeVisible();

    // Canlı AI Açıklama Çekmecesini Aç
    const explainBtn = page.locator("button[aria-controls^='explain-drawer-']");
    await expect(explainBtn).toBeVisible();
    await explainBtn.click();

    // Çekmecenin ARIA durumunun değiştiğini doğrula
    await expect(explainBtn).toHaveAttribute("aria-expanded", "true");

    // Yükleniyor veya Canlı AI açıklama panelinin açıldığını doğrula
    const aiPanel = page.locator("[id^='explain-drawer-']");
    await expect(aiPanel).toBeVisible();

    // Yasal Uyarı Metninin görünürlüğünü doğrula
    const disclaimerText = aiPanel.locator("text=Yasal Uyarı");
    await expect(disclaimerText).toBeVisible();
  });

  test("WCAG 2.2 AA Klavye Tab Odaklanma Kontrolleri (Keyboard Accessibility & Focus Rings)", async ({ page }) => {
    const searchInput = page.locator("input[aria-label='İlaç Arama ve Ekleme Kutusu']");
    
    // Arama kutusuna odaklan
    await searchInput.focus();
    
    // Arama kutusuna odaklanıldığını doğrula
    await expect(searchInput).toBeFocused();

    // Klavye odağının yüksek görünürlüklü halkasını (focus ring) görsel olarak kontrol eden class'ı doğrula
    // (Arama alanında focus-visible tetiklendiğinde ring-indigo-500 sınırları belirginleşmelidir)
    await expect(searchInput).toHaveClass(/focus:ring-indigo-500/);
  });

  test("Çevrimdışı / Hata Durumu Yedekleme Kontrolü (Offline Fallback for API Error)", async ({ page }) => {
    // Intercept the /api/check route and force a failure to trigger the offline fallback
    await page.route('**/api/check', route => route.abort('failed'));

    const searchInput = page.locator("input[aria-label='İlaç Arama ve Ekleme Kutusu']");

    // 1. İlacı Ekle (Aspirin)
    await searchInput.fill("Aspirin");
    await page.locator("role=option", { hasText: "Aspirin" }).click();

    // 2. İlacı Ekle (Coumadin)
    await searchInput.fill("Coumadin");
    await page.locator("role=option", { hasText: "Coumadin" }).first().click();

    // The system should catch the fetch error and use findInteractions locally
    // Verify that the interaction is still displayed
    const statusBadge = page.locator("text=Potansiyel Ciddi Etkileşim!");
    await expect(statusBadge).toBeVisible();

    const resultCard = page.locator("text=Potansiyel Önemli Etkileşim");
    await expect(resultCard).toBeVisible();
  });
});
