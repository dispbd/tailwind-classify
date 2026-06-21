/**
 * Tailwind class-token parser.
 *
 * Decomposes a single class token into its structural parts following the
 * Tailwind grammar:
 *
 *     [variants:]…[!]base[/opacity][!]
 *
 * The parser is bracket-aware: `:` and `/` that appear inside `[...]`, `(...)`
 * or `{...}` (arbitrary values/variants/properties) are NOT treated as
 * separators, so tokens like `data-[state=open]:bg-black/50` or
 * `bg-[url(https://x/y)]` decompose correctly.
 *
 * Safety invariant (see PLAN.md §4): parsing is lossless — `raw` always holds
 * the original token verbatim, so callers can re-emit a class exactly as it was
 * written and never need to reconstruct it from the parsed parts.
 */

export interface ParsedClass {
  /** The original token, exactly as written. The source of truth for re-emit. */
  raw: string;
  /** Variant prefixes in source order, e.g. `["sm", "hover"]`. Empty when none. */
  variants: string[];
  /**
   * Base utility, stripped of variants, the `!` important marker, the opacity
   * modifier, and the leading negative sign (recorded in `negative`).
   * Examples: `flex`, `mt-4`, `bg-red-500`, `[mask:url(#x)]`.
   */
  base: string;
  /** True when the utility is negated via a leading `-`, e.g. `-mt-4`. */
  negative: boolean;
  /** True when the class is marked important (`!`). */
  important: boolean;
  /**
   * Where the `!` sits, mirroring the two Tailwind syntaxes:
   * - `"pre"`  — v3 leading `!` (e.g. `hover:!font-bold`)
   * - `"post"` — v4 trailing `!` (e.g. `hover:font-bold!`)
   * `null` when not important.
   */
  importantPosition: "pre" | "post" | null;
  /**
   * The trailing `/`-modifier without the slash, e.g. `"50"` in `bg-black/50`
   * or `"[0.5]"` in `text-black/[0.5]`. Tailwind calls this the opacity
   * modifier; value fractions such as `w-1/2` also land here. That is harmless:
   * the token is always re-emitted from `raw`, and category lookup keys off the
   * base prefix, which is identical with or without the slash split.
   */
  opacity: string | null;
}

/** Characters that open a bracketed (arbitrary) region. */
const OPENERS = "[({";
/** Characters that close a bracketed region. */
const CLOSERS = "])}";

/** Split `input` on every occurrence of `sep` that sits at bracket depth 0. */
function splitTopLevel(input: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of input) {
    if (OPENERS.includes(ch)) depth++;
    else if (CLOSERS.includes(ch)) depth = Math.max(0, depth - 1);

    if (ch === sep && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

/** Index of the last occurrence of `ch` at bracket depth 0, or -1 if none. */
function lastTopLevelIndex(input: string, ch: string): number {
  let depth = 0;
  let found = -1;
  for (let i = 0; i < input.length; i++) {
    const c = input[i]!;
    if (OPENERS.includes(c)) depth++;
    else if (CLOSERS.includes(c)) depth = Math.max(0, depth - 1);
    else if (c === ch && depth === 0) found = i;
  }
  return found;
}

/**
 * Parse a single class token (no surrounding whitespace) into its parts.
 *
 * The order of extraction matters and follows the on-the-wire shape:
 * variants → important marker → opacity modifier → negative sign.
 */
export function parseClass(token: string): ParsedClass {
  const raw = token;

  // 1. Variants vs. utility: every top-level `:` is a variant separator; the
  //    final segment is the utility, everything before it are variants.
  const segments = splitTopLevel(token, ":");
  const variants = segments.slice(0, -1);
  let u = segments[segments.length - 1] ?? "";

  // 2. Important marker — trailing `!` (v4) or leading `!` (v3).
  let important = false;
  let importantPosition: "pre" | "post" | null = null;
  if (u.length > 1 && u.endsWith("!")) {
    important = true;
    importantPosition = "post";
    u = u.slice(0, -1);
  } else if (u.length > 1 && u.startsWith("!")) {
    important = true;
    importantPosition = "pre";
    u = u.slice(1);
  }

  // 3. Opacity / trailing-slash modifier — only a top-level `/` counts, and it
  //    must leave a non-empty base on the left and a value on the right.
  let opacity: string | null = null;
  const slash = lastTopLevelIndex(u, "/");
  if (slash > 0 && slash < u.length - 1) {
    opacity = u.slice(slash + 1);
    u = u.slice(0, slash);
  }

  // 4. Negative sign.
  let negative = false;
  if (u.startsWith("-")) {
    negative = true;
    u = u.slice(1);
  }

  return { raw, variants, base: u, negative, important, importantPosition, opacity };
}

/**
 * Split a whitespace-separated class string into tokens and parse each,
 * preserving source order. Empty tokens (from leading/trailing/collapsed
 * whitespace) are dropped.
 */
export function parseClassList(input: string): ParsedClass[] {
  return input
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map(parseClass);
}
