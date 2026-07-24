# ShipIt — momentum for builders

**A task manager that tells you what actually needs you today, not just what's on the list.**

Built for the Week 2 JavaScript Fundamentals project, framed as a hackathon-style MVP: a real product concept, not a checklist clone.

---

## The problem

Every to-do app treats tasks the same way: a flat list, sorted by whenever you added them. "High priority" is a label you set once and forget — it doesn't know that the "Breaking" task you flagged three weeks ago is now less urgent than the "Routine" one due in two hours. So you keep re-reading the whole list to figure out what to actually do next.

## The idea

**Momentum Score.** Every task gets a live 0–100 score, shown as a glowing progress ring, that blends your priority tag with real deadline pressure. It recalculates on every render — the task that needs you *right now* visually outranks everything else, automatically. No manual re-sorting.

Three more mechanics build on that core loop:

| Feature | What it does |
|---|---|
| 🔥 **Streaks** | Tracks consecutive days you've shipped at least one task, computed from real completion timestamps (with a one-day grace period, so a busy evening doesn't wipe out a two-week streak). |
| ◎ **Focus sprints** | Turn any task into a 25-minute Pomodoro sprint with a full-screen countdown ring — one click from the task card. |
| ⌘K **Command palette** | Press `⌘K` / `Ctrl+K` anywhere to jump to a filter, toggle theme, search tasks, or ship a task without touching the mouse. |

Plus the fundamentals, done properly: add/edit/delete/complete, drag-and-drop reorder, live search, filtering, a 7-day shipping-activity sparkline, JSON backup/restore, dark/light mode, and full localStorage persistence — no backend, no build step.

## Why it's more than a to-do list

Most student to-do app projects are the same CRUD list with different CSS. ShipIt's differentiator is that **the sort order is the product** — the momentum ring is doing real (if lightweight) computation on every task, not just displaying stored data. It's the difference between a list and a system that pays attention for you.

## Tech stack

Vanilla JavaScript (ES6 classes, no framework), CSS custom properties for theming, `localStorage` for persistence, `<canvas>` for the confetti burst, inline SVG for the focus-sprint ring. Zero dependencies, zero build step — open `index.html` and it runs.

## Project structure

```
week2-task-manager/
│── index.html
│── css/
│   ├── style.css      # layout, components, palette, focus mode
│   └── theme.css       # design tokens — dark (default) & light mode
│── js/
│   ├── app.js           # TaskManager — state, events, palette, streak & timer logic
│   ├── storage.js        # localStorage read/write, backup export/import
│   ├── ui.js              # DOM rendering (task cards, momentum rings, sparkline)
│   └── utils.js            # momentum scoring, dates, confetti, debounce
│── README.md
└── .gitignore
```

## Running it

No build step. Open `index.html` in a browser, or serve the folder with any static file server.

## What's next (if this kept going past the hackathon)

- Momentum score tuned from real usage data instead of fixed weights
- Shareable streak/board links for team accountability
- Natural-language due dates ("next fri", "in 3 days")
- Cloud sync so the board follows you across devices

---

*All data stays local — nothing is sent to a server. Fonts (Space Grotesk, Inter, JetBrains Mono) load from Google Fonts via CDN; the app still runs offline, falling back to system fonts.*
