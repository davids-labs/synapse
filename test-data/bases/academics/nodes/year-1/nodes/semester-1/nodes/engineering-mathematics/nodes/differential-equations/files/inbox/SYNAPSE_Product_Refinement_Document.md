# SYNAPSE: Product Refinement Document
## David's Edition - Personalized Configuration

**Version**: 2.0 (Refined from Base Spec 1.0)  
**Date**: March 2025  
**Based on**: Discovery Interview Responses  
**Purpose**: This document specifies all deltas, modifications, and custom features for David's personal implementation of SYNAPSE

---

## Executive Summary

Based on your discovery interview, SYNAPSE needs **fundamental architectural changes** from the base spec. Your vision is more ambitious, modular, and expansive than initially planned.

### Core Philosophy Shift

**Base Spec Assumption**: "SYNAPSE is an academic study tool"  
**Your Vision**: "SYNAPSE is the entire operating system for David's Lab (2026-2030)"

### The Three Pillars of David's SYNAPSE

1. **Infinite Modularity** - Custom grid-based modules everywhere
2. **Cross-Galaxy Architecture** - Multiple knowledge bases with wormhole linking
3. **CSV-Driven Flexibility** - Import/export everything, edit on the fly

---

## Part 1: Critical Architectural Changes

### 1.1 The Module System (Priority #1)

**Your Quote**: "modules must work perfectly, from the amount to the trackability to the resizability, grid layout, drag and drop panels and pages and everything like that, that's the core, the smallest pieces make the biggest differences"

#### What Changes:

**Base Spec Approach**:
- Fixed "View Blocks" (HandwritingGallery, PDFPortal, FormulaVault)
- 10 predefined block types
- Topic Center only

**David's Approach**:
- **Infinite module types** - not just 10 predefined
- **Custom Module Studio** - build your own modules on the fly
- **Modules everywhere** - not just Topic Center, but Homepage, Base view, everywhere
- **Grid-based canvas** - 12-column responsive grid on EVERY page

#### New Architecture:

```typescript
// Core module system
interface Module {
  id: string;
  type: ModuleType | 'custom';
  title: string;
  gridPosition: GridPosition;
  config: Record<string, any>;
  data: any;
}

interface GridPosition {
  x: number;           // Column start (1-12)
  y: number;           // Row start
  width: number;       // Span (1-12 columns)
  height: number;      // Span (rows)
}

// Module types - expandable
type ModuleType = 
  // Content viewers
  | 'pdf-viewer'
  | 'image-gallery'
  | 'markdown-editor'
  | 'video-player'
  
  // Trackers
  | 'practice-bank'
  | 'error-log'
  | 'time-tracker'
  | 'progress-bar'
  
  // Organization
  | 'kanban-board'
  | 'calendar'
  | 'file-list'
  | 'link-collection'
  
  // Analytics
  | 'mastery-meter'
  | 'analytics-chart'
  | 'goal-tracker'
  | 'weekly-summary'
  
  // Utilities
  | 'text-entry'
  | 'formula-display'
  | 'definition-card'
  | 'embedded-iframe'
  
  // David's custom
  | 'custom';  // User-created modules
```

#### Module Grid Behavior:

1. **Every page is a canvas**
   - Homepage: Module grid
   - Base view: Module grid
   - Node view: Module grid
   - Settings: Module grid (optional)

2. **Grid system**:
   - 12 columns (Bootstrap-style)
   - Variable row height (minimum 100px)
   - Snap-to-grid dragging
   - Collision detection
   - Auto-reflow on resize

3. **Module actions**:
   - Drag to reposition
   - Resize by dragging corners/edges
   - Configure (settings gear icon)
   - Duplicate
   - Delete
   - Export/import module config

4. **Module persistence**:
   ```json
   // _page.json in every node/base folder
   {
     "layout": "grid",
     "modules": [
       {
         "id": "mod-001",
         "type": "pdf-viewer",
         "position": { "x": 1, "y": 1, "width": 4, "height": 6 },
         "config": { "filepath": "./lecture-notes.pdf", "page": 5 }
       },
       {
         "id": "mod-002",
         "type": "markdown-editor",
         "position": { "x": 5, "y": 1, "width": 4, "height": 6 },
         "config": { "filepath": "./notes.md" }
       },
       {
         "id": "mod-003",
         "type": "practice-bank",
         "position": { "x": 9, "y": 1, "width": 4, "height": 6 },
         "config": { "folder": "./practice" }
       }
     ]
   }
   ```

---

### 1.2 Custom Module Studio

**Your Feature Request**: "a lightweight, built-in widget builder where I could write a bit of code to design my own bespoke modules on the fly"

#### Implementation Approach:

**Option 1: React Component Builder (Advanced)**
```typescript
// User creates custom-error-log.tsx
export default function ErrorLogModule({ config, data, onChange }) {
  const [errors, setErrors] = useState(data.errors || []);
  
  return (
    <div className="error-log-module">
      <h3>Error Log</h3>
      {errors.map(error => (
        <div key={error.id}>
          <strong>{error.question}</strong>: {error.mistake}
        </div>
      ))}
      <button onClick={() => addError()}>Add Error</button>
    </div>
  );
}
```

**Option 2: JSON Config Builder (Simpler, MVP)**
```json
{
  "moduleType": "custom-table",
  "schema": {
    "columns": [
      { "key": "question", "label": "Question #", "type": "text" },
      { "key": "mistake", "label": "Error Made", "type": "textarea" },
      { "key": "date", "label": "Date", "type": "date" }
    ],
    "actions": ["add", "edit", "delete"],
    "sortable": true,
    "filterable": true
  }
}
```

**Recommendation**: Start with Option 2 (JSON Config Builder) for MVP, add Option 1 (React Builder) in Phase 12+.

#### Module Studio UI:

```
┌─────────────────────────────────────────────────────────┐
│  Custom Module Studio                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Module Name: ____________                               │
│  Base Type:   [Table] [Chart] [Form] [Canvas]           │
│                                                          │
│  Configuration:                                          │
│  ┌────────────────────────────────────────────┐        │
│  │ {                                          │        │
│  │   "columns": [                             │        │
│  │     { "key": "...", "label": "..." }       │        │
│  │   ]                                        │        │
│  │ }                                          │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│  Preview:                                                │
│  ┌────────────────────────────────────────────┐        │
│  │ [Live preview of module]                   │        │
│  └────────────────────────────────────────────┘        │
│                                                          │
│                          [Save Module] [Cancel]          │
└─────────────────────────────────────────────────────────┘
```

---

### 1.3 Multi-Base Architecture (The Macro-Galaxy)

**Your Vision**: "Homepage shows my 'Macro-Galaxy' view" with multiple bases: Academics, Personal Projects, Health, Aesthetics, Goals, Travel, etc.

#### Navigation Hierarchy:

```
Homepage (Macro-Galaxy)
│
├─ Academics (Galaxy 1)
│  ├─ Year 1
│  │  ├─ Semester 1
│  │  │  ├─ Engineering Maths (Module/System)
│  │  │  │  ├─ Topic 1 (Node)
│  │  │  │  │  └─ Sub-topic (Sub-node) [infinite depth]
│  │  │  │  ├─ Topic 2
│  │  │  │  └─ Topic 3
│  │  │  ├─ Thermodynamics
│  │  │  └─ ... (3 more modules)
│  │  └─ Semester 2
│  └─ Year 2
│
├─ Personal Projects (Galaxy 2)
│  ├─ FlowState
│  │  ├─ V2 Development
│  │  ├─ Feature Roadmap
│  │  └─ Marketing
│  ├─ M15 Twin-Arm
│  │  ├─ Hardware
│  │  ├─ Firmware
│  │  └─ Testing
│  └─ David's Lab Portfolio
│
├─ Code Repos (Galaxy 3)
│  ├─ React
│  ├─ Python
│  └─ Embedded Systems
│
├─ Health (Galaxy 4)
│  ├─ Training
│  ├─ Nutrition
│  └─ Recovery
│
├─ Aesthetics & Physique (Galaxy 5)
│  └─ ...
│
├─ Goals (Galaxy 6)
│  └─ ...
│
└─ Travel (Galaxy 7)
   └─ ...
```

#### Base Schema:

```typescript
interface Base {
  id: string;
  title: string;
  icon?: string;
  color?: string;
  type: 'academics' | 'projects' | 'personal' | 'custom';
  children: Base[] | Node[];  // Recursive nesting
  modules: Module[];           // Modules on this base page
  metadata: {
    created: string;
    modified: string;
    totalNodes: number;
    averageMastery?: number;
  };
}

// Unlimited depth - everything is either a Base or a Node
type TreeItem = Base | Node;
```

#### Homepage Layout:

```
┌──────────────────────────────────────────────────────────┐
│  SYNAPSE                                          ⚙️      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│         Your Knowledge Operating System                  │
│                                                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ Academics  │  │  Personal  │  │   Health   │        │
│  │            │  │  Projects  │  │            │        │
│  │ 67% ████   │  │ 34% ██     │  │ 89% █████  │        │
│  │ 24/36 nodes│  │ 12/35 nodes│  │ 8/9 nodes  │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│                                                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │Code Repos  │  │Aesthetics  │  │   Goals    │        │
│  │            │  │& Physique  │  │            │        │
│  │ 45% ███    │  │ 72% ████   │  │ 51% ███    │        │
│  │ 15/33 nodes│  │ 18/25 nodes│  │ 23/45 nodes│        │
│  └────────────┘  └────────────┘  └────────────┘        │
│                                                           │
│  [+ Add New Base]                                        │
│                                                           │
│  Quick Actions:                                          │
│  - Recent: Thermodynamics > Carnot Cycle                │
│  - Recent: M15 Twin-Arm > Firmware                      │
│  - Recent: Training > Week 12 Split                     │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Key Features**:
- Each base is a card with progress indicator
- Click to zoom into that galaxy
- Customizable base colors/icons
- Add unlimited bases
- Reorder by drag-and-drop

---

### 1.4 Cross-Galaxy Wormholes

**Your Brilliant Feature**: "If I learn a concept in Engineering Maths (like matrices), I want to be able to physically draw a link from that academic node across the entire app directly into my 'Code Repos' galaxy where I'm building a physics engine in Python."

#### Implementation:

```typescript
interface Wormhole {
  id: string;
  sourceNodeId: string;      // Node in Academics
  sourceBaseId: string;       // e.g., "academics.year1.math"
  targetNodeId: string;       // Node in Code Repos
  targetBaseId: string;       // e.g., "code-repos.python"
  label?: string;             // "Matrices for Physics Engine"
  bidirectional: boolean;     // Show link from both sides
  created: string;
}
```

#### Visual Representation:

**In the source node (Engineering Maths > Matrices)**:
```
┌─────────────────────────────────────────────────────────┐
│  Matrices                                               │
│  Foundation • Mastery: 0.78 ████                        │
├─────────────────────────────────────────────────────────┤
│  [Modules here...]                                      │
│                                                          │
│  Related Across Galaxies:                               │
│  🌌 → Code Repos > Python > Physics Engine             │
│       "Using matrix transformations for 3D physics"     │
│                                                          │
│  [Create Wormhole +]                                    │
└─────────────────────────────────────────────────────────┘
```

**In the target node (Code Repos > Python > Physics Engine)**:
```
┌─────────────────────────────────────────────────────────┐
│  Physics Engine                                         │
│  Core Project • Progress: 45%                           │
├─────────────────────────────────────────────────────────┤
│  [Modules here...]                                      │
│                                                          │
│  Knowledge Dependencies:                                │
│  🌌 ← Academics > Engineering Maths > Matrices          │
│       "Fundamental math for transformations"            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Wormhole Creation UX**:
1. In any node, click "Create Wormhole" button
2. Modal opens: "Link to another node across bases"
3. Fuzzy search: Type to find any node in any base
4. Select target node
5. Add optional label/description
6. Choose bidirectional or one-way
7. Wormhole appears in both nodes' sidebars

**Graph Visualization**:
- On graph view, wormhole links are dashed purple lines
- Hover shows tooltip: "Links to [Base] > [Node]"
- Click to jump to that galaxy

---

### 1.5 CSV Import/Export System

**Your Core Requirement**: "csv imports for all of this, literally, csv imports and parsing and editing and module generation from imports"

#### CSV-Driven Architecture:

**Syllabus Import Format**:
```csv
node_id,title,category,parent_id,exam_weight,prerequisites,estimated_hours
math-01,Calculus Fundamentals,foundation,,25,"",15
math-02,Differential Equations,core,math-01,30,"math-01",20
math-03,Fourier Series,advanced,math-02,20,"math-02",18
thermo-01,Laws of Thermodynamics,foundation,,30,"",12
```

**Module Config CSV**:
```csv
module_id,type,title,position_x,position_y,width,height,config
mod-001,pdf-viewer,Lecture Notes,1,1,4,6,{"filepath":"./notes.pdf"}
mod-002,markdown-editor,My Notes,5,1,4,6,{"filepath":"./my-notes.md"}
mod-003,practice-bank,Problems,9,1,4,6,{"folder":"./practice"}
```

**Practice Bank CSV**:
```csv
question_id,topic,difficulty,type,attempted,correct,last_attempt
q-001,Carnot Cycle,medium,calculation,3,2,2025-03-15
q-002,Entropy,hard,derivation,1,0,2025-03-14
q-003,Efficiency,easy,multiple-choice,2,2,2025-03-16
```

#### Import/Export UI:

```
Settings > Import/Export

┌─────────────────────────────────────────────────────────┐
│  Import Data                                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Import Type:                                            │
│  ( ) Syllabus (create nodes from course structure)      │
│  ( ) Modules (add modules to current page)              │
│  ( ) Practice Bank (add questions to topic)             │
│  ( ) Custom (specify schema)                            │
│                                                          │
│  CSV File: [Choose File] thermodynamics-syllabus.csv    │
│                                                          │
│  Preview:                                                │
│  ┌──────────────────────────────────────────┐          │
│  │ node_id    | title              | ...    │          │
│  │ thermo-01  | Laws of Thermo     | ...    │          │
│  │ thermo-02  | Carnot Cycle       | ...    │          │
│  └──────────────────────────────────────────┘          │
│                                                          │
│  Target Location: Academics > Year 1 > Semester 1      │
│                                                          │
│  [Import] [Cancel]                                      │
└─────────────────────────────────────────────────────────┘
```

**Export Flow**:
- Right-click any base/node
- "Export to CSV" option
- Choose what to export: Structure, Modules, Data
- Download CSV file

---

## Part 2: Mastery System Refinement

### 2.1 Simplified Mastery Calculation

**Your Requirement**: "mastery calculation should be very simple, planned vs completed"

**Base Spec Formula** (Too Complex):
```typescript
mastery = (
  notes_created * 0.10 +
  (practice_completed / practice_total) * 0.50 +
  (manual_links_created / 3) * 0.10
) * time_decay_factor
```

**David's Formula** (Simple & Transparent):
```typescript
mastery = practice_completed / practice_total
```

That's it. No magic, no weights, no decay. Just: **How many practice problems have you done out of the total?**

### 2.2 Manual Override (Essential)

```typescript
interface NodeMastery {
  calculated: number;     // Auto-calculated from practice
  manual: number | null;  // User override
  final: number;          // Display value (manual ?? calculated)
}
```

**UI Implementation**:
```
┌─────────────────────────────────────────────────────────┐
│  Carnot Cycle                                           │
│  Mastery: ████████░░ 82%                                │
│                                                          │
│  Calculated: 82% (41/50 practice completed)             │
│  Manual Override: [────────────●─] 82%                  │
│                   (drag to adjust)                      │
│                                                          │
│  [Use Calculated] [Apply Override]                      │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Practice Bank Integration

Your workflow: "MASSIVE amounts of practice problems by building a bank of practice problems, and organizing them by type, lecture, and difficulty"

**Practice Bank Module**:

```typescript
interface PracticeQuestion {
  id: string;
  title: string;
  type: 'calculation' | 'derivation' | 'multiple-choice' | 'proof' | 'custom';
  difficulty: 'easy' | 'medium' | 'hard';
  source: string;           // "Lecture 5", "Textbook Ch. 3", "Past Exam 2023"
  tags: string[];           // ["carnot-cycle", "efficiency", "exam-relevant"]
  attempts: Attempt[];
  status: 'not-attempted' | 'attempted' | 'correct' | 'mastered';
}

interface Attempt {
  date: string;
  correct: boolean;
  timeSpent?: number;
  notes?: string;
}
```

**Practice Bank UI**:
```
┌─────────────────────────────────────────────────────────┐
│  Practice Bank                               [+ Add Q]  │
├─────────────────────────────────────────────────────────┤
│  Filters: [All] [Easy] [Medium] [Hard]                 │
│  Sort by: [Difficulty▼] [Date] [Status] [Source]       │
│                                                          │
│  ☐ Q-001  Carnot Efficiency Calculation      ●●● Hard   │
│           Lecture 3 | Attempted 3x | Last: 2 days ago   │
│                                                          │
│  ☑ Q-002  Entropy Change Problem             ●● Medium  │
│           Textbook Ch. 4 | ✓ Correct on 2nd attempt    │
│                                                          │
│  ☐ Q-003  Second Law Derivation              ●●● Hard   │
│           Past Exam 2023 | Not attempted                │
│                                                          │
│  Progress: 15/45 completed (33%)                        │
│  Mastery by difficulty:                                 │
│    Easy: 8/10 (80%)                                     │
│    Medium: 5/20 (25%)                                   │
│    Hard: 2/15 (13%)                                     │
└─────────────────────────────────────────────────────────┘
```

### 2.4 Error Log Module

Your requirement: "i want to start an error log"

**Error Log Module**:
```typescript
interface ErrorEntry {
  id: string;
  questionId: string;
  date: string;
  mistake: string;         // What you got wrong
  correction: string;      // The right approach
  conceptGap: string;      // What knowledge was missing
  tags: string[];
  resolved: boolean;
}
```

**Error Log UI**:
```
┌─────────────────────────────────────────────────────────┐
│  Error Log                                   [+ Log Error]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ❌ Q-015: Carnot Efficiency                            │
│     Mistake: Used T instead of ΔT in denominator        │
│     Fix: Remember efficiency = 1 - (T_cold/T_hot)       │
│     Gap: Formula memorization                           │
│     [Mark Resolved]                          2 days ago │
│                                                          │
│  ❌ Q-023: Entropy Calculation                          │
│     Mistake: Forgot to convert to Kelvin                │
│     Fix: Always check units before calculating          │
│     Gap: Unit conversion awareness                      │
│     [Mark Resolved]                          5 days ago │
│                                                          │
│  Resolved: 12 errors                                    │
│  Active: 3 errors                                       │
│  Common gaps: Formula memorization (5x), Units (3x)     │
└─────────────────────────────────────────────────────────┘
```

**Integration with Practice Bank**:
- After completing a question incorrectly, "Log Error" button appears
- Opens quick form: "What went wrong? What's the fix?"
- Error auto-links to the question
- When you redo the question correctly, prompt: "Mark error as resolved?"

---

## Part 3: Visual & UI Refinements

### 3.1 Dark Industrial Aesthetic

**Your Preferences**:
- "modern, subtle and clean"
- "not ugly and old looking"
- Inspired by: Things 3, Notion, Obsidian
- Hate: OneNote, Blackboard, Canvas (ugly, childish)

**Color Palette Refinement**:

```typescript
export const DAVID_COLORS = {
  // Backgrounds (darker than base spec)
  BG_PRIMARY: '#0F0F0F',      // Almost pure black
  BG_SECONDARY: '#1A1A1A',    // Panels
  BG_TERTIARY: '#242424',     // Elevated elements
  BG_HOVER: '#2A2A2A',        // Hover states
  
  // Text (high contrast)
  TEXT_PRIMARY: '#FFFFFF',    // Headers, important text
  TEXT_SECONDARY: '#B0B0B0',  // Body text
  TEXT_TERTIARY: '#808080',   // Muted text
  TEXT_ACCENT: '#3B82F6',     // Links, accents (blue-500)
  
  // Borders (subtle)
  BORDER_DEFAULT: '#2A2A2A',  // Very subtle
  BORDER_FOCUS: '#3B82F6',    // Blue when focused
  BORDER_DIVIDER: '#1F1F1F',  // Section dividers
  
  // Mastery colors (customizable in settings)
  MASTERY_LOCKED: '#4A4A4A',
  MASTERY_ACTIVE: '#FFFFFF',
  MASTERY_UNDERSTANDING: '#3B82F6',  // Blue
  MASTERY_PRACTICING: '#10B981',     // Green (emerald-500)
  MASTERY_MASTERED: '#F59E0B',       // Gold (amber-500)
  MASTERY_WEAK: '#EF4444',           // Red (red-500)
  
  // Accents
  ACCENT_PRIMARY: '#3B82F6',   // Blue
  ACCENT_SUCCESS: '#10B981',   // Green
  ACCENT_WARNING: '#F59E0B',   // Amber
  ACCENT_ERROR: '#EF4444',     // Red
  ACCENT_INFO: '#8B5CF6'       // Purple (for wormholes)
};
```

### 3.2 Typography

```typescript
export const TYPOGRAPHY = {
  FONT_FAMILY: {
    UI: '"Inter", system-ui, -apple-system, sans-serif',
    HEADING: '"SF Pro Display", "Inter", sans-serif',  // Your preference
    MONO: '"JetBrains Mono", "Fira Code", monospace',
    CONTENT: '"Inter", sans-serif'  // Changed from Georgia
  },
  
  FONT_SIZE: {
    XS: '11px',
    SM: '13px',
    BASE: '15px',
    LG: '17px',
    XL: '20px',
    '2XL': '24px',
    '3XL': '32px',
    '4XL': '42px'
  },
  
  FONT_WEIGHT: {
    NORMAL: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700,
    BLACK: 900  // For SF Pro Black headings
  },
  
  LINE_HEIGHT: {
    TIGHT: 1.25,
    NORMAL: 1.5,
    RELAXED: 1.75
  }
};
```

### 3.3 Information Density

**Your Preferences** (from interview):
- Homepage: **8/10** (Dense)
- Knowledge graph: **9/10** (Very dense)
- Topic center: **10/10** (Maximum density)
- Settings screens: **6/10** (Moderate)

**Implementation**:

```typescript
// Density presets
const DENSITY_PRESETS = {
  SPARSE: {
    spacing: '24px',
    fontSize: '16px',
    lineHeight: 1.75,
    padding: '32px'
  },
  MODERATE: {
    spacing: '16px',
    fontSize: '15px',
    lineHeight: 1.5,
    padding: '24px'
  },
  DENSE: {
    spacing: '12px',
    fontSize: '14px',
    lineHeight: 1.4,
    padding: '16px'
  },
  MAXIMUM: {
    spacing: '8px',
    fontSize: '13px',
    lineHeight: 1.3,
    padding: '12px'
  }
};

// Applied per-page
const PAGE_DENSITY = {
  homepage: 'DENSE',
  graph: 'DENSE',
  topicCenter: 'MAXIMUM',
  settings: 'MODERATE'
};
```

**UI Example (Maximum Density Topic Center)**:
```
┌───────────────────────────────────────────────────────┐
│ ← Carnot Cycle          █████████░ 82%  [Weak][+]    │ ← 8px padding
├───────────────────────────────────────────────────────┤
│┌──────────┬──────────┬──────────┐                    │
││PDF Notes │My Notes  │Practice  │                    │ ← No wasted space
││          │          │Bank      │                    │
││Page 1/15 │Edit Mode │15/45 ✓   │                    │
││          │          │          │                    │
││[content] │[content] │[content] │                    │
││          │          │          │                    │
│└──────────┴──────────┴──────────┘                    │
│┌──────────────────────────────────┐                  │
││Error Log         [+ Log]     3/15│                  │ ← Compact headers
││▾ Q-015 Efficiency calc    2d ago │                  │
││▾ Q-023 Entropy units      5d ago │                  │
│└──────────────────────────────────┘                  │
│Related: Laws(0.85)→ Efficiency(0.34)→               │ ← Inline, not cards
└───────────────────────────────────────────────────────┘
```

### 3.4 Node Sizing on Graph

**Your Preference**: "bigger the higher level they are, and how many nodes they interlink with, but not too big, should be subtle"

```typescript
function calculateNodeSize(node: Node): number {
  const baseSize = 20;
  
  // Level multiplier (higher = bigger, but subtle)
  const levelBonus = (node.level || 0) * 2;  // +2px per level
  
  // Connection multiplier (more links = bigger)
  const connectionCount = node.prerequisites.length + node.unlocks.length;
  const connectionBonus = Math.min(connectionCount * 1.5, 10);  // Cap at +10px
  
  return baseSize + levelBonus + connectionBonus;
}

// Examples:
// Level 0, 0 connections: 20px
// Level 1, 3 connections: 20 + 2 + 4.5 = 26.5px (subtle increase)
// Level 3, 8 connections: 20 + 6 + 10 = 36px (noticeable but not huge)
```

### 3.5 Graph Link Styling

**Your Preference**: "hard prerequisite vs soft prerequisite, but also manual links I create"

```typescript
interface LinkStyle {
  width: number;
  color: string;
  dashArray?: string;
  opacity: number;
}

const LINK_STYLES: Record<LinkType, LinkStyle> = {
  HARD_PREREQUISITE: {
    width: 3,
    color: '#EF4444',      // Red - cannot proceed
    opacity: 1
  },
  SOFT_PREREQUISITE: {
    width: 2,
    color: '#8B5CF6',      // Purple - recommended
    dashArray: '5,5',      // Dashed
    opacity: 0.8
  },
  MANUAL_LINK: {
    width: 2,
    color: '#3B82F6',      // Blue - user created
    opacity: 0.9
  },
  WORMHOLE: {
    width: 3,
    color: '#8B5CF6',      // Purple - cross-galaxy
    dashArray: '10,5',     // Long dashes
    opacity: 1
  }
};
```

---

## Part 4: Feature Priority Reordering

### 4.1 What's Most Important to Build First

Based on your answer: "modules must work perfectly... that's the core"

**Original Phase Order** (Base Spec):
1. Phase 0: Foundation
2. Phase 1: Graph Visualization
3. Phase 2: Mastery System
4. Phase 3: Topic Center
5. Phase 4: Keyboard Shortcuts
6. Phase 5: Git Integration
7. ... etc

**David's Phase Order** (Reordered):
1. Phase 0: Foundation (same)
2. **Phase 1: Module System & Grid** ← NEW PRIORITY
3. Phase 2: Multi-Base Architecture
4. Phase 3: CSV Import/Export
5. Phase 4: Graph Visualization
6. Phase 5: Practice Bank & Error Log
7. Phase 6: Simplified Mastery
8. Phase 7: Wormhole Linking
9. Phase 8: Keyboard Shortcuts
10. Phase 9: Git Integration
11. Phase 10: Custom Module Studio
12. Phase 11+: Advanced Features

### 4.2 Revised Build Timeline

**Phase 1: Module System & Grid (Week 2-3)**
- Priority: CRITICAL
- Duration: 10-14 days
- Deliverables:
  - [ ] 12-column responsive grid system
  - [ ] Drag-and-drop module positioning
  - [ ] Resize modules by dragging corners
  - [ ] Module config persistence (_page.json)
  - [ ] 5 core module types working:
    - PDF Viewer
    - Markdown Editor
    - Practice Bank
    - Error Log
    - Image Gallery
  - [ ] Module add/remove/duplicate
  - [ ] Grid works on every page type

**Phase 2: Multi-Base Architecture (Week 4)**
- Priority: HIGH
- Duration: 5-7 days
- Deliverables:
  - [ ] Homepage "Macro-Galaxy" view
  - [ ] Create/edit/delete bases
  - [ ] Recursive nesting (Base → Base → Node → Node)
  - [ ] Breadcrumb navigation
  - [ ] Zoom-in/zoom-out transitions

**Phase 3: CSV Import/Export (Week 5)**
- Priority: HIGH
- Duration: 5-7 days
- Deliverables:
  - [ ] CSV syllabus import (auto-create nodes)
  - [ ] CSV module config import
  - [ ] CSV practice bank import
  - [ ] Export any structure to CSV
  - [ ] Import preview UI
  - [ ] Schema validation

**Phase 4: Graph Visualization (Week 6-7)**
- Priority: MEDIUM (yes, moved down!)
- Duration: 7-10 days
- Deliverables:
  - [ ] D3.js force-directed graph
  - [ ] Node rendering with mastery colors
  - [ ] Link rendering (hard/soft/manual/wormhole)
  - [ ] Zoom/pan behavior
  - [ ] Node size by level + connections

**Phase 5: Practice Bank & Error Log (Week 8)**
- Priority: HIGH
- Duration: 5-7 days
- Deliverables:
  - [ ] Practice question schema
  - [ ] Attempt tracking
  - [ ] Error log creation
  - [ ] Integration between practice and errors
  - [ ] CSV import for questions

**Phase 6: Simplified Mastery (Week 9)**
- Priority: MEDIUM
- Duration: 3-5 days
- Deliverables:
  - [ ] Simple formula: completed / total
  - [ ] Manual override slider
  - [ ] Mastery color mapping
  - [ ] Progress indicators

**Phase 7: Wormhole Linking (Week 10)**
- Priority: MEDIUM
- Duration: 5-7 days
- Deliverables:
  - [ ] Cross-base link creation
  - [ ] Fuzzy search for target node
  - [ ] Bidirectional linking
  - [ ] Wormhole UI in sidebars
  - [ ] Graph visualization for wormholes

**Phase 8-11**: Keyboard, Git, Module Studio, Polish (Week 11-15)

---

## Part 5: Settings & Customization System

### 5.1 Everything Configurable

**Your Requirement**: "everything should be changeable and adaptable in settings"

**Settings Structure**:

```typescript
interface AppSettings {
  // Visual
  theme: 'dark' | 'light';
  colorScheme: ColorScheme;
  density: DensityPreset;
  animations: boolean;
  
  // Mastery
  masteryColors: MasteryColorMap;
  masteryFormula: 'simple' | 'weighted' | 'custom';
  masteryWeights?: MasteryWeights;
  
  // Graph
  nodeSize: 'uniform' | 'by-level' | 'by-connections' | 'custom';
  linkStyles: LinkStyleMap;
  
  // Modules
  defaultModules: Module[];       // Default modules for new nodes
  moduleSnapping: boolean;        // Snap to grid
  gridColumns: number;            // 12 by default, but customizable
  
  // Data
  basePath: string;
  csvDelimiter: ',' | ';' | '\t';
  dateFormat: string;
  
  // Keyboard
  shortcuts: KeyboardShortcutMap;
  
  // Git
  gitEnabled: boolean;
  autoCommit: boolean;
  autoSync: boolean;
  
  // Advanced
  developerMode: boolean;         // Show debug info
  customCSSPath?: string;         // Advanced theming
}
```

**Settings UI** (with search):

```
┌─────────────────────────────────────────────────────────┐
│  Settings                                [Search...   ] │
├──────────────┬──────────────────────────────────────────┤
│ Visual       │  Color Scheme                            │
│ Mastery      │  ┌──────────────────────────────────────┐│
│ Graph        │  │ Locked:    [#4A4A4A] ■               ││
│ Modules      │  │ Active:    [#FFFFFF] ■               ││
│ Data         │  │ Practicing:[#10B981] ■               ││
│ Keyboard     │  │ Mastered:  [#F59E0B] ■               ││
│ Git          │  └──────────────────────────────────────┘│
│ Advanced     │                                           │
│              │  Density                                  │
│              │  ( ) Sparse  ( ) Moderate                │
│              │  (•) Dense   ( ) Maximum                 │
│              │                                           │
│              │  Animations                               │
│              │  [✓] Enable smooth transitions            │
│              │  [✓] Node mastery level-up effects       │
│              │  [✓] Wormhole pulse animation            │
│              │                                           │
│              │  [Save Changes] [Reset to Defaults]      │
└──────────────┴──────────────────────────────────────────┘
```

### 5.2 Theme Customization

```typescript
// User can create custom themes
interface CustomTheme {
  name: string;
  colors: ColorScheme;
  typography: TypographyConfig;
  spacing: SpacingConfig;
}

// Export/import themes as JSON
const davidTheme: CustomTheme = {
  name: "David's Dark Industrial",
  colors: DAVID_COLORS,
  typography: {
    heading: '"SF Pro Display", sans-serif',
    headingWeight: 900,  // Black
    // ... etc
  },
  spacing: {
    base: 8,
    // ... etc
  }
};
```

---

## Part 6: Workflow-Specific Features

### 6.1 The Perfect Day Integration

Based on your "perfect day" scenario, here are custom features:

**8:00 AM - Morning Briefing Module**
```typescript
// Homepage module: Daily Summary
interface DailySummary {
  goalsToday: Goal[];
  weakSpotsToReview: Node[];
  upcomingDeadlines: Deadline[];
  yesterdayProgress: {
    nodesWorked: number;
    masteryGained: number;
    practiceCompleted: number;
  };
}
```

**UI**:
```
┌─────────────────────────────────────────────────────────┐
│  Today's Focus                              Mon, Mar 16  │
├─────────────────────────────────────────────────────────┤
│  Goals:                                                  │
│  ☐ Complete 15 Thermodynamics practice Qs               │
│  ☐ Review Entropy & Enthalpy weak spots                 │
│  ☐ M15: Test inverse kinematics module                  │
│                                                           │
│  Upcoming:                                               │
│  📅 Engineering Maths Midterm - 4 days                  │
│  📅 M15 CAD Review Meeting - 2 days                     │
│                                                           │
│  Yesterday: +12% mastery • 23 questions • 2.5hrs        │
└─────────────────────────────────────────────────────────┘
```

**12:00 PM - Quick Capture from Tablet**

Workflow:
1. Export Notein notes as PDF
2. Drag into SYNAPSE hot-drop folder (or directly into app window)
3. Modal appears: "Which node?"
4. Fuzzy search: "thermo" → selects Thermodynamics node
5. PDF appears in that node's PDF Viewer module
6. Done

**2:00 PM - The Grind (3-Panel Layout)**

Pre-configured layout saved as template:

```json
// _page_templates/study-mode.json
{
  "name": "Study Mode",
  "modules": [
    {
      "type": "pdf-viewer",
      "position": { "x": 1, "y": 1, "width": 4, "height": 8 },
      "config": { "filepath": "./lecture-notes.pdf" }
    },
    {
      "type": "markdown-editor",
      "position": { "x": 5, "y": 1, "width": 4, "height": 8 },
      "config": { "filepath": "./my-notes.md" }
    },
    {
      "type": "practice-bank",
      "position": { "x": 9, "y": 1, "width": 4, "height": 8 },
      "config": { "folder": "./practice" }
    }
  ]
}
```

**Quick action**: In any node, click "Apply Template" → "Study Mode" → instant 3-panel setup.

**6:00 PM - Context Switch**

Breadcrumb: `Home > Academics > Year 1 > Semester 1 > Thermodynamics`

Click `Home` → Zooms out to Macro-Galaxy

Click `Personal Projects` → Zooms into that galaxy

Navigate: `Personal Projects > M15 Twin-Arm > Firmware`

Modules appear: Kanban board, CAD viewer, time tracker

**10:00 PM - Analytics Review**

```
┌─────────────────────────────────────────────────────────┐
│  Today's Stats                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Time Distribution:                                     │
│  Thermodynamics ████████░░░░ 2.5 hrs                    │
│  M15 Firmware   ████░░░░░░░░ 1.2 hrs                    │
│  Engineering Math ██░░░░░░░░░░ 0.6 hrs                  │
│                                                          │
│  Mastery Gained:                                        │
│  +12% overall                                           │
│  Thermodynamics: 0.65 → 0.78 (+13%)                    │
│  M15: 0.45 → 0.52 (+7%)                                 │
│                                                          │
│  Practice:                                              │
│  23 questions completed                                 │
│  3 errors logged                                        │
│  91% accuracy                                           │
│                                                          │
│  [Export Daily Log] [Set Tomorrow's Goals]              │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Tag & Filter System

**Your Requirement**: "i would like a filter mode where i can mark things with the exam tag, or any other tag"

```typescript
interface Tag {
  id: string;
  name: string;
  color: string;
  icon?: string;
  applyTo: 'nodes' | 'modules' | 'bases' | 'all';
}

// Examples:
const TAGS: Tag[] = [
  { id: 'exam', name: 'Exam', color: '#EF4444', applyTo: 'nodes' },
  { id: 'project', name: 'Project', color: '#10B981', applyTo: 'all' },
  { id: 'urgent', name: 'Urgent', color: '#F59E0B', applyTo: 'all' },
  { id: 'review', name: 'Review', color: '#8B5CF6', applyTo: 'nodes' }
];

// Apply to any entity
interface Taggable {
  tags: string[];  // Tag IDs
}
```

**Filter UI**:
```
┌─────────────────────────────────────────────────────────┐
│  Filters                                          [×]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Tags:                                                   │
│  [✓] Exam         [✓] Project      [ ] Urgent           │
│  [ ] Review       [+ Add Tag]                           │
│                                                          │
│  Mastery:                                                │
│  [──────●────────] 0.0 - 1.0                            │
│                                                          │
│  Bases:                                                  │
│  [✓] Academics    [✓] Personal Projects                 │
│  [ ] Code Repos   [ ] Health                            │
│                                                          │
│  Show: (•) Nodes  ( ) Modules  ( ) Both                 │
│                                                          │
│  [Apply] [Clear All]                                    │
└─────────────────────────────────────────────────────────┘
```

**Graph with filters active**:
- Nodes without matching tags: Dimmed (opacity 0.2)
- Matching nodes: Full opacity, highlighted border
- Matching count shown: "12 / 45 nodes match filters"

---

## Part 7: Advanced Customization

### 7.1 Custom Module Types

Beyond the built-in modules, here are David-specific modules to build:

**Time Tracker Module**:
```typescript
interface TimeEntry {
  id: string;
  nodeId: string;
  start: string;
  end: string;
  duration: number;  // minutes
  type: 'study' | 'project' | 'review';
  notes?: string;
}
```

**CAD Render Viewer** (for M15):
```typescript
interface CADRenderModule {
  type: 'cad-render';
  config: {
    renderFolder: string;      // Path to PNG renders
    autoRefresh: boolean;       // Reload on file change
    compareMode: boolean;       // Side-by-side comparison
  };
}
```

**Goal Tracker Module**:
```typescript
interface Goal {
  id: string;
  title: string;
  deadline: string;
  progress: number;       // 0-100
  milestones: Milestone[];
  linked NodeId?: string;  // Optional link to a node
}
```

**Definition Card Module** (for confused concepts):
```typescript
interface DefinitionCard {
  term: string;
  definition: string;
  formula?: string;        // LaTeX
  relatedTerms: string[];
  examples: string[];
}
```

### 7.2 Module Templates

Save module configurations as reusable templates:

```json
// ~/.synapse/module-templates/
{
  "study-grind": {
    "name": "Study Grind (3-panel)",
    "modules": [ /* ... */ ]
  },
  
  "project-dashboard": {
    "name": "Project Dashboard",
    "modules": [
      { "type": "kanban-board", "position": {...} },
      { "type": "time-tracker", "position": {...} },
      { "type": "cad-render", "position": {...} },
      { "type": "goal-tracker", "position": {...} }
    ]
  },
  
  "exam-prep": {
    "name": "Exam Prep Mode",
    "modules": [
      { "type": "practice-bank", "position": {...} },
      { "type": "error-log", "position": {...} },
      { "type": "formula-vault", "position": {...} }
    ]
  }
}
```

**Apply template**:
- Right-click on empty canvas
- "Apply Template" → Choose template
- Modules instantly appear in configured layout

---

## Part 8: Integration with David's Lab Ecosystem

### 8.1 FlowState Integration

**Potential Synergies**:

1. **Time tracking**: SYNAPSE could feed study time data to FlowState
2. **Session blocks**: FlowState's block system could trigger SYNAPSE to open specific nodes
3. **Shared UI patterns**: Both use modular layouts, could share components

**Simple Integration (Phase 15+)**:
```typescript
// Export SYNAPSE time data
interface SynapseExport {
  sessions: {
    date: string;
    nodeId: string;
    duration: number;
    type: 'study' | 'project';
  }[];
}

// Import to FlowState as "Study" block history
```

### 8.2 M15 Twin-Arm Project Node

**M15 as a Personal Project Base**:

```
Personal Projects
└─ M15 Twin-Arm Sync
   ├─ Hardware
   │  ├─ CAD Design
   │  ├─ BOM & Sourcing
   │  └─ Assembly
   ├─ Firmware
   │  ├─ ESP32 Setup
   │  ├─ Inverse Kinematics
   │  └─ Motion Planning
   ├─ Vision
   │  ├─ ArUco Calibration
   │  └─ Object Detection
   └─ Testing
      ├─ Single Arm Tests
      └─ Dual Arm Coordination
```

**Custom Modules for M15 Node**:
- CAD Render Viewer (auto-refresh Fusion 360 exports)
- Code Snippet Manager (embedded firmware code)
- Test Results Table (calibration data)
- Video Gallery (test recordings)
- Bill of Materials Tracker

**Wormhole to Academics**:
- M15 > Inverse Kinematics ⟷ Academics > Engineering Maths > Matrices

### 8.3 Health & Fitness Tracking

**Health Base Structure**:

```
Health
├─ Training
│  ├─ 7-Day Split
│  ├─ Program Archive
│  └─ PRs & Progress
├─ Nutrition
│  ├─ Meal Prep
│  ├─ Recipes
│  └─ Macro Tracking
├─ Recovery
│  ├─ Sleep Log
│  ├─ Injury Management
│  └─ Mobility Work
├─ Rugby
│  ├─ Plays & Tactics
│  ├─ Position Training
│  └─ Match Analysis
└─ Climbing
   ├─ Route Log
   ├─ Technique Notes
   └─ Project Climbs
```

**Custom Modules**:
- Workout Log (sets/reps/weight)
- Meal Plan Calendar
- Plate Calculator (from FlowState!)
- Route Grade Tracker (climbing)

---

## Part 9: Performance & Technical Requirements

### 9.1 Performance Targets (Adjusted for Density)

**Your Priority**: "ugly, non modern, clogged UI that's too slow" would make you stop using it

```typescript
const PERFORMANCE_TARGETS = {
  // Module grid
  gridRender: {
    moduleCount: 20,
    maxTime: 50,  // ms (stricter than base spec)
    fps: 60
  },
  
  // Graph (less critical than modules)
  graphRender: {
    nodes: 100,
    maxTime: 100,
    fps: 60
  },
  
  // CSV import
  csvImport: {
    rows: 1000,
    maxTime: 500  // ms
  },
  
  // Module drag/resize
  interaction: {
    dragLatency: 16,    // < 1 frame
    resizeLatency: 16,
    snappingLatency: 8
  },
  
  // Page transitions
  navigation: {
    zoomAnimation: 400,  // ms
    pageLoad: 200        // ms
  }
};
```

### 9.2 Lazy Loading & Optimization

For maximum density without lag:

```typescript
// Lazy load module content
const ModuleWrapper = ({ module }) => {
  const isInView = useInView(ref);
  
  return (
    <div ref={ref}>
      {isInView ? (
        <ActualModule {...module} />
      ) : (
        <ModuleSkeleton />
      )}
    </div>
  );
};

// Virtualized lists in practice bank
import { FixedSizeList } from 'react-window';

const PracticeBank = ({ questions }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={questions.length}
      itemSize={60}
      width="100%"
    >
      {({ index, style }) => (
        <QuestionRow question={questions[index]} style={style} />
      )}
    </FixedSizeList>
  );
};
```

### 9.3 Modern Build Stack

```json
{
  "build": {
    "bundler": "Vite 5.x",  // Faster than Webpack
    "minifier": "SWC",      // Faster than Terser
    "target": "ES2022",     // Modern JS
    "splitting": true       // Code splitting for faster loads
  },
  
  "dev": {
    "hmr": true,            // Hot module replacement
    "sourceMaps": true
  }
}
```

---

## Part 10: File Structure Refinement

### 10.1 Simplified Data Structure

**Base Spec Approach** (too rigid):
```
academics/
  year-2/
    semester-1/
      thermodynamics/
        _meta/
        01-fundamentals/
```

**David's Approach** (pure nested nodes):

```
~/.synapse-data/
├─ _config.json           # Global settings
├─ _tags.json             # Global tag definitions
├─ _templates.json        # Module templates
├─ bases/
│  ├─ academics/
│  │  ├─ _base.json       # Base metadata
│  │  ├─ _page.json       # Module layout for base page
│  │  └─ nodes/
│  │     ├─ year-1/
│  │     │  ├─ _node.json
│  │     │  ├─ _page.json
│  │     │  └─ nodes/
│  │     │     ├─ semester-1/
│  │     │     │  ├─ _node.json
│  │     │     │  ├─ _page.json
│  │     │     │  └─ nodes/
│  │     │     │     ├─ engineering-maths/
│  │     │     │     │  ├─ _node.json
│  │     │     │     │  ├─ _page.json
│  │     │     │     │  ├─ files/
│  │     │     │     │  │  ├─ lecture-notes.pdf
│  │     │     │     │  │  ├─ my-notes.md
│  │     │     │     │  │  └─ practice/
│  │     │     │     │  └─ nodes/
│  │     │     │     │     ├─ calculus/
│  │     │     │     │     ├─ linear-algebra/
│  │     │     │     │     └─ differential-equations/
│  │     │     │     └─ thermodynamics/
│  ├─ personal-projects/
│  │  └─ nodes/
│  │     ├─ flowstate/
│  │     ├─ m15-twin-arm/
│  │     └─ davids-lab-portfolio/
│  ├─ health/
│  └─ code-repos/
└─ backups/
   └─ daily/
```

**Key Changes**:
1. Everything is a node (no distinction between "base" and "node")
2. Infinite nesting (`nodes/` folders inside `nodes/`)
3. Files live in `files/` subfolder of each node
4. Every level has `_page.json` for module layout
5. CSV imports create this structure automatically

### 10.2 Node Schema

```typescript
// _node.json
{
  "id": "engineering-maths",
  "title": "Engineering Mathematics",
  "type": "module",  // or "topic", "project", "custom"
  "created": "2025-01-15T10:00:00Z",
  "modified": "2025-03-16T14:30:00Z",
  
  // Mastery
  "mastery": {
    "calculated": 0.78,
    "manual": null,
    "practiceCompleted": 41,
    "practiceTotal": 50
  },
  
  // Metadata
  "tags": ["exam", "semester-1"],
  "color": null,  // Custom color override
  "icon": null,   // Custom icon override
  "examWeight": 30,
  
  // Links
  "prerequisites": ["calculus-basics"],
  "unlocks": ["advanced-maths"],
  "wormholes": [
    {
      "targetBaseId": "code-repos",
      "targetNodeId": "python/numpy-basics",
      "label": "Applied in Python"
    }
  ],
  
  // Custom fields (extensible)
  "custom": {
    "lecturerName": "Dr. Smith",
    "textbook": "Advanced Engineering Mathematics",
    "examDate": "2025-05-20"
  }
}
```

### 10.3 Page Layout Schema

```typescript
// _page.json
{
  "layout": "grid",  // or "custom", "freeform"
  "gridColumns": 12,
  "modules": [
    {
      "id": "mod-001",
      "type": "pdf-viewer",
      "title": "Lecture Notes",
      "position": { "x": 1, "y": 1, "width": 4, "height": 6 },
      "config": {
        "filepath": "files/lecture-notes.pdf",
        "currentPage": 5,
        "zoom": 1.0
      }
    },
    {
      "id": "mod-002",
      "type": "markdown-editor",
      "title": "My Notes",
      "position": { "x": 5, "y": 1, "width": 4, "height": 6 },
      "config": {
        "filepath": "files/my-notes.md",
        "autoSave": true
      }
    },
    {
      "id": "mod-003",
      "type": "practice-bank",
      "title": "Practice Problems",
      "position": { "x": 9, "y": 1, "width": 4, "height": 6 },
      "config": {
        "dataFile": "files/practice/questions.csv",
        "sortBy": "difficulty",
        "filterTags": ["exam-relevant"]
      }
    }
  ],
  "templates": ["study-mode"]  // Applied templates
}
```

---

## Part 11: Keyboard Shortcuts (David's Edition)

### 11.1 Global Shortcuts

```typescript
const DAVID_SHORTCUTS: KeyboardShortcutMap = {
  // Navigation
  'Ctrl+H': 'Go to Homepage',
  'Ctrl+B': 'Toggle Sidebar',
  'Ctrl+K': 'Command Palette / Search',
  'Ctrl+P': 'Quick Node Switcher',
  'Ctrl+,': 'Settings',
  
  // Quick Actions
  'Ctrl+Shift+C': 'Quick Capture',
  'Ctrl+Shift+N': 'New Node',
  'Ctrl+Shift+M': 'New Module',
  'Ctrl+Shift+T': 'New Tag',
  
  // Module Actions (when module focused)
  'Ctrl+D': 'Duplicate Module',
  'Ctrl+E': 'Edit Module Config',
  'Delete': 'Delete Module',
  'Ctrl+Arrow': 'Move Module',
  
  // Graph
  '0': 'Zoom to Fit',
  'F': 'Focus Mode (hide UI)',
  'Arrows': 'Navigate Connected Nodes',
  'Enter': 'Open Selected Node',
  'Esc': 'Back / Close',
  
  // Practice Bank (when focused)
  'Space': 'Toggle Question Complete',
  'Ctrl+L': 'Log Error',
  'Ctrl+F': 'Filter Questions',
  
  // Editor (when focused)
  'Ctrl+S': 'Save',
  'Ctrl+B': 'Bold',
  'Ctrl+I': 'Italic',
  'Ctrl+Shift+K': 'Insert Link',
  'Ctrl+M': 'Insert Math (LaTeX)',
  
  // System
  'Ctrl+Shift+S': 'Git Sync',
  'Ctrl+Shift+E': 'Export to CSV',
  'Ctrl+Shift+I': 'Import from CSV'
};
```

### 11.2 Vim-Style Bonus (Optional)

**Your Preference**: "just let me work"

Option to enable Vim mode in settings:

```typescript
const VIM_NAVIGATION = {
  'h': 'Move Left',
  'j': 'Move Down',
  'k': 'Move Up',
  'l': 'Move Right',
  'gg': 'Go to Top',
  'G': 'Go to Bottom',
  '/': 'Search',
  'n': 'Next Search Result',
  'N': 'Previous Search Result',
  'i': 'Enter Edit Mode',
  'Esc': 'Exit Edit Mode'
};
```

---

## Part 12: Implementation Roadmap (Refined)

### 12.1 MVP Definition (David's Edition)

**Core Features** (Must have for v1.0):
1. ✓ Module grid system (drag, resize, persist)
2. ✓ Multi-base architecture (Macro-Galaxy)
3. ✓ CSV import (syllabus, modules, practice)
4. ✓ Practice bank module
5. ✓ Error log module
6. ✓ Simple mastery (planned/completed)
7. ✓ Manual override
8. ✓ Tag & filter system
9. ✓ Graph visualization (basic)
10. ✓ Keyboard shortcuts

**Nice to Have** (v1.1+):
- Custom Module Studio
- Wormhole linking
- Advanced analytics
- Git integration
- Module templates

### 12.2 Detailed Phase Breakdown

**Phase 0: Foundation** (Week 1)
```
Day 1-2: Project setup, dependencies
Day 3-4: Type definitions, schemas
Day 5-7: IPC bridge, file system helpers
```

**Phase 1: Module System** (Week 2-3) ← PRIORITY
```
Day 1-3: Grid layout system
  - CSS Grid or react-grid-layout
  - Responsive 12-column system
  - Collision detection
  
Day 4-6: Drag & drop
  - react-dnd or @dnd-kit
  - Snap to grid
  - Smooth animations
  
Day 7-9: Resize functionality
  - Corner/edge drag handles
  - Min/max constraints
  - Maintain aspect ratio (optional)
  
Day 10-12: Module persistence
  - _page.json read/write
  - Auto-save on change
  - Load on page open
  
Day 13-14: Core modules
  - PDF Viewer (react-pdf)
  - Markdown Editor (Monaco or CodeMirror)
  - Practice Bank (custom)
  - Error Log (custom)
  - Image Gallery (lightbox)
```

**Phase 2: Multi-Base Architecture** (Week 4)
```
Day 1-2: Homepage Macro-Galaxy view
  - Base cards with progress
  - Add/edit/delete bases
  
Day 3-4: Recursive nesting
  - Base → Base → Node → Node
  - Breadcrumb navigation
  - Back button logic
  
Day 5-7: Zoom transitions
  - Framer Motion animations
  - Smooth camera movement
  - Context preservation
```

**Phase 3: CSV Import/Export** (Week 5)
```
Day 1-2: CSV parser
  - PapaParse integration
  - Schema validation (Zod)
  
Day 3-4: Import workflows
  - Syllabus → create nodes
  - Modules → add to page
  - Practice → populate bank
  
Day 5-7: Export workflows
  - Export structure to CSV
  - Export practice data
  - Export analytics
```

**Phase 4: Graph Visualization** (Week 6-7)
```
Day 1-3: D3.js setup
  - Force simulation
  - Node rendering
  
Day 4-6: Interactions
  - Click, hover, drag
  - Zoom, pan
  
Day 7-10: Styling
  - Mastery colors
  - Link types (hard/soft/wormhole)
  - Node sizing by level
```

**Phase 5: Practice & Errors** (Week 8)
```
Day 1-3: Practice bank module
  - Question list
  - Attempt tracking
  - Filters & sorting
  
Day 4-5: Error log module
  - Error entry form
  - Link to questions
  - Resolution tracking
  
Day 6-7: Integration
  - Practice → Error workflow
  - Mastery calculation
```

**Phase 6: Mastery System** (Week 9)
```
Day 1-2: Simple formula
  - completed / total
  - Real-time updates
  
Day 3-4: Manual override
  - Slider UI
  - Persistence
  
Day 5: Color mapping
  - Mastery → color logic
  - Graph node updates
```

**Phase 7: Tags & Filters** (Week 10)
```
Day 1-2: Tag system
  - Create/edit tags
  - Apply to nodes/modules
  
Day 3-4: Filter UI
  - Multi-select tags
  - Mastery range
  - Base selection
  
Day 5: Graph filtering
  - Dim non-matching nodes
  - Count display
```

**Phase 8-15**: Keyboard, Wormholes, Git, Templates, Module Studio, Polish

---

## Part 13: Final Specifications

### 13.1 Technology Stack (Confirmed)

```json
{
  "framework": "Electron 28+",
  "ui": "React 18.2+",
  "language": "TypeScript 5.3+",
  "bundler": "Vite 5+",
  "styling": "Tailwind CSS 3.4+",
  "stateManagement": "Zustand 4.4+",
  
  "key_libraries": {
    "graph": "D3.js 7.8+",
    "grid": "@dnd-kit/core + @dnd-kit/sortable",
    "csv": "papaparse 5.4+",
    "pdf": "react-pdf 7.5+",
    "markdown": "react-markdown 9+ + remark-math + rehype-katex",
    "validation": "zod 3.22+",
    "git": "simple-git 3.21+",
    "files": "chokidar 3.5+"
  }
}
```

### 13.2 Browser vs Desktop

**Decision**: Desktop-first (Electron), web version later

**Reasoning**:
- File system access (critical for CSV, Git)
- Better performance for dense UIs
- Native feel (your preference for "modern, not childish")
- No server costs (local-first)

**Future**: Web version with limited features (view-only, no file system)

### 13.3 Database Decision

**Decision**: No database, pure file system

**Reasoning**:
- Simpler (no migrations, no schema changes)
- Git-friendly (text files diff well)
- Transparent (you can read/edit JSON manually)
- Portable (just a folder)
- No lock-in

**Structure**:
- JSON for structure (_node.json, _page.json)
- Markdown for notes
- CSV for tabular data
- PNG/PDF for media

---

## Part 14: Success Metrics

### 14.1 How We'll Know It's Working

**Week 2**: Module grid is buttery smooth
- [ ] Can add 10 modules without lag
- [ ] Drag feels responsive
- [ ] Grid snapping is satisfying

**Week 4**: Can navigate your entire life
- [ ] Homepage shows Academics, Projects, Health
- [ ] Can zoom 5 levels deep without getting lost
- [ ] Breadcrumbs always show where you are

**Week 5**: CSV import saves hours
- [ ] Import Trinity semester 1 syllabus in 30 seconds
- [ ] Import 100 practice questions instantly
- [ ] Export entire structure for backup

**Week 10**: Daily driver status
- [ ] You use SYNAPSE every study session
- [ ] 3-panel layout is your default
- [ ] Error log is catching all mistakes
- [ ] Mastery colors feel accurate

**Week 15**: David's Lab integration
- [ ] M15 project lives in SYNAPSE
- [ ] Wormholes connect Academics ↔ Projects
- [ ] Custom modules for CAD, code, testing
- [ ] Time tracking feeds to FlowState

### 14.2 User Testing Milestones

**Phase 1 Complete**: Show me the grid
- Record demo: Add/move/resize 5 modules
- Get feedback on responsiveness

**Phase 3 Complete**: Import your actual syllabus
- Export Engineering Maths from Trinity portal
- Import into SYNAPSE
- See if structure makes sense

**Phase 5 Complete**: One real study session
- Use SYNAPSE for 2 hours studying Thermodynamics
- Log errors, complete practice
- Get feedback on workflow

**MVP Complete**: Replace your current system
- Week 1: Migrate all current notes/materials
- Week 2: Use SYNAPSE exclusively
- Week 3: Assess if you'd go back

---

## Conclusion

This Product Refinement Document transforms the base SYNAPSE spec into **David's SYNAPSE** - a modular, dense, high-performance knowledge operating system that will power David's Lab from 2026 to 2030.

### Key Innovations:
1. **Module-first architecture** - Everything is customizable modules
2. **Infinite nesting** - No artificial limits on hierarchy
3. **Cross-galaxy wormholes** - Link knowledge across domains
4. **CSV-driven** - Import/export everything
5. **Simple mastery** - Transparent, manual override
6. **Dark industrial aesthetic** - Modern, clean, fast

### Next Steps:
1. Review this document
2. Approve/modify architecture decisions
3. Agent begins Phase 0 (Foundation)
4. Weekly check-ins on progress
5. Iterate based on your feedback

### The Vision:
By Week 15, SYNAPSE becomes the single source of truth for:
- Every academic course (Year 1-5)
- Every personal project (FlowState, M15, portfolio)
- Every skill (code, fitness, climbing)
- Every goal (short-term, long-term)

All navigable, all linked, all queryable, all exportable.

**SYNAPSE: Your Knowledge Operating System.**

---

**Document Version**: 2.0  
**Refinement Date**: March 2025  
**Pages**: 50+  
**Ready for Implementation**: ✓
