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

  // After Google OAuth, Supabase returns tokens in the URL hash (#access_token=...).
  async consumeRedirectHash() {
    if (!location.hash.startsWith('#access_token')) return;
    const params = new URLSearchParams(location.hash.slice(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const expires_in = parseInt(params.get('expires_in') || '3600', 10);
    history.replaceState(null, '', location.pathname + location.search);
    if (!access_token || !refresh_token) return;
    this.session = {
      access_token,
      refresh_token,
      expires_at: Date.now() + (expires_in - 60) * 1000,
      user: null
    };
    await this.fetchUser();
    await StorageManager.set('authSession', this.session);
    this.render();
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

  signIn() {
    if (!SyncConfig.enabled) {
      alert('Sync is not configured yet (see js/config.js).');
      return;
    }
    const redirect = encodeURIComponent(location.href);
    location.href = `${SyncConfig.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirect}`;
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
