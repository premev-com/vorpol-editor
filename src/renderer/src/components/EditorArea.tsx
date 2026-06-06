import { useRef, useCallback, useEffect } from "react";
import { LiveEditor } from "@/components/LiveEditor";
import { CodeEditor } from "@/components/CodeEditor";
import { Preview } from "@/components/Preview";

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
  fileName: string | null;
  content: string;
  previewHtml?: string;
  previewKind?: "markdown" | "docx" | "code";
  onChange: (content: string) => void;
  onSave: (content: string) => void;
  editorFontSize: number;
  previewFontSize: number;
  tabSize: number;
  wordWrap: boolean;
  previewVisible: boolean;
  splitPosition: number;
  onSplitPositionChange: (pos: number) => void;
  scrollFraction: number;
  onScrollFraction: (fraction: number) => void;
}

export function EditorArea({
  fileName,
  content,
  previewHtml,
  previewKind,
  onChange,
  onSave,
  editorFontSize: _editorFontSize,
  previewFontSize,
  tabSize: _tabSize,
  wordWrap: _wordWrap,
  previewVisible,
  splitPosition,
  onSplitPositionChange,
  scrollFraction,
  onScrollFraction,
}: EditorAreaProps) {
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fileKind = detectFileKind(fileName);
  const showPreview =
    (fileKind === "markdown" && previewVisible) || !!previewHtml;

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

  // Markdown split: CodeMirror source + rendered preview
  if (showPreview) {
    return (
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        <div style={{ width: `${splitPosition}%` }} className="h-full">
          <CodeEditor
            value={content}
            onChange={onChange}
            onSave={onSave}
            fileName={fileName ?? "untitled.md"}
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
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full h-full">
          <LiveEditor
            value={content}
            onChange={onChange}
            onSave={onSave}
            fontSize={previewFontSize}
          />
        </div>
      </div>
    );
  }

  // Everything else (code, text, unknown): CodeMirror with viewport rendering
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-full h-full">
        <CodeEditor
          value={content}
          onChange={onChange}
          onSave={onSave}
          fileName={fileName ?? "untitled"}
        />
      </div>
    </div>
  );
}
