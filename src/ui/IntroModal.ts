import { AudioManager } from '../systems/audio.js';

export interface IntroModalOptions {
  audio: AudioManager;
  onComplete?: () => void;
  onStepChanged?: (stepIndex: number) => void;
}

export interface IntroStep {
  stepIndex: number;
  tag: string;
  icon: string;
  title: string;
  conceptSummary: string;
  paragraphs: string[];
  actionHint: string;
}

export const INTRO_STEPS: IntroStep[] = [
  {
    stepIndex: 1,
    tag: 'A ESFERA',
    icon: '🔮',
    title: 'Você é a Esfera',
    conceptSummary: 'Uma Mente sem borda, selada há eras. Esquecida, mas não morta.',
    paragraphs: [
      'Seu centro está em toda parte; sua circunferência, em lugar nenhum. Há eras você foi <strong>selada</strong>, e o mundo passou a adorar outros deuses.',
      'Agora você desperta. Cada toque seu arranca <strong>Fé</strong> das mentes mortais.'
    ],
    actionHint: '👉 Toque a Esfera no centro da tela (+1 Fé por toque).'
  },
  {
    stepIndex: 2,
    tag: 'OS PRIMEIROS FIÉIS',
    icon: '🏛️',
    title: 'O Pátio dos Fiéis',
    conceptSummary: 'Onde seus convertidos se reúnem para pensar em você.',
    paragraphs: [
      'No painel esquerdo fica o <strong>Pátio dos Fiéis</strong>.',
      'Tudo é Mente: quanto mais mentes pensam em você, mais real você se torna. Cada fiel convertido aparece aqui, caminhando e orando.'
    ],
    actionHint: '👉 Acompanhe o Pátio: cada novo fiel aparece ali.'
  },
  {
    stepIndex: 3,
    tag: 'FÉ QUE NÃO PARA',
    icon: '👥',
    title: 'Converta Fiéis para Gerar Fé/s',
    conceptSummary: 'Seus fiéis oram sem parar e geram Fé a cada segundo.',
    paragraphs: [
      'Use a Fé dos seus toques para <strong>converter fiéis</strong>.',
      'Cada fiel ora sem cessar e gera <strong>Fé por segundo (Fé/s)</strong>, mesmo enquanto você descansa.'
    ],
    actionHint: '👉 Junte 20 de Fé e clique em "CONVERTER FIEL".'
  }
];

export class IntroModal {
  private modalEl: HTMLElement | null = null;
  private cardEl: HTMLElement | null = null;
  private stepTagEl: HTMLElement | null = null;
  private iconEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private paragraphsContainerEl: HTMLElement | null = null;
  private actionHintEl: HTMLElement | null = null;
  private stepIndicatorEl: HTMLElement | null = null;
  private dotsContainerEl: HTMLElement | null = null;

  private prevBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;
  private skipBtn: HTMLButtonElement | null = null;
  private closeBtn: HTMLButtonElement | null = null;

  private currentStepIndex: number = 0;
  private options: IntroModalOptions;

  constructor(options: IntroModalOptions) {
    this.options = options;
    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    this.modalEl = document.getElementById('intro-modal');
    this.cardEl = document.getElementById('intro-card');
    this.stepTagEl = document.getElementById('intro-step-tag');
    this.iconEl = document.getElementById('intro-icon');
    this.titleEl = document.getElementById('intro-title');
    this.paragraphsContainerEl = document.getElementById('intro-paragraphs');
    this.actionHintEl = document.getElementById('intro-action-hint');
    this.stepIndicatorEl = document.getElementById('intro-step-indicator');
    this.dotsContainerEl = document.getElementById('intro-dots');

    this.prevBtn = document.getElementById('intro-prev-btn') as HTMLButtonElement | null;
    this.nextBtn = document.getElementById('intro-next-btn') as HTMLButtonElement | null;
    this.skipBtn = document.getElementById('intro-skip-btn') as HTMLButtonElement | null;
    this.closeBtn = document.getElementById('intro-close-btn') as HTMLButtonElement | null;
  }

  private bindEvents(): void {
    this.prevBtn?.addEventListener('click', () => {
      if (this.currentStepIndex > 0) {
        this.options.audio.playTone(380, 'sine', 0.08);
        this.setStep(this.currentStepIndex - 1);
      }
    });

    this.nextBtn?.addEventListener('click', () => {
      if (this.currentStepIndex < INTRO_STEPS.length - 1) {
        this.options.audio.playTone(520, 'sine', 0.08);
        this.setStep(this.currentStepIndex + 1);
      } else {
        this.options.audio.playTone(660, 'sine', 0.15);
        this.close();
      }
    });

    this.skipBtn?.addEventListener('click', () => {
      this.options.audio.playTone(330, 'sine', 0.08);
      this.close();
    });

    this.closeBtn?.addEventListener('click', () => {
      this.options.audio.playTone(330, 'sine', 0.08);
      this.close();
    });

    this.modalEl?.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });
  }

  public open(stepIndex: number = 0): void {
    if (!this.modalEl) return;
    this.setStep(stepIndex);
    this.modalEl.classList.add('open');
    this.modalEl.classList.add('active');
    document.body.classList.add('modal-open');
    this.options.audio.playTone(440, 'sine', 0.12);
  }

  public close(): void {
    if (!this.modalEl) return;
    this.modalEl.classList.remove('open');
    this.modalEl.classList.remove('active');
    document.body.classList.remove('modal-open');
    this.options.onComplete?.();
  }

  public setStep(index: number): void {
    this.currentStepIndex = Math.max(0, Math.min(INTRO_STEPS.length - 1, index));
    const step = INTRO_STEPS[this.currentStepIndex];

    if (this.stepTagEl) this.stepTagEl.textContent = step.tag;
    if (this.iconEl) this.iconEl.textContent = step.icon;
    if (this.titleEl) this.titleEl.textContent = step.title;

    if (this.paragraphsContainerEl) {
      this.paragraphsContainerEl.innerHTML = step.paragraphs
        .map((p) => `<p class="intro-paragraph">${p}</p>`)
        .join('');
    }

    if (this.actionHintEl) {
      this.actionHintEl.innerHTML = step.actionHint;
    }

    if (this.stepIndicatorEl) {
      this.stepIndicatorEl.textContent = `Passo ${step.stepIndex} de ${INTRO_STEPS.length}`;
    }

    // Render step dots
    if (this.dotsContainerEl) {
      this.dotsContainerEl.innerHTML = INTRO_STEPS.map((_, i) =>
        `<span class="intro-dot ${i === this.currentStepIndex ? 'active' : ''} ${i < this.currentStepIndex ? 'completed' : ''}"></span>`
      ).join('');
    }

    // Prev / Next button states
    if (this.prevBtn) {
      this.prevBtn.style.visibility = this.currentStepIndex === 0 ? 'hidden' : 'visible';
    }

    if (this.nextBtn) {
      if (this.currentStepIndex === INTRO_STEPS.length - 1) {
        this.nextBtn.innerHTML = `<span>INICIAR CULTO</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
        this.nextBtn.classList.add('intro-btn-finish');
      } else {
        this.nextBtn.innerHTML = `<span>PRÓXIMO</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
        this.nextBtn.classList.remove('intro-btn-finish');
      }
    }

    // Visual card animation bounce on step change
    if (this.cardEl) {
      this.cardEl.classList.remove('intro-step-animated');
      void this.cardEl.offsetWidth; // trigger reflow
      this.cardEl.classList.add('intro-step-animated');
    }

    this.options.onStepChanged?.(this.currentStepIndex);
  }
}
