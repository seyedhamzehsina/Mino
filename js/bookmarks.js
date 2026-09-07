const BookmarksModule = {
  bookmarks: [],
  async init() {
    this.bookmarks = await StorageManager.get('bookmarks') || this.getDefaultBookmarks();
    await this.save();
    this.render();
    document.getElementById('add-bookmark-btn').addEventListener('click', () => this.addBookmark());
  },
  async save() {
    await StorageManager.set('bookmarks', this.bookmarks);
  },
  getDefaultBookmarks() {
    return [
      { id: 1, name: 'Wikipedia', url: 'https://wikipedia.org' },
      { id: 2, name: 'Reddit', url: 'https://reddit.com' }
    ];
  },
  async addBookmark() {
    const url = prompt('Bookmark URL (e.g. https://example.com):');
    if (!url) return;
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;
    let hostname;
    try {
      hostname = new URL(normalized).hostname;
    } catch {
      alert('Invalid URL.');
      return;
    }
    const name = prompt('Bookmark name:', hostname.replace(/^www\./, '')) || hostname;
    this.bookmarks.push({ id: Date.now(), name, url: normalized });
    await this.save();
    this.render();
  },
  async removeBookmark(id) {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id);
    await this.save();
    this.render();
  },
  render() {
    const container = document.getElementById('bookmarks-container');
    container.innerHTML = '';
    this.bookmarks.forEach(bm => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';
      const a = document.createElement('a');
      a.className = 'bookmark-link';
      a.href = bm.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      const img = document.createElement('img');
      img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(bm.url)}&sz=64`;
      img.alt = '';
      img.loading = 'lazy';
      const name = document.createElement('span');
      name.className = 'bookmark-name';
      name.textContent = bm.name;
      a.appendChild(img);
      a.appendChild(name);
      const remove = document.createElement('button');
      remove.className = 'bookmark-remove';
      remove.title = 'Remove';
      remove.textContent = '×';
      remove.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.removeBookmark(bm.id);
      });
      item.appendChild(a);
      item.appendChild(remove);
      container.appendChild(item);
    });
    if (!this.bookmarks.length) {
      const empty = document.createElement('div');
      empty.className = 'bookmarks-empty';
      empty.textContent = 'No bookmarks yet. Add your first one!';
      container.appendChild(empty);
    }
  }
};
