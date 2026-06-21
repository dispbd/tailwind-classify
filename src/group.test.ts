import { describe, expect, it } from "vitest";
import { groupByCategory } from "./group.js";
import type { GetClassOrder } from "./order.js";

/** Shorthand for a single base-only block. */
const base = (...classes: string[]) => [{ variant: "", classes }];

describe("groupByCategory — canonical example", () => {
  it("matches the README before/after grouping (fallback order)", () => {
    const groups = groupByCategory(
      "flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100",
    );
    expect(groups).toEqual([
      {
        category: "flexbox-grid",
        blocks: base("flex", "flex-col", "items-center", "justify-center"),
      },
      { category: "spacing", blocks: base("px-5", "py-15") },
      { category: "typography", blocks: base("text-sm", "text-neutral-100") },
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
    expect(groupByCategory("flex p-4")).toHaveLength(2);
  });

  it("returns an empty array for a blank input", () => {
    expect(groupByCategory("   ")).toEqual([]);
  });
});

describe("groupByCategory — unknown bucket", () => {
  it("puts unknown/custom classes on a leading group", () => {
    const groups = groupByCategory("custom-thing flex p-4");
    expect(groups[0]).toEqual({ category: "unknown", blocks: base("custom-thing") });
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
      blocks: base("[mask:url(#x)]"),
    });
  });

  it("keeps the unknown bucket as one untouched block in source order", () => {
    // Even a variant on an unknown class does not split or reorder it.
    expect(groupByCategory("zzz hover:aaa mmm")).toEqual([
      { category: "unknown", blocks: base("zzz", "hover:aaa", "mmm") },
    ]);
  });
});

describe("groupByCategory — exact deduplication", () => {
  it("drops exact duplicate tokens across categories", () => {
    expect(groupByCategory("p-4 p-4 flex flex")).toEqual([
      { category: "flexbox-grid", blocks: base("flex") },
      { category: "spacing", blocks: base("p-4") },
    ]);
  });

  it("keeps conflicting (non-identical) utilities in the same block", () => {
    expect(groupByCategory("p-4 p-2")).toEqual([
      { category: "spacing", blocks: base("p-4", "p-2") },
    ]);
  });
});

describe("groupByCategory — nested variant blocks (category-variant)", () => {
  it("splits a category into base block then variant blocks", () => {
    expect(
      groupByCategory("bg-red-500 hover:bg-blue-500 focus:bg-black bg-white"),
    ).toEqual([
      {
        category: "backgrounds",
        blocks: [
          { variant: "", classes: ["bg-red-500", "bg-white"] },
          { variant: "hover", classes: ["hover:bg-blue-500"] },
          { variant: "focus", classes: ["focus:bg-black"] },
        ],
      },
    ]);
  });

  it("groups a stacked variant chain under a single block keyed by the chain", () => {
    expect(groupByCategory("sm:hover:p-4 p-2 sm:hover:p-8")).toEqual([
      {
        category: "spacing",
        blocks: [
          { variant: "", classes: ["p-2"] },
          { variant: "sm:hover", classes: ["sm:hover:p-4", "sm:hover:p-8"] },
        ],
      },
    ]);
  });

  it("emits variant-only categories without a base block", () => {
    expect(groupByCategory("hover:underline focus:italic")).toEqual([
      {
        category: "typography",
        blocks: [
          { variant: "hover", classes: ["hover:underline"] },
          { variant: "focus", classes: ["focus:italic"] },
        ],
      },
    ]);
  });
});

describe("groupByCategory — intra-category ordering via getClassOrder", () => {
  it("orders within a block using the injected getClassOrder", () => {
    const ORDER: Record<string, bigint> = { "p-4": 1n, "px-5": 2n, "py-2": 3n };
    const getOrder: GetClassOrder = (classes) =>
      classes.map((cls) => [cls, ORDER[cls] ?? null]);

    expect(
      groupByCategory("py-2 px-5 p-4", { getClassOrder: getOrder }),
    ).toEqual([{ category: "spacing", blocks: base("p-4", "px-5", "py-2") }]);
  });
});

describe("groupByCategory — unknown edge cases", () => {
  it("treats a variant on an unknown base as unknown, kept verbatim", () => {
    expect(groupByCategory("[&>svg]:custom-thing")).toEqual([
      { category: "unknown", blocks: base("[&>svg]:custom-thing") },
    ]);
  });

  it("treats group/peer-prefixed custom classes as unknown", () => {
    expect(groupByCategory("group-hover:custom-foo")).toEqual([
      { category: "unknown", blocks: base("group-hover:custom-foo") },
    ]);
  });

  it("does NOT route an arbitrary variant on a known utility to unknown", () => {
    // data-[state=open]: is a valid variant; bg-black is a known utility.
    // Base first; variant blocks follow in first-appearance order.
    expect(groupByCategory("data-[state=open]:bg-black hover:bg-white bg-black")).toEqual([
      {
        category: "backgrounds",
        blocks: [
          { variant: "", classes: ["bg-black"] },
          { variant: "data-[state=open]", classes: ["data-[state=open]:bg-black"] },
          { variant: "hover", classes: ["hover:bg-white"] },
        ],
      },
    ]);
  });

  it("buckets custom component classes alongside known categories", () => {
    expect(groupByCategory("btn flex card p-4")).toEqual([
      { category: "unknown", blocks: base("btn", "card") },
      { category: "flexbox-grid", blocks: base("flex") },
      { category: "spacing", blocks: base("p-4") },
    ]);
  });
});

describe("groupByCategory — preserveUnknownClasses (placement only)", () => {
  it("leads with the unknown block by default", () => {
    expect(groupByCategory("custom flex").map((g) => g.category)).toEqual([
      "unknown",
      "flexbox-grid",
    ]);
  });

  it("trails the unknown block when false, still preserving the classes", () => {
    const groups = groupByCategory("custom-a flex custom-b", {
      preserveUnknownClasses: false,
    });
    expect(groups.map((g) => g.category)).toEqual(["flexbox-grid", "unknown"]);
    expect(groups.at(-1)).toEqual({
      category: "unknown",
      blocks: base("custom-a", "custom-b"),
    });
  });
});
