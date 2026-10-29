/** Native dialog supplies focus trapping and Escape handling; game materials supply its appearance. */
export function cultDialog(title: string, message: string | (() => string), confirmLabel = 'Entendido', cancelLabel?: string): Promise<boolean> {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'cult-dialog';
    const heading = document.createElement('h2');
    heading.id = 'cult-dialog-title';
    heading.textContent = title;
    dialog.setAttribute('aria-labelledby', heading.id);
    const body = document.createElement('p');
    const refresh = () => {
      const text = typeof message === 'function' ? message() : message;
      if (body.textContent !== text) body.textContent = text;
    };
    refresh();
    const refreshId = typeof message === 'function' ? window.setInterval(refresh, 100) : undefined;
    const actions = document.createElement('div');
    actions.className = 'cult-dialog-actions';
    if (cancelLabel) {
      const cancel = document.createElement('button');
      cancel.textContent = cancelLabel;
      cancel.type = 'button';
      cancel.autofocus = true;
      cancel.addEventListener('click', () => dialog.close('cancel'));
      actions.append(cancel);
    }
    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.textContent = confirmLabel;
    confirm.autofocus = !cancelLabel;
    confirm.addEventListener('click', () => { refresh(); dialog.close('confirm'); });
    actions.append(confirm);
    dialog.append(heading, body, actions);
    dialog.addEventListener('close', () => { const accepted = dialog.returnValue === 'confirm'; if (refreshId !== undefined) window.clearInterval(refreshId); dialog.remove(); resolve(accepted); }, { once:true });
    document.body.append(dialog);
    dialog.showModal();
  });
}
