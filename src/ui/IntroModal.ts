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
    tag: 'A DIVINDADE CÓSMICA',
    icon: '🔮',
    title: 'Você é um Deus Esfera',
    conceptSummary: 'Sua essência primordial repousa como a sagrada Esfera Divina no altar do santuário.',
    paragraphs: [
      'Você desperta como uma divindade cósmica primordial adorada e manifestada na forma da <strong>Esfera Sagrada</strong>.',
      'No centro do templo sagrado, cada toque ou clique seu canaliza <strong>Fé pura</strong> do cosmos diretamente para alimentar seu despertar divino.'
    ],
    actionHint: '👉 Toque na Esfera Divina no centro do santuário para canalizar seus primeiros pontos de Fé manualmente (+1 Fé por toque).'
  },
  {
    stepIndex: 2,
    tag: 'O SANTUÁRIO MORTAL',
    icon: '🏛️',
    title: 'O Pátio dos Fiéis',
    conceptSummary: 'O recinto sagrado onde as almas mortais se congregam para venerar sua esfera.',
    paragraphs: [
      'No painel esquerdo encontra-se o <strong>Pátio dos Fiéis</strong>.',
      'É neste recinto que as almas mortais se congregam em busca de iluminação. Conforme seu culto cresce, você verá mais devotos caminhando e orando pelo pátio em tempo real!'
    ],
    actionHint: '👉 Observe o Pátio dos Fiéis à esquerda conforme novos adeptos chegam para venerar sua presença.'
  },
  {
    stepIndex: 3,
    tag: 'DEVOÇÃO CONTÍNUA & FÉ/S',
    icon: '👥',
    title: 'Compre Fiéis para Gerar Fé/s',
    conceptSummary: 'Converta Fiéis no pátio para que suas orações gerem Fé contínua a cada segundo.',
    paragraphs: [
      'Para que sua divindade alcance o infinito cósmico, use sua Fé canalizada para <strong>converter fiéis</strong>.',
      'Cada fiel no pátio ora sem cessar, convertendo devoção em <strong>Fé por segundo (Fé/s)</strong> — multiplicando seu poder divino mesmo quando você estiver ausente!'
    ],
    actionHint: '👉 Junte 20 de Fé tocando na Esfera e clique no botão "CONVERTER FIEL" para iniciar a Fé automática a cada segundo!'
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
