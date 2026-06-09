import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { join, basename } from "path";
import * as fs from "fs";
import { electronApp, is } from "@electron-toolkit/utils";
import { readFile, isSupportedFile } from "./file-handlers/registry";
import type { FileResult } from "./file-handlers/types";
import { CODE_EXTENSIONS, OTHER_EXTENSIONS } from "../shared/extensions";
import { autoUpdater } from "electron-updater";

let mainWindow: BrowserWindow | null = null;
let closeConfirmed = false;

// Single-instance lock

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const filePath = extractFileFromArgs(argv);
    if (filePath) {
      sendFileToRenderer(filePath);
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Helpers

/** Pull the first supported file path from argv (case-insensitive). */
function extractFileFromArgs(argv: string[]): string | null {
  return (
    argv.find((arg) => {
      if (arg.startsWith("-")) return false;
      return isSupportedFile(arg);
    }) ?? null
  );
}

async function sendFileToRenderer(filePath: string): Promise<void> {
  if (!mainWindow) return;
  try {
    const result = await readFile(filePath);
    mainWindow.webContents.send("file:openExternal", result);
  } catch (err) {
    console.error("Failed to send file to renderer:", err);
  }
}

// Window

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "Vorpol",
    icon: join(__dirname, "../../resources/vorpol.png"),
    backgroundColor: "#171717",
    frame: false,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow!.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("close", (e) => {
    if (closeConfirmed) return;
    e.preventDefault();
    mainWindow?.webContents.send("window:closeRequest");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Notify renderer when maximized state changes (for frameless title bar)
  mainWindow.on("maximize", () =>
    mainWindow?.webContents.send("window:maximizeChange", true),
  );
  mainWindow.on("unmaximize", () =>
    mainWindow?.webContents.send("window:maximizeChange", false),
  );
}

// IPC handlers

/** Renderer calls this on mount — returns a cold-start file if one was passed via command line. */
ipcMain.handle("renderer:ready", async () => {
  const filePath = extractFileFromArgs(process.argv);
  if (!filePath) return null;
  try {
    return await readFile(filePath);
  } catch (err) {
    console.error("Failed to read cold-start file:", err);
    return null;
  }
});

/** Open a file by absolute path; used by drag-and-drop in the renderer. */
ipcMain.handle("file:openPath", async (_, filePath: string) => {
  try {
    return await readFile(filePath);
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err);
    return null;
  }
});

// Window controls for frameless title bar
ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on("window:close", () => mainWindow?.close());
ipcMain.handle("window:isMaximized", () => mainWindow?.isMaximized() ?? false);

// Renderer responds to close-request
ipcMain.on("window:closeConfirm", () => {
  closeConfirmed = true;
  setImmediate(() => mainWindow?.close());
});
ipcMain.on("window:closeCancel", () => {
  // do nothing — close was cancelled
});

ipcMain.handle("file:open", async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Supported Files",
        extensions: [...OTHER_EXTENSIONS, ...CODE_EXTENSIONS],
      },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const files = await Promise.all(
    result.filePaths.map(async (fp) => {
      try {
        return await readFile(fp);
      } catch (err) {
        console.error(`Failed to read ${fp}:`, err);
        return null;
      }
    }),
  );
  const valid = files.filter((f): f is FileResult => f !== null);
  if (valid.length === 1) {
    return valid[0];
  }
  if (valid.length > 1) {
    return valid;
  }
  return null;
});

ipcMain.handle(
  "file:save",
  async (_, { filePath, content }: { filePath: string; content: string }) => {
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  },
);

ipcMain.handle("file:saveAs", async (_, { content }: { content: string }) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: "untitled.md",
    filters: [
      { name: "Markdown", extensions: ["md"] },
      { name: "Text", extensions: ["txt"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  if (result.canceled || !result.filePath) return null;
  fs.writeFileSync(result.filePath, content, "utf-8");
  return { path: result.filePath, name: basename(result.filePath) };
});

// Temp file IPC (unsaved tab persistence)

function getTempDir(): string {
  const folder = is.dev ? "vorpol-dev-temp" : "vorpol-temp";
  const dir = join(app.getPath("userData"), folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

ipcMain.handle(
  "temp:save",
  async (_, { tabId, content }: { tabId: string; content: string }) => {
    const filePath = join(getTempDir(), `${tabId}.txt`);
    fs.writeFileSync(filePath, content, "utf-8");
    return true;
  },
);

ipcMain.handle("temp:delete", async (_, { tabId }: { tabId: string }) => {
  const filePath = join(getTempDir(), `${tabId}.txt`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
});

ipcMain.handle("temp:list", async () => {
  try {
    const dir = getTempDir();
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt"));
    return files.map((f) => ({
      tabId: f.replace(".txt", ""),
      content: fs.readFileSync(join(dir, f), "utf-8"),
    }));
  } catch {
    return [];
  }
});

ipcMain.handle("temp:clear", async () => {
  try {
    const dir = getTempDir();
    for (const f of fs.readdirSync(dir)) fs.unlinkSync(join(dir, f));
  } catch (err) {
    console.error("Failed to clear temp files:", err);
  }
  return true;
});

// Session persistence (continue where you left off)

const SESSION_FILE = "session.json";

ipcMain.handle("session:save", async (_, sessionData: unknown) => {
  try {
    const dir = getTempDir();
    const filePath = join(dir, SESSION_FILE);
    if (sessionData == null) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return true;
    }
    fs.writeFileSync(filePath, JSON.stringify(sessionData), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to save session:", err);
    return false;
  }
});

ipcMain.handle("session:load", async () => {
  try {
    const filePath = join(getTempDir(), SESSION_FILE);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
});

ipcMain.handle("shell:openExternal", async (_, url: string) => {
  return shell.openExternal(url);
});

// Update & version tracking

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on("checking-for-update", () => {
  mainWindow?.webContents.send("update:checking");
});

autoUpdater.on("update-available", (info) => {
  mainWindow?.webContents.send("update:available", info);
});

autoUpdater.on("update-not-available", (info) => {
  mainWindow?.webContents.send("update:not-available", info);
});

autoUpdater.on("download-progress", (progress) => {
  mainWindow?.webContents.send("update:download-progress", progress);
});

autoUpdater.on("update-downloaded", (info) => {
  mainWindow?.webContents.send("update:downloaded", info);
});

autoUpdater.on("error", (error) => {
  mainWindow?.webContents.send("update:error", error.message);
});

ipcMain.handle("app:getVersion", () => {
  return app.getVersion();
});

ipcMain.handle("update:check", async () => {
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    console.error("Update check failed:", err);
  }
});

ipcMain.handle("update:download", async () => {
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Update download failed:", message);
    mainWindow?.webContents.send("update:error", message);
  }
});

ipcMain.handle("update:install", () => {
  autoUpdater.quitAndInstall();
});

// App lifecycle

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.vorpol.app");

  createWindow();

  app.on("open-file", (_event, filePath) => {
    sendFileToRenderer(filePath);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
