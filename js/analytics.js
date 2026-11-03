const AnalyticsModule = {
  preference: { decided: false, enabled: false },
  installationId: null,
  allowedEvents: new Set([
    'mino_opened',
    'first_task_created',
    'task_created',
    'task_completed',
    'shortcut_clicked',
    'calendar_month_changed',
    'weekly_report_opened',
    'weekly_report_week_changed'
  ]),

  async init() {
    const saved = await StorageManager.get('analyticsPreference');
    if (saved && typeof saved.enabled === 'boolean') {
      this.preference = { decided: Boolean(saved.decided), enabled: saved.enabled };
    }
    if (this.preference.enabled) await this.ensureInstallationId();
    this.bindControls();
    this.updateControls();
  },

  async ensureInstallationId() {
    if (this.installationId) return this.installationId;
    const stored = await StorageManager.get('analyticsInstallationId');
    this.installationId = typeof stored === 'string' && /^[a-f0-9-]{36}$/i.test(stored)
      ? stored
      : crypto.randomUUID();
    if (this.installationId !== stored) await StorageManager.set('analyticsInstallationId', this.installationId);
    return this.installationId;
  },

  bindControls() {
    document.getElementById('setting-analytics')?.addEventListener('change', event => {
      this.setEnabled(event.target.checked);
    });
    document.getElementById('analytics-consent-allow')?.addEventListener('click', () => this.setEnabled(true));
    document.getElementById('analytics-consent-decline')?.addEventListener('click', () => this.setEnabled(false));
    document.getElementById('analytics-consent-close')?.addEventListener('click', () => this.setEnabled(false));
  },

  async setEnabled(enabled) {
    this.preference = { decided: true, enabled: Boolean(enabled) };
    await StorageManager.set('analyticsPreference', this.preference);
    if (this.preference.enabled) {
      await this.ensureInstallationId();
      this.track('mino_opened');
    }
    this.updateControls();
    const dialog = document.getElementById('analytics-consent-dialog');
    if (dialog?.open) dialog.close();
  },

  updateControls() {
    const checkbox = document.getElementById('setting-analytics');
    if (checkbox) checkbox.checked = this.preference.enabled;
  },

  promptIfNeeded() {
    if (this.preference.decided) return;
    const dialog = document.getElementById('analytics-consent-dialog');
    if (dialog && !dialog.open) dialog.showModal();
  },

  track(name, parameters = {}) {
    if (!this.preference.enabled || !this.allowedEvents.has(name)) return;
    void this.send(name, parameters);
  },

  async send(name, parameters) {
    try {
      const clientId = await this.ensureInstallationId();
      await fetch(`${SyncConfig.SUPABASE_URL}/functions/v1/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SyncConfig.SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ client_id: clientId, event: { name, params: parameters } })
      });
    } catch {
      // Analytics must never affect the new-tab experience or offline use.
    }
  }
};
