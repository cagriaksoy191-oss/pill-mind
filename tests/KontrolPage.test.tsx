/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import KontrolPage from "@/app/kontrol/page";

// Mock child components that might use window APIs or complex graphics
jest.mock("@/components/VirtualPillbox", () => {
  return function DummyVirtualPillbox({ selectedDrugs }: { selectedDrugs: Array<{ id: string; name: string }> }) {
    return (
      <div data-testid="virtual-pillbox">
        Pillbox Count: {selectedDrugs.length}
      </div>
    );
  };
});

describe("KontrolPage", () => {
  let consoleSpy: jest.SpyInstance;

  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    // Mock global fetch for API calls triggered by hooks
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ interactions: [] }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it("renders page header and initial empty state", () => {
    render(<KontrolPage />);

    expect(screen.getByText("Canlı Tarama Paneli")).toBeInTheDocument();
    expect(screen.getByText(/Tarama Raporları/)).toBeInTheDocument();
    expect(
      screen.getByText("Tarama Başlatmak İçin İlaç Ekleyin")
    ).toBeInTheDocument();
  });

  it("displays virtual pillbox component", () => {
    render(<KontrolPage />);

    expect(screen.getByTestId("virtual-pillbox")).toBeInTheDocument();
    expect(screen.getByText("Pillbox Count: 0")).toBeInTheDocument();
  });
});
