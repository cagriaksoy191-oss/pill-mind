/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CoveragePanel from "../components/CoveragePanel";

describe("CoveragePanel Component", () => {
  const mockSetShowCoveragePanel = jest.fn();
  const mockHandleRequestCoverageExplanation = jest.fn();

  const defaultProps = {
    showCoveragePanel: true,
    setShowCoveragePanel: mockSetShowCoveragePanel,
    isCoverageLoading: false,
    coverageExplanation: null,
    handleRequestCoverageExplanation: mockHandleRequestCoverageExplanation,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when showCoveragePanel is false", () => {
    render(<CoveragePanel {...defaultProps} showCoveragePanel={false} />);
    expect(
      screen.queryByText("Kapsamlı AI İlaç Analizi"),
    ).not.toBeInTheDocument();
  });

  it("renders loading state correctly when isCoverageLoading is true", () => {
    render(<CoveragePanel {...defaultProps} isCoverageLoading={true} />);
    expect(
      screen.getByText(
        "Tüm Kombinasyon Canlı Yapay Zekayla Analiz Ediliyor...",
      ),
    ).toBeInTheDocument();
  });

  it("renders live gemini state correctly", () => {
    const props = {
      ...defaultProps,
      coverageExplanation: {
        source: "gemini_live",
        explanation: "This is a live analysis.",
        generatedAt: "2023-10-27T10:00:00Z",
      },
    };
    render(<CoveragePanel {...props} />);
    expect(screen.getByText("Canlı Analiz")).toBeInTheDocument();
    expect(screen.getByText("This is a live analysis.")).toBeInTheDocument();
    expect(screen.getByText("Klinik Uyarı:")).toBeInTheDocument();
    expect(screen.getByText("2023-10-27T10:00:00Z")).toBeInTheDocument();
  });

  it("renders cached state correctly", () => {
    const props = {
      ...defaultProps,
      coverageExplanation: {
        source: "cache",
        explanation: "This is a cached analysis.",
        generatedAt: "2023-10-27T09:00:00Z",
      },
    };
    render(<CoveragePanel {...props} />);
    expect(screen.getByText("Önbellek Yanıtı")).toBeInTheDocument();
    expect(screen.getByText("This is a cached analysis.")).toBeInTheDocument();
    expect(screen.getByText("Klinik Uyarı:")).toBeInTheDocument();
    expect(screen.getByText("2023-10-27T09:00:00Z")).toBeInTheDocument();
  });

  it("renders error state correctly with custom error message", () => {
    const props = {
      ...defaultProps,
      coverageExplanation: {
        source: "error",
        error: "Test error message.",
      },
    };
    render(<CoveragePanel {...props} />);
    expect(screen.getByText("Analiz Tamamlanamadı")).toBeInTheDocument();
    expect(screen.getByText("Test error message.")).toBeInTheDocument();
  });

  it("renders error state correctly with default error message", () => {
    const props = {
      ...defaultProps,
      coverageExplanation: {
        source: "error",
      },
    };
    render(<CoveragePanel {...props} />);
    expect(screen.getByText("Analiz Tamamlanamadı")).toBeInTheDocument();
    expect(
      screen.getByText("Canlı kombinasyon açıklaması şu anda sunulamıyor."),
    ).toBeInTheDocument();
  });

  it("calls handleRequestCoverageExplanation when Retry button is clicked", () => {
    const props = {
      ...defaultProps,
      coverageExplanation: {
        source: "error",
      },
    };
    render(<CoveragePanel {...props} />);

    const retryButton = screen.getByRole("button", { name: /Yeniden Dene/i });
    fireEvent.click(retryButton);

    expect(mockHandleRequestCoverageExplanation).toHaveBeenCalledTimes(1);
  });

  it("calls setShowCoveragePanel(false) when Close button is clicked", () => {
    render(<CoveragePanel {...defaultProps} />);

    const closeButton = screen.getByRole("button", { name: /✕/i });
    fireEvent.click(closeButton);

    expect(mockSetShowCoveragePanel).toHaveBeenCalledWith(false);
    expect(mockSetShowCoveragePanel).toHaveBeenCalledTimes(1);
  });
});
