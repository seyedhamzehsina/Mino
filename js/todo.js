const TodoModule = {
  todosByDate: {},
  selectedDate: null,
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
    // migrate ids to UUIDs + ensure updated_at, so todos are sync-ready
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
    document.getElementById('todo-today-btn').addEventListener('click', () => this.selectDate(this.todayKey()));
    document.addEventListener('date-selected', (e) => this.selectDate(e.detail));
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
    this.todos = [...this.todos, { id: crypto.randomUUID(), text, done: false, updated_at: Date.now(), dirty: true }];
    input.value = '';
    await this.save();
    this.render();
    this.notifyCalendar();
    const list = document.getElementById('todo-list');
    list.scrollTop = list.scrollHeight;
  },
  async toggleTodo(id) {
    this.todos = this.todos.map(t => t.id === id ? { ...t, done: !t.done, updated_at: Date.now(), dirty: true } : t);
    await this.save();
    this.render();
    this.notifyCalendar();
  },
  async deleteTodo(id) {
    this.todos = this.todos.filter(t => t.id !== id);
    await this.save();
    this.render();
    this.notifyCalendar();
    if (typeof SyncModule !== 'undefined') SyncModule.queueDelete(id);
  },
  async clearAll() {
    if (!this.todos.length) return;
    if (!confirm(`Delete all ${this.todos.length} task(s) for this day?`)) return;
    const removed = this.todos.map(t => t.id);
    this.todos = [];
    await this.save();
    this.render();
    this.notifyCalendar();
    if (typeof SyncModule !== 'undefined') removed.forEach(id => SyncModule.queueDelete(id));
  },
  hasOpenTodos(key) {
    const todos = this.todosByDate[key];
    return Array.isArray(todos) && todos.some(t => !t.done);
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
      if (todo.done) li.classList.add('done');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = !!todo.done;
      checkbox.addEventListener('change', () => this.toggleTodo(todo.id));
      const span = document.createElement('span');
      span.className = 'todo-text';
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
  }
};
