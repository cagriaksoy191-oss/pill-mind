import { streamGeminiContent } from "../lib/gemini";
import { MODEL_CHAIN } from "../lib/gemini";

// Setup polyfills
const util = require('util');
global.TextDecoder = util.TextDecoder;
global.TextEncoder = util.TextEncoder;

describe("streamGeminiContent Benchmark", () => {
    const originalFetch = global.fetch;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv, GOOGLE_API_KEY: "test_key", GEMINI_MODEL: "gemini-2.5-flash-lite" };
    });

    afterEach(() => {
        global.fetch = originalFetch;
        process.env = originalEnv;
        jest.restoreAllMocks();
    });

    it("should measure execution time with speculative retry", async () => {
        global.fetch = jest.fn().mockImplementation(async (url, options) => {
            if (url.includes("gemini-2.5-flash-lite")) {
                // Simulate an API that is very slow but doesn't immediately fail.
                // Speculative execution should kick in at 1500ms
                await new Promise(r => setTimeout(r, 4000));
                return { ok: true, body: { getReader: () => ({ read: async () => ({ done: true }) }) } };
            } else if (url.includes("gemini-2.5-flash")) {
                 // Fast fallback model
                 await new Promise(r => setTimeout(r, 200));
                 const body = {
                     getReader: () => {
                         let readCount = 0;
                         return {
                             read: async () => {
                                 if (readCount === 0) {
                                     readCount++;
                                     const encoder = new TextEncoder();
                                     return { done: false, value: encoder.encode('{ "candidates": [{ "content": { "parts": [{ "text": "success chunk 1" }] } }] }') };
                                 } else {
                                     return { done: true, value: undefined };
                                 }
                             }
                         };
                     }
                 };
                 return { ok: true, body };
            }
            return { ok: false, status: 404 };
        });

        const startTime = Date.now();
        const generator = streamGeminiContent("test prompt");
        let fullText = "";
        for await (const chunk of generator) {
            fullText += chunk;
        }
        const endTime = Date.now();
        console.log(`[BENCHMARK] streamGeminiContent Execution Time: ${endTime - startTime}ms`);
        expect(fullText).toContain("success chunk 1");

        // Assert execution time is around speculative timeout (1500) + fast model time (200) = ~1700ms, not 4000ms+
        expect(endTime - startTime).toBeLessThan(3000);
    }, 10000);
});
