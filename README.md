<p align="center">
  <img src="resources/icon.svg" width="120" height="120" alt="ClipMaster Logo">
</p>

<h1 align="center">ClipMaster</h1>

<p align="center">
  <strong>Lightweight, intelligent clipboard manager for power users</strong>
</p>

<p align="center">
  <a href="https://github.com/StarrySea1412/clipmaster/actions"><img src="https://img.shields.io/github/actions/workflow/status/StarrySea1412/clipmaster/ci.yml?style=flat-square" alt="Build Status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/electron-39-blue?style=flat-square" alt="Electron">
</p>

<p align="center">
  <a href="README.zh-CN.md">中文文档</a>
</p>

---

<p align="center">
  <!-- TODO: Replace with actual GIF/screenshot after first release -->
  <img src="https://via.placeholder.com/720x450?text=ClipMaster+Demo" width="720" alt="ClipMaster Demo">
</p>

## Why ClipMaster?

Most clipboard managers are either too simple or bloated with unnecessary features. ClipMaster sits in the sweet spot: **lightweight + intelligent**.

| Feature                      |    ClipMaster     |     CopyQ     |  Ditto  | ClipChronicle |
| ---------------------------- | :---------------: | :-----------: | :-----: | :-----------: |
| Smart content classification |      **Yes**      |      No       |   No    |      No       |
| Code syntax highlighting     |      **Yes**      |      No       |   No    |      No       |
| Color value preview          |      **Yes**      |      No       |   No    |      No       |
| Link rich preview (favicon)  |      **Yes**      |      No       |   No    |      No       |
| Memory footprint             |    **~80 MB**     |    ~120 MB    | ~50 MB  |    ~200 MB    |
| Cross-platform               | **Win/Mac/Linux** | Win/Mac/Linux | Windows | Win/Mac/Linux |
| Open source                  |      **MIT**      |      GPL      |   GPL   |      MIT      |

## Features

- **Intelligent Content Classification** — Automatically detects and tags clipboard content as code, link, color, email, or plain text using zero-dependency regex analysis
- **Code Syntax Highlighting** — Copied code snippets are displayed with language-aware syntax highlighting (12+ languages)
- **Color Value Preview** — Hex, RGB, and HSL color values show a live color swatch
- **Link Rich Preview** — URLs display the domain name with a favicon
- **Category Filtering** — Quickly filter your clipboard history by content type
- **Virtual Scrolling** — Handles thousands of entries without UI lag
- **Keyboard Navigation** — Arrow keys + Enter for mouse-free workflow
- **Global Hotkey** — Configurable shortcut to summon ClipMaster from anywhere (default: `Alt+Shift+V`)
- **Pin Important Items** — Pin frequently used snippets to the top
- **Image Support** — Copies and previews images with automatic thumbnail generation
- **Adaptive Polling** — Reduces CPU usage when idle
- **SQLite Storage** — Fast, reliable, WAL-mode database with prepared statements
- **Memory Optimized** — Constrained V8 heap, thumbnail-based deduplication, chunked history cleanup
- **Privacy First** — All data stays local, no network requests (except optional favicon fetch)

## Installation

### Download

> Releases coming soon. For now, build from source.

### Build from Source

```bash
# Clone
git clone https://github.com/StarrySea1412/clipmaster.git
cd clipmaster

# Install dependencies
npm install

# Development
npm run dev

# Build for your platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Usage

1. Launch ClipMaster — it lives in your system tray
2. Copy anything — text, code, links, colors, images
3. Press `Alt+Shift+V` (configurable) to open the clipboard panel
4. Click any item to copy it back to clipboard
5. Use the filter bar to narrow by content type
6. Right-click for settings and history management

## Tech Stack

| Layer        | Technology                  |
| ------------ | --------------------------- |
| Framework    | Electron 39 + electron-vite |
| Renderer     | React 19 + TypeScript       |
| Database     | better-sqlite3 (WAL mode)   |
| Highlighting | highlight.js (tree-shaken)  |
| Build        | electron-builder            |

## Project Structure

```
src/
├── main/                  # Electron main process
│   ├── index.ts           # App entry, window management
│   ├── database.ts        # SQLite operations
│   ├── clipboardWatcher.ts# Clipboard polling with adaptive interval
│   ├── imageStore.ts      # Image save/read/thumbnail
│   ├── ipc.ts             # IPC handler registration
│   ├── shortcut.ts        # Global hotkey management
│   └── tray.ts            # System tray
├── preload/               # Context bridge
├── renderer/              # React UI
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   ├── ClipboardList.tsx  # Virtual list + card rendering
│       │   ├── FilterBar.tsx      # Category filter buttons
│       │   ├── SearchBar.tsx
│       │   └── Settings.tsx
│       └── hooks/
│           └── useClipboard.ts
└── shared/                # Shared between main & renderer
    ├── types.ts           # ClipboardItem, ClipboardAPI, ContentCategory
    └── classifier.ts      # Content classification engine
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding conventions, and pull request guidelines.

## License

[MIT](LICENSE) — feel free to use, modify, and distribute.
