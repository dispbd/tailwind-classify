import { RuleTester } from "eslint";
import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import rule from "./multiline.js";

const ruleTester = new RuleTester({
  languageOptions: {
    // svelte-eslint-parser exposes parseForESLint; its template nodes are
    // visited by ordinary rule listeners (unlike Vue).
    parser: svelteParser as unknown as { parseForESLint: unknown },
  },
});

const file = (code: string) => ({ filename: "Test.svelte", code });

const LONG =
  "flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100";

describe("rule: multiline — Svelte", () => {
  it("passes RuleTester", () => {
    ruleTester.run("multiline", rule, {
      valid: [
        // already grouped/ordered
        file('<div class="flex text-sm">x</div>'),
        // dynamic / directive forms are not static class strings
        file("<div class={dynamic}>x</div>"),
        file("<button class:active={on}>y</button>"),
        // custom-only classes, source order preserved
        file('<div class="foo bar">x</div>'),
        // mixed literal + expression is skipped
        file('<div class="flex {extra}">x</div>'),
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
        // long list wraps (quotes preserved, value range replaced)
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
        // clsx in <script> is still handled in a .svelte file
        {
          ...file('<script>const c = clsx("text-sm flex");</script>'),
          output: '<script>const c = clsx("flex text-sm");</script>',
          errors: [{ messageId: "regroup" }],
        },
      ],
    });
  });
});
