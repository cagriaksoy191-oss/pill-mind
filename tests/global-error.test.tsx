/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import GlobalError from "../app/global-error";
import * as Sentry from "@sentry/nextjs";

// Sentry'i mockla
jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
}));

describe("GlobalError Bileşeni Testleri", () => {
  const mockReset = jest.fn();
  const mockError = new Error("Test hatası");
  (mockError as Error & { digest?: string }).digest = "DIGEST-123";

  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // console.error'ı spy'a al ve logları kirletmemesi için mockla
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("Hata bileşenini ve digest kodunu render eder", () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(screen.getByText(/Kritik Sunucu/i)).toBeInTheDocument();
    expect(screen.getByText(/DIGEST-123/i)).toBeInTheDocument();
    expect(screen.getByText(/Test hatası/i)).toBeInTheDocument();
  });

  it("Bileşen mount edildiğinde Sentry'e hatayı kaydeder ve console.error çağrılır", () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[PillMind Global Layout Error] Yakalanan Hata:",
      mockError,
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(mockError);
  });

  it("'Sistemi Yeniden Yükle' butonuna tıklandığında reset fonksiyonu çalıştırılır", () => {
    render(<GlobalError error={mockError} reset={mockReset} />);

    const button = screen.getByRole("button", {
      name: /Sistemi Yeniden Yükle/i,
    });
    fireEvent.click(button);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
