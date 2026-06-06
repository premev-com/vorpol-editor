import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Search, ArrowUp, ArrowDown, X, CaseSensitive } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchState {
  query: string;
  replace: string;
  caseSensitive: boolean;
}

export interface SearchResult {
  matches: Match[];
  activeIndex: number;
}

export interface Match {
  index: number;
  length: number;
  /** 0-based line number */
  line: number;
}

export function useSearch(content: string) {
  const [query, setQuery] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo((): Match[] => {
    if (!query) return [];
    // Normalize \r\n → \n to match CodeMirror's internal representation.
    // Without this, CRLF line endings shift character positions and navigation
    // lands on the wrong line.
    const text = content.replace(/\r\n/g, "\n");
    const source = caseSensitive ? text : text.toLowerCase();
    const needle = caseSensitive ? query : query.toLowerCase();
    const results: Match[] = [];
    let line = 0;
    let searchFrom = 0;

    while (searchFrom < text.length) {
      const idx = source.indexOf(needle, searchFrom);
      if (idx === -1) break;

      for (let i = searchFrom; i < idx; i++) {
        if (text.charCodeAt(i) === 10) line++;
      }

      results.push({ index: idx, length: query.length, line });
      searchFrom = idx + 1;
    }
    return results;
  }, [content, query, caseSensitive]);

  // Clamp active index when matches change
  useEffect(() => {
    if (activeIndex >= matches.length) {
      setActiveIndex(matches.length > 0 ? matches.length - 1 : 0);
    }
  }, [matches.length, activeIndex]);

  const goNext = useCallback(() => {
    setActiveIndex((prev) =>
      matches.length > 0 ? (prev + 1) % matches.length : 0,
    );
  }, [matches.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) =>
      matches.length > 0 ? (prev - 1 + matches.length) % matches.length : 0,
    );
  }, [matches.length]);

  const activeMatch = matches[activeIndex] ?? null;

  const reset = useCallback(() => {
    setQuery("");
    setReplace("");
    setActiveIndex(0);
  }, []);

  return {
    query,
    setQuery,
    replace,
    setReplace,
    caseSensitive,
    setCaseSensitive,
    matches,
    activeIndex,
    activeMatch,
    goNext,
    goPrev,
    reset,
  };
}

interface SearchBarProps {
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  replace: string;
  onReplaceChange: (r: string) => void;
  caseSensitive: boolean;
  onCaseSensitiveChange: (cs: boolean) => void;
  matchCount: number;
  activeIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

export function SearchBar({
  open,
  query,
  onQueryChange,
  replace,
  onReplaceChange,
  caseSensitive,
  onCaseSensitiveChange,
  matchCount,
  activeIndex,
  onNext,
  onPrev,
  onReplace,
  onReplaceAll,
  onClose,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) onPrev();
        else onNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onNext, onPrev, onClose]);

  if (!open) return null;

  return (
    <div className="absolute top-0 right-0 z-50 m-2 bg-card border border-border rounded-lg shadow-lg p-3 w-[380px]">
      <div className="flex items-center gap-2 mb-2">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Find..."
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
        />
        <span className="text-xs text-muted-foreground flex-shrink-0 min-w-[40px] text-right">
          {matchCount > 0 ? `${activeIndex + 1}/${matchCount}` : "0/0"}
        </span>
        <button
          onClick={onPrev}
          disabled={matchCount === 0}
          className="p-1 rounded hover:bg-accent disabled:opacity-30"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          onClick={onNext}
          disabled={matchCount === 0}
          className="p-1 rounded hover:bg-accent disabled:opacity-30"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
        <button onClick={onClose} className="p-1 rounded hover:bg-accent">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={replace}
          onChange={(e) => onReplaceChange(e.target.value)}
          placeholder="Replace with..."
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
        />
        <button
          onClick={onReplace}
          disabled={matchCount === 0}
          className="px-2 py-0.5 text-xs rounded bg-accent hover:bg-accent/80 disabled:opacity-30"
        >
          Replace
        </button>
        <button
          onClick={onReplaceAll}
          disabled={matchCount === 0}
          className="px-2 py-0.5 text-xs rounded bg-accent hover:bg-accent/80 disabled:opacity-30"
        >
          All
        </button>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => onCaseSensitiveChange(!caseSensitive)}
          className={cn(
            "flex items-center gap-1 text-xs rounded px-1.5 py-0.5",
            caseSensitive
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          <CaseSensitive className="w-3.5 h-3.5" />
          Aa
        </button>
      </div>
    </div>
  );
}
