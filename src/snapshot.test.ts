import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import { groupByCategory } from "./group.js";
import plugin from "./index.js";

/**
 * End-to-end snapshots. The core pipeline (parse → dedupe → categorize → order)
 * and the JSX rule's autofix output are pinned here so regressions in grouping,
 * ordering, or serialization are visible in a diff.
 */

const CORE_INPUTS: Record<string, string> = {
  "canonical README example":
    "flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100",
  "variants, important, arbitrary, unknown, and a duplicate":
    "z-10 custom-thing hover:bg-blue-500 bg-red-500 p-4 p-4 !mt-2 text-sm rounded-lg shadow-md [mask:url(#x)]",
  "many categories":
    "grid grid-cols-3 gap-4 w-full h-screen border border-gray-200 transition-colors duration-300 cursor-pointer fill-current sr-only",
};

describe("snapshot: core grouping", () => {
  for (const [name, input] of Object.entries(CORE_INPUTS)) {
    it(name, () => {
      expect(groupByCategory(input)).toMatchSnapshot();
    });
  }
});

/** Apply the multiline rule to JSX and return the autofixed source. */
function fixJsx(code: string): string {
  const linter = new Linter();
  const result = linter.verifyAndFix(code, {
    plugins: { "tailwind-classify": plugin },
    rules: { "tailwind-classify/multiline": "error" },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });
  return result.output;
}

const JSX_INPUTS: Record<string, string> = {
  "long list wraps onto grouped lines":
    '<div className="flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100" />',
  "indented element keeps its indentation": [
    "function C() {",
    "  return (",
    '    <div className="flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100" />',
    "  );",
    "}",
  ].join("\n"),
  "short list reorders but stays single line": '<div className="text-sm flex p-4" />',
  "variants / important / arbitrary preserved, unknown leads":
    '<div className="flex hover:bg-blue-500 !mt-2 [mask:url(#x)] custom-thing" />',
};

describe("snapshot: JSX className autofix", () => {
  for (const [name, code] of Object.entries(JSX_INPUTS)) {
    it(name, () => {
      expect(fixJsx(code)).toMatchSnapshot();
    });
  }
});
