/**
 * ESLint rule: group a JSX `className` string literal by semantic category and
 * wrap it onto multiple lines when it doesn't fit on one.
 *
 * Stage 1 scope: only `className` with a plain string literal value. Dynamic
 * values (`className={...}`), template literals, and helper calls (clsx, cva)
 * arrive in later stages. The cascade-safety invariant holds: the value is only
 * regrouped/wrapped and exact-deduplicated — never merged or otherwise altered.
 *
 * The grouping/wrapping logic lives in the shared formatClassValue (format.ts);
 * this rule only adapts the JSX AST to it. printWidth / indent default inside
 * the formatter and become rule options in Stage 3.
 */

import type { Rule } from "eslint";
import { formatClassValue } from "../format.js";

/** The slice of the JSX AST this rule reads. estree types don't model JSX. */
interface JSXAttr {
  name: { type: string; name?: string };
  value:
    | (Rule.Node & { type: string; value?: unknown; raw?: string })
    | null;
  loc: { start: { line: number; column: number } };
}

const rule: Rule.RuleModule = {
  meta: {
    type: "layout",
    docs: {
      description:
        "Group Tailwind classes in a JSX className by category and wrap onto multiple lines",
      recommended: false,
    },
    fixable: "whitespace",
    schema: [],
    messages: {
      regroup:
        "Tailwind classes should be grouped by category{{ wrapped }} for readability.",
    },
  },

  create(context): Rule.RuleListener {
    const sourceCode = context.sourceCode;

    return {
      JSXAttribute(node: Rule.Node) {
        const attr = node as unknown as JSXAttr;

        if (attr.name.type !== "JSXIdentifier" || attr.name.name !== "className") {
          return;
        }
        const value = attr.value;
        if (
          !value ||
          value.type !== "Literal" ||
          typeof value.value !== "string" ||
          !value.raw
        ) {
          return; // skip {expressions}, template literals, boolean attrs, etc.
        }
        const currentInner = value.raw.slice(1, -1);

        const lineText = sourceCode.lines[attr.loc.start.line - 1] ?? "";
        const baseIndent = /^\s*/.exec(lineText)?.[0] ?? "";
        // column of the attribute + `className="` (the `=` and opening quote)
        const valueColumn =
          attr.loc.start.column + "className".length + 2;

        const desiredInner = formatClassValue(currentInner, {
          baseIndent,
          valueColumn,
        });
        if (desiredInner === null || desiredInner === currentInner) return;

        const quote = value.raw[0] ?? '"';
        const wrapped = desiredInner.includes("\n")
          ? " and wrapped onto multiple lines"
          : "";

        context.report({
          node: value,
          messageId: "regroup",
          data: { wrapped },
          fix: (fixer) => fixer.replaceText(value, `${quote}${desiredInner}${quote}`),
        });
      },
    };
  },
};

export default rule;
