/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import InteractionList from "../components/InteractionList";
import { CheckResult } from "../lib/interactions";

// Mock the ResultCard component
jest.mock("../components/ResultCard", () => {
  return function MockResultCard(props: {
    interactionId: string;
    drug1Name: string;
    drug2Name: string;
    severity: string;
    onExplainRequested: (id: string, force: boolean) => void;
  }) {
    return (
      <div data-testid="mock-result-card" data-interaction-id={props.interactionId}>
        {props.drug1Name} - {props.drug2Name} ({props.severity})
        <button onClick={() => props.onExplainRequested(props.interactionId, false)}>
          Mock Explain Button
        </button>
      </div>
    );
  };
});

describe("InteractionList", () => {
  const mockInteractions: CheckResult[] = [
    {
      drug1Name: "DrugA",
      drug2Name: "DrugB",
      interaction: {
        id: "int-1",
        drug1: "drug-a-id",
        drug2: "drug-b-id",
        severity: "high",
        summary: "Interaction 1 summary",
        source: "Test Source",
        sourceLabel: "Test Label",
        verificationStatus: "verified",
      },
    },
    {
      drug1Name: "DrugC",
      drug2Name: "DrugD",
      interaction: {
        id: "int-2",
        drug1: "drug-c-id",
        drug2: "drug-d-id",
        severity: "low",
        summary: "Interaction 2 summary",
        source: "Test Source 2",
        sourceLabel: "Test Label 2",
        verificationStatus: "unverified",
      },
    },
  ];

  const mockExplanations = {
    "int-1": { explanation: "This is an explanation for int-1" },
  };

  const mockLoadingExplanations = {
    "int-1": false,
    "int-2": true,
  };

  const mockOnExplainRequested = jest.fn();
  const mockHandleRequestCoverageExplanation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a list of interactions using ResultCard", () => {
    render(
      <InteractionList
        interactions={mockInteractions}
        explanations={mockExplanations}
        loadingExplanations={mockLoadingExplanations}
        onExplainRequested={mockOnExplainRequested}
        handleRequestCoverageExplanation={mockHandleRequestCoverageExplanation}
        isCoverageLoading={false}
      />
    );

    const resultCards = screen.getAllByTestId("mock-result-card");
    expect(resultCards).toHaveLength(2);

    expect(resultCards[0]).toHaveTextContent("DrugA - DrugB (high)");
    expect(resultCards[1]).toHaveTextContent("DrugC - DrugD (low)");
  });

  it("passes correct props to ResultCard and handles onExplainRequested", () => {
    render(
      <InteractionList
        interactions={mockInteractions}
        explanations={mockExplanations}
        loadingExplanations={mockLoadingExplanations}
        onExplainRequested={mockOnExplainRequested}
        handleRequestCoverageExplanation={mockHandleRequestCoverageExplanation}
        isCoverageLoading={false}
      />
    );

    const explainButtons = screen.getAllByText("Mock Explain Button");
    fireEvent.click(explainButtons[0]);

    expect(mockOnExplainRequested).toHaveBeenCalledWith("int-1", false);
  });

  it("renders the coverage analysis button and handles clicks", () => {
    render(
      <InteractionList
        interactions={mockInteractions}
        explanations={mockExplanations}
        loadingExplanations={mockLoadingExplanations}
        onExplainRequested={mockOnExplainRequested}
        handleRequestCoverageExplanation={mockHandleRequestCoverageExplanation}
        isCoverageLoading={false}
      />
    );

    const coverageButton = screen.getByRole("button", { name: /Kapsamlı Canlı AI Analizi Yap/i });
    expect(coverageButton).toBeInTheDocument();
    expect(coverageButton).not.toBeDisabled();

    fireEvent.click(coverageButton);
    expect(mockHandleRequestCoverageExplanation).toHaveBeenCalledTimes(1);
  });

  it("disables the coverage analysis button and shows loading state when isCoverageLoading is true", () => {
    render(
      <InteractionList
        interactions={mockInteractions}
        explanations={mockExplanations}
        loadingExplanations={mockLoadingExplanations}
        onExplainRequested={mockOnExplainRequested}
        handleRequestCoverageExplanation={mockHandleRequestCoverageExplanation}
        isCoverageLoading={true}
      />
    );

    const coverageButton = screen.getByRole("button", { name: /Yükleniyor.../i });
    expect(coverageButton).toBeInTheDocument();
    expect(coverageButton).toBeDisabled();

    fireEvent.click(coverageButton);
    expect(mockHandleRequestCoverageExplanation).not.toHaveBeenCalled();
  });
});
