const StorageManager = {
  async get(key) {
    if (!globalThis.chrome?.storage?.local) {
      const value = localStorage.getItem(`mino:${key}`);
      return value === null ? null : JSON.parse(value);
    }
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => resolve(result[key] || null));
    });
  },
  async set(key, value) {
    if (!globalThis.chrome?.storage?.local) {
      if (value === null) localStorage.removeItem(`mino:${key}`);
      else localStorage.setItem(`mino:${key}`, JSON.stringify(value));
      return;
    }
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  }
};
