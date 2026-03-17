import { matchesShortcut } from '../src/renderer/lib/appHelpers';

describe('matchesShortcut', () => {
  it('matches ctrl+shift combinations against a keyboard event shape', () => {
    const event = {
      ctrlKey: true,
      shiftKey: true,
      altKey: false,
      metaKey: false,
      key: 'K',
    } as KeyboardEvent;

    expect(matchesShortcut(event, 'Ctrl+Shift+K')).toBe(true);
    expect(matchesShortcut(event, 'Ctrl+K')).toBe(false);
  });
});
