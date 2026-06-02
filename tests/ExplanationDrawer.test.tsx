/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ExplanationDrawer from "../components/ExplanationDrawer";

describe("ExplanationDrawer", () => {
  const mockOnExplainRequested = jest.fn();

  const defaultProps = {
    isOpen: true,
    interactionId: "test-interaction-id",
    onExplainRequested: mockOnExplainRequested,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render nothing when isOpen is false", () => {
    const { container } = render(
      <ExplanationDrawer {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("should render default fallback state when explanationData is undefined", () => {
    render(<ExplanationDrawer {...defaultProps} />);
    expect(
      screen.getByText(/Canlı açıklama henüz alınmadı/i)
    ).toBeInTheDocument();
  });

  it("should render loading state when isExplanationLoading is true", () => {
    render(<ExplanationDrawer {...defaultProps} isExplanationLoading={true} />);
    expect(
      screen.getByText(/Klinik Canlı AI Açıklaması Hazırlanıyor/i)
    ).toBeInTheDocument();
  });

  it("should render error state when source is error", () => {
    render(
      <ExplanationDrawer
        {...defaultProps}
        explanationData={{ source: "error", error: "Test error message" }}
      />
    );
    expect(screen.getByText("Sistem Durumu")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /tekrar dene/i });
    fireEvent.click(retryButton);
    expect(mockOnExplainRequested).toHaveBeenCalledWith(
      "test-interaction-id",
      true
    );
  });

  it("should render explanation text properly with gemini_live source", () => {
    render(
      <ExplanationDrawer
        {...defaultProps}
        explanationData={{
          source: "gemini_live",
          explanation: "This is a detailed explanation.",
        }}
      />
    );
    expect(screen.getByText("Klinik Güvenlik Katmanı")).toBeInTheDocument();
    expect(screen.getByText("This is a detailed explanation.")).toBeInTheDocument();
  });

  it("should render success state layout with empty explanation", () => {
    render(
      <ExplanationDrawer
        {...defaultProps}
        explanationData={{
          source: "gemini_live",
          explanation: "",
        }}
      />
    );
    expect(screen.getByText("Klinik Güvenlik Katmanı")).toBeInTheDocument();
    // The component should render the empty explanation without crashing
    // The disclaimer is always shown when isOpen is true
    expect(screen.getByText(/Yasal Uyarı/i)).toBeInTheDocument();
  });
});
