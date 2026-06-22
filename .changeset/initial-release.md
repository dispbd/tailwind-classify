---
"eslint-plugin-tailwind-classify": minor
---

Initial release.

- ESLint rule `multiline`: groups Tailwind classes by semantic category and wraps long lists onto multiple lines, with autofix. Cascade-safe — only reorders/wraps, removes exact duplicates only, never merges conflicting utilities, and preserves unknown / arbitrary / `!important` classes verbatim.
- Supports JSX `className`, class helpers (`clsx`, `classnames`, `cn`, `cx`, `cva`, `ctl`, `twMerge`, `twJoin`, `tw`), and tagged templates.
- Options: `group`, `categoryOrder`, `printWidth`, `maxClassesPerLine`, `indentStep`, `quotesOnNewLine`, `preserveUnknownClasses`, `callees`, `tags`, `tailwindConfig`, `entryPoint`.
- Programmatic API for markup (HTML / Vue / Svelte / Astro): `formatMarkup`, `formatHtml`, `extractClassAttributes`, `formatClassValue`.
- Optional Tailwind v3 `getClassOrder` integration for intra-category ordering.
