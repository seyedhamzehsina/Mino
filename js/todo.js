const TodoModule = {
  todosByDate: {},
  selectedDate: null,
  reportWeekOffset: 0,
  reportTransitioning: false,
  async init() {
    // migrate legacy single-day list
    const legacy = await StorageManager.get('todos');
    this.todosByDate = await StorageManager.get('todosByDate') || {};
    if (Array.isArray(legacy) && legacy.length) {
      const key = this.todayKey();
      this.todosByDate[key] = [...(this.todosByDate[key] || []), ...legacy];
      await StorageManager.set('todosByDate', this.todosByDate);
      await StorageManager.set('todos', null);
    }
    this.selectedDate = this.todayKey();
    // Migrate ids + timestamps so todos are sync-ready. We intentionally do
    // not infer created_at for existing tasks: it would make time-to-complete
    // reports look precise when that historical information does not exist.
    let migrated = false;
    Object.values(this.todosByDate).forEach(todos => {
      (todos || []).forEach(t => {
        if (typeof t.id !== 'string' || !/^[0-9a-f-]{36}$/.test(t.id)) { t.id = crypto.randomUUID(); migrated = true; }
        if (typeof t.updated_at !== 'number') { t.updated_at = Date.now(); migrated = true; }
      });
    });
    if (migrated) await this.save();
    this.render();
    document.getElementById('todo-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addTodo();
    });
    document.getElementById('todo-clear').addEventListener('click', () => this.clearAll());
    document.getElementById('todo-prev-day').addEventListener('click', () => this.shiftDay(-1));
    document.getElementById('todo-next-day').addEventListener('click', () => this.shiftDay(1));
    document.getElementById('todo-next-open').addEventListener('click', () => this.goToNextOpenDay());
    document.getElementById('weekly-report-toggle').addEventListener('click', () => this.showWeeklyReport());
    const weeklyReportDialog = document.getElementById('weekly-report-dialog');
    document.getElementById('weekly-report-close').addEventListener('click', () => weeklyReportDialog.close());
    document.getElementById('weekly-report-prev').addEventListener('click', () => this.navigateWeeklyReport(-1));
    document.getElementById('weekly-report-next').addEventListener('click', () => this.navigateWeeklyReport(1));
    weeklyReportDialog.addEventListener('click', (event) => {
      if (event.target === weeklyReportDialog) weeklyReportDialog.close();
    });
    document.getElementById('todo-today-btn').addEventListener('click', () => this.selectDate(this.todayKey()));
    document.addEventListener('date-selected', (e) => this.selectDate(e.detail));
    document.addEventListener('day-changed', () => this.updateCollapsedReminder());
    document.getElementById('todo-panel').addEventListener('toggle', () => this.updateCollapsedReminder());
  },
  todayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  },
  shiftDay(delta) {
    const [y, m, d] = this.selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d + delta);
    this.selectDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
  },
  selectDate(key) {
    this.selectedDate = key;
    this.render();
    document.dispatchEvent(new Event('date-changed'));
  },
  get todos() {
    return this.todosByDate[this.selectedDate] || [];
  },
  set todos(value) {
    if (value.length) this.todosByDate[this.selectedDate] = value;
    else delete this.todosByDate[this.selectedDate];
  },
  async save() {
    await StorageManager.set('todosByDate', this.todosByDate);
  },
  async addTodo() {
    const input = document.getElementById('todo-input');
    const text = input.value.trim();
    if (!text) return;
    const now = Date.now();
    this.todos = [...this.todos, { id: crypto.randomUUID(), text, done: false, created_at: now, updated_at: now, dirty: true }];
    input.value = '';
    await this.save();
    this.render();
    this.notifyCalendar();
    const list = document.getElementById('todo-list');
    list.scrollTop = list.scrollHeight;
  },
  async toggleTodo(id) {
    const now = Date.now();
    this.todos = this.todos.map(t => {
      if (t.id !== id) return t;
      const done = !t.done;
      const next = { ...t, done, updated_at: now, dirty: true };
      if (done) next.completed_at = now;
      else delete next.completed_at;
      return next;
    });
    await this.save();
    this.render();
    this.notifyCalendar();
  },
  async deleteTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;
    this.todos = this.todos.filter(t => t.id !== id);
    await this.save();
    this.render();
    if (typeof SyncModule !== 'undefined') await SyncModule.queueDelete(todo, this.selectedDate);
    this.notifyCalendar();
  },
  async clearAll() {
    if (!this.todos.length) return;
    const confirmed = await DialogModule.confirm({
      title: 'Clear this day?',
      message: `${this.todos.length} task${this.todos.length === 1 ? '' : 's'} will be removed. This cannot be undone.`,
      confirmLabel: 'Clear all',
      destructive: true,
      kicker: 'Todo list'
    });
    if (!confirmed) return;
    const removed = this.todos;
    this.todos = [];
    await this.save();
    this.render();
    if (typeof SyncModule !== 'undefined') {
      await Promise.all(removed.map(todo => SyncModule.queueDelete(todo, this.selectedDate)));
    }
    this.notifyCalendar();
  },
  hasOpenTodos(key) {
    const todos = this.todosByDate[key];
    return Array.isArray(todos) && todos.some(t => !t.done);
  },
  openTodoDates() {
    return Object.keys(this.todosByDate)
      .filter(key => this.hasOpenTodos(key))
      .sort();
  },
  goToNextOpenDay() {
    const dates = this.openTodoDates();
    if (!dates.length) return;
    const next = dates.find(key => key > this.selectedDate) || dates[0];
    this.selectDate(next);
  },
  weekRange(offset = 0, now = new Date()) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset + offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  },
  formatDuration(milliseconds) {
    const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days) return `${days}d ${hours}h`;
    if (hours) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  },
  weekMetrics(offset = 0) {
    const { start, end } = this.weekRange(offset);
    const startAt = start.getTime();
    const endAt = end.getTime();
    const tasks = Object.values(this.todosByDate).flat();
    const created = tasks.filter(task => Number.isFinite(task.created_at) && task.created_at >= startAt && task.created_at < endAt);
    const completed = tasks.filter(task => Number.isFinite(task.completed_at) && task.completed_at >= startAt && task.completed_at < endAt);
    const trackedDurations = completed
      .filter(task => Number.isFinite(task.created_at) && task.completed_at >= task.created_at)
      .map(task => task.completed_at - task.created_at);
    const daily = Array(7).fill(0);
    completed.forEach(task => {
      const completedDate = new Date(task.completed_at);
      const completedMidnight = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate()).getTime();
      const index = Math.round((completedMidnight - startAt) / 86400000);
      if (index >= 0 && index < 7) daily[index] += 1;
    });
    return {
      start,
      end,
      created: created.length,
      completed: completed.length,
      daily,
      activeDays: daily.filter(count => count > 0).length,
      averageDuration: trackedDurations.length ? trackedDurations.reduce((sum, duration) => sum + duration, 0) / trackedDurations.length : null,
      trackedCompletions: trackedDurations.length
    };
  },
  comparisonLabel(current, previous) {
    if (!previous) return current ? 'First tracked week' : 'No completions yet';
    const difference = current - previous;
    if (!difference) return 'Same as last week';
    return `${difference > 0 ? '+' : ''}${difference} vs last week`;
  },
  timeComparisonLabel(current, previous) {
    if (!current || !previous) return 'No comparison yet';
    const difference = current - previous;
    if (Math.abs(difference) < 60000) return 'Same pace as last week';
    return `${this.formatDuration(Math.abs(difference))} ${difference < 0 ? 'faster' : 'longer'} vs last week`;
  },
  renderWeeklyBars(current, previous) {
    const container = document.getElementById('weekly-report-bars');
    const peak = Math.max(...current.daily, ...previous.daily, 1);
    const today = this.todayKey();
    container.replaceChildren();
    current.daily.forEach((count, index) => {
      const date = new Date(current.start);
      date.setDate(date.getDate() + index);
      const bar = document.createElement('div');
      bar.className = 'weekly-report-bar';
      bar.style.setProperty('--bar-index', String(index));
      if (this.keyForDate(date) === today) bar.classList.add('is-today');
      bar.setAttribute('aria-label', `${date.toLocaleDateString('en-US', { weekday: 'long' })}: ${count} completed, compared with ${previous.daily[index]} last week`);
      const stack = document.createElement('div');
      stack.className = 'weekly-report-bar-stack';
      const previousBar = document.createElement('span');
      previousBar.className = 'weekly-report-bar-previous';
      previousBar.style.height = `${(previous.daily[index] / peak) * 100}%`;
      const currentBar = document.createElement('span');
      currentBar.className = 'weekly-report-bar-current';
      currentBar.style.height = count ? `${Math.max(8, (count / peak) * 100)}%` : '0';
      const label = document.createElement('span');
      label.className = 'weekly-report-bar-label';
      label.textContent = date.toLocaleDateString('en-US', { weekday: 'narrow' });
      stack.append(previousBar, currentBar);
      bar.append(stack, label);
      container.appendChild(bar);
    });
  },
  keyForDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },
  renderWeeklyReport() {
    const current = this.weekMetrics(this.reportWeekOffset);
    const previous = this.weekMetrics(this.reportWeekOffset - 1);
    const recentWeeks = [-1, -2, -3, -4].map(offset => this.weekMetrics(this.reportWeekOffset + offset));
    const weeksWithData = recentWeeks.filter(week => week.completed > 0);
    const baseline = weeksWithData.length
      ? weeksWithData.reduce((sum, week) => sum + week.completed, 0) / weeksWithData.length
      : null;
    const range = current.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const rangeEnd = new Date(current.end.getTime() - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('weekly-report-range').textContent = `${range} – ${rangeEnd}`;
    document.getElementById('weekly-report-headline').textContent = `${current.completed} completed`;
    document.getElementById('weekly-report-comparison').textContent = this.comparisonLabel(current.completed, previous.completed);
    document.getElementById('weekly-report-active-days').textContent = String(current.activeDays);
    document.getElementById('weekly-report-added').textContent = String(current.created);
    document.getElementById('weekly-report-average').textContent = current.averageDuration ? this.formatDuration(current.averageDuration) : '—';
    document.getElementById('weekly-report-time-change').textContent = this.timeComparisonLabel(current.averageDuration, previous.averageDuration);
    document.getElementById('weekly-report-baseline').textContent = baseline === null ? '4-week average —' : `4-week average ${baseline.toFixed(1)}`;
    document.getElementById('weekly-report-prev').disabled = false;
    document.getElementById('weekly-report-next').disabled = this.reportWeekOffset >= 0;
    this.renderWeeklyBars(current, previous);
    const hint = document.getElementById('weekly-report-hint');
    hint.hidden = current.trackedCompletions > 0 || current.completed === 0;
    hint.textContent = 'Completion time starts tracking with new tasks.';
  },
  navigateWeeklyReport(direction) {
    if (this.reportTransitioning) return;
    this.reportWeekOffset = Math.min(0, this.reportWeekOffset + direction);
    this.renderWeeklyReport();
    const content = document.getElementById('weekly-report-content');
    this.reportTransitioning = true;
    content.dataset.direction = direction < 0 ? 'previous' : 'next';
    content.classList.remove('is-updating');
    void content.offsetWidth;
    content.classList.add('is-updating');
    const finishTransition = (event) => {
      if (event.target !== content) return;
      content.classList.remove('is-updating');
      this.reportTransitioning = false;
      content.removeEventListener('animationend', finishTransition);
    };
    content.addEventListener('animationend', finishTransition);
  },
  showWeeklyReport() {
    this.reportWeekOffset = 0;
    this.renderWeeklyReport();
    const dialog = document.getElementById('weekly-report-dialog');
    if (!dialog.open) dialog.showModal();
  },
  updateOpenDayControl() {
    const button = document.getElementById('todo-next-open');
    if (!button) return;
    const dates = this.openTodoDates();
    button.disabled = dates.length === 0;
    const description = dates.length
      ? `Go to the next of ${dates.length} day${dates.length === 1 ? '' : 's'} with open tasks`
      : 'No days with open tasks';
    button.title = description;
    button.setAttribute('aria-label', description);
  },
  notifyCalendar() {
    document.dispatchEvent(new Event('todos-changed'));
  },
  async renameTodo(id, text) {
    text = text.trim();
    if (!text) return;
    this.todos = this.todos.map(t => t.id === id ? { ...t, text, updated_at: Date.now(), dirty: true } : t);
    await this.save();
    this.render();
    this.notifyCalendar();
  },
  startEdit(li, todo) {
    if (li.querySelector('.todo-edit')) return;
    const span = li.querySelector('.todo-text');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-edit';
    input.value = todo.text;
    input.maxLength = 200;
    li.replaceChild(input, span);
    input.focus();
    input.select();
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      if (save) this.renameTodo(todo.id, input.value);
      else this.render();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
  },
  dateLabel(key) {
    const today = this.todayKey();
    if (key === today) return 'Today';
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (key === `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  },
  render() {
    const label = document.getElementById('todo-date-label');
    label.textContent = this.dateLabel(this.selectedDate);
    const list = document.getElementById('todo-list');
    list.innerHTML = '';
    this.todos.forEach(todo => {
      const li = document.createElement('li');
      li.className = 'todo-item';
      if (this.isRtlText(todo.text)) li.classList.add('rtl');
      if (todo.done) li.classList.add('done');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = !!todo.done;
      checkbox.addEventListener('change', () => this.toggleTodo(todo.id));
      const span = document.createElement('span');
      span.className = 'todo-text';
      span.dir = 'auto';
      span.textContent = todo.text;
      span.title = 'Double-click to edit';
      span.addEventListener('dblclick', () => this.startEdit(li, todo));
      const remove = document.createElement('button');
      remove.className = 'todo-remove';
      remove.title = 'Delete';
      remove.textContent = '×';
      remove.addEventListener('click', () => this.deleteTodo(todo.id));
      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(remove);
      list.appendChild(li);
    });
    if (!this.todos.length) {
      const empty = document.createElement('li');
      empty.className = 'todo-empty';
      empty.textContent = 'No tasks for this day yet.';
      list.appendChild(empty);
    }
    this.updateCollapsedReminder();
    this.updateOpenDayControl();
  },
  updateCollapsedReminder() {
    const reminder = document.getElementById('todo-reminder');
    const count = document.getElementById('todo-reminder-count');
    if (!reminder) return;
    const remaining = Object.values(this.todosByDate)
      .reduce((total, todos) => total + (todos || []).filter(todo => !todo.done).length, 0);
    reminder.hidden = remaining === 0;
    reminder.title = `${remaining} task${remaining === 1 ? '' : 's'} still open`;
    reminder.setAttribute('aria-label', reminder.title);
    if (count) count.textContent = String(remaining);
  },
  isRtlText(text) {
    return /[\u0590-\u08ff]/.test(text);
  }
};
