# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

MineContext is a proactive context-aware AI partner. It consists of:
- **OpenContext** (`opencontext/`): Python backend that captures, processes, stores, and serves contextual data (screenshots, files, chats) via FastAPI.
- **Frontend** (`frontend/`): Electron + React + TypeScript desktop app that wraps the backend and provides the UI.

## Common Commands

### Backend (Python)

Prerequisites: Python >=3.10. Prefer `uv` for dependency management.

```bash
# Install dependencies (uv preferred)
uv sync

# Run backend server directly (for development)
uv run opencontext start
uv run opencontext start --config config/config.yaml --port 9000

# Alternative with traditional venv
python -m venv venv && source venv/bin/activate
pip install -e .
opencontext start

# Build standalone backend executable (PyInstaller)
./build.sh
# Output: dist/main/main
```

Code formatting (enforced by pre-commit):
```bash
black .
isort .
```

### Frontend (Electron)

Prerequisites: Node.js 20+, pnpm.

```bash
cd frontend
pnpm install

# Development (hot-reload, launches Electron with dev backend)
pnpm dev

# Type check
pnpm typecheck

# Lint and format
pnpm lint
pnpm format

# Build production app
pnpm build:mac     # macOS
pnpm build:win     # Windows
pnpm build:linux   # Linux
```

### Quick Start (dev)

```bash
# One-command dev (fish shell, backend + frontend)
fish dev.fish

# macOS app launcher (double-click from ~/Applications)
~/Applications/MineContext.app
# Drag to Dock for one-click access.

# Or manually:
# Terminal 1: backend
.venv/bin/python3 -m opencontext.cli start
# Terminal 2: frontend (with bun)
cd frontend && PYTHON=../.venv/bin/python3 npm_config_python=../.venv/bin/python3 bun run dev
```

### Full Development Environment

A convenience script bootstraps both backend and frontend:
```bash
./frontend/start-dev.sh          # Full setup: build backend + setup frontend + pnpm dev
./frontend/start-dev.sh backend  # Build backend only
./frontend/start-dev.sh frontend # Setup frontend only
```

### Pre-commit

The repo has pre-commit hooks for `black`, `isort`, and frontend `typecheck`. Install with:
```bash
pre-commit install
```

## High-Level Architecture

### Backend (`opencontext/`)

The backend follows a layered, event-driven pipeline:

```
Capture → Processing → Storage → LLM → Consumption
```

Key architectural layers:

1. **Context Capture** (`context_capture/`)
   - Sources: screenshots (`screenshot.py`), folder/file monitoring (`folder_monitor.py`, `vault_document_monitor.py`), web links (`web_link_capture.py`).
   - Orchestrated by `managers/capture_manager.py`.
   - New sources implement `interfaces/capture_interface.py`.

2. **Context Processing** (`context_processing/`)
   - `chunker/` - document segmentation
   - `processor/` - multimodal understanding, entity extraction, knowledge extraction
   - `merger/` - merging processed chunks
   - Orchestrated by `managers/processor_manager.py`.
   - New processors implement `interfaces/processor_interface.py`.

3. **Storage** (`storage/`)
   - `global_storage.py` - unified storage facade
   - `unified_storage.py` - main storage logic
   - `backends/` - SQLite + ChromaDB/Qdrant vector stores
   - New backends implement `interfaces/storage_interface.py`.

4. **LLM Layer** (`llm/`)
   - `llm_client.py` - general LLM client
   - `global_vlm_client.py` - vision-language model client (screenshot understanding)
   - `global_embedding_client.py` - embedding client for vectorization

5. **Consumption** (`context_consumption/`)
   - `completion/` - smart completion service
   - `context_agent/` - agent-based workflow engine
   - `generation/` - content generation
   - Exposes an MCP server and REST API for upstream use.

6. **Server** (`server/`)
   - `opencontext.py` - core class integrating all managers and components
   - `api.py` - FastAPI router aggregation
   - `routes/` - individual route modules (`agent_chat.py`, `completions.py`, `context.py`, `debug.py`, `documents.py`, `events.py`, `messages.py`, `monitoring.py`, `screenshots.py`, `settings.py`, `vaults.py`, etc.)
   - `component_initializer.py` - wires up capture/processor/consumption components based on config
   - `context_operations.py` - high-level context CRUD operations

7. **Tools** (`tools/`)
   - Exposes retrieval and operation tools to the agent layer.
   - `retrieval_tools/` - semantic/hybrid search, entity/timeline retrieval
   - `operation_tools/` - context mutations
   - `profile_tools/` - user profile operations

Configuration is layered: built-in defaults → `config/config.yaml` → environment variables → runtime API updates. Env var substitution (`${VAR}` or `${VAR:default}`) is supported in `config.yaml`.

### Frontend (`frontend/`)

Electron app built with `electron-vite`.

Process structure:
```
Main Process (src/main/)
  ├─ index.ts          - entry point
  ├─ backend.ts        - spawns/manages Python backend subprocess
  ├─ ipc.ts            - IPC handler registration
  └─ services/         - main-thread services (Database, Screenshot, Tray, FileStorage, etc.)

Preload (src/preload/)
  └─ index.ts          - exposes safe APIs to renderer via contextBridge

Renderer Process (src/renderer/src/)
  ├─ App.tsx           - root component, checks backend status, shows settings on first run
  ├─ Router.tsx        - page routing
  ├─ pages/            - top-level pages (home, vault, files, settings, screen-monitor, ai-demo)
  ├─ components/       - reusable UI components (ai-assistant, ai-elements, markdown-editor, vault-tree, ui/)
  ├─ store/            - Redux store with redux-persist (chat-history, vault, screen, navigation, events)
  ├─ hooks/            - custom React hooks (use-chat-stream, use-vault, use-screen, etc.)
  ├─ services/         - renderer-side API services (axios, chat stream, conversations, messages)
  ├─ atom/             - Jotai atoms for lightweight state (capture.atom, event-loop.atom)
  └─ types/            - TypeScript type definitions
```

Key architectural patterns:
- **State**: Redux (redux-persist) for persistent global state, Jotai atoms for transient/local state.
- **IPC**: All main-to-renderer communication goes through `src/preload/index.ts`. The renderer accesses it via `window.electron.ipcRenderer`.
- **Backend lifecycle**: Main process spawns the Python executable (`backend.ts`), monitors its health, and exposes status via IPC. The renderer shows a loading screen until the backend reports `running`.
- **Database**: Renderer uses Dexie (IndexedDB) for local data; main process uses better-sqlite3 for larger structured data.

### IPC and Services

Main process services are instantiated in `src/main/index.ts` and communicate with the renderer via IPC channels defined in `src/main/ipc.ts`. The preload script (`src/preload/index.ts`) whitelists these channels for the renderer.

Key services in main process:
- `ScreenshotService` - captures screenshots
- `FileStorage` / `FileService` - file operations
- `DatabaseService` / `VaultDatabaseService` - SQLite data access
- `MessagesService` - message queue management
- `TrayService` - system tray integration
- `ExpressService` - lightweight Express server for internal needs
- `ProxyManager` - proxy configuration

## Code Style and Conventions

- **Python**: Black with `line-length = 100`, isort with `profile = black`. Exclude `frontend/` and `node_modules/`.
- **TypeScript**: Prettier + ESLint. The project uses React 19, TypeScript 5.8, Tailwind CSS v4.
- **Branch naming**: `feature/`, `fix/`, `hotfix/`, `docs/`, `refactor/`, `test/`, `chore/` prefixes.

## Important File Locations

| Purpose | Path |
|---|---|
| Python entry | `opencontext/cli.py` |
| Core backend class | `opencontext/server/opencontext.py` |
| Backend routes | `opencontext/server/routes/` |
| Backend config | `config/config.yaml` |
| PyInstaller spec | `opencontext.spec` |
| Frontend entry | `frontend/src/main/index.ts` |
| Frontend renderer entry | `frontend/src/renderer/src/main.tsx` |
| Frontend dev script | `frontend/start-dev.sh` |
| Electron builder config | `frontend/electron-builder.yml` |
| CI/CD | `.github/workflows/release.yml` |
