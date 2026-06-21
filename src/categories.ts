/**
 * Prefix → category map (draft).
 *
 * Assigns a semantic category to a parsed base utility. There is no public
 * Tailwind API mapping a class to a *named* category (`getClassOrder()` only
 * yields a numeric index), so this map is hand-maintained. It is the semantic
 * half of the hybrid described in PLAN.md §3: category from this map, intra-
 * category ordering from Tailwind's `getClassOrder()`.
 *
 * Category order follows the Tailwind v4 docs structure (PLAN.md §3, axis A).
 * Unknown / custom / arbitrary-property classes fall into `"unknown"`, which a
 * later step renders on a leading line.
 *
 * Deliberate deviation: the display values `flex` / `inline-flex` / `grid` /
 * `inline-grid` are placed under **Flexbox & Grid**, not Layout. Tailwind's docs
 * file them under Layout > Display, but the canonical example in PLAN.md/README
 * groups `flex flex-col items-center justify-center` on one line — so grouping
 * them with the flex/grid utilities matches the intended output.
 */

/** Functional categories, in canonical render order. */
export const CATEGORY_ORDER = [
  "layout",
  "flexbox-grid",
  "spacing",
  "sizing",
  "typography",
  "backgrounds",
  "borders",
  "effects",
  "filters",
  "tables",
  "transitions-animation",
  "transforms",
  "interactivity",
  "svg",
  "accessibility",
] as const;

export type FunctionalCategory = (typeof CATEGORY_ORDER)[number];

/** A category, plus the bucket for classes we can't (or won't) classify. */
export type Category = FunctionalCategory | "unknown";

interface CategoryRules {
  /**
   * Standalone class names matched exactly. Use for words with no value family
   * (`italic`, `truncate`) and for words whose bare form differs in category
   * from its `-` family (e.g. `table` is Layout, `table-fixed` is Tables).
   */
  exact?: string[];
  /**
   * Dash-prefixes. A prefix `p` matches `p-4`; `flex` matches both bare `flex`
   * and `flex-col`. Longest matching prefix wins, so `border-spacing` (Tables)
   * beats `border` (Borders) for `border-spacing-2`.
   */
  prefixes?: string[];
}

/**
 * The source-of-truth mapping data, grouped by category for readability.
 * Exported so the map's integrity (no prefix/exact shared across categories)
 * can be asserted in tests.
 */
export const CATEGORY_RULES: Record<FunctionalCategory, CategoryRules> = {
  layout: {
    exact: [
      "block", "inline-block", "inline", "hidden", "flow-root", "contents",
      "list-item", "container",
      // display: table family (table-layout lives under Tables instead)
      "table", "inline-table", "table-caption", "table-cell", "table-column",
      "table-column-group", "table-footer-group", "table-header-group",
      "table-row-group", "table-row",
      // position keywords
      "static", "fixed", "absolute", "relative", "sticky",
      // visibility
      "visible", "invisible", "collapse",
      // isolation, box-sizing
      "isolate", "isolation-auto", "box-border", "box-content",
    ],
    prefixes: [
      "aspect", "columns", "break-after", "break-before", "break-inside",
      "box-decoration", "float", "clear", "object", "overflow", "overscroll",
      "inset", "top", "right", "bottom", "left", "start", "end", "z",
    ],
  },
  "flexbox-grid": {
    exact: ["inline-flex", "inline-grid"],
    prefixes: [
      "flex", "basis", "grow", "shrink", "order",
      "grid", "col", "row", "auto-cols", "auto-rows",
      "gap", "justify", "items", "self", "content", "place",
    ],
  },
  spacing: {
    prefixes: [
      "p", "px", "py", "pt", "pr", "pb", "pl", "ps", "pe",
      "m", "mx", "my", "mt", "mr", "mb", "ml", "ms", "me",
      "space",
    ],
  },
  sizing: {
    prefixes: ["w", "h", "size", "min-w", "min-h", "max-w", "max-h"],
  },
  typography: {
    exact: [
      "italic", "not-italic", "underline", "overline", "line-through",
      "no-underline", "uppercase", "lowercase", "capitalize", "normal-case",
      "truncate", "antialiased", "subpixel-antialiased",
      "ordinal", "slashed-zero", "lining-nums", "oldstyle-nums",
      "proportional-nums", "tabular-nums", "diagonal-fractions",
      "stacked-fractions", "normal-nums",
    ],
    prefixes: [
      "font", "text", "tracking", "leading", "list", "decoration",
      "underline-offset", "indent", "align", "whitespace", "hyphens",
      "line-clamp", "break", "wrap",
    ],
  },
  backgrounds: {
    prefixes: ["bg", "from", "via", "to"],
  },
  borders: {
    prefixes: ["border", "rounded", "divide", "outline", "ring"],
  },
  effects: {
    prefixes: ["shadow", "inset-shadow", "opacity", "mix-blend"],
  },
  filters: {
    prefixes: [
      "filter", "blur", "brightness", "contrast", "drop-shadow", "grayscale",
      "hue-rotate", "invert", "saturate", "sepia", "backdrop",
    ],
  },
  tables: {
    exact: ["table-auto", "table-fixed", "border-collapse", "border-separate"],
    prefixes: ["border-spacing", "caption"],
  },
  "transitions-animation": {
    prefixes: ["transition", "duration", "ease", "delay", "animate"],
  },
  transforms: {
    prefixes: [
      "scale", "rotate", "translate", "skew", "transform", "origin",
      "perspective",
    ],
  },
  interactivity: {
    prefixes: [
      "cursor", "caret", "accent", "appearance", "pointer-events", "resize",
      "scroll", "snap", "touch", "select", "will-change", "user-select",
      "field-sizing",
    ],
  },
  svg: {
    prefixes: ["fill", "stroke"],
  },
  accessibility: {
    exact: ["sr-only", "not-sr-only"],
    prefixes: ["forced-color-adjust"],
  },
};

const EXACT = new Map<string, FunctionalCategory>();
const PREFIXES: { prefix: string; category: FunctionalCategory }[] = [];

for (const category of CATEGORY_ORDER) {
  const rule = CATEGORY_RULES[category];
  for (const word of rule.exact ?? []) EXACT.set(word, category);
  for (const prefix of rule.prefixes ?? []) PREFIXES.push({ prefix, category });
}
// Longest prefix first, so the most specific rule wins.
PREFIXES.sort((a, b) => b.prefix.length - a.prefix.length);

/**
 * Assign a category to a parsed base utility (variants/important/opacity/sign
 * already stripped by the parser).
 *
 * Resolution order: arbitrary properties → exact match → longest prefix match →
 * `"unknown"`.
 */
export function categorize(base: string): Category {
  if (!base) return "unknown";
  // Arbitrary properties like `[mask:url(#x)]` are custom — leave them be.
  if (base.startsWith("[")) return "unknown";

  const exact = EXACT.get(base);
  if (exact) return exact;

  for (const { prefix, category } of PREFIXES) {
    if (base === prefix || base.startsWith(prefix + "-")) return category;
  }
  return "unknown";
}
