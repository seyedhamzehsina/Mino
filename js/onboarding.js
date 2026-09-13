const OnboardingModule = {
  version: 3,
  dialog: null,
  currentStep: 'welcome',
  steps: ['welcome', 'essentials', 'account'],

  async init() {
    this.dialog = document.getElementById('onboarding-dialog');
    if (!this.dialog) return;
    this.bindEvents();
    const complete = await StorageManager.get('onboardingCompleted');
    const version = await StorageManager.get('onboardingVersion');
    const isCurrent = !!complete && version === this.version;
    const profile = await AuthModule.getProfile();
    if (AuthModule.session?.user && profile?.onboarding_completed && isCurrent) {
      if (profile.display_name && profile.display_name !== ClockModule.settings.name) ClockModule.updateSettings({ name: profile.display_name });
      NamePromptModule.maybePrompt();
      return;
    }
    if (isCurrent) {
      if (!await StorageManager.get('firstUseAt')) await StorageManager.set('firstUseAt', Date.now());
      NamePromptModule.maybePrompt();
      return;
    }
    this.open();
  },

  bindEvents() {
    this.dialog.querySelectorAll('.onboarding-next').forEach(button => button.addEventListener('click', () => this.next()));
    document.getElementById('onboarding-google-signin').addEventListener('click', () => this.signInWithGoogle());
    document.getElementById('onboarding-skip').addEventListener('click', () => this.dismiss());
    AccountDialogModule.init();
    NamePromptModule.init();
  },

  open() {
    this.show('welcome');
    if (!this.dialog.open) this.dialog.showModal();
  },

  next() {
    this.show(this.steps[Math.min(this.steps.indexOf(this.currentStep) + 1, this.steps.length - 1)]);
  },

  show(step) {
    this.currentStep = step;
    this.dialog.querySelectorAll('.onboarding-step').forEach(section => { section.hidden = section.dataset.onboardingStep !== step; });
    this.dialog.querySelectorAll('.onboarding-progress span').forEach((item, index) => item.classList.toggle('is-active', index <= this.steps.indexOf(step)));
    this.dialog.querySelectorAll('.onboarding-error').forEach(item => { item.textContent = ''; });
    requestAnimationFrame(() => this.dialog.querySelector(`[data-onboarding-step="${step}"] button`)?.focus());
  },

  async dismiss() {
    await StorageManager.set('onboardingCompleted', true);
    await StorageManager.set('onboardingVersion', this.version);
    await StorageManager.set('firstUseAt', await StorageManager.get('firstUseAt') || Date.now());
    if (this.dialog.open) this.dialog.close('dismissed');
  },

  async signInWithGoogle() {
    const button = document.getElementById('onboarding-google-signin');
    button.disabled = true; button.lastChild.textContent = 'Connecting…';
    try {
      await AuthModule.signInWithGoogle();
      await this.dismiss();
    } catch (error) {
      document.getElementById('onboarding-account-error').textContent = error.message || 'We could not sign you in. Please try again.';
    } finally {
      button.disabled = false; button.lastChild.textContent = 'Continue with Google';
    }
  }
};

const AccountDialogModule = {
  dialog: null,
  init() {
    this.dialog = document.getElementById('account-dialog');
    if (!this.dialog) return;
    document.getElementById('account-google-signin').addEventListener('click', () => this.signIn());
    document.getElementById('account-dialog-skip').addEventListener('click', () => this.close());
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
  },
  open() {
    if (!this.dialog) return;
    document.getElementById('account-dialog-error').textContent = '';
    if (!this.dialog.open) this.dialog.showModal();
    document.getElementById('account-google-signin').focus();
  },
  close() { if (this.dialog?.open) this.dialog.close('cancel'); },
  async signIn() {
    const button = document.getElementById('account-google-signin');
    const errorElement = document.getElementById('account-dialog-error');
    button.disabled = true; button.lastChild.textContent = 'Connecting…'; errorElement.textContent = '';
    try {
      await AuthModule.signInWithGoogle();
      this.close();
    } catch (error) {
      errorElement.textContent = error.message || 'We could not sign you in. Please try again.';
    } finally {
      button.disabled = false; button.lastChild.textContent = 'Continue with Google';
    }
  }
};

const NamePromptModule = {
  dialog: null,
  init() {
    this.dialog = document.getElementById('name-prompt-dialog');
    if (!this.dialog) return;
    document.getElementById('name-prompt-form').addEventListener('submit', event => this.save(event));
    document.getElementById('name-prompt-later').addEventListener('click', () => this.snooze());
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.snooze(); });
  },
  async maybePrompt() {
    if ((ClockModule.settings.name || '').trim()) return;
    const firstUseAt = await StorageManager.get('firstUseAt');
    if (!firstUseAt || Date.now() - firstUseAt < 2 * 60 * 60 * 1000) return;
    const lastPrompt = await StorageManager.get('namePromptLastShown');
    if (lastPrompt && Date.now() - lastPrompt < 7 * 24 * 60 * 60 * 1000) return;
    await StorageManager.set('namePromptLastShown', Date.now());
    if (!this.dialog.open) this.dialog.showModal();
    document.getElementById('name-prompt-input').focus();
  },
  async snooze() { if (this.dialog?.open) this.dialog.close('later'); },
  async save(event) {
    event.preventDefault();
    const input = document.getElementById('name-prompt-input');
    const name = input.value.trim();
    if (!name) { document.getElementById('name-prompt-error').textContent = 'Enter a name or choose Maybe later.'; return; }
    ClockModule.updateSettings({ name });
    if (AuthModule.session?.user) {
      try { await AuthModule.completeOnboarding(name); } catch (error) { console.error('Name sync failed:', error); }
    }
    this.dialog.close('saved');
  }
};
