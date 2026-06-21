# eslint-plugin-tailwind-classify

> Splits long Tailwind class lists onto multiple lines, **grouped by semantic category** (layout, spacing, typography, …), with variants nested inside each group.

**Status:** early development (Stage 0 — scaffold). Not yet published to npm.

## Why

The official `prettier-plugin-tailwindcss` only sorts classes into a single line. Prettier itself does not support multi-line formatting of the `class`/`className` attribute (it collapses whitespace), so this is built as an **ESLint rule** with autofix instead.

Existing ESLint multi-line plugins wrap by print width and group by *variant*. `classify` is different: it groups by **semantic category**, so each line answers one question ("what are the spacing classes? the typography classes?").

```html
<!-- before -->
<loading-state class="flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100">

<!-- after -->
<loading-state
  class="
    flex flex-col items-center justify-center
    px-5 py-15
    text-sm text-neutral-100
  "
>
```

## Safety invariant

Reordering and regrouping classes in markup is **cosmetic** — the cascade is decided by the generated CSS, not by class position in the attribute. This plugin therefore:

- **only reorders and wraps** classes;
- removes **exact** duplicates only (`p-4 p-4`), never conflicting pairs (`p-4 p-2`, `block flex`);
- never merges conflicting utilities (that is `tailwind-merge`'s job);
- preserves unknown / arbitrary / `!important` classes untouched.

## Roadmap

See [`PLAN.md`](./PLAN.md). Each stage lives on its own branch; each checklist item is a commit.

## License

[MIT](./LICENSE)
