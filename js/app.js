const PanelStateModule = {
  storageKey: 'panelState',
  panelIds: ['todo-panel', 'calendar-panel'],

  async init() {
    const saved = await StorageManager.get(this.storageKey) || {};
    this.panelIds.forEach(id => {
      const panel = document.getElementById(id);
      if (panel) panel.open = saved[id] === true;
    });

    this.panelIds.forEach(id => {
      document.getElementById(id)?.addEventListener('toggle', () => this.save());
    });
  },

  save() {
    const state = Object.fromEntries(this.panelIds.map(id => [id, !!document.getElementById(id)?.open]));
    StorageManager.set(this.storageKey, state);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  DialogModule.init();
  await AnalyticsModule.init();
  // Panel state belongs to the device, not an account, so every user keeps
  // their preferred workspace open across new tabs and browser restarts.
  await PanelStateModule.init();
  // These modules only read their own state during startup, so initialize
  // them concurrently instead of making the new-tab view wait on each read.
  await Promise.all([
    ClockModule.init(),
    TodoModule.init(),
    AuthModule.init(),
    CalendarModule.init()
  ]);
  ShortcutsModule.init();
  SettingsModule.init();
  SearchModule.init();
  await SyncModule.init();
  await OnboardingModule.init();
  await ReleaseNotesModule.init();
  await QueensModule.init();
  AnalyticsModule.track('mino_opened');
  AnalyticsModule.promptIfNeeded();
});
