const SearchModule = {
  suggestions: [],
  activeIndex: -1,

  init() {
    const form = document.getElementById('search-form');
    const input = document.getElementById('search-input');
    if (!form || !input) return;

    const dropdown = document.createElement('div');
    dropdown.id = 'search-suggestions';
    dropdown.className = 'search-suggestions';
    dropdown.setAttribute('role', 'listbox');
    dropdown.hidden = true;
    form.appendChild(dropdown);
    this.input = input;
    this.dropdown = dropdown;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const selected = this.suggestions[this.activeIndex];
      if (selected) {
        this.openShortcut(selected);
        return;
      }
      await this.searchWithDefaultProvider(input.value.trim());
    });

    input.addEventListener('input', () => this.renderSuggestions());
    input.addEventListener('keydown', (event) => this.handleKeydown(event));
    input.addEventListener('blur', () => setTimeout(() => this.hideSuggestions(), 150));
  },

  async searchWithDefaultProvider(query) {
    if (!query) return;
    try {
      // Respect the provider selected by the user in Chrome. Mino never
      // chooses a provider, redirects web searches, or fetches suggestions.
      await chrome.search.query({ text: query, disposition: 'CURRENT_TAB' });
    } catch (error) {
      console.error('Default-provider search failed:', error);
    }
  },

  getShortcutSuggestions(query) {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized || typeof ShortcutsModule === 'undefined') return [];
    return (ShortcutsModule.shortcuts || [])
      .filter(shortcut => `${shortcut.name || ''} ${shortcut.url || ''}`.toLocaleLowerCase().includes(normalized))
      .slice(0, 6);
  },

  renderSuggestions() {
    this.suggestions = this.getShortcutSuggestions(this.input.value);
    this.activeIndex = -1;
    this.dropdown.replaceChildren();
    if (!this.suggestions.length) {
      this.hideSuggestions();
      return;
    }
    this.suggestions.forEach((shortcut, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'suggestion-item';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      const icon = document.createElement('span');
      icon.className = 'suggestion-icon';
      icon.textContent = '↗';
      const copy = document.createElement('span');
      copy.className = 'suggestion-copy';
      const name = document.createElement('span');
      name.className = 'suggestion-name';
      name.textContent = shortcut.name;
      const url = document.createElement('span');
      url.className = 'suggestion-url';
      url.textContent = shortcut.url;
      copy.append(name, url);
      item.append(icon, copy);
      item.addEventListener('mousedown', (event) => {
        event.preventDefault();
        this.activeIndex = index;
        this.openShortcut(shortcut);
      });
      this.dropdown.appendChild(item);
    });
    this.dropdown.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
  },

  handleKeydown(event) {
    if (this.dropdown.hidden || !this.suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex = (this.activeIndex + 1) % this.suggestions.length;
      this.highlightSuggestion();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex = (this.activeIndex - 1 + this.suggestions.length) % this.suggestions.length;
      this.highlightSuggestion();
    } else if (event.key === 'Escape') {
      this.hideSuggestions();
    }
  },

  highlightSuggestion() {
    this.dropdown.querySelectorAll('.suggestion-item').forEach((item, index) => {
      const active = index === this.activeIndex;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
  },

  openShortcut(shortcut) {
    if (!shortcut?.url) return;
    window.location.assign(shortcut.url);
  },

  hideSuggestions() {
    this.dropdown.hidden = true;
    this.input?.setAttribute('aria-expanded', 'false');
    this.activeIndex = -1;
  }
};
