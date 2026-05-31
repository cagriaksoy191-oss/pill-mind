1. **Create `components/StatusHeader.tsx`**: Extract the header section which includes the logo, system status label, and navigation. This separates the header logic (`getSystemStatusLabel`, `getSystemStatusBadgeClass`) from the main page.
2. **Create `components/InteractionList.tsx`**: Extract the interaction map loop and the button to run collective full-combination coverage report.
3. **Create `components/CoveragePanel.tsx`**: Extract the "Global Coverage AI Explanation Display Panel" to reduce the JSX footprint in the main page.
4. **Update `app/kontrol/page.tsx`**: Import and use `StatusHeader`, `InteractionList`, and `CoveragePanel` instead of having them inline. Remove unused functions and imports from `page.tsx`.
