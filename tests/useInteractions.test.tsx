/** @jest-environment jsdom */
import { renderHook, waitFor, act } from "@testing-library/react";
import { useInteractions } from "../hooks/useInteractions";
import "@testing-library/jest-dom";

// Mock global.fetch
global.fetch = jest.fn();

global.TextDecoder = require('util').TextDecoder;
global.TextEncoder = require('util').TextEncoder; // Add this too just in case

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
  let originalServiceWorker: any;

  beforeAll(() => {
    originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    originalServiceWorker = navigator.serviceWorker;
    if (!navigator.serviceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', {
        writable: true,
        value: { register: jest.fn().mockResolvedValue({}) },
      });
    }
  });

  afterAll(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
    if (!originalServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', {
        writable: true,
        value: undefined,
      });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const stableDrugs = ["drug1", "drug2"];
  const stableDrug = ["drug1"];
  const stableEmpty: string[] = [];

  it("should initialize with default states and not check if selectedDrugIds length < 2", async () => {
    const { result } = renderHook(() => useInteractions(stableDrug));

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

    const { result } = renderHook(() => useInteractions(stableDrugs));

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

    const { result } = renderHook(() => useInteractions(stableDrugs));

    await waitFor(() => {
      expect(result.current.interactions).toEqual([{ id: "local-int1" }]);
    });

    expect(fetch).toHaveBeenCalled();
    expect(result.current.isChecking).toBe(false);

    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("should handle serviceWorker registration in useEffect", () => {
    const originalServiceWorker = navigator.serviceWorker;
    const registerMock = jest.fn().mockResolvedValue({ scope: "/" });
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      value: { register: registerMock },
    });

    const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { unmount } = renderHook(() => useInteractions(stableEmpty));

    expect(registerMock).toHaveBeenCalledWith("/sw.js");

    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      value: originalServiceWorker,
    });
  });

  it("handleExplainRequested should early return if already loading", async () => {
    const { result } = renderHook(() => useInteractions(stableDrugs));

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

    await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
    });

    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockClear();

    let resolveApi;
    fetchMock.mockReturnValueOnce(new Promise(resolve => {
        resolveApi = resolve;
    }));



    // Fire the first request and wait a tick to ensure React flushes the loading state update
    act(() => {
        result.current.handleExplainRequested("int1", false);
    });

    // Now fire it again before the previous fetch has resolved
    act(() => {
        result.current.handleExplainRequested("int1", false);
    });



    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveApi({ ok: true, json: async () => ({}) });
  });

  it("handleExplainRequested should handle error when !res.ok", async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useInteractions(stableDrugs));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });


    await act(async () => {
      await result.current.handleExplainRequested("int1", false);
    });


    expect(result.current.explanations["int1"]).toEqual({
      source: "error",
      error: "Canlı AI açıklaması şu anda alınamadı. Lütfen tekrar deneyin.",
      reason: "api_error",
    });

    consoleErrorSpy.mockRestore();
  });

  it("handleExplainRequested should handle JSON fallback", async () => {
    const { result } = renderHook(() => useInteractions(stableDrugs));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: async () => ({ explanation: "JSON explanation fallback" }),
    });


    await act(async () => {
      await result.current.handleExplainRequested("int1", false);
    });


    expect(result.current.explanations["int1"]).toEqual({
      explanation: "JSON explanation fallback"
    });
  });

  it("handleRequestCoverageExplanation should early return if < 2 drugs", async () => {
    const { result } = renderHook(() => useInteractions(stableDrug));
    (global.fetch as jest.Mock).mockClear();


    await act(async () => {
      await result.current.handleRequestCoverageExplanation();
    });


    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("handleRequestCoverageExplanation should handle error when !res.ok", async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useInteractions(stableDrugs));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });


    await act(async () => {
      await result.current.handleRequestCoverageExplanation();
    });


    expect(result.current.coverageExplanation).toEqual({
      source: "error",
      error: "Canlı AI kombinasyon analizi şu anda oluşturulamadı. Lütfen daha sonra tekrar deneyin.",
      reason: "api_error",
    });

    consoleErrorSpy.mockRestore();
  });

  it("handleRequestCoverageExplanation should handle JSON fallback", async () => {
    const { result } = renderHook(() => useInteractions(stableDrugs));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: async () => ({ source: "json", explanation: "JSON coverage fallback" }),
    });


    await act(async () => {
      await result.current.handleRequestCoverageExplanation();
    });


    expect(result.current.coverageExplanation).toEqual({
      source: "json",
      explanation: "JSON coverage fallback"
    });
  });

  it("handleExplainRequested should parse SSE stream data", async () => {
    const { result } = renderHook(() => useInteractions(stableDrugs));

    const mockChunks = [
        'data: {"chunk": "Hello "}\n\n',
        'data: {"chunk": "World"}\n\n',
        'data: {"done": true, "generatedAt": "2024-01-01"}\n\n',
        'data: [DONE]\n\n'
    ];

    let chunkIndex = 0;
    const mockReader = {
        read: jest.fn().mockImplementation(() => {
            if (chunkIndex < mockChunks.length) {
                return Promise.resolve({ done: false, value: new TextEncoder().encode(mockChunks[chunkIndex++].replace(/\\n/g, '\n')) });
            }
            return Promise.resolve({ done: true, value: undefined });
        })
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "Content-Type": "text/event-stream" }),
      body: { getReader: () => mockReader },
    });


    await act(async () => {
      await result.current.handleExplainRequested("int1", true);
    });


    expect(result.current.explanations["int1"]).toEqual({
      source: "gemini_live",
      explanation: "Hello World",
      generatedAt: "2024-01-01"
    });
  });

  it("handleRequestCoverageExplanation should parse SSE stream data", async () => {
    const { result } = renderHook(() => useInteractions(stableDrugs));

    const mockChunks = [
        'data: {"chunk": "Coverage "}\n\n',
        'data: {"chunk": "Data"}\n\n',
        'data: {"done": true, "generatedAt": "2024-01-02"}\n\n',
        'data: [DONE]\n\n'
    ];

    let chunkIndex = 0;
    const mockReader = {
        read: jest.fn().mockImplementation(() => {
            if (chunkIndex < mockChunks.length) {
                return Promise.resolve({ done: false, value: new TextEncoder().encode(mockChunks[chunkIndex++].replace(/\\n/g, '\n')) });
            }
            return Promise.resolve({ done: true, value: undefined });
        })
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "Content-Type": "text/event-stream" }),
      body: { getReader: () => mockReader },
    });


    await act(async () => {
      await result.current.handleRequestCoverageExplanation();
    });


    expect(result.current.coverageExplanation).toEqual({
      source: "gemini_live",
      explanation: "Coverage Data",
      generatedAt: "2024-01-02"
    });
  });

});
