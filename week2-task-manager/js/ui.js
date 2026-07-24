/* ==========================================================================
   ui.js — rendering functions. Reads task data, writes DOM.
   ========================================================================== */

const UI = {
  priorityLabel: { urgent: 'Breaking', routine: 'Routine', low: 'Low' },

  momentumRing(score, completed) {
    const color = completed ? 'var(--mint)' : Utils.scoreColorVar(score);
    const pct = completed ? 100 : score;
    return `background: conic-gradient(${color} ${pct}%, var(--border) 0);`;
  },

  taskTemplate(task) {
    const overdue = !task.completed && Utils.isOverdue(task.dueDate);
    const dueLabel = task.dueDate ? Utils.formatDue(task.dueDate) : '';
    const score = Utils.momentumScore(task);
    return `
      <li class="task${task.completed ? ' completed' : ''}"
          data-id="${task.id}" data-priority="${task.priority}" draggable="true">
        <div class="momentum ${task.completed ? 'momentum--done' : ''}" data-role="toggle" title="${task.completed ? 'Shipped' : `Momentum score ${score}/100 — click to ship it`}">
          <div class="momentum__ring" style="${this.momentumRing(score, task.completed)}"></div>
          <span class="momentum__num">${task.completed ? '' : score}</span>
        </div>
        <div class="task__body">
          <div class="task__headline" data-role="headline">${Utils.escapeHtml(task.text)}</div>
          <div class="task__meta">
            <span class="badge badge--${task.priority}">${this.priorityLabel[task.priority]}</span>
            ${dueLabel ? `<span class="task__due${overdue ? ' overdue' : ''}">${overdue ? 'Overdue ' : 'Due '}${dueLabel}</span>` : ''}
          </div>
        </div>
        <div class="task__actions">
          <button class="icon-btn focus-btn" data-role="focus" title="Start focus sprint" aria-label="Start focus sprint">◎</button>
          <button class="icon-btn" data-role="edit" title="Edit" aria-label="Edit task">✎</button>
          <button class="icon-btn delete" data-role="delete" title="Delete" aria-label="Delete task">✕</button>
        </div>
      </li>
    `;
  },

  emptyStateTemplate(filter, hasSearch) {
    let text = 'Nothing queued. Add your first task and start your streak.';
    let mark = '🚀';
    if (hasSearch) { text = 'No tasks match that search.'; mark = '🔍'; }
    else if (filter === 'active') { text = 'All clear — nothing active right now.'; mark = '✨'; }
    else if (filter === 'completed') { text = 'Nothing shipped yet.'; mark = '📦'; }
    return `
      <div class="empty-state">
        <div class="empty-state__mark">${mark}</div>
        <div class="empty-state__text">${text}</div>
      </div>
    `;
  },

  renderList(container, tasks, filter, hasSearch) {
    if (tasks.length === 0) {
      container.innerHTML = this.emptyStateTemplate(filter, hasSearch);
      return;
    }
    container.innerHTML = tasks.map(t => this.taskTemplate(t)).join('');
  },

  renderStats(els, tasks, streakCount) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    const rate = total ? Math.round((completed / total) * 100) : 0;
    els.total.textContent = total;
    els.active.textContent = active;
    els.rate.textContent = rate;
    els.streak.textContent = streakCount;
  },

  setTabSelected(tabs, activeFilter) {
    tabs.forEach(tab => {
      tab.setAttribute('aria-selected', String(tab.dataset.filter === activeFilter));
    });
  },

  flashInvalid(input) {
    input.classList.remove('shake');
    void input.offsetWidth;
    input.classList.add('shake');
  },

  /** Last 7 days completion sparkline */
  renderSparkline(container, tasks) {
    const days = Array.from({ length: 7 }, (_, i) => Utils.dateOffset(i - 6));
    const counts = days.map(day =>
      tasks.filter(t => t.completed && t.completedAt && t.completedAt.slice(0, 10) === day).length
    );
    const max = Math.max(1, ...counts);
    container.innerHTML = days.map((day, i) => {
      const h = Math.max(6, Math.round((counts[i] / max) * 60));
      const label = new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' });
      return `
        <div class="spark__col" title="${counts[i]} shipped on ${day}">
          <div class="spark__bar" style="height:${h}px"></div>
          <div class="spark__day">${label}</div>
        </div>
      `;
    }).join('');
  },

  paletteItem(item, active) {
    return `
      <li class="palette__item" data-active="${active}" data-action="${item.action}" data-arg="${item.arg || ''}">
        <span class="palette__item-label"><span class="palette__icon">${item.icon}</span>${item.label}</span>
        ${item.hint ? `<span class="palette__hint">${item.hint}</span>` : ''}
      </li>
    `;
  },

  renderPalette(container, items, activeIndex) {
    if (items.length === 0) {
      container.innerHTML = `<div class="palette__empty">No matching commands or tasks.</div>`;
      return;
    }
    container.innerHTML = items.map((item, i) => this.paletteItem(item, i === activeIndex)).join('');
  },

  showToast(el, message) {
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2200);
  }
};
