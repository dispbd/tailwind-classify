# eslint-plugin-tailwind-classify

[![npm version](https://img.shields.io/npm/v/eslint-plugin-tailwind-classify.svg)](https://www.npmjs.com/package/eslint-plugin-tailwind-classify)
[![license](https://img.shields.io/npm/l/eslint-plugin-tailwind-classify.svg)](./LICENSE)

> Splits long Tailwind class lists onto multiple lines, **grouped by semantic category** (layout, spacing, typography, …), with variants nested inside each group.

## Why

The official `prettier-plugin-tailwindcss` only sorts classes into a single line, and Prettier itself can't format the `class`/`className` attribute across multiple lines (it collapses whitespace). So this is an **ESLint rule** with autofix instead.

Other ESLint multi-line plugins wrap by print width and group by *variant*. `classify` is different: it groups by **semantic category**, so each line answers one question — "what are the spacing classes? the typography classes?".

```jsx
// before
<div className="flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100" />

// after
<div className="
  flex flex-col items-center justify-center
  px-5 py-15
  text-sm text-neutral-100
" />
```

Short lists are reordered on a single line instead of wrapped:

```jsx
// before                         // after
<div className="text-sm flex p-4" />   →   <div className="flex p-4 text-sm" />
```

## Install

```sh
npm i -D eslint-plugin-tailwind-classify
```

Requires ESLint 8 or 9.

## Usage

Flat config (`eslint.config.js`) — recommended:

```js
import tailwindClassify from "eslint-plugin-tailwind-classify";

export default [
  tailwindClassify.configs.recommended,
];
```

Or wire it manually (e.g. to pass options or scope it to certain files):

```js
import tailwindClassify from "eslint-plugin-tailwind-classify";

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { "tailwind-classify": tailwindClassify },
    rules: {
      "tailwind-classify/multiline": ["error", { printWidth: 100 }],
    },
  },
];
```

Run `eslint --fix` to apply the grouping.

### Integration by syntax

The rule runs wherever your ESLint config can parse the file. It always handles
JS-level usage (`className`, helper calls, tagged templates); for component
frameworks it also handles the template `class` attribute when the matching
ESLint parser is configured.

- **JS / TS / JSX / TSX** — works out of the box. The default parser handles JSX
  with `parserOptions.ecmaFeatures.jsx`; use `@typescript-eslint/parser` for
  `.ts`/`.tsx`.
- **Svelte** — supported natively (see below). `class="…"` in `.svelte` markup is
  grouped/wrapped; `class={…}` and `class:foo` directives are left alone.
- **Vue** — supported natively (see below). `class="…"` in `.vue` `<template>` is
  grouped/wrapped; `:class` / `v-bind:class` directives are left alone.
- **Astro** — supported natively (see below). `class="…"` in `.astro` markup is
  grouped/wrapped; `class={…}` expressions are left alone.
- **Preact / Solid** — these JSX dialects use `class`; it's handled like
  `className`, no extra setup.
- **Plain HTML** — no ESLint parser; use the programmatic `formatMarkup`.

#### Svelte

Svelte files are parsed by [`svelte-eslint-parser`](https://github.com/sveltejs/eslint-plugin-svelte)
(bundled with `eslint-plugin-svelte`). Add the rule for `.svelte` files:

```js
import svelte from "eslint-plugin-svelte";
import tailwindClassify from "eslint-plugin-tailwind-classify";

export default [
  ...svelte.configs.recommended, // sets svelte-eslint-parser for *.svelte
  tailwindClassify.configs.recommended,
];
```

`tailwind-classify/multiline` then fixes `class="…"` in `.svelte` markup and any
`clsx`/`cva`/`tw` usage in `<script>`.

#### Vue

Vue SFCs are parsed by [`vue-eslint-parser`](https://github.com/vuejs/vue-eslint-parser).
Set it as the parser for `.vue` files (`eslint-plugin-vue`'s configs do this):

```js
import vue from "eslint-plugin-vue";
import tailwindClassify from "eslint-plugin-tailwind-classify";

export default [
  ...vue.configs["flat/recommended"], // sets vue-eslint-parser for *.vue
  tailwindClassify.configs.recommended,
];
```

`class="…"` in the `<template>` is fixed (the rule reads the template AST via
`vue-eslint-parser`), as is `clsx`/`cva`/`tw` usage in `<script>`.

#### Astro

Astro files are parsed by [`astro-eslint-parser`](https://github.com/ota-meshi/eslint-plugin-astro)
(bundled with `eslint-plugin-astro`):

```js
import astro from "eslint-plugin-astro";
import tailwindClassify from "eslint-plugin-tailwind-classify";

export default [
  ...astro.configs.recommended, // sets astro-eslint-parser for *.astro
  tailwindClassify.configs.recommended,
];
```

`class="…"` in `.astro` markup is fixed, as is `clsx`/`cva`/`tw` in the
frontmatter.

#### Programmatic (HTML / scripts)

```js
import { formatMarkup } from "eslint-plugin-tailwind-classify";

const out = formatMarkup('<div class="text-sm flex p-4"></div>');
// → '<div class="flex p-4 text-sm"></div>'
```

`formatMarkup(source, options)` accepts the same options as the rule.
`formatClassValue`, `extractClassAttributes`, `groupByCategory`, and `toLines`
are also exported for finer-grained use.

### What it formats

- **JSX `className`** — string literals and no-substitution template literals.
- **HTML / Vue / Svelte / Astro `class`** — static attributes. Dynamic bindings (`:class`, `v-bind:class`, `[class]`, `class:list`, `class={…}`) are left alone.
- **Class helpers** — `clsx` / `classnames` / `cn` / `cx` / `cva` / `ctl` / `twMerge` / `twJoin` / `tw`, including string, array, object, and conditional arguments. `cva` variant values and clsx-style object keys are both handled.
- **Tagged templates** — `` tw`…` ``.

> Wrapping requires a context that allows newlines (JSX attributes, template literals, HTML). Ordinary JS string literals (e.g. `clsx("…")`) can't contain raw newlines, so there they are only **regrouped on a single line**, never wrapped.

## Categories

Classes are grouped into these categories, in this default order; unknown / custom classes go on a leading line.

`layout` · `flexbox-grid` · `spacing` · `sizing` · `typography` · `backgrounds` · `borders` · `effects` · `filters` · `tables` · `transitions-animation` · `transforms` · `interactivity` · `svg` · `accessibility`

> Note: the display utilities `flex` / `inline-flex` / `grid` / `inline-grid` are grouped under **flexbox-grid** (not layout) so `flex flex-col items-center` stay on one line.

## Options

```js
"tailwind-classify/multiline": ["error", { printWidth: 100, group: "category-variant" }]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `group` | `"category" \| "variant" \| "category-variant"` | `"category-variant"` | Line layout: one line per category, per variant chain, or per category with variants nested. |
| `categoryOrder` | `string[]` | docs order | Override the category order. Listed categories lead; the rest follow in the default order. |
| `printWidth` | `number` | `80` | Wrap once the single-line form would exceed this column. |
| `maxClassesPerLine` | `number` | — | Wrap once the single line would hold more than this many classes. |
| `indentStep` | `string` | `"  "` (2 spaces) | Indentation added for each wrapped class line. |
| `quotesOnNewLine` | `boolean` | `true` | Put the quotes on their own lines when wrapping (vs. hugging the classes). |
| `preserveUnknownClasses` | `boolean` | `true` | Place unknown/custom classes on a leading line (`true`) or a trailing line (`false`). They are always kept. |
| `callees` | `string[]` | clsx, classnames, cn, cx, cva, ctl, twMerge, twJoin, tw | Function names whose class arguments are formatted. |
| `tags` | `string[]` | `["tw"]` | Tagged-template names to format. |
| `tailwindConfig` | `string` | auto | Path to a Tailwind **v3** config; its `getClassOrder` drives intra-category order. |
| `entryPoint` | `string` | auto | Path to a Tailwind **v4** CSS entry point. *(Accepted; v4 loading is async and not wired yet — currently falls back.)* |

### Class ordering

The **category** of each class comes from a built-in prefix map. The **order within a category** comes from Tailwind's official `getClassOrder()` when a `tailwindConfig` is provided, so overriding utilities stay later. Without it, classes keep their source order within each category.

## Before / after

```html
<!-- HTML — before -->
<div class="text-sm flex p-4"></div>
<!-- after -->
<div class="flex p-4 text-sm"></div>
```

```js
// clsx — before
clsx("text-sm flex p-4", cond && "bg-red-500 p-2");
// after
clsx("flex p-4 text-sm", cond && "p-2 bg-red-500");
```

## Using with Prettier

The rule only changes whitespace **inside** a class attribute value, which
Prettier leaves untouched — so the two don't fight, and order (`eslint --fix`
vs `prettier`) doesn't matter. `eslint-config-prettier` doesn't disable this
rule (it isn't a stylistic rule Prettier can own), so you can keep it enabled
alongside your Prettier setup.

## Safety invariant

Reordering and regrouping classes in markup is **cosmetic** — the cascade is decided by the generated CSS, not by class position in the attribute. This plugin therefore:

- **only reorders and wraps** classes;
- removes **exact** duplicates only (`p-4 p-4`), never conflicting pairs (`p-4 p-2`, `block flex`);
- never merges conflicting utilities (that is `tailwind-merge`'s job);
- preserves unknown / arbitrary (`bg-[#fff]`, `[mask:url(#x)]`) / `!important` classes verbatim.

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md), generated by [changesets](https://github.com/changesets/changesets).

## Roadmap

See [`PLAN.md`](./PLAN.md). Each stage lives on its own branch; each checklist item is a commit.

## License

[MIT](./LICENSE)
