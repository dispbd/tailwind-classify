/**
 * Shared "extract → reformat → return" core (PLAN.md §4).
 *
 * Given a raw class-attribute value and the layout context of where it sits,
 * decide whether it fits on one line or should wrap, and return the new value
 * between the quotes — or `null` when it is already correct. Every syntax
 * (JSX `className`, HTML `class`, …) feeds this same function so the grouping
 * and serialization logic lives in one place.
 */

import { groupByCategory, type GroupOptions } from "./group.js";
import { serializeMultiline, serializeSingleLine } from "./serialize.js";

export interface FormatOptions extends GroupOptions {
  /** Wrap once the single-line form would exceed this column. Default 80. */
  printWidth?: number;
  /** Indentation added for each class line. Default two spaces. */
  indentStep?: string;
  /** Put quotes on their own lines when wrapping. Default true. */
  quotesOnNewLine?: boolean;
  /**
   * Allow wrapping onto multiple lines. Default true. Set false for contexts
   * that cannot contain raw newlines — e.g. ordinary JS string literals passed
   * to clsx/cva — where only single-line regrouping is valid.
   */
  allowMultiline?: boolean;
}

export interface FormatContext {
  /** Indentation (whitespace prefix) of the line the attribute sits on. */
  baseIndent: string;
  /**
   * Column at which the value content begins (right after the opening quote),
   * i.e. everything consumed before it on the line: indent + `<tag … class="`
   * (HTML) or attribute column + `className="` (JSX).
   */
  valueColumn: number;
}

/**
 * Reformat a class-attribute value. Returns the new inner value (without
 * quotes), or `null` if no change is needed.
 */
export function formatClassValue(
  value: string,
  context: FormatContext,
  options: FormatOptions = {},
): string | null {
  const printWidth = options.printWidth ?? 80;
  const indentStep = options.indentStep ?? "  ";
  const allowMultiline = options.allowMultiline ?? true;

  if (value.trim() === "") return null;

  const groups = groupByCategory(value, options);
  if (groups.length === 0) return null;

  const singleLine = serializeSingleLine(groups);
  // value content + the closing quote
  const singleLineWidth = context.valueColumn + singleLine.length + 1;

  const desired =
    allowMultiline && singleLineWidth > printWidth
      ? serializeMultiline(groups, {
          baseIndent: context.baseIndent,
          indentStep,
          quotesOnNewLine: options.quotesOnNewLine,
        })
      : singleLine;

  return desired === value ? null : desired;
}
