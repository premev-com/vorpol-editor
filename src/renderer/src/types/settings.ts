export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "up-to-date"
  | "error";

export interface EditorSettings {
  theme: "dark" | "light";
  editorFontSize: number;
  wordWrap: boolean;
  autoSave: boolean;
  syncScroll: boolean;
  persistUntitled: boolean;
  continueSession: boolean;
  previewFontSize: number;
  showDragHandle: boolean;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  theme: "dark",
  editorFontSize: 14,
  wordWrap: true,
  autoSave: false,
  syncScroll: true,
  persistUntitled: true,
  continueSession: false,
  previewFontSize: 16,
  showDragHandle: false,
};
