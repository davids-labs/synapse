import { useEffect, useState } from 'react';
import type { FormulaEntry } from '../../../../shared/types';

interface FormulaVaultProps {
  formulas: FormulaEntry[];
  onSave: (formulas: FormulaEntry[]) => Promise<void>;
}

export function FormulaVault({ formulas, onSave }: FormulaVaultProps) {
  const [draft, setDraft] = useState<FormulaEntry[]>(formulas);

  useEffect(() => {
    setDraft(formulas);
  }, [formulas]);

  function updateEntry(index: number, patch: Partial<FormulaEntry>) {
    setDraft((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {draft.map((formula, index) => (
          <div key={formula.id} className="rounded-xl border border-white/10 p-3">
            <input
              className="mb-2 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white"
              value={formula.name}
              onChange={(event) => updateEntry(index, { name: event.target.value })}
            />
            <textarea
              className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-white"
              value={formula.formula}
              onChange={(event) => updateEntry(index, { formula: event.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          className="rounded-full border border-white/10 px-3 py-2 text-sm text-white"
          onClick={() =>
            setDraft((current) => [
              ...current,
              {
                id: `formula-${Date.now()}`,
                name: 'New formula',
                formula: 'E = mc^2',
              },
            ])
          }
        >
          Add formula
        </button>
        <button
          className="rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sm text-white"
          onClick={() => void onSave(draft)}
        >
          Save formulas
        </button>
      </div>
    </div>
  );
}
