import { describe, expect, it } from "vitest";
import { dedupeExact } from "./dedupe.js";

describe("dedupeExact", () => {
  it("removes exact duplicate tokens", () => {
    expect(dedupeExact(["p-4", "p-4"])).toEqual(["p-4"]);
  });

  it("keeps the first occurrence and its order", () => {
    expect(dedupeExact(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });

  it("removes exact duplicates of variant classes", () => {
    expect(dedupeExact(["hover:bg-red-500", "hover:bg-red-500"])).toEqual([
      "hover:bg-red-500",
    ]);
  });

  it("returns an empty array unchanged", () => {
    expect(dedupeExact([])).toEqual([]);
  });
});

describe("dedupeExact — safety invariant (never drops non-identical tokens)", () => {
  it("keeps conflicting utilities", () => {
    expect(dedupeExact(["p-4", "p-2"])).toEqual(["p-4", "p-2"]);
    expect(dedupeExact(["block", "flex"])).toEqual(["block", "flex"]);
  });

  it("keeps tokens differing only by important marker", () => {
    expect(dedupeExact(["p-4", "p-4!"])).toEqual(["p-4", "p-4!"]);
    expect(dedupeExact(["!p-4", "p-4"])).toEqual(["!p-4", "p-4"]);
  });

  it("keeps tokens differing only by variant or variant order", () => {
    expect(dedupeExact(["hover:p-4", "focus:p-4"])).toEqual([
      "hover:p-4",
      "focus:p-4",
    ]);
    // Equivalent but textually different — kept, by design.
    expect(dedupeExact(["hover:focus:p-4", "focus:hover:p-4"])).toEqual([
      "hover:focus:p-4",
      "focus:hover:p-4",
    ]);
  });

  it("keeps tokens differing only by opacity modifier", () => {
    expect(dedupeExact(["bg-black", "bg-black/50"])).toEqual([
      "bg-black",
      "bg-black/50",
    ]);
  });
});
