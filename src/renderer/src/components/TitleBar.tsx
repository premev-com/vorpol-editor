import { useEffect, useState } from "react";
import { Plus, X, Minus, Square, X as CloseIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabInfo {
  id: string;
  fileName: string;
  isModified: boolean;
}

interface TitleBarProps {
  tabs: TabInfo[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  showDragHandle?: boolean;
}

export function TitleBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  showDragHandle = true,
}: TitleBarProps) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.isMaximized().then(setMaximized);
    return window.electronAPI.onMaximizeChange(setMaximized);
  }, []);

  return (
    <header
      className={`${showDragHandle ? "h-12" : "h-10"} flex flex-col bg-card border-b border-border select-none`}
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {showDragHandle && (
        <div className="h-[6px] w-full rounded-full bg-muted-foreground/30" />
      )}

      {/* Content row — tabs and window controls */}
      <div className="flex items-center flex-1 min-h-0">
        {/* Tabs */}
        <div className="flex items-end flex-1 min-w-0 overflow-hidden h-full">
          {tabs.map((tab) => {
            const active = tab.id === activeTabId;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                className={cn(
                  "group relative h-8 flex items-center gap-1.5 pl-3 pr-2 text-xs border-r border-border transition-colors flex-1 min-w-15 max-w-50 mt-auto",
                  active
                    ? "bg-background text-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-accent/50",
                )}
              >
                <span className="truncate">{tab.fileName}</span>

                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    tab.isModified ? "bg-primary" : "bg-transparent",
                  )}
                />

                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                  className={cn(
                    "ml-auto flex-shrink-0 p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-border transition-opacity",
                    active && "opacity-50",
                  )}
                  title="Close tab"
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            );
          })}

          <button
            onClick={onNewTab}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex-shrink-0"
            title="New tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Window controls */}
        <div
          className="flex items-center flex-shrink-0"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            onClick={() => window.electronAPI?.minimize()}
            className="h-10 w-10 inline-flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.electronAPI?.maximize()}
            className="h-10 w-10 inline-flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <Square className={cn("w-3 h-3", maximized && "rotate-180")} />
          </button>
          <button
            onClick={() => window.electronAPI?.close()}
            className="h-10 w-10 inline-flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
