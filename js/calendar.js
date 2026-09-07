const CalendarModule = {
  settings: { type: 'gregorian' },
  jalaliMonths: ['Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar', 'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'],
  async init() {
    const saved = await StorageManager.get('calendarSettings');
    if (saved && saved.type) this.settings = { ...this.settings, ...saved };
    this.render();
    document.addEventListener('date-changed', () => this.render());
    document.addEventListener('todos-changed', () => this.render());
  },
  setType(type) {
    this.settings.type = type === 'persian' ? 'persian' : 'gregorian';
    StorageManager.set('calendarSettings', this.settings);
    this.render();
  },
  dateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  },
  keyFor(date) {
    return this.dateKey(date.getFullYear(), date.getMonth(), date.getDate());
  },
  jalaliParts(date) {
    // Returns { year, month, day } from the Persian (Jalali) calendar, or null when unsupported.
    try {
      const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date);
      const pick = (type) => {
        const part = parts.find(p => p.type === type);
        return part ? parseInt(part.value, 10) : null;
      };
      const year = pick('year');
      const month = pick('month');
      const day = pick('day');
      if (!year || !month || !day) return null;
      return { year, month, day };
    } catch (err) {
      return null;
    }
  },
  render() {
    const now = new Date();
    const todayKey = this.keyFor(now);
    const selected = TodoModule.selectedDate;
    const header = document.getElementById('calendar-month-year');
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    days.forEach(d => { const div = document.createElement('div'); div.className = 'day-name'; div.innerText = d; grid.appendChild(div); });

    let monthLabel = '';
    const cells = [];
    if (this.settings.type === 'persian') {
      const jp = this.jalaliParts(now);
      if (!jp) {
        // Persian calendar not supported by this engine; fall back to Gregorian.
        this.settings.type = 'gregorian';
      } else {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (jp.day - 1));
        let daysInMonth = 30;
        for (let i = 29; i <= 31; i++) {
          const probe = new Date(monthStart);
          probe.setDate(monthStart.getDate() + i);
          const p = this.jalaliParts(probe);
          if (!p || p.month !== jp.month) { daysInMonth = i; break; }
        }
        monthLabel = `${this.jalaliMonths[jp.month - 1]} ${jp.year}`;
        for (let i = 0; i < monthStart.getDay(); i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
          const cellDate = new Date(monthStart);
          cellDate.setDate(monthStart.getDate() + d - 1);
          cells.push({ label: d, date: cellDate });
        }
      }
    }
    if (this.settings.type === 'gregorian') {
      const year = now.getFullYear();
      const month = now.getMonth();
      monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let i = 0; i < firstDay; i++) cells.push(null);
      for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ label: d, date: new Date(year, month, d) });
      }
    }

    header.innerText = monthLabel;
    cells.forEach(cell => {
      const div = document.createElement('div');
      if (!cell) { grid.appendChild(div); return; }
      div.className = 'day-cell';
      const key = this.keyFor(cell.date);
      if (key === todayKey) div.classList.add('today');
      if (selected === key) div.classList.add('selected');
      if (TodoModule.hasOpenTodos(key)) div.classList.add('has-todos');
      div.innerText = cell.label;
      div.title = 'Show tasks for this day';
      div.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('date-selected', { detail: key }));
        this.render();
      });
      grid.appendChild(div);
    });
  }
};
