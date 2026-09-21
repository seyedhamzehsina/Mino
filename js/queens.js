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
  stageCount: 3,
  currentStage: 0,
  stageResults: [],
  dailyResult: null,

  async init() {
    this.dialog = document.getElementById('queens-dialog');
    this.view = document.getElementById('queens-view');
    const launcher = document.getElementById('queens-launcher');
    if (!SyncConfig.GAMES_ENABLED) {
      launcher?.setAttribute('hidden', '');
      return;
    }
    launcher?.addEventListener('click', () => this.open());
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
    await this.refreshDailyResult();
    this.showGamesLibrary();
  },

  showGamesLibrary() {
    this.stopTimer();
    this.view.replaceChildren(this.heading('Games', 'Choose a game.', 'A small collection of thoughtful daily games.'));
    const games = document.createElement('div');
    games.className = 'games-library';
    const queens = this.button('', 'game-library-item', () => this.showWelcome());
    const icon = document.createElement('span');
    icon.className = 'game-library-icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h8v8H4zM12 12h8v8h-8z" opacity=".32"></path><path d="M12 4h8v8h-8zM4 12h8v8H4z" opacity=".72"></path><path d="m8 9 1.25 1.1L10.6 8.25l1.25 1.85 1.2-1.1-.55 3.15H8.55L8 9Zm1.05 5.7h3.9" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
    const copy = document.createElement('span');
    copy.className = 'game-library-copy';
    const title = document.createElement('strong');
    title.textContent = 'Queens';
    const description = document.createElement('small');
    description.textContent = this.dailyResult ? 'Today’s puzzle complete' : 'Daily strategy puzzle';
    copy.append(title, description);
    const arrow = document.createElement('span');
    arrow.className = 'game-library-arrow';
    arrow.textContent = '›';
    queens.append(icon, copy, arrow);
    games.append(queens);
    this.view.append(games);
  },

  async refreshDailyResult() {
    const result = await StorageManager.get('queensDailyResult');
    this.dailyResult = result?.day_key === this.dateKey() ? result : null;
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
    if (this.dailyResult) return this.showDailyComplete();
    this.view.replaceChildren(this.heading('Queens · daily puzzle', 'A little strategy, right on time.', 'One daily run for everyone. Place one queen in every row, column, and colored region. Queens may not touch — even diagonally.'));
    const actions = document.createElement('div');
    actions.className = 'queens-actions';
    actions.append(this.button('Play today’s puzzle', 'dialog-button dialog-button-primary', () => this.startGame()));
    if (this.leagueUsername) {
      actions.append(this.button('View today’s ranking', 'dialog-button dialog-button-secondary', () => this.showLeaderboard()));
    } else if (AuthModule.session?.user) {
      actions.append(this.button('Join league', 'dialog-button dialog-button-secondary', () => this.enterLeague()));
    } else {
      const prompt = document.createElement('p');
      prompt.className = 'queens-league-prompt';
      prompt.textContent = 'Want your time on today’s league table?';
      actions.append(prompt, this.button('Join Queens League', 'dialog-button dialog-button-secondary', () => this.signInForLeague()));
    }
    actions.append(this.button('All games', 'dialog-button dialog-button-secondary', () => this.showGamesLibrary()));
    this.view.append(actions);
  },

  showDailyComplete() {
    const { duration_seconds: seconds, moves } = this.dailyResult;
    this.view.replaceChildren(this.heading('Queens · daily puzzle', 'You’re done for today.', `Your daily run is saved: ${this.timeLabel(seconds)} · ${moves} moves · ${this.performanceScore(seconds, moves)} points. A new puzzle arrives tomorrow.`));
    const actions = document.createElement('div');
    actions.className = 'queens-actions';
    if (this.leagueUsername) {
      actions.append(this.button('View today’s ranking', 'dialog-button dialog-button-primary', () => this.showLeaderboard()));
    } else {
      actions.append(this.button('Join league & publish my result', 'dialog-button dialog-button-primary', () => this.enterLeague()));
    }
    actions.append(this.button('All games', 'dialog-button dialog-button-secondary', () => this.showGamesLibrary()));
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
    this.showWelcome();
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
        if (this.dailyResult) {
          await this.publishDailyResult();
          await this.showLeaderboard();
        } else {
          this.showWelcome();
        }
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

  createPuzzle(stage = this.currentStage) {
    const solutions = [[0, 2, 4, 1, 3], [1, 4, 2, 0, 3], [2, 0, 3, 1, 4], [3, 0, 2, 4, 1], [4, 2, 0, 3, 1]];
    const random = this.seeded(`mino-queens-${this.dateKey()}-stage-${stage + 1}`);
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const solution = solutions[Math.floor(random() * solutions.length)];
      const regions = this.createRegions(solution, random);
      if (this.countSolutions(regions) === 1) return { regions, solution };
    }
    // A safe, deterministic fallback. The normal seeded path always reaches a unique board first.
    return { regions: [0,0,1,1,1,0,0,1,2,1,3,0,2,2,1,3,3,2,4,4,3,4,4,4,4], solution: [0,2,4,1,3] };
  },

  async startGame() {
    this.leagueGame = Boolean(this.leagueUsername);
    this.currentStage = 0;
    this.stageResults = [];
    this.loadStage();
  },

  loadStage() {
    this.stopTimer();
    this.puzzle = this.createPuzzle(this.currentStage);
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

  performanceScore(seconds, moves) {
    return Number(seconds) + (Number(moves) * 10);
  },

  weekStart(offset = 0) {
    const date = new Date();
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - day + 1 + (offset * 7));
    return date.toISOString().slice(0, 10);
  },

  leaderboardOptions() {
    return [
      { id: 'today', label: 'Today', title: 'Today’s ranking', copy: 'One daily puzzle for everyone. Lower performance score wins.', source: 'queens_leaderboard', filter: ['day_key', this.dateKey()], order: 'performance_score.asc,duration_seconds.asc,moves.asc' },
      { id: 'week', label: 'This week', title: 'This week’s league', copy: 'Your best daily result earns League Points. The weekly league resets every Monday.', source: 'queens_weekly_leaderboard', filter: ['week_start', this.weekStart()], order: 'league_points.desc,days_played.desc,total_performance_score.asc' },
      { id: 'last-week', label: 'Last week', title: 'Last week’s league', copy: 'Final standings from the previous Monday-to-Sunday league.', source: 'queens_weekly_leaderboard', filter: ['week_start', this.weekStart(-1)], order: 'league_points.desc,days_played.desc,total_performance_score.asc' },
      { id: 'all-time', label: 'All time', title: 'All-time league', copy: 'Your cumulative League Points from every completed daily puzzle.', source: 'queens_all_time_leaderboard', filter: null, order: 'league_points.desc,days_played.desc,total_performance_score.asc' }
    ];
  },

  renderProgress() {
    const progress = document.createElement('div');
    progress.className = 'queens-progress';
    progress.setAttribute('aria-label', `Stage ${this.currentStage + 1} of ${this.stageCount}`);
    for (let index = 0; index < this.stageCount; index += 1) {
      const step = document.createElement('span');
      step.className = 'queens-progress-step';
      step.classList.toggle('is-complete', index < this.stageResults.length);
      step.classList.toggle('is-current', index === this.currentStage);
      step.textContent = index < this.stageResults.length ? '✓' : String(index + 1);
      progress.append(step);
    }
    return progress;
  },

  renderGame() {
    this.view.replaceChildren(this.heading(this.leagueGame ? `Queens League · ${this.leagueUsername}` : 'Queens · daily run', `Stage ${this.currentStage + 1} of ${this.stageCount}`, 'Place one queen in each row, column, and colored region. Queens may not touch diagonally.'));
    this.view.append(this.renderProgress());
    const meta = document.createElement('div');
    meta.className = 'queens-meta';
    const timer = document.createElement('strong');
    timer.id = 'queens-timer';
    timer.textContent = '00:00';
    const moves = document.createElement('span');
    moves.id = 'queens-moves';
    moves.textContent = '0 moves';
    const xp = document.createElement('span');
    xp.className = 'queens-xp';
    xp.textContent = `${this.stageResults.length * 100} XP`;
    meta.append(timer, moves, xp);
    const board = document.createElement('div');
    board.className = 'queens-board';
    board.setAttribute('role', 'grid');
    const palette = document.body.classList.contains('dark')
      ? ['#245666', '#5b427a', '#77483c', '#315f45', '#756127']
      : ['#d9eff0', '#e9ddfb', '#fce0d5', '#dcebd9', '#f8ebbf'];
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
    actions.append(this.button('Restart run', 'dialog-button dialog-button-secondary', () => this.startGame()), this.button('Exit game', 'dialog-button dialog-button-secondary', () => this.showWelcome()));
    this.view.append(meta, board, status, actions);
    this.updateBoard();
  },

  toggleCell(index) {
    if (this.placed.has(index)) this.placed.delete(index);
    else this.placed.add(index);
    this.moves += 1;
    this.updateBoard();
    if (this.isSolved()) this.completeStage();
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
    status.classList.toggle('is-warning', conflicting);
    status.classList.remove('is-success');
    status.textContent = conflicting
      ? 'Not quite — one or more queens conflict. Adjust the highlighted squares to continue.'
      : (this.placed.size ? `${this.placed.size} / ${this.size} queens placed · ${this.size - this.placed.size} to go.` : 'Stage ready · place your first queen.');
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

  completeStage() {
    this.stopTimer();
    const seconds = this.elapsedSeconds();
    this.stageResults.push({ seconds, moves: this.moves });
    this.showStageResult(seconds);
  },

  showStageResult(seconds) {
    const isFinal = this.currentStage === this.stageCount - 1;
    this.view.replaceChildren(this.heading('Stage cleared', isFinal ? 'Final stage cleared.' : `Stage ${this.currentStage + 1} complete.`, isFinal ? 'You completed today’s Queens run.' : 'Clean solve. Your next board is ready when you are.'));
    this.view.append(this.renderProgress());
    const reward = document.createElement('section');
    reward.className = 'queens-reward';
    const icon = document.createElement('span');
    icon.className = 'queens-reward-icon';
    icon.textContent = isFinal ? '♛' : '✦';
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = `+100 XP · ${this.timeLabel(seconds)}`;
    const detail = document.createElement('span');
    detail.textContent = `${this.moves} moves · ${this.stageResults.length} / ${this.stageCount} stages completed`;
    copy.append(title, detail); reward.append(icon, copy);
    const actions = document.createElement('div');
    actions.className = 'queens-actions';
    actions.append(this.button(isFinal ? 'See my daily result' : 'Next stage', 'dialog-button dialog-button-primary', () => {
      if (isFinal) this.finishRun();
      else { this.currentStage += 1; this.loadStage(); }
    }));
    this.view.append(reward, actions);
  },

  async finishRun() {
    const seconds = this.stageResults.reduce((total, result) => total + result.seconds, 0);
    const moves = this.stageResults.reduce((total, result) => total + result.moves, 0);
    const speedBonus = Math.max(0, 60 - Math.min(60, Math.floor(seconds / 2)));
    this.dailyResult = { day_key: this.dateKey(), duration_seconds: seconds, moves };
    await StorageManager.set('queensDailyResult', this.dailyResult);
    this.view.replaceChildren(this.heading('Daily run complete', '+300 XP earned.', `You cleared all ${this.stageCount} stages in ${this.timeLabel(seconds)} with ${moves} moves.`));
    this.view.append(this.renderProgress());
    const reward = document.createElement('section');
    reward.className = 'queens-reward queens-reward-final';
    const icon = document.createElement('span');
    icon.className = 'queens-reward-icon';
    icon.textContent = '♛';
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = 'Daily crown unlocked';
    const detail = document.createElement('span');
    detail.textContent = `${speedBonus ? `+${speedBonus} speed bonus · ` : ''}Come back tomorrow for a new run.`;
    copy.append(title, detail); reward.append(icon, copy);
    const actions = document.createElement('div');
    actions.className = 'queens-actions';
    actions.append(this.button(this.leagueUsername ? 'View today’s ranking' : 'Join league & publish my result', 'dialog-button dialog-button-primary', () => this.leagueUsername ? this.showLeaderboard() : this.enterLeague()), this.button('Back to Queens', 'dialog-button dialog-button-secondary', () => this.showWelcome()));
    this.view.append(reward, actions);
    if (!this.leagueUsername) return;
    try {
      await this.submitScore(seconds, moves);
    } catch {
      await StorageManager.set('queensPendingScore', { day_key: this.dateKey(), duration_seconds: seconds, moves });
    }
  },

  async publishDailyResult() {
    if (!this.dailyResult || !this.leagueUsername) return;
    try {
      await this.submitScore(this.dailyResult.duration_seconds, this.dailyResult.moves);
    } catch {
      await StorageManager.set('queensPendingScore', this.dailyResult);
    }
  },

  async submitScore(seconds, moves) {
    const query = new URLSearchParams({
      day_key: `eq.${this.dateKey()}`,
      user_id: `eq.${AuthModule.session.user.id}`,
      select: 'duration_seconds,moves'
    });
    const current = await fetch(`${SyncConfig.SUPABASE_URL}/rest/v1/queens_scores?${query}`, { headers: AuthModule.authHeaders() });
    if (!current.ok) throw new Error('Score lookup failed');
    const [previous] = await current.json();
    const newScore = this.performanceScore(seconds, moves);
    const previousScore = previous && this.performanceScore(previous.duration_seconds, previous.moves);
    if (previous && previousScore <= newScore) {
      await StorageManager.set('queensPendingScore', null);
      return;
    }
    const score = { day_key: this.dateKey(), user_id: AuthModule.session.user.id, username: this.leagueUsername, duration_seconds: seconds, moves };
    const response = await fetch(`${SyncConfig.SUPABASE_URL}/rest/v1/queens_scores?on_conflict=day_key,user_id`, {
      method: 'POST',
      headers: { ...AuthModule.authHeaders(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(score)
    });
    if (!response.ok) throw new Error('Score save failed');
    await StorageManager.set('queensPendingScore', null);
  },

  async showLeaderboard(period = 'today') {
    this.stopTimer();
    const config = this.leaderboardOptions().find(option => option.id === period) || this.leaderboardOptions()[0];
    this.view.replaceChildren(this.heading('Queens League', config.title, config.copy));
    const filters = document.createElement('div');
    filters.className = 'queens-league-filters';
    this.leaderboardOptions().forEach(option => {
      const filter = this.button(option.label, 'queens-league-filter', () => this.showLeaderboard(option.id));
      filter.classList.toggle('is-active', option.id === config.id);
      filter.setAttribute('aria-pressed', String(option.id === config.id));
      filters.append(filter);
    });
    const list = document.createElement('ol');
    list.className = 'queens-leaderboard';
    const back = this.button('Back to Queens', 'dialog-button dialog-button-secondary', () => this.showWelcome());
    this.view.append(filters, list, back);
    try {
      const query = new URLSearchParams({ order: config.order, limit: '100' });
      if (config.filter) query.set(config.filter[0], `eq.${config.filter[1]}`);
      const response = await fetch(`${SyncConfig.SUPABASE_URL}/rest/v1/${config.source}?${query}`, { headers: AuthModule.authHeaders() });
      if (!response.ok) throw new Error();
      const scores = await response.json();
      if (!scores.length) {
        const empty = document.createElement('p'); empty.className = 'queens-copy'; empty.textContent = config.id === 'today' ? 'No completed league games yet. Be the first on today’s table.' : 'No league results for this period yet.'; list.replaceWith(empty);
        return;
      }
      scores.forEach((score, index) => {
        const item = document.createElement('li');
        const rank = index + 1;
        item.classList.toggle('is-podium', rank <= 3);
        item.classList.toggle('is-me', score.username === this.leagueUsername);
        const name = document.createElement('strong'); name.textContent = `${rank}. ${score.username}${score.username === this.leagueUsername ? ' (you)' : ''}`;
        const time = document.createElement('span');
        if (config.id === 'today') {
          const scoreValue = Number.isFinite(Number(score.performance_score)) ? score.performance_score : this.performanceScore(score.duration_seconds, score.moves);
          time.textContent = `${scoreValue} pts · ${this.timeLabel(score.duration_seconds)} · ${score.moves} moves`;
        } else {
          time.textContent = `${score.league_points} XP · ${score.days_played} ${Number(score.days_played) === 1 ? 'day' : 'days'}`;
        }
        item.append(name, time); list.append(item);
      });
    } catch {
      const error = document.createElement('p'); error.className = 'queens-error'; error.textContent = 'The league table is unavailable until the Queens SQL migration is installed.'; list.replaceWith(error);
    }
  }
};
