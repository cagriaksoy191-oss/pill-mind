/** @jest-environment jsdom */
import { renderHook, waitFor, act } from "@testing-library/react";
import { useInteractionExplanations } from "../hooks/useInteractionExplanations";
import "@testing-library/jest-dom";

// Mock global.fetch
global.fetch = jest.fn();
global.TextDecoder = require('util').TextDecoder;
global.TextEncoder = require('util').TextEncoder;

describe("useInteractionExplanations hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handleExplainRequested should handle JSON fallback", async () => {
    const { result } = renderHook(() => useInteractionExplanations());

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

  it("handleExplainRequested should parse SSE stream data successfully", async () => {
    const { result } = renderHook(() => useInteractionExplanations());

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

  it("handleExplainRequested should parse SSE stream data with error and UNSAFE_ALERT code", async () => {
    const { result } = renderHook(() => useInteractionExplanations());

    const mockChunks = [
        'data: {"error": "Safety blocked", "code": "UNSAFE_ALERT"}\n\n',
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
      source: "error",
      error: "Safety blocked",
      reason: "safety_block"
    });
  });

  it("handleExplainRequested should parse SSE stream data with error and OTHER_ERROR code", async () => {
    const { result } = renderHook(() => useInteractionExplanations());

    const mockChunks = [
        'data: {"error": "API error", "code": "OTHER_ERROR"}\n\n',
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
      source: "error",
      error: "API error",
      reason: "api_error"
    });
  });

  it("handleExplainRequested should handle error when !res.ok", async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useInteractionExplanations());

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

  it("handleExplainRequested should return early if already loading", async () => {
    const { result } = renderHook(() => useInteractionExplanations());

    let resolveApi: any;
    (global.fetch as jest.Mock).mockReturnValueOnce(new Promise(resolve => {
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

    expect(global.fetch).toHaveBeenCalledTimes(1);
    resolveApi({ ok: true, headers: new Headers(), json: async () => ({}) });
  });

  it("handleExplainRequested should ignore empty chunk without reader", async () => {
    const { result } = renderHook(() => useInteractionExplanations());

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "Content-Type": "text/event-stream" }),
      body: { getReader: () => undefined }, // return undefined reader
    });

    await act(async () => {
      await result.current.handleExplainRequested("int1", false);
    });

    // Process stream returns early.
    expect(result.current.explanations["int1"]).toBeUndefined();
  });

  it("handleExplainRequested should handle JSON parsing errors gracefully on split chunks", async () => {
    const { result } = renderHook(() => useInteractionExplanations());

    const mockChunks = [
        'data: {"chunk": "First part ',
        'and second part"}\n\n',
        'data: {"done": true, "generatedAt": "2024-01-03"}\n\n',
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
      explanation: "First part and second part",
      generatedAt: "2024-01-03"
    });
  });

});
