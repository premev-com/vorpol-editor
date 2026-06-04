# Vorpol: Windows Application

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

A desktop text/code editor for Windows. Supports Markdown, plain text, and code files with syntax highlighting and live preview.

> **Repository:** [github.com/premev-com/vorpol-app](https://github.com/premev-com/vorpol-app)

## System Requirements

- **Windows** 10 or later
- **Bun** (recommended) or **Node.js** 18+

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

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on submitting pull requests, reporting issues, and setting up your development environment.
