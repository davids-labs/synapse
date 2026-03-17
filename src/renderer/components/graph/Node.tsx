import type { SynapseNode } from '../../../shared/types';

interface PositionedNode extends SynapseNode {
  x: number;
  y: number;
}

interface NodeProps {
  node: PositionedNode;
  selected: boolean;
  hovered: boolean;
  dimmed: boolean;
  locked: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function Node({
  node,
  selected,
  hovered,
  dimmed,
  locked,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
}: NodeProps) {
  const radius = selected ? 40 : hovered ? 30 : locked ? 15 : 20;

  return (
    <g
      data-node-id={node.id}
      transform={`translate(${node.x}, ${node.y})`}
      opacity={dimmed ? 0.25 : locked ? 0.55 : 1}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
    >
      {node.mastery.status === 'mastered' && (
        <circle r={radius + 8} fill={node.mastery.color} opacity={0.15} />
      )}
      <circle
        r={radius}
        fill={node.mastery.color}
        stroke={selected ? '#FFFFFF' : node.mastery.color}
        strokeWidth={selected ? 4 : 3}
      />
      {locked && (
        <text textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#1A1A1A">
          🔒
        </text>
      )}
      {node.metadata?.weakSpots?.length ? (
        <circle cx={radius - 2} cy={-radius + 2} r={6} fill="#E74C3C" />
      ) : null}
      <text
        y={radius + 18}
        textAnchor="middle"
        fontSize="12"
        fontWeight={600}
        fill="#FFFFFF"
      >
        {node.title}
      </text>
    </g>
  );
}

export type { PositionedNode };
