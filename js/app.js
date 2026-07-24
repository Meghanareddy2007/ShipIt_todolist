/* ==========================================================================
   app.js — application state and event wiring.
   ========================================================================== */

class TaskManager {
  constructor() {
    this.tasks = Storage.loadTasks();
    this.filter = 'all';
    this.searchTerm = '';
    this.dragId = null;
    this.quickDate = null; // 'today' | 'tomorrow' | 'week' | null

    // command palette state
    this.paletteOpen = false;
    this.paletteItems = [];
    this.paletteActive = 0;

    // focus mode / pomodoro state
    this.focusTaskId = null;
    this.focusSeconds = 25 * 60;
    this.focusTotal = 25 * 60;
    this.focusInterval = null;
    this.focusRunning = false;
    const RING_R = 100;
    this.ringCircumference = 2 * Math.PI * RING_R;

    this.cacheEls();
    this.applyMode(Storage.loadMode());
    this.bindEvents();
    this.render();
  }

  cacheEls() {
    this.els = {
      form: document.getElementById('taskForm'),
      input: document.getElementById('taskInput'),
      priority: document.getElementById('prioritySelect'),
      due: document.getElementById('dueInput'),
      quickDateBtns: Array.from(document.querySelectorAll('.quick-date button')),
      list: document.getElementById('taskList'),
      tabs: Array.from(document.querySelectorAll('.tab')),
      search: document.getElementById('searchInput'),
      clearCompleted: document.getElementById('clearCompleted'),
      modeToggle: document.getElementById('modeToggle'),
      exportBtn: document.getElementById('exportBtn'),
      importInput: document.getElementById('importInput'),
      dateline: document.getElementById('dateline'),
      spark: document.getElementById('spark'),
      stats: {
        total: document.getElementById('totalTasks'),
        active: document.getElementById('activeTasks'),
        rate: document.getElementById('rateTasks'),
        streak: document.getElementById('streakTasks')
      },
      paletteTrigger: document.getElementById('paletteTrigger'),
      paletteOverlay: document.getElementById('paletteOverlay'),
      paletteInput: document.getElementById('paletteInput'),
      paletteList: document.getElementById('paletteList'),
      focusOverlay: document.getElementById('focusOverlay'),
      focusTaskLabel: document.getElementById('focusTaskLabel'),
      focusTime: document.getElementById('focusTime'),
      focusRingProgress: document.getElementById('focusRingProgress'),
      focusStartPause: document.getElementById('focusStartPause'),
      focusReset: document.getElementById('focusReset'),
      focusExit: document.getElementById('focusExit'),
      toast: document.getElementById('toast'),
      confettiCanvas: document.getElementById('confettiCanvas')
    };
    this.els.dateline.textContent = Utils.todayLabel();
    this.els.focusRingProgress.style.strokeDasharray = `${this.ringCircumference} ${this.ringCircumference}`;
  }

  bindEvents() {
    this.els.form.addEventListener('submit', e => {
      e.preventDefault();
      this.addTask();
    });

    this.els.quickDateBtns.forEach(btn => {
      btn.addEventListener('click', () => this.setQuickDate(btn.dataset.quick, btn));
    });

    this.els.list.addEventListener('click', e => this.handleListClick(e));
    this.els.list.addEventListener('dragstart', e => {
      const li = e.target.closest('.task');
      if (!li) return;
      this.dragId = li.dataset.id;
      li.classList.add('dragging');
    });
    this.els.list.addEventListener('dragend', e => {
      const li = e.target.closest('.task');
      if (li) li.classList.remove('dragging');
      this.els.list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });
    this.els.list.addEventListener('dragover', e => {
      e.preventDefault();
      const li = e.target.closest('.task');
      if (!li || li.dataset.id === this.dragId) return;
      this.els.list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      li.classList.add('drag-over');
    });
    this.els.list.addEventListener('drop', e => {
      e.preventDefault();
      const li = e.target.closest('.task');
      if (!li || !this.dragId) return;
      this.reorder(this.dragId, li.dataset.id);
      this.dragId = null;
    });

    this.els.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.filter = tab.dataset.filter;
        this.render();
      });
    });

    this.els.search.addEventListener('input', Utils.debounce(e => {
      this.searchTerm = e.target.value.trim().toLowerCase();
      this.render();
    }, 120));

    this.els.clearCompleted.addEventListener('click', () => this.clearCompleted());

    this.els.modeToggle.addEventListener('click', () => {
      const current = document.documentElement.dataset.mode;
      const next = current === 'light' ? 'dark' : 'light';
      this.applyMode(next);
      Storage.saveMode(next);
    });

    this.els.exportBtn.addEventListener('click', () => {
      Storage.exportBackup(this.tasks);
      this.toast('Backup exported ✓');
    });
    this.els.importInput.addEventListener('change', e => this.handleImport(e));

    // command palette
    this.els.paletteTrigger.addEventListener('click', () => this.openPalette());
    this.els.paletteOverlay.addEventListener('click', e => {
      if (e.target === this.els.paletteOverlay) this.closePalette();
    });
    this.els.paletteInput.addEventListener('input', () => this.updatePaletteItems());
    this.els.paletteInput.addEventListener('keydown', e => this.handlePaletteKeydown(e));
    this.els.paletteList.addEventListener('click', e => {
      const item = e.target.closest('.palette__item');
      if (item) this.runPaletteAction(item.dataset.action, item.dataset.arg);
    });

    // focus mode
    this.els.focusStartPause.addEventListener('click', () => this.toggleFocusTimer());
    this.els.focusReset.addEventListener('click', () => this.resetFocusTimer());
    this.els.focusExit.addEventListener('click', () => this.exitFocus());

    document.addEventListener('keydown', e => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.paletteOpen ? this.closePalette() : this.openPalette();
        return;
      }
      if (e.key === 'Escape') {
        if (this.paletteOpen) this.closePalette();
        else if (!this.els.focusOverlay.hidden) this.exitFocus();
        else if (document.activeElement === this.els.search) {
          this.els.search.value = '';
          this.searchTerm = '';
          this.render();
        }
        return;
      }
      if (this.paletteOpen || !this.els.focusOverlay.hidden) return;
      if (e.key === '/' && document.activeElement !== this.els.input && document.activeElement !== this.els.search) {
        e.preventDefault();
        this.els.search.focus();
      }
      if (e.key.toLowerCase() === 'n' && document.activeElement !== this.els.input && document.activeElement !== this.els.search) {
        e.preventDefault();
        this.els.input.focus();
      }
    });
  }

  applyMode(mode) {
    document.documentElement.dataset.mode = mode;
    this.els.modeToggle.textContent = mode === 'light' ? '🌙' : '☀️';
    this.els.modeToggle.setAttribute('aria-label', mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  }

  setQuickDate(key, btn) {
    const alreadyActive = this.quickDate === key;
    this.els.quickDateBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
    if (alreadyActive) {
      this.quickDate = null;
      this.els.due.value = '';
      return;
    }
    this.quickDate = key;
    btn.setAttribute('aria-pressed', 'true');
    const offsets = { today: 0, tomorrow: 1, week: 7 };
    this.els.due.value = Utils.dateOffset(offsets[key]);
  }

  addTask() {
    const text = this.els.input.value.trim();
    if (!text) {
      UI.flashInvalid(this.els.input);
      return;
    }
    const task = {
      id: Utils.makeId(),
      text,
      completed: false,
      priority: this.els.priority.value,
      dueDate: this.els.due.value || null,
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    this.tasks.unshift(task);
    this.els.input.value = '';
    this.els.due.value = '';
    this.quickDate = null;
    this.els.quickDateBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
    this.els.input.focus();
    this.persistAndRender();
    this.toast('Shipped to the board ✓');
  }

  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.persistAndRender();
  }

  toggleComplete(id) {
    let justCompleted = false;
    this.tasks = this.tasks.map(t => {
      if (t.id !== id) return t;
      const completed = !t.completed;
      if (completed) justCompleted = true;
      return { ...t, completed, completedAt: completed ? new Date().toISOString() : null };
    });
    this.persistAndRender();
    if (justCompleted) {
      const stillActive = this.tasks.some(t => !t.completed);
      if (!stillActive) {
        this.burst();
        this.toast('All shipped. Inbox zero. 🎉');
      } else {
        this.toast('Shipped ✓');
      }
    }
  }

  startEdit(id) {
    const li = this.els.list.querySelector(`.task[data-id="${id}"]`);
    if (!li) return;
    const headline = li.querySelector('[data-role="headline"]');
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task__edit-input';
    input.value = task.text;
    headline.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    const commit = () => {
      const val = input.value.trim();
      if (val) this.editTask(id, val);
      else this.render();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { e.preventDefault(); this.render(); }
    });
  }

  editTask(id, newText) {
    this.tasks = this.tasks.map(t => t.id === id ? { ...t, text: newText } : t);
    this.persistAndRender();
  }

  reorder(draggedId, targetId) {
    const fromIndex = this.tasks.findIndex(t => t.id === draggedId);
    const toIndex = this.tasks.findIndex(t => t.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = this.tasks.splice(fromIndex, 1);
    this.tasks.splice(toIndex, 0, moved);
    this.persistAndRender();
  }

  clearCompleted() {
    if (!this.tasks.some(t => t.completed)) return;
    this.tasks = this.tasks.filter(t => !t.completed);
    this.persistAndRender();
    this.toast('Cleared shipped tasks');
  }

  handleListClick(e) {
    const li = e.target.closest('.task');
    if (!li) return;
    const id = li.dataset.id;
    const role = e.target.closest('[data-role]')?.dataset.role;
    if (role === 'delete') this.deleteTask(id);
    else if (role === 'edit') this.startEdit(id);
    else if (role === 'toggle') this.toggleComplete(id);
    else if (role === 'focus') this.enterFocus(id);
  }

  handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imported = Storage.parseBackup(reader.result);
      if (imported) {
        this.tasks = imported;
        this.persistAndRender();
        this.toast('Backup restored ✓');
      } else {
        alert('That file could not be read as a ShipIt backup.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  getFiltered() {
    let list = this.tasks;
    if (this.filter === 'active') list = list.filter(t => !t.completed);
    if (this.filter === 'completed') list = list.filter(t => t.completed);
    if (this.searchTerm) list = list.filter(t => t.text.toLowerCase().includes(this.searchTerm));
    // sort active tasks by momentum score, highest first; completed sink to their spot
    return [...list].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return Utils.momentumScore(b) - Utils.momentumScore(a);
    });
  }

  /** Consecutive-day streak computed from completion timestamps, with a
   *  one-day grace period so it doesn't zero out until a full day is missed. */
  currentStreak() {
    const days = new Set(
      this.tasks.filter(t => t.completed && t.completedAt).map(t => t.completedAt.slice(0, 10))
    );
    if (days.size === 0) return 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    let key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) {
      cursor.setDate(cursor.getDate() - 1);
      key = cursor.toISOString().slice(0, 10);
      if (!days.has(key)) return 0;
    }
    let count = 0;
    while (days.has(key)) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
      key = cursor.toISOString().slice(0, 10);
    }
    return count;
  }

  persistAndRender() {
    Storage.saveTasks(this.tasks);
    this.render();
  }

  render() {
    const filtered = this.getFiltered();
    UI.renderList(this.els.list, filtered, this.filter, Boolean(this.searchTerm));
    UI.renderStats(this.els.stats, this.tasks, this.currentStreak());
    UI.setTabSelected(this.els.tabs, this.filter);
    UI.renderSparkline(this.els.spark, this.tasks);
  }

  toast(message) {
    UI.showToast(this.els.toast, message);
  }

  burst() {
    this.els.confettiCanvas.hidden = false;
    Utils.confetti(this.els.confettiCanvas);
  }

  /* ---------------- Command palette ---------------- */

  buildPaletteCommands() {
    return [
      { icon: '＋', label: 'New task', action: 'focus-input', hint: 'N' },
      { icon: '🔍', label: 'Search tasks', action: 'focus-search', hint: '/' },
      { icon: '◎', label: 'All tasks', action: 'filter', arg: 'all' },
      { icon: '◑', label: 'Active tasks', action: 'filter', arg: 'active' },
      { icon: '✓', label: 'Shipped tasks', action: 'filter', arg: 'completed' },
      { icon: this.els.modeToggle.textContent, label: 'Toggle light / dark', action: 'toggle-mode' },
      { icon: '🧹', label: 'Clear shipped tasks', action: 'clear-completed' },
      { icon: '⬇', label: 'Export backup', action: 'export' }
    ];
  }

  updatePaletteItems() {
    const q = this.els.paletteInput.value.trim().toLowerCase();
    const commands = this.buildPaletteCommands().filter(c => c.label.toLowerCase().includes(q));
    let taskMatches = [];
    if (q) {
      taskMatches = this.tasks
        .filter(t => t.text.toLowerCase().includes(q))
        .slice(0, 5)
        .map(t => ({
          icon: t.completed ? '✓' : '◎',
          label: t.text,
          action: t.completed ? 'jump-completed' : 'toggle-task',
          arg: t.id,
          hint: t.completed ? 'shipped' : 'ship it'
        }));
    }
    this.paletteItems = [...taskMatches, ...commands];
    this.paletteActive = 0;
    UI.renderPalette(this.els.paletteList, this.paletteItems, this.paletteActive);
  }

  openPalette() {
    this.paletteOpen = true;
    this.els.paletteOverlay.hidden = false;
    this.els.paletteInput.value = '';
    this.updatePaletteItems();
    setTimeout(() => this.els.paletteInput.focus(), 0);
  }

  closePalette() {
    this.paletteOpen = false;
    this.els.paletteOverlay.hidden = true;
  }

  handlePaletteKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.paletteActive = Math.min(this.paletteActive + 1, this.paletteItems.length - 1);
      UI.renderPalette(this.els.paletteList, this.paletteItems, this.paletteActive);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.paletteActive = Math.max(this.paletteActive - 1, 0);
      UI.renderPalette(this.els.paletteList, this.paletteItems, this.paletteActive);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = this.paletteItems[this.paletteActive];
      if (item) this.runPaletteAction(item.action, item.arg);
    }
  }

  runPaletteAction(action, arg) {
    switch (action) {
      case 'focus-input': this.closePalette(); this.els.input.focus(); break;
      case 'focus-search': this.closePalette(); this.els.search.focus(); break;
      case 'filter': this.filter = arg; this.render(); this.closePalette(); break;
      case 'toggle-mode': this.els.modeToggle.click(); this.closePalette(); break;
      case 'clear-completed': this.clearCompleted(); this.closePalette(); break;
      case 'export': Storage.exportBackup(this.tasks); this.toast('Backup exported ✓'); this.closePalette(); break;
      case 'toggle-task': this.toggleComplete(arg); this.closePalette(); break;
      case 'jump-completed': this.filter = 'completed'; this.render(); this.closePalette(); break;
    }
  }

  /* ---------------- Focus mode (Pomodoro sprint) ---------------- */

  enterFocus(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    this.focusTaskId = taskId;
    this.focusSeconds = 25 * 60;
    this.focusTotal = 25 * 60;
    this.focusRunning = false;
    this.els.focusTaskLabel.textContent = task.text;
    this.els.focusOverlay.hidden = false;
    this.updateFocusDisplay();
    this.els.focusStartPause.textContent = 'Start sprint';
  }

  exitFocus() {
    clearInterval(this.focusInterval);
    this.focusRunning = false;
    this.els.focusOverlay.hidden = true;
    this.focusTaskId = null;
  }

  toggleFocusTimer() {
    if (this.focusRunning) {
      clearInterval(this.focusInterval);
      this.focusRunning = false;
      this.els.focusStartPause.textContent = 'Resume';
      return;
    }
    this.focusRunning = true;
    this.els.focusStartPause.textContent = 'Pause';
    this.focusInterval = setInterval(() => {
      this.focusSeconds--;
      this.updateFocusDisplay();
      if (this.focusSeconds <= 0) {
        clearInterval(this.focusInterval);
        this.focusRunning = false;
        this.toast('Sprint complete — nice work ⏱');
        this.burst();
      }
    }, 1000);
  }

  resetFocusTimer() {
    clearInterval(this.focusInterval);
    this.focusRunning = false;
    this.focusSeconds = this.focusTotal;
    this.els.focusStartPause.textContent = 'Start sprint';
    this.updateFocusDisplay();
  }

  updateFocusDisplay() {
    const m = Math.floor(this.focusSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(this.focusSeconds % 60).toString().padStart(2, '0');
    this.els.focusTime.textContent = `${m}:${s}`;
    const progress = 1 - this.focusSeconds / this.focusTotal;
    const offset = this.ringCircumference * (1 - progress);
    this.els.focusRingProgress.style.strokeDashoffset = offset;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.taskManager = new TaskManager();
});
