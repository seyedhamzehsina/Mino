const SettingsModule = {
  settings: { theme: 'light', accent: '#e07a5f', glassOpacity: 62, glassBlur: 18, background: { type: 'gradient', value: 'sunset' } },
  contrastRequestId: 0,
  contrastResizeTimer: null,
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
    window.addEventListener('resize', () => {
      clearTimeout(this.contrastResizeTimer);
      this.contrastResizeTimer = setTimeout(() => {
        const bg = this.settings.background;
        if (bg.type === 'image' && bg.value) this.updateImageContrast(bg.value);
      }, 120);
    });
  },
  async save() {
    await StorageManager.set('appearanceSettings', this.settings);
  },
  apply() {
    document.body.classList.toggle('dark', this.settings.theme === 'dark');
    document.documentElement.style.setProperty('--accent', this.settings.accent);
    document.documentElement.style.setProperty('--accent-glow', this.hexToRgba(this.settings.accent, 0.26));
    document.documentElement.style.setProperty('--glass-opacity', String(this.settings.glassOpacity / 100));
    document.documentElement.style.setProperty('--glass-blur', `${this.settings.glassBlur}px`);
    const isDark = this.settings.theme === 'dark';
    const bg = this.settings.background;
    document.body.classList.toggle('has-image-background', bg.type === 'image' && !!bg.value);
    if (bg.type === 'gradient' && this.gradients[bg.value]) {
      document.body.style.background = this.gradients[bg.value][isDark ? 'dark' : 'light'];
      document.body.style.backgroundAttachment = 'fixed';
      this.resetAdaptiveContrast();
    } else if (bg.type === 'image' && bg.value) {
      document.body.style.background = `url("${bg.value}") center / cover no-repeat fixed`;
      this.updateImageContrast(bg.value);
    } else {
      document.body.style.background = '';
      this.resetAdaptiveContrast();
    }
  },
  buildPanel() {
    const themeOptions = document.getElementById('setting-theme');
    themeOptions.querySelectorAll('button').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.theme === this.settings.theme);
      btn.addEventListener('click', () => {
        this.settings.theme = btn.dataset.theme;
        this.save();
        this.apply();
        this.refreshGradientSwatches();
        themeOptions.querySelectorAll('button').forEach(option => option.classList.toggle('selected', option === btn));
      });
    });

    const opacityInput = document.getElementById('setting-glass-opacity');
    opacityInput.value = this.settings.glassOpacity;
    opacityInput.addEventListener('input', (e) => {
      this.settings.glassOpacity = Number(e.target.value);
      this.save();
      this.apply();
    });

    const blurInput = document.getElementById('setting-glass-blur');
    blurInput.value = this.settings.glassBlur;
    blurInput.addEventListener('input', (e) => {
      this.settings.glassBlur = Number(e.target.value);
      this.save();
      this.apply();
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

    const calendarOptions = document.getElementById('setting-calendar');
    calendarOptions.querySelectorAll('button').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.calendar === CalendarModule.settings.type);
      btn.addEventListener('click', () => {
        CalendarModule.setType(btn.dataset.calendar);
        calendarOptions.querySelectorAll('button').forEach(option => option.classList.toggle('selected', option === btn));
      });
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
  },
  updateImageContrast(url) {
    const requestId = ++this.contrastRequestId;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => {
      if (requestId !== this.contrastRequestId) return;
      requestAnimationFrame(() => {
        try {
          this.applyAdaptiveContrast(document.querySelector('.clock-section'), this.sampleLuminance(image, document.querySelector('.clock-section')));
          this.applyAdaptiveContrast(document.querySelector('.slogan'), this.sampleLuminance(image, document.querySelector('.slogan')));
        } catch (error) {
          this.applyContrastFallback();
        }
      });
    };
    image.onerror = () => {
      if (requestId === this.contrastRequestId) this.applyContrastFallback();
    };
    image.src = url;
  },
  sampleLuminance(image, element) {
    if (!element || !image.naturalWidth || !image.naturalHeight) throw new Error('Unable to sample image.');
    const rect = element.getBoundingClientRect();
    const scale = Math.max(window.innerWidth / image.naturalWidth, window.innerHeight / image.naturalHeight);
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;
    const offsetX = (window.innerWidth - renderedWidth) / 2;
    const offsetY = (window.innerHeight - renderedHeight) / 2;
    const sourceX = Math.max(0, (rect.left - offsetX) / scale);
    const sourceY = Math.max(0, (rect.top - offsetY) / scale);
    const sourceWidth = Math.max(1, Math.min(image.naturalWidth - sourceX, rect.width / scale));
    const sourceHeight = Math.max(1, Math.min(image.naturalHeight - sourceY, rect.height / scale));
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 32, 32);
    const pixels = context.getImageData(0, 0, 32, 32).data;
    const luminances = [];
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 128) continue;
      const channels = [pixels[i], pixels[i + 1], pixels[i + 2]].map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
      });
      luminances.push(0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]);
    }
    if (!luminances.length) throw new Error('Image sample is empty.');
    luminances.sort((a, b) => a - b);
    return luminances[Math.floor(luminances.length / 2)];
  },
  applyAdaptiveContrast(element, luminance) {
    const darkContrast = (luminance + 0.05) / 0.05;
    const lightContrast = 1.05 / (luminance + 0.05);
    const useDarkText = darkContrast >= lightContrast;
    element.classList.toggle('adaptive-dark', useDarkText);
    element.classList.toggle('adaptive-light', !useDarkText);
  },
  applyContrastFallback() {
    document.querySelectorAll('.clock-section, .slogan').forEach(element => {
      element.classList.remove('adaptive-dark');
      element.classList.add('adaptive-light');
    });
  },
  resetAdaptiveContrast() {
    this.contrastRequestId += 1;
    document.querySelectorAll('.clock-section, .slogan').forEach(element => {
      element.classList.remove('adaptive-dark', 'adaptive-light');
    });
  },
  hexToRgba(hex, alpha) {
    const value = hex.replace('#', '');
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
};
