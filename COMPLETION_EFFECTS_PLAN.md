# Task Completion Effects — Research & Implementation Plan

> This document supports **Task 10** in `PLAN.md`.  
> It covers the psychology of completion feedback, a survey of mobile app patterns, and a  
> concrete implementation direction for two states: **success confetti** and **failure encouragement**.

---

## 1. The Psychology of Completion Feedback

### 1.1 The Peak-End Rule (Kahneman, 1993)
People do not evaluate experiences by averaging all moments — they remember the **peak intensity** and the **ending**. In a coding session, task completion is both the peak *and* the end. A well-designed completion moment disproportionately shapes how a programmer feels about the entire session.

**Implication:** the 1–2 seconds after the "Complete" button is pressed are the highest-leverage UX moment in the entire extension.

### 1.2 Variable Reward & Dopamine
The neuroscience of reward (Schultz, 1998; Wolfram Schultz's dopamine research) shows that **unexpected or variable rewards** produce a larger dopamine response than predictable ones. Apps like Duolingo and Habitica exploit this with milestone surprises — confetti appears not on every task but on streaks or first completions of the day.

**Implication:** Consider whether confetti fires on *every* success or only on "special" moments (first task of the day, personal best time, etc.). For a programming tool, firing on *every* success risks habituation; a light effect always plus an enhanced effect on milestones is the sweet spot.

### 1.3 Positive Reinforcement & Behavioral Loops (Skinner / BJ Fogg)
BJ Fogg's Tiny Habits model identifies a "celebration" step as the mechanism that wires a behavior into habit. The celebration must be:
1. **Immediate** — within 200ms of the trigger
2. **Personal** — feel earned, not generic
3. **Brief** — longer than ~3 seconds starts to feel patronizing for expert users

**Implication:** Keep the success animation under 2 seconds. Let it peak sharply (burst) and decay naturally. Do not add a "dismiss" button — it should self-dismiss.

### 1.4 Growth Mindset & Failure Framing (Dweck, 2006)
Carol Dweck's research distinguishes **fixed mindset** ("I failed, I'm not good enough") from **growth mindset** ("I failed, I learned something"). Motivational messages shown at failure must:
- Acknowledge the effort, not just reframe the outcome
- Be specific to the *domain* (programming, problem-solving, technical craft)
- Feel like a wise mentor, not a chatbot platitude
- Be **brief** — 1 sentence maximum is far more impactful than a paragraph

### 1.5 Self-Determination Theory (Deci & Ryan)
Motivation is sustained by three needs: **autonomy**, **competence**, and **relatedness**. A failure quote from someone the programmer *respects* (Dijkstra, Knuth, Linus) satisfies the relatedness need — "even this person struggled." Domain-specific quotes outperform generic motivational quotes by a large margin for expert audiences.

---

## 2. Mobile App Pattern Survey

### 2.1 Duolingo
- **Success:** full-screen confetti burst (multi-colored particles, ~1.8s), accompanied by a streak counter that bounces and scales up. Owl character does a small dance.
- **Failure:** heart icon empties with a "shake" animation, followed by a calm "Keep it up!" message in muted color. No harsh red overlays.
- **Key insight:** Duolingo separates the *visual impact* (animation) from the *message* (calm, small text). The animation carries the emotion; the text provides context.

### 2.2 Todoist / Things 3
- **Task completion:** a brief checkbox "pop" (scale 0.8→1.2→1.0, 200ms), item fades and slides up off the list. Occasional surprise confetti on streaks only.
- **Key insight:** the *primary* celebration is the micro-interaction on the element itself, not a full-screen overlay. Reserve full-screen for major milestones.

### 2.3 Habitica (RPG task manager)
- **Success:** XP bar fills with a gold shimmer animation, character sprite briefly flashes, floating "+XP" text rises from the task.
- **Key insight:** the metaphor of *gaining something* (XP, level) is more satisfying than abstract confetti for expert/gamer audiences.

### 2.4 Streaks (iOS habit tracker)
- **Success:** the ring "closes" with a satisfying arc animation + a chime. Minimal visual effect, maximum emotional impact.
- **Key insight:** **completion of a shape** (closing a ring, filling a bar) triggers stronger satisfaction than particle effects alone. Consider animating the timer bar to "full" on success.

### 2.5 GitHub Contributions Graph
- **Streak:**  "You've contributed X days in a row" appears as a small inline notification. No confetti — the graph itself is the reward. Programmers inherently understand the value of the graph.
- **Key insight:** for programmers specifically, **data visualization** of achievement can outperform particle effects. Consider showing "X tasks this week" on success.

### 2.6 Linear / Notion
- **Completion:** a clean, brief green flash on the card + a soft "check" micro-animation. No confetti. Aimed at professional users who find confetti distracting.
- **Key insight:** confetti must match the *audience*. For a VS Code extension targeting professional programmers, a **refined, code-aesthetic take on confetti** (e.g. falling characters `{}`, `()`, `//`) will feel more "at home" than generic party confetti.

---

## 3. Recommended Visual Direction

### 3.1 Success Effect: "Code Rain" Confetti

**Concept:** Instead of generic round confetti dots, use **small code-themed particles** — curly braces `{}`, parentheses `()`, semicolons `;`, angle brackets `</>`, tick marks `` ` ``, `✓` — falling from the top of the panel in a brief burst. This is instantly recognizable as belonging to a programmer's tool.

**Feel:** celebratory but technical. Like the Matrix but cheerful. Duration: **1.6 seconds**.

**Implementation path:**  
Use a `<canvas>` overlay rendered on top of the webview (positioned absolute, full-panel, pointer-events: none). A small vanilla JS particle system — no external library needed (~60 lines). Each particle is a character (drawn with `fillText`) with random:
- Starting x position (spread across top)
- Falling speed (8–18 px/frame)
- Rotation (slight tumble)
- Character from the symbols array
- Color sampled from: `--vscode-testing-iconPassed` (green), `--vscode-charts-yellow`, `--vscode-charts-blue`, `--vscode-charts-purple`

Particles fade out as they fall (alpha decreases with y position). Canvas is removed from DOM after the animation ends.

**Trigger:** fires immediately when `completeTask` message is received with `status: 'successfully'`, *before* the `stateSnapshot` that hides the active task view. Can fire from the webview side by listening for the snapshot with the new completed task at the top of history.

**Secondary effect:** the "Complete" button area does a brief scale pulse `1.0 → 1.12 → 1.0` over 300ms as the confetti starts. This grounds the particle burst to the action.

### 3.2 Failure Effect: "Mentor Quote" Banner

**Concept:** A slim banner slides in from the bottom of the panel (not a modal — doesn't block content). It contains:
- A single curated quote in italic
- Attribution line below (smaller, muted)
- A subtle left accent bar in `--vscode-testing-iconFailed` red that fades to `--vscode-charts-orange` over the display time (softening the color)
- Auto-dismisses after **4 seconds** with a fade out
- Can be dismissed early by clicking it

**Feel:** a mentor leaving a sticky note. Calm, not alarming. The red accent acknowledges the failure; the fade to orange signals that it's okay to move forward.

**No harsh animations** — no shake on the panel, no flashing red. The task card can do a very subtle `translateX(-2px → 2px → 0)` wobble once (200ms) to acknowledge the "failure" input, but nothing more.

---

## 4. Curated Failure Quotes

These are selected for:
- Domain specificity (programming, problem-solving, engineering)
- Brevity (fits on one line in a panel)
- Source credibility (people programmers actually respect)

```typescript
export const FAILURE_QUOTES = [
  {
    text: "I have not failed. I've just found 10,000 ways that won't work.",
    author: "Thomas Edison",
  },
  {
    text: "The most important property of a program is whether it accomplishes the intention of its user.",
    author: "C.A.R. Hoare",
  },
  {
    text: "Mistakes are the portals of discovery.",
    author: "James Joyce",
  },
  {
    text: "First, solve the problem. Then, write the code.",
    author: "John Johnson",
  },
  {
    text: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius",
  },
  {
    text: "You build on failure. You use it as a stepping stone.",
    author: "Johnny Cash",
  },
  {
    text: "It is impossible to live without failing at something, unless you live so cautiously that you might as well not have lived at all.",
    author: "J.K. Rowling",
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
  },
  {
    text: "Every expert was once a beginner. Every pro was once an amateur.",
    author: "Robin Sharma",
  },
  {
    text: "The only real mistake is the one from which we learn nothing.",
    author: "Henry Ford",
  },
  {
    text: "Debugging is twice as hard as writing the code in the first place.",
    author: "Brian Kernighan",
  },
  {
    text: "If debugging is the process of removing software bugs, then programming must be the process of putting them in.",
    author: "Edsger W. Dijkstra",
  },
] as const;
```

---

## 5. Concrete Implementation Steps

### Step 1 — Detect completion in the webview

In `src/webview/store.ts` (or `App.tsx`), add an effect that watches `history` signal for changes. When a new task is prepended:
- Check the new task's `status`
- If `'successfully'` → trigger confetti
- If `'failed'` → trigger quote banner

```typescript
// src/webview/store.ts or src/webview/hooks/useCompletionEffect.ts
import { effect } from '@preact/signals';
import { history } from './store';

let prevTopId: string | undefined;

export function setupCompletionEffects() {
  effect(() => {
    const tasks = history.value;
    const top = tasks[0];
    if (!top || top.id === prevTopId) return;
    prevTopId = top.id;
    if (top.status === 'successfully') triggerConfetti();
    if (top.status === 'failed') triggerFailureQuote();
  });
}
```

Call `setupCompletionEffects()` once in `App.tsx` on mount.

### Step 2 — Code Rain Confetti (`src/webview/fx/confetti.ts`)

```typescript
const SYMBOLS = ['{}', '()', '=>', '//', '[]', '<>', ';;', '✓', '++', '&&'];

interface Particle {
  x: number; y: number; vy: number; vx: number;
  char: string; color: string; rotation: number; vr: number; alpha: number;
}

export function triggerConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: fixed; inset: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 9999;
  `;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Sample VS Code CSS variables for colors
  const style = getComputedStyle(document.body);
  const colors = [
    style.getPropertyValue('--vscode-testing-iconPassed').trim() || '#73c991',
    style.getPropertyValue('--vscode-charts-yellow').trim()      || '#cca700',
    style.getPropertyValue('--vscode-charts-blue').trim()        || '#3794ff',
    style.getPropertyValue('--vscode-charts-purple').trim()      || '#b180d7',
    style.getPropertyValue('--vscode-charts-orange').trim()      || '#d18616',
  ];

  const particles: Particle[] = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 40,
    vy: 3 + Math.random() * 4,
    vx: (Math.random() - 0.5) * 1.5,
    char: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.15,
    alpha: 1,
  }));

  const startTime = performance.now();
  const duration = 1600;

  function frame(now: number) {
    const elapsed = now - startTime;
    const progress = elapsed / duration; // 0→1
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = false;
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.rotation += p.vr;
      // fade out in the last 40% of the animation
      p.alpha = progress < 0.6 ? 1 : 1 - (progress - 0.6) / 0.4;
      if (p.alpha > 0) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.font = 'bold 13px var(--vscode-editor-font-family, monospace)';
      ctx.fillText(p.char, 0, 0);
      ctx.restore();
    }

    if (alive && elapsed < duration + 200) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(frame);
}
```

### Step 3 — Failure Quote Banner (`src/webview/fx/failureQuote.ts`)

```typescript
import { FAILURE_QUOTES } from './quotes';

export function triggerFailureQuote() {
  const quote = FAILURE_QUOTES[Math.floor(Math.random() * FAILURE_QUOTES.length)];

  const banner = document.createElement('div');
  banner.className = 'failure-quote-banner';
  banner.innerHTML = `
    <div class="failure-quote-banner__accent"></div>
    <div class="failure-quote-banner__body">
      <p class="failure-quote-banner__text">"${quote.text}"</p>
      <p class="failure-quote-banner__author">— ${quote.author}</p>
    </div>
  `;

  document.body.appendChild(banner);
  banner.addEventListener('click', () => dismiss());

  // auto-dismiss after 4 s
  const timer = setTimeout(dismiss, 4000);

  function dismiss() {
    clearTimeout(timer);
    banner.classList.add('failure-quote-banner--out');
    banner.addEventListener('animationend', () => banner.remove(), { once: true });
  }
}
```

**CSS for the banner (add to `style.css`):**

```css
.failure-quote-banner {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  display: flex;
  gap: 0;
  background: var(--vscode-editorWidget-background, #1e1e1e);
  border-top: 1px solid var(--vscode-widget-border, #454545);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  z-index: 9998;
  cursor: pointer;
  overflow: hidden;
  animation: quote-slide-in 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.failure-quote-banner--out {
  animation: quote-slide-out 250ms ease-in forwards;
}

.failure-quote-banner__accent {
  width: 3px;
  flex-shrink: 0;
  background: var(--vscode-testing-iconFailed, #f14c4c);
  animation: accent-fade 3s ease-out 1s forwards;
}

.failure-quote-banner__body {
  padding: 10px 12px;
}

.failure-quote-banner__text {
  margin: 0 0 3px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--vscode-foreground);
  font-style: italic;
  opacity: 0.9;
}

.failure-quote-banner__author {
  margin: 0;
  font-size: 10px;
  color: var(--vscode-descriptionForeground);
  opacity: 0.7;
}

@keyframes quote-slide-in {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@keyframes quote-slide-out {
  from { transform: translateY(0);    opacity: 1; }
  to   { transform: translateY(100%); opacity: 0; }
}

@keyframes accent-fade {
  from { background: var(--vscode-testing-iconFailed, #f14c4c); }
  to   { background: var(--vscode-charts-orange, #d18616); }
}
```

### Step 4 — File structure

```
src/webview/
  fx/
    confetti.ts       ← Step 2
    failureQuote.ts   ← Step 3
    quotes.ts         ← FAILURE_QUOTES array
  hooks/
    useCompletionEffect.ts  ← Step 1 (or inline in App.tsx)
```

### Step 5 — Wire it up in `App.tsx`

```typescript
import { useEffect } from 'preact/hooks';
import { setupCompletionEffects } from './fx/completionEffects';

export function App() {
  useEffect(() => {
    setupCompletionEffects();
  }, []);
  // …
}
```

---

## 6. Edge Cases & Notes

| Case | Handling |
|---|---|
| Multiple rapid completions | `prevTopId` guard prevents double-trigger |
| Task completed while panel hidden | Effect fires when panel re-opens and snapshot arrives — still correct |
| `'paused'` / `'suspended'` status | Neither confetti nor quote — these are neutral states |
| Panel is very narrow (<200px) | Canvas is full-width by `position: fixed` — works fine |
| Canvas already exists (e.g., double-fire) | Each call creates a new canvas; both will play and self-remove |
| Accessibility / motion sensitivity | Wrap the confetti call in `!window.matchMedia('(prefers-reduced-motion: reduce)').matches` |

---

## 7. What NOT to Do

- **Do not use a full-screen modal** for either effect — it blocks the programmer's flow.
- **Do not play audio** — VS Code extensions running in a sidebar should never produce sound without explicit opt-in.
- **Do not show confetti for `'paused'` or `'suspended'`** — those are neutral, not celebratory.
- **Do not make the quote dismissal required** — it auto-dismisses; forcing interaction feels punishing.
- **Do not use the same quote twice in a row** — track `lastQuoteIndex` and skip it on the next pick.
- **Do not use generic confetti (circles/rectangles)** — the code-symbols approach is what makes this feel native to a programmer's tool.
