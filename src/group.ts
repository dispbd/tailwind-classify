/**
 * Group a class list by semantic category (no nested variants yet).
 *
 * Pipeline (PLAN.md §4): parse each token → assign a category by its base
 * utility → order within each category via `getClassOrder()` → emit groups in
 * canonical category order, with the `"unknown"` bucket on a leading line.
 *
 * "No nested variants" (Stage 1): a variant class such as `hover:bg-red-500`
 * is categorized by its base (`bg-red-500` → backgrounds) and sits in that
 * group as the full token — variants are *not* split into their own blocks.
 * Nested variant grouping is Stage 2.
 */

import { parseClassList } from "./parse.js";
import { categorize, CATEGORY_ORDER, type Category } from "./categories.js";
import { dedupeExact } from "./dedupe.js";
import {
  fallbackClassOrder,
  sortByClassOrder,
  type GetClassOrder,
} from "./order.js";

export interface ClassGroup {
  category: Category;
  /** Raw class tokens (verbatim), ordered within the category. */
  classes: string[];
}

/** Emit order: the unknown bucket leads, then the functional categories. */
const EMIT_ORDER: readonly Category[] = ["unknown", ...CATEGORY_ORDER];

/**
 * Group a whitespace-separated class string into ordered category groups.
 *
 * Exact duplicate tokens are removed first (see {@link dedupeExact}); only
 * byte-for-byte identical tokens are dropped. Empty categories are omitted.
 * Within a functional category, classes are ordered by `getClassOrder`
 * (defaults to {@link fallbackClassOrder}, which preserves source order when no
 * Tailwind context is available). The `"unknown"` bucket always keeps source
 * order — custom classes are never reordered relative to each other.
 */
export function groupByCategory(
  input: string,
  getClassOrder: GetClassOrder = fallbackClassOrder,
): ClassGroup[] {
  const parsed = parseClassList(input);
  // Identical raw tokens always share the same base, so this map is safe.
  const baseByRaw = new Map(parsed.map((p) => [p.raw, p.base] as const));

  const buckets = new Map<Category, string[]>();
  for (const raw of dedupeExact(parsed.map((p) => p.raw))) {
    const category = categorize(baseByRaw.get(raw)!);
    const bucket = buckets.get(category);
    if (bucket) bucket.push(raw);
    else buckets.set(category, [raw]);
  }

  const groups: ClassGroup[] = [];
  for (const category of EMIT_ORDER) {
    const classes = buckets.get(category);
    if (!classes) continue;
    groups.push({
      category,
      classes:
        category === "unknown"
          ? classes
          : sortByClassOrder(classes, getClassOrder),
    });
  }
  return groups;
}
