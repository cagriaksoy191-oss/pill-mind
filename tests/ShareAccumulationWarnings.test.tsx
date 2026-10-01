/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ShareAccumulationWarnings from "@/components/ShareView/ShareAccumulationWarnings";
import { AccumulationWarning } from "@/components/ShareView/types";

describe("ShareAccumulationWarnings", () => {
  it("renders null when warnings is undefined", () => {
    const { container } = render(<ShareAccumulationWarnings warnings={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when warnings is an empty array", () => {
    const { container } = render(<ShareAccumulationWarnings warnings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders accumulation warnings correctly with and without detail", () => {
    const mockWarnings: AccumulationWarning[] = [
      {
        message: "Çift doz NSAİİ birikimi saptandı.",
        detail: "İbuprofen ve Naproksen aynı anda kullanılmaktadır.",
        severity: "high",
      },
      {
        message: "Farmakolojik sınıf birikimi uyarısı.",
        severity: "medium",
      },
    ];

    render(<ShareAccumulationWarnings warnings={mockWarnings} />);

    expect(screen.getByText(/Doz Aşımı \/ Grup Birikim Uyarıları/i)).toBeInTheDocument();
    expect(screen.getByText("Çift doz NSAİİ birikimi saptandı.")).toBeInTheDocument();
    expect(
      screen.getByText("İbuprofen ve Naproksen aynı anda kullanılmaktadır.")
    ).toBeInTheDocument();
    expect(screen.getByText("Farmakolojik sınıf birikimi uyarısı.")).toBeInTheDocument();
  });
});
