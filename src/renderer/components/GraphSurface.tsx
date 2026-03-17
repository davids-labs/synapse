import { useEffect, useMemo, useRef, useState } from 'react';
import type { EntityFilter, SynapseEntity, WorkspaceSnapshot } from '../../shared/types';
import { descendants, entityMatchesFilter } from '../lib/appHelpers';

interface GraphSurfaceProps {
  workspace: WorkspaceSnapshot;
  selectedEntity: SynapseEntity;
  filter: EntityFilter;
  resetSignal: number;
  onSelectEntity: (entityPath: string) => void;
}

export function GraphSurface({
  workspace,
  selectedEntity,
  filter,
  resetSignal,
  onSelectEntity,
}: GraphSurfaceProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const currentBase =
    selectedEntity.kind === 'base'
      ? selectedEntity
      : workspace.bases.find((base) =>
          selectedEntity.relativeEntityPath.startsWith(base.relativeEntityPath),
        ) ?? workspace.bases[0];

  const { positioned, visibleLinks } = useMemo(() => {
    const visibleEntities = descendants(currentBase).filter((entity) =>
      entityMatchesFilter(entity, filter),
    );
    const visibleIds = new Set(visibleEntities.map((entity) => entity.relativeEntityPath));
    const visibleNodes = workspace.graph.nodes.filter((node) => visibleIds.has(node.id));
    const visibleGraphLinks = workspace.graph.links.filter(
      (link) => visibleIds.has(link.source) && visibleIds.has(link.target),
    );
    const levels = [...new Set(visibleNodes.map((node) => node.level))].sort(
      (left, right) => left - right,
    );
    const positionedNodes = visibleNodes.map((node) => {
      const levelIndex = levels.indexOf(node.level);
      const siblings = visibleNodes.filter((candidate) => candidate.level === node.level);
      const siblingIndex = siblings.findIndex((candidate) => candidate.id === node.id);
      const x = 140 + levelIndex * 240;
      const y = 100 + ((siblingIndex + 1) * 520) / (siblings.length + 1);
      return { ...node, x, y };
    });

    return {
      positioned: positionedNodes,
      visibleLinks: visibleGraphLinks,
    };
  }, [currentBase, filter, workspace.graph.links, workspace.graph.nodes]);

  const lookup = new Map(positioned.map((node) => [node.id, node]));

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [currentBase.entityPath, resetSignal]);

  return (
    <div className="graph-shell">
      <div className="graph-toolbar">
        <span className="pill">{positioned.length} visible nodes</span>
        <span className="pill">{visibleLinks.length} links</span>
        <div className="button-row">
          <button onClick={() => setZoom((current) => Math.max(0.6, current - 0.1))}>-</button>
          <button onClick={() => setZoom((current) => Math.min(1.8, current + 0.1))}>+</button>
          <button
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div
        className={`graph-surface ${dragRef.current ? 'is-panning' : ''}`}
        onPointerDown={(event) => {
          if ((event.target as SVGElement).tagName === 'circle') {
            return;
          }
          dragRef.current = {
            x: event.clientX - offset.x,
            y: event.clientY - offset.y,
          };
        }}
        onPointerMove={(event) => {
          if (!dragRef.current) {
            return;
          }
          setOffset({
            x: event.clientX - dragRef.current.x,
            y: event.clientY - dragRef.current.y,
          });
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerLeave={() => {
          dragRef.current = null;
        }}
      >
        <svg viewBox="0 0 1400 760" className="graph-svg">
          <g transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}>
            {visibleLinks.map((link) => {
              const source = lookup.get(link.source);
              const target = lookup.get(link.target);
              if (!source || !target) {
                return null;
              }

              return (
                <g key={link.id}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={link.color}
                    strokeWidth={link.width}
                    strokeOpacity={link.opacity}
                    strokeDasharray={link.dashArray}
                  />
                  {link.label && (
                    <text
                      x={(source.x + target.x) / 2}
                      y={(source.y + target.y) / 2 - 6}
                      textAnchor="middle"
                      className="graph-label"
                    >
                      {link.label}
                    </text>
                  )}
                </g>
              );
            })}
            {positioned.map((node) => (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => {
                  const targetEntity = Object.values(workspace.entities).find(
                    (entity) => entity.relativeEntityPath === node.id,
                  );
                  if (targetEntity) {
                    onSelectEntity(targetEntity.entityPath);
                  }
                }}
              >
                <circle
                  r={node.size}
                  fill={node.color}
                  fillOpacity={node.id === selectedEntity.relativeEntityPath ? 1 : 0.84}
                  stroke={node.id === selectedEntity.relativeEntityPath ? 'var(--text-primary)' : 'white'}
                  strokeOpacity={node.id === selectedEntity.relativeEntityPath ? 0.9 : 0.18}
                  strokeWidth={node.id === selectedEntity.relativeEntityPath ? 3 : 2}
                />
                <text y={node.size + 18} textAnchor="middle" className="graph-node-title">
                  {node.title}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
