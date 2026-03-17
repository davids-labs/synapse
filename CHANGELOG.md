# Changelog

## 1.0.5

- Hardened CSV import reliability with malformed-file detection, delimiter mismatch guidance, and stricter import readiness checks.
- Improved CSV import/export modal safety with focus trapping, shortcut isolation, and preview-required guardrails.
- Fixed PDF loading for Windows paths and added clearer in-app PDF load/index error messaging.
- Reduced non-fullscreen header vertical footprint for better content visibility on shorter windows.
- Smoothed graph interaction and rendering with rAF-based panning, stable node lookup, and improved link/node visuals.
- Added file delete flow from file-browser modules with workspace-safe main-process validation.
- Added per-workspace sync concurrency guard to prevent overlapping Git sync operations.
- Hardened updater lifecycle handling with better packaged vs development diagnostics and install timing guards.

## 1.0.0

- Initial SYNAPSE desktop release
- Local-first Electron + React + TypeScript application shell
- D3 knowledge graph with prerequisite-aware nodes
- Topic center with modular study blocks
- Notes, formulas, PDFs, practice, resources, kanban, timeline, and image tooling
- Hot-drop capture, quick capture, Git sync, mastery scoring, and decay alerts
- Exam prep mode, analytics dashboard, and packaging scaffolding
