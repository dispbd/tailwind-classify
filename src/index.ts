/**
 * eslint-plugin-tailwind-classify
 *
 * Splits long Tailwind class lists onto multiple lines, grouped by semantic
 * category, with exact-only deduplication and a cascade-safe invariant.
 *
 * Default export: the ESLint plugin (rule `multiline` + a `recommended` config).
 * Named exports: the programmatic formatter API, for markup (HTML / Vue /
 * Svelte / Astro) and other non-ESLint use.
 */

import type { ESLint } from "eslint";
import multiline from "./rules/multiline.js";

const plugin: ESLint.Plugin = {
  meta: {
    name: "eslint-plugin-tailwind-classify",
    version: "0.0.0",
  },
  rules: {
    multiline,
  },
};

plugin.configs = {
  /** Flat config: enable the rule with its defaults. */
  recommended: {
    name: "tailwind-classify/recommended",
    plugins: { "tailwind-classify": plugin },
    rules: { "tailwind-classify/multiline": "error" },
  },
};

export default plugin;

// Programmatic API — format class strings outside ESLint (markup, scripts).
export { formatClassValue } from "./format.js";
export type { FormatOptions, FormatContext } from "./format.js";
export {
  formatMarkup,
  formatHtml,
  extractClassAttributes,
} from "./markup/index.js";
export type {
  ClassAttributeMatch,
  HtmlFormatOptions,
} from "./markup/index.js";
export { groupByCategory, toLines } from "./group.js";
export type {
  ClassGroup,
  VariantBlock,
  GroupOptions,
  GroupStrategy,
} from "./group.js";
export { CATEGORY_ORDER } from "./categories.js";
export type { Category, FunctionalCategory } from "./categories.js";
