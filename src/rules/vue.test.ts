import { RuleTester } from "eslint";
import * as vueParser from "vue-eslint-parser";
import { describe, it } from "vitest";
import rule from "./multiline.js";

const ruleTester = new RuleTester({
  languageOptions: {
    // vue-eslint-parser exposes the template AST only via parserServices
    // (defineTemplateBodyVisitor); the rule wires that up when present.
    parser: vueParser as unknown as { parseForESLint: unknown },
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

const file = (code: string) => ({ filename: "Test.vue", code });

const LONG =
  "flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100";

describe("rule: multiline — Vue", () => {
  it("passes RuleTester", () => {
    ruleTester.run("multiline", rule, {
      valid: [
        file('<template><div class="flex text-sm">x</div></template>'),
        // dynamic bindings are directives, not static class
        file('<template><div :class="foo"></div></template>'),
        file('<template><div v-bind:class="foo"></div></template>'),
        // custom-only classes, source order preserved
        file('<template><div class="foo bar">x</div></template>'),
      ],
      invalid: [
        // single-line reorder in the template
        {
          ...file('<template><div class="text-sm flex p-4">x</div></template>'),
          output: '<template><div class="flex p-4 text-sm">x</div></template>',
          errors: [{ messageId: "regroup" }],
        },
        // exact duplicate removed
        {
          ...file('<template><div class="flex flex">x</div></template>'),
          output: '<template><div class="flex">x</div></template>',
          errors: [{ messageId: "regroup" }],
        },
        // long list wraps; quotes preserved (only the inner range is replaced)
        {
          ...file(`<template><div class="${LONG}">x</div></template>`),
          output: [
            '<template><div class="',
            "  flex flex-col items-center justify-center",
            "  px-5 py-15",
            "  text-sm text-neutral-100",
            '">x</div></template>',
          ].join("\n"),
          errors: [{ messageId: "regroup" }],
        },
        // clsx in <script> of an SFC
        {
          ...file(
            '<script>const c = clsx("text-sm flex");</script>\n<template><div /></template>',
          ),
          output:
            '<script>const c = clsx("flex text-sm");</script>\n<template><div /></template>',
          errors: [{ messageId: "regroup" }],
        },
      ],
    });
  });
});
