import { describe, expect, it } from "vitest";
import { serializeMultiline, serializeSingleLine } from "./serialize.js";
import type { ClassGroup } from "./group.js";

const groups: ClassGroup[] = [
  { category: "flexbox-grid", classes: ["flex", "flex-col"] },
  { category: "spacing", classes: ["px-5", "py-15"] },
  { category: "typography", classes: ["text-sm"] },
];

describe("serializeSingleLine", () => {
  it("concatenates all groups onto one line in order", () => {
    expect(serializeSingleLine(groups)).toBe(
      "flex flex-col px-5 py-15 text-sm",
    );
  });

  it("returns an empty string for no groups", () => {
    expect(serializeSingleLine([])).toBe("");
  });
});

describe("serializeMultiline", () => {
  it("puts one group per line with the closing quote aligned to baseIndent", () => {
    expect(serializeMultiline(groups, { baseIndent: "", indentStep: "  " })).toBe(
      "\n  flex flex-col\n  px-5 py-15\n  text-sm\n",
    );
  });

  it("indents class lines at baseIndent + indentStep", () => {
    expect(serializeMultiline(groups, { baseIndent: "  ", indentStep: "  " })).toBe(
      "\n    flex flex-col\n    px-5 py-15\n    text-sm\n  ",
    );
  });
});
