/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SharePrintReport from "@/components/ShareView/SharePrintReport";
import { SharedData } from "@/components/ShareView/types";

describe("SharePrintReport", () => {
  const mockSharedData: SharedData = {
    success: true,
    token: "test-token-123",
    createdAt: "2024-01-15T10:00:00Z",
    expiresAt: "2024-01-16T10:00:00Z",
    drugIds: ["1", "2"],
    drugs: [
      {
        id: "1",
        name: "Paracetamol",
        activeIngredient: "Parasetamol",
        category: "Analjezik",
      },
      {
        id: "2",
        name: "Ibuprofen",
        activeIngredient: "İbuprofen",
        category: "NSAİİ",
      },
    ],
    interactions: [
      {
        drug1Name: "Paracetamol",
        drug2Name: "Ibuprofen",
        interaction: {
          id: "int-1",
          drug1: "1",
          drug2: "2",
          severity: "medium",
          summary: "Orta düzey etkileşim riski.",
          source: "Klinik Kaynak",
        },
      },
    ],
    accumulationWarnings: [
      {
        type: "active_ingredient",
        severity: "high",
        message: "Aynı etken madde içeren birden fazla ilaç bulundu.",
        triggerDrugs: ["Paracetamol"],
      },
    ],
    foodInteractions: [
      {
        id: "food-1",
        drugId: "2",
        drugName: "Ibuprofen",
        substance: "Alkol",
        effect: "Mide iritasyon riski artabilir.",
        severity: "medium",
      },
    ],
    contraindications: [],
  };

  it("renders correctly with null data without throwing error", () => {
    render(<SharePrintReport data={null} />);

    expect(screen.getByText(/PillMind Klinik İlaç Etkileşim Raporu/i)).toBeInTheDocument();
    expect(screen.getByText(/Oluşturulma Tarihi:/i)).toBeInTheDocument();
    expect(screen.getByText(/Değerlendirilen Sanal İlaç Kutusu İçeriği/i)).toBeInTheDocument();
    expect(screen.getByText(/Bulunan İlaç Etkileşimleri/i)).toBeInTheDocument();
  });

  it("renders report header and metadata with provided data", () => {
    render(<SharePrintReport data={mockSharedData} />);

    expect(screen.getByText(/PillMind Klinik İlaç Etkileşim Raporu/i)).toBeInTheDocument();
    expect(screen.getByText(/15.01.2024|15\/01\/2024/i)).toBeInTheDocument();
    expect(screen.getByText(/CONFIDENTIAL \/ CLINICAL ANALYSIS REPORT/i)).toBeInTheDocument();
  });

  it("renders evaluated drugs list correctly", () => {
    render(<SharePrintReport data={mockSharedData} />);

    expect(screen.getByText("Paracetamol")).toBeInTheDocument();
    expect(screen.getByText("Parasetamol (Analjezik)")).toBeInTheDocument();
    expect(screen.getByText("Ibuprofen")).toBeInTheDocument();
    expect(screen.getByText("İbuprofen (NSAİİ)")).toBeInTheDocument();
  });

  it("renders accumulation warnings when present", () => {
    render(<SharePrintReport data={mockSharedData} />);

    expect(screen.getByText(/Aşırı Doz \/ Farmakolojik Grup Çakışmaları/i)).toBeInTheDocument();
    expect(
      screen.getByText("Aynı etken madde içeren birden fazla ilaç bulundu.")
    ).toBeInTheDocument();
  });

  it("does not render accumulation warnings section when warnings are empty or absent", () => {
    const dataWithoutWarnings: SharedData = {
      ...mockSharedData,
      accumulationWarnings: [],
    };

    render(<SharePrintReport data={dataWithoutWarnings} />);

    expect(
      screen.queryByText(/Aşırı Doz \/ Farmakolojik Grup Çakışmaları/i)
    ).not.toBeInTheDocument();
  });

  it("renders food interactions when present", () => {
    render(<SharePrintReport data={mockSharedData} />);

    expect(screen.getByText(/Gıda ve Besin Etkileşim Raporu/i)).toBeInTheDocument();
    expect(screen.getByText("Ibuprofen & Alkol:")).toBeInTheDocument();
    expect(screen.getByText(/Mide iritasyon riski artabilir/i)).toBeInTheDocument();
  });

  it("does not render food interactions section when foodInteractions array is empty", () => {
    const dataWithoutFoodInteractions: SharedData = {
      ...mockSharedData,
      foodInteractions: [],
    };

    render(<SharePrintReport data={dataWithoutFoodInteractions} />);

    expect(screen.queryByText(/Gıda ve Besin Etkileşim Raporu/i)).not.toBeInTheDocument();
  });

  it("renders drug interactions table rows when interactions exist", () => {
    render(<SharePrintReport data={mockSharedData} />);

    expect(screen.getByText("Paracetamol + Ibuprofen")).toBeInTheDocument();
    expect(screen.getByText("medium Risk")).toBeInTheDocument();
    expect(screen.getByText("Orta düzey etkileşim riski.")).toBeInTheDocument();
  });

  it("renders empty state message in table when interactions array is empty", () => {
    const dataWithEmptyInteractions: SharedData = {
      ...mockSharedData,
      interactions: [],
    };

    render(<SharePrintReport data={dataWithEmptyInteractions} />);

    expect(
      screen.getByText(/Kutuda bulunan ilaçlar arasında bilinen bir klinik etkileşim bulunmamaktadır./i)
    ).toBeInTheDocument();
  });
});
