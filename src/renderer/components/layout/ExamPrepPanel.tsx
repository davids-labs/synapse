import { formatPercent } from '../../utils/fileHelpers';
import type { ExamPrepSummary } from '../../../shared/types';

interface ExamPrepPanelProps {
  summary: ExamPrepSummary;
  onOpenNode: (nodeId: string) => void;
}

export function ExamPrepPanel({ summary, onOpenNode }: ExamPrepPanelProps) {
  if (!summary.enabled) {
    return null;
  }

  return (
    <aside className="panel w-80 shrink-0 p-4">
      <div className="space-y-6">
        <section>
          <p className="text-xs uppercase tracking-[0.22em] text-amber-300">Exam Prep</p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {summary.daysRemaining ?? '?'} day{summary.daysRemaining === 1 ? '' : 's'} remaining
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Focused topics: {summary.focusedNodeIds.length}
            {summary.examDate ? ` • Exam ${summary.examDate}` : ''}
          </p>
        </section>

        <section>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Priority Order</p>
          <div className="mt-3 space-y-2">
            {summary.prioritizedItems.map((item) => (
              <button
                key={item.nodeId}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-left hover:border-amber-400/40"
                onClick={() => onOpenNode(item.nodeId)}
              >
                <div className="flex items-center justify-between text-sm text-white">
                  <span>{item.title}</span>
                  <span>{formatPercent(item.masteryScore)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>Priority {Math.round(item.priorityScore)}</span>
                  <span>{item.estimatedHoursRemaining}h left</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Daily Plan</p>
          <div className="mt-3 space-y-2">
            {summary.studyPlan.map((entry) => (
              <div key={entry.date} className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                <p className="text-sm font-medium text-white">{entry.date}</p>
                <p className="mt-1 text-xs text-slate-400">{entry.topicTitles.join(' • ')}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
