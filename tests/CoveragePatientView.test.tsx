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

  describe("when source is cache or gemini_live", () => {
    it.each([
      {
        source: "cache",
        badgeText: "Önbellek Yanıtı",
        explanation: "Önbellekten alınan güvenli klinik açıklama.",
        generatedAt: "14:30:00",
      },
      {
        source: "gemini_live",
        badgeText: "Canlı Analiz",
        explanation: "Canlı AI tarafından üretilmiş kapsam analizi.",
        generatedAt: undefined,
      },
    ])(
      "renders badge ($badgeText) and explanation for source='$source'",
      ({ source, badgeText, explanation, generatedAt }) => {
        render(
          <CoveragePatientView
            isCoverageLoading={false}
            coverageExplanation={{
              source,
              explanation,
              generatedAt,
            }}
            handleRequestCoverageExplanation={mockHandleRequest}
          />
        );

        expect(screen.getByText(badgeText)).toBeInTheDocument();
        expect(screen.getByText(explanation)).toBeInTheDocument();
        expect(screen.getByText(/Klinik Uyarı:/i)).toBeInTheDocument();

        if (generatedAt) {
          expect(screen.getByText(generatedAt)).toBeInTheDocument();
        } else {
          expect(screen.queryByText("14:30:00")).not.toBeInTheDocument();
        }
      }
    );
  });

  describe("when source is error", () => {
    it.each([
      {
        error: "Kota aşımı nedeniyle açıklama üretilemedi.",
        expectedMessage: "Kota aşımı nedeniyle açıklama üretilemedi.",
      },
      {
        error: undefined,
        expectedMessage: "Canlı kombinasyon açıklaması şu anda sunulamıyor.",
      },
    ])(
      "renders error view with message '$expectedMessage' and handles retry",
      ({ error, expectedMessage }) => {
        render(
          <CoveragePatientView
            isCoverageLoading={false}
            coverageExplanation={{
              source: "error",
              error,
            }}
            handleRequestCoverageExplanation={mockHandleRequest}
          />
        );

        expect(screen.getByText("Analiz Tamamlanamadı")).toBeInTheDocument();
        expect(screen.getByText(expectedMessage)).toBeInTheDocument();

        const retryBtn = screen.getByRole("button", { name: /Yeniden Dene/i });
        fireEvent.click(retryBtn);

        expect(mockHandleRequest).toHaveBeenCalledTimes(1);
      }
    );
  });

  it.each([
    {
      description: "coverageExplanation is null",
      coverageExplanation: null,
    },
    {
      description: "coverageExplanation source is unknown",
      coverageExplanation: { source: "unknown_source", explanation: "Test" },
    },
  ])(
    "returns null when $description and isCoverageLoading is false",
    ({ coverageExplanation }) => {
      const { container } = render(
        <CoveragePatientView
          isCoverageLoading={false}
          coverageExplanation={coverageExplanation as any}
          handleRequestCoverageExplanation={mockHandleRequest}
        />
      );

      expect(container.firstChild).toBeNull();
    }
  );
});
