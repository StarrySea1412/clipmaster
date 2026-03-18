# Contributing to ClipMaster

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/clipmaster/clipmaster.git
cd clipmaster

# Install dependencies
npm install

# Start in dev mode (hot-reload)
npm run dev
```

### Prerequisites

- Node.js 20+
- npm 9+
- Git

## Project Architecture

```
src/main/       → Electron main process (Node.js)
src/preload/    → Context bridge between main and renderer
src/renderer/   → React UI (runs in Chromium)
src/shared/     → Code shared between main and renderer
```

- **Main process**: Database, clipboard polling, image storage, IPC handlers, tray, shortcuts
- **Renderer**: React components, hooks, CSS
- **Shared**: TypeScript types and the content classifier (pure functions, no Electron/React deps)

## Scripts

| Command               | Description                      |
| --------------------- | -------------------------------- |
| `npm run dev`         | Start dev server with hot-reload |
| `npm run build`       | Typecheck + build                |
| `npm run lint`        | Run ESLint                       |
| `npm run typecheck`   | Run TypeScript compiler checks   |
| `npm run build:win`   | Package for Windows              |
| `npm run build:mac`   | Package for macOS                |
| `npm run build:linux` | Package for Linux                |

## Code Conventions

- **TypeScript** everywhere — no `any` unless absolutely necessary
- **Functional React** — hooks, no class components
- **Shared types** live in `src/shared/types.ts`
- Keep renderer imports from `src/shared/` to pure functions only (no Node.js APIs)
- CSS uses BEM-style naming: `.block__element--modifier`

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm run lint` and `npm run typecheck` to verify
4. Write a clear PR description explaining what and why
5. Submit the PR

## Reporting Issues

When filing an issue, please include:

- OS and version
- ClipMaster version
- Steps to reproduce
- Expected vs actual behavior

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
