---
"eslint-plugin-tailwind-classify": patch
---

Support the full declared ESLint range (`>=8.0.0`) and verify ESLint 10.

- On ESLint 8.0–8.39 (before `context.sourceCode` existed) the rule now falls
  back to `getSourceCode()` instead of throwing, matching the `>=8.0.0`
  peerDependency.
- Verified compatible with ESLint 10 (all tests pass under 10.x); a CI job now
  guards this.
