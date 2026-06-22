import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import plugin, { formatMarkup, formatClassValue } from "./index.js";

describe("plugin export", () => {
  it("exposes the multiline rule", () => {
    expect(plugin.rules?.multiline).toBeDefined();
  });

  it("exposes a recommended flat config that enables the rule", () => {
    const recommended = plugin.configs?.recommended as {
      plugins: Record<string, unknown>;
      rules: Record<string, unknown>;
    };
    expect(recommended.rules["tailwind-classify/multiline"]).toBe("error");
    expect(recommended.plugins["tailwind-classify"]).toBe(plugin);
  });

  it("recommended config autofixes through the Linter", () => {
    const recommended = plugin.configs!.recommended as object;
    const output = new Linter().verifyAndFix('<div className="text-sm flex" />', {
      ...recommended,
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    }).output;
    expect(output).toBe('<div className="flex text-sm" />');
  });
});

describe("programmatic API", () => {
  it("re-exports formatMarkup", () => {
    expect(formatMarkup('<div class="text-sm flex"></div>')).toBe(
      '<div class="flex text-sm"></div>',
    );
  });

  it("re-exports formatClassValue", () => {
    expect(
      formatClassValue("text-sm flex", { baseIndent: "", valueColumn: 12 }),
    ).toBe("flex text-sm");
  });
});
