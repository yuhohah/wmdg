import { GAME_VERSION, RELEASE_NOTES } from '../config/changelog.js';

export const LAST_SEEN_VERSION_KEY = 'cult_last_seen_version';

export class ChangelogModal {
  private lastSeenVersion: string | null = null;
  private pending?: Promise<void>;

  public async showIfUpdated(): Promise<void> {
    if (this.lastSeenVersion === GAME_VERSION) return;
    try {
      this.lastSeenVersion = localStorage.getItem(LAST_SEEN_VERSION_KEY) ?? this.lastSeenVersion;
    } catch {
      // Browsers may block storage; still show the news once per session.
    }
    if (this.lastSeenVersion !== GAME_VERSION) await this.open();
  }

  public open(): Promise<void> {
    if (this.pending) return this.pending;

    const dialog = document.createElement('dialog');
    dialog.className = 'cult-dialog changelog-dialog';
    dialog.setAttribute('aria-labelledby', 'changelog-title');

    const header = document.createElement('header');
    const title = document.createElement('h2');
    title.id = 'changelog-title';
    title.textContent = `Novidades da versão ${GAME_VERSION}`;
    const intro = document.createElement('p');
    intro.textContent = 'A Esfera continua evoluindo. Confira o que mudou no culto.';
    header.append(title, intro);

    const history = document.createElement('div');
    history.className = 'changelog-history';
    history.tabIndex = 0;
    history.setAttribute('role', 'region');
    history.setAttribute('aria-label', 'Histórico de versões');
    for (const release of RELEASE_NOTES) {
      const section = document.createElement('section');
      const heading = document.createElement('h3');
      heading.textContent = `Versão ${release.version}`;
      const date = document.createElement('time');
      date.dateTime = release.date;
      date.textContent = release.date.split('-').reverse().join('/');
      section.append(heading, date);
      for (const category of release.categories) {
        const categoryHeading = document.createElement('h4');
        categoryHeading.textContent = category.title;
        const changes = document.createElement('ul');
        for (const change of category.changes) {
          const item = document.createElement('li');
          item.textContent = change;
          changes.append(item);
        }
        section.append(categoryHeading, changes);
      }
      history.append(section);
    }

    const actions = document.createElement('div');
    actions.className = 'cult-dialog-actions';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Entendido';
    close.autofocus = true;
    close.addEventListener('click', () => dialog.close());
    actions.append(close);
    dialog.append(header, history, actions);

    this.pending = new Promise(resolve => {
      dialog.addEventListener('close', () => {
        this.lastSeenVersion = GAME_VERSION;
        try {
          localStorage.setItem(LAST_SEEN_VERSION_KEY, GAME_VERSION);
        } catch {
          // Keep the session usable even when preferences cannot be persisted.
        }
        dialog.remove();
        this.pending = undefined;
        resolve();
      }, { once: true });
    });
    document.body.append(dialog);
    dialog.showModal();
    return this.pending;
  }
}
