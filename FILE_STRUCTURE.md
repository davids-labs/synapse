# File Structure

## Top level

- `package.json`: scripts and dependencies
- `electron-builder.json`: desktop packaging configuration
- `build/`: release assets and entitlements
- `test-data/`: sample local course data
- `tests/`: Vitest coverage

## Main process

- `src/main/index.ts`: Electron window bootstrap
- `src/main/ipcHandlers.ts`: preload bridge handlers
- `src/main/nodeScanner.ts`: scans a course into graph/workspace data
- `src/main/fileWatcher.ts`: live filesystem monitoring
- `src/main/gitManager.ts`: local Git integration
- `src/main/hotDropManager.ts`: hot-drop routing

## Renderer

- `src/renderer/App.tsx`: app shell
- `src/renderer/components/graph/`: graph canvas, nodes, links, controls
- `src/renderer/components/topic-center/`: topic workspace and block system
- `src/renderer/components/analytics/`: analytics dashboard
- `src/renderer/components/layout/`: breadcrumb, filters, settings, command palette
- `src/renderer/store/`: Zustand stores
- `src/renderer/utils/`: analytics, kanban, mastery, layout, validation helpers

## Shared

- `src/shared/types.ts`: cross-process types
- `src/shared/schemas.ts`: validation schemas
- `src/shared/constants.ts`: colors, spacing, defaults, view block presets
