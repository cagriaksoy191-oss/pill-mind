/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShareClinicalInteractions from "@/components/ShareView/ShareClinicalInteractions";
import { CheckResult } from "@/components/ShareView/types";

describe("ShareClinicalInteractions", () => {
  it("renders safe state message when interactions array is empty", () => {
    render(<ShareClinicalInteractions interactions={[]} />);

    expect(screen.getByText("Klinik Etkileşim Bulguları (0)")).toBeInTheDocument();
    expect(screen.getByText("Bilinen Etkileşim Saptanmadı")).toBeInTheDocument();
    expect(
      screen.getByText(/Kutuda bulunan ilaçlar arasında veri tabanımızda kayıtlı herhangi bir etkileşim bulunmamaktadır\./i)
    ).toBeInTheDocument();
  });

  it("renders with 0 count when interactions is undefined", () => {
    render(<ShareClinicalInteractions interactions={undefined} />);
    expect(screen.getByText("Klinik Etkileşim Bulguları (0)")).toBeInTheDocument();
  });

  it("renders interaction cards with badges, summaries, clinical details and sources", () => {
    const mockInteractions: CheckResult[] = [
      {
        drug1Name: "Aspirin",
        drug2Name: "Warfarin",
        interaction: {
          id: "int-1",
          drug1: "d-1",
          drug2: "d-2",
          severity: "high",
          summary: "Ciddi kanama riski artar.",
          clinicalDetail: "CYP2C9 inhibisyonu ve trombosit agregasyonu baskılanır.",
          source: "FDA_LABEL",
        },
      },
      {
        drug1Name: "İbuprofen",
        drug2Name: "Lisinopril",
        interaction: {
          id: "int-2",
          drug1: "d-3",
          drug2: "d-4",
          severity: "medium",
          summary: "Antihipertansif etki azalabilir.",
          source: "PUBMED",
          sourceLabel: "PubMed Klinik Verisi",
        },
      },
      {
        drug1Name: "Kalsiyum",
        drug2Name: "D Vitamini",
        interaction: {
          id: "int-3",
          drug1: "d-5",
          drug2: "d-6",
          severity: "low",
          summary: "Hafif emilim etkileşimi.",
          source: "DRUGBANK",
        },
      },
    ];

    render(<ShareClinicalInteractions interactions={mockInteractions} />);

    expect(screen.getByText("Klinik Etkileşim Bulguları (3)")).toBeInTheDocument();

    // High risk card assertions
    expect(screen.getByText("Aspirin + Warfarin")).toBeInTheDocument();
    expect(screen.getByText("HIGH Risk")).toBeInTheDocument();
    expect(screen.getByText("Ciddi kanama riski artar.")).toBeInTheDocument();
    expect(
      screen.getByText(/CYP2C9 inhibisyonu ve trombosit agregasyonu baskılanır\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Kaynak:\s+FDA_LABEL/i)).toBeInTheDocument();

    // Medium risk card assertions
    expect(screen.getByText("İbuprofen + Lisinopril")).toBeInTheDocument();
    expect(screen.getByText("MEDIUM Risk")).toBeInTheDocument();
    expect(screen.getByText("Antihipertansif etki azalabilir.")).toBeInTheDocument();
    expect(screen.getByText(/Kaynak:\s+PubMed Klinik Verisi/i)).toBeInTheDocument();

    // Low risk card assertions
    expect(screen.getByText("Kalsiyum + D Vitamini")).toBeInTheDocument();
    expect(screen.getByText("LOW Risk")).toBeInTheDocument();
    expect(screen.getByText("Hafif emilim etkileşimi.")).toBeInTheDocument();
  });
});
