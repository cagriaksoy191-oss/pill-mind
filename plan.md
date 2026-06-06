1. **Define a bounded cache for Database Lookups in `lib/gemini.ts`**:
   - Create a simple in-memory Map to cache `interactionId` -> `InteractionRecord`.
   - To avoid memory leaks (since standard Map is unbounded), we will implement a lightweight bounded LRU-like approach or just clear it if it exceeds a certain size (e.g., `if (dbCache.size > 1000) dbCache.clear();`), which is the same pattern already used in `app/api/explain/route.ts` for caching LLM outputs.

2. **Modify `getInteractionContext` in `lib/gemini.ts` to use this cache**:
   - Check the `dbCache` right after checking `interactionsMap`.
   - If found in `dbCache`, use it.
   - If not found, do the `prisma.drugInteraction.findUnique(...)` lookup.
   - If a record is found in the DB, store it in the `dbCache`.

3. **Verify the change via benchmarks and tests**:
   - Run the benchmark script I created (`tests/benchmark-getInteractionContext.test.ts`) to prove that the second call is significantly faster (e.g., ~0-1ms instead of 50ms).
   - Run the full test suite (`npm test`) to make sure nothing is broken.
   - Run linting and formatting.

4. **Complete Pre-commit Steps**:
   - Call `pre_commit_instructions` to ensure testing and review standards are met.
