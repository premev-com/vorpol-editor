import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { rust } from "@codemirror/lang-rust";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { sql } from "@codemirror/lang-sql";
import { yaml } from "@codemirror/lang-yaml";
import { xml } from "@codemirror/lang-xml";

export const editorHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#d4a574" },
  { tag: tags.controlKeyword, color: "#d4a574" },
  { tag: tags.function(tags.variableName), color: "#d4a574" },
  { tag: tags.typeName, color: "#d4a574" },
  { tag: tags.className, color: "#d4a574" },
  { tag: tags.string, color: "#9bbf8f" },
  { tag: tags.number, color: "#d4a574" },
  { tag: tags.bool, color: "#d4a574" },
  { tag: tags.regexp, color: "#9bbf8f" },
  { tag: tags.comment, color: "#6a6a6a", fontStyle: "italic" },
  { tag: tags.lineComment, color: "#6a6a6a", fontStyle: "italic" },
  { tag: tags.blockComment, color: "#6a6a6a", fontStyle: "italic" },
  { tag: tags.variableName, color: "#c8c8c8" },
  { tag: tags.propertyName, color: "#d4887a" },
  { tag: tags.operator, color: "#999999" },
  { tag: tags.heading, color: "#c8c8c8", fontWeight: "bold" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.labelName, color: "#d4a574" },
  { tag: tags.url, color: "#999999" },
  { tag: tags.tagName, color: "#d4887a" },
  { tag: tags.attributeName, color: "#c8c8c8" },
  { tag: tags.attributeValue, color: "#9bbf8f" },
  { tag: tags.meta, color: "#7a7a7a" },
]);

const langByExt: Record<string, () => ReturnType<typeof javascript>> = {
  js: javascript,
  jsx: () => javascript({ jsx: true }),
  mjs: javascript,
  cjs: javascript,
  ts: () => javascript({ typescript: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  py: python,
  pyw: python,
  rs: rust,
  go,
  java,
  c: cpp,
  cpp,
  h: cpp,
  hpp: cpp,
  sql,
  html: html,
  htm: html,
  css,
  scss: css,
  less: css,
  json,
  jsonc: json,
  xml,
  yaml,
  yml: yaml,
};

export function getLanguage(fileName: string) {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  return langByExt[ext]?.() ?? undefined;
}
