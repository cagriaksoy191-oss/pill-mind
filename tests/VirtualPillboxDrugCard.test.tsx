/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { VirtualPillboxDrugCard } from "../components/VirtualPillboxDrugCard";
import { Drug } from "../components/VirtualPillbox";

describe("VirtualPillboxDrugCard", () => {
  const mockDrug: Drug = {
    id: "drug-123",
    name: "Paracetamol",
    activeIngredient: "Acetaminophen",
    category: "Analgesic",
  };

  const defaultProps = {
    drug: mockDrug,
    isNew: false,
    severityGlow: "",
    onRemove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders drug name and active ingredient correctly", () => {
    render(<VirtualPillboxDrugCard {...defaultProps} />);

    expect(screen.getByText("Paracetamol")).toBeInTheDocument();
    expect(screen.getByText("Acetaminophen")).toBeInTheDocument();
  });

  it("calls onRemove with correct drug id when remove button is clicked", () => {
    const onRemoveMock = jest.fn();
    render(<VirtualPillboxDrugCard {...defaultProps} onRemove={onRemoveMock} />);

    const removeButton = screen.getByRole("button", {
      name: /Paracetamol ilacını kutudan çıkar/i,
    });
    fireEvent.click(removeButton);

    expect(onRemoveMock).toHaveBeenCalledTimes(1);
    expect(onRemoveMock).toHaveBeenCalledWith("drug-123");
  });

  it("applies new item styling and animation when isNew is true", () => {
    const { container } = render(
      <VirtualPillboxDrugCard {...defaultProps} isNew={true} />
    );

    const cardContainer = container.firstChild as HTMLElement;
    expect(cardContainer).toHaveClass("animate-drop-pill", "border-emerald-500/50", "bg-emerald-500/10");
    expect(cardContainer.style.animation).toBe("drop-pill 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards");
  });

  it("applies severityGlow style when isNew is false and severityGlow is provided", () => {
    const customGlow = "border-red-500/80 shadow-red-500/50";
    const { container } = render(
      <VirtualPillboxDrugCard {...defaultProps} isNew={false} severityGlow={customGlow} />
    );

    const cardContainer = container.firstChild as HTMLElement;
    expect(cardContainer).toHaveClass("border-red-500/80", "shadow-red-500/50");
    expect(cardContainer.style.animation).toBe("");
  });

  it("falls back to default border class when isNew is false and severityGlow is empty", () => {
    const { container } = render(
      <VirtualPillboxDrugCard {...defaultProps} isNew={false} severityGlow="" />
    );

    const cardContainer = container.firstChild as HTMLElement;
    expect(cardContainer).toHaveClass("border-white/10");
  });

  it("handles empty activeIngredient gracefully", () => {
    const drugWithEmptyActiveIngredient: Drug = {
      ...mockDrug,
      activeIngredient: "",
    };

    render(
      <VirtualPillboxDrugCard {...defaultProps} drug={drugWithEmptyActiveIngredient} />
    );

    expect(screen.getByText("Paracetamol")).toBeInTheDocument();
  });

  it("handles special characters in drug name and aria-label", () => {
    const specialDrug: Drug = {
      id: "special-1",
      name: "Aspirin & C (<100mg>)",
      activeIngredient: "Acetylsalicylic Acid",
      category: "Pain Reliever",
    };

    render(<VirtualPillboxDrugCard {...defaultProps} drug={specialDrug} />);

    expect(screen.getByText("Aspirin & C (<100mg>)")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Aspirin & C (<100mg>) ilacını kutudan çıkar",
      })
    ).toBeInTheDocument();
  });
});
