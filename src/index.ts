/**
 * eslint-plugin-tailwind-classify
 *
 * Splits long Tailwind class lists onto multiple lines, grouped by semantic
 * category, with exact-only deduplication and a cascade-safe invariant.
 */

import multiline from "./rules/multiline.js";

const plugin = {
  meta: {
    name: "eslint-plugin-tailwind-classify",
    version: "0.0.0",
  },
  rules: {
    multiline,
  },
  configs: {},
};

export default plugin;
