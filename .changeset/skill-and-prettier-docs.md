---
"eslint-plugin-tailwind-classify": patch
---

Docs: ship a complete AI-agent skill and explain the ESLint-vs-Prettier choice.

- `skill/SKILL.md` (published with the package) is filled out from the shipped
  behavior: the algorithm, a category → prefix cheat-sheet, wrapping rules, and
  before/after examples verified against the formatter (previously a stub).
- README adds a "Why an ESLint rule, and not a Prettier plugin?" section
  (Prettier collapses class-attribute whitespace and can't lay it out across
  lines).
