import { useState, useRef, useCallback, useEffect, useMemo, memo } from "react";
import { marked } from "marked";

// -- Constants -----------------------------------------------------------

const OVERSCAN = 30;
const SYNC_DEBOUNCE_MS = 300;
const INLINE_CACHE_MAX = 5000;

// Hoisted regexes; compiled once, not per-render
const RE_CODE_FENCE = /^```/;
const RE_HR = /^[-*_]{3,}$/;
const RE_HEADING = /^(#{1,6})\s/;
const RE_BLOCKQUOTE = /^>\s?/;
const RE_ORDERED_LIST = /^(\s*)(\d+)\.\s/;
const RE_UNORDERED_LIST = /^\s*[-*+]\s/;
const RE_LEADING_WS = /^(\s*)/;

const HEADING_SIZES: Record<number, string> = {
  1: "1.875rem",
  2: "1.5rem",
  3: "1.25rem",
  4: "1.125rem",
};
const HEADING_WEIGHTS: Record<number, string> = {
  1: "700",
  2: "600",
  3: "600",
  4: "500",
};

// -- Line type classifier ------------------------------------------------

type LineKind =
  | "empty"
  | "codeFence"
  | "hr"
  | "heading"
  | "blockquote"
  | "orderedList"
  | "unorderedList"
  | "paragraph";

interface ClassifiedLine {
  kind: LineKind;
  text: string; // the content portion (e.g. heading without `# ` prefix)
  meta?: { level?: number; indent?: number; number?: string };
}

function classifyLine(raw: string): ClassifiedLine {
  if (raw.trim() === "") return { kind: "empty", text: raw };

  if (RE_CODE_FENCE.test(raw)) return { kind: "codeFence", text: raw };
  if (RE_HR.test(raw)) return { kind: "hr", text: raw };

  const heading = RE_HEADING.exec(raw);
  if (heading) {
    return {
      kind: "heading",
      text: raw.replace(/^#{1,6}\s*/, ""),
      meta: { level: heading[1]!.length },
    };
  }

  if (RE_BLOCKQUOTE.test(raw)) {
    return { kind: "blockquote", text: raw.replace(/^>\s?/, "") };
  }

  const ordered = RE_ORDERED_LIST.exec(raw);
  if (ordered) {
    return {
      kind: "orderedList",
      text: raw.replace(/^\s*\d+\.\s*/, ""),
      meta: { indent: ordered[1]!.length, number: ordered[2] },
    };
  }

  if (RE_UNORDERED_LIST.test(raw)) {
    const ws = RE_LEADING_WS.exec(raw);
    return {
      kind: "unorderedList",
      text: raw.replace(/^\s*[-*+]\s*/, ""),
      meta: { indent: ws?.[1]?.length ?? 0 },
    };
  }

  return { kind: "paragraph", text: raw };
}

// -- Inline markdown renderer (module-level LRU cache) -------------------

const inlineCache = new Map<string, string>();

function renderInline(text: string): string {
  if (!text) return "";
  let html = inlineCache.get(text);
  if (html === undefined) {
    try {
      html = marked.parseInline(text, { async: false }) as string;
    } catch {
      html = text;
    }
    if (inlineCache.size >= INLINE_CACHE_MAX) inlineCache.clear();
    inlineCache.set(text, html);
  }
  return html;
}

function InlineHtml({ text }: { text: string }) {
  if (!text) return <br />;
  return <span dangerouslySetInnerHTML={{ __html: renderInline(text) }} />;
}

// -- Line sub-components -------------------------------------------------

const clickableLine =
  "cursor-text rounded-sm hover:bg-accent/30 transition-colors py-0.5";

function EditingTextarea({
  index,
  raw,
  lineRefs,
  commitLine,
  setEditingLine,
  fontSize,
  lineHeight,
}: {
  index: number;
  raw: string;
  lineRefs: React.MutableRefObject<Map<number, HTMLTextAreaElement>>;
  commitLine: (index: number, newText: string) => void;
  setEditingLine: (index: number | null) => void;
  fontSize: number;
  lineHeight: number;
}) {
  return (
    <textarea
      ref={(el) => {
        if (el) lineRefs.current.set(index, el);
        else lineRefs.current.delete(index);
      }}
      defaultValue={raw}
      rows={1}
      onBlur={(e) => commitLine(index, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commitLine(index, e.currentTarget.value);
        }
        if (e.key === "Escape") setEditingLine(null);
      }}
      onInput={(e) => {
        const t = e.currentTarget;
        t.style.height = "auto";
        t.style.height = `${t.scrollHeight}px`;
      }}
      className="w-full bg-transparent border-0 border-b border-primary/40 p-0 font-mono text-foreground outline-none resize-none overflow-hidden"
      style={{
        fontSize: `${fontSize * 0.9}px`,
        lineHeight: lineHeight / fontSize + 0.4,
        height: `${lineHeight}px`,
      }}
    />
  );
}

function EmptyLine({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="h-5 cursor-text rounded-sm hover:bg-accent/30 transition-colors"
    />
  );
}

function CodeFenceLine({ raw, onClick }: { raw: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="font-mono text-xs text-muted-foreground py-0.5 cursor-text rounded-sm hover:bg-accent/30 transition-colors"
    >
      {raw}
    </div>
  );
}

function HrLine({ onClick }: { onClick: () => void }) {
  return (
    <div onClick={onClick} className={clickableLine}>
      <hr className="my-4 border-border" />
    </div>
  );
}

function HeadingLine({
  text,
  level,
  onClick,
}: {
  text: string;
  level: number;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={clickableLine}
      style={{
        fontSize: HEADING_SIZES[level] ?? "1rem",
        fontWeight: HEADING_WEIGHTS[level] ?? "500",
      }}
    >
      <InlineHtml text={text} />
    </div>
  );
}

function BlockquoteLine({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="border-l-2 border-primary pl-3 italic text-muted-foreground cursor-text rounded-sm hover:bg-accent/30 transition-colors py-0.5"
    >
      <InlineHtml text={text} />
    </div>
  );
}

function OrderedListLine({
  text,
  indent,
  number,
  onClick,
}: {
  text: string;
  indent: number;
  number: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={clickableLine}
      style={{ paddingLeft: `${indent + 1.5}em` }}
    >
      <span className="inline-block w-5 text-muted-foreground">{number}.</span>{" "}
      <InlineHtml text={text} />
    </div>
  );
}

function UnorderedListLine({
  text,
  indent,
  onClick,
}: {
  text: string;
  indent: number;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={clickableLine}
      style={{ paddingLeft: `${indent + 1.5}em` }}
    >
      <span className="inline-block w-3 text-muted-foreground">•</span>{" "}
      <InlineHtml text={text} />
    </div>
  );
}

function ParagraphLine({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <div onClick={onClick} className={clickableLine}>
      <InlineHtml text={text} />
    </div>
  );
}

// -- Router: picks the right sub-component for a classified line ---------

function RenderedLine({
  classified,
  index,
  raw,
  isEditing,
  lineRefs,
  commitLine,
  setEditingLine,
  fontSize,
  lineHeight,
}: {
  classified: ClassifiedLine;
  index: number;
  raw: string;
  isEditing: boolean;
  lineRefs: React.MutableRefObject<Map<number, HTMLTextAreaElement>>;
  commitLine: (index: number, newText: string) => void;
  setEditingLine: (index: number | null) => void;
  fontSize: number;
  lineHeight: number;
}) {
  const onClick = () => setEditingLine(index);

  if (isEditing) {
    return (
      <EditingTextarea
        index={index}
        raw={raw}
        lineRefs={lineRefs}
        commitLine={commitLine}
        setEditingLine={setEditingLine}
        fontSize={fontSize}
        lineHeight={lineHeight}
      />
    );
  }

  switch (classified.kind) {
    case "empty":
      return <EmptyLine onClick={onClick} />;
    case "codeFence":
      return <CodeFenceLine raw={raw} onClick={onClick} />;
    case "hr":
      return <HrLine onClick={onClick} />;
    case "heading":
      return (
        <HeadingLine
          text={classified.text}
          level={classified.meta?.level ?? 1}
          onClick={onClick}
        />
      );
    case "blockquote":
      return <BlockquoteLine text={classified.text} onClick={onClick} />;
    case "orderedList":
      return (
        <OrderedListLine
          text={classified.text}
          indent={classified.meta?.indent ?? 0}
          number={classified.meta?.number ?? "1"}
          onClick={onClick}
        />
      );
    case "unorderedList":
      return (
        <UnorderedListLine
          text={classified.text}
          indent={classified.meta?.indent ?? 0}
          onClick={onClick}
        />
      );
    default:
      return <ParagraphLine text={classified.text} onClick={onClick} />;
  }
}

// -- Virtual scroll helpers ----------------------------------------------

function computeVisibleRange(
  scrollTop: number,
  containerHeight: number,
  lineHeight: number,
  lineCount: number,
  paddingY: number,
) {
  const start = Math.max(
    0,
    Math.floor((scrollTop - paddingY) / lineHeight) - OVERSCAN,
  );
  const end = Math.min(
    lineCount,
    Math.ceil((scrollTop - paddingY + containerHeight) / lineHeight) + OVERSCAN,
  );
  return { start, end, offsetY: start * lineHeight + paddingY };
}

// -- Content sync hook ---------------------------------------------------

function useContentSync(value: string, onChange: (value: string) => void) {
  const contentRef = useRef(value);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    contentRef.current = value;
  }, [value]);

  const flushSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = undefined;
    }
    onChangeRef.current(contentRef.current);
  }, []);

  const debouncedSync = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(flushSync, SYNC_DEBOUNCE_MS);
  }, [flushSync]);

  useEffect(() => {
    return () => clearTimeout(syncTimerRef.current);
  }, []);

  return { contentRef, flushSync, debouncedSync };
}

// -- Line index hook (tracks \n positions lazily) ------------------------

function useLineIndex(content: string, version: number) {
  const lineStarts = useMemo(() => {
    const starts = [0];
    for (let i = 0; i < content.length; i++) {
      if (content.charCodeAt(i) === 10) starts.push(i + 1);
    }
    return starts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const getLine = useCallback(
    (index: number): string => {
      const start = lineStarts[index] ?? 0;
      const end = lineStarts[index + 1];
      if (end == null) return content.slice(start);
      // Strip trailing \r if present (Windows line endings)
      return content[end - 1] === "\r"
        ? content.slice(start, end - 1)
        : content.slice(start, end);
    },
    [lineStarts, content],
  );

  return { lineStarts, lineCount: lineStarts.length, getLine };
}

// -- Main component ------------------------------------------------------

interface LiveEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: (content: string) => void;
  fontSize: number;
}

export const LiveEditor = memo(function LiveEditor({
  value,
  onChange,
  onSave,
  fontSize,
}: LiveEditorProps) {
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [contentVersion, setContentVersion] = useState(0);
  const lineRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const containerHeightRef = useRef(0);

  const { contentRef, flushSync, debouncedSync } = useContentSync(
    value,
    onChange,
  );
  const { lineStarts, lineCount, getLine } = useLineIndex(
    contentRef.current,
    contentVersion,
  );

  const lineHeight = fontSize * 1.75;
  const paddingY = fontSize * 2; // matches py-8

  // Commit an edit to a single line
  const commitLine = useCallback(
    (index: number, newText: string) => {
      const start = lineStarts[index]!;
      const end = lineStarts[index + 1] ?? contentRef.current.length;
      contentRef.current =
        contentRef.current.slice(0, start) +
        newText +
        contentRef.current.slice(end);
      setContentVersion((v) => v + 1);
      debouncedSync();
      setEditingLine(null);
    },
    [lineStarts, contentRef, debouncedSync],
  );

  // Focus the editing textarea after render
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

  // Global Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        flushSync();
        onSave(contentRef.current);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave, flushSync, contentRef]);

  // Track container height for virtual scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      containerHeightRef.current = entries[0]?.contentRect.height ?? 0;
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
  }, []);

  // Virtual scroll
  const { start, end, offsetY } = computeVisibleRange(
    scrollTop,
    containerHeightRef.current,
    lineHeight,
    lineCount,
    paddingY,
  );
  const totalHeight = lineCount * lineHeight + paddingY * 2;

  // Build visible index set (includes the editing line even if offscreen)
  const visibleSet = useMemo(() => {
    const set = new Set<number>();
    for (let i = start; i < end; i++) set.add(i);
    if (editingLine !== null && editingLine < lineCount) set.add(editingLine);
    return set;
  }, [start, end, editingLine, lineCount]);

  const visibleSorted = useMemo(
    () => Array.from(visibleSet).sort((a, b) => a - b),
    [visibleSet],
  );

  // Empty state
  if (contentRef.current.length === 0 || !contentRef.current.trim()) {
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
      onScroll={handleScroll}
      className="h-full overflow-auto bg-card"
    >
      <div
        className="max-w-3xl mx-auto font-serif"
        style={{ fontSize: `${fontSize}px`, lineHeight: "1.75" }}
      >
        <div style={{ height: `${totalHeight}px`, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${offsetY}px)`,
              paddingTop: `${paddingY}px`,
              paddingBottom: `${paddingY}px`,
            }}
          >
            {visibleSorted.map((i) => (
              <RenderedLine
                key={i}
                index={i}
                raw={getLine(i)}
                classified={classifyLine(getLine(i))}
                isEditing={i === editingLine}
                lineRefs={lineRefs}
                commitLine={commitLine}
                setEditingLine={setEditingLine}
                fontSize={fontSize}
                lineHeight={lineHeight}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
