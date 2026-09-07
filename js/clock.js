const ClockModule = {
  settings: { clock24: true, showSeconds: false, name: '' },
  timer: null,
  async init() {
    const saved = await StorageManager.get('clockSettings');
    if (saved) this.settings = { ...this.settings, ...saved };
    this.updateTime();
    this.timer = setInterval(() => this.updateTime(), 1000);
  },
  updateSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    StorageManager.set('clockSettings', this.settings);
    this.updateTime();
  },
  updateTime() {
    const now = new Date();
    let hours = now.getHours();
    let suffix = '';
    if (!this.settings.clock24) {
      suffix = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
    }
    const hoursStr = this.settings.clock24 ? String(hours).padStart(2, '0') : String(hours);
    const minutes = String(now.getMinutes()).padStart(2, '0');
    let time = `${hoursStr}:${minutes}`;
    if (this.settings.showSeconds) time += ':' + String(now.getSeconds()).padStart(2, '0');
    time += suffix;
    document.getElementById('time').innerText = time;

    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    document.getElementById('date').innerText = now.toLocaleDateString('en-US', options);

    const hour = now.getHours();
    let greeting = "Good evening.";
    if (hour < 12) greeting = "Good morning.";
    else if (hour < 18) greeting = "Good afternoon.";
    if (this.settings.name) greeting = greeting.replace('.', '') + `, ${this.settings.name}.`;
    document.getElementById('greeting').innerText = greeting;
  }
};
