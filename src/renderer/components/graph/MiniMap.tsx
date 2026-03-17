import type { PositionedNode } from './Node';

interface MiniMapProps {
  nodes: PositionedNode[];
  selectedNodeId?: string;
  width: number;
  height: number;
}

export function MiniMap({ nodes, selectedNodeId, width, height }: MiniMapProps) {
  if (nodes.length === 0) {
    return null;
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxY = Math.max(...nodes.map((node) => node.y));
  const scaleX = width / Math.max(1, maxX - minX);
  const scaleY = height / Math.max(1, maxY - minY);

  return (
    <svg width={width} height={height} className="rounded-lg border border-white/10 bg-black/30">
      {nodes.map((node) => (
        <circle
          key={node.id}
          cx={(node.x - minX) * scaleX + 4}
          cy={(node.y - minY) * scaleY + 4}
          r={node.id === selectedNodeId ? 4 : 2}
          fill={node.mastery.color}
        />
      ))}
    </svg>
  );
}
