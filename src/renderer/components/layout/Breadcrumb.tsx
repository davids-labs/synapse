interface BreadcrumbProps {
  path: string[];
  onNavigate: (index: number) => void;
  onToggleFilter: () => void;
  onOpenSettings: () => void;
}

export function Breadcrumb({ path, onNavigate, onToggleFilter, onOpenSettings }: BreadcrumbProps) {
  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4">
      <nav className="flex items-center gap-2 text-sm text-slate-300">
        {path.map((segment, index) => {
          const isLast = index === path.length - 1;
          return (
            <div key={`${segment}-${index}`} className="flex items-center gap-2">
              <button
                className={`transition ${isLast ? 'font-semibold text-white' : 'hover:text-sky-200'}`}
                disabled={isLast}
                onClick={() => onNavigate(index)}
              >
                {segment}
              </button>
              {!isLast && <span className="text-slate-500">&gt;</span>}
            </div>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <button
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:border-sky-400"
          onClick={onToggleFilter}
        >
          Filter
        </button>
        <button
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 hover:border-sky-400"
          onClick={onOpenSettings}
        >
          Settings
        </button>
      </div>
    </header>
  );
}
