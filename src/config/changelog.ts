/// <reference types="vite/client" />
import { version } from '../../package.json';
import changelog from '../../CHANGELOG.md?raw';

export const GAME_VERSION = version;

export interface ReleaseCategory {
  title: string;
  changes: string[];
}

export interface ReleaseNotes {
  version: string;
  date: string;
  categories: ReleaseCategory[];
}

/** Read the release dates, category headings and player-facing changes. */
export function parseChangelog(markdown: string): ReleaseNotes[] {
  const releases: ReleaseNotes[] = [];
  let release: ReleaseNotes | undefined;
  let category: ReleaseCategory | undefined;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^## (\d+\.\d+\.\d+) — (\d{4}-\d{2}-\d{2})\s*$/.exec(line);
    if (heading) {
      release = { version: heading[1], date: heading[2], categories: [] };
      releases.push(release);
      category = undefined;
    } else if (release && line.startsWith('### ')) {
      category = { title: line.slice(4).trim(), changes: [] };
      release.categories.push(category);
    } else if (release && line.startsWith('- ')) {
      if (!category) {
        category = { title: 'Novidades', changes: [] };
        release.categories.push(category);
      }
      category.changes.push(line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1'));
    }
  }
  return releases;
}

export const RELEASE_NOTES = parseChangelog(changelog);
