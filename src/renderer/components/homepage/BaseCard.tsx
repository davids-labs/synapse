import { formatPercent } from '../../utils/fileHelpers';
import type { BaseCardSummary } from '../../../shared/types';

interface BaseCardProps {
  base: BaseCardSummary;
  onOpen: () => void;
}

export function BaseCard({ base, onOpen }: BaseCardProps) {
  return (
    <button
      className="panel flex h-80 w-72 flex-col justify-between p-6 text-left transition duration-200 hover:-translate-y-1 hover:border-sky-400"
      onClick={onOpen}
    >
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Learning Base</p>
        <h3 className="mt-4 text-2xl font-semibold text-white">{base.title}</h3>
        <p className="mt-2 text-sm text-slate-400">{base.subtitle}</p>
      </div>

      <div className="space-y-3">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
            style={{ width: formatPercent(base.progress) }}
          />
        </div>
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>{formatPercent(base.progress)} complete</span>
          <span>
            {base.masteredNodes}/{base.totalNodes} nodes
          </span>
        </div>
      </div>
    </button>
  );
}
