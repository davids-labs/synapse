import type { GraphLink, SynapseNode } from '../../../shared/types';

interface LayoutLink {
  link: GraphLink;
  source: SynapseNode & { x: number; y: number };
  target: SynapseNode & { x: number; y: number };
}

interface LinkProps {
  link: LayoutLink;
  highlighted: boolean;
}

export function Link({ link, highlighted }: LinkProps) {
  const stroke =
    link.link.type === 'manual'
      ? '#50C878'
      : link.link.type === 'related'
        ? '#4A90E2'
        : '#3A3A3A';

  return (
    <line
      x1={link.source.x}
      y1={link.source.y}
      x2={link.target.x}
      y2={link.target.y}
      stroke={stroke}
      strokeWidth={highlighted ? 4 : 2}
      strokeDasharray={link.link.type === 'related' ? '6 6' : undefined}
      opacity={highlighted ? 1 : 0.7}
    />
  );
}

export type { LayoutLink };
