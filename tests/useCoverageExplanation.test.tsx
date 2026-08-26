/** @jest-environment jsdom */
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCoverageExplanation } from "../hooks/useCoverageExplanation";
import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from 'util';

// Mock global.fetch
global.fetch = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.TextDecoder = TextDecoder as any;

describe("useCoverageExplanation hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with default states", () => {
    const { result } = renderHook(() => useCoverageExplanation([]));
    expect(result.current.coverageExplanation).toBeNull();
    expect(result.current.isCoverageLoading).toBe(false);
    expect(result.current.showCoveragePanel).toBe(false);
  });

  it("should not fetch if selectedDrugIds length is less than 2", async () => {
    const { result } = renderHook(() => useCoverageExplanation(["drug1"]));

    await act(async () => {
      await result.current.handleRequestCoverageExplanation();
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.isCoverageLoading).toBe(false);
  });

  it("should handle successful JSON response", async () => {
    const mockData = { explanation: "This is a test explanation", source: "gemini_live" };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: async () => mockData,
    });

    const { result } = renderHook(() => useCoverageExplanation(["drug1", "drug2"]));

    await act(async () => {
      await result.current.handleRequestCoverageExplanation();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/explain", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug1", "drug2"], stream: true }),
    }));

    await waitFor(() => {
      expect(result.current.coverageExplanation).toEqual(mockData);
      expect(result.current.isCoverageLoading).toBe(false);
    });
  });

  it("should handle HTTP 500 API errors (!res.ok)", async () => {
    // Suppress console.error in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 500,
      ok: false,
    });

    const { result } = renderHook(() => useCoverageExplanation(["drug1", "drug2"]));

    await act(async () => {
      await result.current.handleRequestCoverageExplanation();
    });

    await waitFor(() => {
      expect(result.current.coverageExplanation).toEqual({
        source: "error",
        error: "Canlı AI kombinasyon analizi şu anda oluşturulamadı. Lütfen daha sonra tekrar deneyin.",
        reason: "api_error",
      });
      expect(result.current.isCoverageLoading).toBe(false);
    });

    consoleSpy.mockRestore();
  });

  it("should handle network errors (fetch throw)", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(() => useCoverageExplanation(["drug1", "drug2"]));

    await act(async () => {
      await result.current.handleRequestCoverageExplanation();
    });

    await waitFor(() => {
      expect(result.current.coverageExplanation).toEqual({
        source: "error",
        error: "Canlı AI kombinasyon analizi şu anda oluşturulamadı. Lütfen daha sonra tekrar deneyin.",
        reason: "api_error",
      });
      expect(result.current.isCoverageLoading).toBe(false);
    });

    consoleSpy.mockRestore();
  });

  it("should handle successful text/event-stream response", async () => {
    const encoder = new TextEncoder();

    // Simulate streaming chunks
    const chunks = [
      encoder.encode('data: {"chunk": "Hello "}\n'),
      encoder.encode('data: {"chunk": "World"}\n'),
      encoder.encode('data: {"done": true, "generatedAt": "2024-01-01"}\n'),
      encoder.encode('data: [DONE]\n')
    ];

    let chunkIndex = 0;

    const mockReader = {
      read: jest.fn().mockImplementation(() => {
        if (chunkIndex < chunks.length) {
          return Promise.resolve({ done: false, value: chunks[chunkIndex++] });
        }
        return Promise.resolve({ done: true, value: undefined });
      })
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "Content-Type": "text/event-stream" }),
      body: {
        getReader: () => mockReader,
      }
    });

    const { result } = renderHook(() => useCoverageExplanation(["drug1", "drug2"]));

    await act(async () => {
      await result.current.handleRequestCoverageExplanation();
    });

    await waitFor(() => {
      expect(result.current.coverageExplanation).toEqual({
        source: "gemini_live",
        explanation: "Hello World",
        generatedAt: "2024-01-01"
      });
      expect(result.current.isCoverageLoading).toBe(false);
    });
  });

  it.each([
    ["UNSAFE_ALERT", "safety_block"],
    ["REJECTED", "safety_block"],
    ["INTERNAL_SERVER_ERROR", "api_error"],
    [undefined, "api_error"]
  ])(
    "should handle stream error payload with code %s mapping to reason %s",
    async (code, expectedReason) => {
      const encoder = new TextEncoder();
      const errorPayload = { error: "Streaming error occurred", ...(code ? { code } : {}) };
      const chunks = [
        encoder.encode(`data: ${JSON.stringify(errorPayload)}\n`),
        encoder.encode('data: [DONE]\n')
      ];
      let chunkIndex = 0;
      const mockReader = {
        read: jest.fn().mockImplementation(() => {
          if (chunkIndex < chunks.length) {
            return Promise.resolve({ done: false, value: chunks[chunkIndex++] });
          }
          return Promise.resolve({ done: true, value: undefined });
        })
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "Content-Type": "text/event-stream" }),
        body: {
          getReader: () => mockReader,
        }
      });
      const { result } = renderHook(() => useCoverageExplanation(["drug1", "drug2"]));
      await act(async () => {
        await result.current.handleRequestCoverageExplanation();
      });
      await waitFor(() => {
        expect(result.current.coverageExplanation).toEqual({
          source: "error",
          error: "Streaming error occurred",
          reason: expectedReason,
        });
        expect(result.current.isCoverageLoading).toBe(false);
      });
    }
  );

  it("should handle unparseable JSON stream chunks gracefully", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode('data: {"chunk": "Hello "}\n'),
      encoder.encode('data: {invalid json}\n'),
      encoder.encode('data: {"chunk": "World"}\n'),
      encoder.encode('data: [DONE]\n')
    ];
    let chunkIndex = 0;
    const mockReader = {
      read: jest.fn().mockImplementation(() => {
        if (chunkIndex < chunks.length) {
          return Promise.resolve({ done: false, value: chunks[chunkIndex++] });
        }
        return Promise.resolve({ done: true, value: undefined });
      })
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "Content-Type": "text/event-stream" }),
      body: {
        getReader: () => mockReader,
      }
    });
    const { result } = renderHook(() => useCoverageExplanation(["drug1", "drug2"]));
    await act(async () => {
      await result.current.handleRequestCoverageExplanation();
    });
    await waitFor(() => {
      expect(result.current.coverageExplanation).toEqual(expect.objectContaining({
        source: "gemini_live",
        explanation: "Hello World",
      }));
    });
  });

  it("should fallback when Content-Type header is not present", async () => {
    const mockData = { explanation: "This is a test explanation", source: "gemini_live" };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      json: async () => mockData,
    });
    const { result } = renderHook(() => useCoverageExplanation(["drug1", "drug2"]));
    await act(async () => {
      await result.current.handleRequestCoverageExplanation();
    });
    await waitFor(() => {
      expect(result.current.coverageExplanation).toEqual(mockData);
    });
  });
});
