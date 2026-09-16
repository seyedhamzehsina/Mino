const QueensModule = {
  size: 5,
  dialog: null,
  view: null,
  puzzle: null,
  placed: new Set(),
  startedAt: 0,
  moves: 0,
  timer: null,
  leagueUsername: null,
  leagueGame: false,

  async init() {
    this.dialog = document.getElementById('queens-dialog');
    this.view = document.getElementById('queens-view');
    document.getElementById('queens-launcher')?.addEventListener('click', () => this.open());
    document.getElementById('queens-close')?.addEventListener('click', () => this.close());
    this.dialog?.addEventListener('close', () => this.stopTimer());
    document.addEventListener('auth-session-changed', () => this.refreshLeagueProfile());
    await this.refreshLeagueProfile();
  },

  close() {
    this.stopTimer();
    if (this.dialog?.open) this.dialog.close();
  },

  dateKey() {
    // A UTC day keeps the puzzle and leaderboard identical for every league player.
    return new Date().toISOString().slice(0, 10);
  },

  async open() {
    if (!this.dialog?.open) this.dialog.showModal();
    await this.refreshLeagueProfile();
    this.showWelcome();
  },

  async refreshLeagueProfile() {
    this.leagueUsername = null;
    if (!AuthModule.session?.user || !SyncConfig.enabled) return;
    const query = new URLSearchParams({
      id: `eq.${AuthModule.session.user.id}`,
      select: 'queens_username'
    });
    try {
      const response = await fetch(`${SyncConfig.SUPABASE_URL}/rest/v1/profiles?${query}`, { headers: AuthModule.authHeaders() });
      if (!response.ok) return;
      const [profile] = await response.json();
      this.leagueUsername = profile?.queens_username || null;
    } catch {}
  },

  heading(kicker, title, copy) {
    const fragment = document.createDocumentFragment();
    const label = document.createElement('p');
    label.className = 'queens-kicker';
    label.textContent = kicker;
    const h2 = document.createElement('h2');
    h2.id = 'queens-dialog-title';
    h2.textContent = title;
    const p = document.createElement('p');
    p.className = 'queens-copy';
    p.textContent = copy;
    fragment.append(label, h2, p);
    return fragment;
  },

  button(label, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  },

  showWelcome() {
    this.stopTimer();
    this.view.replaceChildren(this.heading('Queens · daily puzzle', 'A little strategy, right on time.', 'Place one queen in every row, column, and colored region. Queens may not touch — even diagonally.'));
    const actions = document.createElement('div');
    actions.className = 'queens-actions';
    actions.append(this.button('Play today’s puzzle', 'dialog-button dialog-button-primary', () => this.startGame(false)));
    if (AuthModule.session?.user) {
      actions.append(this.button(this.leagueUsername ? 'Enter Queens League' : 'Join Queens League', 'dialog-button dialog-button-secondary', () => this.enterLeague()));
    } else {
      const prompt = document.createElement('p');
      prompt.className = 'queens-league-prompt';
      prompt.textContent = 'Want your time on today’s league table?';
      actions.append(prompt, this.button('Join Queens League', 'dialog-button dialog-button-secondary', () => this.signInForLeague()));
    }
    this.view.append(actions);
  },

  async signInForLeague() {
    this.setBusy('Connecting your Mino account…');
    try {
      await AuthModule.signInWithGoogle();
      await this.refreshLeagueProfile();
      await this.enterLeague();
    } catch (error) {
      this.showWelcome();
      this.showError(error.message || 'We could not sign you in. Please try again.');
    }
  },

  async enterLeague() {
    if (!AuthModule.session?.user) return this.signInForLeague();
    if (!this.leagueUsername) return this.showUsernameForm();
    await this.startGame(true);
  },

  showUsernameForm() {
    this.view.replaceChildren(this.heading('Queens League', 'Choose your league name.', 'This name appears beside your time on the daily Queens table. You can keep it simple — 3 to 16 characters.'));
    const form = document.createElement('form');
    form.className = 'queens-username-form';
    const label = document.createElement('label');
    label.htmlFor = 'queens-username';
    label.textContent = 'League username';
    const input = document.createElement('input');
    input.id = 'queens-username';
    input.maxLength = 16;
    input.autocomplete = 'username';
    input.placeholder = 'e.g. sina';
    const error = document.createElement('p');
    error.className = 'queens-error';
    error.setAttribute('role', 'alert');
    const actions = document.createElement('div');
    actions.className = 'queens-actions queens-actions-inline';
    actions.append(this.button('Back', 'dialog-button dialog-button-secondary', () => this.showWelcome()), this.button('Enter league', 'dialog-button dialog-button-primary', () => form.requestSubmit()));
    form.append(label, input, error, actions);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const username = input.value.trim();
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
        error.textContent = 'Use 3–16 letters, numbers, or underscores.';
        input.focus();
        return;
      }
      const normalized = username.toLowerCase();
      const submit = actions.querySelector('.dialog-button-primary');
      submit.disabled = true;
      error.textContent = '';
      try {
        const response = await fetch(`${SyncConfig.SUPABASE_URL}/rest/v1/profiles`, {
          method: 'POST',
          headers: { ...AuthModule.authHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ id: AuthModule.session.user.id, email: AuthModule.session.user.email || '', queens_username: normalized })
        });
        if (!response.ok) {
          if (response.status === 409) throw new Error('That username is already taken.');
          throw new Error('We could not save your league name. Run the Queens SQL migration first, then try again.');
        }
        this.leagueUsername = normalized;
        await this.startGame(true);
      } catch (saveError) {
        error.textContent = saveError.message || 'We could not save that username.';
        submit.disabled = false;
      }
    });
    this.view.append(form);
    requestAnimationFrame(() => input.focus());
  },

  setBusy(message) {
    this.view.replaceChildren(this.heading('Queens League', 'One moment.', message));
  },

  showError(message) {
    const error = document.createElement('p');
    error.className = 'queens-error';
    error.textContent = message;
    this.view.append(error);
  },

  seeded(seed) {
    let state = 2166136261;
    for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
    return () => {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  },

  neighbors(index) {
    const row = Math.floor(index / this.size);
    const col = index % this.size;
    return [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]
      .filter(([r, c]) => r >= 0 && r < this.size && c >= 0 && c < this.size)
      .map(([r, c]) => r * this.size + c);
  },

  createRegions(solution, random) {
    const regions = Array(this.size * this.size).fill(-1);
    solution.forEach((col, row) => { regions[row * this.size + col] = row; });
    while (regions.includes(-1)) {
      const candidates = [];
      regions.forEach((region, index) => {
        if (region !== -1) return;
        const options = this.neighbors(index).map(neighbor => regions[neighbor]).filter(value => value >= 0);
        if (options.length) candidates.push({ index, options });
      });
      const candidate = candidates[Math.floor(random() * candidates.length)];
      candidate.options.sort(() => random() - .5);
      regions[candidate.index] = candidate.options[0];
    }
    return regions;
  },

  countSolutions(regions, stopAt = 2) {
    let count = 0;
    const search = (row, cols, diagonalsA, diagonalsB, usedRegions) => {
      if (count >= stopAt) return;
      if (row === this.size) { count += 1; return; }
      for (let col = 0; col < this.size; col += 1) {
        const region = regions[row * this.size + col];
        const diagonalA = row - col;
        const diagonalB = row + col;
        if (cols.has(col) || diagonalsA.has(diagonalA) || diagonalsB.has(diagonalB) || usedRegions.has(region)) continue;
        cols.add(col); diagonalsA.add(diagonalA); diagonalsB.add(diagonalB); usedRegions.add(region);
        search(row + 1, cols, diagonalsA, diagonalsB, usedRegions);
        cols.delete(col); diagonalsA.delete(diagonalA); diagonalsB.delete(diagonalB); usedRegions.delete(region);
      }
    };
    search(0, new Set(), new Set(), new Set(), new Set());
    return count;
  },

  createPuzzle() {
    const solutions = [[0, 2, 4, 1, 3], [1, 4, 2, 0, 3], [2, 0, 3, 1, 4], [3, 0, 2, 4, 1], [4, 2, 0, 3, 1]];
    const random = this.seeded(`mino-queens-${this.dateKey()}`);
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const solution = solutions[Math.floor(random() * solutions.length)];
      const regions = this.createRegions(solution, random);
      if (this.countSolutions(regions) === 1) return { regions, solution };
    }
    // A safe, deterministic fallback. The normal seeded path always reaches a unique board first.
    return { regions: [0,0,1,1,1,0,0,1,2,1,3,0,2,2,1,3,3,2,4,4,3,4,4,4,4], solution: [0,2,4,1,3] };
  },

  async startGame(leagueGame) {
    this.leagueGame = leagueGame;
    this.puzzle = this.createPuzzle();
    this.placed = new Set();
    this.moves = 0;
    this.startedAt = Date.now();
    this.renderGame();
    this.startTimer();
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => this.updateTimer(), 1000);
    this.updateTimer();
  },

  stopTimer() {
    clearInterval(this.timer);
    this.timer = null;
  },

  elapsedSeconds() {
    return Math.max(0, Math.floor((Date.now() - this.startedAt) / 1000));
  },

  timeLabel(seconds = this.elapsedSeconds()) {
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  },

  renderGame() {
    this.view.replaceChildren(this.heading(this.leagueGame ? `Queens League · ${this.leagueUsername}` : 'Queens · solo', 'Today’s Queens', 'One queen in every row, column, and colored region. No touching corners.'));
    const meta = document.createElement('div');
    meta.className = 'queens-meta';
    const timer = document.createElement('strong');
    timer.id = 'queens-timer';
    timer.textContent = '00:00';
    const moves = document.createElement('span');
    moves.id = 'queens-moves';
    moves.textContent = '0 moves';
    meta.append(timer, moves);
    const board = document.createElement('div');
    board.className = 'queens-board';
    board.setAttribute('role', 'grid');
    const palette = ['#d9eff0', '#e9ddfb', '#fce0d5', '#dcebd9', '#f8ebbf'];
    this.puzzle.regions.forEach((region, index) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'queens-cell';
      cell.style.setProperty('--queens-region', palette[region]);
      cell.dataset.index = index;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Row ${Math.floor(index / this.size) + 1}, column ${index % this.size + 1}`);
      cell.addEventListener('click', () => this.toggleCell(index));
      board.append(cell);
    });
    const status = document.createElement('p');
    status.id = 'queens-status';
    status.className = 'queens-status';
    const actions = document.createElement('div');
    actions.className = 'queens-actions queens-actions-inline';
    actions.append(this.button('Restart', 'dialog-button dialog-button-secondary', () => this.startGame(this.leagueGame)), this.button(this.leagueGame ? 'League table' : 'Join league', 'dialog-button dialog-button-secondary', () => this.leagueGame ? this.showLeaderboard() : this.enterLeague()));
    this.view.append(meta, board, status, actions);
    this.updateBoard();
  },

  toggleCell(index) {
    if (this.placed.has(index)) this.placed.delete(index);
    else this.placed.add(index);
    this.moves += 1;
    this.updateBoard();
    if (this.isSolved()) this.finishGame();
  },

  conflicts() {
    const rows = new Map(), cols = new Map(), diagA = new Map(), diagB = new Map(), regions = new Map();
    this.placed.forEach(index => {
      const row = Math.floor(index / this.size), col = index % this.size, region = this.puzzle.regions[index];
      [[rows, row], [cols, col], [diagA, row - col], [diagB, row + col], [regions, region]].forEach(([map, key]) => map.set(key, (map.get(key) || 0) + 1));
    });
    return { rows, cols, diagA, diagB, regions };
  },

  updateBoard() {
    const conflictMap = this.conflicts();
    document.getElementById('queens-moves').textContent = `${this.moves} ${this.moves === 1 ? 'move' : 'moves'}`;
    const status = document.getElementById('queens-status');
    let conflicting = false;
    this.view.querySelectorAll('.queens-cell').forEach(cell => {
      const index = Number(cell.dataset.index);
      const row = Math.floor(index / this.size), col = index % this.size, region = this.puzzle.regions[index];
      const queen = this.placed.has(index);
      const conflict = queen && (conflictMap.rows.get(row) > 1 || conflictMap.cols.get(col) > 1 || conflictMap.diagA.get(row - col) > 1 || conflictMap.diagB.get(row + col) > 1 || conflictMap.regions.get(region) > 1);
      cell.classList.toggle('is-queen', queen);
      cell.classList.toggle('is-conflict', conflict);
      if (conflict) conflicting = true;
    });
    status.textContent = conflicting ? 'A queen is touching another queen or shares a row, column, or region.' : (this.placed.size ? `${this.placed.size} of ${this.size} queens placed.` : 'Tap a square to place your first queen.');
  },

  updateTimer() {
    const timer = document.getElementById('queens-timer');
    if (timer) timer.textContent = this.timeLabel();
  },

  isSolved() {
    if (this.placed.size !== this.size) return false;
    const { rows, cols, diagA, diagB, regions } = this.conflicts();
    return [rows, cols, diagA, diagB, regions].every(map => [...map.values()].every(count => count === 1));
  },

  async finishGame() {
    this.stopTimer();
    const seconds = this.elapsedSeconds();
    const status = document.getElementById('queens-status');
    status.textContent = `Solved in ${this.timeLabel(seconds)} with ${this.moves} moves.`;
    status.classList.add('is-success');
    if (!this.leagueGame) return;
    try {
      await this.submitScore(seconds);
      status.textContent = `Solved in ${this.timeLabel(seconds)}. Your league result is saved.`;
    } catch {
      status.textContent = `Solved in ${this.timeLabel(seconds)}. Your result is saved on this device and will retry when you play again.`;
      await StorageManager.set('queensPendingScore', { day_key: this.dateKey(), duration_seconds: seconds, moves: this.moves });
    }
  },

  async submitScore(seconds) {
    const query = new URLSearchParams({
      day_key: `eq.${this.dateKey()}`,
      user_id: `eq.${AuthModule.session.user.id}`,
      select: 'duration_seconds,moves'
    });
    const current = await fetch(`${SyncConfig.SUPABASE_URL}/rest/v1/queens_scores?${query}`, { headers: AuthModule.authHeaders() });
    if (!current.ok) throw new Error('Score lookup failed');
    const [previous] = await current.json();
    if (previous && (previous.duration_seconds < seconds || (previous.duration_seconds === seconds && previous.moves <= this.moves))) {
      await StorageManager.set('queensPendingScore', null);
      return;
    }
    const score = { day_key: this.dateKey(), user_id: AuthModule.session.user.id, username: this.leagueUsername, duration_seconds: seconds, moves: this.moves };
    const response = await fetch(`${SyncConfig.SUPABASE_URL}/rest/v1/queens_scores?on_conflict=day_key,user_id`, {
      method: 'POST',
      headers: { ...AuthModule.authHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(score)
    });
    if (!response.ok) throw new Error('Score save failed');
    await StorageManager.set('queensPendingScore', null);
  },

  async showLeaderboard() {
    this.stopTimer();
    this.view.replaceChildren(this.heading('Queens League', 'Today’s table', 'Fastest completed daily puzzles. Your result is ranked by time, then moves.'));
    const list = document.createElement('ol');
    list.className = 'queens-leaderboard';
    const back = this.button('Back to Queens', 'dialog-button dialog-button-secondary', () => this.showWelcome());
    this.view.append(list, back);
    try {
      const query = new URLSearchParams({ day_key: `eq.${this.dateKey()}`, select: 'username,duration_seconds,moves', order: 'duration_seconds.asc,moves.asc', limit: '10' });
      const response = await fetch(`${SyncConfig.SUPABASE_URL}/rest/v1/queens_scores?${query}`, { headers: AuthModule.authHeaders() });
      if (!response.ok) throw new Error();
      const scores = await response.json();
      if (!scores.length) {
        const empty = document.createElement('p'); empty.className = 'queens-copy'; empty.textContent = 'No completed league games yet. Be the first on today’s table.'; list.replaceWith(empty);
        return;
      }
      scores.forEach((score, index) => {
        const item = document.createElement('li');
        const name = document.createElement('strong'); name.textContent = `${index + 1}. ${score.username}`;
        const time = document.createElement('span'); time.textContent = `${this.timeLabel(score.duration_seconds)} · ${score.moves} moves`;
        item.append(name, time); list.append(item);
      });
    } catch {
      const error = document.createElement('p'); error.className = 'queens-error'; error.textContent = 'The league table is unavailable until the Queens SQL migration is installed.'; list.replaceWith(error);
    }
  }
};
