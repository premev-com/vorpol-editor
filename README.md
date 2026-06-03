# Vorpol — App

A desktop text/code editor for Windows. Supports Markdown, plain text, and code files with syntax highlighting and live preview.

## Stack

- **Electron** 42
- **React** 18 + TypeScript
- **CodeMirror** 6 (editor)
- **Tailwind CSS** 4
- **electron-vite** (bundler)

## Getting Started

```bash
bun install
bun run dev
```

Set `VORPOL_API_URL` in `.env` to point to the API server (defaults to `http://localhost:3000`).

## Build

```bash
bun run build
```

## Project Structure

```
src/
├── main/              # Electron main process
│   ├── index.ts       # Window, IPC, updates
│   └── file-handlers/ # File reading/writing
├── preload/
│   └── index.ts       # Context bridge API
├── renderer/
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── EditorArea.tsx
│       │   ├── TitleBar.tsx
│       │   ├── Menubar.tsx
│       │   ├── Preview.tsx
│       │   └── settings/
│       ├── lib/
│       ├── styles/
│       └── types/
└── shared/
```

## Features

- Tabbed editing for `.md`, `.txt`, code files
- Syntax highlighting via CodeMirror
- Markdown preview with sync scroll
- DOCX preview (via mammoth)
- Auto-save and unsaved tab persistence
- Frameless window with custom title bar
- Version check and update notification
