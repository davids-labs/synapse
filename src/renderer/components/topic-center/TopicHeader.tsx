import { getMasteryLabel } from '../../utils/colorMapper';
import type { NodeWorkspace, SynapseNode } from '../../../shared/types';

interface TopicHeaderProps {
  node: SynapseNode;
  workspace: NodeWorkspace;
  onMasteryChange: (newScore: number) => void;
  onMarkWeakSpot: () => void;
}

export function TopicHeader({
  node,
  workspace,
  onMasteryChange,
  onMarkWeakSpot,
}: TopicHeaderProps) {
  return (
    <header className="panel flex items-center justify-between p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Topic Center</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">{node.title}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {node.category} • Exam Weight: {node.examWeight}% • {workspace.practiceFiles.length} practice
          {' '}items
        </p>
      </div>

      <div className="w-80 space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-200">
          <span>{getMasteryLabel(node.mastery.score)}</span>
          <span>{node.mastery.score.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={node.mastery.score}
          onChange={(event) => onMasteryChange(Number(event.target.value))}
        />
        <div className="flex justify-end gap-2">
          <button
            className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200 hover:border-sky-400"
            onClick={onMarkWeakSpot}
          >
            Mark Weak Spot
          </button>
        </div>
      </div>
    </header>
  );
}
