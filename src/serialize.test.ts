import { describe, expect, it } from "vitest";
import { serializeMultiline, serializeSingleLine } from "./serialize.js";
import type { ClassGroup } from "./group.js";

const groups: ClassGroup[] = [
  {
    category: "flexbox-grid",
    blocks: [{ variant: "", classes: ["flex", "flex-col"] }],
  },
  { category: "spacing", blocks: [{ variant: "", classes: ["px-5", "py-15"] }] },
  { category: "typography", blocks: [{ variant: "", classes: ["text-sm"] }] },
];

// A category split into a base block and a variant block.
const withVariants: ClassGroup[] = [
  {
    category: "backgrounds",
    blocks: [
      { variant: "", classes: ["bg-red-500"] },
      { variant: "hover", classes: ["hover:bg-blue-500"] },
    ],
  },
];

describe("serializeSingleLine", () => {
  it("concatenates all blocks onto one line in order", () => {
    expect(serializeSingleLine(groups)).toBe(
      "flex flex-col px-5 py-15 text-sm",
    );
  });

  it("flattens variant blocks onto the single line", () => {
    expect(serializeSingleLine(withVariants)).toBe(
      "bg-red-500 hover:bg-blue-500",
    );
  });

  it("returns an empty string for no groups", () => {
    expect(serializeSingleLine([])).toBe("");
  });
});

describe("serializeMultiline", () => {
  it("puts one block per line with the closing quote aligned to baseIndent", () => {
    expect(serializeMultiline(groups, { baseIndent: "", indentStep: "  " })).toBe(
      "\n  flex flex-col\n  px-5 py-15\n  text-sm\n",
    );
  });

  it("indents class lines at baseIndent + indentStep", () => {
    expect(serializeMultiline(groups, { baseIndent: "  ", indentStep: "  " })).toBe(
      "\n    flex flex-col\n    px-5 py-15\n    text-sm\n  ",
    );
  });

  it("renders each variant block on its own line", () => {
    expect(
      serializeMultiline(withVariants, { baseIndent: "", indentStep: "  " }),
    ).toBe("\n  bg-red-500\n  hover:bg-blue-500\n");
  });

  it("hugs the quotes when quotesOnNewLine is false", () => {
    expect(
      serializeMultiline(groups, {
        baseIndent: "",
        indentStep: "  ",
        quotesOnNewLine: false,
      }),
    ).toBe("flex flex-col\n  px-5 py-15\n  text-sm");
  });
});
