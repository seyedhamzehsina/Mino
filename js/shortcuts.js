const ShortcutsModule = {
  shortcuts: [],
  async init() {
    this.shortcuts = await StorageManager.get('shortcuts') || this.getDefaultShortcuts();
    await this.save();
    this.render();
    document.getElementById('add-shortcut-btn').addEventListener('click', () => this.addShortcut());
  },
  async save() {
    await StorageManager.set('shortcuts', this.shortcuts);
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
    const url = prompt('Shortcut URL (e.g. https://example.com):');
    if (!url) return;
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;
    let hostname;
    try {
      hostname = new URL(normalized).hostname;
    } catch {
      await DialogModule.notice({ title: 'Invalid link', message: 'Enter a valid website address and try again.', kicker: 'Shortcuts' });
      return;
    }
    const name = prompt('Shortcut name:', hostname.replace(/^www\./, '')) || hostname;
    this.shortcuts.push({ id: Date.now(), name, url: normalized });
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
      container.appendChild(item);
    });
  }
};
