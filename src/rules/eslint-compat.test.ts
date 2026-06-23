import type { Rule } from "eslint";
import { describe, expect, it } from "vitest";
import rule from "./multiline.js";

/**
 * `context.sourceCode` was added in ESLint 8.40.0; the declared peerDependency
 * is ">=8.0.0", which includes 8.0-8.39 where only the older `getSourceCode()`
 * method exists. RuleTester/Linter on the ESLint version installed here (9.x)
 * always provide `context.sourceCode`, so they can't exercise that fallback —
 * this test calls `rule.create()` directly with a minimal fake context that
 * omits `sourceCode`, simulating an old ESLint host.
 */
describe("ESLint 8.0-8.39 compatibility (no context.sourceCode)", () => {
  it("falls back to context.getSourceCode() without throwing", () => {
    const reports: unknown[] = [];
    const fakeContext = {
      options: [],
      cwd: process.cwd(),
      // No `sourceCode` property — as on ESLint < 8.40.
      getSourceCode: () => ({ lines: ['<div className="text-sm flex" />'] }),
      report: (descriptor: unknown) => reports.push(descriptor),
    } as unknown as Rule.RuleContext;

    const listeners = rule.create(fakeContext);
    const onJSXAttribute = listeners.JSXAttribute as
      | ((node: unknown) => void)
      | undefined;
    expect(() =>
      onJSXAttribute?.({
        type: "JSXAttribute",
        name: { type: "JSXIdentifier", name: "className" },
        value: {
          type: "Literal",
          value: "text-sm flex",
          raw: '"text-sm flex"',
          loc: { start: { line: 1, column: 16 } },
        },
        loc: { start: { line: 1, column: 5 } },
      }),
    ).not.toThrow();

    expect(reports).toHaveLength(1);
    expect((reports[0] as { messageId: string }).messageId).toBe("regroup");
  });
});
