---
name: tailwind-classify
description: >-
  Format Tailwind class lists by splitting them onto multiple lines grouped by
  semantic category (layout, spacing, typography, ...), with variants nested.
  Produces the same layout as eslint-plugin-tailwind-classify. Use when
  generating or editing Tailwind markup with many or long classes in
  class/className, or in clsx/cva/tw helpers.
---

# tailwind-classify

Format a Tailwind class list the way `eslint-plugin-tailwind-classify` would,
when the plugin can't run (e.g. while generating new markup). Group classes by
**semantic category**, one line per group, with variants nested.

## When to use

- Writing or editing markup with many / long Tailwind classes in `class` or
  `className` (JSX, HTML, Svelte, Vue, Astro).
- Building class strings in `clsx` / `classnames` / `cn` / `cva` / `tw` /
  `tailwind-merge`.

## Safety invariant (do not break)

Reordering and regrouping classes in markup is cosmetic — the cascade is decided
by the generated CSS, not by position in the attribute. So:

- **Only reorder and wrap** classes.
- Remove **exact** duplicates only (`p-4 p-4` → `p-4`). Never drop a class that
  differs in any way (`p-4` vs `p-4!`, `hover:p-4` vs `focus:p-4`).
- **Never merge** conflicting utilities (`p-4 p-2`, `block flex`) — keep both.
- **Never modify** the text of unknown / arbitrary (`bg-[#fff]`, `[mask:url(#x)]`)
  / `!important` (`!font-bold`, `font-bold!`) classes — preserve them verbatim.

## Algorithm

1. **Parse** each token: `[variants:]…[!]base[/opacity][!]`. The `:` and `/`
   inside `[...]` / `(...)` are part of an arbitrary value, not separators.
2. **Categorize** by the base utility's prefix (see the table). Anything you
   don't recognize, or an arbitrary property like `[mask:…]`, is **unknown**.
3. **Group**: emit categories in the canonical order below; within each category
   put base (unvariant) classes first, then one block per variant chain.
   Unknown / custom classes go on a **leading** line, in their original order.
4. **Order within a group** by Tailwind's natural order when you know it;
   otherwise keep source order. Never reorder unknown classes.
5. **Lay out** (see wrapping rules).

## Categories — canonical order + prefix cheat-sheet

Unknown / custom classes first (leading line), then:

| # | Category | Recognize by (examples) |
|---|---|---|
| 1 | layout | `block` `inline` `hidden` `container` `static`/`absolute`/`relative`/`fixed`/`sticky` `aspect-` `columns-` `float-` `clear-` `object-` `overflow-` `inset-`/`top-`/`right-`/`bottom-`/`left-` `z-` |
| 2 | flexbox-grid | `flex` `inline-flex` `grid` `inline-grid` `flex-` `grow` `shrink` `basis-` `order-` `grid-cols-`/`grid-rows-` `col-`/`row-` `gap-` `justify-` `items-` `self-` `place-` `content-` |
| 3 | spacing | `p`/`px`/`py`/`pt…` `m`/`mx`/`my`/`mt…` `space-` |
| 4 | sizing | `w-` `h-` `size-` `min-w-`/`min-h-` `max-w-`/`max-h-` |
| 5 | typography | `text-` `font-` `leading-` `tracking-` `list-` `decoration-` `indent-` `align-` `whitespace-` `line-clamp-` `italic` `underline` `uppercase` `truncate` |
| 6 | backgrounds | `bg-` `from-` `via-` `to-` |
| 7 | borders | `border-` `rounded-` `divide-` `outline-` `ring-` |
| 8 | effects | `shadow-` `inset-shadow-` `opacity-` `mix-blend-` |
| 9 | filters | `blur-` `brightness-` `contrast-` `drop-shadow-` `grayscale` `invert` `saturate-` `sepia` `backdrop-` |
| 10 | tables | `table-auto`/`table-fixed` `border-collapse`/`border-separate` `border-spacing-` `caption-` |
| 11 | transitions-animation | `transition-` `duration-` `ease-` `delay-` `animate-` |
| 12 | transforms | `scale-` `rotate-` `translate-` `skew-` `transform` `origin-` `perspective-` |
| 13 | interactivity | `cursor-` `select-` `resize` `scroll-` `snap-` `touch-` `accent-` `caret-` `appearance-` `pointer-events-` `will-change-` |
| 14 | svg | `fill-` `stroke-` |
| 15 | accessibility | `sr-only` `not-sr-only` `forced-color-adjust-` |

> Deliberate choice: the display utilities `flex` / `inline-flex` / `grid` /
> `inline-grid` go under **flexbox-grid** (not layout), so `flex flex-col
> items-center` stay together on one line.
>
> Longest prefix wins, so e.g. `border-spacing-2` is **tables**, not borders;
> `break-after-*` is layout, `break-words` is typography.

## Wrapping & layout rules

- **Decide single vs multi-line by length.** If the whole regrouped list fits on
  one line (~80 columns, counting the indent and `class="`), keep it on **one
  line** — but still reordered and grouped. Otherwise wrap.
- **When wrapping:** one line per group/variant-block, indented **one step (2
  spaces) past the attribute's own indentation**. Put the quotes on their own
  lines — a newline right after the opening quote, the closing quote aligned to
  the attribute.
- **In JS string literals** (e.g. `clsx("…")`), you **cannot** use real
  newlines, so only **reorder/regroup on a single line** there — never wrap.
  Template literals (`` tw`…` ``) and JSX/markup attributes may wrap.

## Examples

Short list → single line, reordered (flexbox → spacing → typography):

```html
<!-- before --> <div class="text-sm flex p-4">
<!-- after -->  <div class="flex p-4 text-sm">
```

Long list → wrapped, grouped:

```html
<!-- before -->
<div class="flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100">

<!-- after -->
<div class="
  flex flex-col items-center justify-center
  px-5 py-15
  text-sm text-neutral-100
">
```

Variants nested within a category — base block first, then one line per variant
chain (`bg-blue-500`, then `hover:`, then `focus:`):

```html
<!-- before -->
<button class="hover:bg-blue-600 focus:bg-blue-700 px-4 bg-blue-500 py-2 text-sm font-medium text-white shadow">
<!-- after -->
<button class="
  px-4 py-2
  text-sm font-medium text-white
  bg-blue-500
  hover:bg-blue-600
  focus:bg-blue-700
  shadow
">
```

Edge cases — unknown leads; `!important` and arbitrary values kept verbatim:

```html
<!-- before --> <div class="flex !mt-2 bg-[#fff] btn">
<!-- after -->  <div class="btn flex !mt-2 bg-[#fff]">
```

`cva` — regroup the base string and each variant value on one line each (JS
strings never wrap):

```js
// before
cva("rounded-md inline-flex font-medium", {
  variants: { intent: { primary: "bg-blue-600 text-white" } },
});
// after
cva("inline-flex font-medium rounded-md", {
  variants: { intent: { primary: "text-white bg-blue-600" } },
});
```
