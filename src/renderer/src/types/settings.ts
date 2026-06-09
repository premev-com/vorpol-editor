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
  tabSize: number;
  wordWrap: boolean;
  autoSave: boolean;
  syncScroll: boolean;
  persistUntitled: boolean;
  continueSession: boolean;
  previewFontSize: number;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  theme: "dark",
  editorFontSize: 14,
  tabSize: 2,
  wordWrap: true,
  autoSave: true,
  syncScroll: true,
  persistUntitled: true,
  continueSession: false,
  previewFontSize: 16,
};
