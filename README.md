<div align="center">
  <img src="./build/icons/icon.png" alt="SYNAPSE" width="88" />

# SYNAPSE

<p><strong>Calm, local-first learning workspace.</strong><br/>Designed for deep focus, real files, and reliable sync.</p>

<p>
  <img src="https://img.shields.io/badge/Desktop-Electron-111111?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/UI-React-111111?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-111111?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Workspace-Local--first-111111?style=for-the-badge" alt="Local first" />
  <img src="https://img.shields.io/badge/License-MIT-111111?style=for-the-badge" alt="MIT" />
</p>

<!-- Optional dynamic widget placeholders -->
<!--
<img src="https://readme-typing-svg.demolab.com?font=Inter&weight=600&size=22&duration=2500&pause=800&center=true&vCenter=true&width=700&lines=Desktop-first+learning+OS;Graph+workspace+with+file-backed+modules;Reliable+Git+sync+across+devices" alt="Typing header"/>
<img src="https://github-readme-stats.vercel.app/api?username=<USER>&repo=<REPO>&show_icons=true&hide_border=true" alt="GitHub stats"/>
-->
</div>

---

<a id="top"></a>

<div align="center">
<table>
  <tr>
    <td align="center"><a href="#overview">Overview</a></td>
    <td align="center"><a href="#features">Features</a></td>
    <td align="center"><a href="#installation">Installation</a></td>
    <td align="center"><a href="#first-run">First Run</a></td>
    <td align="center"><a href="#csv-import">CSV Import</a></td>
    <td align="center"><a href="#sync-model">Sync Model</a></td>
    <td align="center"><a href="#project-structure">Structure</a></td>
    <td align="center"><a href="#troubleshooting">Troubleshooting</a></td>
    <td align="center"><a href="#contributing">Contributing</a></td>
  </tr>
</table>
</div>

---

<a id="overview"></a>
## Overview

SYNAPSE is a desktop-first learning operating system that turns folders into living study spaces.

It combines:

- graph navigation across bases and nodes
- freeform module canvas
- real file-backed workflows (`.md`, `.pdf`, `.csv`, images, code)
- Workspace Reliability: snapshot, sync, diagnostics, conflict recovery

Recommended split:

```text
C:/dev2/synapse                                 # App source repo
C:/Users/<you>/Documents/SYNAPSE-Workspace      # Workspace data repo
```

This separation keeps app shipping and personal data syncing independent.

---

<a id="features"></a>
## Features

<details open>
  <summary><strong>Product Surface</strong></summary>

- Home dashboard with recent work and cross-base visibility
- visual graph + tree navigation
- module canvas with drag, resize, fullscreen focus
- Quick Capture for notes, links, files, and screenshots
- Browser Surface and web embedding support

</details>

<details>
  <summary><strong>Workspace Reliability</strong></summary>

- manual snapshot commits
- sync now flow (pull + push lifecycle)
- startup pull awareness
- offline queue and retry
- conflict resolver (`mine`, `theirs`, `smart`, `manual`)
- branch/history visibility and diagnostics

</details>

<details>
  <summary><strong>Local-first File System</strong></summary>

- content saved into your workspace repo as real files
- markdown, PDFs, images, code, csv and json all remain inspectable
- easy external backup and migration because data is not trapped in hidden DBs

</details>

---

<a id="installation"></a>
## Installation

<details open>
  <summary><strong>Install from GitHub Release (recommended)</strong></summary>

1. Download latest `SYNAPSE-Setup-<version>.exe` from Releases.
2. Run installer.
3. Launch SYNAPSE from Start menu / Desktop.
4. Set workspace path to your workspace repo folder.

</details>

<details>
  <summary><strong>Developer Run</strong></summary>

```bash
npm install
npm run dev
```

Helpers:

```bash
npm run synapse -- dev
npm run synapse -- build
npm run synapse -- run
npm run synapse -- package
npm run synapse -- test
```

</details>

<details>
  <summary><strong>Packaging Commands</strong></summary>

```bash
npm run electron:build
npm run electron:build:win
npm run electron:build:mac
npm run electron:build:linux
```

</details>

---

<a id="first-run"></a>
## First Run

1. Launch SYNAPSE.
2. Create/connect workspace repo:

```bash
git clone https://github.com/davids-labs/synapsesync.git C:/Users/<you>/Documents/SYNAPSE-Workspace
```

3. In app settings, set `basePath` to that folder.
4. Enable Git/Workspace Reliability.

First sync checklist:

- remote configured
- branch exists (`main`)
- upstream configured (`origin/main`)
- diagnostics healthy/understandable

Useful shortcuts:

- `Ctrl+K` command palette
- `Ctrl+Shift+C` quick capture
- `Ctrl+Shift+S` sync
- `Ctrl+Shift+I` import CSV
- `Ctrl+Shift+E` export CSV

---

<a id="csv-import"></a>
## CSV Import

SYNAPSE supports schema-tolerant CSV import via `Ctrl+Shift+I`.

<details open>
  <summary><strong>Import Types</strong></summary>

- `syllabus`: creates nodes beneath selected entity
- `modules`: appends modules to selected page
- `practice`: merges/replaces questions by id
- `custom`: copies CSV into `files/imports/`

</details>

<details>
  <summary><strong>Parser Rules</strong></summary>

- delimiters: comma, semicolon, tab
- quoted values and escaped quotes supported
- CRLF/LF normalized
- preview shows headers + first 6 rows

</details>

<details>
  <summary><strong>Column Mapping (high signal)</strong></summary>

Practice:

- `question_id|id`, `title`, `type`, `difficulty`, `source|topic`, `tags`, `correct`

Modules:

- `module_id`, `type`, `title`, `position_x|x`, `position_y|y`, `width`, `height`, `config`
- optional: `canvas_x`, `canvas_y`, `canvas_width`, `canvas_height`

Syllabus:

- `node_id|id`, `title`, `parent_id`, `exam_weight`, `prerequisites`, `category`, `estimated_hours`

</details>

<details>
  <summary><strong>Constraints + Best Practices</strong></summary>

- keep stable ids for recurring imports
- validate delimiter and header names in preview first
- import into a test node before production
- sync/commit immediately after successful import
- split very large csv files into batches for better feedback

</details>

Minimal practice example:

```csv
question_id,title,type,difficulty,source,tags,correct
q-001,First law derivation,derivation,hard,Thermodynamics,"exam|laws",0
q-002,Entropy concept check,multiple-choice,medium,Thermodynamics,"review|entropy",1
```

---

<a id="sync-model"></a>
## Sync Model

Git sync is robust for single-user multi-device workflows, with clear constraints:

- not realtime collaboration
- conflicts possible if same files are edited on two devices before syncing
- large binary files (PDF/media) sync, but can be slower

Recommended habit:

1. Sync before leaving machine A.
2. Sync after opening machine B.
3. Avoid parallel edits of the same entity/files.

---

<a id="project-structure"></a>
## Project Structure

- `src/main`: Electron main process, IPC, Git manager, workspace store
- `src/renderer`: React UI, graph, canvas, settings command center
- `src/shared`: shared schemas, types, constants
- `tests`: test suites
- `output/playwright`: smoke artifacts/screenshots

Additional docs:

- [USER_GUIDE.md](./USER_GUIDE.md)
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- [FILE_STRUCTURE.md](./FILE_STRUCTURE.md)
- [SHORTCUTS.md](./SHORTCUTS.md)

---

<a id="troubleshooting"></a>
## Troubleshooting

- **No remote configured:** add workspace `origin` and rerun diagnostics.
- **Branch not tracking upstream:** run `git push -u origin main` once.
- **Queued offline:** retry sync when network returns.
- **Conflict detected:** resolve in modal, then sync again.
- **Wrong workspace opens:** verify app `basePath` points to your real workspace repo folder.

---

<a id="contributing"></a>
## Contributing

<div align="center">

### Build something excellent

Contributions are welcome across modules, reliability, docs, and UX quality.

<a href="./DEVELOPER_GUIDE.md">Developer Guide</a> ·
<a href="./FILE_STRUCTURE.md">File Structure</a> ·
<a href="./SHORTCUTS.md">Shortcuts</a>

</div>

1. Fork the repository.
2. Create a focused branch.
3. Add tests/docs for behavior changes.
4. Open a PR with clear before/after notes.

---

<div align="center">
  Crafted for calm, deep, file-backed learning.
  <br/>
  <a href="#top">Back to top</a>
</div>
