import { useState } from 'react';

interface BrowserLinkActionsProps {
  url?: string | null;
  title: string;
  compact?: boolean;
}

interface EmbedFallbackPanelProps extends BrowserLinkActionsProps {
  reason: string;
  detail?: string | null;
}

export function BrowserLinkActions({
  url,
  title,
  compact = false,
}: BrowserLinkActionsProps) {
  const [pending, setPending] = useState<'surface' | 'external' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const normalizedUrl = url?.trim() || '';

  const runAction = async (
    nextPending: 'surface' | 'external',
    action: () => Promise<unknown>,
  ) => {
    if (!normalizedUrl) {
      return;
    }

    setPending(nextPending);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open that URL.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className={`embed-browser-actions${compact ? ' compact' : ''}`}>
      <div className="button-row">
        <button
          className="tiny-button"
          type="button"
          disabled={!normalizedUrl || pending !== null}
          onClick={() =>
            void runAction('surface', () =>
              window.synapse.openBrowserSurface(normalizedUrl, title),
            )
          }
        >
          {pending === 'surface' ? 'Opening...' : 'Open Browser Surface'}
        </button>
        <button
          type="button"
          disabled={!normalizedUrl || pending !== null}
          onClick={() =>
            void runAction('external', () => window.synapse.openExternalUrl(normalizedUrl))
          }
        >
          {pending === 'external' ? 'Opening...' : 'Open Default Browser'}
        </button>
      </div>
      {error ? <small className="embed-browser-actions-error">{error}</small> : null}
    </div>
  );
}

export function EmbedFallbackPanel({
  url,
  title,
  reason,
  detail,
}: EmbedFallbackPanelProps) {
  return (
    <div className="module-placeholder embed-fallback-panel">
      <p>{reason}</p>
      {detail ? <small>{detail}</small> : null}
      <BrowserLinkActions url={url} title={title} compact />
    </div>
  );
}
