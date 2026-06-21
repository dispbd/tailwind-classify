import { RuleTester } from "eslint";
import { describe, expect, it } from "vitest";
import { parseClass } from "./parse.js";
import { categorize } from "./categories.js";
import { groupByCategory } from "./group.js";
import { formatMarkup } from "./markup/index.js";
import rule from "./rules/multiline.js";

/**
 * End-to-end guarantees for arbitrary values and the `!` important modifier:
 * categorized correctly, never rewritten, never merged. Backed by the
 * bracket-aware parser and the verbatim-`raw` invariant.
 */

describe("arbitrary values & important — parsing/categorization", () => {
  const cases: [string, { base: string; cat: string; imp: string | null }][] = [
    ["bg-[#fff]", { base: "bg-[#fff]", cat: "backgrounds", imp: null }],
    ["text-[14px]", { base: "text-[14px]", cat: "typography", imp: null }],
    ["grid-cols-[1fr_2fr]", { base: "grid-cols-[1fr_2fr]", cat: "flexbox-grid", imp: null }],
    ["-mt-[10px]", { base: "mt-[10px]", cat: "spacing", imp: null }],
    ["bg-[#fff]/50", { base: "bg-[#fff]", cat: "backgrounds", imp: null }],
    ["!bg-[#fff]/50", { base: "bg-[#fff]", cat: "backgrounds", imp: "pre" }],
    ["bg-[#fff]/50!", { base: "bg-[#fff]", cat: "backgrounds", imp: "post" }],
    ["aspect-[16/9]", { base: "aspect-[16/9]", cat: "layout", imp: null }],
    // arbitrary *properties* are custom -> unknown
    ["[mask:url(#x)]", { base: "[mask:url(#x)]", cat: "unknown", imp: null }],
    ["![mask:url(#x)]", { base: "[mask:url(#x)]", cat: "unknown", imp: "pre" }],
    // important keeps its position and never changes the base category
    ["!font-bold", { base: "font-bold", cat: "typography", imp: "pre" }],
    ["font-bold!", { base: "font-bold", cat: "typography", imp: "post" }],
    ["hover:!font-bold", { base: "font-bold", cat: "typography", imp: "pre" }],
  ];

  it.each(cases)("%s", (token, expected) => {
    const parsed = parseClass(token);
    expect(parsed.raw).toBe(token); // verbatim, always
    expect(parsed.base).toBe(expected.base);
    expect(parsed.importantPosition).toBe(expected.imp);
    expect(categorize(parsed.base)).toBe(expected.cat);
  });
});

describe("arbitrary values & important — grouping preserves tokens verbatim", () => {
  it("keeps arbitrary/important tokens byte-for-byte while regrouping", () => {
    const groups = groupByCategory(
      "font-bold! flex bg-[#fff] !mt-2 [mask:url(#x)]",
    );
    expect(groups).toEqual([
      { category: "unknown", blocks: [{ variant: "", classes: ["[mask:url(#x)]"] }] },
      { category: "flexbox-grid", blocks: [{ variant: "", classes: ["flex"] }] },
      { category: "spacing", blocks: [{ variant: "", classes: ["!mt-2"] }] },
      { category: "typography", blocks: [{ variant: "", classes: ["font-bold!"] }] },
      { category: "backgrounds", blocks: [{ variant: "", classes: ["bg-[#fff]"] }] },
    ]);
  });
});

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe("arbitrary values & important — rule & markup", () => {
  it("passes RuleTester", () => {
    ruleTester.run("multiline", rule, {
      valid: [
        // a lone arbitrary property is left as-is
        '<div className="[mask:url(#x)]" />',
        // arbitrary value already in order
        '<div className="flex bg-[#fff]" />',
      ],
      invalid: [
        // v3 leading ! preserved, just reordered
        {
          code: '<div className="!font-bold flex" />',
          output: '<div className="flex !font-bold" />',
          errors: [{ messageId: "regroup" }],
        },
        // v4 trailing ! preserved verbatim (never normalized to v3)
        {
          code: '<div className="font-bold! flex" />',
          output: '<div className="flex font-bold!" />',
          errors: [{ messageId: "regroup" }],
        },
        // arbitrary value categorized by its prefix
        {
          code: '<div className="bg-[#fff] flex p-4" />',
          output: '<div className="flex p-4 bg-[#fff]" />',
          errors: [{ messageId: "regroup" }],
        },
        // arbitrary property routed to the leading unknown line
        {
          code: '<div className="flex [mask:url(#x)]" />',
          output: '<div className="[mask:url(#x)] flex" />',
          errors: [{ messageId: "regroup" }],
        },
        // negative arbitrary value
        {
          code: '<div className="text-sm -mt-[10px]" />',
          output: '<div className="-mt-[10px] text-sm" />',
          errors: [{ messageId: "regroup" }],
        },
        // important inside a helper call, preserved
        {
          code: 'clsx("!font-bold flex")',
          output: 'clsx("flex !font-bold")',
          errors: [{ messageId: "regroup" }],
        },
      ],
    });
  });

  it("formatMarkup keeps arbitrary values and important verbatim", () => {
    expect(formatMarkup('<div class="bg-[#fff] !mt-2 flex"></div>')).toBe(
      '<div class="flex !mt-2 bg-[#fff]"></div>',
    );
  });
});
