import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
  indentOnInput,
} from "@codemirror/language";
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
import { closeBrackets } from "@codemirror/autocomplete";

// Subtle accented syntax — muted red, green, yellow, white
const monoHighlight = HighlightStyle.define([
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

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  fileName: string;
}

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

function getLanguage(fileName: string) {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  return langByExt[ext]?.() ?? undefined;
}

export function CodeEditor({ value, onChange, fileName }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const lang = getLanguage(fileName);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        bracketMatching(),
        closeBrackets(),
        indentOnInput(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        syntaxHighlighting(monoHighlight),
        updateListener,
        ...(lang ? [lang] : []),
        EditorView.theme(
          {
            "&": { height: "100%", backgroundColor: "#262626" },
            ".cm-scroller": { overflow: "auto" },
            ".cm-gutters": {
              backgroundColor: "#262626",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              color: "#555",
            },
            ".cm-activeLineGutter": { backgroundColor: "#1e1e1e" },
            ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.03)" },
            ".cm-cursor": { borderLeftColor: "#acb2be" },
            ".cm-selectionBackground": {
              backgroundColor: "rgba(255,255,255,0.12)",
            },
          },
          { dark: true },
        ),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    return () => view.destroy();
  }, [fileName]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="h-full" />;
}
