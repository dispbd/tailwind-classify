import { describe, expect, it } from "vitest";
import { groupByCategory } from "./group.js";
import type { GetClassOrder } from "./order.js";

describe("groupByCategory — canonical example", () => {
  it("matches the README before/after grouping (fallback order)", () => {
    const groups = groupByCategory(
      "flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100",
    );
    expect(groups).toEqual([
      {
        category: "flexbox-grid",
        classes: ["flex", "flex-col", "items-center", "justify-center"],
      },
      { category: "spacing", classes: ["px-5", "py-15"] },
      { category: "typography", classes: ["text-sm", "text-neutral-100"] },
    ]);
  });
});

describe("groupByCategory — category ordering", () => {
  it("emits categories in canonical order regardless of input order", () => {
    const groups = groupByCategory("text-sm p-4 flex");
    expect(groups.map((g) => g.category)).toEqual([
      "flexbox-grid",
      "spacing",
      "typography",
    ]);
  });

  it("omits empty categories", () => {
    const groups = groupByCategory("flex p-4");
    expect(groups).toHaveLength(2);
  });

  it("returns an empty array for a blank input", () => {
    expect(groupByCategory("   ")).toEqual([]);
  });
});

describe("groupByCategory — unknown bucket", () => {
  it("puts unknown/custom classes on a leading group", () => {
    const groups = groupByCategory("custom-thing flex p-4");
    expect(groups[0]).toEqual({ category: "unknown", classes: ["custom-thing"] });
    expect(groups.map((g) => g.category)).toEqual([
      "unknown",
      "flexbox-grid",
      "spacing",
    ]);
  });

  it("routes arbitrary properties to unknown", () => {
    const groups = groupByCategory("[mask:url(#x)] flex");
    expect(groups[0]).toEqual({
      category: "unknown",
      classes: ["[mask:url(#x)]"],
    });
  });

  it("preserves source order within the unknown bucket (never reorders custom classes)", () => {
    const groups = groupByCategory("zzz aaa mmm");
    expect(groups).toEqual([{ category: "unknown", classes: ["zzz", "aaa", "mmm"] }]);
  });
});

describe("groupByCategory — exact deduplication", () => {
  it("drops exact duplicate tokens across categories", () => {
    expect(groupByCategory("p-4 p-4 flex flex")).toEqual([
      { category: "flexbox-grid", classes: ["flex"] },
      { category: "spacing", classes: ["p-4"] },
    ]);
  });

  it("keeps conflicting (non-identical) utilities in the same group", () => {
    expect(groupByCategory("p-4 p-2")).toEqual([
      { category: "spacing", classes: ["p-4", "p-2"] },
    ]);
  });
});

describe("groupByCategory — variants (not nested in Stage 1)", () => {
  it("places a variant class in its base category as the full token", () => {
    const groups = groupByCategory("bg-red-500 hover:bg-blue-500");
    expect(groups).toEqual([
      { category: "backgrounds", classes: ["bg-red-500", "hover:bg-blue-500"] },
    ]);
  });
});

describe("groupByCategory — intra-category ordering via getClassOrder", () => {
  it("orders within a category using the injected getClassOrder", () => {
    const ORDER: Record<string, bigint> = { "p-4": 1n, "px-5": 2n, "py-2": 3n };
    const getOrder: GetClassOrder = (classes) =>
      classes.map((cls) => [cls, ORDER[cls] ?? null]);

    const groups = groupByCategory("py-2 px-5 p-4", getOrder);
    expect(groups).toEqual([
      { category: "spacing", classes: ["p-4", "px-5", "py-2"] },
    ]);
  });
});
