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
import { firstLine } from "@/lib/large-content";

import {
  DEFAULT_SETTINGS,
  type EditorSettings,
  type UpdateStatus,
} from "@/types/settings";

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

interface SessionTab {
  id: string;
  filePath: string | null;
  fileName: string;
  content: string;
  savedContent: string;
  previewHtml?: string;
  previewKind?: string;
}

interface SessionData {
  tabs: SessionTab[];
  activeTabId: string;
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
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const replaceRef = useRef(false);

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
      window.electronAPI.onUpdateError((err) => {
        console.error("Update error:", err);
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

  // Restore session or unsaved tabs on startup (runs once)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const restoreTemp = () => {
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
    };

    if (settings.continueSession) {
      window.electronAPI.sessionLoad().then((data) => {
        const session = data as SessionData | null;
        if (session && session.tabs.length > 0) {
          const restored: Tab[] = session.tabs.map((t) =>
            createTab({
              id: t.id,
              filePath: t.filePath,
              fileName: t.fileName,
              content: t.content,
              savedContent: t.savedContent,
              previewHtml: t.previewHtml,
              previewKind: t.previewKind as Tab["previewKind"],
            }),
          );
          setTabs(restored);
          const activeExists = restored.some(
            (t) => t.id === session.activeTabId,
          );
          setActiveTabId(activeExists ? session.activeTabId : restored[0]!.id);
          return;
        }
        // No session saved yet — fall back to temp restore
        restoreTemp();
      });
    } else {
      restoreTemp();
    }
  }, []);

  // Clear temp when auto-save or persist is turned off
  useEffect(() => {
    if (!settings.autoSave || !settings.persistUntitled) {
      window.electronAPI.tempClear();
    }
  }, [settings.autoSave, settings.persistUntitled]);

  // Clear saved session when the setting is turned off
  useEffect(() => {
    if (!settings.continueSession) {
      window.electronAPI.sessionSave(null);
    }
  }, [settings.continueSession]);

  // Persist ALL modified tabs to temp (debounced, 1s)
  // Skip files larger than ~1 MB to avoid I/O overhead from large temp writes
  useEffect(() => {
    if (!settings.autoSave || !settings.persistUntitled) return;
    const timer = setTimeout(() => {
      for (const tab of tabs) {
        if (
          tab.content &&
          tab.savedContent !== tab.content &&
          tab.content.length < 1_000_000
        ) {
          window.electronAPI.tempSave(tab.id, tab.content);
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [tabs, settings.autoSave, settings.persistUntitled]);

  // Persist session for "continue where you left off" (debounced, 1s)
  useEffect(() => {
    if (!settings.continueSession) return;
    const timer = setTimeout(() => {
      const session: SessionData = {
        tabs: tabs.map((t) => ({
          id: t.id,
          filePath: t.filePath,
          fileName: t.fileName,
          content: t.content,
          savedContent: t.savedContent,
          previewHtml: t.previewHtml,
          previewKind: t.previewKind,
        })),
        activeTabId,
      };
      window.electronAPI.sessionSave(session);
    }, 1000);
    return () => clearTimeout(timer);
  }, [tabs, activeTabId, settings.continueSession]);

  // Listen for close-request from main process
  useEffect(() => {
    return window.electronAPI.onCloseRequest(() => {
      const handleClose = async () => {
        // Save session before closing so tabs are restored next launch
        if (settings.continueSession) {
          const session: SessionData = {
            tabs: tabs.map((t) => ({
              id: t.id,
              filePath: t.filePath,
              fileName: t.fileName,
              content: t.content,
              savedContent: t.savedContent,
              previewHtml: t.previewHtml,
              previewKind: t.previewKind,
            })),
            activeTabId,
          };
          await window.electronAPI.sessionSave(session);
        }

        const hasUnsaved = tabs.some((t) => t.content !== t.savedContent);
        if (hasUnsaved && !settings.autoSave) {
          setCloseConfirmOpen(true);
        } else {
          window.electronAPI.closeConfirm();
        }
      };
      handleClose();
    });
  }, [tabs, activeTabId, settings.autoSave, settings.continueSession]);

  // Auto-save files with a path (debounced, 2s)
  useEffect(() => {
    if (!settings.autoSave || !activeTab.filePath || !isModified) return;
    if (replaceRef.current) {
      replaceRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      window.electronAPI
        .saveFile(activeTab.filePath!, activeTab.content)
        .then(() => updateActiveTab({ savedContent: activeTab.content }))
        .catch((err) => console.error("Auto-save failed:", err));
    }, 2000);
    return () => clearTimeout(timer);
  }, [activeTab.content, settings.autoSave]);

  // Drag-and-drop: intercept file drops before CodeMirror consumes them.
  // Uses capture phase (third arg = true) so we fire BEFORE the target element.
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      // Check both files.length and items for maximum compatibility
      const hasFiles =
        (e.dataTransfer?.files?.length ?? 0) > 0 ||
        Array.from(e.dataTransfer?.items ?? []).some(
          (item) => item.kind === "file",
        );
      if (!hasFiles) return;
      e.preventDefault();
      e.stopPropagation();
    };

    const onDrop = (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      e.preventDefault();
      e.stopPropagation();

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        // file.path is the legacy Electron property; getFilePath is the modern API
        const filePath: string =
          (file as any).path || window.electronAPI.getFilePath(file);
        if (!filePath) continue;

        window.electronAPI
          .openPath(filePath)
          .then((result) => {
            if (!result) return;
            const newTab = createTab({
              filePath: result.path,
              fileName: result.name,
              content: result.content,
              savedContent: result.content,
              previewHtml: result.previewHtml,
              previewKind: result.previewKind,
            });
            setTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id);
          })
          .catch((err) => {
            console.error("[dnd] openPath failed:", err);
          });
      }
    };

    window.addEventListener("dragover", onDragOver, true);
    window.addEventListener("drop", onDrop, true);
    return () => {
      window.removeEventListener("dragover", onDragOver, true);
      window.removeEventListener("drop", onDrop, true);
    };
  }, []);

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

  const updateTab = useCallback((tabId: string, patch: Partial<Tab>) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, ...patch } : t)),
    );
  }, []);

  const updateActiveTab = useCallback(
    (patch: Partial<Tab>) => {
      updateTab(activeTabId, patch);
    },
    [activeTabId, updateTab],
  );

  // -- File operations -----------------------------------------------------

  const handleOpen = useCallback(async () => {
    if (!window.electronAPI) {
      console.error("electronAPI not available — preload may have failed");
      return;
    }

    try {
      const result = await window.electronAPI.openFile();
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

  const handleSave = useCallback(
    async (content: string) => {
      const tab = tabs.find((t) => t.id === activeTabId);
      if (!tab) return;

      let filePath = tab.filePath;

      // .docx files can't be saved in-place - the extracted text would corrupt them
      if (filePath && filePath.toLowerCase().endsWith(".docx")) {
        filePath = null;
      }

      if (!filePath) {
        const result = await window.electronAPI.saveAs(content);
        if (!result) return;
        filePath = result.path;
        updateActiveTab({ filePath: result.path, fileName: result.name });
      }

      try {
        await window.electronAPI.saveFile(filePath, content);
        updateActiveTab({ savedContent: content });
        window.electronAPI.tempDelete(tab.id);
      } catch (err) {
        console.error("Save failed:", err);
      }
    },
    [tabs, activeTabId, updateActiveTab],
  );

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

  // After replace, skip one auto-save cycle but keep modified indicator visible
  const handleReplaceCommit = useCallback(() => {
    replaceRef.current = true;
  }, []);

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
          handleSave(activeTab.content);
          break;
        case "f":
          e.preventDefault();
          setSearchOpen((v) => !v);
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
          onClick: () => handleSave(activeTab.content),
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
          const displayName = t.filePath ? t.fileName : firstLine(t.content);
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
        showDragHandle={settings.showDragHandle}
      />

      <Menubar
        menus={menus}
        updateStatus={updateStatus}
        updateVersion={updateVersion}
        downloadProgress={downloadProgress}
        onDownloadStart={() => setUpdateStatus("downloading")}
        onSave={() => handleSave(activeTab.content)}
        activeModified={isModified}
      />

      <EditorArea
        tabId={activeTab.id}
        fileName={activeTab.fileName}
        content={activeTab.content}
        previewHtml={activeTab.previewHtml}
        previewKind={activeTab.previewKind}
        onChange={handleContentChange}
        onSave={handleSave}
        onReplaceCommit={handleReplaceCommit}
        editorFontSize={settings.editorFontSize}
        previewFontSize={settings.previewFontSize}
        tabSize={settings.tabSize}
        wordWrap={settings.wordWrap}
        previewVisible={previewVisible}
        splitPosition={splitPosition}
        onSplitPositionChange={setSplitPosition}
        scrollFraction={scrollFraction}
        onScrollFraction={settings.syncScroll ? setScrollFraction : () => {}}
        searchOpen={searchOpen}
        onSearchClose={() => setSearchOpen(false)}
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
