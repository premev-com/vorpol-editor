import { useRef, useCallback, useEffect, useMemo } from "react";
import { flushSync } from "react-dom";
import { Editor } from "@/components/Editor";
import { LiveEditor } from "@/components/LiveEditor";
import { Preview } from "@/components/Preview";
import { SearchBar, useSearch } from "@/components/SearchBar";

import { CODE_EXTENSIONS, FILE_KIND_MAP } from "@shared/extensions";

type FileKind = "markdown" | "text" | "word" | "code" | "unknown";

const codeExts = new Set<string>(CODE_EXTENSIONS);

function detectFileKind(fileName: string | null): FileKind {
  if (!fileName) return "unknown";
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext && ext in FILE_KIND_MAP) {
    return FILE_KIND_MAP[ext] as FileKind;
  }
  return codeExts.has(ext ?? "") ? "code" : "unknown";
}

interface EditorAreaProps {
  tabId: string;
  fileName: string | null;
  content: string;
  previewHtml?: string;
  previewKind?: "markdown" | "docx" | "code";
  onChange: (content: string) => void;
  onSave: (content: string) => void;
  onReplaceCommit: () => void;
  editorFontSize: number;
  previewFontSize: number;
  wordWrap: boolean;
  previewVisible: boolean;
  splitPosition: number;
  onSplitPositionChange: (pos: number) => void;
  scrollFraction: number;
  onScrollFraction: (fraction: number) => void;
  searchOpen: boolean;
  onSearchClose: () => void;
}

export function EditorArea({
  tabId,
  fileName,
  content,
  previewHtml,
  previewKind,
  onChange,
  onSave,
  onReplaceCommit,
  editorFontSize,
  previewFontSize,
  wordWrap,
  previewVisible,
  splitPosition,
  onSplitPositionChange,
  scrollFraction,
  onScrollFraction,
  searchOpen,
  onSearchClose,
}: EditorAreaProps) {
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fileKind = detectFileKind(fileName);
  const showPreview =
    (fileKind === "markdown" && previewVisible) || !!previewHtml;

  const search = useSearch(content);

  // Active match as a selection range for CodeMirror
  const selection = useMemo(() => {
    if (!search.activeMatch || !searchOpen) return null;
    return {
      from: search.activeMatch.index,
      to: search.activeMatch.index + search.activeMatch.length,
    };
  }, [search.activeMatch, searchOpen]);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - r.left) / r.width) * 100;
      onSplitPositionChange(Math.min(Math.max(pct, 25), 75));
    };
    const up = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  // Replace the active match — normalize content to match search indices
  const handleReplace = useCallback(() => {
    if (!search.activeMatch) return;
    const { index, length } = search.activeMatch;
    const text = content.replace(/\r\n/g, "\n");
    const newContent =
      text.slice(0, index) + search.replace + text.slice(index + length);
    // Only update content (not savedContent) so the modified indicator shows.
    // onReplaceCommit marks a flag to skip one auto-save cycle.
    flushSync(() => {
      onChange(newContent);
      onReplaceCommit();
    });
  }, [content, search.activeMatch, search.replace, onChange, onReplaceCommit]);

  // Replace all matches
  const handleReplaceAll = useCallback(() => {
    if (search.matches.length === 0) return;
    const sorted = [...search.matches].sort((a, b) => b.index - a.index);
    let result = content.replace(/\r\n/g, "\n");
    for (const m of sorted) {
      result =
        result.slice(0, m.index) +
        search.replace +
        result.slice(m.index + m.length);
    }
    flushSync(() => {
      onChange(result);
      onReplaceCommit();
    });
  }, [content, search.matches, search.replace, onChange, onReplaceCommit]);

  const searchBar = (
    <SearchBar
      open={searchOpen}
      query={search.query}
      onQueryChange={search.setQuery}
      replace={search.replace}
      onReplaceChange={search.setReplace}
      caseSensitive={search.caseSensitive}
      onCaseSensitiveChange={search.setCaseSensitive}
      matchCount={search.matches.length}
      activeIndex={search.activeIndex}
      onNext={search.goNext}
      onPrev={search.goPrev}
      onReplace={handleReplace}
      onReplaceAll={handleReplaceAll}
      onClose={() => {
        search.reset();
        onSearchClose();
      }}
    />
  );

  // Markdown split: CodeMirror source + rendered preview
  if (showPreview) {
    return (
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {searchBar}
        <div style={{ width: `${splitPosition}%` }} className="h-full">
          <Editor
            key={tabId}
            value={content}
            onChange={onChange}
            onSave={onSave}
            fileName={fileName ?? "untitled.md"}
            wordWrap={wordWrap}
            fontSize={editorFontSize}
            selection={selection}
            onScrollFraction={onScrollFraction}
          />
        </div>

        <div
          className="w-1.5 flex-shrink-0 cursor-col-resize relative group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary/50 transition-colors" />
        </div>

        <div style={{ width: `${100 - splitPosition}%` }} className="h-full">
          <Preview
            content={content}
            previewHtml={previewHtml}
            previewKind={previewKind}
            fontSize={previewFontSize}
            scrollFraction={scrollFraction}
            onScrollFraction={onScrollFraction}
          />
        </div>
      </div>
    );
  }

  // Live markdown editor (formatted, click-to-edit)
  if (fileKind === "markdown") {
    return (
      <div className="flex-1 flex overflow-hidden relative">
        {searchBar}
        <div className="w-full h-full">
          <LiveEditor
            key={tabId}
            value={content}
            onChange={onChange}
            onSave={onSave}
            fontSize={previewFontSize}
            wordWrap={wordWrap}
          />
        </div>
      </div>
    );
  }

  // Everything else (code, text, unknown): CodeMirror with viewport rendering
  return (
    <div className="flex-1 flex overflow-hidden relative">
      {searchBar}
      <div className="w-full h-full">
        <Editor
          key={tabId}
          value={content}
          onChange={onChange}
          onSave={onSave}
          fileName={fileName ?? "untitled"}
          wordWrap={wordWrap}
          fontSize={editorFontSize}
          selection={selection}
        />
      </div>
    </div>
  );
}
