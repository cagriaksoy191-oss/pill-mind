/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShareDrugsList from "@/components/ShareView/ShareDrugsList";
import { Drug } from "@/components/ShareView/types";

describe("ShareDrugsList", () => {
  it("renders with 0 count when drugs is undefined", () => {
    render(<ShareDrugsList drugs={undefined} />);
    expect(screen.getByText("Kutudaki İlaçlar (0)")).toBeInTheDocument();
  });

  it("renders with 0 count when drugs is empty array", () => {
    render(<ShareDrugsList drugs={[]} />);
    expect(screen.getByText("Kutudaki İlaçlar (0)")).toBeInTheDocument();
  });

  it("renders list of drugs with active ingredient, category, and pharmacological group", () => {
    const mockDrugs: Drug[] = [
      {
        id: "d-1",
        name: "Aspirin 100mg",
        activeIngredient: "Asetilsalisilik Asit",
        category: "Analjezik",
        pharmacologicalGroup: "Antiagregan",
      },
      {
        id: "d-2",
        name: "Parol 500mg",
        activeIngredient: "Parasetamol",
        category: "Ağrı Kesici",
      },
    ];

    render(<ShareDrugsList drugs={mockDrugs} />);

    expect(screen.getByText("Kutudaki İlaçlar (2)")).toBeInTheDocument();

    // Check first drug
    expect(screen.getByText("Aspirin 100mg")).toBeInTheDocument();
    expect(screen.getByText("Asetilsalisilik Asit")).toBeInTheDocument();
    expect(screen.getByText(/Analjezik\s+\|\s+Antiagregan/)).toBeInTheDocument();

    // Check second drug (without pharmacologicalGroup)
    expect(screen.getByText("Parol 500mg")).toBeInTheDocument();
    expect(screen.getByText("Parasetamol")).toBeInTheDocument();
    expect(screen.getByText("Ağrı Kesici")).toBeInTheDocument();
  });
});
