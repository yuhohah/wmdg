import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShortcutsHelp } from './ShortcutsHelp.js';

describe('shortcuts help', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('explains how to arrange and move the board', () => {
    const panel = { innerHTML: '', hidden: true };
    const node = () => ({ addEventListener: vi.fn(), setAttribute: vi.fn(), classList: { toggle: vi.fn() } });
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'shortcuts-help-panel' ? panel : node()),
      addEventListener: vi.fn(),
    });
    new ShortcutsHelp();
    const row = (key: string, label: string) => `<div><dt><kbd>${key}</kbd></dt><dd>${label}</dd></div>`;
    expect(panel.innerHTML).toContain('<h2>Atalhos e controles</h2>');
    expect(panel.innerHTML).toContain('<h3>Quadro</h3>');
    expect(panel.innerHTML).toContain(row('Arrastar título', 'Mover um card'));
    expect(panel.innerHTML).toContain(row('Arrastar fundo', 'Mover o quadro'));
    expect(panel.innerHTML).toContain(row('Roda do mouse', 'Aproximar ou afastar'));
  });
});
