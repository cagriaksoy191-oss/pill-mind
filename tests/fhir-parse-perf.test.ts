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
    let res1;
    let res2;
    const start1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      res1 = params.find(p => p.name === "medications");
      res2 = params.find(p => p.name === "patientContext");
    }
    const end1 = performance.now();
    expect(res1).toBeDefined();
    expect(res2).toBeDefined();

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

  it("benchmarks FHIR Bundle MedicationRequest parsing", () => {
    const entries = Array.from({ length: 1000 }, (_, i) => ({
      resource: {
        resourceType: i % 2 === 0 ? "MedicationRequest" : "Observation",
        medicationReference: i % 4 === 0 ? { reference: `Medication/drug-${i}` } : undefined,
        medicationCodeableConcept: i % 4 === 2 ? { text: `Drug-${i}` } : undefined,
      }
    }));

    const iterations = 5000;

    // Baseline: for...of with optional chaining and startsWith
    const start1 = performance.now();
    for (let iter = 0; iter < iterations; iter++) {
      const drugIds: string[] = [];
      for (const entry of entries) {
        const resource = entry.resource;
        if (resource && resource.resourceType === "MedicationRequest") {
          const ref = resource.medicationReference?.reference;
          if (ref && ref.startsWith("Medication/")) {
            drugIds.push(ref.slice(11));
          } else if (resource.medicationCodeableConcept?.text) {
            drugIds.push(resource.medicationCodeableConcept.text.toLowerCase());
          }
        }
      }
    }
    const end1 = performance.now();

    // Optimized: indexed loop with cached length and streamlined property checks
    const start2 = performance.now();
    for (let iter = 0; iter < iterations; iter++) {
      const drugIds: string[] = [];
      const len = entries.length;
      for (let i = 0; i < len; i++) {
        const resource = entries[i].resource;
        if (resource && resource.resourceType === "MedicationRequest") {
          const medRef = resource.medicationReference;
          const ref = medRef && medRef.reference;
          if (ref && ref.startsWith("Medication/")) {
            drugIds.push(ref.slice(11));
          } else {
            const text = resource.medicationCodeableConcept && resource.medicationCodeableConcept.text;
            if (text) {
              drugIds.push(text.toLowerCase());
            }
          }
        }
      }
    }
    const end2 = performance.now();

    console.log(`[BENCHMARK Bundle] Baseline (for...of): ${(end1 - start1).toFixed(2)} ms`);
    console.log(`[BENCHMARK Bundle] Optimized (indexed loop): ${(end2 - start2).toFixed(2)} ms`);

    expect(end2 - start2).toBeLessThanOrEqual(end1 - start1);
  });
});
