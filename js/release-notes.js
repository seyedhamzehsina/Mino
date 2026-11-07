const ReleaseNotesModule = {
  releases: {
    '1.2.6': {
      kicker: 'A calmer workspace',
      title: 'Your workspace remembers you',
      message: 'Todo and Calendar now stay open exactly as you left them. Calendar days are clearer at a glance, and the refined task navigation makes it easier to move through open work.'
    },
    '1.2.5': {
      kicker: 'Privacy choice',
      title: 'Anonymous analytics, only if you choose',
      message: 'Mino can now measure feature-use counts to guide future improvements. It is off by default, never includes task text, search terms, links, or account data, and can be changed anytime in Settings. Calendar display now supports Gregorian, Hijri, and Persian dates, with your todo day labels following the same choice.'
    },
    '1.2.3': {
      kicker: 'What’s new',
      title: 'More clarity, without more clutter',
      message: 'Browse previous and upcoming months, check a weekly task report, and search with the provider selected in Chrome. Shortcut suggestions stay local and appear only when there is a match.'
    },
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

    const version = globalThis.chrome?.runtime?.getManifest?.().version || '1.2.3';
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
