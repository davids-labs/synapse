import { useEffect, useMemo, useState } from 'react';
import { useHistoryStore } from '../../store/historyStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useUIStore } from '../../store/uiStore';

interface CommandPaletteProps {
  activeCoursePath: string | null;
  onGoHome: () => void;
  onSyncNow: () => void;
}

interface PaletteCommand {
  id: string;
  label: string;
  shortcut: string;
  category: 'Navigation' | 'Editing' | 'Git' | 'Settings';
  available: boolean;
  run: () => void;
}

export function CommandPalette({ activeCoursePath, onGoHome, onSyncNow }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const closeCommandPalette = useUIStore((state) => state.closeCommandPalette);
  const toggleFocusMode = useUIStore((state) => state.toggleFocusMode);
  const toggleExamPrepMode = useUIStore((state) => state.toggleExamPrepMode);
  const openAnalytics = useUIStore((state) => state.openAnalytics);
  const openQuickCapture = useUIStore((state) => state.openQuickCapture);
  const toggleFilterDrawer = useUIStore((state) => state.toggleFilterDrawer);
  const openSettings = useUIStore((state) => state.openSettings);
  const shortcuts = useSettingsStore((state) => state.keyboardShortcuts);
  const recentCommands = useHistoryStore((state) => state.recentCommands);
  const pushRecentCommand = useHistoryStore((state) => state.pushRecentCommand);

  const commands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: 'quick-capture',
        label: 'Open Quick Capture',
        shortcut: shortcuts.quickCapture,
        category: 'Editing',
        available: true,
        run: () => openQuickCapture(),
      },
      {
        id: 'go-home',
        label: 'Go Home',
        shortcut: 'Ctrl+H',
        category: 'Navigation',
        available: true,
        run: () => onGoHome(),
      },
      {
        id: 'toggle-filter',
        label: 'Toggle Filter Drawer',
        shortcut: shortcuts.toggleSidebar,
        category: 'Navigation',
        available: true,
        run: () => toggleFilterDrawer(),
      },
      {
        id: 'toggle-focus',
        label: 'Toggle Focus Mode',
        shortcut: 'F',
        category: 'Navigation',
        available: true,
        run: () => toggleFocusMode(),
      },
      {
        id: 'toggle-exam',
        label: 'Toggle Exam Prep Mode',
        shortcut: '',
        category: 'Navigation',
        available: true,
        run: () => toggleExamPrepMode(),
      },
      {
        id: 'open-analytics',
        label: 'Open Analytics Dashboard',
        shortcut: '',
        category: 'Settings',
        available: Boolean(activeCoursePath),
        run: () => activeCoursePath && openAnalytics(),
      },
      {
        id: 'open-settings',
        label: 'Open Settings',
        shortcut: '',
        category: 'Settings',
        available: true,
        run: () => openSettings(),
      },
      {
        id: 'sync',
        label: 'Sync Current Course',
        shortcut: shortcuts.syncNow,
        category: 'Git',
        available: Boolean(activeCoursePath),
        run: () => activeCoursePath && onSyncNow(),
      },
    ],
    [
      activeCoursePath,
      onGoHome,
      onSyncNow,
      openAnalytics,
      openQuickCapture,
      openSettings,
      shortcuts.quickCapture,
      shortcuts.syncNow,
      shortcuts.toggleSidebar,
      toggleExamPrepMode,
      toggleFilterDrawer,
      toggleFocusMode,
    ],
  );

  const filteredCommands = useMemo(() => {
    const queryValue = query.trim().toLowerCase();
    const sorted = [...commands].sort((left, right) => {
      const leftRecent = recentCommands.indexOf(left.id);
      const rightRecent = recentCommands.indexOf(right.id);
      if (leftRecent === -1 && rightRecent === -1) {
        return 0;
      }
      if (leftRecent === -1) {
        return 1;
      }
      if (rightRecent === -1) {
        return -1;
      }
      return leftRecent - rightRecent;
    });

    return sorted.filter((command) => {
      if (!queryValue) {
        return true;
      }

      return (
        command.label.toLowerCase().includes(queryValue) ||
        command.category.toLowerCase().includes(queryValue)
      );
    });
  }, [commands, query, recentCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCommandPalette();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((current) => Math.min(filteredCommands.length - 1, current + 1));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(0, current - 1));
        return;
      }

      if (event.key === 'Enter' && filteredCommands[selectedIndex]) {
        event.preventDefault();
        runCommand(filteredCommands[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeCommandPalette, filteredCommands, selectedIndex]);

  function runCommand(command: PaletteCommand) {
    if (!command.available) {
      return;
    }

    command.run();
    pushRecentCommand(command.id);
    closeCommandPalette();
  }

  const commandsByCategory = filteredCommands.reduce<Record<string, PaletteCommand[]>>(
    (groups, command) => {
      groups[command.category] = [...(groups[command.category] ?? []), command];
      return groups;
    },
    {},
  );

  let runningIndex = -1;

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-24">
      <div className="panel fade-in w-full max-w-2xl overflow-hidden">
        <input
          autoFocus
          className="w-full border-0 border-b border-white/10 bg-transparent px-5 py-4 text-lg text-white outline-none"
          placeholder="Search commands..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="max-h-[420px] overflow-y-auto">
          {Object.entries(commandsByCategory).map(([category, categoryCommands]) => (
            <div key={category} className="border-b border-white/5 py-2">
              <div className="px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                {category}
              </div>
              {categoryCommands.map((command) => {
                runningIndex += 1;
                const isSelected = runningIndex === selectedIndex;

                return (
                  <button
                    key={command.id}
                    className={`flex w-full items-center justify-between px-5 py-4 text-left ${
                      isSelected ? 'bg-sky-500/10' : 'hover:bg-white/5'
                    } ${command.available ? '' : 'opacity-50'}`}
                    onClick={() => runCommand(command)}
                    disabled={!command.available}
                  >
                    <div>
                      <span className="text-white">{command.label}</span>
                      {recentCommands.includes(command.id) && (
                        <span className="ml-2 text-[11px] uppercase tracking-[0.18em] text-sky-300">
                          recent
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{command.shortcut}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {filteredCommands.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              No commands matched your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
