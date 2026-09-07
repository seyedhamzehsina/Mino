const SettingsModule = {
  settings: { theme: 'light', accent: '#e07a5f', background: { type: 'gradient', value: 'sunset' } },
  gradients: {
    sunset: {
      light: 'linear-gradient(135deg, #faf9f7 0%, #fdebd9 55%, #f6d5c3 100%)',
      dark: 'linear-gradient(135deg, #121212 0%, #2b211c 60%, #3e2a22 100%)'
    },
    ocean: {
      light: 'linear-gradient(135deg, #f0f6fa 0%, #d3e5f2 60%, #bcd9ec 100%)',
      dark: 'linear-gradient(135deg, #121212 0%, #1c2733 60%, #24384a 100%)'
    },
    forest: {
      light: 'linear-gradient(135deg, #f4f8f4 0%, #dcead9 60%, #c2dcc0 100%)',
      dark: 'linear-gradient(135deg, #121212 0%, #1d2a1d 60%, #263a26 100%)'
    },
    lavender: {
      light: 'linear-gradient(135deg, #f8f6fb 0%, #e6dff2 60%, #d4c8ea 100%)',
      dark: 'linear-gradient(135deg, #121212 0%, #241f30 60%, #322a45 100%)'
    },
    slate: {
      light: 'linear-gradient(135deg, #ececea 0%, #d8dce2 60%, #c6ccd6 100%)',
      dark: 'linear-gradient(135deg, #121212 0%, #23282e 60%, #2b3440 100%)'
    },
    violet: {
      light: 'linear-gradient(135deg, #efeef2 0%, #dcd6e4 60%, #cabfd9 100%)',
      dark: 'linear-gradient(135deg, #121212 0%, #251f30 60%, #33294a 100%)'
    }
  },
  async init() {
    const saved = await StorageManager.get('appearanceSettings');
    if (saved) {
      if (saved.background && saved.background.value === 'darkSlate') saved.background.value = 'slate';
      if (saved.background && saved.background.value === 'darkViolet') saved.background.value = 'violet';
      this.settings = { ...this.settings, ...saved, background: { ...this.settings.background, ...(saved.background || {}) } };
    }
    this.apply();
    this.buildPanel();
    document.getElementById('settings-toggle').addEventListener('click', () => {
      const panel = document.getElementById('settings-panel');
      panel.hidden = !panel.hidden;
    });
    document.getElementById('settings-close').addEventListener('click', () => {
      document.getElementById('settings-panel').hidden = true;
    });
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('settings-panel');
      if (!panel.hidden && !panel.contains(e.target) && !document.getElementById('settings-toggle').contains(e.target)) {
        panel.hidden = true;
      }
    });
  },
  async save() {
    await StorageManager.set('appearanceSettings', this.settings);
  },
  apply() {
    document.body.classList.toggle('dark', this.settings.theme === 'dark');
    document.documentElement.style.setProperty('--accent', this.settings.accent);
    const isDark = this.settings.theme === 'dark';
    const bg = this.settings.background;
    if (bg.type === 'gradient' && this.gradients[bg.value]) {
      document.body.style.background = this.gradients[bg.value][isDark ? 'dark' : 'light'];
      document.body.style.backgroundAttachment = 'fixed';
    } else if (bg.type === 'image' && bg.value) {
      document.body.style.background = `url("${bg.value}") center / cover no-repeat fixed`;
    } else {
      document.body.style.background = '';
    }
  },
  buildPanel() {
    document.getElementById('setting-theme').value = this.settings.theme;
    document.getElementById('setting-theme').addEventListener('change', (e) => {
      this.settings.theme = e.target.value;
      this.save();
      this.apply();
      this.refreshGradientSwatches();
    });

    document.getElementById('setting-clock24').checked = ClockModule.settings.clock24;
    document.getElementById('setting-clock24').addEventListener('change', (e) => {
      ClockModule.updateSettings({ clock24: e.target.checked });
    });

    document.getElementById('setting-seconds').checked = ClockModule.settings.showSeconds;
    document.getElementById('setting-seconds').addEventListener('change', (e) => {
      ClockModule.updateSettings({ showSeconds: e.target.checked });
    });

    document.getElementById('setting-name').value = ClockModule.settings.name;
    document.getElementById('setting-name').addEventListener('input', (e) => {
      ClockModule.updateSettings({ name: e.target.value.trim() });
    });

    const calendarSelect = document.getElementById('setting-calendar');
    calendarSelect.value = CalendarModule.settings.type;
    calendarSelect.addEventListener('change', (e) => {
      CalendarModule.setType(e.target.value);
    });

    const accentContainer = document.getElementById('accent-options');
    const colors = ['#e07a5f', '#3d8bfd', '#2a9d8f', '#9b5de5', '#e76f51', '#f4a261'];
    colors.forEach(color => {
      const btn = document.createElement('button');
      btn.className = 'color-option';
      btn.style.background = color;
      btn.title = color;
      if (color === this.settings.accent) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        this.settings.accent = color;
        this.save();
        this.apply();
        accentContainer.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      accentContainer.appendChild(btn);
    });

    const gradientContainer = document.getElementById('gradient-options');
    const labels = {
      sunset: 'Sunset', ocean: 'Ocean', forest: 'Forest',
      lavender: 'Lavender', slate: 'Slate', violet: 'Violet'
    };
    const isDark = this.settings.theme === 'dark';
    Object.keys(this.gradients).forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'gradient-option';
      if (this.settings.background.type === 'gradient' && this.settings.background.value === key) {
        btn.classList.add('selected');
      }
      btn.title = labels[key];
      btn.style.background = this.gradients[key][isDark ? 'dark' : 'light'];
      btn.dataset.gradient = key;
      btn.addEventListener('click', () => {
        this.settings.background = { type: 'gradient', value: key };
        this.save();
        this.apply();
        this.syncBackgroundSelection();
        document.getElementById('setting-bg-url').value = '';
      });
      gradientContainer.appendChild(btn);
    });

    const urlInput = document.getElementById('setting-bg-url');
    if (this.settings.background.type === 'image') urlInput.value = this.settings.background.value;
    urlInput.addEventListener('change', () => {
      const url = urlInput.value.trim();
      if (!url) {
        this.settings.background = { type: 'gradient', value: 'sunset' };
      } else {
        this.settings.background = { type: 'image', value: url };
      }
      this.save();
      this.apply();
      this.syncBackgroundSelection();
    });
  },
  refreshGradientSwatches() {
    const isDark = this.settings.theme === 'dark';
    document.querySelectorAll('.gradient-option').forEach(btn => {
      btn.style.background = this.gradients[btn.dataset.gradient][isDark ? 'dark' : 'light'];
    });
  },
  syncBackgroundSelection() {
    document.querySelectorAll('.gradient-option').forEach(btn => {
      btn.classList.toggle(
        'selected',
        this.settings.background.type === 'gradient' &&
        btn.dataset.gradient === this.settings.background.value
      );
    });
  }
};
