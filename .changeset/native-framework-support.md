---
"eslint-plugin-tailwind-classify": minor
---

Native ESLint support for Svelte, Vue, and Astro `class` attributes.

`eslint --fix` now groups and wraps `class="…"` directly in:

- **Svelte** (`.svelte` markup) — via `svelte-eslint-parser`;
- **Vue** (`.vue` `<template>`) — via `vue-eslint-parser`'s template AST;
- **Astro** (`.astro` markup) — via `astro-eslint-parser`.

Dynamic forms (`:class`, `v-bind:class`, `class={…}`, `class:foo`) are left
untouched, and `clsx`/`cva`/`tw` usage in `<script>`/frontmatter is handled as
before. As a bonus, `class` in JSX dialects that use it (Preact, Solid) is now
formatted too. Configure the matching ESLint parser for your file type — see the
README's per-framework setup.
