🧹 [Code Health Improvement] Replace console.error with Sentry in UserPanel

🎯 What: Track unhandled exceptions in the `UserPanel` component by replacing `console.error` logs with proper `Sentry.captureException` calls. Also removed explicit `any` types in `catch` blocks.
💡 Why: Tracking errors via Sentry improves production observability and maintainability. Typing the catch blocks to properly infer `Error` instead of `any` helps adhere to TypeScript strictness, fixing linting issues.
✅ Verification: Ran `npm run lint -- components/UserPanel.tsx`, `npm test` and ensured the code compiles.
✨ Result: Code is cleaner, correctly typed, without any stray logs or lint errors.
