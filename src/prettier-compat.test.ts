import { Linter } from "eslint";
import prettierConfig from "eslint-config-prettier";
import { describe, expect, it } from "vitest";
import plugin from "./index.js";

/**
 * eslint-config-prettier turns off ESLint rules that conflict with Prettier.
 * Our rule only formats whitespace *inside* a class attribute value, which
 * Prettier preserves verbatim, so there's nothing to disable — these tests
 * guard that the rule keeps working alongside it.
 */

describe("eslint-config-prettier compatibility", () => {
  it("does not disable tailwind-classify/multiline", () => {
    const rules = prettierConfig.rules ?? {};
    expect(rules["tailwind-classify/multiline"]).toBeUndefined();
  });

  it("the rule still fixes when prettier's disabled rules are applied", () => {
    const linter = new Linter();
    const output = linter.verifyAndFix('<div className="text-sm flex" />', {
      plugins: { "tailwind-classify": plugin },
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      // eslint-config-prettier's off-rules merged in; ours stays on.
      rules: {
        ...prettierConfig.rules,
        "tailwind-classify/multiline": "error",
      },
    }).output;

    expect(output).toBe('<div className="flex text-sm" />');
  });
});
