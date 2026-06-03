import { useState, useRef, useCallback, useEffect } from "react";
import { marked } from "marked";

interface LiveEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  fontSize: number;
}

export function LiveEditor({
  value,
  onChange,
  onSave,
  fontSize,
}: LiveEditorProps) {
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const lineRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const lines = value.split("\n");

  // Commit edit for a line
  const commitLine = useCallback(
    (index: number, newText: string) => {
      const next = [...lines];
      next[index] = newText;
      onChange(next.join("\n"));
      setEditingLine(null);
    },
    [lines, onChange],
  );

  // Focus the textarea when editing starts
  useEffect(() => {
    if (editingLine !== null) {
      const el = lineRefs.current.get(editingLine);
      if (el) {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }
  }, [editingLine]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave]);

  // Scroll sync support (receive)
  const scrollFractionRef = useRef(0);

  const handleContainerScroll = useCallback(() => {
    // scrolling handled naturally; emit not needed for live editor
  }, []);

  if (!value.trim()) {
    return (
      <div className="flex items-center justify-center h-full bg-card">
        <p className="text-sm text-muted-foreground/50 font-sans">
          Start writing Markdown...
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleContainerScroll}
      className="h-full overflow-auto bg-card"
    >
      <div
        className="max-w-3xl mx-auto py-8 px-8 font-serif"
        style={{ fontSize: `${fontSize}px`, lineHeight: "1.75" }}
      >
        {lines.map((raw, i) => {
          if (i === editingLine) {
            return (
              <textarea
                key={i}
                ref={(el) => {
                  if (el) lineRefs.current.set(i, el);
                  else lineRefs.current.delete(i);
                }}
                defaultValue={raw}
                onBlur={(e) => commitLine(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    commitLine(i, e.currentTarget.value);
                  }
                  if (e.key === "Escape") {
                    setEditingLine(null);
                  }
                }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = `${t.scrollHeight}px`;
                }}
                rows={1}
                className="w-full bg-transparent border-0 border-b border-primary/40 p-0 font-mono text-foreground outline-none resize-none overflow-hidden"
                style={{ fontSize: `${fontSize * 0.9}px`, lineHeight: "1.75" }}
              />
            );
          }

          const isHeading = /^#{1,6}\s/.test(raw);
          const isList = /^[\s]*[-*+]\s/.test(raw);
          const isOrderedList = /^[\s]*\d+\.\s/.test(raw);
          const isBlockquote = /^>\s?/.test(raw);
          const isCodeFence = /^```/.test(raw);
          const isHr = /^[-*_]{3,}$/.test(raw);
          const isEmpty = raw.trim() === "";

          if (isEmpty) {
            return (
              <div
                key={i}
                onClick={() => setEditingLine(i)}
                className="h-5 cursor-text rounded-sm hover:bg-accent/30 transition-colors"
              />
            );
          }

          if (isCodeFence) {
            return (
              <div
                key={i}
                onClick={() => setEditingLine(i)}
                className="font-mono text-xs text-muted-foreground py-0.5 cursor-text rounded-sm hover:bg-accent/30 transition-colors"
                style={{ fontSize: `${fontSize * 0.85}px` }}
              >
                {raw}
              </div>
            );
          }

          if (isHr) {
            return (
              <div
                key={i}
                onClick={() => setEditingLine(i)}
                className="cursor-text rounded-sm hover:bg-accent/30 transition-colors"
              >
                <hr className="my-4 border-border" />
              </div>
            );
          }

          if (isHeading) {
            const level = raw.match(/^(#{1,6})/)?.[1].length ?? 1;
            const text = raw.replace(/^#{1,6}\s*/, "");
            const sizes: Record<number, string> = {
              1: "1.875rem",
              2: "1.5rem",
              3: "1.25rem",
              4: "1.125rem",
            };
            const weights: Record<number, string> = {
              1: "700",
              2: "600",
              3: "600",
              4: "500",
            };
            return (
              <div
                key={i}
                onClick={() => setEditingLine(i)}
                className="cursor-text rounded-sm hover:bg-accent/30 transition-colors py-0.5"
                style={{
                  fontSize: sizes[level] ?? "1rem",
                  fontWeight: weights[level] ?? "500",
                }}
              >
                {renderInline(text)}
              </div>
            );
          }

          if (isBlockquote) {
            const text = raw.replace(/^>\s?/, "");
            return (
              <div
                key={i}
                onClick={() => setEditingLine(i)}
                className="border-l-2 border-primary pl-3 italic text-muted-foreground cursor-text rounded-sm hover:bg-accent/30 transition-colors py-0.5"
              >
                {renderInline(text)}
              </div>
            );
          }

          if (isOrderedList) {
            const indent = raw.match(/^(\s*)/)?.[1].length ?? 0;
            const text = raw.replace(/^[\s]*\d+\.\s*/, "");
            return (
              <div
                key={i}
                onClick={() => setEditingLine(i)}
                className="cursor-text rounded-sm hover:bg-accent/30 transition-colors py-0.5"
                style={{ paddingLeft: `${indent + 1.5}em` }}
              >
                <span className="inline-block w-5 text-muted-foreground">
                  {raw.match(/^[\s]*(\d+)\./)?.[1]}.
                </span>{" "}
                {renderInline(text)}
              </div>
            );
          }

          if (isList) {
            const indent = raw.match(/^(\s*)/)?.[1].length ?? 0;
            const text = raw.replace(/^[\s]*[-*+]\s*/, "");
            return (
              <div
                key={i}
                onClick={() => setEditingLine(i)}
                className="cursor-text rounded-sm hover:bg-accent/30 transition-colors py-0.5"
                style={{ paddingLeft: `${indent + 1.5}em` }}
              >
                <span className="inline-block w-3 text-muted-foreground">
                  •
                </span>{" "}
                {renderInline(text)}
              </div>
            );
          }

          return (
            <div
              key={i}
              onClick={() => setEditingLine(i)}
              className="cursor-text rounded-sm hover:bg-accent/30 transition-colors py-0.5"
            >
              {renderInline(raw)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Render inline markdown (bold, italic, code, links, images) as HTML. */
function renderInline(text: string): React.ReactNode {
  if (!text) return <br />;
  try {
    const html = marked.parseInline(text, { async: false }) as string;
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return text;
  }
}
