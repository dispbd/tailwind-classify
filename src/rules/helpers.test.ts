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

describe("rule: multiline — helper calls & templates", () => {
  it("passes RuleTester", () => {
    ruleTester.run("multiline", rule, {
      valid: [
        // unrecognized callee is ignored
        'foo("text-sm flex")',
        // already correct
        'clsx("flex text-sm")',
        // template with a substitution is skipped
        "clsx(`flex ${x}`)",
        "tw`flex ${x} text-sm`",
        // a JS string in a helper never wraps, so a long but ordered list is valid
        `clsx("${LONG}")`,
        // cva object keys are variant names, not classes — left alone
        'cva("flex", { variants: { size: { sm: "p-1" } } })',
      ],
      invalid: [
        // clsx string argument, single-line reorder
        {
          code: 'clsx("text-sm flex p-4")',
          output: 'clsx("flex p-4 text-sm")',
          errors: [{ messageId: "regroup" }],
        },
        // clsx array element
        {
          code: 'clsx(["text-sm flex", cond])',
          output: 'clsx(["flex text-sm", cond])',
          errors: [{ messageId: "regroup" }],
        },
        // clsx conditional branch
        {
          code: 'clsx(cond && "text-sm flex")',
          output: 'clsx(cond && "flex text-sm")',
          errors: [{ messageId: "regroup" }],
        },
        // clsx object: the KEY is the class string
        {
          code: 'clsx({ "text-sm flex": cond })',
          output: 'clsx({ "flex text-sm": cond })',
          errors: [{ messageId: "regroup" }],
        },
        // cn alias
        {
          code: 'cn("p-4", "text-sm flex")',
          output: 'cn("p-4", "flex text-sm")',
          errors: [{ messageId: "regroup" }],
        },
        // twMerge
        {
          code: 'twMerge("text-sm flex")',
          output: 'twMerge("flex text-sm")',
          errors: [{ messageId: "regroup" }],
        },
        // cva: base string + nested variant value
        {
          code: 'cva("text-sm flex", { variants: { intent: { primary: "bg-blue-500 text-white" } } })',
          output:
            'cva("flex text-sm", { variants: { intent: { primary: "text-white bg-blue-500" } } })',
          errors: [{ messageId: "regroup" }, { messageId: "regroup" }],
        },
        // a long JS string still only reorders on one line (never wraps)
        {
          code: 'clsx("text-sm flex flex-col items-center justify-center px-5 py-15 text-neutral-100")',
          output: 'clsx("flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100")',
          errors: [{ messageId: "regroup" }],
        },
        // tagged template tw`…` (may wrap, but short → single line reorder)
        {
          code: "tw`text-sm flex`",
          output: "tw`flex text-sm`",
          errors: [{ messageId: "regroup" }],
        },
        // className with a no-substitution template literal
        {
          code: "<div className={`text-sm flex`} />",
          output: "<div className={`flex text-sm`} />",
          errors: [{ messageId: "regroup" }],
        },
        // className={clsx(...)} handled via the call visitor
        {
          code: '<div className={clsx("text-sm flex")} />',
          output: '<div className={clsx("flex text-sm")} />',
          errors: [{ messageId: "regroup" }],
        },
        // tagged template wraps a long list (backticks allow newlines)
        {
          code: `tw\`${LONG}\``,
          output: [
            "tw`",
            "  flex flex-col items-center justify-center",
            "  px-5 py-15",
            "  text-sm text-neutral-100",
            "`",
          ].join("\n"),
          errors: [{ messageId: "regroup" }],
        },
      ],
    });
  });
});
