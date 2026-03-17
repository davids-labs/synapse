import { create } from 'zustand';
import type {
  CourseData,
  GraphFilter,
  GraphLink,
  NodeJson,
  NodeMastery,
  NodeWorkspace,
  SynapseNode,
  SyllabusJson,
} from '../../shared/types';

interface GraphStore {
  coursePath: string | null;
  syllabus: SyllabusJson | null;
  nodes: SynapseNode[];
  links: GraphLink[];
  workspaces: Record<string, NodeWorkspace>;
  decayAlerts: CourseData['decayAlerts'];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  nodeLayout: Record<string, { x: number; y: number }>;
  viewportTransform: { x: number; y: number; k: number };
  filter: GraphFilter;
  setCourse: (course: CourseData) => void;
  clearCourse: () => void;
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  updateNodeMastery: (nodeId: string, mastery: Partial<NodeMastery>) => void;
  updateNodeJson: (nodeId: string, updater: (nodeJson: NodeJson) => NodeJson) => void;
  updateWorkspace: (
    nodeId: string,
    updater: (workspace: NodeWorkspace) => NodeWorkspace,
  ) => void;
  setNodeLayout: (layout: Record<string, { x: number; y: number }>) => void;
  selectConnectedNode: (
    direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
  ) => string | null;
  setFilter: (filter: Partial<GraphFilter>) => void;
  setViewportTransform: (transform: { x: number; y: number; k: number }) => void;
  zoomToNode: (nodeId: string) => void;
  zoomToFit: () => void;
}

const initialState = {
  coursePath: null,
  syllabus: null,
  nodes: [],
  links: [],
  workspaces: {},
  decayAlerts: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  nodeLayout: {},
  viewportTransform: { x: 0, y: 0, k: 1 },
  filter: {},
};

export const useGraphStore = create<GraphStore>((set, get) => ({
  ...initialState,
  setCourse: (course) =>
    set({
      coursePath: course.coursePath,
      syllabus: course.syllabus,
      nodes: course.graph.nodes,
      links: course.graph.links,
      workspaces: course.workspaces,
      decayAlerts: course.decayAlerts,
      nodeLayout: {},
      selectedNodeId:
        course.graph.nodes.find((node) => node.id === get().selectedNodeId)?.id ?? null,
    }),
  clearCourse: () => set({ ...initialState }),
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  hoverNode: (nodeId) => set({ hoveredNodeId: nodeId }),
  updateNodeMastery: (nodeId, mastery) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, mastery: { ...node.mastery, ...mastery } }
          : node,
      ),
    })),
  updateNodeJson: (nodeId, updater) =>
    set((state) => {
      const workspace = state.workspaces[nodeId];
      if (!workspace) {
        return state;
      }

      return {
        workspaces: {
          ...state.workspaces,
          [nodeId]: {
            ...workspace,
            nodeJson: updater(workspace.nodeJson),
          },
        },
      };
    }),
  updateWorkspace: (nodeId, updater) =>
    set((state) => {
      const workspace = state.workspaces[nodeId];
      if (!workspace) {
        return state;
      }

      return {
        workspaces: {
          ...state.workspaces,
          [nodeId]: updater(workspace),
        },
      };
    }),
  setNodeLayout: (nodeLayout) => set({ nodeLayout }),
  selectConnectedNode: (direction) => {
    const state = get();
    if (!state.selectedNodeId) {
      return null;
    }

    const current = state.nodeLayout[state.selectedNodeId];
    if (!current) {
      return null;
    }

    const vector =
      direction === 'ArrowUp'
        ? { x: 0, y: -1 }
        : direction === 'ArrowDown'
          ? { x: 0, y: 1 }
          : direction === 'ArrowLeft'
            ? { x: -1, y: 0 }
            : { x: 1, y: 0 };

    const connectedIds = new Set<string>();
    for (const link of state.links) {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      if (sourceId === state.selectedNodeId) {
        connectedIds.add(targetId);
      }
      if (targetId === state.selectedNodeId) {
        connectedIds.add(sourceId);
      }
    }

    let bestId: string | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const id of connectedIds) {
      const layout = state.nodeLayout[id];
      if (!layout) {
        continue;
      }

      const deltaX = layout.x - current.x;
      const deltaY = layout.y - current.y;
      const distance = Math.max(1, Math.hypot(deltaX, deltaY));
      const directionality = (deltaX * vector.x + deltaY * vector.y) / distance;
      if (directionality <= 0.15) {
        continue;
      }

      const score = directionality - distance / 10000;
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }

    if (bestId) {
      set({ selectedNodeId: bestId });
    }

    return bestId;
  },
  setFilter: (filter) =>
    set((state) => ({
      filter: {
        ...state.filter,
        ...filter,
      },
    })),
  setViewportTransform: (viewportTransform) => set({ viewportTransform }),
  zoomToNode: (nodeId) =>
    set((state) => ({
      selectedNodeId: nodeId,
      viewportTransform: { ...state.viewportTransform, k: 1.4 },
    })),
  zoomToFit: () => set({ viewportTransform: { x: 0, y: 0, k: 1 } }),
}));
