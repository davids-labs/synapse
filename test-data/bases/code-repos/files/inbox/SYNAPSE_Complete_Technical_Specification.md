# SYNAPSE: Complete Technical Specification
## Desktop-First Visual Learning Operating System
### Version 1.0 - Comprehensive Build Blueprint

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [File System Architecture](#file-system-architecture)
4. [Data Schemas](#data-schemas)
5. [UI Specification](#ui-specification)
6. [Component Library](#component-library)
7. [Feature Specifications](#feature-specifications)
8. [State Management](#state-management)
9. [Phased Build Plan](#phased-build-plan)
10. [Testing Requirements](#testing-requirements)
11. [Performance Benchmarks](#performance-benchmarks)
12. [Build & Deployment](#build-deployment)

---

## 1. Project Overview

### 1.1 Core Concept
SYNAPSE transforms academic courses into interactive, visual knowledge maps. It's a purely local-first, file-based learning platform with NO cloud dependencies, NO AI integration, and NO proprietary lock-in.

### 1.2 Guiding Principles
- **File-First**: Everything is JSON, Markdown, or PNG
- **Local-Only**: All processing on-device, Git for sync
- **Deterministic**: Node colors from observable data only
- **Keyboard-First**: Every action has a shortcut
- **Transparent**: No black boxes, all formulas visible

### 1.3 What SYNAPSE Is NOT
- ❌ No AI integration (removed Study Now button, ChatGPT context)
- ❌ No cloud services or SaaS dependencies
- ❌ No telemetry or analytics sent externally
- ❌ No proprietary databases or formats
- ❌ No scraping or auto-import from web

---

## 2. Technology Stack

### 2.1 Core Framework
```json
{
  "framework": "Electron 28.x",
  "reason": "Desktop-first, full system access, mature ecosystem",
  "ui_framework": "React 18.2.0",
  "language": "TypeScript 5.3.x",
  "build_tool": "Vite 5.x (fast HMR, better than Webpack)"
}
```

### 2.2 Dependencies (Exact Versions)
```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "d3": "7.8.5",
    "d3-force": "3.0.0",
    "zustand": "4.4.7",
    "chokidar": "3.5.3",
    "simple-git": "3.21.0",
    "gray-matter": "4.0.3",
    "marked": "11.1.0",
    "zod": "3.22.4",
    "date-fns": "2.30.0",
    "framer-motion": "10.16.16",
    "react-pdf": "7.5.1",
    "katex": "0.16.9",
    "react-markdown": "9.0.1",
    "remark-math": "6.0.0",
    "rehype-katex": "7.0.0"
  },
  "devDependencies": {
    "@types/react": "18.2.45",
    "@types/react-dom": "18.2.18",
    "@types/d3": "7.4.3",
    "electron": "28.0.0",
    "electron-builder": "24.9.1",
    "vite": "5.0.8",
    "typescript": "5.3.3",
    "tailwindcss": "3.4.0",
    "autoprefixer": "10.4.16",
    "postcss": "8.4.32",
    "vitest": "1.0.4",
    "@testing-library/react": "14.1.2"
  }
}
```

### 2.3 UI Component Library
```json
{
  "base": "shadcn/ui (Radix primitives + Tailwind)",
  "components_to_install": [
    "button",
    "dialog",
    "dropdown-menu",
    "input",
    "label",
    "select",
    "slider",
    "tabs",
    "toast",
    "tooltip",
    "command"
  ],
  "customization": "Modify theme to match SYNAPSE dark palette"
}
```

---

## 3. File System Architecture

### 3.1 Project Structure
```
synapse/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── electron-builder.json
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Main entry point
│   │   ├── fileWatcher.ts       # Chokidar file system monitoring
│   │   ├── gitManager.ts        # Simple-git integration
│   │   ├── syllabusLoader.ts    # Load and validate syllabus.json
│   │   ├── nodeScanner.ts       # Scan directories for _node.json
│   │   ├── masteryEngine.ts     # Calculate mastery scores
│   │   ├── ipcHandlers.ts       # IPC communication setup
│   │   └── preload.ts           # Preload script for renderer
│   ├── renderer/                # React application
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── graph/
│   │   │   │   ├── KnowledgeGraph.tsx
│   │   │   │   ├── Node.tsx
│   │   │   │   ├── Link.tsx
│   │   │   │   ├── MiniMap.tsx
│   │   │   │   └── GraphControls.tsx
│   │   │   ├── topic-center/
│   │   │   │   ├── TopicCenter.tsx
│   │   │   │   ├── TopicHeader.tsx
│   │   │   │   ├── ViewBlockContainer.tsx
│   │   │   │   ├── RelatedTopicsSidebar.tsx
│   │   │   │   └── blocks/
│   │   │   │       ├── HandwritingGallery.tsx
│   │   │   │       ├── PDFPortal.tsx
│   │   │   │       ├── FormulaVault.tsx
│   │   │   │       ├── PracticeTracker.tsx
│   │   │   │       ├── ImageGrid.tsx
│   │   │   │       ├── KanbanBoard.tsx
│   │   │   │       ├── Timeline.tsx
│   │   │   │       └── NotesEditor.tsx
│   │   │   ├── homepage/
│   │   │   │   ├── Homepage.tsx
│   │   │   │   ├── BaseCard.tsx
│   │   │   │   └── QuickCaptureModal.tsx
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   └── layout/
│   │   │       ├── Breadcrumb.tsx
│   │   │       ├── FilterDrawer.tsx
│   │   │       └── CommandPalette.tsx
│   │   ├── hooks/
│   │   │   ├── useKeyboardShortcuts.ts
│   │   │   ├── useGraphData.ts
│   │   │   ├── useNodeSelection.ts
│   │   │   ├── useFileWatcher.ts
│   │   │   └── useGitSync.ts
│   │   ├── store/
│   │   │   ├── graphStore.ts
│   │   │   ├── uiStore.ts
│   │   │   ├── settingsStore.ts
│   │   │   └── historyStore.ts
│   │   ├── utils/
│   │   │   ├── masteryCalculator.ts
│   │   │   ├── colorMapper.ts
│   │   │   ├── fileHelpers.ts
│   │   │   └── validators.ts
│   │   └── styles/
│   │       ├── globals.css
│   │       └── animations.css
│   └── shared/
│       ├── types.ts             # All TypeScript interfaces
│       ├── schemas.ts           # Zod validation schemas
│       └── constants.ts         # App-wide constants
└── test-data/                   # Sample course for development
    └── thermodynamics/
        ├── _meta/
        │   ├── syllabus.json
        │   ├── mastery-rules.json
        │   └── prerequisites.json
        └── 01-fundamentals/
            ├── _node.json
            ├── notes.md
            ├── media/
            └── practice/
```

### 3.2 User Data Directory Structure
```
~/synapse-data/                  # User's learning repository
├── academics/
│   ├── year-2/
│   │   ├── semester-1/
│   │   │   ├── thermodynamics/
│   │   │   │   ├── _meta/
│   │   │   │   │   ├── syllabus.json
│   │   │   │   │   ├── mastery-rules.json
│   │   │   │   │   └── graph-layout.json
│   │   │   │   ├── 01-fundamentals/
│   │   │   │   │   ├── _node.json
│   │   │   │   │   ├── notes.md
│   │   │   │   │   ├── media/
│   │   │   │   │   │   ├── lecture-1.png
│   │   │   │   │   │   ├── diagram.png
│   │   │   │   │   │   └── handwriting-2025-01-15.png
│   │   │   │   │   ├── practice/
│   │   │   │   │   │   ├── problem-set-1.md
│   │   │   │   │   │   └── solutions.md
│   │   │   │   │   └── resources/
│   │   │   │   │       └── textbook-ch1.pdf
│   │   │   │   └── 02-laws/
│   │   │   └── engineering-math/
│   │   └── semester-2/
│   └── year-3/
├── personal-projects/
└── .git/                        # Git repository root
```

### 3.3 Application Data Directory
```
~/Library/Application Support/SYNAPSE/    # macOS
~/.config/synapse/                        # Linux
C:\Users\{user}\AppData\Roaming\SYNAPSE\ # Windows

Contents:
├── config.json              # User preferences
├── recent-bases.json        # Recently opened bases
├── window-state.json        # Window size/position
├── keyboard-shortcuts.json  # Custom shortcuts
└── backups/
    ├── daily/
    └── manual/
```

---

## 4. Data Schemas

### 4.1 Core TypeScript Interfaces

```typescript
// src/shared/types.ts

// ============================================================================
// NODE DEFINITIONS
// ============================================================================

export type NodeCategory = 'foundation' | 'core' | 'advanced' | 'integration';
export type NodeStatus = 'locked' | 'active' | 'practicing' | 'mastered';

export interface SynapseNode {
  id: string;                    // Unique identifier (matches folder name)
  title: string;                 // Display name
  category: NodeCategory;
  examWeight: number;            // 0-100, importance for exam
  prerequisites: string[];       // Array of node IDs
  unlocks: string[];             // Array of node IDs unlocked by this
  mastery: NodeMastery;
  position?: GraphPosition;      // Optional saved position
  metadata?: NodeMetadata;
}

export interface NodeMastery {
  score: number;                 // 0.0 - 1.0
  status: NodeStatus;
  color: string;                 // Hex color code
  lastStudied?: string;          // ISO date string
  createdAt?: string;            // ISO date string
  studySessions: number;
  practiceCompleted: number;
  practiceTotal: number;
  manualOverride?: number;       // User can override calculated score
}

export interface GraphPosition {
  x: number;
  y: number;
  fixed?: boolean;               // Pin node to position
}

export interface NodeMetadata {
  weakSpots?: string[];          // Array of sub-topic IDs
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
}

// ============================================================================
// GRAPH DEFINITIONS
// ============================================================================

export interface GraphLink {
  source: string | SynapseNode;  // Node ID or object
  target: string | SynapseNode;
  type: 'prerequisite' | 'related' | 'manual';
  strength?: number;             // 0.0 - 1.0 for force simulation
}

export interface GraphData {
  nodes: SynapseNode[];
  links: GraphLink[];
}

// ============================================================================
// FILE SYSTEM SCHEMAS
// ============================================================================

export interface SyllabusJson {
  mapId: string;
  courseName: string;
  semester: string;
  examDate?: string;
  nodes: SyllabusNode[];
  metadata?: {
    created: string;
    modified: string;
    version: string;
  };
}

export interface SyllabusNode {
  id: string;
  title: string;
  category: NodeCategory;
  examWeight: number;
  prerequisites: string[];
  unlocks: string[];
  estimatedHours?: number;
}

export interface NodeJson {
  id: string;
  status: NodeStatus;
  masteryScore: number;
  createdAt: string;
  lastStudied?: string;
  studySessions: number;
  practiceCompleted: number;
  practiceTotal: number;
  manualMasteryOverride?: number;
  weakSpots?: string[];
  metadata?: {
    notesWordCount?: number;
    mediaFileCount?: number;
    pdfPageCount?: number;
  };
}

export interface TasksJson {
  columns: TaskColumn[];
}

export interface TaskColumn {
  id: string;
  title: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  content: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface FormulaEntry {
  id: string;
  name: string;
  formula: string;              // LaTeX string
  description?: string;
  variables?: Variable[];
}

export interface Variable {
  symbol: string;
  description: string;
  unit?: string;
}

// ============================================================================
// UI STATE
// ============================================================================

export interface ViewBlock {
  id: string;
  type: ViewBlockType;
  title: string;
  targetPath: string;           // Relative path within node folder
  position: { row: number; col: number };
  size: { width: number; height: number };
  config?: Record<string, any>;
}

export type ViewBlockType =
  | 'handwriting-gallery'
  | 'pdf-portal'
  | 'formula-vault'
  | 'practice-tracker'
  | 'image-grid'
  | 'kanban-board'
  | 'timeline'
  | 'notes-editor'
  | 'resource-list'
  | 'related-topics';

export interface AppSettings {
  basePath: string;             // Root directory for user data
  gitEnabled: boolean;
  autoCommit: boolean;
  theme: 'dark' | 'light';
  animations: boolean;
  soundEnabled: boolean;
  keyboardShortcuts: KeyboardShortcuts;
}

export interface KeyboardShortcuts {
  quickCapture: string;
  globalSearch: string;
  commandPalette: string;
  toggleSidebar: string;
  zoomToHome: string;
  syncNow: string;
}

// ============================================================================
// IPC MESSAGES
// ============================================================================

export interface IpcMessage<T = any> {
  channel: string;
  payload: T;
}

export type IpcChannel =
  | 'load-syllabus'
  | 'scan-nodes'
  | 'watch-directory'
  | 'git-commit'
  | 'git-sync'
  | 'open-file'
  | 'save-file'
  | 'create-backup';
```

### 4.2 Zod Validation Schemas

```typescript
// src/shared/schemas.ts

import { z } from 'zod';

export const NodeCategorySchema = z.enum([
  'foundation',
  'core',
  'advanced',
  'integration'
]);

export const NodeStatusSchema = z.enum([
  'locked',
  'active',
  'practicing',
  'mastered'
]);

export const SyllabusNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: NodeCategorySchema,
  examWeight: z.number().min(0).max(100),
  prerequisites: z.array(z.string()),
  unlocks: z.array(z.string()),
  estimatedHours: z.number().optional()
});

export const SyllabusJsonSchema = z.object({
  mapId: z.string().min(1),
  courseName: z.string().min(1),
  semester: z.string(),
  examDate: z.string().optional(),
  nodes: z.array(SyllabusNodeSchema),
  metadata: z.object({
    created: z.string(),
    modified: z.string(),
    version: z.string()
  }).optional()
});

export const NodeJsonSchema = z.object({
  id: z.string().min(1),
  status: NodeStatusSchema,
  masteryScore: z.number().min(0).max(1),
  createdAt: z.string(),
  lastStudied: z.string().optional(),
  studySessions: z.number().min(0),
  practiceCompleted: z.number().min(0),
  practiceTotal: z.number().min(0),
  manualMasteryOverride: z.number().min(0).max(1).optional(),
  weakSpots: z.array(z.string()).optional(),
  metadata: z.object({
    notesWordCount: z.number().optional(),
    mediaFileCount: z.number().optional(),
    pdfPageCount: z.number().optional()
  }).optional()
});

export const TasksJsonSchema = z.object({
  columns: z.array(z.object({
    id: z.string(),
    title: z.string(),
    tasks: z.array(z.object({
      id: z.string(),
      content: z.string(),
      completed: z.boolean(),
      createdAt: z.string(),
      completedAt: z.string().optional()
    }))
  }))
});

export const FormulaEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  formula: z.string(),
  description: z.string().optional(),
  variables: z.array(z.object({
    symbol: z.string(),
    description: z.string(),
    unit: z.string().optional()
  })).optional()
});
```

---

## 5. UI Specification

### 5.1 Design System

#### Color Palette (Exact Hex Values)
```typescript
// src/shared/constants.ts

export const COLORS = {
  // Node mastery colors
  MASTERY: {
    LOCKED: '#808080',        // Grey - Not started
    ACTIVATED: '#FFFFFF',     // White - Just started
    UNDERSTANDING: '#4472C4', // Blue - Understanding
    PRACTICING: '#70AD47',    // Green - Practicing
    MASTERED: '#FFD700',      // Gold - Mastered
    WEAK_SPOT: '#E74C3C'      // Red - Needs attention
  },
  
  // UI colors
  BACKGROUND: {
    PRIMARY: '#1A1A1A',       // Main background
    SECONDARY: '#2C2C2C',     // Panels, cards
    TERTIARY: '#3A3A3A'       // Hover states
  },
  
  TEXT: {
    PRIMARY: '#FFFFFF',
    SECONDARY: '#B0B0B0',
    TERTIARY: '#808080',
    ACCENT: '#4A90E2'
  },
  
  BORDER: {
    DEFAULT: '#3A3A3A',
    FOCUS: '#4A90E2',
    ERROR: '#E74C3C'
  },
  
  ACCENT: {
    PRIMARY: '#4A90E2',
    SECONDARY: '#50C878',
    WARNING: '#FFA500',
    ERROR: '#E74C3C'
  }
} as const;
```

#### Typography
```typescript
export const TYPOGRAPHY = {
  FONT_FAMILY: {
    UI: '"Inter", system-ui, -apple-system, sans-serif',
    HEADING: '"Inter", system-ui, -apple-system, sans-serif',
    MONO: '"JetBrains Mono", "Courier New", monospace',
    CONTENT: 'Georgia, serif'
  },
  
  FONT_SIZE: {
    XS: '12px',
    SM: '14px',
    BASE: '16px',
    LG: '18px',
    XL: '20px',
    '2XL': '24px',
    '3XL': '32px',
    '4XL': '40px'
  },
  
  FONT_WEIGHT: {
    NORMAL: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700
  },
  
  LINE_HEIGHT: {
    TIGHT: 1.2,
    NORMAL: 1.5,
    RELAXED: 1.75
  }
} as const;
```

#### Spacing System (8px base)
```typescript
export const SPACING = {
  XS: '4px',
  SM: '8px',
  MD: '16px',
  LG: '24px',
  XL: '32px',
  '2XL': '48px',
  '3XL': '64px',
  '4XL': '96px'
} as const;
```

#### Border Radius
```typescript
export const RADIUS = {
  NONE: '0px',
  SM: '4px',
  MD: '8px',
  LG: '12px',
  XL: '16px',
  FULL: '9999px'
} as const;
```

#### Shadows
```typescript
export const SHADOWS = {
  SM: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  MD: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
  LG: '0 10px 15px -3px rgba(0, 0, 0, 0.6)',
  XL: '0 20px 25px -5px rgba(0, 0, 0, 0.7)',
  GLOW: '0 0 20px rgba(255, 215, 0, 0.5)' // For mastered nodes
} as const;
```

#### Animation Timing
```typescript
export const ANIMATION = {
  DURATION: {
    INSTANT: '100ms',
    FAST: '200ms',
    NORMAL: '300ms',
    SLOW: '500ms',
    VERY_SLOW: '1000ms'
  },
  
  EASING: {
    LINEAR: 'linear',
    EASE: 'ease',
    EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
    EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
    EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    SPRING: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  }
} as const;
```

### 5.2 Layout Specifications

#### Window Dimensions
```typescript
export const WINDOW = {
  MIN_WIDTH: 1024,
  MIN_HEIGHT: 768,
  DEFAULT_WIDTH: 1440,
  DEFAULT_HEIGHT: 900,
  TITLE_BAR_HEIGHT: 32
} as const;
```

#### Layout Zones
```
┌─────────────────────────────────────────────────────────────┐
│  Title Bar (32px)                                    ⚙️ ━ □ ✕│
├─────────────────────────────────────────────────────────────┤
│  Breadcrumb (48px)                                          │
│  Home > Academics > Year 2 > Thermodynamics                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│                   Main Content Area                          │
│                   (Dynamic height)                           │
│                                                              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Status Bar (28px)                                          │
│  📊 23/45 nodes mastered • Last sync: 2 min ago • ●          │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Screen Specifications

#### Screen 1: Homepage (Root Universe)
```
Layout:
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                      Quick Capture [+]                       │
│                     (Centered, 200px from top)               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Academics  │  │   Personal   │  │  Code Repos  │      │
│  │              │  │   Projects   │  │              │      │
│  │  📊 67% ███  │  │  📊 23% █    │  │  📊 45% ██   │      │
│  │  24/36 nodes │  │  5/22 nodes  │  │  12/27 nodes │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│                     [Command Palette: Ctrl+K]                │
└─────────────────────────────────────────────────────────────┘

Specifications:
- Base cards: 280px × 320px
- Spacing between cards: 32px
- Card border: 1px solid #3A3A3A
- Card border-radius: 12px
- Card hover: scale(1.02), border-color: #4A90E2
- Progress bar height: 8px, border-radius: 4px
- Quick Capture button: 64px × 64px, circular, floating
```

#### Screen 2: Knowledge Graph (Galaxy View)
```
Layout:
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb                              🔍 Filter  Settings │
├─────────────────┬───────────────────────────────────────────┤
│                 │                                            │
│  📋 Filter      │         D3.js Graph Canvas                 │
│     Drawer      │                                            │
│  (240px wide)   │         ● Node ──── ● Node                 │
│                 │           │           │                    │
│  □ Foundation   │         ● Node ──── ● Node ──── ● Node    │
│  □ Core         │                                            │
│  □ Advanced     │                                            │
│  □ Integration  │                                            │
│                 │                                            │
│  Mastery:       │                                            │
│  □ Locked       │         ┌─────────────┐                   │
│  □ Active       │         │  Mini-map   │                   │
│  □ Practicing   │         │   (120×80)  │                   │
│  □ Mastered     │         └─────────────┘                   │
│                 │                                            │
└─────────────────┴───────────────────────────────────────────┘

Specifications:
- Graph canvas: 100% width × 100% height (minus UI)
- Node radius: 20px (default), 30px (hovered), 40px (selected)
- Node border: 3px solid (color matches mastery)
- Link width: 2px (default), 4px (hovered)
- Link color: #3A3A3A (prerequisite), #4A90E2 (manual link)
- Mini-map: Fixed position bottom-right, 16px from edges
- Filter drawer: Collapsible, 240px wide, slides from left
```

#### Screen 3: Topic Center (Node Interior)
```
Layout:
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Graph                                    Actions │
│                                                              │
│  Carnot Cycle                           [●●●●●○] 0.82       │
│  Foundation • Exam Weight: 25%          (Mastery Slider)    │
├──────────────────────────────────┬──────────────────────────┤
│                                   │  Related Topics          │
│  View Block Grid (4×3 layout)    │                          │
│                                   │  Prerequisites:          │
│  ┌──────────┐  ┌──────────┐     │  ✓ Laws (0.85)           │
│  │Handwrit- │  │ PDF      │     │  ✓ Entropy (0.72)        │
│  │ing       │  │ Portal   │     │                          │
│  └──────────┘  └──────────┘     │  Unlocks:                │
│                                   │  ○ Efficiency (locked)   │
│  ┌──────────┐  ┌──────────┐     │  ○ Heat Engines (locked) │
│  │Formula   │  │Practice  │     │                          │
│  │Vault     │  │Tracker   │     │  [Mark as Weak Spot]     │
│  └──────────┘  └──────────┘     │                          │
│                                   │                          │
└──────────────────────────────────┴──────────────────────────┘

Specifications:
- Header height: 120px
- Mastery slider: 200px wide, thumb size: 20px
- View block grid: 12-column system, gap: 16px
- Default block size: 3 columns × 4 rows
- Sidebar width: 280px, fixed
- Block border: 1px solid #3A3A3A
- Block drag handle: 8px height bar at top
```

### 5.4 Component Specifications

#### Node (Graph Visualization)
```typescript
// Visual specifications
interface NodeVisuals {
  radius: {
    default: 20,
    hovered: 30,
    selected: 40,
    locked: 15
  },
  
  border: {
    width: 3,
    style: 'solid',
    color: 'mastery-dependent' // See color palette
  },
  
  fill: {
    locked: '#808080',
    activated: '#FFFFFF',
    understanding: '#4472C4',
    practicing: '#70AD47',
    mastered: '#FFD700'
  },
  
  label: {
    fontSize: '12px',
    fontWeight: 600,
    fill: '#FFFFFF',
    offset: { x: 0, y: 28 }, // Below node
    maxWidth: 100
  },
  
  glow: {
    enabled: 'mastered-only',
    blur: 20,
    color: 'rgba(255, 215, 0, 0.5)'
  },
  
  weakSpotIndicator: {
    type: 'corner-badge',
    size: 8,
    color: '#E74C3C',
    position: 'top-right'
  }
}

// Interaction states
interface NodeStates {
  default: {
    opacity: 1,
    cursor: 'pointer'
  },
  
  hovered: {
    scale: 1.5,
    transition: '200ms ease-out',
    cursor: 'pointer'
  },
  
  selected: {
    scale: 2,
    opacity: 1,
    borderWidth: 4
  },
  
  dimmed: {
    opacity: 0.3
  },
  
  locked: {
    opacity: 0.5,
    cursor: 'not-allowed',
    icon: '🔒' // Centered in node
  }
}
```

#### Link (Graph Connection)
```typescript
interface LinkVisuals {
  width: {
    default: 2,
    hovered: 4
  },
  
  color: {
    prerequisite: '#3A3A3A',
    related: '#4A90E2',
    manual: '#50C878'
  },
  
  style: {
    prerequisite: 'solid',
    related: 'dashed',
    manual: 'solid'
  },
  
  arrow: {
    enabled: true,
    size: 8,
    position: 'end'
  },
  
  animation: {
    pulse: {
      enabled: 'on-hover',
      duration: '1s',
      direction: 'source-to-target'
    }
  }
}
```

#### View Block (Topic Center Module)
```typescript
interface ViewBlockLayout {
  container: {
    minWidth: '200px',
    minHeight: '150px',
    borderRadius: '8px',
    border: '1px solid #3A3A3A',
    backgroundColor: '#2C2C2C',
    padding: '16px'
  },
  
  header: {
    height: '40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #3A3A3A',
    marginBottom: '16px'
  },
  
  dragHandle: {
    height: '8px',
    backgroundColor: '#3A3A3A',
    cursor: 'grab',
    borderRadius: '4px 4px 0 0'
  },
  
  content: {
    height: 'calc(100% - 56px)', // Minus header + padding
    overflow: 'auto'
  },
  
  actions: {
    position: 'top-right',
    buttons: ['⚙️', '━', '✕'],
    buttonSize: '24px'
  }
}
```

### 5.5 Animation Specifications

#### Node Mastery Transitions
```typescript
const MASTERY_TRANSITIONS = {
  'locked → activated': {
    duration: '1500ms',
    keyframes: [
      { color: '#808080', scale: 1, opacity: 0.5 },
      { color: '#FFFFFF', scale: 1.2, opacity: 1 },
      { color: '#FFFFFF', scale: 1, opacity: 1 }
    ],
    particles: {
      count: 20,
      color: '#FFFFFF',
      spread: 360,
      duration: '1000ms'
    }
  },
  
  'activated → understanding': {
    duration: '1000ms',
    keyframes: [
      { color: '#FFFFFF', scale: 1 },
      { color: '#4472C4', scale: 1.1 },
      { color: '#4472C4', scale: 1 }
    ]
  },
  
  'understanding → practicing': {
    duration: '1000ms',
    keyframes: [
      { color: '#4472C4', scale: 1 },
      { color: '#70AD47', scale: 1.1 },
      { color: '#70AD47', scale: 1 }
    ]
  },
  
  'practicing → mastered': {
    duration: '2000ms',
    keyframes: [
      { color: '#70AD47', scale: 1, filter: 'none' },
      { color: '#FFD700', scale: 1.3, filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.8))' },
      { color: '#FFD700', scale: 1, filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))' }
    ],
    particles: {
      count: 40,
      color: '#FFD700',
      spread: 360,
      duration: '1500ms'
    },
    soundEffect: 'mastery-achieved.mp3'
  }
};
```

#### Prerequisite Unlock Animation
```typescript
const UNLOCK_ANIMATION = {
  phase1_shake: {
    duration: '500ms',
    keyframes: [
      { rotate: '0deg' },
      { rotate: '-5deg' },
      { rotate: '5deg' },
      { rotate: '-5deg' },
      { rotate: '0deg' }
    ]
  },
  
  phase2_shatter: {
    duration: '800ms',
    icon: 'lock-icon',
    fragments: 8,
    trajectory: 'radial-outward',
    fadeOut: true
  },
  
  phase3_activate: {
    duration: '1200ms',
    colorTransition: '#808080 → #FFFFFF',
    scale: [1, 1.2, 1],
    opacity: [0.5, 1]
  },
  
  phase4_connectedPulse: {
    duration: '500ms',
    targets: 'connected-nodes',
    effect: 'border-pulse',
    color: '#4A90E2'
  }
};
```

#### Graph Navigation Animations
```typescript
const GRAPH_ANIMATIONS = {
  zoomToNode: {
    duration: '750ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    targetScale: 2,
    centerNode: true,
    dimOthers: 0.3
  },
  
  zoomToFit: {
    duration: '500ms',
    easing: 'ease-out',
    padding: 50 // px from edges
  },
  
  panToNode: {
    duration: '400ms',
    easing: 'ease-in-out'
  },
  
  openTopicCenter: {
    duration: '600ms',
    steps: [
      { action: 'dim-graph', opacity: 0.1 },
      { action: 'zoom-to-node', scale: 5 },
      { action: 'fade-out-graph' },
      { action: 'fade-in-topic-center' }
    ]
  }
};
```

---

## 6. Component Library

### 6.1 Graph Components

#### KnowledgeGraph.tsx
```typescript
interface KnowledgeGraphProps {
  data: GraphData;
  width: number;
  height: number;
  selectedNodeId?: string;
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  filter?: GraphFilter;
}

interface GraphFilter {
  categories?: NodeCategory[];
  masteryRange?: [number, number];
  searchTerm?: string;
}

// Responsibilities:
// - D3.js force simulation setup
// - SVG rendering
// - Zoom/pan behavior
// - Node/link updates on data change
// - Event handling (click, hover, drag)
// - Mini-map integration
```

#### Node.tsx
```typescript
interface NodeProps {
  node: SynapseNode;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

// Responsibilities:
// - Render SVG circle with mastery color
// - Show label below node
// - Display lock icon if locked
// - Show weak spot indicator if flagged
// - Handle hover effects
// - Glow effect for mastered nodes
```

#### Link.tsx
```typescript
interface LinkProps {
  link: GraphLink;
  highlighted: boolean;
}

// Responsibilities:
// - Render SVG path between nodes
// - Apply appropriate styling (color, width, dash)
// - Show arrow marker
// - Pulse animation on hover
```

### 6.2 Topic Center Components

#### TopicCenter.tsx
```typescript
interface TopicCenterProps {
  nodeId: string;
  onClose: () => void;
}

// Responsibilities:
// - Layout container for all Topic Center UI
// - Load node data and related topics
// - Manage view block positions
// - Handle keyboard shortcuts
```

#### TopicHeader.tsx
```typescript
interface TopicHeaderProps {
  node: SynapseNode;
  onMasteryChange: (newScore: number) => void;
  onMarkWeakSpot: () => void;
}

// Specifications:
// - Display: title, category badge, exam weight
// - Mastery slider: 200px wide, updates on change
// - Action buttons: [Mark as Weak Spot] [Add Resource] [⚙️ Settings]
```

#### ViewBlockContainer.tsx
```typescript
interface ViewBlockContainerProps {
  blocks: ViewBlock[];
  onBlockMove: (blockId: string, newPosition: Position) => void;
  onBlockResize: (blockId: string, newSize: Size) => void;
  onBlockRemove: (blockId: string) => void;
}

// Responsibilities:
// - CSS Grid layout (12 columns)
// - Drag-and-drop positioning
// - Resize handles on blocks
// - Add new block button
// - Save layout to _node.json
```

### 6.3 View Block Components

#### HandwritingGallery.tsx
```typescript
interface HandwritingGalleryProps {
  imagePaths: string[];
  basePath: string;
}

// Features:
// - Display images in responsive grid (3 columns default)
// - Lightbox mode on click
// - Compare mode (side-by-side comparison)
// - Zoom controls
// - OCR button (future feature)
// - Sort by date (newest first)
```

#### PDFPortal.tsx
```typescript
interface PDFPortalProps {
  pdfPath: string;
  initialPage?: number;
}

// Features:
// - React-PDF for rendering
// - Page navigation controls
// - Zoom in/out
// - Remember last viewed page (save to _node.json)
// - Thumbnail sidebar
// - Search within PDF
```

#### FormulaVault.tsx
```typescript
interface FormulaVaultProps {
  formulasPath: string; // Path to formulas.json
}

interface FormulaEntry {
  id: string;
  name: string;
  formula: string; // LaTeX
  description?: string;
  variables?: Variable[];
}

// Features:
// - Table layout with columns: Name, Formula, Variables
// - LaTeX rendering with KaTeX
// - Add/edit/delete formulas
// - Search/filter by name
// - Export to Markdown
```

#### PracticeTracker.tsx
```typescript
interface PracticeTrackerProps {
  practiceFolder: string;
}

// Features:
// - List all .md files in practice/ folder
// - Show completion checkboxes
// - Progress bar (completed / total)
// - Last attempted date
// - Link to open file in editor
```

#### KanbanBoard.tsx
```typescript
interface KanbanBoardProps {
  tasksJsonPath: string;
}

// Features:
// - Read tasks.json
// - Columns: To Do, In Progress, Done
// - Drag-and-drop between columns
// - Add/edit/delete tasks
// - Completed tasks show timestamp
// - Save changes back to tasks.json
```

### 6.4 Layout Components

#### Breadcrumb.tsx
```typescript
interface BreadcrumbProps {
  path: string[]; // e.g., ['Home', 'Academics', 'Year 2', 'Thermodynamics']
  onNavigate: (index: number) => void;
}

// Specifications:
// - Height: 48px
// - Separator: ' > ' (20px spacing)
// - Clickable segments
// - Last segment: bold, not clickable
// - Hover: underline, color: #4A90E2
```

#### FilterDrawer.tsx
```typescript
interface FilterDrawerProps {
  filters: GraphFilter;
  onFilterChange: (newFilters: GraphFilter) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// Specifications:
// - Width: 240px
// - Slide animation from left (300ms)
// - Checkbox groups for categories
// - Range slider for mastery (0.0 - 1.0)
// - Search input at top
// - Clear all button at bottom
```

#### CommandPalette.tsx
```typescript
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

// Features:
// - Fuzzy search all commands
// - Recent commands history
// - Categories: Navigation, Editing, Git, Settings
// - Keyboard navigation (↑↓ to select, Enter to execute)
// - Shortcut hints on right side
```

---

## 7. Feature Specifications

### 7.1 Mastery Calculation System

#### Formula Implementation
```typescript
// src/main/masteryEngine.ts

export interface MasteryInputs {
  notesCreated: boolean;           // Has notes.md with content
  practiceCompleted: number;       // Number of completed practice items
  practiceTotal: number;           // Total practice items
  manualLinksCreated: number;      // Number of manual links added
  lastStudied: string | undefined; // ISO date string
}

export function calculateMastery(inputs: MasteryInputs): number {
  const {
    notesCreated,
    practiceCompleted,
    practiceTotal,
    manualLinksCreated,
    lastStudied
  } = inputs;
  
  // Base mastery components
  const notesScore = notesCreated ? 0.10 : 0.0;
  const practiceScore = practiceTotal > 0
    ? (practiceCompleted / practiceTotal) * 0.50
    : 0.0;
  const linkScore = Math.min(manualLinksCreated / 3, 1.0) * 0.10;
  
  // Base mastery (before decay)
  let baseMastery = notesScore + practiceScore + linkScore;
  
  // Time decay factor
  const decayFactor = calculateDecayFactor(lastStudied);
  
  // Final mastery
  return Math.min(baseMastery * decayFactor, 1.0);
}

function calculateDecayFactor(lastStudied: string | undefined): number {
  if (!lastStudied) return 1.0; // No decay if never studied
  
  const daysSince = getDaysSince(lastStudied);
  const maxDecayDays = 30;
  const decayRate = 0.2; // 20% max reduction
  
  return Math.max(0, 1 - (daysSince / maxDecayDays) * decayRate);
}

function getDaysSince(dateString: string): number {
  const then = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - then.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getMasteryColor(score: number): string {
  if (score === 0) return COLORS.MASTERY.LOCKED;
  if (score <= 0.30) return COLORS.MASTERY.ACTIVATED;
  if (score <= 0.60) return COLORS.MASTERY.UNDERSTANDING;
  if (score <= 0.85) return COLORS.MASTERY.PRACTICING;
  return COLORS.MASTERY.MASTERED;
}

export function getMasteryStatus(score: number): NodeStatus {
  if (score === 0) return 'locked';
  if (score <= 0.60) return 'active';
  if (score <= 0.85) return 'practicing';
  return 'mastered';
}
```

### 7.2 File Watcher System

```typescript
// src/main/fileWatcher.ts

import chokidar from 'chokidar';
import path from 'path';

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private basePath: string;
  private callbacks: FileWatcherCallbacks;
  
  constructor(basePath: string, callbacks: FileWatcherCallbacks) {
    this.basePath = basePath;
    this.callbacks = callbacks;
  }
  
  start(): void {
    this.watcher = chokidar.watch(this.basePath, {
      persistent: true,
      ignoreInitial: true,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.DS_Store',
        '**/Thumbs.db'
      ],
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });
    
    this.watcher
      .on('add', (filePath) => this.handleFileAdded(filePath))
      .on('change', (filePath) => this.handleFileChanged(filePath))
      .on('unlink', (filePath) => this.handleFileRemoved(filePath));
  }
  
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
  
  private handleFileAdded(filePath: string): void {
    const nodeId = this.extractNodeId(filePath);
    if (!nodeId) return;
    
    const fileType = this.categorizeFile(filePath);
    
    switch (fileType) {
      case 'notes':
        this.callbacks.onNotesCreated(nodeId);
        break;
      case 'media':
        this.callbacks.onMediaAdded(nodeId, filePath);
        break;
      case 'practice':
        this.callbacks.onPracticeAdded(nodeId, filePath);
        break;
      case 'node-json':
        this.callbacks.onNodeJsonChanged(nodeId);
        break;
    }
  }
  
  private handleFileChanged(filePath: string): void {
    const nodeId = this.extractNodeId(filePath);
    if (!nodeId) return;
    
    if (filePath.endsWith('_node.json')) {
      this.callbacks.onNodeJsonChanged(nodeId);
    } else if (filePath.endsWith('notes.md')) {
      this.callbacks.onNotesUpdated(nodeId);
    }
  }
  
  private handleFileRemoved(filePath: string): void {
    const nodeId = this.extractNodeId(filePath);
    if (!nodeId) return;
    
    this.callbacks.onFileRemoved(nodeId, filePath);
  }
  
  private extractNodeId(filePath: string): string | null {
    // Extract node ID from path structure
    // e.g., .../thermodynamics/01-fundamentals/... → "01-fundamentals"
    const parts = filePath.split(path.sep);
    const nodeIndex = parts.findIndex(p => p.match(/^\d{2}-/));
    return nodeIndex >= 0 ? parts[nodeIndex] : null;
  }
  
  private categorizeFile(filePath: string): FileCategory {
    if (filePath.endsWith('_node.json')) return 'node-json';
    if (filePath.endsWith('notes.md')) return 'notes';
    if (filePath.includes('/media/')) return 'media';
    if (filePath.includes('/practice/')) return 'practice';
    return 'other';
  }
}

interface FileWatcherCallbacks {
  onNotesCreated: (nodeId: string) => void;
  onNotesUpdated: (nodeId: string) => void;
  onMediaAdded: (nodeId: string, filePath: string) => void;
  onPracticeAdded: (nodeId: string, filePath: string) => void;
  onNodeJsonChanged: (nodeId: string) => void;
  onFileRemoved: (nodeId: string, filePath: string) => void;
}

type FileCategory = 'notes' | 'media' | 'practice' | 'node-json' | 'other';
```

### 7.3 Git Integration

```typescript
// src/main/gitManager.ts

import simpleGit, { SimpleGit, StatusResult } from 'simple-git';

export class GitManager {
  private git: SimpleGit;
  private repoPath: string;
  
  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }
  
  async initialize(): Promise<void> {
    const isRepo = await this.git.checkIsRepo();
    if (!isRepo) {
      await this.git.init();
      await this.git.add('.');
      await this.git.commit('Initial commit - SYNAPSE setup');
    }
  }
  
  async autoCommit(nodeName: string, masteryDelta: number): Promise<void> {
    const status = await this.git.status();
    
    if (status.files.length === 0) return;
    
    await this.git.add('.');
    const message = `Study session: ${nodeName} (+${masteryDelta.toFixed(2)} mastery)`;
    await this.git.commit(message);
  }
  
  async sync(): Promise<SyncResult> {
    try {
      // Pull first
      await this.git.pull();
      
      // Then push
      await this.git.push();
      
      return {
        success: true,
        message: 'Sync completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${error.message}`,
        error
      };
    }
  }
  
  async getStatus(): Promise<StatusResult> {
    return await this.git.status();
  }
  
  async getHistory(nodeId?: string, limit = 20): Promise<CommitInfo[]> {
    const options = nodeId
      ? { file: `**/${nodeId}/**`, maxCount: limit }
      : { maxCount: limit };
    
    const log = await this.git.log(options);
    
    return log.all.map(commit => ({
      hash: commit.hash,
      date: commit.date,
      message: commit.message,
      author: commit.author_name
    }));
  }
  
  async resolveConflicts(): Promise<void> {
    // Simple last-write-wins for _node.json files
    const status = await this.git.status();
    const conflicts = status.conflicted;
    
    for (const file of conflicts) {
      if (file.endsWith('_node.json')) {
        await this.git.checkout(['--theirs', file]);
      }
    }
    
    await this.git.add('.');
  }
}

interface SyncResult {
  success: boolean;
  message: string;
  error?: any;
}

interface CommitInfo {
  hash: string;
  date: string;
  message: string;
  author: string;
}
```

### 7.4 Keyboard Shortcut System

```typescript
// src/renderer/hooks/useKeyboardShortcuts.ts

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { openCommandPalette } = useUI();
  const { selectedNodeId } = useGraph();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.includes('Mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      
      // Global shortcuts
      if (mod && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        openQuickCapture();
        return;
      }
      
      if (mod && e.code === 'KeyK') {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      
      if (mod && e.code === 'KeyH') {
        e.preventDefault();
        navigate('/');
        return;
      }
      
      if (mod && e.code === 'KeyS') {
        e.preventDefault();
        syncNow();
        return;
      }
      
      // Graph navigation shortcuts
      if (!isInputFocused()) {
        if (e.code === 'Escape') {
          closeTopicCenter();
          return;
        }
        
        if (e.code === 'Digit0') {
          zoomToFit();
          return;
        }
        
        if (e.code === 'KeyF') {
          toggleFocusMode();
          return;
        }
        
        if (selectedNodeId) {
          if (e.code === 'Enter') {
            openTopicCenter(selectedNodeId);
            return;
          }
          
          if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || 
              e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
            e.preventDefault();
            navigateToConnectedNode(e.code);
            return;
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId]);
}

function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  return (
    activeElement?.tagName === 'INPUT' ||
    activeElement?.tagName === 'TEXTAREA' ||
    activeElement?.hasAttribute('contenteditable')
  );
}
```

### 7.5 Quick Capture System

```typescript
// src/renderer/components/QuickCaptureModal.tsx

export function QuickCaptureModal({ isOpen, onClose }: QuickCaptureModalProps) {
  const [captureType, setCaptureType] = useState<CaptureType>('file');
  const { currentNodeId } = useContext(AppContext);
  const [selectedNodeId, setSelectedNodeId] = useState(currentNodeId);
  
  const handleCapture = async () => {
    switch (captureType) {
      case 'file':
        const file = await selectFile();
        await moveFileToNode(file, selectedNodeId);
        break;
      
      case 'screenshot':
        const screenshot = await takeScreenshot();
        await saveScreenshotToNode(screenshot, selectedNodeId);
        break;
      
      case 'note':
        await appendToNotes(noteContent, selectedNodeId);
        break;
      
      case 'link':
        await saveLink(linkUrl, selectedNodeId);
        break;
    }
    
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>Quick Capture</DialogHeader>
        
        <Tabs value={captureType} onValueChange={setCaptureType}>
          <TabsList>
            <TabsTrigger value="file">File</TabsTrigger>
            <TabsTrigger value="screenshot">Screenshot</TabsTrigger>
            <TabsTrigger value="note">Note</TabsTrigger>
            <TabsTrigger value="link">Link</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file">
            <FileCapture />
          </TabsContent>
          
          <TabsContent value="screenshot">
            <ScreenshotCapture />
          </TabsContent>
          
          <TabsContent value="note">
            <NoteCapture />
          </TabsContent>
          
          <TabsContent value="link">
            <LinkCapture />
          </TabsContent>
        </Tabs>
        
        <NodeSelector
          value={selectedNodeId}
          onChange={setSelectedNodeId}
        />
        
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleCapture}>Capture</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 7.6 Exam Prep Mode

```typescript
// Feature specification

interface ExamPrepMode {
  enabled: boolean;
  examDate: string;
  focusedNodeIds: string[]; // Filtered by exam weight
}

// Behavior:
// 1. Filter graph to show only high exam-weight nodes (> 20%)
// 2. Highlight weak spots (mastery < 0.5) in red with pulse
// 3. Show priority study list in sidebar:
//    - Sort by: (100 - mastery) * examWeight
//    - Display estimated hours to mastery
// 4. Countdown timer to exam date
// 5. Daily study plan generator:
//    - Calculate remaining days
//    - Distribute weak topics across days
//    - Suggest 2-3 topics per day

// UI Changes:
// - Filter drawer: New "Exam Prep" tab
// - Graph: Dim low exam-weight nodes (opacity: 0.2)
// - Sidebar: Replace with exam prep panel
// - Status bar: Show countdown "15 days until Thermodynamics Exam"
```

### 7.7 Decay Warning System

```typescript
// src/main/decayMonitor.ts

export class DecayMonitor {
  private decayThresholds = {
    warning: 14,  // Days since study
    critical: 21,
    severe: 30
  };
  
  async checkDecay(nodes: SynapseNode[]): Promise<DecayAlert[]> {
    const alerts: DecayAlert[] = [];
    
    for (const node of nodes) {
      if (!node.mastery.lastStudied) continue;
      
      const daysSince = getDaysSince(node.mastery.lastStudied);
      
      if (daysSince >= this.decayThresholds.severe) {
        alerts.push({
          nodeId: node.id,
          severity: 'severe',
          daysSince,
          message: `${node.title} severely decayed (${daysSince} days)`
        });
      } else if (daysSince >= this.decayThresholds.critical) {
        alerts.push({
          nodeId: node.id,
          severity: 'critical',
          daysSince,
          message: `${node.title} critically decayed (${daysSince} days)`
        });
      } else if (daysSince >= this.decayThresholds.warning) {
        alerts.push({
          nodeId: node.id,
          severity: 'warning',
          daysSince,
          message: `${node.title} decaying (${daysSince} days)`
        });
      }
    }
    
    return alerts;
  }
}

interface DecayAlert {
  nodeId: string;
  severity: 'warning' | 'critical' | 'severe';
  daysSince: number;
  message: string;
}

// Visual indicators:
// - Warning (14-20 days): Yellow border pulse
// - Critical (21-29 days): Orange border pulse + notification
// - Severe (30+ days): Red border pulse + modal alert

// Notification:
// - Desktop notification (if enabled)
// - In-app toast
// - Badge on homepage base card
```

---

## 8. State Management

### 8.1 Zustand Store Structure

```typescript
// src/renderer/store/graphStore.ts

interface GraphStore {
  // Data
  nodes: SynapseNode[];
  links: GraphLink[];
  
  // Selection
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  
  // View state
  viewportTransform: { x: number; y: number; k: number };
  filter: GraphFilter;
  
  // Actions
  setNodes: (nodes: SynapseNode[]) => void;
  setLinks: (links: GraphLink[]) => void;
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  updateNodeMastery: (nodeId: string, mastery: Partial<NodeMastery>) => void;
  setFilter: (filter: Partial<GraphFilter>) => void;
  zoomToNode: (nodeId: string) => void;
  zoomToFit: () => void;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  links: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  viewportTransform: { x: 0, y: 0, k: 1 },
  filter: {},
  
  setNodes: (nodes) => set({ nodes }),
  setLinks: (links) => set({ links }),
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  hoverNode: (nodeId) => set({ hoveredNodeId: nodeId }),
  
  updateNodeMastery: (nodeId, mastery) => set((state) => ({
    nodes: state.nodes.map(node =>
      node.id === nodeId
        ? { ...node, mastery: { ...node.mastery, ...mastery } }
        : node
    )
  })),
  
  setFilter: (filter) => set((state) => ({
    filter: { ...state.filter, ...filter }
  })),
  
  zoomToNode: (nodeId) => {
    // Implementation in component with D3 zoom
  },
  
  zoomToFit: () => {
    // Implementation in component with D3 zoom
  }
}));
```

```typescript
// src/renderer/store/uiStore.ts

interface UIStore {
  // Modals
  isQuickCaptureOpen: boolean;
  isCommandPaletteOpen: boolean;
  isSettingsOpen: boolean;
  
  // Drawers
  isFilterDrawerOpen: boolean;
  
  // Topic Center
  activeTopicCenterId: string | null;
  
  // View modes
  focusMode: boolean;
  examPrepMode: boolean;
  
  // Actions
  openQuickCapture: () => void;
  closeQuickCapture: () => void;
  toggleCommandPalette: () => void;
  toggleFilterDrawer: () => void;
  openTopicCenter: (nodeId: string) => void;
  closeTopicCenter: () => void;
  toggleFocusMode: () => void;
  toggleExamPrepMode: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isQuickCaptureOpen: false,
  isCommandPaletteOpen: false,
  isSettingsOpen: false,
  isFilterDrawerOpen: false,
  activeTopicCenterId: null,
  focusMode: false,
  examPrepMode: false,
  
  openQuickCapture: () => set({ isQuickCaptureOpen: true }),
  closeQuickCapture: () => set({ isQuickCaptureOpen: false }),
  toggleCommandPalette: () => set((state) => ({
    isCommandPaletteOpen: !state.isCommandPaletteOpen
  })),
  toggleFilterDrawer: () => set((state) => ({
    isFilterDrawerOpen: !state.isFilterDrawerOpen
  })),
  openTopicCenter: (nodeId) => set({ activeTopicCenterId: nodeId }),
  closeTopicCenter: () => set({ activeTopicCenterId: null }),
  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
  toggleExamPrepMode: () => set((state) => ({ examPrepMode: !state.examPrepMode }))
}));
```

```typescript
// src/renderer/store/settingsStore.ts

interface SettingsStore {
  basePath: string;
  gitEnabled: boolean;
  autoCommit: boolean;
  theme: 'dark' | 'light';
  animations: boolean;
  soundEnabled: boolean;
  shortcuts: KeyboardShortcuts;
  
  setBasePath: (path: string) => void;
  toggleGit: () => void;
  toggleAutoCommit: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleAnimations: () => void;
  toggleSound: () => void;
  updateShortcut: (action: string, shortcut: string) => void;
}

export const useSettingsStore = create<SettingsStore>(
  persist(
    (set) => ({
      basePath: '',
      gitEnabled: true,
      autoCommit: true,
      theme: 'dark',
      animations: true,
      soundEnabled: false,
      shortcuts: DEFAULT_SHORTCUTS,
      
      setBasePath: (path) => set({ basePath: path }),
      toggleGit: () => set((state) => ({ gitEnabled: !state.gitEnabled })),
      toggleAutoCommit: () => set((state) => ({ autoCommit: !state.autoCommit })),
      setTheme: (theme) => set({ theme }),
      toggleAnimations: () => set((state) => ({ animations: !state.animations })),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      updateShortcut: (action, shortcut) => set((state) => ({
        shortcuts: { ...state.shortcuts, [action]: shortcut }
      }))
    }),
    {
      name: 'synapse-settings'
    }
  )
);
```

---

## 9. Phased Build Plan

### Phase 0: Foundation (Week 1)
**Duration: 5-7 days**

#### Goals
- Project setup complete
- Development environment configured
- Core architecture in place

#### Deliverables

**Day 1-2: Project Initialization**
```bash
# Tasks
- [ ] Create Electron-React-Vite project
- [ ] Install all dependencies (exact versions from section 2.2)
- [ ] Configure TypeScript (strict mode)
- [ ] Set up Tailwind CSS
- [ ] Install shadcn/ui components
- [ ] Configure ESLint + Prettier
- [ ] Set up project directory structure

# Success criteria
- npm start launches Electron window
- Hot reload works
- TypeScript compilation successful
```

**Day 3-4: Type Definitions & Schemas**
```bash
# Tasks
- [ ] Create all TypeScript interfaces (src/shared/types.ts)
- [ ] Implement Zod schemas (src/shared/schemas.ts)
- [ ] Create constants file (colors, spacing, typography)
- [ ] Write unit tests for schemas

# Success criteria
- All types defined
- Schema validation works
- No TypeScript errors
```

**Day 5-7: IPC Bridge & File System**
```bash
# Tasks
- [ ] Set up Electron main process (src/main/index.ts)
- [ ] Implement IPC handlers (src/main/ipcHandlers.ts)
- [ ] Create file system helpers (read/write JSON, Markdown)
- [ ] Implement syllabus loader (src/main/syllabusLoader.ts)
- [ ] Create sample test data (thermodynamics course)

# Success criteria
- Renderer can request data from main process
- Can read syllabus.json
- Can read _node.json files
- Sample course loads successfully
```

---

### Phase 1: Graph Visualization (Week 2-3)
**Duration: 10-14 days**

#### Goals
- D3.js graph renders correctly
- Nodes display with mastery colors
- Basic interactions work

#### Deliverables

**Days 1-3: D3 Force Simulation**
```bash
# Tasks
- [ ] Create KnowledgeGraph component
- [ ] Implement D3 force simulation
- [ ] Render nodes as SVG circles
- [ ] Render links as SVG paths
- [ ] Add zoom/pan behavior

# Success criteria
- Graph renders with test data
- Physics simulation stable
- Can zoom and pan
```

**Days 4-6: Node Rendering**
```bash
# Tasks
- [ ] Create Node component
- [ ] Implement mastery color logic
- [ ] Add node labels
- [ ] Add lock icons for locked nodes
- [ ] Implement hover effects
- [ ] Add selection highlighting

# Success criteria
- Nodes display correct colors
- Locked nodes show lock icon
- Hover increases size
- Click selects node
```

**Days 7-9: Mastery Calculation**
```bash
# Tasks
- [ ] Implement calculateMastery function
- [ ] Create node scanner (check for files)
- [ ] Implement time decay logic
- [ ] Connect to file watcher
- [ ] Update graph on mastery change

# Success criteria
- Adding notes.md changes node color
- Practice completion updates mastery
- Time decay reduces score
- Graph updates in real-time
```

**Days 10-14: Graph Controls & Polish**
```bash
# Tasks
- [ ] Create MiniMap component
- [ ] Add GraphControls (zoom buttons)
- [ ] Implement keyboard navigation (arrow keys)
- [ ] Add "zoom to fit" (0 key)
- [ ] Create prerequisite link styling
- [ ] Implement prerequisite locking logic

# Success criteria
- Mini-map shows graph overview
- Zoom controls work
- Arrow keys navigate between nodes
- Locked nodes can't be accessed
- Prerequisites must be met to unlock
```

---

### Phase 2: Topic Center (Week 4-5)
**Duration: 10-14 days**

#### Goals
- Topic Center opens when clicking node
- Basic view blocks implemented
- Manual mastery override works

#### Deliverables

**Days 1-3: Topic Center Layout**
```bash
# Tasks
- [ ] Create TopicCenter component
- [ ] Implement zoom-to-node animation
- [ ] Create TopicHeader component
- [ ] Add mastery slider
- [ ] Create RelatedTopicsSidebar
- [ ] Add "Back to Graph" button

# Success criteria
- Double-click node opens Topic Center
- Smooth zoom animation
- Header shows node info
- Sidebar shows prerequisites/unlocks
- Esc key returns to graph
```

**Days 4-7: View Block System**
```bash
# Tasks
- [ ] Create ViewBlockContainer
- [ ] Implement grid layout (12 columns)
- [ ] Add drag-and-drop positioning
- [ ] Create base ViewBlock component
- [ ] Save layout to _node.json
- [ ] Add "Add Block" button

# Success criteria
- Blocks can be positioned
- Drag-and-drop works
- Layout persists
- Can add new blocks
```

**Days 8-14: Core View Blocks**
```bash
# Priority blocks to implement:
1. [ ] NotesEditor (Markdown editor with preview)
2. [ ] HandwritingGallery (image grid with lightbox)
3. [ ] PDFPortal (PDF viewer with page nav)
4. [ ] PracticeTracker (checkbox list of practice files)
5. [ ] FormulaVault (LaTeX table)

# Success criteria
- Each block reads from correct folder
- Data displays correctly
- Edit actions save back to files
- LaTeX renders properly
```

---

### Phase 3: File Watching & Live Updates (Week 6)
**Duration: 5-7 days**

#### Goals
- Chokidar monitors file system
- Graph updates when files change
- Mastery recalculates automatically

#### Deliverables

**Days 1-3: File Watcher Implementation**
```bash
# Tasks
- [ ] Create FileWatcher class
- [ ] Set up Chokidar with correct options
- [ ] Implement file categorization
- [ ] Extract node ID from file paths
- [ ] Debounce updates (500ms)

# Success criteria
- Watcher detects file additions
- Watcher detects file changes
- Watcher ignores .git, node_modules
```

**Days 4-7: Graph Update Pipeline**
```bash
# Tasks
- [ ] Connect watcher to mastery engine
- [ ] Recalculate mastery on file change
- [ ] Update Zustand store
- [ ] Trigger graph re-render
- [ ] Animate node color transitions

# Success criteria
- Adding notes.md activates node (grey → white)
- Completing practice changes color
- Graph updates without manual refresh
- Color transitions are smooth
```

---

### Phase 4: Git Integration (Week 7)
**Duration: 5-7 days**

#### Goals
- Git commits on study sessions
- Sync button works
- Conflict resolution implemented

#### Deliverables

**Days 1-3: Git Manager**
```bash
# Tasks
- [ ] Create GitManager class
- [ ] Implement auto-commit logic
- [ ] Add commit message generation
- [ ] Create sync function (pull + push)
- [ ] Handle basic conflicts

# Success criteria
- Changes auto-commit on app close
- Commit messages are descriptive
- Sync button triggers pull/push
- Last-write-wins for _node.json
```

**Days 4-7: Git UI**
```bash
# Tasks
- [ ] Add sync button to status bar
- [ ] Show sync status indicator
- [ ] Display sync errors
- [ ] Add manual commit option
- [ ] Show recent commits in settings

# Success criteria
- Sync button shows loading state
- Errors display as toast
- Can see commit history
```

---

### Phase 5: Keyboard Shortcuts & UX Polish (Week 8)
**Duration: 5-7 days**

#### Goals
- All keyboard shortcuts work
- Command palette implemented
- Smooth animations throughout

#### Deliverables

**Days 1-3: Keyboard System**
```bash
# Tasks
- [ ] Implement useKeyboardShortcuts hook
- [ ] Add all global shortcuts
- [ ] Create keyboard settings panel
- [ ] Allow custom shortcut mapping
- [ ] Add keyboard hints UI

# Success criteria
- Ctrl+K opens command palette
- Ctrl+Shift+Space opens quick capture
- Arrow keys navigate graph
- Enter opens selected node
- All shortcuts configurable
```

**Days 4-7: Animations & Feedback**
```bash
# Tasks
- [ ] Implement mastery transition animations
- [ ] Add prerequisite unlock animation
- [ ] Create toast notification system
- [ ] Add loading states
- [ ] Implement skeleton screens

# Success criteria
- Node color changes are animated
- Unlock shows shatter effect
- Toasts appear for actions
- Loading states prevent confusion
```

---

### Phase 6: Quick Capture & Productivity Features (Week 9)
**Duration: 5-7 days**

#### Goals
- Quick capture modal works
- Hot-drop folder implemented
- Workflow is smooth

#### Deliverables

**Days 1-3: Quick Capture**
```bash
# Tasks
- [ ] Create QuickCaptureModal component
- [ ] Implement file capture
- [ ] Add screenshot capture
- [ ] Add note capture
- [ ] Add link capture
- [ ] Create node selector

# Success criteria
- Modal opens with Ctrl+Shift+Space
- Can capture to any node
- Files move to correct location
- Notes append correctly
```

**Days 4-7: Hot-Drop Folder**
```bash
# Tasks
- [ ] Set up hot-drop folder watcher
- [ ] Auto-detect active node
- [ ] Move files to active node
- [ ] Show notification on capture
- [ ] Allow manual node selection

# Success criteria
- Dropping file in folder captures it
- Notification shows where it went
- Works with screenshots, PDFs, images
```

---

### Phase 7: Advanced Features (Week 10-11)
**Duration: 10-14 days**

#### Goals
- Exam prep mode functional
- Decay warnings implemented
- Analytics dashboard built

#### Deliverables

**Days 1-4: Exam Prep Mode**
```bash
# Tasks
- [ ] Create exam prep filter
- [ ] Implement priority sorting
- [ ] Add countdown timer
- [ ] Generate study plan
- [ ] Create exam prep sidebar

# Success criteria
- Shows only high-weight nodes
- Highlights weak spots
- Suggests study order
- Shows days until exam
```

**Days 5-8: Decay Warning System**
```bash
# Tasks
- [ ] Create DecayMonitor class
- [ ] Implement decay thresholds
- [ ] Add visual indicators (border pulse)
- [ ] Create decay notifications
- [ ] Add decay stats to analytics

# Success criteria
- 14+ days shows warning
- 21+ days shows critical alert
- Notifications display correctly
- Dashboard shows decay trends
```

**Days 9-14: Analytics Dashboard**
```bash
# Tasks
- [ ] Create Analytics component
- [ ] Add mastery distribution chart
- [ ] Show study time by topic
- [ ] Display weak spot trends
- [ ] Add exam readiness score
- [ ] Create progress over time graph

# Success criteria
- Charts render with real data
- Can filter by date range
- Export data as CSV
- Insights are actionable
```

---

### Phase 8: Additional View Blocks (Week 12)
**Duration: 5-7 days**

#### Goals
- All remaining view blocks implemented
- Block system extensible

#### Deliverables

**Days 1-7: Remaining Blocks**
```bash
# Blocks to implement:
- [ ] ImageGrid (gallery with zoom)
- [ ] KanbanBoard (reads tasks.json)
- [ ] Timeline (chronological view)
- [ ] ResourceList (links to files)
- [ ] RelatedTopics (graph snippet)

# Success criteria
- Each block is fully functional
- Data saves back to files
- Drag-and-drop works in Kanban
- Timeline shows history
```

---

### Phase 9: Testing & Hardening (Week 13)
**Duration: 5-7 days**

#### Goals
- Comprehensive test coverage
- Performance benchmarks met
- Bug fixes

#### Deliverables

**Days 1-3: Unit Tests**
```bash
# Test coverage targets:
- [ ] Mastery calculation (100%)
- [ ] File watchers (90%)
- [ ] Git manager (85%)
- [ ] Color mapping (100%)
- [ ] Schema validation (100%)

# Tools:
- Vitest for unit tests
- React Testing Library for components
```

**Days 4-7: Integration & E2E Tests**
```bash
# Test scenarios:
- [ ] Load course → graph renders
- [ ] Add notes → node activates
- [ ] Complete practice → mastery increases
- [ ] Git commit → syncs correctly
- [ ] File watcher → updates graph

# Tools:
- Playwright for E2E tests
```

---

### Phase 10: Polish & Documentation (Week 14)
**Duration: 5-7 days**

#### Goals
- App is production-ready
- Documentation complete
- Sample course included

#### Deliverables

**Days 1-3: UI Polish**
```bash
# Tasks:
- [ ] Fix all visual bugs
- [ ] Ensure consistent spacing
- [ ] Add loading states everywhere
- [ ] Optimize animations
- [ ] Add empty states

# Success criteria:
- No visual glitches
- Smooth performance
- Professional appearance
```

**Days 4-7: Documentation**
```bash
# Documents to create:
- [ ] README.md (installation, usage)
- [ ] USER_GUIDE.md (how to use SYNAPSE)
- [ ] DEVELOPER_GUIDE.md (architecture, contributing)
- [ ] FILE_STRUCTURE.md (explain directory layout)
- [ ] SHORTCUTS.md (keyboard reference)

# Sample data:
- [ ] Create complete thermodynamics course
- [ ] Add sample media files
- [ ] Include example formulas
- [ ] Add practice problems
```

---

### Phase 11: Build & Distribution (Week 15)
**Duration: 3-5 days**

#### Goals
- Electron app builds for all platforms
- Auto-update configured
- Distribution ready

#### Deliverables

**Days 1-3: Electron Builder**
```bash
# Tasks:
- [ ] Configure electron-builder
- [ ] Create app icons (all sizes)
- [ ] Set up code signing (macOS)
- [ ] Build for Windows (x64, arm64)
- [ ] Build for macOS (Intel, Apple Silicon)
- [ ] Build for Linux (AppImage, deb)

# Output:
- SYNAPSE-1.0.0-win.exe
- SYNAPSE-1.0.0-mac.dmg
- SYNAPSE-1.0.0-linux.AppImage
```

**Days 4-5: Auto-Update**
```bash
# Tasks:
- [ ] Set up update server (or GitHub releases)
- [ ] Implement electron-updater
- [ ] Add update notification UI
- [ ] Test update flow

# Success criteria:
- App checks for updates on launch
- Update downloads in background
- Prompts to restart when ready
```

---

## 10. Testing Requirements

### 10.1 Unit Test Coverage

```typescript
// Example test: Mastery calculation

describe('calculateMastery', () => {
  it('should return 0.0 for completely new node', () => {
    const result = calculateMastery({
      notesCreated: false,
      practiceCompleted: 0,
      practiceTotal: 0,
      manualLinksCreated: 0,
      lastStudied: undefined
    });
    
    expect(result).toBe(0.0);
  });
  
  it('should return 0.10 for node with only notes', () => {
    const result = calculateMastery({
      notesCreated: true,
      practiceCompleted: 0,
      practiceTotal: 0,
      manualLinksCreated: 0,
      lastStudied: new Date().toISOString()
    });
    
    expect(result).toBe(0.10);
  });
  
  it('should return 0.60 for half practice + notes', () => {
    const result = calculateMastery({
      notesCreated: true,
      practiceCompleted: 5,
      practiceTotal: 10,
      manualLinksCreated: 0,
      lastStudied: new Date().toISOString()
    });
    
    expect(result).toBe(0.35); // 0.10 + (5/10)*0.50
  });
  
  it('should apply time decay for old study sessions', () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = calculateMastery({
      notesCreated: true,
      practiceCompleted: 10,
      practiceTotal: 10,
      manualLinksCreated: 3,
      lastStudied: thirtyDaysAgo.toISOString()
    });
    
    // Base: 0.10 + 0.50 + 0.10 = 0.70
    // Decay: 0.70 * 0.8 = 0.56
    expect(result).toBeCloseTo(0.56, 2);
  });
});
```

### 10.2 Integration Tests

```typescript
// Example: File watcher triggers mastery update

describe('File Watcher Integration', () => {
  it('should activate node when notes.md is created', async () => {
    const basePath = createTestCourse();
    const watcher = new FileWatcher(basePath, callbacks);
    const store = useGraphStore.getState();
    
    // Initial state: node is locked
    expect(store.nodes[0].mastery.status).toBe('locked');
    
    // Create notes file
    await fs.writeFile(
      path.join(basePath, 'thermodynamics/01-fundamentals/notes.md'),
      '# My notes'
    );
    
    // Wait for watcher to process
    await waitFor(() => {
      const updatedNode = store.nodes[0];
      expect(updatedNode.mastery.status).toBe('active');
      expect(updatedNode.mastery.score).toBeGreaterThan(0);
    });
  });
});
```

### 10.3 E2E Test Scenarios

```typescript
// Example: Playwright E2E test

test('complete study workflow', async ({ page }) => {
  // 1. Launch app
  await page.goto('http://localhost:3000');
  
  // 2. Open sample course
  await page.click('text=Thermodynamics');
  
  // 3. Verify graph loads
  await page.waitForSelector('svg');
  const nodes = await page.$$('circle');
  expect(nodes.length).toBeGreaterThan(0);
  
  // 4. Click a node
  await page.click('circle[data-node-id="01-fundamentals"]');
  
  // 5. Open topic center
  await page.dblclick('circle[data-node-id="01-fundamentals"]');
  
  // 6. Verify topic center opens
  await page.waitForSelector('[data-testid="topic-center"]');
  
  // 7. Edit notes
  await page.click('[data-testid="notes-editor"]');
  await page.fill('textarea', '# Test notes');
  
  // 8. Close topic center
  await page.keyboard.press('Escape');
  
  // 9. Verify node color changed
  const nodeColor = await page.getAttribute(
    'circle[data-node-id="01-fundamentals"]',
    'fill'
  );
  expect(nodeColor).toBe('#FFFFFF'); // Activated
});
```

---

## 11. Performance Benchmarks

### 11.1 Targets

```typescript
const PERFORMANCE_TARGETS = {
  graphRender: {
    nodes: 100,
    maxTime: 100, // ms
    fps: 60
  },
  
  fileScan: {
    nodeCount: 50,
    maxTime: 500 // ms
  },
  
  masteryCalculation: {
    perNode: 1, // ms
    batchOf100: 100 // ms
  },
  
  fileWatch: {
    detectionLatency: 500, // ms
    updateLatency: 200 // ms
  },
  
  animation: {
    nodeTransition: 60, // fps
    zoomAnimation: 60 // fps
  }
};
```

### 11.2 Optimization Strategies

```typescript
// Memoization for expensive calculations
const MemoizedNode = memo(Node, (prev, next) => {
  return (
    prev.node.id === next.node.id &&
    prev.node.mastery.score === next.node.mastery.score &&
    prev.selected === next.selected
  );
});

// Virtual scrolling for large lists
<VirtualizedList
  items={nodes}
  renderItem={renderNode}
  height={600}
  itemHeight={40}
/>

// Debounced file watcher
const debouncedUpdate = debounce(updateGraph, 500);
watcher.on('change', debouncedUpdate);

// Web Workers for heavy computation
// (Not needed for initial version, but plan for future)
```

---

## 12. Build & Deployment

### 12.1 Electron Builder Configuration

```json
// electron-builder.json

{
  "appId": "com.synapse.app",
  "productName": "SYNAPSE",
  "copyright": "Copyright © 2025",
  "directories": {
    "buildResources": "build",
    "output": "dist"
  },
  "files": [
    "dist-electron/**/*",
    "dist/**/*",
    "package.json"
  ],
  "mac": {
    "category": "public.app-category.education",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      }
    ],
    "icon": "build/icon.icns",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64", "ia32"]
      }
    ],
    "icon": "build/icon.ico"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "category": "Education",
    "icon": "build/icons"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

### 12.2 Build Scripts

```json
// package.json scripts

{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:dev": "electron .",
    "electron:build": "electron-builder",
    "electron:build:mac": "electron-builder --mac",
    "electron:build:win": "electron-builder --win",
    "electron:build:linux": "electron-builder --linux",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext ts,tsx",
    "format": "prettier --write src"
  }
}
```

### 12.3 Distribution Checklist

```markdown
Pre-Release Checklist:

- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Sample course included
- [ ] App icons created (all sizes)
- [ ] Code signing certificates configured
- [ ] Privacy policy written
- [ ] License file included (MIT recommended)
- [ ] Changelog updated
- [ ] Version bumped in package.json
- [ ] Build for all platforms
- [ ] Test installers on clean machines
- [ ] Create GitHub release
- [ ] Upload installers to release
- [ ] Update website/README with download links
```

---

## 13. Future Enhancements (Post-MVP)

### 13.1 Phase 12+ Features

**TV Dashboard Mode**
- Large-text optimized view
- Auto-refresh every 30 seconds
- Progress animations
- Remote control support

**Tablet Sync (Tab S10 Ultra)**
- Samsung Notes integration
- PNG auto-import
- Handwriting OCR
- Stylus-optimized UI

**Time-Lapse Export**
- Parse Git history
- Generate frames for each commit
- Compile with ffmpeg
- Add date overlay

**Advanced Analytics**
- Heat map of study time
- Mastery progression graph
- Predictive exam readiness
- Learning velocity trends

**Sub-Node System**
- Nested knowledge maps
- Recursive base structure
- Zoom into complex topics

**Collaborative Features** (far future)
- Share course structures
- Community syllabus library
- (Still local-first, Git-based)

---

## 14. Critical Implementation Notes

### 14.1 Security Considerations

```typescript
// NEVER store sensitive data in _node.json
// NEVER commit API keys to Git
// ALWAYS sanitize user input
// ALWAYS validate file paths

// Example: Safe file path handling
function safeJoin(base: string, ...paths: string[]): string {
  const joined = path.join(base, ...paths);
  const normalized = path.normalize(joined);
  
  if (!normalized.startsWith(base)) {
    throw new Error('Path traversal detected');
  }
  
  return normalized;
}
```

### 14.2 Error Handling Strategy

```typescript
// All async operations must handle errors

async function loadSyllabus(path: string): Promise<SyllabusJson> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    const data = JSON.parse(content);
    return SyllabusJsonSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid syllabus format', error);
    }
    throw new FileError('Failed to load syllabus', error);
  }
}

// Display errors to user
function handleError(error: Error): void {
  console.error(error);
  
  if (error instanceof ValidationError) {
    showToast('Invalid file format', 'error');
  } else if (error instanceof FileError) {
    showToast('File operation failed', 'error');
  } else {
    showToast('An unexpected error occurred', 'error');
  }
}
```

### 14.3 Data Integrity

```typescript
// Always validate before save
async function saveNodeJson(nodeId: string, data: NodeJson): Promise<void> {
  // Validate
  const validated = NodeJsonSchema.parse(data);
  
  // Create backup
  const backupPath = `${nodePath}/_node.json.backup`;
  await fs.copyFile(nodePath, backupPath);
  
  try {
    // Write
    await fs.writeFile(
      nodePath,
      JSON.stringify(validated, null, 2),
      'utf-8'
    );
    
    // Delete backup on success
    await fs.unlink(backupPath);
  } catch (error) {
    // Restore from backup on failure
    await fs.copyFile(backupPath, nodePath);
    throw error;
  }
}
```

---

## 15. Conclusion

This specification provides a complete blueprint for building SYNAPSE from scratch. Every component, every interaction, and every visual detail has been specified.

### Key Principles to Remember:
1. **Local-first**: No cloud dependencies
2. **File-based**: Everything in JSON/Markdown
3. **Deterministic**: No black boxes
4. **Keyboard-first**: Power user focused
5. **Visual**: Make learning visible

### Development Order:
1. Foundation (types, schemas, IPC)
2. Graph visualization (D3.js)
3. Mastery system (calculation, colors)
4. Topic Center (view blocks)
5. File watching (live updates)
6. Git integration (sync)
7. Polish (animations, shortcuts)
8. Advanced features (exam prep, analytics)

This specification is ready to be pasted into Copilot or any AI coding assistant for implementation. All decisions have been made. All ambiguities resolved. Build with confidence.

---

**Document Version**: 1.0  
**Last Updated**: March 2025  
**Total Specification Pages**: 100+  
**Estimated Build Time**: 12-15 weeks  
**Target Platform**: Desktop (Windows, macOS, Linux)
