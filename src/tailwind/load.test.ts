import { describe, expect, it } from "vitest";
import {
  clearClassOrderCache,
  loadClassOrder,
  type ModuleLoader,
} from "./load.js";
import { sortByClassOrder } from "../order.js";

const ORDER: Record<string, bigint> = { flex: 10n, "p-4": 20n, "text-sm": 30n };

/** A fake Tailwind v3 install: identity resolveConfig + a context with order. */
const fakeTailwind: ModuleLoader = (id) => {
  if (id === "tailwindcss/resolveConfig") return (config: unknown) => config;
  if (id === "tailwindcss/lib/lib/setupContextUtils.js") {
    return {
      createContext: () => ({
        getClassOrder: (classes: string[]) =>
          classes.map((c) => [c, ORDER[c] ?? null] as [string, bigint | null]),
      }),
    };
  }
  // Any other id (e.g. a required config path) resolves to an empty config.
  return {};
};

describe("loadClassOrder — fallback", () => {
  it("falls back when Tailwind cannot be loaded (loader throws)", () => {
    const get = loadClassOrder({}, () => {
      throw new Error("Cannot find module 'tailwindcss'");
    });
    expect(get(["text-sm", "flex"])).toEqual([
      ["text-sm", null],
      ["flex", null],
    ]);
  });

  it("falls back when the resolved module isn't a function", () => {
    const get = loadClassOrder({}, () => ({}));
    expect(get(["flex"])).toEqual([["flex", null]]);
  });
});

describe("loadClassOrder — v3 context", () => {
  it("returns a getClassOrder backed by the Tailwind context", () => {
    const get = loadClassOrder({}, fakeTailwind);
    expect(get(["text-sm", "flex"])).toEqual([
      ["text-sm", 30n],
      ["flex", 10n],
    ]);
  });

  it("composes with sortByClassOrder to order by the context", () => {
    const get = loadClassOrder({}, fakeTailwind);
    expect(sortByClassOrder(["text-sm", "p-4", "flex"], get)).toEqual([
      "flex",
      "p-4",
      "text-sm",
    ]);
  });

  it("loads through a provided tailwindConfig path", () => {
    const requested: string[] = [];
    const spyLoader: ModuleLoader = (id) => {
      requested.push(id);
      return fakeTailwind(id);
    };
    const get = loadClassOrder(
      { tailwindConfig: "tailwind.config.js", cwd: process.cwd() },
      spyLoader,
    );
    expect(get(["flex"])).toEqual([["flex", 10n]]);
    expect(requested.some((id) => id.includes("tailwind.config.js"))).toBe(true);
  });
});

describe("loadClassOrder — caching", () => {
  it("caches results for the default loader path", () => {
    clearClassOrderCache();
    const a = loadClassOrder({ cwd: "/no/tailwind/here" });
    const b = loadClassOrder({ cwd: "/no/tailwind/here" });
    expect(a).toBe(b); // same cached fallback instance
  });
});
