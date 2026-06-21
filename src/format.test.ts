import { describe, expect, it } from "vitest";
import { formatClassValue } from "./format.js";

const LONG =
  "flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100";

describe("formatClassValue — single vs wrapped decision", () => {
  it("returns null when already correct", () => {
    expect(
      formatClassValue("flex p-4", { baseIndent: "", valueColumn: 12 }),
    ).toBeNull();
  });

  it("reorders on one line when it fits", () => {
    expect(
      formatClassValue("text-sm flex p-4", { baseIndent: "", valueColumn: 12 }),
    ).toBe("flex p-4 text-sm");
  });

  it("wraps once the single line would exceed printWidth", () => {
    expect(formatClassValue(LONG, { baseIndent: "", valueColumn: 12 })).toBe(
      "\n  flex flex-col items-center justify-center\n  px-5 py-15\n  text-sm text-neutral-100\n",
    );
  });

  it("respects a custom printWidth", () => {
    // "flex p-4" would fit at 80 but not at a tiny width → wraps.
    expect(
      formatClassValue("text-sm flex p-4", { baseIndent: "", valueColumn: 8 }, {
        printWidth: 10,
      }),
    ).toBe("\n  flex\n  p-4\n  text-sm\n");
  });
});

describe("formatClassValue — parent indentation", () => {
  it.each([
    ["", "  "],
    ["  ", "    "],
    ["      ", "        "],
  ])("indents class lines one step past baseIndent %j", (baseIndent, lineIndent) => {
    const out = formatClassValue(LONG, { baseIndent, valueColumn: 14 });
    expect(out).toBe(
      `\n${lineIndent}flex flex-col items-center justify-center` +
        `\n${lineIndent}px-5 py-15` +
        `\n${lineIndent}text-sm text-neutral-100\n${baseIndent}`,
    );
  });

  it("uses a custom indentStep", () => {
    const out = formatClassValue(LONG, { baseIndent: "", valueColumn: 14 }, {
      indentStep: "\t",
    });
    expect(out).toBe(
      "\n\tflex flex-col items-center justify-center" +
        "\n\tpx-5 py-15" +
        "\n\ttext-sm text-neutral-100\n",
    );
  });
});

describe("formatClassValue — quotesOnNewLine", () => {
  it("hugs the quotes when false", () => {
    expect(
      formatClassValue(LONG, { baseIndent: "", valueColumn: 12 }, {
        quotesOnNewLine: false,
      }),
    ).toBe(
      "flex flex-col items-center justify-center" +
        "\n  px-5 py-15" +
        "\n  text-sm text-neutral-100",
    );
  });
});
