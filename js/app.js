document.addEventListener('DOMContentLoaded', async () => {
  DialogModule.init();
  await ClockModule.init();
  await TodoModule.init();
  await AuthModule.init();
  await CalendarModule.init();
  ShortcutsModule.init();
  SettingsModule.init();
  SearchModule.init();
  await SyncModule.init();
});
