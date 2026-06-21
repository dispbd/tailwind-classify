import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import { formatMarkup } from "./index.js";
import plugin from "../index.js";

/**
 * Syntax matrix: the same class list must regroup identically across every
 * supported syntax. Markup syntaxes (HTML/Vue/Svelte/Astro) go through the
 * shared formatMarkup; JSX goes through the ESLint rule. Each framework's
 * dynamic class form must be left untouched.
 */

/** Apply the multiline rule to JSX and return the autofixed source. */
function fixJsx(code: string): string {
  return new Linter().verifyAndFix(code, {
    plugins: { "tailwind-classify": plugin },
    rules: { "tailwind-classify/multiline": "error" },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  }).output;
}

const INPUT = "text-sm flex p-4";
const GROUPED = "flex p-4 text-sm";

describe("syntax matrix — static class regroups identically", () => {
  const markupCases: [string, string, string][] = [
    ["HTML", `<div class="${INPUT}"></div>`, `<div class="${GROUPED}"></div>`],
    ["Vue", `<div class="${INPUT}"></div>`, `<div class="${GROUPED}"></div>`],
    ["Svelte", `<div class="${INPUT}"></div>`, `<div class="${GROUPED}"></div>`],
    ["Astro", `<div class="${INPUT}" />`, `<div class="${GROUPED}" />`],
  ];

  it.each(markupCases)("%s static class", (_name, input, expected) => {
    expect(formatMarkup(input)).toBe(expected);
  });

  it("JSX className (via the ESLint rule)", () => {
    expect(fixJsx(`<div className="${INPUT}" />`)).toBe(
      `<div className="${GROUPED}" />`,
    );
  });
});

describe("syntax matrix — dynamic class bindings are left untouched", () => {
  const dynamic: [string, string][] = [
    ["Vue :class", `<div :class="${INPUT}"></div>`],
    ["Vue v-bind:class", `<div v-bind:class="${INPUT}"></div>`],
    ["Angular [class]", `<div [class]="${INPUT}"></div>`],
    ["Svelte class:directive", `<div class:flex={active} class:p-4={dense}></div>`],
    ["Svelte class={expr}", `<div class={cls}></div>`],
    ["Astro class:list", `<div class:list={["text-sm", "flex"]}></div>`],
  ];

  it.each(dynamic)("%s is unchanged", (_name, input) => {
    expect(formatMarkup(input)).toBe(input);
  });

  it("formats a static class while skipping a sibling dynamic binding", () => {
    expect(formatMarkup(`<div :class="x" class="${INPUT}"></div>`)).toBe(
      `<div :class="x" class="${GROUPED}"></div>`,
    );
  });
});

describe("syntax matrix — wrapping is consistent across markup and JSX", () => {
  const LONG =
    "flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100";
  const wrappedBody = [
    "  flex flex-col items-center justify-center",
    "  px-5 py-15",
    "  text-sm text-neutral-100",
  ].join("\n");

  it("HTML wraps the long list", () => {
    expect(formatMarkup(`<div class="${LONG}"></div>`)).toBe(
      `<div class="\n${wrappedBody}\n"></div>`,
    );
  });

  it("JSX wraps the long list the same way", () => {
    expect(fixJsx(`<div className="${LONG}" />`)).toBe(
      `<div className="\n${wrappedBody}\n" />`,
    );
  });
});
