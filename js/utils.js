/* ==========================================================================
   utils.js — shared helpers with no dependency on app state.
   ========================================================================== */

const Utils = {
  makeId() {
    return `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  formatDue(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  },

  isOverdue(dateStr) {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr + 'T00:00:00').getTime() < today.getTime();
  },

  daysUntil(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + 'T00:00:00');
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  },

  dateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  },

  todayKey() {
    return new Date().toISOString().slice(0, 10);
  },

  debounce(fn, delay = 150) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  todayLabel() {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    });
  },

  /**
   * Momentum Score (0–100): the signature "innovative" feature.
   * Blends manual priority with real deadline pressure so the task that
   * genuinely needs attention today visually outranks a "Breaking" task
   * due in three weeks — priority alone can't tell you that.
   */
  momentumScore(task) {
    if (task.completed) return 100;
    const base = { urgent: 70, routine: 45, low: 20 }[task.priority] ?? 45;
    const days = Utils.daysUntil(task.dueDate);
    let deadlinePressure = 0;
    if (days !== null) {
      if (days < 0) deadlinePressure = 35;
      else if (days === 0) deadlinePressure = 30;
      else if (days === 1) deadlinePressure = 22;
      else if (days <= 3) deadlinePressure = 14;
      else if (days <= 7) deadlinePressure = 6;
    }
    return Math.max(2, Math.min(99, Math.round(base * 0.72 + deadlinePressure)));
  },

  scoreColorVar(score) {
    if (score >= 75) return 'var(--danger)';
    if (score >= 45) return 'var(--warn)';
    return 'var(--calm)';
  },

  /** Lightweight confetti burst, no dependencies */
  confetti(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);

    const colors = ['#00e5a0', '#7b61ff', '#6fd3ff', '#ffb24d'];
    const pieces = Array.from({ length: 90 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
      y: window.innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 9,
      vy: -Math.random() * 9 - 4,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      life: 0
    }));

    let frame = 0;
    const maxFrames = 90;
    function step() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      pieces.forEach(p => {
        p.vy += 0.25;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      frame++;
      if (frame < maxFrames) requestAnimationFrame(step);
      else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
    requestAnimationFrame(step);
  }
};
