import { useEffect } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useSettingsStore } from '../store/settingsStore';
import { useUIStore } from '../store/uiStore';
import { matchesShortcut } from '../utils/shortcuts';

interface KeyboardShortcutOptions {
  onGoHome: () => void;
  onSyncNow: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutOptions) {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectConnectedNode = useGraphStore((state) => state.selectConnectedNode);
  const zoomToFit = useGraphStore((state) => state.zoomToFit);
  const shortcuts = useSettingsStore((state) => state.keyboardShortcuts);
  const openQuickCapture = useUIStore((state) => state.openQuickCapture);
  const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette);
  const toggleFilterDrawer = useUIStore((state) => state.toggleFilterDrawer);
  const openTopicCenter = useUIStore((state) => state.openTopicCenter);
  const closeTopicCenter = useUIStore((state) => state.closeTopicCenter);
  const toggleFocusMode = useUIStore((state) => state.toggleFocusMode);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (matchesShortcut(event, shortcuts.quickCapture)) {
        event.preventDefault();
        openQuickCapture();
        return;
      }

      if (matchesShortcut(event, shortcuts.commandPalette)) {
        event.preventDefault();
        toggleCommandPalette();
        return;
      }

      if (matchesShortcut(event, shortcuts.toggleSidebar)) {
        event.preventDefault();
        toggleFilterDrawer();
        return;
      }

      if (matchesShortcut(event, 'Ctrl+H') || matchesShortcut(event, 'Cmd+H')) {
        event.preventDefault();
        options.onGoHome();
        return;
      }

      if (matchesShortcut(event, shortcuts.syncNow)) {
        event.preventDefault();
        options.onSyncNow();
        return;
      }

      if (event.code === 'Escape') {
        closeTopicCenter();
        return;
      }

      if (matchesShortcut(event, shortcuts.zoomToHome)) {
        zoomToFit();
        return;
      }

      if (event.code === 'KeyF' && !isInputFocused()) {
        toggleFocusMode();
        return;
      }

      if (selectedNodeId && event.code === 'Enter' && !isInputFocused()) {
        openTopicCenter(selectedNodeId);
        return;
      }

      if (
        selectedNodeId &&
        !isInputFocused() &&
        (event.code === 'ArrowUp' ||
          event.code === 'ArrowDown' ||
          event.code === 'ArrowLeft' ||
          event.code === 'ArrowRight')
      ) {
        event.preventDefault();
        selectConnectedNode(event.code);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    closeTopicCenter,
    openQuickCapture,
    openTopicCenter,
    options,
    selectedNodeId,
    selectConnectedNode,
    shortcuts,
    toggleCommandPalette,
    toggleFilterDrawer,
    toggleFocusMode,
    zoomToFit,
  ]);
}

function isInputFocused(): boolean {
  const activeElement = document.activeElement;
  return (
    activeElement?.tagName === 'INPUT' ||
    activeElement?.tagName === 'TEXTAREA' ||
    activeElement?.getAttribute('contenteditable') === 'true'
  );
}
