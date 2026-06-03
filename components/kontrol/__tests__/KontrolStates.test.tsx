/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorState } from "../KontrolStates";
import React from "react";

describe("ErrorState Component", () => {
  it("renders checkingError prop correctly", () => {
    const mockOnRetry = jest.fn();
    const testError = "Test connection error message";

    render(<ErrorState checkingError={testError} onRetry={mockOnRetry} />);

    expect(
      screen.getByText("Klinik Servis Bağlantı Hatası"),
    ).toBeInTheDocument();
    expect(screen.getByText(testError)).toBeInTheDocument();
  });

  it("calls onRetry when button is clicked", () => {
    const mockOnRetry = jest.fn();
    const testError = "Test connection error message";

    render(<ErrorState checkingError={testError} onRetry={mockOnRetry} />);

    const retryButton = screen.getByRole("button", { name: /yeniden dene/i });
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });
});
