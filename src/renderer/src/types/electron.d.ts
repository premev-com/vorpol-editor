interface FileResult {
  path: string;
  name: string;
  content: string;
  previewHtml?: string;
  previewKind?: "markdown" | "docx";
}

interface SaveAsResult {
  path: string;
  name: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

interface ElectronAPI {
  ready: () => Promise<FileResult | null>;
  openFile: () => Promise<FileResult | null>;
  openPath: (filePath: string) => Promise<FileResult | null>;
  getFilePath: (file: File) => string;
  saveFile: (filePath: string, content: string) => Promise<boolean>;
  saveAs: (content: string) => Promise<SaveAsResult | null>;
  onOpenExternal: (callback: (file: FileResult) => void) => () => void;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (callback: (maximized: boolean) => void) => () => void;
  onCloseRequest: (callback: () => void) => () => void;
  closeConfirm: () => void;
  closeCancel: () => void;
  tempSave: (tabId: string, content: string) => Promise<boolean>;
  tempDelete: (tabId: string) => Promise<boolean>;
  tempList: () => Promise<{ tabId: string; content: string }[]>;
  tempClear: () => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  // Update & version tracking
  getVersion: () => Promise<string>;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateChecking: (callback: () => void) => () => void;
  onUpdateAvailable: (callback: (info: unknown) => void) => () => void;
  onUpdateNotAvailable: (callback: (info: unknown) => void) => () => void;
  onDownloadProgress: (
    callback: (progress: DownloadProgress) => void,
  ) => () => void;
  onUpdateDownloaded: (callback: (info: unknown) => void) => () => void;
  onUpdateError: (callback: (error: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
