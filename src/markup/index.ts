/**
 * Markup entry points.
 *
 * HTML, Vue, Svelte, and Astro all express static classes the same way —
 * `class="…"` — and their dynamic forms (`:class`, `v-bind:class`, `[class]`,
 * `class:name`, `class:list`, `class={…}`) are all skipped by the extractor.
 * So a single framework-agnostic formatter serves all four.
 *
 * This is string-level: in a single-file component it would also see `class="…"`
 * occurrences inside `<script>` / `<style>` blocks. That's an accepted
 * limitation for now; section-aware SFC parsing can come later.
 */

import { formatHtml, type HtmlFormatOptions } from "./html.js";

export {
  extractClassAttributes,
  formatHtml,
  type ClassAttributeMatch,
  type HtmlFormatOptions,
} from "./html.js";

/**
 * Reformat static `class` attributes in any supported markup (HTML / Vue /
 * Svelte / Astro). Dynamic class bindings are left untouched.
 */
export function formatMarkup(
  source: string,
  options?: HtmlFormatOptions,
): string {
  return formatHtml(source, options);
}
