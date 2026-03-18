import type {
  IntegrationHandoffCommitRequest,
  IntegrationHandoffCommitResult,
  IntegrationHandoffContract,
  IntegrationHandoffDraft,
  IntegrationHandoffDraftItem,
  IntegrationHandoffOperation,
  IntegrationHandoffRequest,
  IntegrationHandoffUndoResult,
} from '../shared/types';

const HANDOFF_CONTRACTS: IntegrationHandoffContract[] = [
  {
    id: 'notes-to-flashcards',
    sourceModuleType: 'markdown-editor',
    targetModuleType: 'flashcard-deck',
    requiresReview: true,
    supportsUndo: true,
    commitMode: 'draft-first',
  },
  {
    id: 'pdf-to-practice',
    sourceModuleType: 'pdf-viewer',
    targetModuleType: 'practice-bank',
    requiresReview: true,
    supportsUndo: true,
    commitMode: 'draft-first',
  },
  {
    id: 'practice-to-error-log',
    sourceModuleType: 'practice-bank',
    targetModuleType: 'error-log',
    requiresReview: true,
    supportsUndo: true,
    commitMode: 'draft-first',
  },
];

const drafts = new Map<string, IntegrationHandoffDraft>();
const operations = new Map<string, IntegrationHandoffOperation>();

function buildId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function createFlashcardDraftItems(markdown: string, requestedItemCount: number): IntegrationHandoffDraftItem[] {
  const lines = normalizeLines(markdown);
  const headings = lines.filter((line) => /^#{1,4}\s+/.test(line));
  const candidates = headings.length > 0 ? headings : lines;

  return candidates.slice(0, requestedItemCount).map((line, index) => {
    const cleaned = line.replace(/^#{1,4}\s+/, '').trim();
    return {
      id: buildId('card'),
      title: cleaned.slice(0, 80) || `Card ${index + 1}`,
      content: cleaned,
    };
  });
}

function createPracticeDraftItems(text: string, requestedItemCount: number): IntegrationHandoffDraftItem[] {
  const lines = normalizeLines(text);
  const candidates = lines.length > 0 ? lines : ['Extract key concepts from PDF section.'];

  return candidates.slice(0, requestedItemCount).map((line, index) => ({
    id: buildId('practice'),
    title: `Draft Question ${index + 1}`,
    content: line,
  }));
}

function createErrorLogDraftItems(text: string, requestedItemCount: number): IntegrationHandoffDraftItem[] {
  const lines = normalizeLines(text);
  const candidates = lines.length > 0 ? lines : ['Review incorrect answers and capture correction rationale.'];

  return candidates.slice(0, requestedItemCount).map((line, index) => ({
    id: buildId('error-log'),
    title: `Error Review ${index + 1}`,
    content: line,
  }));
}

function findContract(request: IntegrationHandoffRequest): IntegrationHandoffContract {
  const contract = HANDOFF_CONTRACTS.find((item) => item.id === request.contractId);
  if (!contract) {
    throw new Error(`Unknown integration contract: ${request.contractId}`);
  }

  if (contract.sourceModuleType !== request.sourceModuleType) {
    throw new Error('Source module type does not match selected integration contract.');
  }

  if (contract.targetModuleType !== request.targetModuleType) {
    throw new Error('Target module type does not match selected integration contract.');
  }

  return contract;
}

export function getIntegrationHandoffContracts(): IntegrationHandoffContract[] {
  return HANDOFF_CONTRACTS.map((contract) => ({ ...contract }));
}

export function createIntegrationHandoffDraft(request: IntegrationHandoffRequest): IntegrationHandoffDraft {
  const contract = findContract(request);
  const requestedItemCount = request.payload.requestedItemCount ?? 8;

  let items: IntegrationHandoffDraftItem[] = [];
  if (contract.id === 'notes-to-flashcards') {
    const source = request.payload.markdown ?? request.payload.text ?? '';
    items = createFlashcardDraftItems(source, requestedItemCount);
  } else if (contract.id === 'pdf-to-practice') {
    const source = request.payload.selectedText ?? request.payload.text ?? '';
    items = createPracticeDraftItems(source, requestedItemCount);
  } else if (contract.id === 'practice-to-error-log') {
    const source = request.payload.text ?? '';
    items = createErrorLogDraftItems(source, requestedItemCount);
  }

  const draft: IntegrationHandoffDraft = {
    draftId: buildId('handoff-draft'),
    contractId: contract.id,
    sourceEntityPath: request.sourceEntityPath,
    targetEntityPath: request.targetEntityPath,
    sourceModuleType: request.sourceModuleType,
    targetModuleType: request.targetModuleType,
    requiresReview: contract.requiresReview,
    createdAt: new Date().toISOString(),
    items,
  };

  drafts.set(draft.draftId, draft);
  return draft;
}

export function getIntegrationHandoffDraftById(draftId: string): IntegrationHandoffDraft | null {
  const draft = drafts.get(draftId);
  return draft
    ? {
        ...draft,
        items: draft.items.map((item) => ({ ...item })),
      }
    : null;
}

export function commitIntegrationHandoffDraft(
  request: IntegrationHandoffCommitRequest,
): IntegrationHandoffCommitResult {
  const draft = drafts.get(request.draftId);
  if (!draft) {
    throw new Error('Integration draft not found.');
  }

  const contract = HANDOFF_CONTRACTS.find((item) => item.id === draft.contractId);
  if (!contract) {
    throw new Error('Integration contract missing for draft.');
  }

  // Mandatory safeguard: no silent commits for review-first integrations.
  if (contract.requiresReview && !request.confirmReview) {
    throw new Error('Review confirmation is required before committing this integration handoff.');
  }

  const operation: IntegrationHandoffOperation = {
    operationId: buildId('handoff-operation'),
    contractId: draft.contractId,
    draftId: draft.draftId,
    committedAt: new Date().toISOString(),
    targetEntityPath: draft.targetEntityPath,
    targetModuleType: draft.targetModuleType,
    generatedItemCount: draft.items.length,
  };

  operations.set(operation.operationId, operation);

  return {
    operation,
    generatedItems: draft.items.map((item) => ({ ...item })),
  };
}

export function undoIntegrationHandoff(operationId: string): IntegrationHandoffUndoResult {
  const operation = operations.get(operationId);
  if (!operation) {
    return {
      operationId,
      undone: false,
    };
  }

  if (operation.revertedAt) {
    return {
      operationId,
      undone: false,
      revertedAt: operation.revertedAt,
    };
  }

  operation.revertedAt = new Date().toISOString();
  operations.set(operationId, operation);

  return {
    operationId,
    undone: true,
    revertedAt: operation.revertedAt,
  };
}
