# Developer Guide

## Architecture

`src/main`
- Electron main process
- File IO, IPC, Git, watchers, hot-drop manager, syllabus and node scanning

`src/renderer`
- React UI
- Graph, topic center, homepage, analytics, settings, stores, hooks, and utilities

`src/shared`
- Shared TypeScript contracts, constants, and schemas used by both processes

## Data flow

1. The renderer requests bootstrap or course data over the preload bridge.
2. The main process scans the course folder and returns:
   - syllabus
   - graph data
   - node workspaces
   - decay alerts
3. Zustand stores hold the active course and UI state.
4. File watcher and hot-drop events push updates back into the renderer.

## Persistence model

- `notes.md` stores notes
- `_node.json` stores mastery state, weak spots, PDF page memory, and view block layout
- `tasks.json` stores kanban columns and tasks
- `formulas.json` stores formula entries
- `_meta/graph-layout.json` stores graph positions

## Testing

```bash
npm run lint
npm run test
npm run build
```

Unit tests currently cover:
- mastery logic
- schema validation
- exam prep logic
- analytics aggregation
- block layout helpers
- kanban utilities

## Packaging

- Builder config: `electron-builder.json`
- Build resources: `build/`
- Optional update feed: set `SYNAPSE_UPDATE_URL` and `SYNAPSE_UPDATE_CHANNEL`
- Platform builds:
  - `npm run electron:build:win`
  - `npm run electron:build:mac`
  - `npm run electron:build:linux`

## Recommended next polish areas

- Signed release assets and generated icon files
- richer PDF search and thumbnails
- deeper analytics history
- release automation and update distribution infrastructure
