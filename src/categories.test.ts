import { describe, expect, it } from "vitest";
import {
  categorize,
  CATEGORY_ORDER,
  CATEGORY_RULES,
  type Category,
} from "./categories.js";

/** Representative class → expected category, one row per category. */
const cases: [string, Category][] = [
  // layout
  ["block", "layout"],
  ["hidden", "layout"],
  ["absolute", "layout"],
  ["z-10", "layout"],
  ["overflow-hidden", "layout"],
  ["inset-0", "layout"],
  ["aspect-video", "layout"],
  ["container", "layout"],
  ["table", "layout"], // display: table
  ["table-row", "layout"],

  // flexbox-grid (incl. the deliberate flex/grid display placement)
  ["flex", "flexbox-grid"],
  ["inline-flex", "flexbox-grid"],
  ["grid", "flexbox-grid"],
  ["flex-col", "flexbox-grid"],
  ["items-center", "flexbox-grid"],
  ["justify-between", "flexbox-grid"],
  ["gap-4", "flexbox-grid"],
  ["grid-cols-3", "flexbox-grid"],
  ["col-span-2", "flexbox-grid"],
  ["grow", "flexbox-grid"],

  // spacing
  ["p-4", "spacing"],
  ["px-5", "spacing"],
  ["mt-2", "spacing"], // base after parser strips the negative sign of -mt-2
  ["space-x-4", "spacing"],

  // sizing
  ["w-full", "sizing"],
  ["h-screen", "sizing"],
  ["size-4", "sizing"],
  ["max-w-prose", "sizing"],
  ["min-h-0", "sizing"],

  // typography
  ["text-sm", "typography"],
  ["text-neutral-100", "typography"],
  ["font-bold", "typography"],
  ["leading-tight", "typography"],
  ["italic", "typography"],
  ["truncate", "typography"],
  ["underline", "typography"],
  ["decoration-dashed", "typography"],

  // backgrounds
  ["bg-red-500", "backgrounds"],
  ["bg-[#fff]", "backgrounds"], // arbitrary value, known prefix
  ["from-blue-500", "backgrounds"],
  ["to-black", "backgrounds"],

  // borders
  ["border", "borders"],
  ["border-2", "borders"],
  ["rounded-lg", "borders"],
  ["divide-y", "borders"],
  ["ring-2", "borders"],
  ["outline-none", "borders"],

  // effects
  ["shadow-md", "effects"],
  ["opacity-50", "effects"],
  ["mix-blend-multiply", "effects"],

  // filters
  ["blur-sm", "filters"],
  ["grayscale", "filters"],
  ["backdrop-blur-md", "filters"],

  // tables (table-layout, not display)
  ["table-fixed", "tables"],
  ["table-auto", "tables"],
  ["border-collapse", "tables"],
  ["border-spacing-2", "tables"],
  ["caption-top", "tables"],

  // transitions & animation
  ["transition", "transitions-animation"],
  ["transition-colors", "transitions-animation"],
  ["duration-300", "transitions-animation"],
  ["animate-spin", "transitions-animation"],

  // transforms
  ["scale-95", "transforms"],
  ["rotate-45", "transforms"],
  ["translate-x-2", "transforms"],
  ["origin-center", "transforms"],

  // interactivity
  ["cursor-pointer", "interactivity"],
  ["select-none", "interactivity"],
  ["scroll-smooth", "interactivity"],
  ["snap-x", "interactivity"],

  // svg
  ["fill-current", "svg"],
  ["stroke-2", "svg"],

  // accessibility
  ["sr-only", "accessibility"],
  ["not-sr-only", "accessibility"],
];

describe("categorize", () => {
  it.each(cases)("classifies %s as %s", (cls, expected) => {
    expect(categorize(cls)).toBe(expected);
  });
});

describe("categorize — prefix specificity", () => {
  it("prefers the longest matching prefix (border vs border-spacing)", () => {
    expect(categorize("border-2")).toBe("borders");
    expect(categorize("border-spacing-4")).toBe("tables");
  });

  it("separates break-after (layout) from break-words (typography)", () => {
    expect(categorize("break-after-page")).toBe("layout");
    expect(categorize("break-words")).toBe("typography");
  });

  it("separates inset (layout) from inset-shadow (effects)", () => {
    expect(categorize("inset-x-2")).toBe("layout");
    expect(categorize("inset-shadow-sm")).toBe("effects");
  });
});

describe("categorize — unknown bucket", () => {
  it("returns unknown for arbitrary properties", () => {
    expect(categorize("[mask:url(#x)]")).toBe("unknown");
  });

  it("returns unknown for unrecognized / custom classes", () => {
    expect(categorize("wobble")).toBe("unknown");
    expect(categorize("foo")).toBe("unknown");
    expect(categorize("custom-thing")).toBe("unknown");
  });

  it("returns unknown for an empty base", () => {
    expect(categorize("")).toBe("unknown");
  });
});

describe("CATEGORY_RULES integrity", () => {
  it("never maps the same exact word to two categories", () => {
    const seen = new Map<string, string>();
    for (const category of CATEGORY_ORDER) {
      for (const word of CATEGORY_RULES[category].exact ?? []) {
        expect(seen.has(word), `"${word}" duplicated in ${seen.get(word)} and ${category}`).toBe(false);
        seen.set(word, category);
      }
    }
  });

  it("never maps the same prefix to two categories", () => {
    const seen = new Map<string, string>();
    for (const category of CATEGORY_ORDER) {
      for (const prefix of CATEGORY_RULES[category].prefixes ?? []) {
        expect(seen.has(prefix), `"${prefix}" duplicated in ${seen.get(prefix)} and ${category}`).toBe(false);
        seen.set(prefix, category);
      }
    }
  });
});
