document.addEventListener('DOMContentLoaded', async () => {
  DialogModule.init();
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
});
