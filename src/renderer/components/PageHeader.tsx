import { useMemo, useState, type ReactNode } from 'react';
import type {
  DetailSectionId,
  KnowledgeRecord,
  ModuleTemplate,
  SynapseEntity,
  WorkspaceSnapshot,
} from '../../shared/types';
import { formatEntityContext, formatPercentage, prettyTitle } from '../lib/appHelpers';

export interface WormholeDraft {
  targetEntityPath: string;
  label: string;
  bidirectional: boolean;
}

interface PageHeaderProps {
  entity: SynapseEntity;
  workspace: WorkspaceSnapshot;
  surface: 'home' | 'canvas' | 'graph';
  wormholeDraft: WormholeDraft;
  canvasFullscreen: boolean;
  onSurfaceChange: (surface: 'home' | 'canvas' | 'graph') => void;
  onApplyTemplate: (template: ModuleTemplate) => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenModuleLibrary: () => void;
  onUpdateRecord: (patcher: (record: KnowledgeRecord) => KnowledgeRecord) => void;
  onUpdatePageUi: (
    patcher: (
      ui: NonNullable<SynapseEntity['page']['ui']>,
    ) => NonNullable<SynapseEntity['page']['ui']>,
  ) => void;
  onToggleCanvasFullscreen: () => void;
  onWormholeDraftChange: (value: WormholeDraft) => void;
  onCreateWormhole: () => void;
}

const DETAIL_SECTIONS: DetailSectionId[] = [
  'mastery',
  'identity',
  'templates',
  'links',
  'wormholes',
];

export function PageHeader({
  entity,
  workspace,
  surface,
  wormholeDraft,
  canvasFullscreen,
  onSurfaceChange,
  onApplyTemplate,
  onOpenImport,
  onOpenExport,
  onOpenModuleLibrary,
  onUpdateRecord,
  onUpdatePageUi,
  onToggleCanvasFullscreen,
  onWormholeDraftChange,
  onCreateWormhole,
}: PageHeaderProps) {
  const [linkType, setLinkType] = useState<
    'manual-link' | 'hard-prerequisite' | 'soft-prerequisite'
  >('manual-link');
  const [linkTarget, setLinkTarget] = useState('');
  const pageUi = entity.page.ui ?? {
    detailsOpen: false,
    detailSize: 'comfortable' as const,
    detailSectionOrder: DETAIL_SECTIONS,
    hiddenDetailSections: [],
    savedViews: [],
  };
  const inspectorOpen = pageUi.detailsOpen ?? false;
  const detailSectionOrder = pageUi.detailSectionOrder ?? DETAIL_SECTIONS;
  const hiddenDetailSections = pageUi.hiddenDetailSections ?? [];

  const linkTargets = useMemo(
    () =>
      Object.values(workspace.entities).filter(
        (candidate) => candidate.entityPath !== entity.entityPath,
      ),
    [entity.entityPath, workspace.entities],
  );

  const existingLinks = [
    ...entity.record.prerequisites.map((value) => ({ type: 'hard-prerequisite' as const, value })),
    ...entity.record.softPrerequisites.map((value) => ({
      type: 'soft-prerequisite' as const,
      value,
    })),
    ...entity.record.manualLinks.map((value) => ({ type: 'manual-link' as const, value })),
  ];
  const tagNames = entity.record.tags.map(
    (tagId) => workspace.tags.find((tag) => tag.id === tagId)?.name ?? prettyTitle(tagId),
  );
  const visibleSectionIds = detailSectionOrder.filter(
    (sectionId) => !hiddenDetailSections.includes(sectionId),
  );

  const moveDetailSection = (sectionId: DetailSectionId, direction: -1 | 1) => {
    onUpdatePageUi((current) => {
      const order = [...(current.detailSectionOrder ?? DETAIL_SECTIONS)];
      const index = order.indexOf(sectionId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= order.length) {
        return current;
      }
      [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
      return {
        ...current,
        detailSectionOrder: order,
      };
    });
  };

  const sectionMap = {
    mastery: (
      <div key="mastery" className="summary-card">
        <span>Mastery</span>
        <strong>{formatPercentage(entity.mastery.final)}</strong>
        <small>
          {entity.mastery.practiceCompleted}/{entity.mastery.practiceTotal} planned vs completed
        </small>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={entity.record.mastery.manual ?? entity.mastery.final}
          onChange={(event) =>
            onUpdateRecord((record) => ({
              ...record,
              mastery: {
                ...record.mastery,
                manual: Number(event.target.value),
              },
            }))
          }
        />
        <button
          className="tiny-button"
          onClick={() =>
            onUpdateRecord((record) => ({
              ...record,
              mastery: {
                ...record.mastery,
                manual: null,
              },
            }))
          }
        >
          Use Calculated
        </button>
      </div>
    ),
    identity: (
      <div key="identity" className="summary-card">
        <div className="section-heading">
          <span>Tags & Identity</span>
          <span className="pill">{entity.record.tags.length} tags</span>
        </div>
        <div className="pill-wrap">
          {workspace.tags.map((tag) => {
            const active = entity.record.tags.includes(tag.id);
            return (
              <button
                key={tag.id}
                className={`pill ${active ? 'active' : ''}`}
                style={{ borderColor: tag.color }}
                onClick={() =>
                  onUpdateRecord((record) => ({
                    ...record,
                    tags: active
                      ? record.tags.filter((value) => value !== tag.id)
                      : [...record.tags, tag.id],
                  }))
                }
              >
                {tag.name}
              </button>
            );
          })}
        </div>
        <div className="identity-grid">
          <label className="color-field identity-color-field">
            <span>Accent Color</span>
            <div className="color-input-row">
              <input
                className="color-picker-input"
                type="color"
                value={entity.record.color || '#3b82f6'}
                onChange={(event) =>
                  onUpdateRecord((record) => ({
                    ...record,
                    color: event.target.value,
                  }))
                }
              />
              <input
                className="text-input"
                value={entity.record.color || ''}
                placeholder="#3B82F6"
                onChange={(event) =>
                  onUpdateRecord((record) => ({
                    ...record,
                    color: event.target.value || null,
                  }))
                }
              />
            </div>
          </label>
          <label className="field-row identity-field">
            <span>Icon Label</span>
            <input
              className="text-input"
              value={entity.record.icon || ''}
              placeholder="Optional icon label"
              onChange={(event) =>
                onUpdateRecord((record) => ({
                  ...record,
                  icon: event.target.value || null,
                }))
              }
            />
          </label>
        </div>
      </div>
    ),
    templates: (
      <div key="templates" className="summary-card">
        <div className="section-heading">
          <span>Templates</span>
          <span className="pill">{workspace.templates.length}</span>
        </div>
        <div className="pill-wrap">
          {workspace.templates.map((template) => (
            <button key={template.id} className="pill" onClick={() => onApplyTemplate(template)}>
              {template.name}
            </button>
          ))}
        </div>
      </div>
    ),
    links: (
      <div key="links" className="summary-card">
        <div className="section-heading">
          <span>Links</span>
          <span className="pill">{existingLinks.length}</span>
        </div>
        <select
          className="text-input"
          value={linkType}
          onChange={(event) =>
            setLinkType(
              event.target.value as 'manual-link' | 'hard-prerequisite' | 'soft-prerequisite',
            )
          }
        >
          <option value="manual-link">Manual link</option>
          <option value="hard-prerequisite">Hard prerequisite</option>
          <option value="soft-prerequisite">Soft prerequisite</option>
        </select>
        <select
          className="text-input"
          value={linkTarget}
          onChange={(event) => setLinkTarget(event.target.value)}
        >
          <option value="">Select linked entity</option>
          {linkTargets.map((candidate) => (
            <option key={candidate.entityPath} value={candidate.relativeEntityPath}>
              {candidate.title}
            </option>
          ))}
        </select>
        <button
          className="tiny-button"
          disabled={!linkTarget}
          onClick={() => {
            onUpdateRecord((record) => {
              if (linkType === 'hard-prerequisite') {
                return {
                  ...record,
                  prerequisites: Array.from(new Set([...record.prerequisites, linkTarget])),
                };
              }
              if (linkType === 'soft-prerequisite') {
                return {
                  ...record,
                  softPrerequisites: Array.from(
                    new Set([...record.softPrerequisites, linkTarget]),
                  ),
                };
              }
              return {
                ...record,
                manualLinks: Array.from(new Set([...record.manualLinks, linkTarget])),
              };
            });
            setLinkTarget('');
          }}
        >
          Add Link
        </button>
        <div className="list-stack compact">
          {existingLinks.slice(0, 4).map((link) => {
            const target = Object.values(workspace.entities).find(
              (candidate) => candidate.relativeEntityPath === link.value,
            );
            return (
              <div key={`${link.type}-${link.value}`} className="list-row link-row">
                <div className="link-copy">
                  <strong>{target?.title || link.value}</strong>
                  <small>
                    {target ? formatEntityContext(target, workspace.entities) : link.value}
                  </small>
                </div>
                <div className="module-inline-actions">
                  <span className="pill">{prettyTitle(link.type)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateRecord((record) => ({
                        ...record,
                        prerequisites:
                          link.type === 'hard-prerequisite'
                            ? record.prerequisites.filter((value) => value !== link.value)
                            : record.prerequisites,
                        softPrerequisites:
                          link.type === 'soft-prerequisite'
                            ? record.softPrerequisites.filter((value) => value !== link.value)
                            : record.softPrerequisites,
                        manualLinks:
                          link.type === 'manual-link'
                            ? record.manualLinks.filter((value) => value !== link.value)
                            : record.manualLinks,
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),
    wormholes: (
      <div key="wormholes" className="summary-card">
        <div className="section-heading">
          <span>Wormholes</span>
          <span className="pill">{entity.record.wormholes.length}</span>
        </div>
        <select
          className="text-input"
          value={wormholeDraft.targetEntityPath}
          onChange={(event) =>
            onWormholeDraftChange({ ...wormholeDraft, targetEntityPath: event.target.value })
          }
        >
          <option value="">Select target node</option>
          {linkTargets.map((candidate) => (
            <option key={candidate.entityPath} value={candidate.entityPath}>
              {candidate.title}
            </option>
          ))}
        </select>
        <input
          className="text-input"
          value={wormholeDraft.label}
          onChange={(event) =>
            onWormholeDraftChange({ ...wormholeDraft, label: event.target.value })
          }
          placeholder="Optional label"
        />
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={wormholeDraft.bidirectional}
            onChange={(event) =>
              onWormholeDraftChange({ ...wormholeDraft, bidirectional: event.target.checked })
            }
          />
          Bidirectional
        </label>
        <button className="tiny-button" onClick={onCreateWormhole}>
          Create Wormhole
        </button>
      </div>
    ),
  } satisfies Record<DetailSectionId, ReactNode>;

  return (
    <div className="page-header">
      <div className="page-header-main">
        <div className="page-header-copy">
          <div className="page-kicker">
            {prettyTitle(entity.itemType)} · {entity.kind}
          </div>
          <div className="page-title-row">
            <h1>{entity.title}</h1>
            <div className="page-stat-strip-inline">
              <div className="page-stat-chip">
                <span>Mastery</span>
                <strong>{formatPercentage(entity.mastery.final)}</strong>
              </div>
              <div className="page-stat-chip">
                <span>Modules</span>
                <strong>{entity.page.modules.length}</strong>
              </div>
              <div className="page-stat-chip">
                <span>Wormholes</span>
                <strong>{entity.record.wormholes.length}</strong>
              </div>
              <div className="page-stat-chip">
                <span>Links</span>
                <strong>{existingLinks.length}</strong>
              </div>
            </div>
          </div>
          <div className="page-header-meta">
            {tagNames.length > 0 ? (
              <>
                {tagNames.slice(0, 4).map((tagName) => (
                  <span key={tagName} className="pill">
                    {tagName}
                  </span>
                ))}
                {tagNames.length > 4 ? (
                  <span className="pill">+{tagNames.length - 4} more</span>
                ) : null}
              </>
            ) : (
              <span className="page-header-muted">No tags yet</span>
            )}
          </div>
        </div>
        <div className="header-actions">
          <button
            className={surface === 'canvas' ? 'active' : ''}
            onClick={() => onSurfaceChange('canvas')}
          >
            Canvas
          </button>
          <button
            className={surface === 'graph' ? 'active' : ''}
            onClick={() => onSurfaceChange('graph')}
          >
            Graph
          </button>
          {surface === 'canvas' ? (
            <button
              className={canvasFullscreen ? 'active' : ''}
              onClick={onToggleCanvasFullscreen}
            >
              {canvasFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            </button>
          ) : null}
          <button
            className={inspectorOpen ? 'active' : ''}
            onClick={() =>
              onUpdatePageUi((current) => ({
                ...current,
                detailsOpen: !current.detailsOpen,
              }))
            }
          >
            {inspectorOpen ? 'Hide Details' : 'Details'}
          </button>
          <button onClick={onOpenImport}>Import CSV</button>
          <button onClick={onOpenExport}>Export CSV</button>
          <button onClick={onOpenModuleLibrary}>Add Module</button>
        </div>
      </div>

      {inspectorOpen ? (
        <div
          className={`page-summary-grid auto-fit page-inspector-grid detail-size-${pageUi.detailSize}`}
        >
          {visibleSectionIds.map((sectionId) => sectionMap[sectionId])}

          <div className="summary-card detail-controls-card">
            <div className="section-heading">
              <span>Details Layout</span>
              <span className="pill">{pageUi.detailSize}</span>
            </div>
            <label className="field-row identity-field">
              <span>Card Size</span>
              <select
                className="text-input"
                value={pageUi.detailSize}
                onChange={(event) =>
                  onUpdatePageUi((current) => ({
                    ...current,
                    detailSize: event.target.value as NonNullable<
                      SynapseEntity['page']['ui']
                    >['detailSize'],
                  }))
                }
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="wide">Wide</option>
              </select>
            </label>

            <div className="list-stack compact">
              {detailSectionOrder.map((sectionId, index) => {
                const hidden = hiddenDetailSections.includes(sectionId);
                return (
                  <div key={sectionId} className="list-row">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={!hidden}
                        onChange={(event) =>
                          onUpdatePageUi((current) => ({
                            ...current,
                            hiddenDetailSections: event.target.checked
                              ? (current.hiddenDetailSections ?? []).filter(
                                  (value) => value !== sectionId,
                                )
                              : Array.from(
                                  new Set([
                                    ...(current.hiddenDetailSections ?? []),
                                    sectionId,
                                  ]),
                                ),
                          }))
                        }
                      />
                      <span>{prettyTitle(sectionId)}</span>
                    </label>
                    <div className="module-inline-actions">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveDetailSection(sectionId, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        disabled={index === detailSectionOrder.length - 1}
                        onClick={() => moveDetailSection(sectionId, 1)}
                      >
                        Down
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
