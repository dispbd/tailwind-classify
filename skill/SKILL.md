---
name: tailwind-classify
description: >-
  Format Tailwind class lists by splitting them onto multiple lines grouped by
  semantic category (layout, spacing, typography, ...), with variants nested.
  Use when generating or editing Tailwind markup with many or long classes.
---

# tailwind-classify (skill stub)

> Full content lands in Stage 3. This is the Stage 0 placeholder.

## Safety invariant
Only reorder and wrap classes. Remove exact duplicates only. Never merge
conflicting utilities. Preserve unknown / arbitrary / `!important` classes.

## Category order
Layout · Flexbox & Grid · Spacing · Sizing · Typography · Backgrounds ·
Borders · Effects · Filters · Tables · Transitions & Animation · Transforms ·
Interactivity · SVG · Accessibility. Unknown/custom classes go on a leading line.
