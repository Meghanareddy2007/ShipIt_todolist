/* ==========================================================================
   storage.js — all localStorage reads/writes, isolated from app/ui logic.
   ========================================================================== */

const Storage = {
  TASKS_KEY: 'shipit.tasks.v1',
  MODE_KEY: 'shipit.mode.v1',
  STREAK_KEY: 'shipit.streak.v1',

  loadTasks() {
    try {
      const raw = localStorage.getItem(this.TASKS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('ShipIt: could not read saved tasks', err);
      return [];
    }
  },

  saveTasks(tasks) {
    try {
      localStorage.setItem(this.TASKS_KEY, JSON.stringify(tasks));
      return true;
    } catch (err) {
      console.error('ShipIt: could not save tasks', err);
      return false;
    }
  },

  loadMode() {
    try { return localStorage.getItem(this.MODE_KEY) || 'dark'; }
    catch { return 'dark'; }
  },

  saveMode(mode) {
    try { localStorage.setItem(this.MODE_KEY, mode); }
    catch (err) { console.error('ShipIt: could not save mode', err); }
  },

  loadStreak() {
    try {
      const raw = localStorage.getItem(this.STREAK_KEY);
      return raw ? JSON.parse(raw) : { count: 0, lastDate: null };
    } catch {
      return { count: 0, lastDate: null };
    }
  },

  saveStreak(streak) {
    try { localStorage.setItem(this.STREAK_KEY, JSON.stringify(streak)); }
    catch (err) { console.error('ShipIt: could not save streak', err); }
  },

  exportBackup(tasks) {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  parseBackup(text) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
};
