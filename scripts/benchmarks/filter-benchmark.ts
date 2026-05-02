
import { performance } from 'perf_hooks';

// Simulate the data structure
interface Drug {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
}

// Generate a larger dataset for meaningful measurement
function generateDrugs(count: number): Drug[] {
  const drugs: Drug[] = [];
  for (let i = 0; i < count; i++) {
    drugs.push({
      id: `drug-${i}`,
      name: `Drug Name ${i} Some Extra Text To Make It Longer`,
      activeIngredient: `Ingredient ${i} Also Some Extra Text`,
      category: 'Category'
    });
  }
  return drugs;
}

const drugs = generateDrugs(10000);
const query = "drug-999";
const selected: string[] = [];
const selectedSet = new Set(selected);

function baseline() {
  const lowerQuery = query.toLowerCase();
  return drugs.filter(
    (d) =>
      !selectedSet.has(d.id) &&
      (d.name.toLowerCase().includes(lowerQuery) ||
        d.activeIngredient.toLowerCase().includes(lowerQuery))
  );
}

// Pre-transformed data for comparison
const transformedDrugs = drugs.map(d => ({
  ...d,
  lowerName: d.name.toLowerCase(),
  lowerIngredient: d.activeIngredient.toLowerCase()
}));

function optimized() {
  const lowerQuery = query.toLowerCase();
  return transformedDrugs.filter(
    (d) =>
      !selectedSet.has(d.id) &&
      (d.lowerName.includes(lowerQuery) ||
        d.lowerIngredient.includes(lowerQuery))
  );
}

function runBenchmark(name: string, fn: () => void, iterations: number = 100) {
  // Warmup
  for (let i = 0; i < 10; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  console.log(`${name}: ${(end - start) / iterations}ms per iteration`);
}

console.log("Running benchmarks with 10,000 drugs...");
runBenchmark("Baseline (toLowerCase in loop)", baseline);
runBenchmark("Optimized (pre-lowercased)", optimized);
