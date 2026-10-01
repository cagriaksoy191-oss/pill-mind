/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShareAccumulationWarnings from "@/components/ShareView/ShareAccumulationWarnings";
import { AccumulationWarning } from "@/components/ShareView/types";

describe("ShareAccumulationWarnings", () => {
  it.each([
    ["undefined", undefined],
    ["empty array", []],
  ])("renders null when warnings prop is %s", (_, warnings) => {
    const { container } = render(<ShareAccumulationWarnings warnings={warnings} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders accumulation warnings list correctly with message and detail", () => {
    const mockWarnings: AccumulationWarning[] = [
      {
        type: "active_ingredient",
        severity: "high",
        message: "Çift doz NSAİİ birikimi saptandı.",
        triggerDrugs: ["drug-1", "drug-2"],
        detail: "İbuprofen ve Naproksen aynı anda kullanılmaktadır.",
      },
      {
        type: "pharmacological_group",
        severity: "medium",
        message: "Farmakolojik sınıf birikimi uyarısı.",
        triggerDrugs: ["drug-3"],
      },
    ];

    render(<ShareAccumulationWarnings warnings={mockWarnings} />);

    expect(screen.getByText(/Doz Aşımı \/ Grup Birikim Uyarıları/i)).toBeInTheDocument();

    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(2);

    expect(screen.getByText("Çift doz NSAİİ birikimi saptandı.")).toBeInTheDocument();
    expect(
      screen.getByText("İbuprofen ve Naproksen aynı anda kullanılmaktadır.")
    ).toBeInTheDocument();
    expect(screen.getByText("Farmakolojik sınıf birikimi uyarısı.")).toBeInTheDocument();
  });
});
