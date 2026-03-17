import type { SynapseNode } from '../../../shared/types';

interface RelatedTopicsSidebarProps {
  node: SynapseNode;
  nodes: SynapseNode[];
  onOpenNode: (nodeId: string) => void;
}

export function RelatedTopicsSidebar({
  node,
  nodes,
  onOpenNode,
}: RelatedTopicsSidebarProps) {
  const prerequisites = nodes.filter((item) => node.prerequisites.includes(item.id));
  const unlocks = nodes.filter((item) => node.unlocks.includes(item.id));

  return (
    <aside className="panel w-72 shrink-0 p-4">
      <div className="space-y-5">
        <section>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Prerequisites</p>
          <div className="mt-3 space-y-2">
            {prerequisites.map((item) => (
              <button
                key={item.id}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-slate-200 hover:border-sky-400"
                onClick={() => onOpenNode(item.id)}
              >
                <span>{item.title}</span>
                <span>{item.mastery.score.toFixed(2)}</span>
              </button>
            ))}
            {prerequisites.length === 0 && <p className="text-sm text-slate-500">None</p>}
          </div>
        </section>

        <section>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Unlocks</p>
          <div className="mt-3 space-y-2">
            {unlocks.map((item) => (
              <button
                key={item.id}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-slate-200 hover:border-sky-400"
                onClick={() => onOpenNode(item.id)}
              >
                <span>{item.title}</span>
                <span>{item.mastery.status}</span>
              </button>
            ))}
            {unlocks.length === 0 && <p className="text-sm text-slate-500">None</p>}
          </div>
        </section>
      </div>
    </aside>
  );
}
