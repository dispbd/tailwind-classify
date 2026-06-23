# eslint-plugin-tailwind-classify

## 0.2.1

### Patch Changes

- 76e1d90: Support the full declared ESLint range (`>=8.0.0`) and verify ESLint 10.

  - On ESLint 8.0–8.39 (before `context.sourceCode` existed) the rule now falls
    back to `getSourceCode()` instead of throwing, matching the `>=8.0.0`
    peerDependency.
  - Verified compatible with ESLint 10 (all tests pass under 10.x); a CI job now
    guards this.

## 0.2.0

### Minor Changes

- 1727479: Native ESLint support for Svelte, Vue, and Astro `class` attributes.

  `eslint --fix` now groups and wraps `class="…"` directly in:

  - **Svelte** (`.svelte` markup) — via `svelte-eslint-parser`;
  - **Vue** (`.vue` `<template>`) — via `vue-eslint-parser`'s template AST;
  - **Astro** (`.astro` markup) — via `astro-eslint-parser`.

  Dynamic forms (`:class`, `v-bind:class`, `class={…}`, `class:foo`) are left
  untouched, and `clsx`/`cva`/`tw` usage in `<script>`/frontmatter is handled as
  before. As a bonus, `class` in JSX dialects that use it (Preact, Solid) is now
  formatted too. Configure the matching ESLint parser for your file type — see the
  README's per-framework setup.

## 0.1.0

### Minor Changes

- ff68178: Initial release.

  - ESLint rule `multiline`: groups Tailwind classes by semantic category and wraps long lists onto multiple lines, with autofix. Cascade-safe — only reorders/wraps, removes exact duplicates only, never merges conflicting utilities, and preserves unknown / arbitrary / `!important` classes verbatim.
  - Supports JSX `className`, class helpers (`clsx`, `classnames`, `cn`, `cx`, `cva`, `ctl`, `twMerge`, `twJoin`, `tw`), and tagged templates.
  - Options: `group`, `categoryOrder`, `printWidth`, `maxClassesPerLine`, `indentStep`, `quotesOnNewLine`, `preserveUnknownClasses`, `callees`, `tags`, `tailwindConfig`, `entryPoint`.
  - Programmatic API for markup (HTML / Vue / Svelte / Astro): `formatMarkup`, `formatHtml`, `extractClassAttributes`, `formatClassValue`.
  - Optional Tailwind v3 `getClassOrder` integration for intra-category ordering.
