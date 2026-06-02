/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import DrugList from "../components/DrugList";

describe("DrugList", () => {
  const mockOnAddDrug = jest.fn();

  const mockDrugs = [
    {
      id: "1",
      name: "Aspirin",
      activeIngredient: "ASA",
      category: "Analgesic",
    },
    {
      id: "2",
      name: "Parol",
      activeIngredient: "Paracetamol",
      category: "Analgesic",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state correctly", () => {
    render(
      <DrugList
        filtered={[]}
        query=""
        activeIndex={-1}
        onAddDrug={mockOnAddDrug}
        isLoading={true}
      />,
    );

    // Check for the animate-pulse loading indicator
    expect(screen.getByText("...")).toBeInTheDocument();
    expect(screen.getByText("...")).toHaveClass("animate-pulse");
  });

  it("renders empty state correctly when query is empty", () => {
    render(
      <DrugList
        filtered={[]}
        query=""
        activeIndex={-1}
        onAddDrug={mockOnAddDrug}
      />,
    );

    expect(screen.getByText("Tüm ilaçlar kutuya eklendi")).toBeInTheDocument();
  });

  it("renders empty state correctly when query has value", () => {
    render(
      <DrugList
        filtered={[]}
        query="nonexistent"
        activeIndex={-1}
        onAddDrug={mockOnAddDrug}
      />,
    );

    expect(
      screen.getByText("Eşleşen herhangi bir ilaç bulunamadı"),
    ).toBeInTheDocument();
  });

  it("renders populated state correctly", () => {
    render(
      <DrugList
        filtered={mockDrugs}
        query=""
        activeIndex={0} // Highlight first item
        onAddDrug={mockOnAddDrug}
      />,
    );

    expect(screen.getByText("Aspirin")).toBeInTheDocument();
    expect(screen.getByText("Parol")).toBeInTheDocument();

    // Check that the first item is highlighted
    const aspirinButton = screen.getByRole("option", { name: /Aspirin/i });
    expect(aspirinButton).toHaveAttribute("aria-selected", "true");

    const parolButton = screen.getByRole("option", { name: /Parol/i });
    expect(parolButton).toHaveAttribute("aria-selected", "false");
  });
});
