import { useEffect, useRef, useState } from 'react';
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
} from 'd3-force';
import type { GraphData, GraphFilter, SynapseNode } from '../../../shared/types';
import { useGraphStore } from '../../store/graphStore';
import { useUIStore } from '../../store/uiStore';
import { GraphControls } from './GraphControls';
import { Link, type LayoutLink } from './Link';
import { MiniMap } from './MiniMap';
import { Node, type PositionedNode } from './Node';

interface KnowledgeGraphProps {
  data: GraphData;
  width: number;
  height: number;
  selectedNodeId?: string;
  onNodeClick: (nodeId: string) => void;
  onNodeDoubleClick: (nodeId: string) => void;
  filter?: GraphFilter;
  onZoomToFit: () => void;
}

interface SimulationNode extends SynapseNode {
  x: number;
  y: number;
}

interface SimulationLink extends SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
  type: 'prerequisite' | 'related' | 'manual';
}

export function KnowledgeGraph({
  data,
  width,
  height,
  selectedNodeId,
  onNodeClick,
  onNodeDoubleClick,
  filter,
  onZoomToFit,
}: KnowledgeGraphProps) {
  const hoveredNodeId = useGraphStore((state) => state.hoveredNodeId);
  const hoverNode = useGraphStore((state) => state.hoverNode);
  const setNodeLayout = useGraphStore((state) => state.setNodeLayout);
  const viewportTransform = useGraphStore((state) => state.viewportTransform);
  const setViewportTransform = useGraphStore((state) => state.setViewportTransform);
  const focusMode = useUIStore((state) => state.focusMode);
  const examPrepMode = useUIStore((state) => state.examPrepMode);
  const [layoutNodes, setLayoutNodes] = useState<PositionedNode[]>([]);
  const [layoutLinks, setLayoutLinks] = useState<LayoutLink[]>([]);
  const panStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTransform: { x: number; y: number; k: number };
  } | null>(null);

  useEffect(() => {
    const activeFilter = filter ?? {};
    const visibleNodes = data.nodes.filter((node) => {
      const categoryPass =
        !activeFilter.categories || activeFilter.categories.includes(node.category);
      const masteryPass =
        !activeFilter.masteryRange ||
        (node.mastery.score >= activeFilter.masteryRange[0] &&
          node.mastery.score <= activeFilter.masteryRange[1]);
      const searchPass =
        !activeFilter.searchTerm ||
        node.title.toLowerCase().includes(activeFilter.searchTerm.toLowerCase());
      const examPass = !examPrepMode && !activeFilter.examPrepOnly ? true : node.examWeight > 20;
      return categoryPass && masteryPass && searchPass && examPass;
    });

    const visibleIds = new Set(visibleNodes.map((node) => node.id));
    const visibleLinks = data.links.filter((link) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return visibleIds.has(sourceId) && visibleIds.has(targetId);
    });

    const simulationNodes: SimulationNode[] = visibleNodes.map((node, index) => ({
      ...node,
      x: node.position?.x ?? width / 2 + Math.cos(index) * 180,
      y: node.position?.y ?? height / 2 + Math.sin(index) * 180,
    }));

    const simulationLinks: SimulationLink[] = visibleLinks.map((link) => ({
      source: typeof link.source === 'string' ? link.source : link.source.id,
      target: typeof link.target === 'string' ? link.target : link.target.id,
      type: link.type,
    }));

    const simulation = forceSimulation(simulationNodes)
      .force(
        'link',
        forceLink(simulationLinks)
          .id((node) => (node as SimulationNode).id)
          .distance(140)
          .strength(0.8),
      )
      .force('charge', forceManyBody().strength(-420))
      .force('center', forceCenter(width / 2, height / 2))
      .stop();

    for (let tick = 0; tick < 200; tick += 1) {
      simulation.tick();
    }
    simulation.stop();

    const nextLinks = simulationLinks.flatMap((link) => {
      const source =
        typeof link.source === 'string'
          ? simulationNodes.find((node) => node.id === link.source)
          : link.source;
      const target =
        typeof link.target === 'string'
          ? simulationNodes.find((node) => node.id === link.target)
          : link.target;

      if (!source || !target) {
        return [];
      }

      return [
        {
          link: {
            source: source.id,
            target: target.id,
            type: link.type,
          },
          source,
          target,
        },
      ];
    });

    setLayoutNodes(simulationNodes as PositionedNode[]);
    setLayoutLinks(nextLinks);
    setNodeLayout(
      Object.fromEntries(
        simulationNodes.map((node) => [node.id, { x: node.x, y: node.y }]),
      ),
    );
  }, [data.links, data.nodes, examPrepMode, filter, height, setNodeLayout, width]);

  function isConnected(nodeId: string, otherId: string): boolean {
    return layoutLinks.some(
      (link) =>
        (link.source.id === nodeId && link.target.id === otherId) ||
        (link.source.id === otherId && link.target.id === nodeId),
    );
  }

  const selectedOrHoveredId = hoveredNodeId ?? selectedNodeId;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        onWheel={(event) => {
          event.preventDefault();
          const direction = event.deltaY > 0 ? -0.12 : 0.12;
          setViewportTransform({
            ...viewportTransform,
            k: Math.max(0.5, Math.min(3, viewportTransform.k + direction)),
          });
        }}
        onPointerMove={(event) => {
          const state = panStateRef.current;
          if (!state || state.pointerId !== event.pointerId) {
            return;
          }

          setViewportTransform({
            ...state.startTransform,
            x: state.startTransform.x + (event.clientX - state.startX),
            y: state.startTransform.y + (event.clientY - state.startY),
          });
        }}
        onPointerUp={(event) => {
          if (panStateRef.current?.pointerId === event.pointerId) {
            panStateRef.current = null;
          }
        }}
        onPointerLeave={(event) => {
          if (panStateRef.current?.pointerId === event.pointerId) {
            panStateRef.current = null;
          }
        }}
      >
        <g
          transform={`translate(${viewportTransform.x} ${viewportTransform.y}) scale(${viewportTransform.k})`}
        >
          <rect
            width={width}
            height={height}
            fill="transparent"
            onPointerDown={(event) => {
              panStateRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startTransform: viewportTransform,
              };
            }}
            style={{ cursor: 'grab' }}
          />
          {layoutLinks.map((link) => (
            <Link
              key={`${link.source.id}-${link.target.id}-${link.link.type}`}
              link={link}
              highlighted={
                selectedOrHoveredId
                  ? link.source.id === selectedOrHoveredId || link.target.id === selectedOrHoveredId
                  : false
              }
            />
          ))}

          {layoutNodes.map((node) => (
            <Node
              key={node.id}
              node={node}
              selected={node.id === selectedNodeId}
              hovered={node.id === hoveredNodeId}
              dimmed={
                focusMode && selectedNodeId
                  ? node.id !== selectedNodeId && !isConnected(node.id, selectedNodeId)
                  : false
              }
              locked={node.mastery.status === 'locked'}
              onClick={() => onNodeClick(node.id)}
              onDoubleClick={() => onNodeDoubleClick(node.id)}
              onMouseEnter={() => hoverNode(node.id)}
              onMouseLeave={() => hoverNode(null)}
            />
          ))}
        </g>
      </svg>

      <GraphControls
        onZoomIn={() =>
          setViewportTransform({ ...viewportTransform, k: Math.min(2.5, viewportTransform.k + 0.1) })
        }
        onZoomOut={() =>
          setViewportTransform({ ...viewportTransform, k: Math.max(0.6, viewportTransform.k - 0.1) })
        }
        onZoomToFit={onZoomToFit}
      />

      <div className="absolute bottom-4 right-4">
        <MiniMap nodes={layoutNodes} selectedNodeId={selectedNodeId} width={120} height={80} />
      </div>
    </div>
  );
}
