import { useState, useCallback, useEffect, useRef } from "react";
import {
  Save,
  File,
  Edit,
  Eye,
  Settings,
  Undo2,
  Redo2,
  Columns2,
  Plus,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Menubar } from "@/components/Menubar";
import { TitleBar } from "@/components/TitleBar";
import { EditorArea } from "@/components/EditorArea";
import { SettingsModal } from "@/components/settings/SettingsModal";

import { DEFAULT_SETTINGS, type EditorSettings } from "@/types/settings";

const SETTINGS_KEY = "vorpol-settings";

function loadSettings(): EditorSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // corrupted data — fall through to defaults
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(s: EditorSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

// -- Types ----------------------------------------------------------------

interface Tab {
  id: string;
  filePath: string | null;
  fileName: string;
  content: string;
  savedContent: string;
  previewHtml?: string;
  previewKind?: "markdown" | "docx" | "code";
}

function createTab(partial?: Partial<Tab>): Tab {
  return {
    id: crypto.randomUUID(),
    filePath: null,
    fileName: "Untitled",
    content: "",
    savedContent: "",
    ...partial,
  };
}

// -- App -------------------------------------------------------------------

function App() {
  const [tabs, setTabs] = useState<Tab[]>([createTab()]);
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]!.id);
  const [splitPosition, setSplitPosition] = useState(50);
  const [settings, setSettings] = useState<EditorSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scrollFraction, setScrollFraction] = useState(0);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<
    | "idle"
    | "checking"
    | "available"
    | "downloading"
    | "downloaded"
    | "up-to-date"
    | "error"
  >("idle");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  // Persist settings to localStorage
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Update event listeners
  useEffect(() => {
    window.electronAPI.getVersion().then(setCurrentVersion);

    const unsubs = [
      window.electronAPI.onUpdateChecking(() => {
        setUpdateStatus("checking");
      }),
      window.electronAPI.onUpdateAvailable((info: any) => {
        setUpdateVersion(info.version);
        setUpdateStatus("available");
      }),
      window.electronAPI.onUpdateNotAvailable(() => {
        setUpdateStatus("up-to-date");
      }),
      window.electronAPI.onDownloadProgress((p: any) => {
        setUpdateStatus("downloading");
        setDownloadProgress(p.percent);
      }),
      window.electronAPI.onUpdateDownloaded((info: any) => {
        setUpdateVersion(info.version);
        setUpdateStatus("downloaded");
      }),
      window.electronAPI.onUpdateError(() => {
        setUpdateStatus("error");
      }),
    ];

    // Auto-check on mount
    window.electronAPI.checkForUpdates();

    return () => unsubs.forEach((u) => u());
  }, []);

  // Derived
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]!;
  const isModified = activeTab.content !== activeTab.savedContent;
  const isMarkdown =
    !!activeTab.fileName && activeTab.fileName.toLowerCase().endsWith(".md");
  const hasPreview = isMarkdown || !!activeTab.previewHtml;
  const [previewVisible, setPreviewVisible] = useState(true);
  const showPreview = (isMarkdown && previewVisible) || !!activeTab.previewHtml;
  const restoredRef = useRef(false);

  // Restore unsaved tabs from temp on startup (runs once)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    window.electronAPI.tempList().then((entries) => {
      if (entries.length === 0) return;
      const restored: Tab[] = entries.map((e) =>
        createTab({
          id: e.tabId,
          content: e.content,
          savedContent: "",
        }),
      );
      setTabs(restored);
      setActiveTabId(restored[0]!.id);
      window.electronAPI.tempClear();
    });
  }, []);

  // Clear temp when auto-save or persist is turned off
  useEffect(() => {
    if (!settings.autoSave || !settings.persistUntitled) {
      window.electronAPI.tempClear();
    }
  }, [settings.autoSave, settings.persistUntitled]);

  // Persist ALL modified tabs to temp (debounced, 1s)
  useEffect(() => {
    if (!settings.autoSave || !settings.persistUntitled) return;
    const timer = setTimeout(() => {
      for (const tab of tabs) {
        if (tab.content && tab.savedContent !== tab.content) {
          window.electronAPI.tempSave(tab.id, tab.content);
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [tabs, settings.autoSave, settings.persistUntitled]);

  // Listen for close-request from main process
  useEffect(() => {
    return window.electronAPI.onCloseRequest(() => {
      const hasUnsaved = tabs.some((t) => t.content !== t.savedContent);
      if (hasUnsaved && !settings.autoSave) {
        setCloseConfirmOpen(true);
      } else {
        window.electronAPI.closeConfirm();
      }
    });
  }, [tabs, settings.autoSave]);

  // Auto-save files with a path (debounced, 2s)
  useEffect(() => {
    if (!settings.autoSave || !activeTab.filePath || !isModified) return;
    const timer = setTimeout(() => {
      window.electronAPI
        .saveFile(activeTab.filePath!, activeTab.content)
        .then(() => updateActiveTab({ savedContent: activeTab.content }))
        .catch((err) => console.error("Auto-save failed:", err));
    }, 2000);
    return () => clearTimeout(timer);
  }, [activeTab.content, settings.autoSave]);

  // Listen for externally opened files (double-click in explorer, etc.)
  useEffect(() => {
    // Pull any file from cold-start (command-line argument)
    window.electronAPI
      .ready()
      .then((file) => {
        if (file) {
          const newTab = createTab({
            filePath: file.path,
            fileName: file.name,
            content: file.content,
            savedContent: file.content,
            previewHtml: file.previewHtml,
            previewKind: file.previewKind,
          });

          setTabs((prev) => {
            const untouchedIdx = prev.findIndex(
              (t) => !t.filePath && t.content === "" && t.savedContent === "",
            );
            if (untouchedIdx !== -1) {
              return prev.map((t, i) => (i === untouchedIdx ? newTab : t));
            }
            return [...prev, newTab];
          });
          setActiveTabId(newTab.id);
        }
      })
      .catch((err) => {
        console.error("[renderer] ready failed:", err);
      });

    // Listen for warm-start file opens (second-instance while app is running)
    return window.electronAPI.onOpenExternal((file) => {
      const newTab = createTab({
        filePath: file.path,
        fileName: file.name,
        content: file.content,
        savedContent: file.content,
        previewHtml: file.previewHtml,
        previewKind: file.previewKind,
      });

      setTabs((prev) => {
        const untouchedIdx = prev.findIndex(
          (t) => !t.filePath && t.content === "" && t.savedContent === "",
        );
        if (untouchedIdx !== -1) {
          return prev.map((t, i) => (i === untouchedIdx ? newTab : t));
        }
        return [...prev, newTab];
      });
      setActiveTabId(newTab.id);
    });
  }, []);

  // -- Helpers -------------------------------------------------------------

  const updateActiveTab = useCallback(
    (patch: Partial<Tab>) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, ...patch } : t)),
      );
    },
    [activeTabId],
  );

  // -- File operations -----------------------------------------------------

  const handleOpen = useCallback(async () => {
    console.log("[Open] clicked, electronAPI:", !!window.electronAPI);
    if (!window.electronAPI) {
      console.error("electronAPI not available — preload may have failed");
      return;
    }

    try {
      console.log("[Open] calling openFile...");
      const result = await window.electronAPI.openFile();
      console.log("[Open] result:", result);
      if (!result) return;

      // Result can be single file or array (multi-selection)
      const files = Array.isArray(result) ? result : [result];

      const newTabs: Tab[] = files.map((f) =>
        createTab({
          filePath: f.path,
          fileName: f.name,
          content: f.content,
          savedContent: f.content,
          previewHtml: f.previewHtml,
          previewKind: f.previewKind,
        }),
      );

      setTabs((prev) => {
        // Replace existing untouched empty tabs, otherwise append
        const untouched = prev.filter(
          (t) => !t.filePath && t.content === "" && t.savedContent === "",
        );
        if (untouched.length === 1 && newTabs.length === 1) {
          return prev.map((t) => (t.id === untouched[0]!.id ? newTabs[0]! : t));
        }
        // Remove untouched empties and add new tabs
        const existing = prev.filter(
          (t) => t.filePath || t.content !== "" || t.savedContent !== "",
        );
        return [...existing, ...newTabs];
      });

      setActiveTabId(newTabs[0]!.id);
    } catch (err) {
      console.error("Open failed:", err);
    }
  }, []);

  const handleSave = useCallback(async () => {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;

    let filePath = tab.filePath;

    // .docx files can't be saved in-place — the extracted text would corrupt them
    if (filePath && filePath.toLowerCase().endsWith(".docx")) {
      filePath = null;
    }

    if (!filePath) {
      const result = await window.electronAPI.saveAs(tab.content);
      if (!result) return;
      filePath = result.path;
      updateActiveTab({ filePath: result.path, fileName: result.name });
    }

    try {
      await window.electronAPI.saveFile(filePath, tab.content);
      updateActiveTab({ savedContent: tab.content });
      window.electronAPI.tempDelete(tab.id);
    } catch (err) {
      console.error("Save failed:", err);
    }
  }, [tabs, activeTabId, updateActiveTab]);

  // -- Tab management ------------------------------------------------------

  const handleNewTab = useCallback(() => {
    const tab = createTab();
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const handleCloseTab = useCallback(
    (id: string) => {
      window.electronAPI.tempDelete(id);
      setTabs((prev) => {
        if (prev.length <= 1) return [createTab()];
        return prev.filter((t) => t.id !== id);
      });
      if (id === activeTabId) {
        setActiveTabId((prevId) => {
          const remaining = tabs.filter((t) => t.id !== id && t.id !== prevId);
          return remaining.length > 0
            ? remaining[remaining.length - 1]!.id
            : tabs[0]!.id;
        });
      }
    },
    [activeTabId, tabs],
  );

  // -- Content change ------------------------------------------------------

  const handleContentChange = useCallback(
    (content: string) => {
      updateActiveTab({ content });
    },
    [updateActiveTab],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      switch (e.key.toLowerCase()) {
        case "t":
          e.preventDefault();
          handleNewTab();
          break;
        case "o":
          e.preventDefault();
          handleOpen();
          break;
        case "s":
          e.preventDefault();
          handleSave();
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNewTab, handleOpen, handleSave]);

  // -- Menubar definitions -------------------------------------------------

  const menus = [
    {
      label: "File",
      icon: File,
      items: [
        {
          label: "New tab",
          icon: Plus,
          shortcut: "Ctrl+T",
          onClick: handleNewTab,
        },
        {
          label: "Open file",
          icon: File,
          shortcut: "Ctrl+O",
          onClick: handleOpen,
        },
        "separator" as const,
        {
          label: "Save",
          icon: Save,
          shortcut: "Ctrl+S",
          disabled: !activeTab.filePath && !activeTab.content,
          onClick: handleSave,
        },
      ],
    },
    {
      label: "Edit",
      icon: Edit,
      items: [
        {
          label: "Undo",
          icon: Undo2,
          shortcut: "Ctrl+Z",
          disabled: true,
          onClick: () => {},
        },
        {
          label: "Redo",
          icon: Redo2,
          shortcut: "Ctrl+Y",
          disabled: true,
          onClick: () => {},
        },
      ],
    },
    {
      label: "View",
      icon: Eye,
      items: [
        {
          label: previewVisible ? "Hide preview" : "Show preview",
          icon: previewVisible ? PanelRightClose : PanelRightOpen,
          disabled: !hasPreview,
          onClick: () => setPreviewVisible((v) => !v),
        },
        "separator" as const,
        {
          label: "Split evenly",
          icon: Columns2,
          disabled: !showPreview,
          onClick: () => setSplitPosition(50),
        },
        {
          label: "Focus editor",
          icon: Edit,
          disabled: !showPreview,
          onClick: () => setSplitPosition(75),
        },
        {
          label: "Focus preview",
          icon: Eye,
          disabled: !showPreview,
          onClick: () => setSplitPosition(25),
        },
      ],
    },
    {
      label: "Settings",
      icon: Settings,
      onClick: () => setSettingsOpen(true),
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-background">
      <TitleBar
        tabs={tabs.map((t) => {
          const displayName = t.filePath
            ? t.fileName
            : t.content.trim()
              ? t.content.split("\n")[0]!.trim().slice(0, 40) || "Untitled"
              : "Untitled";
          return {
            id: t.id,
            fileName: displayName,
            isModified: t.content !== t.savedContent,
          };
        })}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={handleCloseTab}
        onNewTab={handleNewTab}
        onSave={handleSave}
      />

      <Menubar
        menus={menus}
        updateStatus={updateStatus}
        updateVersion={updateVersion}
        downloadProgress={downloadProgress}
      />

      <EditorArea
        fileName={activeTab.fileName}
        content={activeTab.content}
        previewHtml={activeTab.previewHtml}
        previewKind={activeTab.previewKind}
        onChange={handleContentChange}
        onSave={handleSave}
        editorFontSize={settings.editorFontSize}
        previewFontSize={settings.previewFontSize}
        tabSize={settings.tabSize}
        wordWrap={settings.wordWrap}
        previewVisible={previewVisible}
        splitPosition={splitPosition}
        onSplitPositionChange={setSplitPosition}
        scrollFraction={scrollFraction}
        onScrollFraction={settings.syncScroll ? setScrollFraction : () => {}}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
        updateStatus={updateStatus}
        updateVersion={updateVersion}
        downloadProgress={downloadProgress}
        currentVersion={currentVersion}
      />

      {closeConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[380px] rounded-lg border border-border bg-card shadow-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Unsaved changes
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              You have unsaved changes in one or more untitled tabs. These
              changes will be lost when you close the app. Do you want to close
              anyway?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCloseConfirmOpen(false);
                  window.electronAPI.closeCancel();
                }}
                className="h-7 px-3 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setCloseConfirmOpen(false);
                  window.electronAPI.closeConfirm();
                }}
                className="h-7 px-3 rounded-md text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Close anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
