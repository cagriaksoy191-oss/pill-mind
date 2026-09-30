/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShareFoodInteractions from "@/components/ShareView/ShareFoodInteractions";
import { FoodInteraction } from "@/components/ShareView/types";

describe("ShareFoodInteractions", () => {
  it("renders null when interactions is undefined", () => {
    const { container } = render(<ShareFoodInteractions interactions={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when interactions is an empty array", () => {
    const { container } = render(<ShareFoodInteractions interactions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders food interactions list correctly when interactions are provided", () => {
    const mockInteractions: FoodInteraction[] = [
      {
        id: "fi-1",
        drugId: "drug-1",
        drugName: "Aspirin",
        substance: "Alkol",
        effect: "Mide kanaması riskini artırır.",
        severity: "high",
      },
      {
        id: "fi-2",
        drugId: "drug-2",
        drugName: "Warfarin",
        substance: "Greyfurt",
        effect: "İlaç emilimini ve etkinliğini değiştirebilir.",
        severity: "medium",
      },
    ];

    render(<ShareFoodInteractions interactions={mockInteractions} />);

    // Check header section
    expect(screen.getByText(/Gıda & Besin Etkileşimleri/i)).toBeInTheDocument();

    // Check first interaction rendering
    expect(screen.getByText(/Aspirin/i)).toBeInTheDocument();
    expect(screen.getByText("Alkol")).toBeInTheDocument();
    expect(screen.getByText("Mide kanaması riskini artırır.")).toBeInTheDocument();

    // Check second interaction rendering
    expect(screen.getByText(/Warfarin/i)).toBeInTheDocument();
    expect(screen.getByText("Greyfurt")).toBeInTheDocument();
    expect(
      screen.getByText("İlaç emilimini ve etkinliğini değiştirebilir.")
    ).toBeInTheDocument();
  });
});
