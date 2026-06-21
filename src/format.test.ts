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

describe("formatClassValue — group strategy", () => {
  const input = "p-4 hover:bg-black bg-red-500";

  it("category-variant wraps with one line per variant block", () => {
    expect(
      formatClassValue(input, { baseIndent: "", valueColumn: 12 }, {
        maxClassesPerLine: 1,
      }),
    ).toBe("\n  p-4\n  bg-red-500\n  hover:bg-black\n");
  });

  it("category groups variants inline per category", () => {
    expect(
      formatClassValue(input, { baseIndent: "", valueColumn: 12 }, {
        group: "category",
        maxClassesPerLine: 1,
      }),
    ).toBe("\n  p-4\n  bg-red-500 hover:bg-black\n");
  });

  it("variant groups categories inline per variant chain", () => {
    expect(
      formatClassValue(input, { baseIndent: "", valueColumn: 12 }, {
        group: "variant",
        maxClassesPerLine: 1,
      }),
    ).toBe("\n  p-4 bg-red-500\n  hover:bg-black\n");
  });
});

describe("formatClassValue — maxClassesPerLine", () => {
  it("wraps when the class count exceeds the limit even within printWidth", () => {
    // "flex p-4 text-sm" easily fits 80 columns, but >2 classes triggers a wrap.
    expect(
      formatClassValue("flex p-4 text-sm", { baseIndent: "", valueColumn: 12 }, {
        group: "category",
        maxClassesPerLine: 2,
      }),
    ).toBe("\n  flex\n  p-4\n  text-sm\n");
  });

  it("stays single line when within the limit", () => {
    expect(
      formatClassValue("text-sm flex", { baseIndent: "", valueColumn: 12 }, {
        maxClassesPerLine: 2,
      }),
    ).toBe("flex text-sm");
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
