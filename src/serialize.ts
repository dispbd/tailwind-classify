/**
 * Serialize category groups back into a class-attribute value.
 *
 * Two shapes:
 * - single line — all classes on one line, groups concatenated in order;
 * - multi line — one line per group, indented relative to the attribute, with
 *   the value opening right after the quote and the closing quote on its own
 *   line (the `quotesOnNewLine` style of the README example).
 *
 * The functions return the text that goes *between* the quotes; the caller
 * (the ESLint rule) wraps it in the original quote character.
 */

import type { ClassGroup } from "./group.js";

/** All classes on a single line, groups concatenated in category order. */
export function serializeSingleLine(groups: ClassGroup[]): string {
  return groups.flatMap((group) => group.classes).join(" ");
}

export interface MultilineOptions {
  /** Indentation of the line the attribute sits on (its whitespace prefix). */
  baseIndent: string;
  /** One indent level added for class lines. */
  indentStep: string;
}

/**
 * One line per group. Class lines are indented at `baseIndent + indentStep`;
 * the value starts with a newline and ends with a newline + `baseIndent` so the
 * closing quote aligns with the attribute.
 */
export function serializeMultiline(
  groups: ClassGroup[],
  { baseIndent, indentStep }: MultilineOptions,
): string {
  const lineIndent = baseIndent + indentStep;
  const body = groups
    .map((group) => lineIndent + group.classes.join(" "))
    .join("\n");
  return `\n${body}\n${baseIndent}`;
}
