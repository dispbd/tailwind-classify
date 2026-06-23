/**
 * ESLint rule: group Tailwind class lists by semantic category and wrap them
 * onto multiple lines when they don't fit.
 *
 * Handled contexts:
 * - JSX `className` — string literal or a no-substitution template literal;
 * - class helper calls — clsx / classnames / cn / cx / cva / ctl / twMerge /
 *   twJoin / tw — string and array/object/conditional class arguments;
 * - tagged templates — tw`…` (no substitutions);
 * - Svelte `class="…"` markup (with svelte-eslint-parser);
 * - Vue `class="…"` template attributes (with vue-eslint-parser);
 * - Astro `class="…"` (with astro-eslint-parser; emitted as JSXAttribute) — and
 *   `class` in JSX dialects that use it (Preact, Solid).
 *
 * Newline safety: ordinary JS string literals cannot contain raw newlines, so
 * inside helper calls they are only regrouped on a single line (never wrapped).
 * JSX attribute strings and template literals may wrap.
 *
 * The grouping/wrapping logic lives in the shared formatClassValue (format.ts);
 * this rule only adapts the AST to it and reads its options.
 */

import type { Rule } from "eslint";
import { formatClassValue, type FormatOptions } from "../format.js";
import { CATEGORY_ORDER } from "../categories.js";
import { loadClassOrder } from "../tailwind/load.js";

/** Function names whose class-string arguments are formatted. */
const DEFAULT_CALLEES = [
  "clsx", "classnames", "cn", "cx", "cva", "ctl", "twMerge", "twJoin", "tw",
];
/** Tagged-template names whose quasi is formatted. */
const DEFAULT_TAGS = ["tw"];

// estree types don't model JSX; the AST is walked loosely.
type AnyNode = any;

interface RuleOptions extends FormatOptions {
  /** Function names to treat as class helpers. */
  callees?: string[];
  /** Tagged-template names to format. */
  tags?: string[];
  /** Path to a Tailwind v3 config (for getClassOrder). */
  tailwindConfig?: string;
  /** Path to a Tailwind v4 CSS entry point. */
  entryPoint?: string;
}

const leadingIndent = (lineText: string) => /^\s*/.exec(lineText)?.[0] ?? "";

const rule: Rule.RuleModule = {
  meta: {
    type: "layout",
    docs: {
      description:
        "Group Tailwind classes by category and wrap onto multiple lines",
      recommended: false,
    },
    fixable: "whitespace",
    schema: [
      {
        type: "object",
        properties: {
          group: {
            enum: ["category", "variant", "category-variant"],
          },
          categoryOrder: {
            type: "array",
            items: { enum: [...CATEGORY_ORDER] },
            uniqueItems: true,
          },
          printWidth: { type: "integer", minimum: 0 },
          maxClassesPerLine: { type: "integer", minimum: 1 },
          indentStep: { type: "string" },
          quotesOnNewLine: { type: "boolean" },
          preserveUnknownClasses: { type: "boolean" },
          callees: { type: "array", items: { type: "string" }, uniqueItems: true },
          tags: { type: "array", items: { type: "string" }, uniqueItems: true },
          tailwindConfig: { type: "string" },
          entryPoint: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      regroup:
        "Tailwind classes should be grouped by category{{ wrapped }} for readability.",
    },
  },

  create(context): Rule.RuleListener {
    // `context.sourceCode` was added in ESLint 8.40.0; fall back to the older
    // `getSourceCode()` method so the rule still works on ESLint 8.0-8.39, per
    // the declared peerDependency (">=8.0.0"). @types/eslint no longer declares
    // getSourceCode on RuleContext, so reach it through a cast.
    const sourceCode =
      context.sourceCode ??
      (
        context as { getSourceCode(): typeof context.sourceCode }
      ).getSourceCode();

    const { callees, tags, tailwindConfig, entryPoint, ...formatOptions } =
      (context.options[0] ?? {}) as RuleOptions;
    const calleeSet = new Set(callees ?? DEFAULT_CALLEES);
    const tagSet = new Set(tags ?? DEFAULT_TAGS);

    // Real Tailwind ordering if a config/entry point resolves; else fallback.
    formatOptions.getClassOrder = loadClassOrder({
      tailwindConfig,
      entryPoint,
      cwd: context.cwd,
    });

    const indentAt = (line: number) =>
      leadingIndent(sourceCode.lines[line - 1] ?? "");

    /** Format a quoted string-literal node in place. */
    function checkString(node: AnyNode, extra?: FormatOptions): void {
      const raw: string | undefined = node.raw;
      if (!raw || raw.length < 2) return;
      const inner = raw.slice(1, -1);
      const desired = formatClassValue(
        inner,
        { baseIndent: indentAt(node.loc.start.line), valueColumn: node.loc.start.column + 1 },
        { ...formatOptions, ...extra },
      );
      if (desired === null || desired === inner) return;
      const quote = raw[0] ?? '"';
      report(node, desired, (fixer) =>
        fixer.replaceText(node, `${quote}${desired}${quote}`),
      );
    }

    /** Format a no-substitution template literal in place. */
    function checkTemplate(node: AnyNode): void {
      if (node.expressions.length > 0 || node.quasis.length !== 1) return;
      const inner: string = node.quasis[0].value.raw;
      const desired = formatClassValue(
        inner,
        { baseIndent: indentAt(node.loc.start.line), valueColumn: node.loc.start.column + 1 },
        formatOptions,
      );
      if (desired === null || desired === inner) return;
      report(node, desired, (fixer) => fixer.replaceText(node, `\`${desired}\``));
    }

    /**
     * Format a markup attribute value (Svelte/Vue/Astro). Only the inner text
     * range is replaced, so the quotes stay put. Parsers differ in whether the
     * value node's range includes the quotes, so the caller passes the explicit
     * inner range and the column where the content begins. Markup values may
     * wrap.
     */
    function checkMarkupValue(
      reportNode: AnyNode,
      text: string,
      innerStart: number,
      innerEnd: number,
      line: number,
      column: number,
    ): void {
      const desired = formatClassValue(
        text,
        { baseIndent: indentAt(line), valueColumn: column },
        formatOptions,
      );
      if (desired === null || desired === text) return;
      report(reportNode, desired, (fixer) =>
        fixer.replaceTextRange([innerStart, innerEnd], desired),
      );
    }

    function report(
      node: AnyNode,
      desired: string,
      fix: Rule.ReportFixer,
    ): void {
      context.report({
        node,
        messageId: "regroup",
        data: { wrapped: desired.includes("\n") ? " and wrapped onto multiple lines" : "" },
        fix,
      });
    }

    const isClassString = (n: AnyNode) =>
      (n.type === "Literal" && typeof n.value === "string") ||
      (n.type === "TemplateLiteral" && n.expressions.length === 0);

    /**
     * Collect class-string nodes from helper arguments. `objectKeysAreClasses`
     * distinguishes clsx-style objects (`{ "class": cond }` — classes are the
     * keys) from cva-style objects (`{ variants: { … } }` — classes are nested
     * values). Nested calls / tagged templates are visited on their own.
     */
    function collect(
      node: AnyNode,
      objectKeysAreClasses: boolean,
      out: AnyNode[],
    ): void {
      if (!node) return;
      if (isClassString(node)) {
        out.push(node);
        return;
      }
      switch (node.type) {
        case "ArrayExpression":
          for (const el of node.elements) collect(el, objectKeysAreClasses, out);
          break;
        case "ObjectExpression":
          for (const prop of node.properties) {
            if (prop.type !== "Property") continue;
            if (objectKeysAreClasses) {
              if (isClassString(prop.key)) out.push(prop.key);
            } else {
              collect(prop.value, objectKeysAreClasses, out);
            }
          }
          break;
        case "ConditionalExpression":
          collect(node.consequent, objectKeysAreClasses, out);
          collect(node.alternate, objectKeysAreClasses, out);
          break;
        case "LogicalExpression":
          collect(node.left, objectKeysAreClasses, out);
          collect(node.right, objectKeysAreClasses, out);
          break;
      }
    }

    const listeners: Rule.RuleListener = {
      // `className` (React/JSX) and `class` (Astro, Preact, Solid). Astro emits
      // ordinary JSXAttribute nodes, so this also covers Astro markup.
      JSXAttribute(node: Rule.Node) {
        const attr = node as AnyNode;
        const name =
          attr.name?.type === "JSXIdentifier" ? attr.name.name : undefined;
        if (name !== "className" && name !== "class") return;

        const value = attr.value;
        if (!value) return;
        if (value.type === "Literal" && typeof value.value === "string") {
          if (name === "className" && value.raw) {
            checkString(value); // JSX string literal (raw incl. quotes)
          } else {
            // `class` value: range includes the quotes; replace inner only.
            const [start, end] = value.range;
            checkMarkupValue(
              value,
              value.value,
              start + 1,
              end - 1,
              value.loc.start.line,
              value.loc.start.column + 1,
            );
          }
        } else if (
          value.type === "JSXExpressionContainer" &&
          value.expression?.type === "TemplateLiteral"
        ) {
          checkTemplate(value.expression);
        }
      },

      CallExpression(node: Rule.Node) {
        const call = node as AnyNode;
        if (
          call.callee?.type !== "Identifier" ||
          !calleeSet.has(call.callee.name)
        ) {
          return;
        }
        // cva nests class strings in object values; clsx-style objects key on them.
        const objectKeysAreClasses = call.callee.name !== "cva";
        const nodes: AnyNode[] = [];
        for (const arg of call.arguments) collect(arg, objectKeysAreClasses, nodes);
        for (const n of nodes) {
          if (n.type === "TemplateLiteral") checkTemplate(n);
          else checkString(n, { allowMultiline: false }); // JS strings can't wrap
        }
      },

      TaggedTemplateExpression(node: Rule.Node) {
        const tagged = node as AnyNode;
        if (tagged.tag?.type === "Identifier" && tagSet.has(tagged.tag.name)) {
          checkTemplate(tagged.quasi);
        }
      },

      // Svelte markup: <div class="...">. Static value is a single
      // SvelteLiteral; dynamic (class={...}) or directive (class:foo) forms have
      // no SvelteLiteral and are skipped.
      SvelteAttribute(node: Rule.Node) {
        const attr = node as AnyNode;
        if (attr.key?.name !== "class") return;
        const parts = attr.value;
        if (!Array.isArray(parts) || parts.length !== 1) return;
        const literal = parts[0];
        if (literal?.type !== "SvelteLiteral") return;
        // SvelteLiteral.range is the inner text (no quotes).
        const [start, end] = literal.range;
        checkMarkupValue(
          literal,
          literal.value,
          start,
          end,
          literal.loc.start.line,
          literal.loc.start.column,
        );
      },
    };

    // Vue: the template AST is only reachable via parserServices, not ordinary
    // listeners. When present, register a VAttribute visitor for the template
    // and run the JS listeners over <script>.
    const services = (sourceCode as AnyNode).parserServices;
    if (services && typeof services.defineTemplateBodyVisitor === "function") {
      return services.defineTemplateBodyVisitor(
        {
          // Static class="..."; :class / v-bind:class are directives → skipped.
          VAttribute(node: AnyNode) {
            if (node.directive || node.key?.name !== "class") return;
            const value = node.value;
            if (!value || value.type !== "VLiteral") return;
            // VLiteral.range includes the quotes.
            const [start, end] = value.range;
            checkMarkupValue(
              value,
              value.value,
              start + 1,
              end - 1,
              value.loc.start.line,
              value.loc.start.column + 1,
            );
          },
        },
        listeners,
      ) as Rule.RuleListener;
    }

    return listeners;
  },
};

export default rule;
