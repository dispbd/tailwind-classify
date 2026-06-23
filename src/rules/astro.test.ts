import { RuleTester } from "eslint";
import * as astroParser from "astro-eslint-parser";
import { describe, it } from "vitest";
import rule from "./multiline.js";

const ruleTester = new RuleTester({
  languageOptions: {
    // astro-eslint-parser emits ordinary JSXAttribute nodes for class="...".
    parser: astroParser as unknown as { parseForESLint: unknown },
  },
});

const file = (code: string) => ({ filename: "Test.astro", code });

const LONG =
  "flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100";

describe("rule: multiline — Astro", () => {
  it("passes RuleTester", () => {
    ruleTester.run("multiline", rule, {
      valid: [
        file('<div class="flex text-sm">x</div>'),
        // dynamic class is an expression container → skipped
        file("<div class={dynamic}>x</div>"),
        file('<div class="foo bar">x</div>'),
      ],
      invalid: [
        // single-line reorder
        {
          ...file('<div class="text-sm flex p-4">x</div>'),
          output: '<div class="flex p-4 text-sm">x</div>',
          errors: [{ messageId: "regroup" }],
        },
        // exact duplicate removed
        {
          ...file('<div class="flex flex">x</div>'),
          output: '<div class="flex">x</div>',
          errors: [{ messageId: "regroup" }],
        },
        // long list wraps; quotes preserved (only the inner range is replaced)
        {
          ...file(`<div class="${LONG}">x</div>`),
          output: [
            '<div class="',
            "  flex flex-col items-center justify-center",
            "  px-5 py-15",
            "  text-sm text-neutral-100",
            '">x</div>',
          ].join("\n"),
          errors: [{ messageId: "regroup" }],
        },
        // clsx in the frontmatter (JS) of an Astro file
        {
          ...file('---\nconst c = clsx("text-sm flex");\n---\n<div>x</div>'),
          output: '---\nconst c = clsx("flex text-sm");\n---\n<div>x</div>',
          errors: [{ messageId: "regroup" }],
        },
      ],
    });
  });
});
