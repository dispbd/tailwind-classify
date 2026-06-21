/**
 * Exact-only deduplication.
 *
 * Safety invariant (PLAN.md §4): only *exact* (byte-for-byte identical) tokens
 * are removed; the first occurrence is kept. Conflicting utilities (`p-4 p-2`,
 * `block flex`) are never merged or dropped, and tokens that differ only by an
 * important marker, a variant, variant order, or an opacity modifier
 * (`p-4` vs `p-4!`, `hover:p-4` vs `focus:p-4`, `bg-black` vs `bg-black/50`)
 * are all kept.
 *
 * Textual identity is a deliberately conservative definition of "duplicate":
 * it can never change which utilities are present, so it is always safe.
 * Resolving real conflicts (`p-4 p-2`) is `tailwind-merge`'s job, not ours.
 */
export function dedupeExact(tokens: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    result.push(token);
  }
  return result;
}
