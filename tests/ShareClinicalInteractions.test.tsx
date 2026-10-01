/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShareClinicalInteractions from "@/components/ShareView/ShareClinicalInteractions";
import { CheckResult, Interaction } from "@/components/ShareView/types";

describe("ShareClinicalInteractions", () => {
  describe("Empty or undefined state handling", () => {
    it.each([
      ["undefined interactions", undefined, 0],
      ["empty interactions array", [], 0],
    ])("renders correct heading count for %s", (_, interactions, expectedCount) => {
      render(<ShareClinicalInteractions interactions={interactions} />);
      expect(
        screen.getByText(`Klinik Etkileşim Bulguları (${expectedCount})`)
      ).toBeInTheDocument();
    });

    it("renders safe state banner when interactions array is empty", () => {
      render(<ShareClinicalInteractions interactions={[]} />);
      expect(screen.getByText("Bilinen Etkileşim Saptanmadı")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Kutuda bulunan ilaçlar arasında veri tabanımızda kayıtlı herhangi bir etkileşim bulunmamaktadır\./i
        )
      ).toBeInTheDocument();
    });
  });

  describe("Interaction item rendering and severity badges", () => {
    it.each([
      {
        severity: "high" as const,
        expectedBadgeText: "HIGH Risk",
        expectedBadgeClass: "bg-red-500/20 text-red-300 border border-red-500/30",
      },
      {
        severity: "medium" as const,
        expectedBadgeText: "MEDIUM Risk",
        expectedBadgeClass: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
      },
      {
        severity: "low" as const,
        expectedBadgeText: "LOW Risk",
        expectedBadgeClass: "bg-green-500/20 text-green-300 border border-green-500/30",
      },
      {
        severity: "unknown" as const,
        expectedBadgeText: "UNKNOWN Risk",
        expectedBadgeClass: "bg-green-500/20 text-green-300 border border-green-500/30",
      },
    ])(
      "renders correct badge style for severity '$severity'",
      ({ severity, expectedBadgeText, expectedBadgeClass }) => {
        const item: CheckResult = {
          drug1Name: "DrugA",
          drug2Name: "DrugB",
          interaction: {
            id: `int-${severity}`,
            drug1: "d1",
            drug2: "d2",
            severity: severity as unknown as Interaction["severity"],
            summary: `${severity} severity interaction summary`,
            source: "FDA_LABEL",
          },
        };

        render(<ShareClinicalInteractions interactions={[item]} />);

        const badge = screen.getByText(expectedBadgeText);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass(expectedBadgeClass);
      }
    );

    it("renders interaction details with optional clinicalDetail and sourceLabel fallback", () => {
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
      ];

      render(<ShareClinicalInteractions interactions={mockInteractions} />);

      expect(screen.getByText("Klinik Etkileşim Bulguları (2)")).toBeInTheDocument();

      // Check drug pairs and summaries
      expect(screen.getByText("Aspirin + Warfarin")).toBeInTheDocument();
      expect(screen.getByText("Ciddi kanama riski artar.")).toBeInTheDocument();
      expect(
        screen.getByText(/CYP2C9 inhibisyonu ve trombosit agregasyonu baskılanır\./i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Kaynak:\s+FDA_LABEL/i)).toBeInTheDocument();

      expect(screen.getByText("İbuprofen + Lisinopril")).toBeInTheDocument();
      expect(screen.getByText("Antihipertansif etki azalabilir.")).toBeInTheDocument();
      expect(screen.getByText(/Kaynak:\s+PubMed Klinik Verisi/i)).toBeInTheDocument();
    });

    it("does not render clinical detail section when clinicalDetail is not provided", () => {
      const mockInteraction: CheckResult = {
        drug1Name: "DrugA",
        drug2Name: "DrugB",
        interaction: {
          id: "int-no-detail",
          drug1: "d1",
          drug2: "d2",
          severity: "low",
          summary: "No clinical detail summary.",
          source: "MED",
        },
      };

      render(<ShareClinicalInteractions interactions={[mockInteraction]} />);

      expect(screen.queryByText(/Klinik Detay:/i)).not.toBeInTheDocument();
    });
  });
});
