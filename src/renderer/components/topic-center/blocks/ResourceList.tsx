import type { ResourceFile } from '../../../../shared/types';

interface ResourceListProps {
  resources: ResourceFile[];
}

export function ResourceList({ resources }: ResourceListProps) {
  if (resources.length === 0) {
    return <p className="text-sm text-slate-400">No resources linked yet.</p>;
  }

  return (
    <div className="space-y-2">
      {resources.map((resource) => (
        <div key={resource.path} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
          <p className="text-sm text-white">{resource.name}</p>
          <p className="text-xs text-slate-400">{resource.path}</p>
        </div>
      ))}
    </div>
  );
}
