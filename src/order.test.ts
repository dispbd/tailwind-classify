import { describe, expect, it, vi } from "vitest";
import {
  fallbackClassOrder,
  fromTailwindContext,
  sortByClassOrder,
  type GetClassOrder,
} from "./order.js";

/** A fake Tailwind ordering table standing in for `getClassOrder()`. */
const ORDER: Record<string, bigint> = {
  flex: 10n,
  "flex-col": 11n,
  "items-center": 20n,
  "justify-center": 21n,
  "px-5": 100n,
  "py-15": 101n,
  "text-sm": 200n,
};

const fakeGetClassOrder: GetClassOrder = (classes) =>
  classes.map((cls) => [cls, ORDER[cls] ?? null]);

describe("sortByClassOrder", () => {
  it("orders recognized classes by ascending stylesheet position", () => {
    expect(
      sortByClassOrder(
        ["py-15", "flex", "text-sm", "px-5", "flex-col"],
        fakeGetClassOrder,
      ),
    ).toEqual(["flex", "flex-col", "px-5", "py-15", "text-sm"]);
  });

  it("keeps unrecognized (null-order) classes ahead, in input order", () => {
    expect(
      sortByClassOrder(["px-5", "wobble", "flex", "wiggle"], fakeGetClassOrder),
    ).toEqual(["wobble", "wiggle", "flex", "px-5"]);
  });

  it("is stable for equal orders", () => {
    const sameOrder: GetClassOrder = (classes) =>
      classes.map((cls) => [cls, 5n]);
    expect(sortByClassOrder(["b", "a", "c"], sameOrder)).toEqual(["b", "a", "c"]);
  });

  it("handles an empty list", () => {
    expect(sortByClassOrder([], fakeGetClassOrder)).toEqual([]);
  });
});

describe("fallbackClassOrder", () => {
  it("preserves input order (no Tailwind available)", () => {
    expect(sortByClassOrder(["c", "a", "b"], fallbackClassOrder)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("marks every class as unrecognized", () => {
    expect(fallbackClassOrder(["flex", "px-5"])).toEqual([
      ["flex", null],
      ["px-5", null],
    ]);
  });
});

describe("fromTailwindContext", () => {
  it("delegates to the context's getClassOrder", () => {
    const getClassOrder = vi.fn(fakeGetClassOrder);
    const ctx = { getClassOrder };
    const get = fromTailwindContext(ctx);

    expect(get(["flex", "px-5"])).toEqual([
      ["flex", 10n],
      ["px-5", 100n],
    ]);
    expect(getClassOrder).toHaveBeenCalledWith(["flex", "px-5"]);
  });

  it("composes with sortByClassOrder using a context object", () => {
    const ctx = {
      getClassOrder: (classes: string[]): [string, bigint | null][] =>
        classes.map((cls) => [cls, ORDER[cls] ?? null]),
    };
    expect(
      sortByClassOrder(["text-sm", "flex", "items-center"], fromTailwindContext(ctx)),
    ).toEqual(["flex", "items-center", "text-sm"]);
  });
});
