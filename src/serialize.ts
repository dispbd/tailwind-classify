/**
 * Serialize layout lines back into a class-attribute value.
 *
 * Input is `string[][]` — the output of {@link toLines}, one inner array per
 * line. Two shapes:
 * - single line — all classes on one line, in line then class order;
 * - multi line — one source line per layout line, indented relative to the
 *   attribute, with quotes on their own lines (the README `quotesOnNewLine`
 *   style) unless disabled.
 *
 * The functions return the text that goes *between* the quotes; the caller
 * (the ESLint rule / markup formatter) wraps it in the original quote.
 */

/** All classes on a single line, in line then class order. */
export function serializeSingleLine(lines: string[][]): string {
  return lines.flat().join(" ");
}

export interface MultilineOptions {
  /** Indentation of the line the attribute sits on (its whitespace prefix). */
  baseIndent: string;
  /** One indent level added for class lines. */
  indentStep: string;
  /**
   * Put the quotes on their own lines (`true`, default — the README style: a
   * newline after the opening quote and the closing quote on its own line) or
   * hug the classes (`false`: the first line follows the opening quote and the
   * closing quote follows the last line).
   */
  quotesOnNewLine?: boolean;
}

/**
 * One source line per layout line, each indented at `baseIndent + indentStep`.
 *
 * With `quotesOnNewLine` (default) the value opens with a newline and ends with
 * a newline + `baseIndent`, so both quotes sit on their own lines aligned to the
 * attribute. Without it, the first line follows the opening quote and the last
 * line is immediately followed by the closing quote.
 */
export function serializeMultiline(
  lines: string[][],
  { baseIndent, indentStep, quotesOnNewLine = true }: MultilineOptions,
): string {
  const lineIndent = baseIndent + indentStep;
  const rendered = lines.map((line) => line.join(" "));

  if (quotesOnNewLine) {
    const body = rendered.map((line) => lineIndent + line).join("\n");
    return `\n${body}\n${baseIndent}`;
  }

  // First line hugs the opening quote; the rest are indented; no trailing pad.
  return rendered
    .map((line, i) => (i === 0 ? line : lineIndent + line))
    .join("\n");
}
