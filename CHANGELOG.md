# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-18

### Added

- **Core Features**
  - Clipboard history management with SQLite storage
  - Text and image clipboard content detection and categorization
  - Content categorization (text, code, link, email, color)
  - Pin/unpin important clipboard items
  - Full-text search across clipboard history
  - Global shortcut support (default: Alt+Shift+V)
  - Custom shortcuts for quick paste

- **UI/UX**
  - Modern dark theme interface
  - Real-time weather widget with location search
  - Memo/To-do functionality with reminders
  - Memory usage statistics display
  - Category filtering and tabs

- **System Integration**
  - System tray icon with context menu
  - Startup with system option (auto-launch)
  - Data export/import functionality
  - Multi-language support (English, Chinese)

- **Performance**
  - Lazy image loading with Intersection Observer
  - Content classification caching
  - Virtual scrolling for large lists
  - Debounced search input

### Technical Stack

- **Frontend**: React 19, TypeScript, CSS Variables
- **Backend**: Electron 39, better-sqlite3
- **Build**: electron-vite, electron-builder
- **Icons**: Lucide React

## [0.0.1] - 2026-03-01

### Added

- Initial release
- Basic clipboard monitoring
- Text content storage
- Simple UI with search

---

## Roadmap

### [0.2.0] - Planned

- [ ] Multi-platform builds (macOS, Linux)
- [ ] Code signing for production releases
- [ ] Cloud sync functionality
- [ ] Keyboard shortcut conflict detection
- [ ] Clipboard templates
- [ ] Encrypted storage for sensitive content

### [0.3.0] - Future

- [ ] Plugin system
- [ ] Custom workflows
- [ ] Mobile companion app
