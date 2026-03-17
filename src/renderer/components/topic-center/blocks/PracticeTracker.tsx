import { useEffect, useState } from 'react';
import matter from 'gray-matter';
import type { PracticeFile } from '../../../../shared/types';

interface PracticeTrackerProps {
  practiceFiles: PracticeFile[];
}

export function PracticeTracker({ practiceFiles }: PracticeTrackerProps) {
  const [items, setItems] = useState(practiceFiles);

  useEffect(() => {
    setItems(practiceFiles);
  }, [practiceFiles]);

  async function togglePractice(practice: PracticeFile) {
    const raw = await window.synapse.openFile(practice.path);
    const parsed = matter(raw);
    const nextCompleted = !practice.completed;
    const nextContent = matter.stringify(parsed.content, {
      ...parsed.data,
      completed: nextCompleted,
    });

    await window.synapse.saveFile(practice.path, nextContent);
    setItems((current) =>
      current.map((item) =>
        item.path === practice.path ? { ...item, completed: nextCompleted } : item,
      ),
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-slate-400">No practice files yet.</p>;
  }

  const completedCount = items.filter((item) => item.completed).length;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>Completion</span>
          <span>
            {completedCount}/{items.length}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
      </div>

      {items.map((practice) => (
        <label
          key={practice.path}
          className="flex gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm"
        >
          <input
            type="checkbox"
            checked={practice.completed}
            onChange={() => void togglePractice(practice)}
          />
          <div className="min-w-0">
            <p className="font-medium text-white">{practice.title}</p>
            <p className="text-xs text-slate-400">{practice.lastAttempted}</p>
            {practice.preview && <p className="mt-2 text-xs text-slate-400">{practice.preview}</p>}
          </div>
        </label>
      ))}
    </div>
  );
}
