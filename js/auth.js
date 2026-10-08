const AuthModule = {
  session: null, // { access_token, refresh_token, expires_at, user: { id, email, name } }
  accounts: [],
  refreshRetryTimer: null,
  isSwitchingAccount: false,

  async init() {
    const btn = document.getElementById('auth-toggle');
    if (btn) btn.addEventListener('click', () => {
      if (!this.session?.user) this.openSignInDialog();
      else this.toggleAccountMenu();
    });
    const signOutBtn = document.getElementById('auth-signout');
    if (signOutBtn) signOutBtn.addEventListener('click', () => this.signOut());
    const addAccountBtn = document.getElementById('auth-add-account');
    if (addAccountBtn) addAccountBtn.addEventListener('click', () => this.addGoogleAccount());
    document.addEventListener('click', (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('.auth-account')) this.closeAccountMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.closeAccountMenu();
    });
    window.addEventListener('online', () => this.retrySessionRefresh());

    await this.consumeRedirectHash();
    this.accounts = (await StorageManager.get('authSessions') || []).filter(account => account?.user?.id && account?.refresh_token);
    this.session = await StorageManager.get('authSession') || null;
    if (this.session && this.session.access_token) {
      const refreshState = await this.ensureFreshToken();
      if (refreshState === 'invalid') {
        const invalidUserId = this.session.user?.id;
        this.session = null;
        await StorageManager.set('authSession', null);
        if (invalidUserId) await this.removeStoredAccount(invalidUserId);
      } else {
        // A network failure must never erase a valid saved session. The user
        // object is normally persisted with the token and lets us render the
        // signed-in state until the connection is available again.
        if (!this.session.user && refreshState === 'ready') await this.fetchUser();
        if (!this.session.user && refreshState === 'ready') {
          this.session = null;
          await StorageManager.set('authSession', null);
        } else {
          await this.persistCurrentSession({ reorder: false });
          if (refreshState === 'retry') this.scheduleSessionRetry();
        }
      }
    }
    this.render();
  },

  // Kept for any existing hash-based Supabase sessions from an earlier release.
  async consumeRedirectHash() {
    if (!location.hash) return;
    const handled = await this.consumeOAuthParams(new URLSearchParams(location.hash.slice(1)));
    if (handled) history.replaceState(null, '', location.pathname + location.search);
  },

  async consumeOAuthParams(params) {
    const oauthError = params.get('error_description') || params.get('error');
    if (oauthError) {
      console.error('Supabase sign-in failed:', oauthError);
      await DialogModule.notice({ title: 'Sign-in failed', message: oauthError, kicker: 'Account' });
      return true;
    }
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token && !refresh_token) return false;
    const expires_in = parseInt(params.get('expires_in') || '3600', 10);
    if (!access_token || !refresh_token) {
      console.error('Supabase sign-in failed: incomplete session returned.');
      await DialogModule.notice({ title: 'Sign-in failed', message: 'The account service returned an incomplete session. Please try again.', kicker: 'Account' });
      return true;
    }
    const accepted = await this.acceptSession({ access_token, refresh_token, expires_in });
    if (!accepted) await DialogModule.notice({ title: 'Sign-in failed', message: 'We could not verify your account. Please try again.', kicker: 'Account' });
    return true;
  },

  async acceptSession(session) {
    if (!session?.access_token || !session?.refresh_token) return false;
    const previousSession = this.session;
    this.session = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: Date.now() + ((session.expires_in || 3600) - 60) * 1000,
      user: null
    };
    await this.fetchUser();
    if (!this.session.user) {
      this.session = previousSession;
      return false;
    }
    await this.persistCurrentSession();
    this.render();
    document.dispatchEvent(new CustomEvent('auth-session-changed', {
      detail: { type: this.isSwitchingAccount ? 'account-switch' : 'sign-in' }
    }));
    return true;
  },

  authHeaders() {
    return {
      apikey: SyncConfig.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${this.session ? this.session.access_token : ''}`
    };
  },

  async persistCurrentSession({ reorder = true } = {}) {
    if (!this.session?.user?.id) return;
    const savedSession = {
      ...this.session,
      user: { ...this.session.user },
      lastUsedAt: Date.now()
    };
    const otherAccounts = this.accounts.filter(account => account?.user?.id !== savedSession.user.id);
    this.accounts = reorder ? [savedSession, ...otherAccounts] : [...otherAccounts, savedSession];
    await StorageManager.set('authSessions', this.accounts);
    await StorageManager.set('authSession', this.session);
  },

  async removeStoredAccount(userId) {
    this.accounts = this.accounts.filter(account => account?.user?.id !== userId);
    await StorageManager.set('authSessions', this.accounts);
  },

  async fetchUser() {
    try {
      const res = await fetch(`${SyncConfig.SUPABASE_URL}/auth/v1/user`, { headers: this.authHeaders() });
      if (!res.ok) return;
      const u = await res.json();
      this.session.user = {
        id: u.id,
        email: u.email,
        name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || (u.email || '').split('@')[0]
      };
    } catch {}
  },

  async ensureFreshToken() {
    if (!this.session || !this.session.refresh_token) return 'invalid';
    if (this.session.expires_at && Date.now() < this.session.expires_at) return 'ready';
    try {
      const res = await fetch(`${SyncConfig.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SyncConfig.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.session.refresh_token })
      });
      // A revoked/expired refresh token is the only case that should sign the
      // user out. Server faults and boot-time connectivity are retried.
      if (!res.ok) {
        if (res.status === 400 || res.status === 401 || res.status === 403) return 'invalid';
        return 'retry';
      }
      const j = await res.json();
      if (!j.access_token || !j.refresh_token) return 'retry';
      this.session.access_token = j.access_token;
      this.session.refresh_token = j.refresh_token;
      this.session.expires_at = Date.now() + ((j.expires_in || 3600) - 60) * 1000;
      return 'ready';
    } catch {
      return 'retry';
    }
  },

  scheduleSessionRetry() {
    clearTimeout(this.refreshRetryTimer);
    this.refreshRetryTimer = setTimeout(() => this.retrySessionRefresh(), 15_000);
  },

  async retrySessionRefresh() {
    if (!this.session?.user) return;
    const refreshState = await this.ensureFreshToken();
    if (refreshState === 'ready') {
      await this.persistCurrentSession({ reorder: false });
      document.dispatchEvent(new CustomEvent('auth-session-changed', { detail: { type: 'refresh' } }));
      return;
    }
    if (refreshState === 'retry') this.scheduleSessionRetry();
    if (refreshState === 'invalid') {
      const invalidUserId = this.session.user?.id;
      this.session = null;
      await StorageManager.set('authSession', null);
      if (invalidUserId) await this.removeStoredAccount(invalidUserId);
      if (typeof SyncModule !== 'undefined') await SyncModule.handleSignedOut();
      this.render();
    }
  },

  async getProfile() {
    if (!this.session?.user || !SyncConfig.enabled) return null;
    const query = new URLSearchParams({ id: `eq.${this.session.user.id}`, select: 'display_name,onboarding_completed' });
    try {
      const res = await fetch(`${SyncConfig.SUPABASE_URL}/rest/v1/profiles?${query}`, { headers: this.authHeaders() });
      if (!res.ok) return null;
      const rows = await res.json();
      return rows[0] || null;
    } catch { return null; }
  },

  async completeOnboarding(displayName) {
    if (!this.session?.user) throw new Error('Sign in is required to finish setup.');
    const name = displayName.trim();
    if (!name) throw new Error('Enter the name you would like Mino to use.');
    const profileUrl = `${SyncConfig.SUPABASE_URL}/rest/v1/profiles`;
    const profile = {
      id: this.session.user.id,
      email: this.session.user.email || '',
      display_name: name,
      onboarding_completed: true
    };
    let res = await fetch(profileUrl, {
      method: 'POST',
      headers: this.authHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(profile)
    });
    // Older projects may not have the onboarding_completed migration yet.
    // Keep onboarding usable and let the safe schema migration add persistence later.
    if (!res.ok) {
      res = await fetch(profileUrl, {
        method: 'POST',
        headers: this.authHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify({ id: profile.id, email: profile.email, display_name: name })
      });
    }
    if (!res.ok) {
      const details = await res.json().catch(() => ({}));
      console.error('Profile save failed:', res.status, details);
      throw new Error('We could not save your profile. Check your Supabase profile policy and try again.');
    }
    this.session.user.name = name;
    await this.persistCurrentSession({ reorder: false });
    this.render();
    ClockModule.updateSettings({ name });
    document.dispatchEvent(new Event('workspace-changed'));
  },

  async signInWithGoogle({ selectAccount = false } = {}) {
    if (!SyncConfig.enabled) throw new Error('Account sync has not been configured yet.');
    if (!globalThis.chrome?.identity?.launchWebAuthFlow) throw new Error('Reload the extension and try again.');
    const redirect = globalThis.chrome.identity.getRedirectURL('supabase-auth');
    const authorizeUrl = new URL(`${SyncConfig.SUPABASE_URL}/auth/v1/authorize`);
    authorizeUrl.searchParams.set('provider', 'google');
    authorizeUrl.searchParams.set('redirect_to', redirect);
    if (selectAccount) authorizeUrl.searchParams.set('prompt', 'select_account');
    try {
      const responseUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({ url: authorizeUrl.toString(), interactive: true }, (url) => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve(url);
        });
      });
      if (!responseUrl) throw new Error('The sign-in window closed before completing authentication.');
      const callbackUrl = new URL(responseUrl);
      const handled = await this.consumeOAuthParams(new URLSearchParams(callbackUrl.hash.slice(1)));
      if (!handled || !this.session?.user) throw new Error('We could not finish signing you in. Please try again.');
    } catch (error) {
      console.error('Supabase Google sign-in failed:', error);
      throw error;
    }
  },

  async openSignInDialog() {
    if (typeof AccountDialogModule !== 'undefined') {
      AccountDialogModule.open();
      return;
    }
    await this.signInWithGoogle();
  },

  async signOut() {
    if (!this.session?.user) return;
    const confirmed = await DialogModule.confirm({
      title: 'Sign out?',
      message: 'Only this Google account will be signed out. Other accounts you added to Mino will stay available on this device.',
      confirmLabel: 'Sign out',
      destructive: true,
      kicker: 'Account'
    });
    if (!confirmed) return;
    await this.clearSession();
  },

  async clearSession() {
    const signedOutUserId = this.session?.user?.id;
    if (this.session) {
      try {
        await fetch(`${SyncConfig.SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: this.authHeaders() });
      } catch {}
    }
    this.session = null;
    await StorageManager.set('authSession', null);
    if (signedOutUserId) await this.removeStoredAccount(signedOutUserId);
    // Ensure account-scoped workspace data is removed before the signed-out
    // interface is shown; async event listeners alone cannot guarantee that.
    if (typeof SyncModule !== 'undefined') await SyncModule.handleSignedOut();
    this.render();
    document.dispatchEvent(new CustomEvent('auth-session-changed', { detail: { type: 'sign-out-handled' } }));
  },

  async addGoogleAccount() {
    this.closeAccountMenu();
    // Keep the active workspace until Google returns a successful additional
    // session. Closing the chooser must leave the current account untouched.
    this.isSwitchingAccount = true;
    try {
      await this.signInWithGoogle({ selectAccount: true });
    } catch (error) {
      console.error('Google account switch failed:', error);
      if (!/closed|cancel|approve/i.test(error.message || '')) {
        await DialogModule.notice({
          title: 'Could not add account',
          message: 'Choose a Google account and try again.',
          kicker: 'Account'
        });
      }
    } finally {
      this.isSwitchingAccount = false;
    }
  },

  async selectAccount(userId) {
    const selectedSession = this.accounts.find(account => account?.user?.id === userId);
    if (!selectedSession || selectedSession.user.id === this.session?.user?.id) {
      this.closeAccountMenu();
      return;
    }
    const previousSession = this.session;
    this.closeAccountMenu();
    this.session = {
      ...selectedSession,
      user: { ...selectedSession.user }
    };
    const refreshState = await this.ensureFreshToken();
    if (refreshState === 'ready' && !this.session.user) await this.fetchUser();
    if (refreshState !== 'ready' || !this.session.user) {
      this.session = previousSession;
      this.render();
      if (refreshState === 'invalid') await this.removeStoredAccount(userId);
      await DialogModule.notice({
        title: 'Could not open account',
        message: 'Sign in to this Google account again and try once more.',
        kicker: 'Account'
      });
      return;
    }
    await this.persistCurrentSession();
    this.render();
    document.dispatchEvent(new CustomEvent('auth-session-changed', { detail: { type: 'account-switch' } }));
  },

  toggleAccountMenu() {
    const menu = document.getElementById('auth-menu');
    const button = document.getElementById('auth-toggle');
    if (!menu || !button || (!this.session?.user && !this.accounts.length)) return;
    if (menu.hidden) this.openAccountMenu();
    else this.closeAccountMenu();
  },

  openAccountMenu() {
    const menu = document.getElementById('auth-menu');
    const button = document.getElementById('auth-toggle');
    if (!menu || !button || (!this.session?.user && !this.accounts.length)) return;
    clearTimeout(this.accountMenuCloseTimer);
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    button.setAttribute('aria-expanded', 'true');
  },

  closeAccountMenu() {
    const menu = document.getElementById('auth-menu');
    const button = document.getElementById('auth-toggle');
    if (!menu || menu.hidden) return;
    menu.classList.remove('is-open');
    button?.setAttribute('aria-expanded', 'false');
    clearTimeout(this.accountMenuCloseTimer);
    this.accountMenuCloseTimer = setTimeout(() => { menu.hidden = true; }, 240);
  },

  render() {
    const btn = document.getElementById('auth-toggle');
    const signOutBtn = document.getElementById('auth-signout');
    const menu = document.getElementById('auth-menu');
    const accounts = document.getElementById('auth-accounts');
    if (!btn || !signOutBtn || !menu || !accounts) return;
    if (!SyncConfig.enabled) {
      btn.hidden = true;
      menu.classList.remove('is-open');
      menu.hidden = true;
      return;
    }
    btn.hidden = false;
    this.renderAccountList(accounts);
    if (this.session && this.session.user) {
      const initial = (this.session.user.name || this.session.user.email || '?').trim().charAt(0).toUpperCase();
      btn.textContent = initial;
      btn.classList.add('signed-in');
      btn.title = `Account menu for ${this.session.user.email}`;
      signOutBtn.title = `Sign out from ${this.session.user.email}`;
      signOutBtn.hidden = false;
    } else {
      btn.textContent = this.accounts.length ? 'Accounts' : 'Sign in';
      btn.title = this.accounts.length ? 'Choose a Mino account' : 'Sign in to your Mino account';
      btn.classList.remove('signed-in');
      signOutBtn.hidden = true;
      if (!this.accounts.length) {
        menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    }
  },

  renderAccountList(container) {
    const activeUserId = this.session?.user?.id;
    const orderedAccounts = [...this.accounts].sort((a, b) => {
      if (a?.user?.id === activeUserId) return -1;
      if (b?.user?.id === activeUserId) return 1;
      return (b?.lastUsedAt || 0) - (a?.lastUsedAt || 0);
    });
    container.replaceChildren();
    orderedAccounts.forEach((account) => {
      const isActive = account.user.id === activeUserId;
      const option = document.createElement('button');
      option.type = 'button';
      option.className = `auth-account-option${isActive ? ' is-active' : ''}`;
      option.setAttribute('role', 'menuitemradio');
      option.setAttribute('aria-checked', String(isActive));
      option.title = isActive ? `${account.user.email} (active)` : `Open ${account.user.email}`;
      const avatar = document.createElement('span');
      avatar.className = 'auth-account-avatar';
      avatar.textContent = (account.user.name || account.user.email || '?').trim().charAt(0).toUpperCase();
      const copy = document.createElement('span');
      copy.className = 'auth-account-copy';
      const name = document.createElement('span');
      name.className = 'auth-account-name';
      name.textContent = account.user.name || account.user.email || 'Google account';
      const email = document.createElement('span');
      email.className = 'auth-account-email';
      email.textContent = account.user.email || '';
      copy.append(name, email);
      option.append(avatar, copy);
      if (isActive) {
        const active = document.createElement('span');
        active.className = 'auth-account-active';
        active.textContent = '✓';
        active.setAttribute('aria-label', 'Active account');
        option.append(active);
      } else {
        option.append(document.createElement('span'));
        option.addEventListener('click', () => this.selectAccount(account.user.id));
      }
      container.append(option);
    });
  }
};
