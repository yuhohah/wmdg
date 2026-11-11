import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_VERSION, RELEASE_NOTES, parseChangelog } from '../config/changelog.js';
import { ChangelogModal, LAST_SEEN_VERSION_KEY } from './ChangelogModal.js';

class Element extends EventTarget {
  children: Element[] = [];
  textContent = '';
  showModal = vi.fn();
  remove = vi.fn();
  append(...children: Element[]) { this.children.push(...children); }
  setAttribute() {}
  close() { this.dispatchEvent(new Event('close')); }
}

describe('release announcements', () => {
  let dialogs: Element[];
  let values: Map<string, string>;

  beforeEach(() => {
    dialogs = [];
    values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    vi.stubGlobal('document', {
      body: new Element(),
      createElement: (tag: string) => {
        const element = new Element();
        if (tag === 'dialog') dialogs.push(element);
        return element;
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows first-time players all releases, recording the version only after dismissal', async () => {
    const opened = new ChangelogModal().showIfUpdated();
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].showModal).toHaveBeenCalledOnce();
    expect(dialogs[0].children[1].children).toHaveLength(RELEASE_NOTES.length);
    expect(values.has(LAST_SEEN_VERSION_KEY)).toBe(false);
    dialogs[0].close();
    await opened;
    expect(values.get(LAST_SEEN_VERSION_KEY)).toBe(GAME_VERSION);
    expect(dialogs[0].remove).toHaveBeenCalledOnce();
    await new ChangelogModal().showIfUpdated();
    expect(dialogs).toHaveLength(1);
  });

  it('shows a changed version once, avoids duplicate windows, and allows manually reopening', async () => {
    values.set(LAST_SEEN_VERSION_KEY, '0.7.8');
    const modal = new ChangelogModal();
    const first = modal.showIfUpdated();
    const second = modal.showIfUpdated();
    expect(dialogs).toHaveLength(1);
    dialogs[0].close();
    await Promise.all([first, second]);
    await modal.showIfUpdated();
    expect(dialogs).toHaveLength(1);
    const manual = modal.open();
    expect(dialogs).toHaveLength(2);
    dialogs[1].close();
    await manual;
  });

  it('keeps the game usable and remembers dismissal in-session when storage is blocked', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('Blocked'); },
      setItem: () => { throw new Error('Blocked'); },
    });
    const modal = new ChangelogModal();
    const opened = modal.showIfUpdated();
    dialogs[0].close();
    await opened;
    await modal.showIfUpdated();
    expect(dialogs).toHaveLength(1);
  });

  it('ships the current release first with dated, nonempty notes for all fourteen versions', () => {
    expect(RELEASE_NOTES[0].version).toBe(GAME_VERSION);
    expect(RELEASE_NOTES).toHaveLength(14);
    for (const release of RELEASE_NOTES) {
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.changes.length).toBeGreaterThan(0);
    }
  });

  it('keeps repository metadata out of the player-facing history and handles Windows newlines', () => {
    const parsed = parseChangelog('# Changelog\r\nIntro\r\n## 0.8.0 — 2026-11-04\r\nReferência: `abc`.\r\n- Confira **Ver novidades**.\r\n');
    expect(parsed).toEqual([{
      version: '0.8.0', date: '2026-11-04', changes: ['Confira Ver novidades.'],
    }]);
  });
});
