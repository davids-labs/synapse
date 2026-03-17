const MODIFIER_TOKENS = new Set(['ctrl', 'control', 'cmd', 'meta', 'shift', 'alt', 'option']);

function normalizeToken(token: string): string {
  const normalized = token.trim().toLowerCase();
  if (normalized === 'control') {
    return 'ctrl';
  }
  if (normalized === 'command') {
    return 'cmd';
  }
  if (normalized === 'option') {
    return 'alt';
  }
  return normalized;
}

function normalizeKey(key: string): string {
  const normalized = key.trim().toLowerCase();
  if (normalized === ' ') {
    return 'space';
  }
  return normalized;
}

export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const tokens = shortcut
    .split('+')
    .map(normalizeToken)
    .filter(Boolean);

  if (tokens.length === 0) {
    return false;
  }

  const requiredCtrl = tokens.includes('ctrl');
  const requiredMeta = tokens.includes('cmd') || tokens.includes('meta');
  const requiredShift = tokens.includes('shift');
  const requiredAlt = tokens.includes('alt');

  if (requiredCtrl !== event.ctrlKey) {
    return false;
  }

  if (requiredMeta !== event.metaKey) {
    return false;
  }

  if (requiredShift !== event.shiftKey) {
    return false;
  }

  if (requiredAlt !== event.altKey) {
    return false;
  }

  const keyToken = tokens.find((token) => !MODIFIER_TOKENS.has(token));
  if (!keyToken) {
    return true;
  }

  const normalizedKey = normalizeKey(event.key);
  const normalizedCode = normalizeKey(event.code.replace(/^Key|^Digit/, ''));

  return normalizedKey === keyToken || normalizedCode === keyToken;
}
