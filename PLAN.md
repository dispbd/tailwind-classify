# tailwind-classify

> An ESLint plugin (plus a companion skill for AI agents) that splits long
> Tailwind class lists across multiple lines, **grouping them by semantic
> category** (layout, spacing, typography, …) with variants nested inside.
>
> Package name: **`eslint-plugin-tailwind-classify`**. The name *Classify* is a
> pun on "classify" + working with "classes".

**Status:** Stages 0–4 shipped, plus native Svelte/Vue/Astro ESLint support
(post-release); published to npm as `eslint-plugin-tailwind-classify@0.2.0`.
Publishing uses npm Trusted Publishing (OIDC) — no long-lived `NPM_TOKEN`.

---

## 1. Problem

Long Tailwind class strings are hard to read. We don't just want to sort them
into a single line (the official plugin already does that) — we want to **lay
them out by semantic group**, one line per concern (spacing on its own line,
typography on its own line, etc.). Doing this by hand doesn't scale across many
files.

Desired result:

```html
<loading-state
  class="
    flex flex-col items-center justify-center
    px-5 py-15
    text-sm text-neutral-100
  "
>
```

---

## 2. Research

### 2.1. Existing solutions

| Tool | What it does | What's missing |
|---|---|---|
| `prettier-plugin-tailwindcss` (official) | Sorts classes onto a single line | No line wrapping; order isn't configurable |
| `eslint-plugin-better-tailwindcss` (formerly `readable-tailwind`) | Wraps by `printWidth`/class count, sorts, groups **by variant** | Groups by variant, **not by semantic category** |
| `@kalimahapps/eslint-plugin-tailwind` | `multiline` + `sort` by groups | Not category-based; historically Vue-focused |
| `prettier-plugin-tailwind-multiline` | Multi-line as a Prettier plugin | Experimental, unstable |
| `borela/multiline-tailwindcss` | Vite plugin | Niche |

**Takeaway:** nobody groups "by semantic category, one group per line". That's
our niche.

### 2.2. Prettier's key limitation

Prettier **does not support** multi-line formatting of the class attribute
(`prettier/prettier#7863`) and collapses whitespace inside `class`/`className`
(issues #10918, #7550, #12048). So every working multi-line solution is an
**ESLint plugin**, not a Prettier plugin.

→ **Architecture decision: an ESLint rule** with autofix, not a Prettier plugin.

### 2.3. Class order and the CSS cascade (safety analysis)

- Tailwind's numeric order is **not arbitrary**: it reflects the order utilities
  are generated in CSS (base → components → utilities; overriding classes come
  later).
- **But** the order of classes inside the `class="…"` attribute **does not
  affect rendering**. Conflicts are resolved by specificity and rule order **in
  the generated CSS**, not by position in the HTML.

**Consequence:** reordering and regrouping classes in markup is **cosmetically
safe**. The only risky operations are those that change the *set* of classes.
Hence the safety invariant:

> **The plugin only reorders and wraps classes. It removes nothing except exact
> duplicates (`p-4 p-4`), never merges conflicting utilities, and never modifies
> custom / arbitrary / `!important` classes.**

Resolving conflicts (`p-4 p-2`, `block flex`) is `tailwind-merge`'s job, not a
formatter's.

---

## 3. Category taxonomy

### Axis A — functional categories (order = Tailwind v4 docs structure)

1. Layout
2. Flexbox & Grid
3. Spacing
4. Sizing
5. Typography
6. Backgrounds
7. Borders
8. Effects
9. Filters
10. Tables
11. Transitions & Animation
12. Transforms
13. Interactivity
14. SVG
15. Accessibility

Plus a leading "zeroth" line for **unknown / custom** classes (as the official
plugin moves non-Tailwind classes to the front).

> **Implemented deviation:** the display values `flex` / `inline-flex` / `grid`
> / `inline-grid` are placed under **Flexbox & Grid** rather than Layout, so the
> canonical example (`flex flex-col items-center justify-center`) groups on one
> line.

### Axis B — variants (orthogonal to categories)

Responsive (`sm:`…`lg:`), states (`hover:`, `focus:`, `active:`, `disabled:`),
`dark:`, `group-*`/`peer-*`, arbitrary selectors.

**Default strategy:** group by category; within a category, base classes first,
then variant blocks (categories + variants nested). Configurable via the `group`
option (`category` | `variant` | `category-variant`).

### Source of truth for the `class → category` mapping

There is no public "class → named category" API. Tailwind's `getClassOrder()`
gives only a numeric index. So:

- **category** comes from our own hand-maintained `prefix → category` map;
- **order within a category** comes from the official `getClassOrder()` (so
  overriding classes stay later).

A hybrid: reliable ordering from Tailwind + our semantic classification.

---

## 4. Architecture

```
extract the class string (per AST/parser)
        ↓
parse each class → [variants][base utility][!][/opacity]
        ↓
assign a category by the base utility (map; unknown → "unknown" bucket)
        ↓
sort within a category via getClassOrder()
        ↓
group: categories in order, variants nested
        ↓
serialize to multi-line (respecting parent indentation)
        ↓
return via ESLint autofix (fixable: "whitespace")
```

A single "extract string → reformat → return" core (`formatClassValue`) sits
above the extractors so every syntax shares one engine.

### Target syntaxes

- JSX/TSX: `className` — via the ESLint rule.
- HTML / Vue / Svelte / Astro: `class` — via the programmatic `formatMarkup`
  (string-level). An ESLint rule for these file types is future work.
- Function/template strings: `clsx`, `cva`, `tw`, `tailwind-merge`, etc.
  (configurable `callees` / `tags`) — via the ESLint rule.

### Options (implemented)

| Option | Purpose | Default |
|---|---|---|
| `group` | `"category" \| "variant" \| "category-variant"` | `"category-variant"` |
| `categoryOrder` | Custom category order | docs order |
| `printWidth` | Wrap threshold (column) | `80` |
| `maxClassesPerLine` | Wrap threshold (class count) | — |
| `indentStep` | Indent per class line | `"  "` |
| `quotesOnNewLine` | Quotes on their own lines | `true` |
| `preserveUnknownClasses` | Unknown classes lead (`true`) or trail (`false`) | `true` |
| `callees` / `tags` | Helper functions / tagged templates to format | clsx, cva, … / `tw` |
| `tailwindConfig` / `entryPoint` | v3 config / v4 CSS entry for `getClassOrder` | auto |

### Safety invariant (restated, critical)

Only reorder and wrap. Remove exact duplicates only. Never merge conflicts.
Custom / arbitrary / `!important` classes — preserved verbatim.

---

## 5. Roadmap (stages → branches, items → commits)

> Git convention: **each stage = a branch**, **each item = a commit**. Branches
> merge to the integration branch via PR when the stage is complete.

### Stage 0 — `chore/scaffold` ✅
- [x] `chore: init repo, package.json, MIT license, README`
- [x] `chore: tooling (typescript, vitest, eslint, tsup/build)`
- [x] `docs: add PLAN.md`
- [x] `ci: github actions — lint + test`

### Stage 1 — `feat/core-mvp` ✅ (PRs #1, #2)
- [x] `feat: class-token parser → [variants][utility][important][opacity]`
- [x] `feat: prefix → category map (draft core)`
- [x] `feat: getClassOrder() integration for intra-category order`
- [x] `feat: group by category (no nested variants)`
- [x] `feat: exact-only deduplication`
- [x] `feat: ESLint rule for JSX className + autofix`
- [x] `test: snapshot tests for core and JSX`

### Stage 2 — `feat/variants-and-markup` ✅ (PR #3)
- [x] `feat: nested variant grouping (category-variant)`
- [x] `feat: unknown/custom class bucket (+ option, edge cases)`
- [x] `feat: class parser for HTML`
- [x] `feat: Vue / Svelte / Astro support` *(merged with the syntax-matrix item — static `class` is shared)*
- [x] `feat: parent-indent calculation, quotesOnNewLine`
- [x] `test: syntax matrix`

### Stage 3 — `feat/functions-and-config` ✅ (PR #4)
- [x] `feat: support clsx / cva / tw / tailwind-merge`
- [x] `feat: options categoryOrder / group / printWidth / maxClassesPerLine`
- [x] `feat: read tailwindConfig (v3) and entryPoint (v4)` *(v4 loading is async → currently falls back)*
- [x] `feat: arbitrary values & ! modifier` *(already handled since Stage 1 — committed as `test:` that locks the guarantees)*
- [x] `docs: README with before/after examples and an options table`

### Stage 4 — `chore/release` ✅ (PR #5)
- [x] `feat: eslint-config-prettier compatibility`
- [x] `docs: integration guide + recommended config`
- [x] `chore: npm publish setup`
- [x] `chore: changesets / semantic versioning`
- [ ] (optional) `feat: Biome port` — **skipped**: Biome can't run ESLint plugins and a real port needs Rust/Biome core.

### Post-release — native framework ESLint support ✅ (PRs #7–#11)
- [x] `ci: prepare release for npm Trusted Publishing (OIDC)` — `NPM_TOKEN` retired; a Trusted Publisher is registered on npm for this repo + `release.yml`.
- [x] `docs: rewrite PLAN.md in English; reflect shipped state`
- [x] `feat: native Svelte support in the ESLint rule` (`SvelteAttribute` visitor, `feat/svelte-eslint`)
- [x] `feat: native Vue support in the ESLint rule` (`defineTemplateBodyVisitor` + `VAttribute`, `feat/vue-eslint`)
- [x] `feat: native Astro support in the ESLint rule` (`JSXAttribute` with `name === "class"`; bonus: Preact/Solid `class` too, `feat/astro-eslint`)
- [x] `chore: changeset for native Svelte/Vue/Astro support (minor)` → released as `0.2.0`

---

## 6. Skill for AI agents

Goal: an agent formats classes the same way the plugin would, when the plugin
isn't available (e.g. when generating new markup). File `skill/SKILL.md`:

- **Triggers:** generating/editing Tailwind markup with many or long classes in
  `class`/`className`.
- **Safety invariant** (see §4) — verbatim.
- **Category taxonomy** with order and example prefixes per category.
- **Wrapping rules:** when to keep on one line, when to split; where variants
  go; quote/indent format.
- **before/after examples**, including edge cases: arbitrary values
  (`[mask:…]`), `!important`, unknown classes, `cva`.

> **Status:** done — `skill/SKILL.md` is fleshed out from the shipped behavior
> (algorithm, category cheat-sheet, wrapping rules, verified before/after
> examples).

---

## 7. Open questions / decisions

- Package name finalized: **`eslint-plugin-tailwind-classify`** (published).
- The `prefix → category` map is a hand-maintained draft. Decision: keep it
  hand-maintained for now; generating it from Tailwind metadata is future work.
  Some v4 utilities (e.g. `mask-*`) are not yet mapped and fall into `unknown`.
- `tailwind-merge` conflicts: stay silent by default (not our concern).

---

## 8. Future work / recommendations

Concrete next steps, roughly by value:

1. **Production single-line transform.** The multi-line output is great for DX
   but ships extra whitespace in bundles (minifiers don't collapse string
   literals; only gzip/brotli does — so the *transfer* cost is near-zero, but
   the raw bundle grows). A complementary build-time transform (Vite/esbuild/
   Babel plugin, or a `collapse` mode reusing `serializeSingleLine`) could
   flatten class whitespace for production, giving multi-line in source and
   single-line in the build.
2. ~~**Flesh out `skill/SKILL.md`**~~ **Done** — written from the shipped
   taxonomy, wrapping rules, and verified examples.
3. **ESLint rule for plain HTML files** (via `@html-eslint/parser`), so HTML is
   linted in-place too. Svelte/Vue/Astro/Preact/Solid already have native
   support (see the post-release stage above); HTML still goes through the
   programmatic `formatMarkup`.
4. **Tailwind v4 `getClassOrder`.** Wire async design-system loading from
   `entryPoint` (preload outside the sync rule path) instead of falling back.
5. **Grow the `prefix → category` map** to cover more v4 utilities and shrink the
   `unknown` bucket; consider generating it from Tailwind metadata.
6. **A small perf guard / fixtures.** Current cost is ~3–40 µs per class string;
   a regression fixture would keep it there.
7. ~~**npm Trusted Publishing (OIDC).**~~ **Done** — the Trusted Publisher is
   registered on npm; `release.yml` publishes via OIDC, no `NPM_TOKEN`.

---

## Performance

Measured on Node 24 (single core), built `dist`:

| Operation | µs/op |
|---|---|
| `formatClassValue`, already-correct (no-op fast path) | ~3.5 |
| `formatClassValue`, average mixed input | ~25 |
| `formatClassValue`, long input that wraps | ~30 |
| `groupByCategory`, heavy (11 mixed classes) | ~39 |
| `formatMarkup`, 200-element file | ~5.5 ms/file |

Tens of microseconds per class string — negligible next to ESLint's own
parse/traverse cost. A real Tailwind context (when `tailwindConfig` is set) is
built once and cached, so only the first file pays for it.
