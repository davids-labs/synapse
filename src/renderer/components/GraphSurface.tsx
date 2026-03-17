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
  const offsetRef = useRef(offset);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

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
    const nodesByLevel = new Map<number, typeof visibleNodes>();
    visibleNodes.forEach((node) => {
      const group = nodesByLevel.get(node.level);
      if (group) {
        group.push(node);
      } else {
        nodesByLevel.set(node.level, [node]);
      }
    });

    const positionedNodes = visibleNodes.map((node) => {
      const levelIndex = levels.indexOf(node.level);
      const siblings = nodesByLevel.get(node.level) ?? [node];
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
  const entityPathByRelativeId = useMemo(() => {
    const map = new Map<string, string>();
    Object.values(workspace.entities).forEach((entity) => {
      map.set(entity.relativeEntityPath, entity.entityPath);
    });
    return map;
  }, [workspace.entities]);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [currentBase.entityPath, resetSignal]);

  useEffect(
    () => () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

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
          (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
          dragRef.current = {
            x: event.clientX - offset.x,
            y: event.clientY - offset.y,
          };
        }}
        onPointerMove={(event) => {
          if (!dragRef.current) {
            return;
          }
          const nextOffset = {
            x: event.clientX - dragRef.current.x,
            y: event.clientY - dragRef.current.y,
          };

          if (frameRef.current) {
            window.cancelAnimationFrame(frameRef.current);
          }

          frameRef.current = window.requestAnimationFrame(() => {
            setOffset(nextOffset);
            offsetRef.current = nextOffset;
            frameRef.current = null;
          });
        }}
        onPointerUp={(event) => {
          if ((event.currentTarget as HTMLDivElement).hasPointerCapture(event.pointerId)) {
            (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
          }
          dragRef.current = null;
        }}
        onPointerLeave={() => {
          dragRef.current = null;
        }}
      >
        <svg viewBox="0 0 1400 760" className="graph-svg">
          <defs>
            <filter id="graph-node-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="5" stdDeviation="6" floodOpacity="0.28" />
            </filter>
          </defs>
          <g transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}>
            {visibleLinks.map((link) => {
              const source = lookup.get(link.source);
              const target = lookup.get(link.target);
              if (!source || !target) {
                return null;
              }

              const controlX = (source.x + target.x) / 2;
              const curve = `M ${source.x} ${source.y} C ${controlX} ${source.y}, ${controlX} ${target.y}, ${target.x} ${target.y}`;

              return (
                <g key={link.id}>
                  <path
                    d={curve}
                    stroke={link.color}
                    strokeWidth={link.width}
                    strokeOpacity={link.opacity}
                    strokeDasharray={link.dashArray}
                    fill="none"
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
                  const entityPath = entityPathByRelativeId.get(node.id);
                  if (entityPath) {
                    onSelectEntity(entityPath);
                  }
                }}
              >
                <circle
                  r={node.size}
                  fill={node.color}
                  filter="url(#graph-node-shadow)"
                  fillOpacity={node.id === selectedEntity.relativeEntityPath ? 1 : 0.84}
                  stroke={node.id === selectedEntity.relativeEntityPath ? 'var(--text-primary)' : 'white'}
                  strokeOpacity={node.id === selectedEntity.relativeEntityPath ? 0.9 : 0.18}
                  strokeWidth={node.id === selectedEntity.relativeEntityPath ? 3 : 2}
                />
                <circle
                  r={Math.max(5, node.size - 7)}
                  fill="rgba(255, 255, 255, 0.08)"
                  stroke="none"
                  pointerEvents="none"
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
