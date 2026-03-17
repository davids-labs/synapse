import type { AppSettings } from '../../../shared/types';
import { prettyTitle } from '../../lib/appHelpers';
import { MiniCanvasPreview, MiniGraphPreview, ColorControl, isHexColor, SettingCard, SettingRow, ToggleControl } from './shared';
import type { SectionComponentProps } from './types';

export function VisualSettingsSection({
  draft,
  defaults,
  activeAnchor,
  setDraft,
  onSetActiveAnchor,
}: SectionComponentProps) {
  const patch = (updater: (current: AppSettings) => AppSettings) => setDraft(updater);

  return (
    <div className="command-section-stack">
      <SettingCard
        title="Look and feel"
        description="Tune the palette, density, and motion system with a live preview of the canvas shell."
        badge={draft.theme}
      >
        <MiniCanvasPreview settings={draft} />
        <SettingRow
          id="visual.theme"
          label="Theme"
          description="Choose the base theme before fine-tuning the palette."
          changed={draft.theme !== defaults.theme}
          onReset={() => patch((current) => ({ ...current, theme: defaults.theme }))}
          onFocus={() => onSetActiveAnchor('visual.theme')}
        >
          <select
            className="text-input"
            value={draft.theme}
            onChange={(event) =>
              patch((current) => ({
                ...current,
                theme: event.target.value as AppSettings['theme'],
              }))
            }
            data-active={activeAnchor === 'visual.theme' ? 'true' : 'false'}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </SettingRow>
        <SettingRow
          id="visual.density"
          label="Density"
          description="Tighten or relax the information grid across the app."
          changed={draft.density !== defaults.density}
          onReset={() => patch((current) => ({ ...current, density: defaults.density }))}
          onFocus={() => onSetActiveAnchor('visual.density')}
        >
          <select
            className="text-input"
            value={draft.density}
            onChange={(event) =>
              patch((current) => ({
                ...current,
                density: event.target.value as AppSettings['density'],
              }))
            }
            data-active={activeAnchor === 'visual.density' ? 'true' : 'false'}
          >
            <option value="sparse">Sparse</option>
            <option value="moderate">Moderate</option>
            <option value="dense">Dense</option>
            <option value="maximum">Maximum</option>
          </select>
        </SettingRow>
        <SettingRow
          id="visual.animations"
          label="Motion system"
          description="Controls panel motion, hover choreography, and state transitions."
          changed={draft.animations !== defaults.animations}
          onReset={() => patch((current) => ({ ...current, animations: defaults.animations }))}
          onFocus={() => onSetActiveAnchor('visual.animations')}
        >
          <ToggleControl
            checked={draft.animations}
            onChange={(checked) => patch((current) => ({ ...current, animations: checked }))}
          />
        </SettingRow>
      </SettingCard>

      <SettingCard
        title="Canvas palette"
        description="Every live token is editable and validated inline. Invalid colors get a visible error border."
      >
        <div className="command-color-grid">
          {(Object.entries(draft.colorScheme) as Array<
            [keyof AppSettings['colorScheme'], string]
          >).map(([key, value]) => (
            <SettingRow
              key={key}
              id={`visual.${key}`}
              label={prettyTitle(key)}
              changed={value !== defaults.colorScheme[key]}
              invalid={!isHexColor(value)}
              onReset={() =>
                patch((current) => ({
                  ...current,
                  colorScheme: {
                    ...current.colorScheme,
                    [key]: defaults.colorScheme[key],
                  },
                }))
              }
              onFocus={() => onSetActiveAnchor(`visual.${key}`)}
            >
              <ColorControl
                value={value}
                invalid={!isHexColor(value)}
                onChange={(nextValue) =>
                  patch((current) => ({
                    ...current,
                    colorScheme: {
                      ...current.colorScheme,
                      [key]: nextValue,
                    },
                  }))
                }
              />
            </SettingRow>
          ))}
        </div>
      </SettingCard>

      <SettingCard
        title="Mastery palette"
        description="Keep topic state instantly readable across graphs, cards, and progress modules."
      >
        <div className="command-color-grid">
          {(Object.entries(draft.masteryColors) as Array<
            [keyof AppSettings['masteryColors'], string]
          >).map(([key, value]) => (
            <SettingRow
              key={key}
              id={`visual.mastery.${key}`}
              label={prettyTitle(key)}
              changed={value !== defaults.masteryColors[key]}
              invalid={!isHexColor(value)}
              onReset={() =>
                patch((current) => ({
                  ...current,
                  masteryColors: {
                    ...current.masteryColors,
                    [key]: defaults.masteryColors[key],
                  },
                }))
              }
              onFocus={() => onSetActiveAnchor(`visual.mastery.${key}`)}
            >
              <ColorControl
                value={value}
                invalid={!isHexColor(value)}
                onChange={(nextValue) =>
                  patch((current) => ({
                    ...current,
                    masteryColors: {
                      ...current.masteryColors,
                      [key]: nextValue,
                    },
                  }))
                }
              />
            </SettingRow>
          ))}
        </div>
      </SettingCard>
    </div>
  );
}

export function GraphSettingsSection({
  draft,
  defaults,
  activeAnchor,
  setDraft,
  onSetActiveAnchor,
}: SectionComponentProps) {
  const patch = (updater: (current: AppSettings) => AppSettings) => setDraft(updater);

  return (
    <div className="command-section-stack">
      <SettingCard
        title="Graph behavior"
        description="Node sizing and link styling update the live preview without leaving Settings."
        badge="Live preview"
      >
        <MiniGraphPreview settings={draft} />
        <SettingRow
          id="graph.nodeSize"
          label="Node sizing"
          description="Choose how graph node emphasis is distributed."
          changed={draft.nodeSize !== defaults.nodeSize}
          onReset={() => patch((current) => ({ ...current, nodeSize: defaults.nodeSize }))}
          onFocus={() => onSetActiveAnchor('graph.nodeSize')}
        >
          <select
            className="text-input"
            value={draft.nodeSize}
            onChange={(event) =>
              patch((current) => ({
                ...current,
                nodeSize: event.target.value as AppSettings['nodeSize'],
              }))
            }
            data-active={activeAnchor === 'graph.nodeSize' ? 'true' : 'false'}
          >
            <option value="uniform">Uniform</option>
            <option value="by-level">By level</option>
            <option value="by-connections">By connections</option>
            <option value="custom">Custom</option>
          </select>
        </SettingRow>
      </SettingCard>

      <SettingCard
        title="Link grammar"
        description="Define how prerequisites, manual links, and wormholes read at a glance."
      >
        <div className="command-link-stack">
          {(Object.entries(draft.linkStyles) as Array<
            [keyof AppSettings['linkStyles'], AppSettings['linkStyles'][keyof AppSettings['linkStyles']]]
          >).map(([key, value]) => (
            <div key={key} className="command-link-card">
              <div className="command-link-card-head">
                <strong>{prettyTitle(key)}</strong>
                <span
                  className="command-link-preview"
                  style={{
                    borderTopColor: value.color,
                    borderTopStyle: value.dashArray ? 'dashed' : 'solid',
                    borderTopWidth: value.width,
                    opacity: value.opacity,
                  }}
                />
              </div>
              <SettingRow
                id={`graph.${key}.color`}
                label="Color"
                changed={value.color !== defaults.linkStyles[key].color}
                invalid={!isHexColor(value.color)}
                onReset={() =>
                  patch((current) => ({
                    ...current,
                    linkStyles: {
                      ...current.linkStyles,
                      [key]: {
                        ...current.linkStyles[key],
                        color: defaults.linkStyles[key].color,
                      },
                    },
                  }))
                }
                onFocus={() => onSetActiveAnchor(`graph.${key}.color`)}
              >
                <ColorControl
                  value={value.color}
                  invalid={!isHexColor(value.color)}
                  onChange={(nextValue) =>
                    patch((current) => ({
                      ...current,
                      linkStyles: {
                        ...current.linkStyles,
                        [key]: {
                          ...current.linkStyles[key],
                          color: nextValue,
                        },
                      },
                    }))
                  }
                />
              </SettingRow>
              <div className="command-inline-grid">
                <SettingRow
                  id={`graph.${key}.width`}
                  label="Width"
                  changed={value.width !== defaults.linkStyles[key].width}
                  onReset={() =>
                    patch((current) => ({
                      ...current,
                      linkStyles: {
                        ...current.linkStyles,
                        [key]: {
                          ...current.linkStyles[key],
                          width: defaults.linkStyles[key].width,
                        },
                      },
                    }))
                  }
                  onFocus={() => onSetActiveAnchor(`graph.${key}.width`)}
                >
                  <input
                    className="text-input"
                    type="number"
                    min={1}
                    max={8}
                    value={value.width}
                    onChange={(event) =>
                      patch((current) => ({
                        ...current,
                        linkStyles: {
                          ...current.linkStyles,
                          [key]: {
                            ...current.linkStyles[key],
                            width: Number(event.target.value),
                          },
                        },
                      }))
                    }
                    data-active={activeAnchor === `graph.${key}.width` ? 'true' : 'false'}
                  />
                </SettingRow>
                <SettingRow
                  id={`graph.${key}.opacity`}
                  label="Opacity"
                  changed={value.opacity !== defaults.linkStyles[key].opacity}
                  onReset={() =>
                    patch((current) => ({
                      ...current,
                      linkStyles: {
                        ...current.linkStyles,
                        [key]: {
                          ...current.linkStyles[key],
                          opacity: defaults.linkStyles[key].opacity,
                        },
                      },
                    }))
                  }
                  onFocus={() => onSetActiveAnchor(`graph.${key}.opacity`)}
                >
                  <input
                    className="text-input"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={value.opacity}
                    onChange={(event) =>
                      patch((current) => ({
                        ...current,
                        linkStyles: {
                          ...current.linkStyles,
                          [key]: {
                            ...current.linkStyles[key],
                            opacity: Number(event.target.value),
                          },
                        },
                      }))
                    }
                    data-active={activeAnchor === `graph.${key}.opacity` ? 'true' : 'false'}
                  />
                </SettingRow>
              </div>
              <SettingRow
                id={`graph.${key}.dash`}
                label="Dash pattern"
                description="Leave blank for a solid edge."
                changed={(value.dashArray ?? '') !== (defaults.linkStyles[key].dashArray ?? '')}
                onReset={() =>
                  patch((current) => ({
                    ...current,
                    linkStyles: {
                      ...current.linkStyles,
                      [key]: {
                        ...current.linkStyles[key],
                        dashArray: defaults.linkStyles[key].dashArray,
                      },
                    },
                  }))
                }
                onFocus={() => onSetActiveAnchor(`graph.${key}.dash`)}
              >
                <input
                  className="text-input"
                  value={value.dashArray ?? ''}
                  onChange={(event) =>
                    patch((current) => ({
                      ...current,
                      linkStyles: {
                        ...current.linkStyles,
                        [key]: {
                          ...current.linkStyles[key],
                          dashArray: event.target.value || undefined,
                        },
                      },
                    }))
                  }
                  data-active={activeAnchor === `graph.${key}.dash` ? 'true' : 'false'}
                />
              </SettingRow>
            </div>
          ))}
        </div>
      </SettingCard>
    </div>
  );
}
