/** @jest-environment jsdom */
import { renderHook, waitFor } from "@testing-library/react";
import { useInteractions } from "../hooks/useInteractions";
import "@testing-library/jest-dom";

// Mock global.fetch
global.fetch = jest.fn();

// Mock the dynamic import
jest.mock("@/lib/interactions", () => ({
  findInteractions: jest.fn(),
  checkAccumulation: jest.fn(),
  findFoodInteractions: jest.fn(),
  findContraindications: jest.fn(),
  checkPolypharmacyAndBeers: jest.fn(),
}), { virtual: true });

describe("useInteractions hook", () => {
  let originalOnLine: boolean;

  beforeAll(() => {
    originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with default states and not check if selectedDrugIds length < 2", async () => {
    const singleDrug = ["drug1"]; // Use a stable reference to prevent infinite loops
    const { result } = renderHook(() => useInteractions(singleDrug));

    expect(result.current.interactions).toEqual([]);
    expect(result.current.isChecking).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should call /api/check when selectedDrugIds has 2 or more items", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        interactions: [{ id: "int1" }],
        accumulationWarnings: [],
        foodInteractions: [],
        contraindications: [],
        polypharmacyReport: null,
      }),
    });

    const twoDrugs = ["drug1", "drug2"]; // Use a stable reference
    const { result } = renderHook(() => useInteractions(twoDrugs));

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith("/api/check", expect.any(Object));
    expect(result.current.interactions).toEqual([{ id: "int1" }]);
  });

  it("should fallback to local interactions when API fails", async () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));

    const mockInteractionsLib = require("@/lib/interactions");
    mockInteractionsLib.findInteractions.mockReturnValue([{ id: "local-int1" }]);
    mockInteractionsLib.checkAccumulation.mockReturnValue([]);
    mockInteractionsLib.findFoodInteractions.mockReturnValue([]);
    mockInteractionsLib.findContraindications.mockReturnValue([]);
    mockInteractionsLib.checkPolypharmacyAndBeers.mockReturnValue(null);

    const twoDrugs = ["drug1", "drug2"]; // Use a stable reference
    const { result } = renderHook(() => useInteractions(twoDrugs));

    await waitFor(() => {
      expect(result.current.interactions).toEqual([{ id: "local-int1" }]);
    });

    expect(fetch).toHaveBeenCalled();
    expect(result.current.isChecking).toBe(false);

    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
