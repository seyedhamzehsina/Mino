const DialogModule = {
  dialog: null,
  resolve: null,

  init() {
    this.dialog = document.getElementById('app-dialog');
    if (!this.dialog) return;
    this.dialog.addEventListener('close', () => this.finish(this.dialog.returnValue === 'confirm'));
    this.dialog.addEventListener('cancel', () => this.dialog.close('cancel'));
    document.getElementById('app-dialog-confirm').addEventListener('click', () => this.dialog.close('confirm'));
    document.getElementById('app-dialog-cancel').addEventListener('click', () => this.dialog.close('cancel'));
    document.getElementById('app-dialog-close').addEventListener('click', () => this.dialog.close('cancel'));
    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.dialog.close('cancel');
    });
  },

  show({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', kicker = 'Mino', destructive = false, showCancel = true }) {
    if (!this.dialog) return Promise.resolve(false);
    if (this.dialog.open) this.dialog.close('cancel');
    this.dialog.querySelector('#app-dialog-title').textContent = title;
    this.dialog.querySelector('#app-dialog-message').textContent = message;
    this.dialog.querySelector('#app-dialog-kicker').textContent = kicker;
    const confirm = this.dialog.querySelector('#app-dialog-confirm');
    const cancel = this.dialog.querySelector('#app-dialog-cancel');
    confirm.textContent = confirmLabel;
    cancel.textContent = cancelLabel;
    cancel.hidden = !showCancel;
    this.dialog.classList.toggle('is-destructive', destructive);
    this.dialog.showModal();
    confirm.focus();
    return new Promise(resolve => { this.resolve = resolve; });
  },

  confirm(options) {
    return this.show(options);
  },

  async notice({ title, message, label = 'OK', kicker = 'Mino' }) {
    await this.show({ title, message, confirmLabel: label, kicker, showCancel: false });
  },

  finish(confirmed) {
    const resolve = this.resolve;
    this.resolve = null;
    if (resolve) resolve(confirmed);
  }
};
