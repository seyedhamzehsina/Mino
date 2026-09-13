const ShortcutDialogModule = {
  dialog: null,
  form: null,
  url: '',
  editingId: null,
  resolve: null,

  init() {
    this.dialog = document.getElementById('shortcut-dialog');
    this.form = document.getElementById('shortcut-dialog-form');
    if (!this.dialog || !this.form) return;
    this.form.addEventListener('submit', event => this.submit(event));
    document.getElementById('shortcut-dialog-close').addEventListener('click', () => this.close());
    document.getElementById('shortcut-dialog-cancel-url').addEventListener('click', () => this.close());
    document.getElementById('shortcut-dialog-back').addEventListener('click', () => this.showStep('url'));
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
  },

  open(shortcut = null) {
    this.url = shortcut?.url || '';
    this.editingId = shortcut?.id || null;
    this.showStep('url');
    document.getElementById('shortcut-url-input').value = this.url;
    document.getElementById('shortcut-name-input').value = shortcut?.name || '';
    document.getElementById('shortcut-dialog-title').textContent = shortcut ? 'Edit shortcut' : 'Add a shortcut';
    if (!this.dialog.open) this.dialog.showModal();
    document.getElementById('shortcut-url-input').focus();
    return new Promise(resolve => { this.resolve = resolve; });
  },

  showStep(step) {
    this.dialog.querySelectorAll('[data-shortcut-step]').forEach(section => { section.hidden = section.dataset.shortcutStep !== step; });
    this.dialog.querySelectorAll('.shortcut-dialog-error').forEach(error => { error.textContent = ''; });
    requestAnimationFrame(() => this.dialog.querySelector(`[data-shortcut-step="${step}"] input`)?.focus());
  },

  submit(event) {
    event.preventDefault();
    if (!event.currentTarget.querySelector('[data-shortcut-step="url"]').hidden) {
      const input = document.getElementById('shortcut-url-input');
      let normalized = input.value.trim();
      if (!normalized) { document.getElementById('shortcut-url-error').textContent = 'Enter a website address.'; input.focus(); return; }
      if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
      try { new URL(normalized); } catch { document.getElementById('shortcut-url-error').textContent = 'Enter a valid website address.'; input.focus(); return; }
      this.url = normalized;
      const hostname = new URL(normalized).hostname.replace(/^www\./, '');
      if (!this.editingId || !document.getElementById('shortcut-name-input').value.trim()) {
        document.getElementById('shortcut-name-input').value = hostname;
      }
      this.showStep('name');
      return;
    }
    const nameInput = document.getElementById('shortcut-name-input');
    const name = nameInput.value.trim();
    if (!name) { document.getElementById('shortcut-name-error').textContent = 'Enter a name for this shortcut.'; nameInput.focus(); return; }
    const resolve = this.resolve;
    this.resolve = null;
    if (this.dialog.open) this.dialog.close('saved');
    if (resolve) resolve({ id: this.editingId, url: this.url, name });
  },

  close() {
    const resolve = this.resolve;
    this.resolve = null;
    if (this.dialog?.open) this.dialog.close('cancel');
    if (resolve) resolve(null);
  }
};

const ShortcutsModule = {
  shortcuts: [],
  async init() {
    ShortcutDialogModule.init();
    this.shortcuts = await StorageManager.get('shortcuts') || this.getDefaultShortcuts();
    await this.save();
    this.render();
    document.getElementById('add-shortcut-btn').addEventListener('click', () => this.addShortcut());
  },
  async save() {
    await StorageManager.set('shortcuts', this.shortcuts);
    document.dispatchEvent(new Event('workspace-changed'));
  },
  getDefaultShortcuts() {
    return [
      { id: 1, name: 'Google', url: 'https://google.com' },
      { id: 2, name: 'Gmail', url: 'https://mail.google.com' },
      { id: 3, name: 'GitHub', url: 'https://github.com' },
      { id: 4, name: 'YouTube', url: 'https://youtube.com' }
    ];
  },
  async addShortcut() {
    const shortcut = await ShortcutDialogModule.open();
    if (!shortcut) return;
    this.shortcuts.push({ id: Date.now(), name: shortcut.name, url: shortcut.url });
    await this.save();
    this.render();
  },
  async editShortcut(id) {
    const current = this.shortcuts.find(item => item.id === id);
    if (!current) return;
    const updated = await ShortcutDialogModule.open(current);
    if (!updated) return;
    this.shortcuts = this.shortcuts.map(item => item.id === id ? { ...item, name: updated.name, url: updated.url } : item);
    await this.save();
    this.render();
  },
  async removeShortcut(id) {
    const shortcut = this.shortcuts.find(item => item.id === id);
    if (!shortcut) return;
    const confirmed = await DialogModule.confirm({
      title: 'Remove this shortcut?',
      message: `${shortcut.name} will be removed from your new tab.`,
      confirmLabel: 'Remove shortcut',
      destructive: true,
      kicker: 'Shortcuts'
    });
    if (!confirmed) return;
    this.shortcuts = this.shortcuts.filter(sc => sc.id !== id);
    await this.save();
    this.render();
  },
  render() {
    const container = document.getElementById('shortcuts-container');
    container.innerHTML = '';
    this.shortcuts.forEach(sc => {
      const item = document.createElement('div');
      item.className = 'shortcut-item-wrapper';
      const a = document.createElement('a');
      a.className = 'shortcut-item';
      a.href = sc.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      const icon = document.createElement('div');
      icon.className = 'shortcut-icon';
      const img = document.createElement('img');
      img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(sc.url)}&sz=64`;
      img.alt = sc.name;
      img.loading = 'lazy';
      icon.appendChild(img);
      const name = document.createElement('div');
      name.className = 'shortcut-name';
      name.textContent = sc.name;
      a.appendChild(icon);
      a.appendChild(name);
      item.appendChild(a);
      const remove = document.createElement('button');
      remove.className = 'shortcut-remove';
      remove.title = 'Remove';
      remove.textContent = '×';
      remove.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.removeShortcut(sc.id);
      });
      item.appendChild(remove);
      const edit = document.createElement('button');
      edit.className = 'shortcut-edit';
      edit.title = 'Edit';
      edit.textContent = '✎';
      edit.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.editShortcut(sc.id);
      });
      item.appendChild(edit);
      container.appendChild(item);
    });
  }
};
