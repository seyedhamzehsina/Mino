const ReleaseNotesModule = {
  releases: {
    '1.2.1': {
      kicker: 'What’s new',
      title: 'A clearer Mino',
      message: 'Version 1.2.1 makes Mino easier to discover with clearer Chrome Web Store and website details. Your workspace, tasks, shortcuts, and settings are unchanged.'
    }
  },

  async init() {
    // New installs see onboarding instead. Existing users see each relevant
    // release note once, on their first new-tab view after an update.
    if (!await StorageManager.get('onboardingCompleted')) return;

    const version = globalThis.chrome?.runtime?.getManifest?.().version || '1.2.1';
    const seenVersion = await StorageManager.get('releaseNotesSeenVersion');
    if (seenVersion === version) return;

    const release = this.releases[version];
    if (release) {
      await DialogModule.notice({
        ...release,
        label: 'Got it'
      });
    }

    await StorageManager.set('releaseNotesSeenVersion', version);
  }
};
