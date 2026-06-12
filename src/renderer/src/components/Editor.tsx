import { useEffect, useRef } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  syntaxHighlighting,
  bracketMatching,
  indentOnInput,
} from "@codemirror/language";
import { closeBrackets } from "@codemirror/autocomplete";
import { editorHighlight, getLanguage } from "@/lib/editor-languages";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: (content: string) => void;
  fileName: string;
  wordWrap: boolean;
  fontSize: number;
  /** Position range to select and scroll to (for search navigation) */
  selection?: { from: number; to: number } | null;
  /** Called with scroll fraction [0-1] when the editor is scrolled */
  onScrollFraction?: (fraction: number) => void;
}

export function Editor({
  value,
  onChange,
  onSave,
  fileName,
  wordWrap,
  fontSize,
  selection,
  onScrollFraction,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const internalChangeRef = useRef(false);
  const externalValueRef = useRef(value);
  const onScrollFractionRef = useRef(onScrollFraction);
  onScrollFractionRef.current = onScrollFraction;
  const wordWrapCompartment = useRef(new Compartment());
  const fontSizeCompartment = useRef(new Compartment());

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        internalChangeRef.current = true;
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
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          {
            key: "Mod-s",
            run: (editorView) => {
              onSaveRef.current(editorView.state.doc.toString());
              return true;
            },
          },
        ]),
        syntaxHighlighting(editorHighlight),
        updateListener,
        wordWrapCompartment.current.of(wordWrap ? EditorView.lineWrapping : []),
        fontSizeCompartment.current.of(
          EditorView.theme({ "&": { fontSize: `${fontSize}px` } }),
        ),
        ...(getLanguage(fileName) ? [getLanguage(fileName)!] : []),
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
    externalValueRef.current = value;

    // Sync scroll: emit scroll fraction from the editor's scroller
    const scroller = view.scrollDOM;
    const onScroll = () => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      if (max > 0) onScrollFractionRef.current?.(scroller.scrollTop / max);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", onScroll);
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileName]);

  // Toggle word wrap dynamically without recreating the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: wordWrapCompartment.current.reconfigure(
        wordWrap ? EditorView.lineWrapping : [],
      ),
    });
  }, [wordWrap]);

  // Update font size dynamically
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: fontSizeCompartment.current.reconfigure(
        EditorView.theme({ "&": { fontSize: `${fontSize}px` } }),
      ),
    });
  }, [fontSize]);

  useEffect(() => {
    if (internalChangeRef.current) {
      internalChangeRef.current = false;
      return;
    }
    const view = viewRef.current;
    if (!view) return;
    if (value !== externalValueRef.current) {
      externalValueRef.current = value;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
      internalChangeRef.current = false;
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !selection) return;
    view.dispatch({
      selection: { anchor: selection.from, head: selection.to },
      effects: EditorView.scrollIntoView(selection.from, { y: "center" }),
    });
  }, [selection]);

  return <div ref={containerRef} className="h-full" />;
}
