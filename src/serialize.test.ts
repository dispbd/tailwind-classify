import { describe, expect, it } from "vitest";
import { serializeMultiline, serializeSingleLine } from "./serialize.js";

// Lines as produced by toLines (one inner array per output line).
const lines: string[][] = [
  ["flex", "flex-col"],
  ["px-5", "py-15"],
  ["text-sm"],
];

describe("serializeSingleLine", () => {
  it("concatenates all lines onto one line in order", () => {
    expect(serializeSingleLine(lines)).toBe("flex flex-col px-5 py-15 text-sm");
  });

  it("returns an empty string for no lines", () => {
    expect(serializeSingleLine([])).toBe("");
  });
});

describe("serializeMultiline", () => {
  it("puts one line per entry with the closing quote aligned to baseIndent", () => {
    expect(serializeMultiline(lines, { baseIndent: "", indentStep: "  " })).toBe(
      "\n  flex flex-col\n  px-5 py-15\n  text-sm\n",
    );
  });

  it("indents class lines at baseIndent + indentStep", () => {
    expect(serializeMultiline(lines, { baseIndent: "  ", indentStep: "  " })).toBe(
      "\n    flex flex-col\n    px-5 py-15\n    text-sm\n  ",
    );
  });

  it("hugs the quotes when quotesOnNewLine is false", () => {
    expect(
      serializeMultiline(lines, {
        baseIndent: "",
        indentStep: "  ",
        quotesOnNewLine: false,
      }),
    ).toBe("flex flex-col\n  px-5 py-15\n  text-sm");
  });
});
