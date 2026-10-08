const ReleaseNotesModule = {
  releases: {
    '1.2.2': {
      kicker: 'What’s new',
      title: 'Use more than one Google account',
      message: 'Version 1.2.2 lets you add another Google account from your profile menu. Your added accounts appear in one list, and each account keeps its own Mino workspace and shortcuts.'
    }
  },

  async init() {
    // New installs see onboarding instead. Existing users see each relevant
    // release note once, on their first new-tab view after an update.
    if (!await StorageManager.get('onboardingCompleted')) return;

    const version = globalThis.chrome?.runtime?.getManifest?.().version || '1.2.2';
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
