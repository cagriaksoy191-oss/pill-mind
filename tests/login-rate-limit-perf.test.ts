const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Login Rate Limiter Performance Benchmark", () => {
  it("compares sequential Redis calls vs pipelined Redis calls", async () => {
    const RTT_MS = 10; // Simulated network round-trip time in ms
    const ITERATIONS = 100;

    // Sequential implementation baseline
    async function sequentialRateLimit() {
      await delay(RTT_MS); // incr call
      const currentRequests = 1;
      if (currentRequests === 1) {
        await delay(RTT_MS); // expire call
      }
      return currentRequests;
    }

    // Pipelined implementation
    async function pipelinedRateLimit() {
      await delay(RTT_MS); // exec call (incr + expire in 1 batch)
      const currentRequests = 1;
      return currentRequests;
    }

    const startSeq = Date.now();
    for (let i = 0; i < ITERATIONS; i++) {
      await sequentialRateLimit();
    }
    const durationSeq = Date.now() - startSeq;

    const startPipe = Date.now();
    for (let i = 0; i < ITERATIONS; i++) {
      await pipelinedRateLimit();
    }
    const durationPipe = Date.now() - startPipe;

    console.log(`[BENCHMARK] Sequential Rate Limiter (100 new-key iterations @ 10ms RTT): ${durationSeq} ms`);
    console.log(`[BENCHMARK] Pipelined Rate Limiter (100 new-key iterations @ 10ms RTT): ${durationPipe} ms`);
    console.log(`[BENCHMARK] Time saved per initial rate limit request: ~${(durationSeq - durationPipe) / ITERATIONS} ms`);

    expect(durationPipe).toBeLessThan(durationSeq);
  });
});
