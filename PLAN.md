# lap-code — Previous Tasks Feature Plan

This document is a sequential implementation plan. Each task builds on the previous one.
Work through them in order. Read each section fully before starting.

---

## Status Tracker

- [x] **Task 1** — Previous Tasks UX Polish (gap, timestamp, pointer cursor)
- [ ] **Task 2** — Delete Task (hover trash icon, smooth animation)
- [ ] **Task 3** — Favourite Flag + Tabs (star icon, All/Favourites tabs)
- [ ] **Task 4** — Click History Task → Resume as Active (click to swap, Restart button)
- [ ] **Task 5** — Export (CSV/JSON dropdown, bottom-right button)
- [ ] **Task 6** — Animated Task Transition (creative timer + name animation)

**Progress:** 1/6 tasks completed

---

## Task 1 — Previous Tasks UX Polish

**Goal:** Minor visual/interaction improvements to the history list.

### Changes

**`src/webview/components/TaskItem.tsx`**
- Add completion timestamp below the footer row. Format it as a readable string, e.g. `Apr 5, 2026 · 14:32`. Use `task.completedAt` (already a Unix ms timestamp).
- Wrap the root `<div>` with `cursor: pointer` via a CSS class (or inline style is fine too).

**CSS (wherever task-item styles live — likely `src/webview/styles.css` or similar)**
- Add `gap` between items in `.history` (e.g. `gap: 8px`, using `display: flex; flex-direction: column`).
- Add `cursor: pointer` to `.task-item`.

**No type changes needed for this task.**

---

## Task 2 — Delete Task

**Goal:** Each task card shows a trash icon only on hover. Clicking it deletes the task from history. Appearance/disappearance of the icon is animated smoothly.

### Type changes — `src/types.ts`
Add a new `WebviewMessage` variant:
```ts
| { type: 'deleteTask'; id: string }
```

### Extension host — `src/extension.ts`
Handle `deleteTask` in `handleWebviewMessage`:
- Load history, filter out the record with the matching `id`, save, send snapshot.

### Webview — `src/webview/components/TaskItem.tsx`
- Add a delete icon button (SVG trash or `codicon-trash`) positioned absolutely at top-right of the card.
- Use CSS `opacity: 0` by default and `opacity: 1` on `.task-item:hover` (with `transition: opacity 200ms ease`).
- On click: call `vscode.postMessage({ type: 'deleteTask', id: task.id })`.
- Prevent the card's own click handler (added in Task 4) from firing via `e.stopPropagation()`.

### CSS
- `.task-item` needs `position: relative` and `overflow: visible`.
- `.task-item__delete` button: `position: absolute; top: 6px; right: 6px; opacity: 0; transition: opacity 200ms ease, transform 200ms ease`.
- On `.task-item:hover .task-item__delete`: `opacity: 1`.
- Add a subtle scale animation: `transform: scale(0.8)` default → `scale(1)` on hover.

---

## Task 3 — Favourite Flag + Tabs

**Goal:** Tasks can be starred. Hover reveals a star icon (alongside the trash). Two tabs replace the "Previous Tasks" label: **All** and **Favourites**.

### Type changes — `src/types.ts`
- Add `isFavourite?: boolean` to `TaskRecord`.
- Add new `WebviewMessage` variant:
  ```ts
  | { type: 'toggleFavourite'; id: string }
  ```

### Extension host — `src/extension.ts`
Handle `toggleFavourite`:
- Load history, find record by `id`, flip its `isFavourite` flag (default `false` → `true`), save, send snapshot.

### Webview — `src/webview/components/TaskItem.tsx`
- Add a star icon button, positioned to the left of the trash icon (or wherever fits).
- Same hover-reveal animation as trash: `opacity: 0` → `opacity: 1` on `.task-item:hover`, with `transition: opacity 200ms ease, transform 200ms ease` and a scale pop.
- When `task.isFavourite === true`, the star is always visible (solid/filled icon) regardless of hover state.
- On click: `vscode.postMessage({ type: 'toggleFavourite', id: task.id })`, `e.stopPropagation()`.

**Important:** both icons (star + trash) should animate in together on hover. Use the same CSS transition. Keep animation subtle — 200ms ease is enough.

### Webview — `src/webview/components/HistoryList.tsx`
- Replace the plain `<p class="section-label">Previous Tasks</p>` with a two-tab header: **All** | **Favourites**.
- Use local state (`useState`) to track active tab: `'all' | 'favourites'`.
- Filter `tasks` based on active tab before rendering.
- Empty state messages differ per tab:
  - All: "No completed tasks yet."
  - Favourites: "No favourite tasks yet."

### CSS
- Tab bar: two pill/underline style buttons, standard VS Code secondary feel.
- Active tab has a bottom border or background highlight.

---

## Task 4 — Click History Task → Resume as Active

**Goal:** Clicking a task card in history makes it the new active task. The current running task (if any) is pushed to history. The active task view gains a **Restart** button with a confirmation popover.

### Type changes — `src/types.ts`
- Add `'suspended'` to `CompletionStatus`:
  ```ts
  export type CompletionStatus = 'successfully' | 'failed' | 'suspended';
  ```
  This is the status used when a running task is displaced by clicking a history item.
- Add new `WebviewMessage` variant:
  ```ts
  | { type: 'resumeHistoryTask'; id: string }
  | { type: 'restartTask' }
  ```

### Extension host — `src/extension.ts`
Handle `resumeHistoryTask`:
1. If there is a current `activeTask`, save it to history as a `TaskRecord` with `status: 'suspended'` and `completedAt: Date.now()`.
2. Load history, find the record with the given `id`, remove it from history.
3. Set `activeTask` to the found record converted to `ActiveTask` (map fields, set `isPaused: false`).
4. Start the interval.
5. Save updated history (with the suspended task prepended, and the resumed task removed).
6. Send snapshot.

Handle `restartTask`:
1. If there is a current `activeTask`, reset its `elapsedSeconds` to `0` and `isPaused` to `false`.
2. Restart the interval.
3. Send snapshot.

### Webview — `src/webview/components/TaskItem.tsx`
- Make the card clickable. On click (if not clicking star/trash): `vscode.postMessage({ type: 'resumeHistoryTask', id: task.id })`.

### Webview — `src/webview/components/ActiveTaskView.tsx`
- Add a **Restart** button alongside Pause/Resume and Complete.
- Clicking Restart shows an inline confirmation popover (not a modal — just a small `<div>` that appears below the button row with "Restart from 0?" + Confirm / Cancel buttons).
- On confirm: `vscode.postMessage({ type: 'restartTask' })`, close popover.
- On cancel: close popover.

### CSS
- Suspended tasks in history should look visually distinct — e.g. a muted border or a "⏸ Suspended" chip alongside the status chip.
- Adjust `task-chip` to handle `'suspended'` status with its own colour.

---

## Task 5 — Export (CSV / JSON)

**Goal:** A fixed "Export" button sits at the bottom-right of the panel. Clicking it opens a small dropdown with **CSV** and **JSON** options. Selecting one downloads/saves the file.

### Approach
Since this is a VS Code webview, we can't use `<a download>` directly for file saves. Instead:
- The webview posts an export message to the extension host.
- The extension host uses `vscode.workspace.fs` or `vscode.window.showSaveDialog` to write the file.

### Type changes — `src/types.ts`
Add new `WebviewMessage` variant:
```ts
| { type: 'exportTasks'; format: 'csv' | 'json' }
```

### Extension host — `src/extension.ts`
Handle `exportTasks`:
- Load history.
- If `format === 'json'`: serialize with `JSON.stringify(history, null, 2)`.
- If `format === 'csv'`: build a CSV string with headers: `id,name,plannedSeconds,elapsedSeconds,completedAt,status,source,language,difficulty,isFavourite`.
- Show a save dialog (`vscode.window.showSaveDialog`) with a suggested filename like `lap-code-export.json` / `lap-code-export.csv`.
- Write the file to the chosen path with `vscode.workspace.fs.writeFile`.
- Show a `vscode.window.showInformationMessage` confirmation on success.

### Webview — `src/webview/components/App.tsx` (or a new `ExportButton.tsx`)
- Add a fixed-position container at the bottom-right of the webview.
- "Export" button; on click toggles a small dropdown `<div>` with two options: "CSV" and "JSON".
- Clicking an option: posts `{ type: 'exportTasks', format }`, closes dropdown.
- Clicking outside the dropdown closes it (use `useEffect` with a document click listener).

### CSS
- Export button: `position: fixed; bottom: 12px; right: 12px;` — use a subtle secondary style.
- Dropdown: `position: absolute; bottom: 100%; right: 0;` — appears above the button, card/shadow styled.
- Add a short fade-in animation for the dropdown (`opacity 150ms ease`).

---

## Task 6 — Animated Task Transition (Timer + Task Name)

**Goal:** When a history task is clicked and becomes active (Task 4), the timer display and task name in `ActiveTaskView` animate smoothly to the new values. This should feel creative but not distracting.

### Approach
Use CSS keyframe animations triggered by a React key or a class toggle.

**Suggested animation:**
- Task name: slides in from below with a fade (`translateY(8px) opacity:0` → `translateY(0) opacity:1`), duration 300ms ease-out.
- Timer digits: a quick "flip" or "blur-out then blur-in" — apply `filter: blur(4px) opacity:0` on the old value and `filter: blur(0) opacity:1` on the new, over 250ms.

### Implementation

**`src/webview/components/ActiveTaskView.tsx`**
- Track a `transitionKey` in local state (or use a signal) that increments each time `activeTask.value?.id` changes.
- Pass `key={transitionKey}` to the timer `<div>` and name `<p>` — this forces Preact to unmount/remount them, triggering CSS enter animations.
- Alternatively, use a `useEffect` that watches `task.id` and adds/removes a CSS class.

**CSS**
- `.active-task__name` and `.active-task__timer`: define `@keyframes task-enter` that animates from `(translateY(6px), opacity 0)` to `(translateY(0), opacity 1)`.
- Apply the animation on mount: `animation: task-enter 300ms ease-out forwards`.
- For the timer specifically, add a secondary `@keyframes timer-enter` with a slight scale pulse: `scale(0.95)` → `scale(1)`.

**No extension host changes needed for this task.**

---

## Implementation Order Notes

- Tasks 1–3 are purely additive (new CSS + new messages + type additions).
- Task 4 changes `CompletionStatus` — verify that `task-chip` styles handle `'suspended'` and that the export in Task 5 includes it correctly.
- Task 5 depends on Task 4 only if you want `isFavourite` in the export (from Task 3) — make sure the CSV headers and JSON output include it.
- Task 6 is self-contained and can be done any time after Task 4.
