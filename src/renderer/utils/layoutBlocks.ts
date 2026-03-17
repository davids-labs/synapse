import type { ViewBlock } from '../../shared/types';

const GRID_COLUMNS = 12;
const MIN_BLOCK_WIDTH = 2;
const MIN_BLOCK_HEIGHT = 2;

function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA <= endB && startB <= endA;
}

export function blocksOverlap(left: ViewBlock, right: ViewBlock): boolean {
  const leftColEnd = left.position.col + left.size.width - 1;
  const leftRowEnd = left.position.row + left.size.height - 1;
  const rightColEnd = right.position.col + right.size.width - 1;
  const rightRowEnd = right.position.row + right.size.height - 1;

  return (
    rangesOverlap(left.position.col, leftColEnd, right.position.col, rightColEnd) &&
    rangesOverlap(left.position.row, leftRowEnd, right.position.row, rightRowEnd)
  );
}

export function clampBlock(block: ViewBlock): ViewBlock {
  const width = Math.max(MIN_BLOCK_WIDTH, Math.min(GRID_COLUMNS, block.size.width));
  const height = Math.max(MIN_BLOCK_HEIGHT, block.size.height);
  const col = Math.max(1, Math.min(GRID_COLUMNS - width + 1, block.position.col));
  const row = Math.max(1, block.position.row);

  return {
    ...block,
    position: { row, col },
    size: {
      width,
      height,
    },
  };
}

export function resolveBlockCollisions(blocks: ViewBlock[]): ViewBlock[] {
  const byId = new Map<string, ViewBlock>();
  const placed: ViewBlock[] = [];

  const sorted = [...blocks].sort(
    (left, right) =>
      left.position.row - right.position.row || left.position.col - right.position.col,
  );

  for (const original of sorted) {
    let candidate = clampBlock(original);

    while (placed.some((existing) => blocksOverlap(existing, candidate))) {
      candidate = clampBlock({
        ...candidate,
        position: {
          ...candidate.position,
          row: candidate.position.row + 1,
        },
      });
    }

    placed.push(candidate);
    byId.set(candidate.id, candidate);
  }

  return blocks.map((block) => byId.get(block.id) ?? clampBlock(block));
}

export function moveBlockToCell(
  blocks: ViewBlock[],
  blockId: string,
  position: { row: number; col: number },
): ViewBlock[] {
  return resolveBlockCollisions(
    blocks.map((block) =>
      block.id === blockId
        ? {
            ...block,
            position: {
              row: Math.max(1, position.row),
              col: Math.max(1, position.col),
            },
          }
        : block,
    ),
  );
}

export function resizeBlockInLayout(
  blocks: ViewBlock[],
  blockId: string,
  size: { width: number; height: number },
): ViewBlock[] {
  return resolveBlockCollisions(
    blocks.map((block) =>
      block.id === blockId
        ? {
            ...block,
            size: {
              width: Math.max(MIN_BLOCK_WIDTH, size.width),
              height: Math.max(MIN_BLOCK_HEIGHT, size.height),
            },
          }
        : block,
    ),
  );
}
