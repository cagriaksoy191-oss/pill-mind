/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CoveragePatientView from "@/components/CoveragePanelSections/CoveragePatientView";

describe("CoveragePatientView", () => {
  const mockHandleRequest = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading spinner and text when isCoverageLoading is true", () => {
    render(
      <CoveragePatientView
        isCoverageLoading={true}
        coverageExplanation={null}
        handleRequestCoverageExplanation={mockHandleRequest}
      />
    );

    expect(
      screen.getByText("Tüm Kombinasyon Canlı Yapay Zekayla Analiz Ediliyor...")
    ).toBeInTheDocument();
  });

  it("renders cache badge, explanation, generatedAt timestamp, and clinical disclaimer for source='cache'", () => {
    render(
      <CoveragePatientView
        isCoverageLoading={false}
        coverageExplanation={{
          source: "cache",
          explanation: "Önbellekten alınan güvenli klinik açıklama.",
          generatedAt: "14:30:00",
        }}
        handleRequestCoverageExplanation={mockHandleRequest}
      />
    );

    expect(screen.getByText("Önbellek Yanıtı")).toBeInTheDocument();
    expect(screen.getByText("14:30:00")).toBeInTheDocument();
    expect(
      screen.getByText("Önbellekten alınan güvenli klinik açıklama.")
    ).toBeInTheDocument();
    expect(screen.getByText(/Klinik Uyarı:/i)).toBeInTheDocument();
  });

  it("renders live analysis badge and explanation for source='gemini_live'", () => {
    render(
      <CoveragePatientView
        isCoverageLoading={false}
        coverageExplanation={{
          source: "gemini_live",
          explanation: "Canlı AI tarafından üretilmiş kapsam analizi.",
        }}
        handleRequestCoverageExplanation={mockHandleRequest}
      />
    );

    expect(screen.getByText("Canlı Analiz")).toBeInTheDocument();
    expect(
      screen.getByText("Canlı AI tarafından üretilmiş kapsam analizi.")
    ).toBeInTheDocument();
  });

  it("renders error view and triggers retry button callback for source='error'", () => {
    render(
      <CoveragePatientView
        isCoverageLoading={false}
        coverageExplanation={{
          source: "error",
          error: "Kota aşımı nedeniyle açıklama üretilemedi.",
        }}
        handleRequestCoverageExplanation={mockHandleRequest}
      />
    );

    expect(screen.getByText("Analiz Tamamlanamadı")).toBeInTheDocument();
    expect(
      screen.getByText("Kota aşımı nedeniyle açıklama üretilemedi.")
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /Yeniden Dene/i });
    fireEvent.click(retryBtn);

    expect(mockHandleRequest).toHaveBeenCalledTimes(1);
  });

  it("returns null when coverageExplanation is null and isCoverageLoading is false", () => {
    const { container } = render(
      <CoveragePatientView
        isCoverageLoading={false}
        coverageExplanation={null}
        handleRequestCoverageExplanation={mockHandleRequest}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
