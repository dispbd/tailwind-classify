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
import { categorize, CATEGORY_ORDER, type Category } from "./categories.js";
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

/** Emit order: the unknown bucket leads, then the functional categories. */
const EMIT_ORDER: readonly Category[] = ["unknown", ...CATEGORY_ORDER];

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
 * blocks. The `"unknown"` bucket is emitted untouched as a single base block.
 */
export function groupByCategory(
  input: string,
  getClassOrder: GetClassOrder = fallbackClassOrder,
): ClassGroup[] {
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

  const groups: ClassGroup[] = [];
  for (const category of EMIT_ORDER) {
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
