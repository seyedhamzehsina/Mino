const AuthModule = {
  session: null, // { access_token, refresh_token, expires_at, user: { id, email, name } }

  async init() {
    const btn = document.getElementById('auth-toggle');
    if (btn) btn.addEventListener('click', () => {
      if (this.session?.user) {
        if (confirm(`Sign out (${this.session.user.email})?`)) this.signOut();
      } else {
        this.signIn();
      }
    });

    await this.consumeRedirectHash();
    this.session = await StorageManager.get('authSession') || null;
    if (this.session && this.session.access_token) {
      const fresh = await this.ensureFreshToken();
      if (!fresh) {
        this.session = null;
        await StorageManager.set('authSession', null);
      } else {
        if (!this.session.user) await this.fetchUser();
        if (!this.session.user) {
          this.session = null;
          await StorageManager.set('authSession', null);
        } else {
          await StorageManager.set('authSession', this.session);
        }
      }
    }
    this.render();
  },

  // Fallback for a regular browser page. Chrome extensions use chrome.identity below.
  async consumeRedirectHash() {
    if (!location.hash) return;
    const handled = await this.consumeOAuthParams(new URLSearchParams(location.hash.slice(1)));
    if (handled) history.replaceState(null, '', location.pathname + location.search);
  },

  async consumeOAuthParams(params) {
    const oauthError = params.get('error_description') || params.get('error');
    if (oauthError) {
      console.error('Supabase sign-in failed:', oauthError);
      alert(`Sign-in failed: ${oauthError}`);
      return true;
    }
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token && !refresh_token) return false;
    const expires_in = parseInt(params.get('expires_in') || '3600', 10);
    if (!access_token || !refresh_token) {
      console.error('Supabase sign-in failed: incomplete session returned.');
      alert('Sign-in failed: Supabase returned an incomplete session.');
      return true;
    }
    this.session = {
      access_token,
      refresh_token,
      expires_at: Date.now() + (expires_in - 60) * 1000,
      user: null
    };
    await this.fetchUser();
    await StorageManager.set('authSession', this.session);
    this.render();
    return true;
  },

  authHeaders() {
    return {
      apikey: SyncConfig.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${this.session ? this.session.access_token : ''}`
    };
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
    if (!this.session || !this.session.refresh_token) return false;
    if (this.session.expires_at && Date.now() < this.session.expires_at) return true;
    try {
      const res = await fetch(`${SyncConfig.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SyncConfig.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.session.refresh_token })
      });
      if (!res.ok) return false;
      const j = await res.json();
      this.session.access_token = j.access_token;
      this.session.refresh_token = j.refresh_token;
      this.session.expires_at = Date.now() + ((j.expires_in || 3600) - 60) * 1000;
      return true;
    } catch {
      return false;
    }
  },

  async signIn() {
    if (!SyncConfig.enabled) {
      alert('Sync is not configured yet (see js/config.js).');
      return;
    }
    if (!chrome.identity?.launchWebAuthFlow) {
      alert('Sign-in requires the Chrome identity API. Reload the extension and try again.');
      return;
    }

    const redirect = chrome.identity.getRedirectURL('supabase-auth');
    const authorizeUrl = new URL(`${SyncConfig.SUPABASE_URL}/auth/v1/authorize`);
    authorizeUrl.searchParams.set('provider', 'google');
    authorizeUrl.searchParams.set('redirect_to', redirect);

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
      await this.consumeOAuthParams(new URLSearchParams(callbackUrl.hash.slice(1)));
    } catch (error) {
      console.error('Supabase sign-in failed:', error);
      alert(`Sign-in failed: ${error.message || 'Please try again.'}`);
    }
  },

  async signOut() {
    if (this.session) {
      try {
        await fetch(`${SyncConfig.SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: this.authHeaders() });
      } catch {}
    }
    this.session = null;
    await StorageManager.set('authSession', null);
    this.render();
  },

  render() {
    const btn = document.getElementById('auth-toggle');
    if (!btn) return;
    if (!SyncConfig.enabled) {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    if (this.session && this.session.user) {
      const initial = (this.session.user.name || this.session.user.email || '?').trim().charAt(0).toUpperCase();
      btn.textContent = initial;
      btn.title = `${this.session.user.email} — click to sign out`;
      btn.classList.add('signed-in');
    } else {
      btn.textContent = 'Sign in';
      btn.title = 'Sign in with Google';
      btn.classList.remove('signed-in');
    }
  }
};
