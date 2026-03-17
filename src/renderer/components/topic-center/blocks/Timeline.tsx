import type { TimelineEvent } from '../../../../shared/types';

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-400">No timeline events yet.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="flex gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
          <div>
            <p className="text-sm text-white">{event.label}</p>
            <p className="text-xs text-slate-400">{event.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
