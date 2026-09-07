document.addEventListener('DOMContentLoaded', async () => {
  await ClockModule.init();
  await TodoModule.init();
  await AuthModule.init();
  await CalendarModule.init();
  ShortcutsModule.init();
  SettingsModule.init();
  SearchModule.init();
  SyncModule.init();
});
