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

const LONG =
  "flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100";

describe("rule: multiline — options", () => {
  it("passes RuleTester", () => {
    ruleTester.run("multiline", rule, {
      valid: [
        // custom callees: clsx is no longer recognized when overridden
        { code: 'clsx("text-sm flex")', options: [{ callees: ["myTw"] }] },
      ],
      invalid: [
        // printWidth forces a wrap for an otherwise short list
        {
          code: '<div className="text-sm flex" />',
          options: [{ printWidth: 10 }],
          output: ['<div className="', "  flex", "  text-sm", '" />'].join("\n"),
          errors: [{ messageId: "regroup" }],
        },
        // maxClassesPerLine wraps by class count
        {
          code: '<div className="text-sm flex p-4" />',
          options: [{ maxClassesPerLine: 2, group: "category" }],
          output: ['<div className="', "  flex", "  p-4", "  text-sm", '" />'].join(
            "\n",
          ),
          errors: [{ messageId: "regroup" }],
        },
        // categoryOrder puts typography before flexbox
        {
          code: '<div className="flex text-sm" />',
          options: [{ categoryOrder: ["typography", "flexbox-grid"] }],
          output: '<div className="text-sm flex" />',
          errors: [{ messageId: "regroup" }],
        },
        // group: "variant" lays out one line per variant chain
        {
          code: '<div className="hover:flex p-4 flex" />',
          options: [{ group: "variant", maxClassesPerLine: 1 }],
          output: ['<div className="', "  flex p-4", "  hover:flex", '" />'].join(
            "\n",
          ),
          errors: [{ messageId: "regroup" }],
        },
        // quotesOnNewLine: false hugs the quotes
        {
          code: `<div className="${LONG}" />`,
          options: [{ quotesOnNewLine: false }],
          output: [
            '<div className="flex flex-col items-center justify-center',
            "  px-5 py-15",
            '  text-sm text-neutral-100" />',
          ].join("\n"),
          errors: [{ messageId: "regroup" }],
        },
        // custom callee is formatted
        {
          code: 'myTw("text-sm flex")',
          options: [{ callees: ["myTw"] }],
          output: 'myTw("flex text-sm")',
          errors: [{ messageId: "regroup" }],
        },
      ],
    });
  });
});
