import {
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { BLOCK_TITLES } from '../../../shared/constants';
import type { NodeWorkspace, SynapseNode, ViewBlock, ViewBlockType } from '../../../shared/types';
import {
  moveBlockToCell,
  resizeBlockInLayout,
  resolveBlockCollisions,
} from '../../utils/layoutBlocks';
import { FormulaVault } from './blocks/FormulaVault';
import { HandwritingGallery } from './blocks/HandwritingGallery';
import { ImageGrid } from './blocks/ImageGrid';
import { KanbanBoard } from './blocks/KanbanBoard';
import { NotesEditor } from './blocks/NotesEditor';
import { PDFPortal } from './blocks/PDFPortal';
import { PracticeTracker } from './blocks/PracticeTracker';
import { ResourceList } from './blocks/ResourceList';
import { Timeline } from './blocks/Timeline';

interface ViewBlockContainerProps {
  node: SynapseNode;
  workspace: NodeWorkspace;
  onNotesSave: (content: string) => Promise<void>;
  onTasksSave: (tasks: NodeWorkspace['tasks']) => Promise<void>;
  onFormulasSave: (formulas: NodeWorkspace['formulas']) => Promise<void>;
  onNodeJsonSave: (updater: (nodeJson: NodeWorkspace['nodeJson']) => NodeWorkspace['nodeJson']) => Promise<void>;
}

const GRID_COLUMNS = 12;
const GRID_ROW_HEIGHT = 136;

export function ViewBlockContainer({
  node,
  workspace,
  onNotesSave,
  onTasksSave,
  onFormulasSave,
  onNodeJsonSave,
}: ViewBlockContainerProps) {
  const [nextBlockType, setNextBlockType] = useState<ViewBlockType>('image-grid');
  const [blocks, setBlocks] = useState<ViewBlock[]>(
    resolveBlockCollisions(workspace.nodeJson.viewBlocks ?? workspace.viewBlocks),
  );
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ row: number; col: number } | null>(null);
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blocksRef = useRef(blocks);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    setBlocks(resolveBlockCollisions(workspace.nodeJson.viewBlocks ?? workspace.viewBlocks));
  }, [workspace.nodeJson.viewBlocks, workspace.viewBlocks]);

  function renderBlock(block: ViewBlock) {
    switch (block.type) {
      case 'notes-editor':
        return <NotesEditor value={workspace.notesContent} onSave={onNotesSave} />;
      case 'handwriting-gallery':
        return <HandwritingGallery assets={workspace.media} />;
      case 'pdf-portal':
        return (
          <PDFPortal
            media={workspace.media}
            resources={workspace.resources}
            nodeJson={workspace.nodeJson}
            onPageChange={(page) =>
              onNodeJsonSave((nodeJson) => ({ ...nodeJson, lastViewedPdfPage: page }))
            }
          />
        );
      case 'formula-vault':
        return <FormulaVault formulas={workspace.formulas} onSave={onFormulasSave} />;
      case 'practice-tracker':
        return <PracticeTracker practiceFiles={workspace.practiceFiles} />;
      case 'image-grid':
        return <ImageGrid assets={workspace.media} />;
      case 'kanban-board':
        return <KanbanBoard tasks={workspace.tasks} onSave={onTasksSave} />;
      case 'timeline':
        return <Timeline events={workspace.timeline} />;
      case 'resource-list':
        return <ResourceList resources={workspace.resources} />;
      case 'related-topics':
        return <p className="text-sm text-slate-400">Related topics live in the sidebar.</p>;
      default:
        return <p className="text-sm text-slate-400">Unsupported block.</p>;
    }
  }

  async function persistBlocks(nextBlocks: ViewBlock[]) {
    const resolved = resolveBlockCollisions(nextBlocks);
    blocksRef.current = resolved;
    setBlocks(resolved);
    await onNodeJsonSave((nodeJson) => ({
      ...nodeJson,
      viewBlocks: resolved,
    }));
  }

  async function handleAddBlock() {
    const nextBlocks = resolveBlockCollisions([
      ...blocks,
      {
        id: `${nextBlockType}-${Date.now()}`,
        type: nextBlockType,
        title: BLOCK_TITLES[nextBlockType],
        targetPath: nextBlockType,
        position: { row: blocks.length + 1, col: 1 },
        size: { width: 6, height: 4 },
      },
    ]);
    await persistBlocks(nextBlocks);
  }

  async function removeBlock(blockId: string) {
    await persistBlocks(blocks.filter((block) => block.id !== blockId));
  }

  function getGridPosition(clientX: number, clientY: number) {
    const container = containerRef.current;
    if (!container) {
      return null;
    }

    const rect = container.getBoundingClientRect();
    const relativeX = Math.max(0, clientX - rect.left);
    const relativeY = Math.max(0, clientY - rect.top);
    const colWidth = rect.width / GRID_COLUMNS;

    return {
      col: Math.max(1, Math.min(GRID_COLUMNS, Math.floor(relativeX / colWidth) + 1)),
      row: Math.max(1, Math.floor(relativeY / GRID_ROW_HEIGHT) + 1),
    };
  }

  function handleDragStart(event: ReactDragEvent<HTMLButtonElement>, blockId: string) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', blockId);
    setDraggedBlockId(blockId);
  }

  function handleDragOver(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!draggedBlockId) {
      return;
    }

    const nextTarget = getGridPosition(event.clientX, event.clientY);
    if (nextTarget) {
      setDropTarget(nextTarget);
    }
  }

  async function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!draggedBlockId) {
      return;
    }

    const nextTarget = getGridPosition(event.clientX, event.clientY) ?? dropTarget;
    if (nextTarget) {
      await persistBlocks(moveBlockToCell(blocksRef.current, draggedBlockId, nextTarget));
    }

    setDraggedBlockId(null);
    setDropTarget(null);
  }

  function beginResize(event: ReactMouseEvent<HTMLButtonElement>, blockId: string) {
    event.preventDefault();
    event.stopPropagation();
    const container = containerRef.current;
    const block = blocksRef.current.find((item) => item.id === blockId);
    if (!container || !block) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const colWidth = rect.width / GRID_COLUMNS;
    const startX = event.clientX;
    const startY = event.clientY;
    const startSize = { ...block.size };
    setResizingBlockId(blockId);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaCols = Math.round((moveEvent.clientX - startX) / colWidth);
      const deltaRows = Math.round((moveEvent.clientY - startY) / GRID_ROW_HEIGHT);
      const nextBlocks = resizeBlockInLayout(blocksRef.current, blockId, {
        width: startSize.width + deltaCols,
        height: startSize.height + deltaRows,
      });
      blocksRef.current = nextBlocks;
      setBlocks(nextBlocks);
    };

    const handleMouseUp = () => {
      setResizingBlockId(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      void persistBlocks(blocksRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  const previewBlock =
    draggedBlockId && dropTarget
      ? blocks.find((block) => block.id === draggedBlockId)
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">View Blocks</p>
          <p className="mt-2 text-xs text-slate-500">
            Drag blocks by the top handle and resize them from the lower-right corner.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-full border border-white/10 bg-black/25 px-3 py-2 text-sm text-white"
            value={nextBlockType}
            onChange={(event) => setNextBlockType(event.target.value as ViewBlockType)}
          >
            {Object.entries(BLOCK_TITLES).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
          <button
            className="rounded-full border border-white/10 px-3 py-2 text-sm text-white hover:border-sky-400"
            onClick={() => void handleAddBlock()}
          >
            Add block
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="grid grid-cols-12 gap-4"
        style={{ gridAutoRows: `${GRID_ROW_HEIGHT}px` }}
        onDragOver={handleDragOver}
        onDrop={(event) => void handleDrop(event)}
        onDragLeave={() => setDropTarget(null)}
      >
        {previewBlock && dropTarget && (
          <div
            className="pointer-events-none rounded-2xl border border-dashed border-sky-300/70 bg-sky-500/10"
            style={{
              gridColumn: `${dropTarget.col} / span ${previewBlock.size.width}`,
              gridRow: `${dropTarget.row} / span ${previewBlock.size.height}`,
            }}
          />
        )}

        {blocks.map((block) => (
          <section
            key={block.id}
            className={`panel relative overflow-hidden p-4 transition ${
              draggedBlockId === block.id ? 'opacity-55' : 'opacity-100'
            } ${resizingBlockId === block.id ? 'ring-1 ring-sky-400/40' : ''}`}
            style={{
              gridColumn: `${block.position.col} / span ${block.size.width}`,
              gridRow: `${block.position.row} / span ${block.size.height}`,
            }}
          >
            <div className="mb-4 border-b border-white/10 pb-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{block.title}</p>
                  <p className="text-xs text-slate-500">{node.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-red-400/20 px-2 py-1 text-[11px] text-red-200"
                    onClick={() => void removeBlock(block.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <button
                draggable
                className="h-2 w-full rounded-full bg-white/10 transition hover:bg-sky-400/40 active:cursor-grabbing"
                onDragStart={(event) => handleDragStart(event, block.id)}
                onDragEnd={() => {
                  setDraggedBlockId(null);
                  setDropTarget(null);
                }}
                title="Drag block"
              />
            </div>
            <div className="max-h-[calc(100%-56px)] overflow-y-auto scrollbar-thin pr-1">
              {renderBlock(block)}
            </div>
            <button
              className="absolute bottom-3 right-3 h-4 w-4 rounded-sm border border-white/20 bg-black/40 transition hover:border-sky-400 hover:bg-sky-500/10"
              onMouseDown={(event) => beginResize(event, block.id)}
              title="Resize block"
            />
          </section>
        ))}
      </div>
    </div>
  );
}
