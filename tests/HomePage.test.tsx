/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import HomePage from "../app/page";

describe("HomePage Component", () => {
  it("renders the hero section and features correctly", () => {
    render(<HomePage />);

    // Brand / Logo Text
    expect(screen.getByText("PillMind")).toBeInTheDocument();

    // Main heading
    expect(screen.getByText(/İlaç Etkileşimlerinde/)).toBeInTheDocument();

    // CTA Button
    expect(screen.getByText("Hemen İlaçları Kontrol Et")).toBeInTheDocument();

    // Feature Cards
    expect(screen.getByText("Deterministik Klinik Çekirdek")).toBeInTheDocument();
    expect(screen.getByText("Çift Ajanlı Canlı AI")).toBeInTheDocument();
    expect(screen.getByText("Sanal İlaç Kutusu (3D)")).toBeInTheDocument();
  });
});
