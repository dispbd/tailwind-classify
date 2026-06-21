/**
 * Intra-category ordering via Tailwind's `getClassOrder()`.
 *
 * Per PLAN.md §3, category comes from our own prefix map, but the order of
 * classes *within* a category comes from Tailwind's official `getClassOrder()`
 * so that overriding utilities stay later — matching the cascade in the
 * generated stylesheet.
 *
 * This module is the integration seam. It defines the contract, a pure sort
 * that consumes it, an adapter for a loaded Tailwind context, and a fallback
 * for when Tailwind isn't available. *Loading* a real context from a config
 * (v3) or CSS entry point (v4) is Stage 3 — it plugs in through the same seam.
 */

/**
 * Tailwind's `getClassOrder` contract: given class strings, return
 * `[class, order]` pairs in the **same order as the input**. `order` is a
 * bigint position in the generated stylesheet, or `null` when Tailwind doesn't
 * recognize the class. Both the v3 context and the v4 design system expose a
 * method of exactly this shape.
 */
export type GetClassOrder = (classes: string[]) => [string, bigint | null][];

/** Compare two bigint orders for `Array.prototype.sort`. */
function compareOrder(a: bigint, z: bigint): number {
  return a < z ? -1 : a > z ? 1 : 0;
}

/**
 * Sort class strings by Tailwind's official order.
 *
 * - Recognized classes are ordered by ascending stylesheet position.
 * - Unrecognized classes (`null` order) are kept ahead of recognized ones,
 *   preserving their input order — mirroring prettier-plugin-tailwindcss, which
 *   surfaces non-Tailwind classes first. (In practice such classes are already
 *   routed to the `"unknown"` bucket before they reach here.)
 * - Equal orders preserve input order; the sort is stable by construction.
 */
export function sortByClassOrder(
  classes: string[],
  getClassOrder: GetClassOrder,
): string[] {
  return getClassOrder(classes)
    .map((pair, index) => ({ cls: pair[0], order: pair[1], index }))
    .sort((a, b) => {
      if (a.order === b.order) return a.index - b.index; // covers null === null
      if (a.order === null) return -1;
      if (b.order === null) return 1;
      return compareOrder(a.order, b.order);
    })
    .map((entry) => entry.cls);
}

/**
 * A `GetClassOrder` that recognizes nothing — every class gets a `null` order,
 * so `sortByClassOrder` preserves input order unchanged. Used when no Tailwind
 * install or config is available, so the pipeline degrades to grouping-only
 * without reordering within a category.
 */
export const fallbackClassOrder: GetClassOrder = (classes) =>
  classes.map((cls) => [cls, null] as [string, null]);

/**
 * Anything that exposes a Tailwind-shaped `getClassOrder` method: a v3 context
 * (`createContext(...)`) or a v4 design system (`loadDesignSystem(...)`).
 */
export interface TailwindClassOrderSource {
  getClassOrder(classes: string[]): [string, bigint | null][];
}

/**
 * Adapt a loaded Tailwind context/design system to a `GetClassOrder`. This is
 * the integration point with the real Tailwind API; obtaining the `source` from
 * a config or CSS entry point is Stage 3.
 */
export function fromTailwindContext(
  source: TailwindClassOrderSource,
): GetClassOrder {
  return (classes) => source.getClassOrder(classes);
}
