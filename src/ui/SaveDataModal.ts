import { NotificationManager } from '../systems/notifications.js';
import { cultDialog } from './CultDialog.js';

export interface SaveDataModalOptions {
  onExport: () => string;
  onImport: (saveString: string) => boolean | null | Promise<boolean | null>;
  notifications: NotificationManager;
}

export class SaveDataModal {
  private modalEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private descEl: HTMLElement | null = null;
  private textareaEl: HTMLTextAreaElement | null = null;
  private actionBtn: HTMLButtonElement | null = null;
  private closeBtn: HTMLButtonElement | null = null;

  private isHandling = false;
  private mode: 'export' | 'import' = 'export';
  private options: SaveDataModalOptions;

  constructor(options: SaveDataModalOptions) {
    this.options = options;
    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    this.modalEl = document.getElementById('save-data-modal');
    this.titleEl = document.getElementById('save-data-modal-title');
    this.descEl = document.getElementById('save-data-modal-desc');
    this.textareaEl = document.getElementById('save-data-textarea') as HTMLTextAreaElement | null;
    this.actionBtn = document.getElementById('btn-save-data-action') as HTMLButtonElement | null;
    this.closeBtn = document.getElementById('close-save-data-btn') as HTMLButtonElement | null;
  }

  private bindEvents(): void {
    this.closeBtn?.addEventListener('click', () => this.close());

    this.actionBtn?.addEventListener('click', async () => {
      if (this.isHandling) return;
      this.isHandling = true;
      if (this.actionBtn) this.actionBtn.disabled = true;
      try { await this.handleAction(); } finally {
        this.isHandling = false;
        if (this.actionBtn) this.actionBtn.disabled = false;
      }
    });

    this.modalEl?.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen() && !document.querySelector('dialog[open]')) {
        this.close();
      }
    });
  }

  public isOpen(): boolean {
    return !!this.modalEl?.classList.contains('open');
  }

  public openExport(): void {
    this.mode = 'export';
    if (this.titleEl) this.titleEl.textContent = 'Exportar Progresso';
    if (this.descEl) {
      this.descEl.textContent = 'Copie o código abaixo para guardar seu progresso ou transferir para outro navegador:';
    }
    if (this.actionBtn) {
      this.actionBtn.textContent = 'Copiar Código';
    }

    const exportStr = this.options.onExport();
    if (this.textareaEl) {
      this.textareaEl.value = exportStr;
      this.textareaEl.readOnly = true;
      this.textareaEl.focus();
      this.textareaEl.select();
    }

    this.modalEl?.classList.add('open');
  }

  public openImport(): void {
    this.mode = 'import';
    if (this.titleEl) this.titleEl.textContent = 'Importar Progresso';
    if (this.descEl) {
      this.descEl.textContent = 'Cole abaixo o código de backup gerado pela opção de Exportar:';
    }
    if (this.actionBtn) {
      this.actionBtn.textContent = 'Carregar Save';
    }

    if (this.textareaEl) {
      this.textareaEl.value = '';
      this.textareaEl.readOnly = false;
      this.textareaEl.placeholder = 'Cole o código Base64 do save aqui...';
      this.textareaEl.focus();
    }

    this.modalEl?.classList.add('open');
  }

  public close(): void {
    this.modalEl?.classList.remove('open');
  }

  private async handleAction(): Promise<void> {
    if (this.mode === 'export') {
      const text = this.textareaEl?.value || '';
      if (!text) return;

      const notifySuccess = () => {
        this.options.notifications.showCustomPopup(
          'Save Copiado',
          'Chave de backup copiada com sucesso para a área de transferência.',
          '',
          'EXPORTAÇÃO'
        );
        this.close();
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(notifySuccess).catch(() => {
          this.textareaEl?.select();
          document.execCommand('copy');
          notifySuccess();
        });
      } else {
        this.textareaEl?.select();
        document.execCommand('copy');
        notifySuccess();
      }
    } else {
      const raw = this.textareaEl?.value || '';
      if (!raw.trim()) {
        await cultDialog('Registro vazio', 'Por favor, cole um código de save válido.');
        return;
      }

      const success = await this.options.onImport(raw.trim());
      if (success) {
        this.options.notifications.showCustomPopup(
          'Progresso Restaurado',
          'Seu culto foi restabelecido a partir do backup.',
          '',
          'IMPORTAÇÃO'
        );
        this.close();
      } else if (success === false) {
        await cultDialog('Registro inválido', 'Código de save inválido ou incompatível.');
      }
    }
  }
}
