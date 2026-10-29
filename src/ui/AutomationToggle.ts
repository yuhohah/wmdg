interface AutomationToggleOptions {
  isUnlocked: () => boolean;
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;
}

export class AutomationToggle {
  private label: HTMLElement | null;
  private input: HTMLInputElement | null;

  constructor(id: string, private options: AutomationToggleOptions) {
    this.label = document.getElementById(`${id}-wrap`);
    this.input = this.label?.querySelector<HTMLInputElement>('input') ?? null;
    this.input?.addEventListener('change', () => {
      this.options.setEnabled(this.input!.checked);
    });
  }

  // Called by the owning card, so off-screen controls stay suspended too.
  public update(): void {
    if (!this.label || !this.input) return;
    const unlocked = this.options.isUnlocked();
    if (this.label.hidden !== !unlocked) this.label.hidden = !unlocked;
    if (!unlocked) return;
    const enabled = this.options.isEnabled();
    if (this.input.checked !== enabled) this.input.checked = enabled;
  }
}
