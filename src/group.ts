/**
 * Group a class list by semantic category, with variant blocks nested inside
 * each category (the `category-variant` strategy, PLAN.md §3).
 *
 * Pipeline (PLAN.md §4): parse each token → exact-dedupe → assign a category by
 * its base utility → within the category, order via `getClassOrder()` and split
 * into variant blocks (base/unvariant classes first, then one block per variant
 * chain) → emit groups in canonical category order, with the `"unknown"` bucket
 * on a leading line.
 *
 * The `"unknown"` bucket is never reordered or sub-grouped: custom classes are
 * preserved verbatim in source order as a single block.
 */

import { parseClassList, type ParsedClass } from "./parse.js";
import {
  categorize,
  CATEGORY_ORDER,
  type Category,
  type FunctionalCategory,
} from "./categories.js";
import { dedupeExact } from "./dedupe.js";
import {
  fallbackClassOrder,
  sortByClassOrder,
  type GetClassOrder,
} from "./order.js";

export interface VariantBlock {
  /**
   * The variant chain joined by ":" (e.g. `"hover"`, `"sm:hover"`, `"dark"`),
   * or `""` for base classes with no variants.
   */
  variant: string;
  /** Raw class tokens (verbatim), ordered within the block. */
  classes: string[];
}

export interface ClassGroup {
  category: Category;
  /** Base block first (variant `""`), then one block per variant chain. */
  blocks: VariantBlock[];
}

/** How classes map to output lines. */
export type GroupStrategy = "category" | "variant" | "category-variant";

export interface GroupOptions {
  /** Tailwind class ordering. Defaults to {@link fallbackClassOrder}. */
  getClassOrder?: GetClassOrder;
  /**
   * Override the category emit order. Listed categories come first (in the
   * given order); any omitted ones follow in the default order. Unknown names
   * are ignored.
   */
  categoryOrder?: FunctionalCategory[];
  /**
   * Where unknown/custom classes are surfaced: a **leading** block (`true`,
   * default — matching official plugins that put non-Tailwind classes first)
   * or a **trailing** block (`false`).
   *
   * Either way unknown classes are preserved verbatim in source order; the
   * cascade-safety invariant forbids dropping them, so this flag only controls
   * placement, never removal.
   */
  preserveUnknownClasses?: boolean;
}

/** Split a category's classes into variant blocks: base first, then variants. */
function buildBlocks(
  items: ParsedClass[],
  getClassOrder: GetClassOrder,
): VariantBlock[] {
  const variantOf = new Map(
    items.map((p) => [p.raw, p.variants.join(":")] as const),
  );
  const sorted = sortByClassOrder(
    items.map((p) => p.raw),
    getClassOrder,
  );

  // Bucket by variant chain, preserving the sorted order within each block and
  // first-appearance order across blocks.
  const blocks = new Map<string, string[]>();
  for (const raw of sorted) {
    const key = variantOf.get(raw)!;
    let block = blocks.get(key);
    if (!block) {
      block = [];
      blocks.set(key, block);
    }
    block.push(raw);
  }

  const result: VariantBlock[] = [];
  const base = blocks.get("");
  if (base) result.push({ variant: "", classes: base });
  for (const [variant, classes] of blocks) {
    if (variant !== "") result.push({ variant, classes });
  }
  return result;
}

/**
 * Group a whitespace-separated class string into ordered category groups, each
 * carrying variant blocks.
 *
 * Exact duplicate tokens are removed first (see {@link dedupeExact}). Empty
 * categories are omitted. Within a functional category, classes are ordered by
 * `getClassOrder` (defaults to {@link fallbackClassOrder}, which preserves
 * source order when no Tailwind context is available) and split into variant
 * blocks. The `"unknown"` bucket is emitted untouched as a single block, leading
 * or trailing per `preserveUnknownClasses`.
 */
export function groupByCategory(
  input: string,
  options: GroupOptions = {},
): ClassGroup[] {
  const {
    getClassOrder = fallbackClassOrder,
    preserveUnknownClasses = true,
    categoryOrder,
  } = options;

  const parsed = parseClassList(input);
  const byRaw = new Map(parsed.map((p) => [p.raw, p] as const));

  // Bucket parsed classes by category, exact-deduped, in source order.
  const buckets = new Map<Category, ParsedClass[]>();
  for (const raw of dedupeExact(parsed.map((p) => p.raw))) {
    const p = byRaw.get(raw)!;
    const category = categorize(p.base);
    let bucket = buckets.get(category);
    if (!bucket) {
      bucket = [];
      buckets.set(category, bucket);
    }
    bucket.push(p);
  }

  const functional: FunctionalCategory[] =
    categoryOrder && categoryOrder.length > 0
      ? [
          ...categoryOrder.filter((c) => CATEGORY_ORDER.includes(c)),
          ...CATEGORY_ORDER.filter((c) => !categoryOrder.includes(c)),
        ]
      : [...CATEGORY_ORDER];
  const emitOrder: Category[] = preserveUnknownClasses
    ? ["unknown", ...functional]
    : [...functional, "unknown"];

  const groups: ClassGroup[] = [];
  for (const category of emitOrder) {
    const items = buckets.get(category);
    if (!items) continue;
    const blocks =
      category === "unknown"
        ? [{ variant: "", classes: items.map((p) => p.raw) }]
        : buildBlocks(items, getClassOrder);
    groups.push({ category, blocks });
  }
  return groups;
}

/**
 * Flatten grouped classes into output lines per the `group` strategy:
 * - `"category-variant"` (default): one line per variant block (category-major,
 *   variants nested);
 * - `"category"`: one line per category (variants inline);
 * - `"variant"`: one line per variant chain (base first, categories inline).
 */
export function toLines(
  groups: ClassGroup[],
  strategy: GroupStrategy = "category-variant",
): string[][] {
  if (strategy === "category-variant") {
    return groups.flatMap((g) => g.blocks.map((b) => b.classes));
  }
  if (strategy === "category") {
    return groups.map((g) => g.blocks.flatMap((b) => b.classes));
  }

  // "variant": collect variant chains (base "" first) across all categories.
  const variants: string[] = [];
  for (const g of groups) {
    for (const b of g.blocks) {
      if (!variants.includes(b.variant)) variants.push(b.variant);
    }
  }
  const ordered = ["", ...variants.filter((v) => v !== "")];

  const lines: string[][] = [];
  for (const variant of ordered) {
    const line: string[] = [];
    for (const g of groups) {
      for (const b of g.blocks) {
        if (b.variant === variant) line.push(...b.classes);
      }
    }
    if (line.length > 0) lines.push(line);
  }
  return lines;
}
