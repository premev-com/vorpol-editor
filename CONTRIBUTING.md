# Contributing to Vorpol

Thanks for your interest in contributing! Vorpol is a simple text editor for Windows built with Electron, React, and TypeScript.

## Getting Started

### Prerequisites

- **Bun** (recommended) or Node.js 18+
- Windows 10+ (the app is Windows-only)
- A code editor (VS Code recommended)

### Setup

```bash
git clone https://github.com/premev/vorpol.git
cd vorpol
bun install
```

### Development

```bash
bun run dev
```

This starts the Electron app in development mode with hot reload for the renderer.

### Building

```bash
bun run build
```

Outputs are in `dist/`. The installer is `dist/Vorpol Setup X.Y.Z.exe`.

## Project Structure

```
src/
├── main/           # Electron main process
│   └── file-handlers/  # File type readers (markdown, code, docx, text)
├── preload/        # Context bridge between main and renderer
├── renderer/       # React frontend
│   └── src/
│       ├── components/   # UI components
│       │   └── settings/ # Settings modal and controls
│       ├── types/        # TypeScript type definitions
│       └── styles/       # Global CSS
└── shared/         # Code shared between main and renderer
```

## Making Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Verify the build passes (`bun run build`)
5. Commit using [conventional commits](https://www.conventionalcommits.org/)
6. Push and open a pull request

## Commit Messages

We follow conventional commits:

- `feat:` new feature
- `fix:` bug fix
- `refactor:` code restructuring
- `docs:` documentation
- `chore:` maintenance

## Code Style

- TypeScript strict mode
- React functional components with hooks
- Tailwind CSS for styling
- Prettier formatting (2-space indent, single quotes, trailing commas)

## License

By contributing, you agree that your contributions will be licensed under the [CC BY-NC-SA 4.0](LICENSE) license.
