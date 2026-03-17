import { useEffect, useState, type ReactNode } from 'react';
import type { AppSettings, KeyboardShortcutMap } from '../../../shared/types';
import { prettyTitle, SHORTCUT_LABELS } from '../../lib/appHelpers';

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

export function fuzzyScore(query: string, source: string): number {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedSource = source.trim().toLowerCase();
  if (!normalizedQuery) {
    return 1;
  }
  if (normalizedSource.includes(normalizedQuery)) {
    return normalizedQuery.length * 4;
  }

  let cursor = 0;
  let streak = 0;
  let score = 0;
  for (const char of normalizedQuery) {
    const index = normalizedSource.indexOf(char, cursor);
    if (index === -1) {
      return 0;
    }

    if (index === cursor) {
      streak += 1;
      score += 3 + streak;
    } else {
      streak = 0;
      score += 1;
    }
    cursor = index + 1;
  }

  return score;
}

export function normalizeColorValue(value: string): string {
  return isHexColor(value) ? value : '#3b82f6';
}

export function formatShortcutLabel(shortcutKey: keyof KeyboardShortcutMap): string {
  return SHORTCUT_LABELS[shortcutKey] ?? prettyTitle(shortcutKey);
}

export function isLikelyPathValid(value: string): boolean {
  if (value.trim().length === 0) {
    return true;
  }

  return !/[<>:"|?*]/.test(value);
}

export function SettingCard({
  title,
  description,
  children,
  badge,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  badge?: string;
}) {
  return (
    <section className="command-card">
      <div className="command-card-head">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        {badge ? <span className="pill">{badge}</span> : null}
      </div>
      <div className="command-card-body">{children}</div>
    </section>
  );
}

export function SettingRow({
  id,
  label,
  description,
  changed,
  invalid,
  onReset,
  onFocus,
  children,
  trailing,
}: {
  id: string;
  label: string;
  description?: string;
  changed?: boolean;
  invalid?: boolean;
  onReset?: () => void;
  onFocus?: () => void;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div
      id={`settings-row-${id}`}
      className={`command-row ${changed ? 'is-changed' : ''} ${invalid ? 'is-invalid' : ''}`}
      onFocusCapture={onFocus}
    >
      <div className="command-row-copy">
        <div className="command-row-title">
          <strong>{label}</strong>
          {changed && onReset ? (
            <button
              type="button"
              className="command-row-reset"
              aria-label={`Reset ${label} to default`}
              onClick={onReset}
            >
              Reset
            </button>
          ) : null}
        </div>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="command-row-control">
        {children}
        {trailing}
      </div>
    </div>
  );
}

export function ToggleControl({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`toggle-control ${checked ? 'is-on' : ''}`}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function ColorControl({
  value,
  invalid,
  onChange,
}: {
  value: string;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className={`command-color-control ${invalid ? 'is-invalid' : ''}`}>
      <input
        className="color-picker-input"
        type="color"
        value={normalizeColorValue(value)}
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        className="text-input"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function MiniCanvasPreview({ settings }: { settings: AppSettings }) {
  return (
    <div className="mini-canvas-preview">
      <div
        className="mini-canvas-surface"
        style={{
          background: settings.colorScheme.bgPrimary,
          color: settings.colorScheme.textPrimary,
          borderColor: settings.colorScheme.borderDivider,
        }}
      >
        <div
          className="mini-canvas-chip"
          style={{
            background: settings.colorScheme.bgSecondary,
            borderColor: settings.colorScheme.borderDefault,
          }}
        >
          Today
        </div>
        <div
          className="mini-canvas-card primary"
          style={{
            background: settings.colorScheme.bgSecondary,
            borderColor: settings.colorScheme.borderDefault,
          }}
        >
          <span style={{ color: settings.colorScheme.textSecondary }}>Practice Bank</span>
          <strong style={{ color: settings.colorScheme.textPrimary }}>7 due</strong>
        </div>
        <div
          className="mini-canvas-card accent"
          style={{
            background: settings.colorScheme.bgTertiary,
            borderColor: settings.colorScheme.accentPrimary,
          }}
        >
          <span style={{ color: settings.colorScheme.textSecondary }}>Focus node</span>
          <strong style={{ color: settings.colorScheme.textAccent }}>Carnot Cycle</strong>
        </div>
      </div>
    </div>
  );
}

export function MiniGraphPreview({ settings }: { settings: AppSettings }) {
  const hard = settings.linkStyles['hard-prerequisite'];
  const soft = settings.linkStyles['soft-prerequisite'];
  const wormhole = settings.linkStyles.wormhole;
  const radius =
    settings.nodeSize === 'uniform'
      ? 12
      : settings.nodeSize === 'by-level'
        ? 14
        : settings.nodeSize === 'by-connections'
          ? 16
          : 18;

  return (
    <svg className="mini-graph-preview" viewBox="0 0 180 108" role="img" aria-label="Graph preview">
      <rect x="0.5" y="0.5" width="179" height="107" rx="18" fill="transparent" />
      <line
        x1="42"
        y1="62"
        x2="90"
        y2="32"
        stroke={hard.color}
        strokeWidth={hard.width}
        opacity={hard.opacity}
      />
      <line
        x1="92"
        y1="34"
        x2="144"
        y2="62"
        stroke={soft.color}
        strokeWidth={soft.width}
        opacity={soft.opacity}
        strokeDasharray={soft.dashArray}
      />
      <line
        x1="42"
        y1="62"
        x2="144"
        y2="62"
        stroke={wormhole.color}
        strokeWidth={wormhole.width}
        opacity={wormhole.opacity}
        strokeDasharray={wormhole.dashArray}
      />
      {[{ x: 36, y: 62 }, { x: 90, y: 30 }, { x: 146, y: 62 }].map((node, index) => (
        <g key={`${node.x}-${node.y}`}>
          <circle
            cx={node.x}
            cy={node.y}
            r={radius - (index === 1 ? 2 : 0)}
            fill={settings.colorScheme.bgSecondary}
            stroke={settings.colorScheme.accentPrimary}
            strokeWidth="1.5"
          />
          <circle
            cx={node.x}
            cy={node.y}
            r={radius / 2.8}
            fill={index === 1 ? settings.masteryColors.mastered : settings.masteryColors.active}
          />
        </g>
      ))}
    </svg>
  );
}

export function ShortcutRecorder({
  shortcutKey,
  value,
  recording,
  onChange,
  onRecordingChange,
}: {
  shortcutKey: keyof KeyboardShortcutMap;
  value: string;
  recording: boolean;
  onChange: (value: string) => void;
  onRecordingChange: (recording: boolean) => void;
}) {
  useEffect(() => {
    if (!recording) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        onRecordingChange(false);
        return;
      }

      const parts = [
        event.ctrlKey ? 'Ctrl' : null,
        event.metaKey ? 'Meta' : null,
        event.altKey ? 'Alt' : null,
        event.shiftKey ? 'Shift' : null,
      ].filter((part): part is string => Boolean(part));

      const key = normalizeShortcutKey(event.key);
      if (key && !['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        parts.push(key);
      }

      if (parts.length === 0) {
        return;
      }

      onChange(parts.join('+'));
      onRecordingChange(false);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onChange, onRecordingChange, recording]);

  return (
    <div className="shortcut-recorder">
      <input
        className="text-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={formatShortcutLabel(shortcutKey)}
      />
      <button
        type="button"
        className={`tiny-button ${recording ? 'active' : ''}`}
        onClick={() => onRecordingChange(!recording)}
      >
        {recording ? 'Press keys' : 'Record'}
      </button>
    </div>
  );
}

function normalizeShortcutKey(key: string): string {
  if (key === ' ') {
    return 'Space';
  }

  if (key.length === 1) {
    return key.toUpperCase();
  }

  return key;
}

export function useCopiedState(): [boolean, () => void] {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return [copied, () => setCopied(true)];
}
