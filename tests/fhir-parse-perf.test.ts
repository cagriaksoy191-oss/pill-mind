describe("FHIR Parameters Parsing Performance", () => {
  it("benchmarks find vs single pass", () => {
    // Generate a large array of parameters to make the difference measurable
    const params = Array.from({ length: 1000 }, (_, i) => ({
      name: `param_${i}`,
      valueString: `value_${i}`
    }));

    // Add the target ones near the end
    params.push({ name: "medications", valueString: "drug1,drug2" });
    params.push({ name: "patientContext", valueString: "{}" });

    const iterations = 10000;

    // Baseline: current implementation (two finds)
    const start1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      const medsParam = params.find(p => p.name === "medications");
      const ctxParam = params.find(p => p.name === "patientContext");
    }
    const end1 = performance.now();

    // Optimized: single pass using a for loop
    const start2 = performance.now();
    for (let i = 0; i < iterations; i++) {
      let medsParam;
      let ctxParam;
      for (const p of params) {
        if (p.name === "medications") medsParam = p;
        else if (p.name === "patientContext") ctxParam = p;

        if (medsParam && ctxParam) break;
      }
    }
    const end2 = performance.now();

    console.log(`[BENCHMARK] Baseline (two finds): ${(end1 - start1).toFixed(2)} ms`);
    console.log(`[BENCHMARK] Optimized (single pass): ${(end2 - start2).toFixed(2)} ms`);

    expect(end2 - start2).toBeLessThanOrEqual(end1 - start1);
  });
});
