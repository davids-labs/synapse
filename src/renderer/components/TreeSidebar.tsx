import type { EntityFilter, SynapseEntity, WorkspaceSnapshot } from '../../shared/types';
import { entityMatchesFilter } from '../lib/appHelpers';

function EntityGlyph({ kind }: { kind: SynapseEntity['kind'] }) {
  if (kind === 'base') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l1.6 1.8h6.9A2.5 2.5 0 0 1 21 9.3v7.2A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 3.8h7l3.2 3.2v13.2H7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.8v3.5h3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface TreeSidebarProps {
  workspace: WorkspaceSnapshot;
  selectedEntityPath: string | null;
  collapsed?: boolean;
  filter: EntityFilter;
  onFilterChange: (filter: EntityFilter) => void;
  onSelectEntity: (entityPath: string) => void;
  onCreateBase: () => void;
  onCreateChild: (entityPath: string) => void;
  onDeleteEntity: (entityPath: string) => void;
  onRequestClose?: () => void;
  onPointerLeave?: () => void;
}

export function TreeSidebar({
  workspace,
  selectedEntityPath,
  collapsed = false,
  filter,
  onFilterChange,
  onSelectEntity,
  onCreateBase,
  onCreateChild,
  onDeleteEntity,
  onRequestClose,
  onPointerLeave,
}: TreeSidebarProps) {
  const renderNode = (entity: SynapseEntity) => {
    const active = entity.entityPath === selectedEntityPath;
    const matches = entityMatchesFilter(entity, filter);
    const createLabel = entity.kind === 'base' ? `Add node inside ${entity.title}` : `Add child node inside ${entity.title}`;
    const deleteLabel = entity.kind === 'base' ? `Delete base ${entity.title}` : `Delete node ${entity.title}`;

    return (
      <div
        key={entity.entityPath}
        className={`tree-node ${active ? 'active' : ''} ${matches ? '' : 'dimmed'}`}
      >
        <div className="tree-row">
          <button
            type="button"
            className="tree-label"
            onClick={() => onSelectEntity(entity.entityPath)}
            title={entity.title}
          >
            <span className={`tree-kind tree-kind-${entity.kind}`}>
              <EntityGlyph kind={entity.kind} />
            </span>
            <span className="tree-title">{entity.title}</span>
          </button>
          <div className="tree-actions">
            <button
              type="button"
              className="tree-action tree-action-add"
              aria-label={createLabel}
              title={createLabel}
              onClick={() => onCreateChild(entity.entityPath)}
            >
              +
            </button>
            <button
              type="button"
              className="tree-action tree-action-delete"
              aria-label={deleteLabel}
              title={deleteLabel}
              onClick={() => onDeleteEntity(entity.entityPath)}
            >
              x
            </button>
          </div>
        </div>
        {entity.children.length > 0 && (
          <div className="tree-children">{entity.children.map((child) => renderNode(child))}</div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`sidebar-panel ${collapsed ? 'sidebar-floating' : ''}`}
      onMouseLeave={onPointerLeave}
    >
      <div className="sidebar-head">
        <h2>Navigation</h2>
        <div className="button-row">
          <button type="button" className="ghost-button" onClick={onCreateBase}>
            New Base
          </button>
          {onRequestClose ? (
            <button type="button" className="ghost-button" onClick={onRequestClose}>
              Hide
            </button>
          ) : null}
        </div>
      </div>
      <input
        className="text-input"
        value={filter.searchTerm}
        onChange={(event) => onFilterChange({ ...filter, searchTerm: event.target.value })}
        placeholder="Search nodes, tags, pages..."
      />
      <div className="filter-group">
        <label>Mastery</label>
        <div className="range-pair">
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={filter.masteryRange[0]}
            onChange={(event) =>
              onFilterChange({
                ...filter,
                masteryRange: [Number(event.target.value), filter.masteryRange[1]],
              })
            }
          />
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={filter.masteryRange[1]}
            onChange={(event) =>
              onFilterChange({
                ...filter,
                masteryRange: [filter.masteryRange[0], Number(event.target.value)],
              })
            }
          />
        </div>
      </div>
      <div className="filter-group">
        <label>Tags</label>
        <div className="pill-wrap">
          {workspace.tags.map((tag) => {
            const active = filter.tags.includes(tag.id);
            return (
              <button
                key={tag.id}
                className={`pill ${active ? 'active' : ''}`}
                onClick={() =>
                  onFilterChange({
                    ...filter,
                    tags: active
                      ? filter.tags.filter((value) => value !== tag.id)
                      : [...filter.tags, tag.id],
                  })
                }
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="tree-scroll">{workspace.bases.map((base) => renderNode(base))}</div>
    </aside>
  );
}
