import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import rule from "./multiline.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

// A long class list that forces the multi-line form.
const LONG =
  "flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100";

describe("rule: multiline", () => {
  it("passes RuleTester", () => {
    ruleTester.run("multiline", rule, {
      valid: [
        // already grouped/ordered and short — stays single line
        '<div className="flex text-sm" />',
        // custom-only classes are left in source order, untouched
        '<div className="foo bar" />',
        // nothing to do for empty / dynamic / boolean className
        '<div className="" />',
        "<div className={dynamic} />",
        "<div className />",
        "<div {...props} />",
        // idempotent: the already-wrapped form is valid
        [
          '<div className="',
          "  flex flex-col items-center justify-center",
          "  px-5 py-15",
          "  text-sm text-neutral-100",
          '" />',
        ].join("\n"),
      ],
      invalid: [
        // reorder on a single line (typography after flexbox)
        {
          code: '<div className="text-sm flex" />',
          output: '<div className="flex text-sm" />',
          errors: [{ messageId: "regroup" }],
        },
        // exact duplicate removed
        {
          code: '<div className="flex flex" />',
          output: '<div className="flex" />',
          errors: [{ messageId: "regroup" }],
        },
        // unknown leads; important and arbitrary tokens preserved verbatim
        {
          code: '<div className="flex !p-4 [mask:url(#x)]" />',
          output: '<div className="[mask:url(#x)] flex !p-4" />',
          errors: [{ messageId: "regroup" }],
        },
        // long list wraps onto grouped lines (element at column 0)
        {
          code: `<div className="${LONG}" />`,
          output: [
            '<div className="',
            "  flex flex-col items-center justify-center",
            "  px-5 py-15",
            "  text-sm text-neutral-100",
            '" />',
          ].join("\n"),
          errors: [{ messageId: "regroup" }],
        },
        // indentation is taken from the attribute's line
        {
          code: `  <div className="${LONG}" />`,
          output: [
            '  <div className="',
            "    flex flex-col items-center justify-center",
            "    px-5 py-15",
            "    text-sm text-neutral-100",
            '  " />',
          ].join("\n"),
          errors: [{ messageId: "regroup" }],
        },
      ],
    });
  });
});
