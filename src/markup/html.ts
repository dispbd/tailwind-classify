/**
 * HTML `class` attribute support.
 *
 * `extractClassAttributes` locates static `class="…"` / `class='…'` attributes
 * in markup text (with their value positions); `formatHtml` rewrites each one
 * through the shared formatter. Dynamic bindings — `:class`, `v-bind:class`,
 * `[class]`, `className` — are intentionally skipped: their values are
 * expressions, not class strings.
 *
 * This is a string-level parser, independent of any ESLint HTML parser; an
 * ESLint rule for HTML files can reuse the same extraction.
 */

import { formatClassValue, type FormatOptions } from "../format.js";

export interface ClassAttributeMatch {
  /** The value text between the quotes. */
  value: string;
  /** The quote character used (`"` or `'`). */
  quote: string;
  /** Source index of the first character of the value (after the open quote). */
  valueStart: number;
  /** Source index just past the last character of the value (the close quote). */
  valueEnd: number;
}

export interface HtmlFormatOptions extends FormatOptions {
  /** Attribute names to format. Default `["class"]`. */
  attrNames?: string[];
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Find static class attributes in `source`. The lookbehind rejects bindings
 * like `:class`, `v-bind:class`, `[class]`, and avoids matching inside longer
 * identifiers (`subclass`, `className`).
 */
export function extractClassAttributes(
  source: string,
  attrNames: string[] = ["class"],
): ClassAttributeMatch[] {
  const names = attrNames.map(escapeRegExp).join("|");
  // (?<![\w:.@[-]) — not part of a binding or a longer name
  // \s*=\s*("…"|'…')  — value in either quote style, may span lines (s flag)
  const re = new RegExp(
    `(?<![\\w:.@[-])(?:${names})\\s*=\\s*(["'])(.*?)\\1`,
    "gds",
  );

  const matches: ClassAttributeMatch[] = [];
  for (let m = re.exec(source); m !== null; m = re.exec(source)) {
    const indices = m.indices?.[2];
    if (!indices) continue;
    matches.push({
      value: m[2] ?? "",
      quote: m[1] ?? '"',
      valueStart: indices[0],
      valueEnd: indices[1],
    });
  }
  return matches;
}

/** Whitespace prefix of the line that contains `index`. */
function lineIndentAt(source: string, index: number): string {
  const lineStart = source.lastIndexOf("\n", index - 1) + 1;
  return /^[ \t]*/.exec(source.slice(lineStart))?.[0] ?? "";
}

/** Column of `index` within its line (0-based). */
function columnAt(source: string, index: number): number {
  const lineStart = source.lastIndexOf("\n", index - 1) + 1;
  return index - lineStart;
}

/**
 * Rewrite every static `class` attribute in `source` through the shared
 * formatter. Pure string transform; unchanged attributes are left untouched.
 */
export function formatHtml(source: string, options: HtmlFormatOptions = {}): string {
  const matches = extractClassAttributes(source, options.attrNames ?? ["class"]);

  let out = source;
  // Apply right-to-left so earlier indices stay valid as we splice.
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i]!;
    const desired = formatClassValue(
      m.value,
      {
        baseIndent: lineIndentAt(source, m.valueStart),
        valueColumn: columnAt(source, m.valueStart),
      },
      options,
    );
    if (desired === null || desired === m.value) continue;
    out = out.slice(0, m.valueStart) + desired + out.slice(m.valueEnd);
  }
  return out;
}
