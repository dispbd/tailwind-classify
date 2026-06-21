import { describe, expect, it } from "vitest";
import { parseClass, parseClassList, type ParsedClass } from "./parse.js";

/** Build an expected ParsedClass with sensible defaults to keep cases terse. */
function expected(raw: string, over: Partial<ParsedClass> = {}): ParsedClass {
  return {
    raw,
    variants: [],
    base: raw,
    negative: false,
    important: false,
    importantPosition: null,
    opacity: null,
    ...over,
  };
}

describe("parseClass — plain utilities", () => {
  it("parses a bare utility", () => {
    expect(parseClass("flex")).toEqual(expected("flex"));
  });

  it("parses a multi-segment utility", () => {
    expect(parseClass("bg-red-500")).toEqual(expected("bg-red-500"));
  });
});

describe("parseClass — variants", () => {
  it("parses a single variant", () => {
    expect(parseClass("hover:bg-red-500")).toEqual(
      expected("hover:bg-red-500", { variants: ["hover"], base: "bg-red-500" }),
    );
  });

  it("parses stacked variants in source order", () => {
    expect(parseClass("dark:sm:hover:px-4")).toEqual(
      expected("dark:sm:hover:px-4", {
        variants: ["dark", "sm", "hover"],
        base: "px-4",
      }),
    );
  });

  it("parses group/peer variants", () => {
    expect(parseClass("group-hover:opacity-100").variants).toEqual(["group-hover"]);
    expect(parseClass("peer-checked:block").variants).toEqual(["peer-checked"]);
  });

  it("treats an arbitrary selector variant as one variant", () => {
    expect(parseClass("[&>svg]:size-4")).toEqual(
      expected("[&>svg]:size-4", { variants: ["[&>svg]"], base: "size-4" }),
    );
  });

  it("does not split on `:` inside an arbitrary variant", () => {
    expect(parseClass("data-[state=open]:bg-black")).toEqual(
      expected("data-[state=open]:bg-black", {
        variants: ["data-[state=open]"],
        base: "bg-black",
      }),
    );
    expect(parseClass("supports-[display:grid]:grid")).toEqual(
      expected("supports-[display:grid]:grid", {
        variants: ["supports-[display:grid]"],
        base: "grid",
      }),
    );
  });
});

describe("parseClass — important", () => {
  it("parses leading `!` (v3)", () => {
    expect(parseClass("!font-bold")).toEqual(
      expected("!font-bold", { base: "font-bold", important: true, importantPosition: "pre" }),
    );
  });

  it("parses trailing `!` (v4)", () => {
    expect(parseClass("font-bold!")).toEqual(
      expected("font-bold!", { base: "font-bold", important: true, importantPosition: "post" }),
    );
  });

  it("parses important after variants", () => {
    expect(parseClass("hover:!font-bold")).toEqual(
      expected("hover:!font-bold", {
        variants: ["hover"],
        base: "font-bold",
        important: true,
        importantPosition: "pre",
      }),
    );
  });
});

describe("parseClass — opacity modifier", () => {
  it("parses a numeric opacity", () => {
    expect(parseClass("bg-black/50")).toEqual(
      expected("bg-black/50", { base: "bg-black", opacity: "50" }),
    );
  });

  it("parses an arbitrary opacity", () => {
    expect(parseClass("text-black/[0.5]")).toEqual(
      expected("text-black/[0.5]", { base: "text-black", opacity: "[0.5]" }),
    );
  });

  it("does not treat a slash inside brackets as an opacity modifier", () => {
    expect(parseClass("bg-[url(https://x.com/y)]")).toEqual(
      expected("bg-[url(https://x.com/y)]", { base: "bg-[url(https://x.com/y)]" }),
    );
  });

  it("captures value fractions in the opacity slot (documented behavior)", () => {
    // `w-1/2` is a width fraction, not opacity, but it shares the same shape.
    // Harmless: re-emit uses `raw`, and category lookup keys off the prefix.
    expect(parseClass("w-1/2")).toEqual(
      expected("w-1/2", { base: "w-1", opacity: "2" }),
    );
  });
});

describe("parseClass — negative", () => {
  it("parses a negative utility", () => {
    expect(parseClass("-mt-4")).toEqual(
      expected("-mt-4", { base: "mt-4", negative: true }),
    );
  });

  it("parses a negative arbitrary value", () => {
    expect(parseClass("-top-[5px]")).toEqual(
      expected("-top-[5px]", { base: "top-[5px]", negative: true }),
    );
  });
});

describe("parseClass — arbitrary properties", () => {
  it("keeps an arbitrary property whole", () => {
    expect(parseClass("[mask:url(#x)]")).toEqual(expected("[mask:url(#x)]"));
  });
});

describe("parseClass — combined components", () => {
  it("parses variants + important + opacity together", () => {
    expect(parseClass("dark:hover:bg-black/75!")).toEqual(
      expected("dark:hover:bg-black/75!", {
        variants: ["dark", "hover"],
        base: "bg-black",
        opacity: "75",
        important: true,
        importantPosition: "post",
      }),
    );
  });

  it("parses leading important + negative", () => {
    expect(parseClass("!-mt-4")).toEqual(
      expected("!-mt-4", {
        base: "mt-4",
        negative: true,
        important: true,
        importantPosition: "pre",
      }),
    );
  });

  it("parses arbitrary variant + opacity", () => {
    expect(parseClass("data-[state=open]:bg-black/50")).toEqual(
      expected("data-[state=open]:bg-black/50", {
        variants: ["data-[state=open]"],
        base: "bg-black",
        opacity: "50",
      }),
    );
  });
});

describe("parseClass — lossless raw", () => {
  it("always preserves the original token verbatim", () => {
    for (const token of [
      "flex",
      "dark:hover:bg-black/75!",
      "!-mt-4",
      "[mask:url(#x)]",
      "supports-[display:grid]:grid",
    ]) {
      expect(parseClass(token).raw).toBe(token);
    }
  });
});

describe("parseClassList", () => {
  it("parses each token preserving order", () => {
    const result = parseClassList("flex hover:px-4 -mt-2");
    expect(result.map((c) => c.base)).toEqual(["flex", "px-4", "mt-2"]);
    expect(result[1]!.variants).toEqual(["hover"]);
    expect(result[2]!.negative).toBe(true);
  });

  it("drops empty tokens from collapsed / surrounding whitespace", () => {
    expect(parseClassList("  flex   gap-2  \n  p-4 ").map((c) => c.base)).toEqual([
      "flex",
      "gap-2",
      "p-4",
    ]);
  });

  it("returns an empty array for a blank string", () => {
    expect(parseClassList("   ")).toEqual([]);
  });
});
