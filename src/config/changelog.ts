/// <reference types="vite/client" />
import { version } from '../../package.json';
import changelog from '../../CHANGELOG.md?raw';

export const GAME_VERSION = version;

export interface ReleaseNotes {
  version: string;
  date: string;
  changes: string[];
}

/** Only release headings and player-facing bullets enter the in-game history. */
export function parseChangelog(markdown: string): ReleaseNotes[] {
  const releases: ReleaseNotes[] = [];
  let release: ReleaseNotes | undefined;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^## (\d+\.\d+\.\d+) — (\d{4}-\d{2}-\d{2})\s*$/.exec(line);
    if (heading) {
      release = { version: heading[1], date: heading[2], changes: [] };
      releases.push(release);
    } else if (release && line.startsWith('- ')) {
      release.changes.push(line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1'));
    }
  }
  return releases;
}

export const RELEASE_NOTES = parseChangelog(changelog);
