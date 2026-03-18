import {
  commitIntegrationHandoffDraft,
  createIntegrationHandoffDraft,
  getIntegrationHandoffDraftById,
  getIntegrationHandoffContracts,
  undoIntegrationHandoff,
} from '../src/main/moduleIntegration';

describe('phase 6 integration handoff contracts and safeguards', () => {
  it('registers mandatory handoff contracts with draft-first review mode', () => {
    const contracts = getIntegrationHandoffContracts();

    const notesToFlashcards = contracts.find((contract) => contract.id === 'notes-to-flashcards');
    const pdfToPractice = contracts.find((contract) => contract.id === 'pdf-to-practice');

    expect(notesToFlashcards).toBeTruthy();
    expect(notesToFlashcards?.commitMode).toBe('draft-first');
    expect(notesToFlashcards?.requiresReview).toBe(true);

    expect(pdfToPractice).toBeTruthy();
    expect(pdfToPractice?.commitMode).toBe('draft-first');
    expect(pdfToPractice?.requiresReview).toBe(true);
  });

  it('creates reviewable notes-to-flashcards drafts before commit and supports undo', () => {
    const draft = createIntegrationHandoffDraft({
      contractId: 'notes-to-flashcards',
      sourceEntityPath: 'workspace/base-a/node-1',
      sourceModuleType: 'markdown-editor',
      targetEntityPath: 'workspace/base-a/node-1',
      targetModuleType: 'flashcard-deck',
      payload: {
        markdown: '# Krebs Cycle\nProduces ATP\n# Glycolysis\nBreaks down glucose',
        requestedItemCount: 3,
      },
    });

    expect(draft.items.length).toBeGreaterThan(0);
  expect(getIntegrationHandoffDraftById(draft.draftId)?.items.length).toBe(draft.items.length);

    expect(() =>
      commitIntegrationHandoffDraft({
        draftId: draft.draftId,
        confirmReview: false,
      }),
    ).toThrow();

    const committed = commitIntegrationHandoffDraft({
      draftId: draft.draftId,
      confirmReview: true,
    });

    expect(committed.generatedItems.length).toBe(draft.items.length);

    const undo = undoIntegrationHandoff(committed.operation.operationId);
    expect(undo.undone).toBe(true);
  });

  it('creates pdf-to-practice question drafts and never silently commits', () => {
    const draft = createIntegrationHandoffDraft({
      contractId: 'pdf-to-practice',
      sourceEntityPath: 'workspace/base-a/node-2',
      sourceModuleType: 'pdf-viewer',
      targetEntityPath: 'workspace/base-a/node-2',
      targetModuleType: 'practice-bank',
      payload: {
        selectedText: 'Define entropy.\nExplain Gibbs free energy relation.',
        requestedItemCount: 2,
      },
    });

    expect(draft.items.length).toBe(2);

    expect(() =>
      commitIntegrationHandoffDraft({
        draftId: draft.draftId,
        confirmReview: false,
      }),
    ).toThrow('Review confirmation is required before committing this integration handoff.');
  });
});
