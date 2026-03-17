import { useUIStore } from '../../store/uiStore';
import { useGraphStore } from '../../store/graphStore';
import type { NodeCategory } from '../../../shared/types';

interface FilterDrawerProps {
  isOpen: boolean;
}

const categories: NodeCategory[] = ['foundation', 'core', 'advanced', 'integration'];

export function FilterDrawer({ isOpen }: FilterDrawerProps) {
  const filter = useGraphStore((state) => state.filter);
  const setFilter = useGraphStore((state) => state.setFilter);
  const examPrepMode = useUIStore((state) => state.examPrepMode);
  const toggleExamPrepMode = useUIStore((state) => state.toggleExamPrepMode);

  const selectedCategories = filter.categories ?? categories;
  const masteryRange = filter.masteryRange ?? [0, 1];

  function toggleCategory(category: NodeCategory) {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((item) => item !== category)
      : [...selectedCategories, category];
    setFilter({ categories: next });
  }

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="panel w-64 shrink-0 p-4">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Categories</p>
          <div className="mt-3 space-y-2">
            {categories.map((category) => (
              <label key={category} className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category)}
                  onChange={() => toggleCategory(category)}
                />
                <span className="capitalize">{category}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Search</p>
          <input
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white"
            placeholder="Search topics..."
            value={filter.searchTerm ?? ''}
            onChange={(event) => setFilter({ searchTerm: event.target.value })}
          />
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Mastery</p>
          <div className="mt-3 space-y-3">
            <input
              type="range"
              min={0}
              max={100}
              value={masteryRange[0] * 100}
              onChange={(event) =>
                setFilter({ masteryRange: [Number(event.target.value) / 100, masteryRange[1]] })
              }
            />
            <input
              type="range"
              min={0}
              max={100}
              value={masteryRange[1] * 100}
              onChange={(event) =>
                setFilter({ masteryRange: [masteryRange[0], Number(event.target.value) / 100] })
              }
            />
            <p className="text-xs text-slate-400">
              {Math.round(masteryRange[0] * 100)}% to {Math.round(masteryRange[1] * 100)}%
            </p>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={examPrepMode}
              onChange={() => {
                toggleExamPrepMode();
                setFilter({ examPrepOnly: !examPrepMode });
              }}
            />
            Exam prep mode
          </label>
        </div>

        <button
          className="w-full rounded-full border border-white/10 px-3 py-2 text-sm text-white hover:border-sky-400"
          onClick={() =>
            setFilter({
              categories,
              masteryRange: [0, 1],
              searchTerm: '',
              examPrepOnly: false,
            })
          }
        >
          Clear all
        </button>
      </div>
    </aside>
  );
}
