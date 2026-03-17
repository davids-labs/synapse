import { useState } from 'react';
import type { KeyboardShortcutMap } from '../../../shared/types';
import { formatShortcutLabel, SettingCard, SettingRow, ShortcutRecorder } from './shared';
import type { SectionComponentProps } from './types';

export function KeyboardSettingsSection({
  draft,
  defaults,
  activeAnchor,
  setDraft,
  onSetActiveAnchor,
}: SectionComponentProps) {
  const [recordingKey, setRecordingKey] = useState<keyof KeyboardShortcutMap | null>(null);

  const shortcutEntries = Object.entries(draft.shortcuts) as Array<
    [keyof KeyboardShortcutMap, string]
  >;

  return (
    <div className="command-section-stack">
      <SettingCard
        title="Keyboard recorder"
        description="Record shortcuts directly instead of typing them by hand. Press Escape to cancel a recording."
        badge={`${shortcutEntries.length} shortcuts`}
      >
        <div className="command-shortcut-grid">
          {shortcutEntries.map(([key, value]) => {
            const anchor = `keyboard.${key}`;
            return (
              <SettingRow
                key={key}
                id={anchor}
                label={formatShortcutLabel(key)}
                changed={value !== defaults.shortcuts[key]}
                onReset={() =>
                  setDraft((current) => ({
                    ...current,
                    shortcuts: {
                      ...current.shortcuts,
                      [key]: defaults.shortcuts[key],
                    },
                  }))
                }
                onFocus={() => onSetActiveAnchor(anchor)}
              >
                <ShortcutRecorder
                  shortcutKey={key}
                  value={value}
                  recording={recordingKey === key}
                  onChange={(nextValue) =>
                    setDraft((current) => ({
                      ...current,
                      shortcuts: {
                        ...current.shortcuts,
                        [key]: nextValue,
                      },
                    }))
                  }
                  onRecordingChange={(recording) =>
                    setRecordingKey(recording ? key : recordingKey === key ? null : recordingKey)
                  }
                />
              </SettingRow>
            );
          })}
        </div>
      </SettingCard>
      <SettingCard
        title="Search indexing"
        description="Every keyboard shortcut is indexed by label, action, and current chord in the sidebar search."
      >
        <div className="command-inline-note">
          <strong>Focused row</strong>
          <span>{activeAnchor ?? 'Select or search for a shortcut to jump straight to it.'}</span>
        </div>
      </SettingCard>
    </div>
  );
}
