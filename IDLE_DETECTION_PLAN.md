# Forgotten Task / Idle Detection — Analysis & Plan

**Status:** Not started. Planned as the next task after PLAN.md Task 9.

**Problem:** A developer starts a task, walks away (coffee, meeting, lunch), and forgets about it. The timer keeps ticking and their recorded time no longer reflects actual work. Worse: if they're past planned time, there's no active nudge to bring them back.

---

## Current Behaviour

**VS Code shuts down while a task is running**
[src/TaskManager.ts:166-177](src/TaskManager.ts#L166-L177) — `dispose()` clears the interval and writes the last `elapsedSeconds` into history as `status: 'paused'`. Clean: no phantom time is counted while VS Code is dead. But silent: no prompt or "you left a task running" indicator.

**VS Code stays open, user walks away**
The tick loop at [src/TaskManager.ts:187-195](src/TaskManager.ts#L187-L195) keeps incrementing `elapsedSeconds` every second. The status bar turns red past planned time ([src/TaskManager.ts:207-211](src/TaskManager.ts#L207-L211)). That is the **only** signal. No sound, no OS notification, no modal. The user returns to `-01:32:00` with no idea how much of that was actual work.

---

## Product-Level Options

1. **Passive visual cues** — flashing status bar, pulsing panel. Cheap, easy to miss.
2. **Soft nudge at deadline** — one toast when `elapsedSeconds` crosses `plannedSeconds`. Non-blocking, VS Code-native.
3. **Escalating nudges** — toast at deadline, then every N minutes of overtime. Risk: annoying.
4. **Idle-aware auto-pause** — detect no editor activity for X minutes → auto-pause and ask "was this a break?" on return. Addresses the root cause (time counted while away) rather than only nagging.
5. **Hard stop at cap** — auto-complete as `abandoned` after 2× planned. Destructive; needs opt-in.
6. **OS-level notifications / sounds** — survive VS Code being in the background.

---

## Prior Art

- **Pomodoro apps (Be Focused, Pomotroid, Flow)** — OS notification + sound at interval end; many play a ticking sound so you don't forget the timer is running.
- **Toggl / Clockify** — idle detection: if no keyboard/mouse for N minutes, they prompt "you've been idle — discard this time or keep it?" Closest match to our exact scenario.
- **RescueTime** — silent, but categorizes idle time separately.
- **LeetCode's own timer** — just a visible counter, no nudges (gap we'd fill).

---

## VS Code APIs Available

- `vscode.window.showInformationMessage / showWarningMessage` — toast with action buttons ("Complete", "Extend 10m", "Pause"). Non-modal.
- `showInformationMessage(..., { modal: true })` — blocking modal. Heavy-handed but unmissable.
- `StatusBarItem.backgroundColor` with `statusBarItem.warningBackground` / `errorBackground` — makes the bar yellow/red; more eye-catching than text colour alone.
- `window.onDidChangeWindowState` — fires when VS Code loses/gains focus. Could pause on blur, or detect "user came back".
- `window.onDidChangeTextEditorSelection` / `workspace.onDidChangeTextDocument` — proxy for "user is actively coding". Basis for idle detection.
- `ExtensionContext.globalState` — already used; can store `lastActivityAt` timestamp to survive restarts.
- ❌ No native "play sound" API — would need a webview `<audio>` trick or shell out.
- ❌ No true OS-notification API beyond toasts (behaviour varies by OS when VS Code is backgrounded).

---

## Recommended Direction

**Idle-aware auto-pause (option 4) + single soft toast at deadline (option 2).**

Idle detection attacks the root cause (time-on-task accuracy) rather than just alerting harder. The deadline toast covers the orthogonal case where the user *is* working but lost track of time.

Skip escalating nudges and hard-stop until we've seen whether the first two are enough.

### Rough design sketch (to be expanded when the task is picked up)

- Add a `lastActivityAt: number` field tracked in `TaskManager`, updated on `onDidChangeTextEditorSelection` / `onDidChangeTextDocument` / `onDidChangeWindowState`.
- On each tick, if `now - lastActivityAt > IDLE_THRESHOLD_MS` (configurable, default ~5 min), auto-pause the task and record the idle start time.
- On next activity event after an auto-pause, show a toast: **"You were idle for 12 minutes. Discard that time and resume, or keep it?"** with actions: `Discard & resume` / `Keep & resume` / `Complete`.
- Separately, when `elapsedSeconds` first crosses `plannedSeconds`, fire a one-shot toast: **"Planned time reached. Complete, extend, or keep going?"** with actions: `Complete` / `+10 min` / `Dismiss`.
- Persist `lastActivityAt` and "toast-already-shown-for-this-task" flags to survive reload.
- Setting for the idle threshold (minutes) — sensible default, opt-out.

### Open questions

- What counts as "activity"? Editor changes only, or also terminal input, debug events? Start narrow (editor only), expand if users complain.
- Should the status bar reflect an auto-paused state differently from a user-paused one?
- Does the deadline toast happen once per task, or once per "session" if the user keeps extending?
