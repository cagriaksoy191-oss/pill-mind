import { findContraindications } from "@/lib/interactions/contraindications";
import { LRUCache } from "@/lib/lruCache";

describe("Contraindications LRU Resolution Benchmark", () => {
  it("benchmarks LRU cache performance during high churn and capacity limits", () => {
    // Prime the contraindications resolveCache with 4500 entries
    const hotKeys = Array.from({ length: 4500 }, (_, i) => `coraspin_${i}`);
    findContraindications(hotKeys, { isPregnant: true });

    // Now introduce 1000 items that overflow the 5000 capacity boundary
    const overflowKeys = Array.from({ length: 1000 }, (_, i) => `overflow_drug_${i}`);

    const start = performance.now();
    for (let iter = 0; iter < 100; iter++) {
      findContraindications(overflowKeys, { isPregnant: true });
    }
    const end = performance.now();

    const totalTimeMs = end - start;
    console.log(`[BENCHMARK] Contraindications LRU Cache resolution under overflow (100 iterations x 1000 items): ${totalTimeMs.toFixed(2)} ms`);

    expect(totalTimeMs).toBeGreaterThan(0);
  });

  it("compares LRU Cache vs full Map wipe strategy under continuous query churn", () => {
    const capacity = 5000;
    const lruCache = new LRUCache<string, string>(capacity);
    const naiveMap = new Map<string, string>();

    const hotItems = Array.from({ length: 4500 }, (_, i) => `hot_alias_${i}`);
    const coldItems = Array.from({ length: 2000 }, (_, i) => `cold_alias_${i}`);

    // Pre-fill both caches with hot items
    for (const key of hotItems) {
      lruCache.set(key, `canonical_${key}`);
      naiveMap.set(key, `canonical_${key}`);
    }

    let naiveHits = 0;
    let naiveMisses = 0;
    let lruHits = 0;
    let lruMisses = 0;

    // Simulate workload: Query hot items 80% of the time, cold items 20% of the time
    const simulateNaive = () => {
      let coldIdx = 0;
      const start = performance.now();
      for (let i = 0; i < 20000; i++) {
        const isHot = i % 5 !== 0;
        const key = isHot ? hotItems[i % hotItems.length] : coldItems[coldIdx++ % coldItems.length];

        let val = naiveMap.get(key);
        if (val !== undefined) {
          naiveHits++;
        } else {
          naiveMisses++;
          if (naiveMap.size >= capacity) {
            naiveMap.clear(); // Naive full wipe strategy
          }
          val = `canonical_${key}`;
          naiveMap.set(key, val);
        }
      }
      return performance.now() - start;
    };

    const simulateLRU = () => {
      let coldIdx = 0;
      const start = performance.now();
      for (let i = 0; i < 20000; i++) {
        const isHot = i % 5 !== 0;
        const key = isHot ? hotItems[i % hotItems.length] : coldItems[coldIdx++ % coldItems.length];

        let val = lruCache.get(key);
        if (val !== undefined) {
          lruHits++;
        } else {
          lruMisses++;
          val = `canonical_${key}`;
          lruCache.set(key, val); // Bounded LRU eviction
        }
      }
      return performance.now() - start;
    };

    const naiveTime = simulateNaive();
    const lruTime = simulateLRU();

    const naiveHitRatio = ((naiveHits / (naiveHits + naiveMisses)) * 100).toFixed(2);
    const lruHitRatio = ((lruHits / (lruHits + lruMisses)) * 100).toFixed(2);

    console.log(`[BENCHMARK] Naive Clear Strategy - Time: ${naiveTime.toFixed(2)} ms | Hit Ratio: ${naiveHitRatio}% (Hits: ${naiveHits}, Misses: ${naiveMisses})`);
    console.log(`[BENCHMARK] LRU Eviction Strategy - Time: ${lruTime.toFixed(2)} ms | Hit Ratio: ${lruHitRatio}% (Hits: ${lruHits}, Misses: ${lruMisses})`);

    expect(lruHits).toBeGreaterThan(naiveHits);
  });
});
