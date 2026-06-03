import { useRef, useCallback, useEffect } from "react";
import { Editor } from "@/components/Editor";
import { LiveEditor } from "@/components/LiveEditor";
import { CodeEditor } from "@/components/CodeEditor";
import { Preview } from "@/components/Preview";

// -- File-type helpers (extend this when adding new types) --------------

type FileKind = "markdown" | "text" | "word" | "code" | "unknown";

const codeExts = new Set([
  "js",
  "jsx",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "py",
  "pyw",
  "rs",
  "go",
  "java",
  "c",
  "cpp",
  "cc",
  "cxx",
  "h",
  "hpp",
  "cs",
  "rb",
  "php",
  "swift",
  "kt",
  "scala",
  "lua",
  "r",
  "sql",
  "sh",
  "bash",
  "zsh",
  "fish",
  "ps1",
  "bat",
  "cmd",
  "html",
  "htm",
  "css",
  "scss",
  "less",
  "json",
  "jsonc",
  "xml",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "dockerfile",
  "gitignore",
  "env",
  "graphql",
  "gql",
  "vue",
  "svelte",
  "astro",
  "prisma",
  "proto",
]);

function detectFileKind(fileName: string | null): FileKind {
  if (!fileName) return "unknown";
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "md":
      return "markdown";
    case "txt":
      return "text";
    case "docx":
      return "word";
    default:
      return codeExts.has(ext ?? "") ? "code" : "unknown";
  }
}

// -- Props ----------------------------------------------------------------

interface EditorAreaProps {
  fileName: string | null;
  content: string;
  previewHtml?: string;
  previewKind?: "markdown" | "docx" | "code";
  onChange: (content: string) => void;
  onSave: () => void;
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

// -- Component ------------------------------------------------------------

export function EditorArea({
  fileName,
  content,
  previewHtml,
  previewKind,
  onChange,
  onSave,
  editorFontSize,
  previewFontSize,
  tabSize,
  wordWrap,
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

  // -- Split pane drag ----------------------------------------------------

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

  // -- Render editors based on file kind ----------------------------------

  const noopScroll = () => {};

  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden">
      {/* Split: raw editor + preview (markdown with preview on) */}
      {showPreview && (
        <>
          <div style={{ width: `${splitPosition}%` }} className="h-full">
            <Editor
              value={content}
              onChange={onChange}
              onSave={onSave}
              fontSize={editorFontSize}
              tabSize={tabSize}
              wordWrap={wordWrap}
              scrollFraction={scrollFraction}
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
        </>
      )}

      {/* Live editor: formatted markdown with click-to-edit */}
      {!showPreview && fileKind === "markdown" && (
        <div className="w-full h-full">
          <LiveEditor
            value={content}
            onChange={onChange}
            onSave={onSave}
            fontSize={previewFontSize}
          />
        </div>
      )}

      {/* Code editor: syntax-highlighted, no preview */}
      {!showPreview && fileKind === "code" && (
        <div className="w-full h-full">
          <CodeEditor
            value={content}
            onChange={onChange}
            fileName={fileName ?? "untitled"}
          />
        </div>
      )}

      {/* Plain editor: for .txt and unknown types */}
      {!showPreview && fileKind !== "markdown" && fileKind !== "code" && (
        <div className="w-full h-full">
          <Editor
            value={content}
            onChange={onChange}
            onSave={onSave}
            fontSize={editorFontSize}
            tabSize={tabSize}
            wordWrap={wordWrap}
            scrollFraction={scrollFraction}
            onScrollFraction={noopScroll}
          />
        </div>
      )}
    </div>
  );
}
