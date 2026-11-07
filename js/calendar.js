const CalendarModule = {
  settings: { type: 'gregorian' },
  viewDate: null,
  supportedTypes: new Set(['gregorian', 'islamic', 'persian']),

  async init() {
    const saved = await StorageManager.get('calendarSettings');
    if (saved && saved.type) this.settings = { ...this.settings, ...saved };
    this.viewDate = new Date();
    document.getElementById('calendar-prev-month')?.addEventListener('click', () => this.shiftMonth(-1));
    document.getElementById('calendar-next-month')?.addEventListener('click', () => this.shiftMonth(1));
    this.render();
    document.addEventListener('date-changed', () => this.render());
    document.addEventListener('todos-changed', () => this.render());
  },

  setType(type) {
    this.settings.type = this.supportedTypes.has(type) ? type : 'gregorian';
    this.viewDate = new Date();
    StorageManager.set('calendarSettings', this.settings);
    this.render();
    document.dispatchEvent(new Event('calendar-type-changed'));
  },

  dateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  },

  keyFor(date) {
    return this.dateKey(date.getFullYear(), date.getMonth(), date.getDate());
  },

  calendarParts(date, type = this.settings.type) {
    if (type === 'gregorian') return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
    try {
      const parts = new Intl.DateTimeFormat(`en-US-u-ca-${type}`, { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date);
      const pick = type => {
        const part = parts.find(item => item.type === type);
        return part ? parseInt(part.value, 10) : null;
      };
      const year = pick('year');
      const month = pick('month');
      const day = pick('day');
      if (!year || !month || !day) return null;
      return { year, month, day };
    } catch {
      return null;
    }
  },

  monthInfo(date, type = this.settings.type) {
    if (type === 'gregorian') {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      return { year: date.getFullYear(), month: date.getMonth() + 1, day: 1, monthStart, daysInMonth: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(), monthLabel: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
    }
    const parts = this.calendarParts(date, type);
    if (!parts) return null;
    const monthStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (parts.day - 1));
    let daysInMonth = 31;
    for (let offset = 1; offset <= 35; offset++) {
      const probe = new Date(monthStart);
      probe.setDate(monthStart.getDate() + offset);
      const probeParts = this.calendarParts(probe, type);
      if (!probeParts || probeParts.month !== parts.month || probeParts.year !== parts.year) {
        daysInMonth = offset;
        break;
      }
    }
    const monthLabel = this.formatCalendarDate(monthStart, { calendar: type, month: 'long', year: 'numeric' });
    return { ...parts, monthStart, daysInMonth, monthLabel };
  },

  formatCalendarDate(date, options) {
    const formatter = new Intl.DateTimeFormat('en-US', options);
    // Intl adds an era (for example, "AP" for Persian dates) in some
    // browsers. It adds no useful context here and makes the compact UI noisy.
    return formatter.formatToParts(date)
      .filter(part => part.type !== 'era')
      .map(part => part.value)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  },

  formatDateKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const calendar = this.settings.type === 'gregorian' ? 'gregory' : this.settings.type;
    return this.formatCalendarDate(date, { calendar, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  },

  shiftMonth(direction) {
    AnalyticsModule.track('calendar_month_changed', { direction: direction < 0 ? 'previous' : 'next' });
    const current = this.viewDate || new Date();
    if (this.settings.type === 'gregorian') {
      this.viewDate = new Date(current.getFullYear(), current.getMonth() + direction, 1);
      this.render(direction);
      return;
    }

    let shifted = new Date(current);
    const steps = Math.abs(direction);
    for (let step = 0; step < steps; step++) {
      const month = this.monthInfo(shifted);
      if (!month) {
        this.settings.type = 'gregorian';
        this.viewDate = new Date(current.getFullYear(), current.getMonth() + direction, 1);
        this.render(direction);
        return;
      }
      shifted = new Date(month.monthStart);
      shifted.setDate(shifted.getDate() + (direction > 0 ? month.daysInMonth : -1));
    }
    this.viewDate = shifted;
    this.render(direction);
  },

  render(monthDirection = 0) {
    const today = new Date();
    const viewDate = this.viewDate || today;
    const todayKey = this.keyFor(today);
    const selected = TodoModule.selectedDate;
    const header = document.getElementById('calendar-month-year');
    const grid = document.getElementById('calendar-grid');
    if (!header || !grid) return;
    grid.replaceChildren();
    grid.dataset.calendarType = this.settings.type;

    const isLocalized = this.settings.type !== 'gregorian';
    const days = isLocalized
      ? ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr']
      : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    days.forEach(day => {
      const label = document.createElement('div');
      label.className = 'day-name';
      label.innerText = day;
      grid.appendChild(label);
    });

    let monthLabel = '';
    const cells = [];
    if (isLocalized) {
      const month = this.monthInfo(viewDate);
      if (!month) {
        this.settings.type = 'gregorian';
        this.render();
        return;
      }
      monthLabel = month.monthLabel;
      const firstDay = (month.monthStart.getDay() + 1) % 7;
      for (let index = 0; index < firstDay; index++) cells.push(null);
      for (let day = 1; day <= month.daysInMonth; day++) {
        const cellDate = new Date(month.monthStart);
        cellDate.setDate(month.monthStart.getDate() + day - 1);
        cells.push({ label: this.calendarParts(cellDate).day, date: cellDate });
      }
    } else {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let index = 0; index < firstDay; index++) cells.push(null);
      for (let day = 1; day <= daysInMonth; day++) cells.push({ label: day, date: new Date(year, month, day) });
    }

    header.innerText = monthLabel;
    cells.forEach(cell => {
      const day = document.createElement('div');
      if (!cell) {
        grid.appendChild(day);
        return;
      }
      day.className = 'day-cell';
      const key = this.keyFor(cell.date);
      if (key === todayKey) day.classList.add('today');
      if (selected === key) day.classList.add('selected');
      if (TodoModule.hasOpenTodos(key)) day.classList.add('has-todos');
      day.innerText = cell.label;
      day.title = 'Show tasks for this day';
      day.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('date-selected', { detail: key }));
        this.render();
      });
      grid.appendChild(day);
    });
    if (monthDirection) {
      grid.dataset.direction = monthDirection > 0 ? 'next' : 'previous';
      grid.classList.remove('is-month-transitioning');
      void grid.offsetWidth;
      grid.classList.add('is-month-transitioning');
      grid.addEventListener('animationend', () => grid.classList.remove('is-month-transitioning'), { once: true });
    }
  }
};
