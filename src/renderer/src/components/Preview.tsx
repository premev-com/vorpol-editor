import { useMemo, useRef, useCallback, useEffect } from "react";
import { marked } from "marked";
import { cn } from "@/lib/utils";

interface PreviewProps {
  content: string;
  previewHtml?: string;
  previewKind?: "markdown" | "docx" | "code";
  fontSize: number;
  scrollFraction: number;
  onScrollFraction: (fraction: number) => void;
}

export function Preview({
  content,
  previewHtml,
  previewKind,
  fontSize,
  scrollFraction,
  onScrollFraction,
}: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  const html = useMemo(() => {
    if (previewHtml) return previewHtml;
    if (!content.trim()) return "";
    return marked.parse(content, { async: false }) as string;
  }, [content, previewHtml]);

  const handleScroll = useCallback(() => {
    if (syncingRef.current || !containerRef.current) return;
    const el = containerRef.current;
    const max = el.scrollHeight - el.clientHeight;
    if (max > 0) onScrollFraction(el.scrollTop / max);
  }, [onScrollFraction]);

  // Sync scroll from other pane
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 0) return;
    syncingRef.current = true;
    el.scrollTop = scrollFraction * max;
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, [scrollFraction]);

  if (!content.trim() && !previewHtml) {
    return (
      <div className="flex items-center justify-center h-full bg-card">
        <div className="text-center space-y-3 px-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
            <svg
              className="w-8 h-8 text-muted-foreground/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground/50 font-sans">
            Preview will appear here as you type
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-auto"
    >
      <div
        className={cn(
          "p-8 max-w-3xl mx-auto",
          previewKind === "docx" && "docx-preview",
          previewKind === "code" && "code-preview-wrapper",
          previewKind !== "docx" && previewKind !== "code" && "prose-preview",
        )}
        style={{ fontSize: `${fontSize}px` }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
