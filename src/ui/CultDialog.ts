/** Native dialog supplies focus trapping and Escape handling; game materials supply its appearance. */
export function cultDialog(title: string, message: string, confirmLabel = 'Entendido', cancelLabel?: string): Promise<boolean> {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'cult-dialog';
    const heading = document.createElement('h2');
    heading.id = 'cult-dialog-title';
    heading.textContent = title;
    dialog.setAttribute('aria-labelledby', heading.id);
    const body = document.createElement('p');
    body.textContent = message;
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
    confirm.addEventListener('click', () => dialog.close('confirm'));
    actions.append(confirm);
    dialog.append(heading, body, actions);
    dialog.addEventListener('close', () => { const accepted = dialog.returnValue === 'confirm'; dialog.remove(); resolve(accepted); }, { once:true });
    document.body.append(dialog);
    dialog.showModal();
  });
}
