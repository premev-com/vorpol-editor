import { useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  scrollFraction: number;
  onScrollFraction: (fraction: number) => void;
}

export function Editor({
  value,
  onChange,
  onSave,
  fontSize,
  tabSize,
  wordWrap,
  scrollFraction,
  onScrollFraction,
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const lineHeight = fontSize * 1.625;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }

      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const spaces = " ".repeat(tabSize);
        const newValue =
          value.substring(0, start) + spaces + value.substring(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd =
            start + spaces.length;
        });
      }
    },
    [value, onChange, onSave, tabSize],
  );

  const handleScroll = useCallback(() => {
    if (!textareaRef.current) return;
    // Sync line numbers
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
    // Emit scroll fraction (unless this was a programmatic sync)
    if (!syncingRef.current) {
      const el = textareaRef.current;
      const max = el.scrollHeight - el.clientHeight;
      if (max > 0) onScrollFraction(el.scrollTop / max);
    }
  }, [onScrollFraction]);

  // Sync scroll from other pane
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return;
    syncingRef.current = true;
    el.scrollTop = scrollFraction * max;
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = el.scrollTop;
    }
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, [scrollFraction]);

  const lineCount = value.split("\n").length;

  return (
    <div className="flex h-full bg-card">
      <div
        ref={lineNumbersRef}
        className="flex-shrink-0 w-12 overflow-hidden select-none pt-4 pb-4 bg-card border-r border-border"
        aria-hidden="true"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i}
            className="text-right pr-3 font-mono text-muted-foreground/50"
            style={{
              fontSize: `${fontSize * 0.75}px`,
              height: `${lineHeight}px`,
              lineHeight: `${lineHeight}px`,
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        spellCheck={false}
        className={cn(
          "flex-1 bg-transparent text-foreground font-mono resize-none outline-none border-none p-4 overflow-auto placeholder:text-muted-foreground/30",
          wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
        )}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: `${lineHeight}px`,
        }}
        placeholder="..."
      />
    </div>
  );
}
