import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { AppSettings, TagDefinition } from '../../../shared/types';
import { compactPath } from '../../lib/appHelpers';
import {
  ColorControl,
  isLikelyPathValid,
  SettingCard,
  SettingRow,
  ToggleControl,
  useCopiedState,
} from './shared';
import type { SectionComponentProps } from './types';

interface ModulesDataSettingsProps extends SectionComponentProps {
  defaultModulesText: string;
  setDefaultModulesText: (value: string) => void;
  hotDropFolderPath: string;
}

interface LabPrivacyExportSettingsProps extends SectionComponentProps {
  onCreateBackup: () => void;
}

interface TagsSettingsProps {
  tags: TagDefinition[];
  setTags: Dispatch<SetStateAction<TagDefinition[]>>;
  activeAnchor: string | null;
  onSetActiveAnchor: (anchor: string) => void;
}

export function ModulesDataSettingsSection({
  draft,
  defaults,
  activeAnchor,
  setDraft,
  onSetActiveAnchor,
  defaultModulesText,
  setDefaultModulesText,
  hotDropFolderPath,
}: ModulesDataSettingsProps) {
  const defaultModulesStatus = useMemo(() => {
    try {
      const parsed = JSON.parse(defaultModulesText) as unknown;
      return Array.isArray(parsed) ? `${parsed.length} default modules ready` : 'JSON must be an array';
    } catch {
      return 'JSON is invalid';
    }
  }, [defaultModulesText]);

  return (
    <div className="command-section-stack">
      <SettingCard
        title="Modules and canvas defaults"
        description="Tune how new surfaces spawn, snap, and lay out."
        badge={`${draft.gridColumns} columns`}
      >
        <SettingRow
          id="modules.gridColumns"
          label="Grid columns"
          description="Controls the base grid used when modules are created."
          changed={draft.gridColumns !== defaults.gridColumns}
          onReset={() => setDraft((current) => ({ ...current, gridColumns: defaults.gridColumns }))}
          onFocus={() => onSetActiveAnchor('modules.gridColumns')}
        >
          <input
            className="text-input"
            type="number"
            min={1}
            max={24}
            value={draft.gridColumns}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                gridColumns: Number(event.target.value),
              }))
            }
            data-active={activeAnchor === 'modules.gridColumns' ? 'true' : 'false'}
          />
        </SettingRow>
        <SettingRow
          id="modules.moduleSnapping"
          label="Module snapping"
          description="Snap modules back to the grid when they move."
          changed={draft.moduleSnapping !== defaults.moduleSnapping}
          onReset={() =>
            setDraft((current) => ({ ...current, moduleSnapping: defaults.moduleSnapping }))
          }
          onFocus={() => onSetActiveAnchor('modules.moduleSnapping')}
        >
          <ToggleControl
            checked={draft.moduleSnapping}
            onChange={(checked) =>
              setDraft((current) => ({
                ...current,
                moduleSnapping: checked,
              }))
            }
          />
        </SettingRow>
        <SettingRow
          id="modules.defaultModules"
          label="Default module recipe"
          description="Paste the JSON array used for new page defaults."
          changed={defaultModulesText !== JSON.stringify(defaults.defaultModules, null, 2)}
          onReset={() => setDefaultModulesText(JSON.stringify(defaults.defaultModules, null, 2))}
          onFocus={() => onSetActiveAnchor('modules.defaultModules')}
        >
          <textarea
            className="code-editor command-json-editor"
            value={defaultModulesText}
            onChange={(event) => setDefaultModulesText(event.target.value)}
          />
          <span className="field-help">{defaultModulesStatus}</span>
        </SettingRow>
      </SettingCard>

      <SettingCard
        title="Workspace paths and data"
        description="Keep your workspace root, export defaults, and developer overrides together."
      >
        <SettingRow
          id="data.basePath"
          label="Workspace root"
          description="The live folder SYNAPSE reads and writes."
          changed={draft.basePath !== defaults.basePath}
          invalid={!isLikelyPathValid(draft.basePath)}
          onReset={() => setDraft((current) => ({ ...current, basePath: defaults.basePath }))}
          onFocus={() => onSetActiveAnchor('data.basePath')}
        >
          <input
            className="text-input"
            value={draft.basePath}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                basePath: event.target.value,
              }))
            }
            data-active={activeAnchor === 'data.basePath' ? 'true' : 'false'}
          />
        </SettingRow>
        <SettingRow
          id="data.csvDelimiter"
          label="CSV delimiter"
          description="Choose the default delimiter for import and export flows."
          changed={draft.csvDelimiter !== defaults.csvDelimiter}
          onReset={() =>
            setDraft((current) => ({ ...current, csvDelimiter: defaults.csvDelimiter }))
          }
          onFocus={() => onSetActiveAnchor('data.csvDelimiter')}
        >
          <select
            className="text-input"
            value={draft.csvDelimiter}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                csvDelimiter: event.target.value as AppSettings['csvDelimiter'],
              }))
            }
          >
            <option value=",">Comma</option>
            <option value=";">Semicolon</option>
            <option value={'\t'}>Tab</option>
          </select>
        </SettingRow>
        <SettingRow
          id="data.dateFormat"
          label="Date format"
          description="Used across CSV flows, timeline labels, and exports."
          changed={draft.dateFormat !== defaults.dateFormat}
          onReset={() => setDraft((current) => ({ ...current, dateFormat: defaults.dateFormat }))}
          onFocus={() => onSetActiveAnchor('data.dateFormat')}
        >
          <input
            className="text-input"
            value={draft.dateFormat}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                dateFormat: event.target.value,
              }))
            }
          />
        </SettingRow>
        <SettingRow
          id="data.recentLimit"
          label="Recent work limit"
          description="Controls how much history Home keeps visible."
          changed={draft.recentLimit !== defaults.recentLimit}
          onReset={() => setDraft((current) => ({ ...current, recentLimit: defaults.recentLimit }))}
          onFocus={() => onSetActiveAnchor('data.recentLimit')}
        >
          <input
            className="text-input"
            type="number"
            min={1}
            max={50}
            value={draft.recentLimit}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                recentLimit: Number(event.target.value),
              }))
            }
          />
        </SettingRow>
        <SettingRow
          id="data.customCSSPath"
          label="Custom CSS override"
          description="Optional path to a custom stylesheet injected at runtime."
          changed={(draft.customCSSPath ?? '') !== (defaults.customCSSPath ?? '')}
          invalid={!isLikelyPathValid(draft.customCSSPath ?? '')}
          onReset={() =>
            setDraft((current) => ({
              ...current,
              customCSSPath: defaults.customCSSPath,
            }))
          }
          onFocus={() => onSetActiveAnchor('data.customCSSPath')}
        >
          <input
            className="text-input"
            value={draft.customCSSPath ?? ''}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                customCSSPath: event.target.value || undefined,
              }))
            }
          />
        </SettingRow>
        <div className="command-inline-note">
          <strong>Hot-drop</strong>
          <span>{compactPath(hotDropFolderPath)}</span>
        </div>
      </SettingCard>
    </div>
  );
}

export function LabPrivacyExportSection({
  draft,
  defaults,
  activeAnchor,
  setDraft,
  onSetActiveAnchor,
  onCreateBackup,
}: LabPrivacyExportSettingsProps) {
  const [copied, markCopied] = useCopiedState();

  const copyConfigJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
    markCopied();
  };

  return (
    <div className="command-section-stack">
      <SettingCard
        title="The Lab"
        description="Experimental runtime controls for power users and low-spec rescue cases."
        badge="Experimental"
      >
        <SettingsToggleRow
          id="lab.gpuAcceleration"
          label="GPU acceleration"
          description="Requires an app relaunch to fully take effect."
          checked={draft.lab.gpuAcceleration}
          defaultChecked={defaults.lab.gpuAcceleration}
          onReset={() =>
            setDraft((current) => ({
              ...current,
              lab: { ...current.lab, gpuAcceleration: defaults.lab.gpuAcceleration },
            }))
          }
          onToggle={(checked) =>
            setDraft((current) => ({
              ...current,
              lab: { ...current.lab, gpuAcceleration: checked },
            }))
          }
          onFocus={onSetActiveAnchor}
        />
        <SettingsToggleRow
          id="lab.embeddedDevtools"
          label="Embedded DevTools"
          description="Opens the Electron inspector inside the window chrome."
          checked={draft.lab.embeddedDevtools}
          defaultChecked={defaults.lab.embeddedDevtools}
          onReset={() =>
            setDraft((current) => ({
              ...current,
              lab: { ...current.lab, embeddedDevtools: defaults.lab.embeddedDevtools },
            }))
          }
          onToggle={(checked) =>
            setDraft((current) => ({
              ...current,
              lab: { ...current.lab, embeddedDevtools: checked },
            }))
          }
          onFocus={onSetActiveAnchor}
        />
        <SettingRow
          id="lab.performanceMode"
          label="Performance mode"
          description="Reduce graph motion and visual cost on constrained hardware."
          changed={draft.lab.performanceMode !== defaults.lab.performanceMode}
          onReset={() =>
            setDraft((current) => ({
              ...current,
              lab: { ...current.lab, performanceMode: defaults.lab.performanceMode },
            }))
          }
          onFocus={() => onSetActiveAnchor('lab.performanceMode')}
        >
          <select
            className="text-input"
            value={draft.lab.performanceMode}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                lab: {
                  ...current.lab,
                  performanceMode: event.target.value as AppSettings['lab']['performanceMode'],
                },
              }))
            }
          >
            <option value="balanced">Balanced</option>
            <option value="reduced-motion">Reduced motion</option>
            <option value="low-power">Low power</option>
          </select>
        </SettingRow>
        <SettingRow
          id="lab.frameRateLimit"
          label="Frame-rate limit"
          description="Useful when you want the graph and canvas to feel calmer on a laptop."
          changed={draft.lab.frameRateLimit !== defaults.lab.frameRateLimit}
          onReset={() =>
            setDraft((current) => ({
              ...current,
              lab: { ...current.lab, frameRateLimit: defaults.lab.frameRateLimit },
            }))
          }
          onFocus={() => onSetActiveAnchor('lab.frameRateLimit')}
        >
          <input
            className="text-input"
            type="number"
            min={15}
            max={240}
            value={draft.lab.frameRateLimit}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                lab: { ...current.lab, frameRateLimit: Number(event.target.value) },
              }))
            }
          />
        </SettingRow>
      </SettingCard>

      <SettingCard
        title="Privacy and security"
        description="Choose when SYNAPSE is allowed to touch the network and prepare vault metadata."
      >
        <SettingsToggleRow
          id="privacy.localOnlyMode"
          label="Local-only mode"
          description="Kills external requests, Git sync, update checks, and browser surfaces."
          checked={draft.privacy.localOnlyMode}
          defaultChecked={defaults.privacy.localOnlyMode}
          onReset={() =>
            setDraft((current) => ({
              ...current,
              privacy: { ...current.privacy, localOnlyMode: defaults.privacy.localOnlyMode },
            }))
          }
          onToggle={(checked) =>
            setDraft((current) => ({
              ...current,
              privacy: { ...current.privacy, localOnlyMode: checked },
            }))
          }
          onFocus={onSetActiveAnchor}
        />
        <SettingsToggleRow
          id="privacy.vaultEncryptionEnabled"
          label="Vault encryption flag"
          description="Persist the vault-encryption preference and password hint in the config layer."
          checked={draft.privacy.vaultEncryptionEnabled}
          defaultChecked={defaults.privacy.vaultEncryptionEnabled}
          onReset={() =>
            setDraft((current) => ({
              ...current,
              privacy: {
                ...current.privacy,
                vaultEncryptionEnabled: defaults.privacy.vaultEncryptionEnabled,
              },
            }))
          }
          onToggle={(checked) =>
            setDraft((current) => ({
              ...current,
              privacy: { ...current.privacy, vaultEncryptionEnabled: checked },
            }))
          }
          onFocus={onSetActiveAnchor}
        />
        <SettingRow
          id="privacy.vaultPasswordHint"
          label="Vault password hint"
          description="Store a human-readable reminder without storing the secret itself."
          changed={draft.privacy.vaultPasswordHint !== defaults.privacy.vaultPasswordHint}
          onReset={() =>
            setDraft((current) => ({
              ...current,
              privacy: { ...current.privacy, vaultPasswordHint: defaults.privacy.vaultPasswordHint },
            }))
          }
          onFocus={() => onSetActiveAnchor('privacy.vaultPasswordHint')}
        >
          <input
            className="text-input"
            value={draft.privacy.vaultPasswordHint}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                privacy: { ...current.privacy, vaultPasswordHint: event.target.value },
              }))
            }
          />
        </SettingRow>
      </SettingCard>

      <SettingCard
        title="Export and portability"
        description="Share config state, point manual backups at a provider, and keep recovery portable."
      >
        <SettingRow
          id="export.cloudBackupProvider"
          label="Cloud backup provider"
          description="Manual provider wiring beyond Git."
          changed={draft.export.cloudBackupProvider !== defaults.export.cloudBackupProvider}
          onReset={() =>
            setDraft((current) => ({
              ...current,
              export: { ...current.export, cloudBackupProvider: defaults.export.cloudBackupProvider },
            }))
          }
          onFocus={() => onSetActiveAnchor('export.cloudBackupProvider')}
        >
          <select
            className="text-input"
            value={draft.export.cloudBackupProvider}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                export: {
                  ...current.export,
                  cloudBackupProvider: event.target.value as AppSettings['export']['cloudBackupProvider'],
                },
              }))
            }
          >
            <option value="none">None</option>
            <option value="s3">S3</option>
            <option value="dropbox">Dropbox</option>
            <option value="google-drive">Google Drive</option>
          </select>
        </SettingRow>
        <SettingRow
          id="export.cloudBackupTarget"
          label="Cloud target"
          description="Bucket name, folder path, or provider destination label."
          changed={draft.export.cloudBackupTarget !== defaults.export.cloudBackupTarget}
          invalid={!isLikelyPathValid(draft.export.cloudBackupTarget)}
          onReset={() =>
            setDraft((current) => ({
              ...current,
              export: { ...current.export, cloudBackupTarget: defaults.export.cloudBackupTarget },
            }))
          }
          onFocus={() => onSetActiveAnchor('export.cloudBackupTarget')}
        >
          <input
            className="text-input"
            value={draft.export.cloudBackupTarget}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                export: { ...current.export, cloudBackupTarget: event.target.value },
              }))
            }
          />
        </SettingRow>
        <div className="command-actions-grid">
          <button type="button" className="ghost-button" onClick={copyConfigJson}>
            {copied ? 'Config copied' : 'Copy config JSON'}
          </button>
          <button type="button" className="ghost-button" onClick={onCreateBackup}>
            Create manual backup
          </button>
        </div>
      </SettingCard>
    </div>
  );
}

export function TagsSettingsSection({
  tags,
  setTags,
  activeAnchor,
  onSetActiveAnchor,
}: TagsSettingsProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const moveTag = (fromId: string, toId: string) => {
    setTags((current) => {
      const fromIndex = current.findIndex((tag) => tag.id === fromId);
      const toIndex = current.findIndex((tag) => tag.id === toId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  return (
    <div className="command-section-stack">
      <SettingCard
        title="Tag priority"
        description="Drag tags to influence the default ordering used across chips, pickers, and filters."
        badge={`${tags.length} tags`}
      >
        <div className="command-tag-list">
          {tags.map((tag) => {
            const anchor = `tags.${tag.id}`;
            return (
              <div
                key={tag.id}
                className={`command-tag-item ${draggingId === tag.id ? 'is-dragging' : ''}`}
                draggable
                onDragStart={() => setDraggingId(tag.id)}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggingId) {
                    moveTag(draggingId, tag.id);
                  }
                  setDraggingId(null);
                }}
              >
                <SettingRow
                  id={anchor}
                  label={tag.name}
                  description={`Applies to ${tag.applyTo}`}
                  onFocus={() => onSetActiveAnchor(anchor)}
                >
                  <div className="command-tag-editor">
                    <ColorControl
                      value={tag.color}
                      onChange={(nextValue) =>
                        setTags((current) =>
                          current.map((entry) =>
                            entry.id === tag.id ? { ...entry, color: nextValue } : entry,
                          ),
                        )
                      }
                    />
                    <input
                      className="text-input"
                      value={tag.name}
                      onChange={(event) =>
                        setTags((current) =>
                          current.map((entry) =>
                            entry.id === tag.id ? { ...entry, name: event.target.value } : entry,
                          ),
                        )
                      }
                      data-active={activeAnchor === anchor ? 'true' : 'false'}
                    />
                    <select
                      className="text-input"
                      value={tag.applyTo}
                      onChange={(event) =>
                        setTags((current) =>
                          current.map((entry) =>
                            entry.id === tag.id
                              ? {
                                  ...entry,
                                  applyTo: event.target.value as TagDefinition['applyTo'],
                                }
                              : entry,
                          ),
                        )
                      }
                    >
                      <option value="all">All</option>
                      <option value="bases">Bases</option>
                      <option value="nodes">Nodes</option>
                      <option value="modules">Modules</option>
                    </select>
                    <button
                      type="button"
                      className="tiny-button danger"
                      onClick={() =>
                        setTags((current) => current.filter((entry) => entry.id !== tag.id))
                      }
                    >
                      Remove
                    </button>
                  </div>
                </SettingRow>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={() =>
            setTags((current) => [
              ...current,
              {
                id: `tag-${Date.now()}`,
                name: `New Tag ${current.length + 1}`,
                color: '#3b82f6',
                applyTo: 'all',
              },
            ])
          }
        >
          Add tag
        </button>
      </SettingCard>
    </div>
  );
}

function SettingsToggleRow({
  id,
  label,
  description,
  checked,
  defaultChecked,
  onToggle,
  onReset,
  onFocus,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  defaultChecked: boolean;
  onToggle: (checked: boolean) => void;
  onReset: () => void;
  onFocus: (anchor: string) => void;
}) {
  return (
    <SettingRow
      id={id}
      label={label}
      description={description}
      changed={checked !== defaultChecked}
      onReset={onReset}
      onFocus={() => onFocus(id)}
    >
      <ToggleControl checked={checked} onChange={onToggle} />
    </SettingRow>
  );
}
