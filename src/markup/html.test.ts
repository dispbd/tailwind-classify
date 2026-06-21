import { describe, expect, it } from "vitest";
import { extractClassAttributes, formatHtml } from "./html.js";

describe("extractClassAttributes", () => {
  it("finds a double-quoted class attribute", () => {
    const m = extractClassAttributes('<div class="flex p-4"></div>');
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ value: "flex p-4", quote: '"' });
    expect('<div class="flex p-4"></div>'.slice(m[0]!.valueStart, m[0]!.valueEnd)).toBe(
      "flex p-4",
    );
  });

  it("finds a single-quoted class attribute", () => {
    const m = extractClassAttributes("<div class='flex'></div>");
    expect(m[0]).toMatchObject({ value: "flex", quote: "'" });
  });

  it("finds several attributes across elements", () => {
    const m = extractClassAttributes('<a class="x"></a><b class="y"></b>');
    expect(m.map((x) => x.value)).toEqual(["x", "y"]);
  });

  it("skips dynamic bindings", () => {
    expect(extractClassAttributes('<div :class="x"></div>')).toEqual([]);
    expect(extractClassAttributes('<div v-bind:class="x"></div>')).toEqual([]);
    expect(extractClassAttributes('<div [class]="x"></div>')).toEqual([]);
  });

  it("does not match a longer attribute name", () => {
    expect(extractClassAttributes('<div data-subclass="x"></div>')).toEqual([]);
  });

  it("matches a value spanning multiple lines", () => {
    const src = '<div class="flex\n  p-4"></div>';
    expect(extractClassAttributes(src)[0]?.value).toBe("flex\n  p-4");
  });
});

describe("formatHtml", () => {
  it("reorders a short class on a single line", () => {
    expect(formatHtml('<div class="text-sm flex p-4"></div>')).toBe(
      '<div class="flex p-4 text-sm"></div>',
    );
  });

  it("leaves an already-correct attribute untouched", () => {
    const src = '<div class="flex p-4"></div>';
    expect(formatHtml(src)).toBe(src);
  });

  it("wraps a long class list, deriving indentation from the line", () => {
    const long =
      "flex flex-col items-center justify-center px-5 py-15 text-sm text-neutral-100";
    expect(formatHtml(`  <div class="${long}"></div>`)).toBe(
      [
        '  <div class="',
        "    flex flex-col items-center justify-center",
        "    px-5 py-15",
        "    text-sm text-neutral-100",
        '  "></div>',
      ].join("\n"),
    );
  });

  it("skips dynamic bindings while formatting static ones", () => {
    expect(formatHtml('<div :class="a" class="text-sm flex"></div>')).toBe(
      '<div :class="a" class="flex text-sm"></div>',
    );
  });

  it("formats multiple attributes independently", () => {
    // <b> is already correct (both spacing, source order preserved under fallback).
    expect(
      formatHtml('<a class="text-sm flex"></a><b class="p-4 m-2"></b>'),
    ).toBe('<a class="flex text-sm"></a><b class="p-4 m-2"></b>');
  });

  it("is idempotent", () => {
    const src = '<div class="text-sm flex p-4"></div>';
    expect(formatHtml(formatHtml(src))).toBe(formatHtml(src));
  });
});
