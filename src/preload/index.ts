import { contextBridge, ipcRenderer } from "electron";

interface FileResult {
  path: string;
  name: string;
  content: string;
  previewHtml?: string;
  previewKind?: "markdown" | "docx";
}

contextBridge.exposeInMainWorld("electronAPI", {
  ready: () => ipcRenderer.invoke("renderer:ready"),
  openFile: () => ipcRenderer.invoke("file:open"),
  saveFile: (filePath: string, content: string) =>
    ipcRenderer.invoke("file:save", { filePath, content }),
  saveAs: (content: string) => ipcRenderer.invoke("file:saveAs", { content }),
  onOpenExternal: (callback: (file: FileResult) => void) => {
    const handler = (_event: unknown, file: FileResult) => callback(file);
    ipcRenderer.on("file:openExternal", handler);
    return () => ipcRenderer.removeListener("file:openExternal", handler);
  },
  // Frameless window controls
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  isMaximized: () =>
    ipcRenderer.invoke("window:isMaximized") as Promise<boolean>,
  onMaximizeChange: (callback: (maximized: boolean) => void) => {
    const handler = (_event: unknown, maximized: boolean) =>
      callback(maximized);
    ipcRenderer.on("window:maximizeChange", handler);
    return () => ipcRenderer.removeListener("window:maximizeChange", handler);
  },
  onCloseRequest: (callback: () => void) => {
    ipcRenderer.on("window:closeRequest", callback);
    return () => ipcRenderer.removeListener("window:closeRequest", callback);
  },
  closeConfirm: () => ipcRenderer.send("window:closeConfirm"),
  closeCancel: () => ipcRenderer.send("window:closeCancel"),
  // Temp file persistence for unsaved tabs
  tempSave: (tabId: string, content: string) =>
    ipcRenderer.invoke("temp:save", { tabId, content }),
  tempDelete: (tabId: string) => ipcRenderer.invoke("temp:delete", { tabId }),
  tempList: () =>
    ipcRenderer.invoke("temp:list") as Promise<
      { tabId: string; content: string }[]
    >,
  tempClear: () => ipcRenderer.invoke("temp:clear"),
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  // Update & version tracking
  getVersion: () => ipcRenderer.invoke("app:getVersion") as Promise<string>,
  checkForUpdates: () =>
    ipcRenderer.invoke("app:checkForUpdates") as Promise<{
      current: string;
      latest: string;
      title: string;
      downloadUrl: string;
    } | null>,
});
