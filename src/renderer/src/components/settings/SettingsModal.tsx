import { X } from "lucide-react";
import type { EditorSettings, UpdateStatus } from "@/types/settings";
import { SettingRow } from "./SettingRow";
import { Toggle } from "./Toggle";
import { UpdateSection } from "./UpdateSection";

interface SettingsModalProps {
  open: boolean;
  settings: EditorSettings;
  onChange: (settings: EditorSettings) => void;
  onClose: () => void;
  updateStatus: UpdateStatus;
  updateVersion: string | null;
  downloadProgress: number;
  currentVersion: string | null;
}

export function SettingsModal({
  open,
  settings,
  onChange,
  onClose,
  updateStatus,
  updateVersion,
  downloadProgress,
  currentVersion,
}: SettingsModalProps) {
  if (!open) return null;

  const update = (patch: Partial<EditorSettings>) =>
    onChange({ ...settings, ...patch });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Editor
            </h3>

            <SettingRow
              label="Font size"
              value={`${settings.editorFontSize}px`}
            >
              <input
                type="range"
                min={12}
                max={24}
                value={settings.editorFontSize}
                onChange={(e) =>
                  update({ editorFontSize: Number(e.target.value) })
                }
                className="w-24 h-1 accent-primary"
              />
            </SettingRow>

            <SettingRow label="Word wrap">
              <Toggle
                checked={settings.wordWrap}
                onChange={(v) => update({ wordWrap: v })}
              />
            </SettingRow>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Preview
            </h3>
            <SettingRow
              label="Font size"
              value={`${settings.previewFontSize}px`}
            >
              <input
                type="range"
                min={12}
                max={24}
                value={settings.previewFontSize}
                onChange={(e) =>
                  update({ previewFontSize: Number(e.target.value) })
                }
                className="w-24 h-1 accent-primary"
              />
            </SettingRow>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Behavior
            </h3>
            <SettingRow label="Auto-save">
              <Toggle
                checked={settings.autoSave}
                onChange={(v) => update({ autoSave: v })}
              />
            </SettingRow>
            <SettingRow label="Sync scroll">
              <Toggle
                checked={settings.syncScroll}
                onChange={(v) => update({ syncScroll: v })}
              />
            </SettingRow>
            <SettingRow label="Persist unsaved tabs">
              <Toggle
                checked={settings.persistUntitled}
                onChange={(v) => update({ persistUntitled: v })}
              />
            </SettingRow>
            <SettingRow label="Continue where you left off">
              <Toggle
                checked={settings.continueSession}
                onChange={(v) => update({ continueSession: v })}
              />
            </SettingRow>
            <SettingRow label="Show drag handle">
              <Toggle
                checked={settings.showDragHandle}
                onChange={(v) => update({ showDragHandle: v })}
              />
            </SettingRow>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              System
            </h3>
            <UpdateSection
              updateStatus={updateStatus}
              updateVersion={updateVersion}
              downloadProgress={downloadProgress}
              currentVersion={currentVersion}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
