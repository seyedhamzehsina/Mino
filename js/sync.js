const SyncModule = {
  lastSyncAt: null,
  tombstones: [], // deleted todo snapshots waiting to be sent
  syncing: false,
  syncUserId: null,

  async init() {
    if (!SyncConfig.enabled) return;
    this.lastSyncAt = await StorageManager.get('lastSyncAt') || null;
    this.tombstones = await StorageManager.get('syncTombstones') || [];
    this.syncUserId = await StorageManager.get('syncUserId') || null;
    document.addEventListener('todos-changed', () => this.push());
    document.addEventListener('auth-session-changed', () => this.syncAfterAuthentication());
    if (AuthModule.session) await this.syncAfterAuthentication();
  },

  restHeaders(extra = {}) {
    return {
      apikey: SyncConfig.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${AuthModule.session ? AuthModule.session.access_token : ''}`,
      'Content-Type': 'application/json',
      ...extra
    };
  },

  async queueDelete(todo, dateKey) {
    if (!todo || typeof todo.id !== 'string' || !/^\d{8}-\d{4}-\d{4}-\d{4}-\d{12}$/i.test(todo.id)) return;
    this.tombstones = this.tombstones.filter(item => item.id !== todo.id);
    this.tombstones.push({
      id: todo.id,
      date_key: dateKey,
      text: todo.text || '',
      done: !!todo.done,
      updated_at: new Date().toISOString()
    });
    await StorageManager.set('syncTombstones', this.tombstones);
  },

  async syncAfterAuthentication() {
    const userId = AuthModule.session?.user?.id;
    if (!userId) return;
    if (this.syncUserId && this.syncUserId !== userId) {
      // Local data remains on this device, but pending changes from another
      // account must never be uploaded into the newly signed-in account.
      this.lastSyncAt = null;
      this.tombstones = [];
      Object.values(TodoModule.todosByDate).forEach(todos => {
        (todos || []).forEach(todo => { delete todo.dirty; });
      });
      await TodoModule.save();
      await StorageManager.set('lastSyncAt', null);
      await StorageManager.set('syncTombstones', []);
    }
    this.syncUserId = userId;
    await StorageManager.set('syncUserId', userId);
    await this.pull();
    await this.push();
  },

  // Push locally-changed todos (dirty flag) and deletions (tombstones) to the server.
  async push() {
    if (!SyncConfig.enabled || !AuthModule.session || !AuthModule.session.user || this.syncing) return;
    this.syncing = true;
    try {
      const uid = AuthModule.session.user.id;
      const rows = [];
      const touched = [];
      Object.entries(TodoModule.todosByDate).forEach(([dateKey, todos]) => {
        (todos || []).forEach(t => {
          if (t.dirty) {
            rows.push({
              id: t.id,
              user_id: uid,
              date_key: dateKey,
              text: t.text,
              done: !!t.done,
              deleted: false,
              updated_at: new Date(t.updated_at || Date.now()).toISOString()
            });
            touched.push(t);
          }
        });
      });
      this.tombstones.forEach(tombstone => {
        rows.push({ ...tombstone, user_id: uid, deleted: true });
      });

      if (rows.length) {
        const res = await fetch(`${SyncConfig.SUPABASE_URL}/rest/v1/todos`, {
          method: 'POST',
          headers: this.restHeaders({ Prefer: 'resolution=merge-duplicates' }),
          body: JSON.stringify(rows)
        });
        if (!res.ok) throw new Error(`Todo sync failed (${res.status}).`);
        touched.forEach(t => { delete t.dirty; });
        this.tombstones = [];
        await TodoModule.save();
        await StorageManager.set('syncTombstones', this.tombstones);
      }
      this.lastSyncAt = new Date().toISOString();
      await StorageManager.set('lastSyncAt', this.lastSyncAt);
    } catch (error) {
      console.error('Todo sync failed:', error);
    } finally {
      this.syncing = false;
    }
  },

  // Pull server changes newer than the last sync and merge them into local state.
  async pull() {
    if (!SyncConfig.enabled || !AuthModule.session || !AuthModule.session.user || this.syncing) return;
    this.syncing = true;
    const pullStartedAt = new Date().toISOString();
    try {
      const uid = AuthModule.session.user.id;
      const q = new URLSearchParams({ user_id: `eq.${uid}`, select: '*', order: 'updated_at.asc' });
      if (this.lastSyncAt) q.set('updated_at', `gte.${this.lastSyncAt}`);
      const res = await fetch(`${SyncConfig.SUPABASE_URL}/rest/v1/todos?${q}`, { headers: this.restHeaders() });
      if (!res.ok) return;
      const rows = await res.json();

      let changed = false;
      const byId = new Map();
      Object.values(TodoModule.todosByDate).forEach(todos => (todos || []).forEach(t => byId.set(t.id, t)));

      rows.forEach(row => {
        const local = byId.get(row.id);
        if (row.deleted) {
          if (local) {
            const arr = TodoModule.todosByDate[row.date_key] || [];
            const filtered = arr.filter(t => t.id !== row.id);
            if (filtered.length) TodoModule.todosByDate[row.date_key] = filtered;
            else delete TodoModule.todosByDate[row.date_key];
            changed = true;
          }
          return;
        }
        // Never overwrite a locally-edited (dirty) todo — it will be pushed soon.
        if (local && local.dirty) return;
        if (!local || Date.parse(row.updated_at) > (local.updated_at || 0)) {
          const todo = { id: row.id, text: row.text, done: !!row.done, updated_at: Date.parse(row.updated_at) };
          const arr = TodoModule.todosByDate[row.date_key] = TodoModule.todosByDate[row.date_key] || [];
          const i = local ? arr.findIndex(t => t.id === row.id) : -1;
          if (i >= 0) arr[i] = todo;
          else arr.push(todo);
          changed = true;
        }
      });

      // Keep the query start time, so a server update that happens while this
      // request is in flight is included by the next incremental pull.
      this.lastSyncAt = pullStartedAt;
      await StorageManager.set('lastSyncAt', this.lastSyncAt);
      if (changed) {
        await TodoModule.save();
        TodoModule.render();
        // syncing=true guard prevents this from re-triggering push()
        document.dispatchEvent(new Event('todos-changed'));
      }
    } catch (error) {
      console.error('Todo pull failed:', error);
    } finally {
      this.syncing = false;
    }
  }
};
