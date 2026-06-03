import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { join, basename } from "path";
import * as fs from "fs";
import { electronApp, is } from "@electron-toolkit/utils";
import { readFile, isSupportedFile } from "./file-handlers/registry";
import type { FileResult } from "./file-handlers/types";

let mainWindow: BrowserWindow | null = null;
let closeConfirmed = false;

// -- Single-instance lock ------------------------------------------------

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

// -- Helpers -------------------------------------------------------------

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

// -- Window --------------------------------------------------------------

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

// -- IPC handlers --------------------------------------------------------

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
        extensions: [
          "md",
          "txt",
          "docx",
          "js",
          "ts",
          "tsx",
          "jsx",
          "py",
          "json",
          "html",
          "css",
          "rs",
          "go",
          "java",
          "c",
          "cpp",
          "xml",
          "yaml",
          "sql",
          "sh",
        ],
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
  return valid.length === 1 ? valid[0] : valid.length > 1 ? valid : null;
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

// -- Temp file IPC (unsaved tab persistence) -----------------------------

function getTempDir(): string {
  const dir = join(app.getPath("userData"), "temp");
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
  } catch {
    // ignore
  }
  return true;
});

ipcMain.handle("shell:openExternal", async (_, url: string) => {
  return shell.openExternal(url);
});

// -- Update & version tracking ------------------------------------------

const API_URL = process.env.VORPOL_API_URL || "http://localhost:3000";

ipcMain.handle("app:getVersion", () => {
  return app.getVersion();
});

ipcMain.handle("app:checkForUpdates", async () => {
  try {
    const res = await fetch(`${API_URL}/api/releases`);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      success: boolean;
      releases: Array<{
        version: string;
        title: string;
        download_count: number;
      }>;
    };

    if (!data.success || !data.releases?.length) return null;

    // First published release is the latest (ordered desc by publishedAt)
    const latest = data.releases[0]!;
    const currentVersion = app.getVersion();

    if (latest.version !== currentVersion) {
      return {
        current: currentVersion,
        latest: latest.version,
        title: latest.title,
        downloadUrl: `${API_URL}/api/download/latest`,
      };
    }

    return null;
  } catch {
    return null;
  }
});

// -- App lifecycle -------------------------------------------------------

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
