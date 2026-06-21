/**
 * Serialize category groups back into a class-attribute value.
 *
 * Two shapes:
 * - single line — all classes on one line, in category then variant-block order;
 * - multi line — one line per variant block, indented relative to the attribute,
 *   with the value opening right after the quote and the closing quote on its
 *   own line (the `quotesOnNewLine` style of the README example).
 *
 * The functions return the text that goes *between* the quotes; the caller
 * (the ESLint rule) wraps it in the original quote character.
 */

import type { ClassGroup } from "./group.js";

/** All classes on a single line, in category then variant-block order. */
export function serializeSingleLine(groups: ClassGroup[]): string {
  return groups
    .flatMap((group) => group.blocks)
    .flatMap((block) => block.classes)
    .join(" ");
}

export interface MultilineOptions {
  /** Indentation of the line the attribute sits on (its whitespace prefix). */
  baseIndent: string;
  /** One indent level added for class lines. */
  indentStep: string;
  /**
   * Put the quotes on their own lines (`true`, default — the README style: a
   * newline after the opening quote and the closing quote on its own line) or
   * hug the classes (`false`: the first block follows the opening quote and the
   * closing quote follows the last block).
   */
  quotesOnNewLine?: boolean;
}

/**
 * One line per variant block, each indented at `baseIndent + indentStep`.
 *
 * With `quotesOnNewLine` (default) the value opens with a newline and ends with
 * a newline + `baseIndent`, so both quotes sit on their own lines aligned to the
 * attribute. Without it, the first block follows the opening quote and the last
 * block is immediately followed by the closing quote.
 */
export function serializeMultiline(
  groups: ClassGroup[],
  { baseIndent, indentStep, quotesOnNewLine = true }: MultilineOptions,
): string {
  const lineIndent = baseIndent + indentStep;
  const blockLines = groups
    .flatMap((group) => group.blocks)
    .map((block) => block.classes.join(" "));

  if (quotesOnNewLine) {
    const body = blockLines.map((line) => lineIndent + line).join("\n");
    return `\n${body}\n${baseIndent}`;
  }

  // First block hugs the opening quote; the rest are indented; no trailing pad.
  return blockLines
    .map((line, i) => (i === 0 ? line : lineIndent + line))
    .join("\n");
}
