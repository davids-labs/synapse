import { useGraphStore } from '../store/graphStore';

export function useNodeSelection() {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const nodes = useGraphStore((state) => state.nodes);
  const workspaces = useGraphStore((state) => state.workspaces);

  const node = selectedNodeId ? nodes.find((item) => item.id === selectedNodeId) ?? null : null;
  const workspace = selectedNodeId ? workspaces[selectedNodeId] ?? null : null;

  return {
    selectedNodeId,
    node,
    workspace,
  };
}
