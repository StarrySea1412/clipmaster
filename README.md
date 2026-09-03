<p align="center">
  <img src="resources/icon.svg" width="120" height="120" alt="ClipMaster Logo">
</p>

<h1 align="center">ClipMaster</h1>

<p align="center">
  <strong>轻量、智能的剪贴板管理器，为高频使用者打造</strong>
</p>

<p align="center">
  <a href="https://github.com/StarrySea1412/clipmaster/actions"><img src="https://img.shields.io/github/actions/workflow/status/StarrySea1412/clipmaster/ci.yml?style=flat-square" alt="构建状态"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="许可证"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square" alt="平台">
  <img src="https://img.shields.io/badge/electron-39-blue?style=flat-square" alt="Electron">
</p>

<p align="center">
  <a href="README.en.md">English</a> | 中文
</p>

---

## 为什么选择 ClipMaster？

大多数剪贴板管理器要么功能过于简单，要么臃肿不堪。ClipMaster 恰好处于中间：**轻量 + 智能**。

| 功能         |    ClipMaster     |     CopyQ     |   Ditto    | ClipChronicle |
| ------------ | :---------------: | :-----------: | :--------: | :-----------: |
| 智能内容分类 |     **支持**      |    不支持     |   不支持   |    不支持     |
| 代码语法高亮 |     **支持**      |    不支持     |   不支持   |    不支持     |
| 颜色值预览   |     **支持**      |    不支持     |   不支持   |    不支持     |
| 链接富预览   |     **支持**      |    不支持     |   不支持   |    不支持     |
| 内存占用     |    **~80 MB**     |    ~120 MB    |   ~50 MB   |    ~200 MB    |
| 跨平台       | **Win/Mac/Linux** | Win/Mac/Linux | 仅 Windows | Win/Mac/Linux |
| 开源协议     |      **MIT**      |      GPL      |    GPL     |      MIT      |

## 核心功能

- **智能内容分类** — 自动识别剪贴板内容类型：代码、链接、颜色、邮箱、纯文本
- **代码语法高亮** — 代码片段自动语言检测并高亮显示（支持 12+ 种语言）
- **颜色值实时预览** — Hex、RGB、HSL 颜色值显示对应色块
- **链接富预览** — URL 显示域名和 favicon 图标
- **分类筛选** — 按内容类型快速过滤剪贴板历史
- **虚拟滚动** — 支持数千条记录无卡顿
- **键盘导航** — 方向键 + 回车，无需鼠标操作
- **全局快捷键** — 可自定义快捷键（默认 `Alt+Shift+V`）
- **置顶功能** — 常用内容置顶显示
- **图片支持** — 复制和预览图片，自动生成缩略图
- **自适应轮询** — 空闲时降低 CPU 占用
- **SQLite 存储** — WAL 模式，预编译 SQL，高效可靠
- **内存优化** — V8 堆内存限制、缩略图去重、分批清理
- **隐私优先** — 所有数据本地存储，无网络请求（favicon 获取可选）

## 安装

### 下载安装包

前往 [Releases](https://github.com/StarrySea1412/clipmaster/releases/latest) 下载对应平台的最新版本：

| 平台    | 文件                          |
| ------- | ----------------------------- |
| Windows | `clipmaster-x.y.z-setup.exe`  |
| macOS   | `clipmaster-x.y.z.dmg`        |
| Linux   | `clipmaster-x.y.z.AppImage` / `.deb` |

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/StarrySea1412/clipmaster.git
cd clipmaster

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建当前平台安装包
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## 使用

1. 启动 ClipMaster，它会显示在系统托盘
2. 复制任何内容 — 文本、代码、链接、颜色、图片
3. 按 `Alt+Shift+V`（可自定义）打开面板
4. 点击条目即可复制回剪贴板
5. 使用筛选栏按类型过滤
6. 右键菜单可以设置快捷键和清空历史

## 技术栈

| 层级     | 技术                        |
| -------- | --------------------------- |
| 框架     | Electron 39 + electron-vite |
| 渲染层   | React 19 + TypeScript       |
| 数据库   | better-sqlite3（WAL 模式）  |
| 高亮     | highlight.js（按需引入）    |
| 打包     | electron-builder            |

## 项目结构

```
src/
├── main/                   # Electron 主进程
│   ├── index.ts            # 应用入口、窗口管理
│   ├── database.ts         # SQLite 操作
│   ├── storage.ts          # 数据库与设置文件路径管理
│   ├── clipboardWatcher.ts # 自适应轮询的剪贴板监听
│   ├── imageStore.ts       # 图片存取与缩略图
│   ├── ipc.ts              # IPC 处理注册
│   ├── shortcut.ts         # 全局快捷键
│   └── tray.ts             # 系统托盘
├── preload/                # Context bridge 预加载
├── renderer/               # React UI
│   └── src/
│       ├── components/
│       │   ├── ClipboardList.tsx  # 虚拟列表 + 卡片渲染
│       │   ├── FilterBar.tsx      # 分类筛选
│       │   ├── SearchBar.tsx
│       │   └── Settings.tsx
│       └── hooks/
│           └── useClipboard.ts
└── shared/                 # 主进程与渲染层共享
    ├── types.ts            # 类型定义
    └── classifier.ts       # 内容分类引擎
```

## 贡献

欢迎各种形式的贡献！开发环境搭建、编码规范和 PR 指南请参考 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE) — 可自由使用、修改和分发。
