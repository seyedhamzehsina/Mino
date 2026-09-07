const SearchModule = {
  suggestions: [],
  activeIndex: -1,
  dropdown: null,
  input: null,
  abortController: null,
  init() {
    this.input = document.getElementById('search-input');
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'search-suggestions';
    this.dropdown.hidden = true;
    document.getElementById('search-form').appendChild(this.dropdown);

    document.getElementById('search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.activeIndex >= 0 && this.suggestions[this.activeIndex]) {
        this.input.value = this.suggestions[this.activeIndex];
      }
      this.search(this.input.value.trim());
    });

    this.input.addEventListener('input', () => this.fetchSuggestions());
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    this.input.addEventListener('blur', () => setTimeout(() => this.hide(), 150));
  },
  search(query) {
    if (!query) return;
    const isUrl = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(query);
    const url = isUrl
      ? (query.startsWith('http') ? query : 'https://' + query)
      : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    window.location.href = url;
  },
  handleKeydown(e) {
    if (this.dropdown.hidden || !this.suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.activeIndex = (this.activeIndex + 1) % this.suggestions.length;
      this.highlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.activeIndex = (this.activeIndex - 1 + this.suggestions.length) % this.suggestions.length;
      this.highlight();
    } else if (e.key === 'Escape') {
      this.hide();
    }
  },
  highlight() {
    this.dropdown.querySelectorAll('.suggestion-item').forEach((el, i) => {
      el.classList.toggle('active', i === this.activeIndex);
    });
  },
  async fetchSuggestions() {
    const query = this.input.value.trim();
    this.activeIndex = -1;
    if (!query) { this.hide(); return; }
    if (this.abortController) this.abortController.abort();
    this.abortController = new AbortController();
    try {
      const res = await fetch(
        `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`,
        { signal: this.abortController.signal }
      );
      const data = await res.json();
      if (this.input.value.trim() !== query) return;
      this.suggestions = (data[1] || []).slice(0, 8);
      this.render();
    } catch (err) {
      if (err.name !== 'AbortError') this.hide();
    }
  },
  render() {
    this.dropdown.innerHTML = '';
    if (!this.suggestions.length) { this.hide(); return; }
    this.suggestions.forEach((s, i) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      const icon = document.createElement('span');
      icon.className = 'suggestion-icon';
      icon.textContent = '🔍';
      const text = document.createElement('span');
      text.textContent = s;
      item.appendChild(icon);
      item.appendChild(text);
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.search(s);
      });
      this.dropdown.appendChild(item);
    });
    this.dropdown.hidden = false;
  },
  hide() {
    this.dropdown.hidden = true;
    this.activeIndex = -1;
  }
};
