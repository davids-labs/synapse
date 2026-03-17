# SYNAPSE

SYNAPSE is a desktop-first, local-first visual learning operating system for turning course folders into interactive knowledge maps. It runs fully on-device with Electron, React, TypeScript, JSON, Markdown, and Git.

## What it does

- Renders courses as a prerequisite-aware knowledge graph
- Opens every topic into a block-based study workspace
- Tracks mastery from notes, practice, manual overrides, and study decay
- Watches the filesystem for live updates
- Supports quick capture, hot-drop imports, and local Git sync
- Includes exam prep summaries, analytics, and sample thermodynamics data

## Stack

- Electron 28
- React 18
- TypeScript 5
- Vite 5
- Zustand
- D3
- Chokidar
- simple-git
- react-pdf
- KaTeX

## Getting started

```bash
npm install
npm run dev
```

Open the sample course from the homepage to explore the graph and topic center.

You can also use the helper launcher:

```bash
npm run synapse -- dev
npm run synapse -- build
npm run synapse -- run
npm run synapse -- package
npm run synapse -- test
```

## Key scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run electron:build
```

## Project docs

- [USER_GUIDE.md](./USER_GUIDE.md)
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- [FILE_STRUCTURE.md](./FILE_STRUCTURE.md)
- [SHORTCUTS.md](./SHORTCUTS.md)

## Packaging notes

- Electron Builder config lives in [electron-builder.json](./electron-builder.json)
- Build resources live under [build](./build)
- Release artifacts output to `release/`
- Optional update feed can be supplied with `SYNAPSE_UPDATE_URL`

## Current status

The repository now includes the core desktop shell, graph view, topic center, hot-drop capture, analytics, block layout editing, Git integration, and sample data. A few advanced polish items are still iterative, but the app is no longer just a scaffold.
