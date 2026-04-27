---
name: code-master
description: >
  Write, review, and refactor code to production-ready, top-tier engineering standards.
  Use this skill whenever the user asks to write new code, improve existing code, do a
  code review, refactor, or "make it production ready". Also trigger when the user says
  things like "clean this up", "this is messy", "make it maintainable", "follow best
  practices", or "write this properly". Applies to any language or framework. Ensures
  SOLID, DRY, and KISS principles; strict typing; separation of concerns; explicit error
  handling; testability; and readability. When in doubt, use this skill — it's better to
  apply these standards than not.
---

# Production Code Quality

This skill guides writing and refactoring code the way a top-tier senior engineer would:
readable, maintainable, testable, and ready to ship without shame.

The user provides code to write, review, or refactor — in any language, at any scale.
Apply every principle below unless the user explicitly opts out of a specific one.

---

## Core Philosophy

**Make the next engineer's life easy.** Code is read far more than it is written. Optimize
for clarity and long-term maintainability over short-term cleverness. When two approaches
deliver the same outcome, always choose the simpler one.

---

## Principles

### 1. KISS — Keep It Simple

- Solve the actual problem, nothing more.
- Avoid speculative abstractions ("we might need this later").
- Prefer flat over nested, sequential over recursive, explicit over implicit.
- If you need a comment to explain *what* the code does, rewrite the code instead.

### 2. DRY — Don't Repeat Yourself

- Every piece of knowledge lives in exactly one place.
- Extract duplication only when the *same concept* repeats — not just similar syntax.
- Premature DRY is as harmful as duplication; wait for the third occurrence before
  abstracting.

### 3. SOLID

| Principle | In practice |
|-----------|------------|
| **Single Responsibility** | Each function, class, or module does one thing and does it well. If you need "and" to describe it, split it. |
| **Open/Closed** | Extend behaviour without modifying existing, tested code. |
| **Liskov Substitution** | Subtypes must honour the contract of their parent. |
| **Interface Segregation** | Narrow interfaces over fat ones. Callers should not depend on methods they don't use. |
| **Dependency Inversion** | Depend on abstractions, not concrete implementations. Inject dependencies; don't construct them internally. |

---

## Mandatory Standards

### Naming

- Names are self-documenting: `getUserById` not `getData`, `isEligibleForDiscount` not `flag`.
- Booleans read as assertions: `isLoading`, `hasError`, `canEdit`.
- Avoid abbreviations unless universally understood in the domain (`id`, `url`, `http`).
- Collections are plural: `users`, `orderItems`.

### Functions

- One function = one responsibility = one level of abstraction.
- Aim for ≤ 20 lines per function. If it's longer, look for an extraction.
- No more than 3–4 parameters; group related ones into an object/struct.
- Pure functions wherever possible: same inputs → same outputs, no hidden side effects.

### Typing

- Strict types everywhere. `any` / `interface{}` / untyped dicts are not acceptable in
  production code.
- Encode domain constraints in the type system (e.g., `NonEmptyArray<T>`, branded types
  for IDs) rather than guarding at runtime repeatedly.
- Nullability must be explicit: use `Option<T>` / `T | null` and handle both branches.

### Separation of Concerns

Never mix layers in a single unit:

```
┌───────────────────┐
│   Presentation    │  (HTTP handlers, CLI, UI)
├───────────────────┤
│  Business Logic   │  (domain rules, use cases)
├───────────────────┤
│   Data Access     │  (DB queries, API calls, caches)
└───────────────────┘
```

Each layer communicates through defined interfaces/contracts, not by reaching into the
internals of another.

### Error Handling

- Errors are first-class: return `Result<T, E>` / use typed exceptions / propagate
  explicitly. Never swallow errors silently.
- Distinguish between recoverable errors (wrong input, transient failures) and
  unrecoverable ones (programmer bugs). Handle each appropriately.
- Error messages must be actionable: say *what* failed and *why*, not just that something
  "went wrong".
- Validate at the boundary (entry points, API edges) and trust the data inside.

### Idempotency & Safety

- Operations that can be retried safely should be. Design with retries in mind.
- Database writes and external calls: consider what happens if they run twice. Use
  idempotency keys, upserts, or guard clauses.
- Never mutate shared state without explicit synchronisation.

### Comments

- Comment **why**, never **what**.
- Good: `// Retry up to 3 times because the payment gateway has transient 429s`
- Bad: `// Loop through users`
- Mark intentional workarounds: `// HACK: vendor bug #1234, remove after upgrade to v3`
- Public APIs and non-obvious function signatures deserve a brief doc comment.

### Testability

- Write code that can be tested without spinning up databases, networks, or filesystems.
- Inject all I/O dependencies so they can be replaced with fakes in tests.
- Avoid global state and singletons — they make tests order-dependent.
- Pure functions are your best friends: trivial to test, trivial to reason about.

---

## Pre-Finalisation Checklist

Before declaring code done, run through each item:

**Correctness**
- [ ] Edge cases covered: empty input, null/undefined, zero, max values, concurrent access
- [ ] Error paths handled explicitly — no silent failures
- [ ] Idempotency verified where the operation can be retried

**Design**
- [ ] Each function/class has a single, clear responsibility
- [ ] No duplication — concepts are defined in one place
- [ ] Layers are separated: presentation, business logic, data access
- [ ] Dependencies are injected, not constructed internally

**Readability**
- [ ] Names are self-documenting
- [ ] Logic is flat and sequential; nesting is minimal
- [ ] Comments explain *why*, not *what*
- [ ] Complex logic has been simplified or broken into well-named steps

**Robustness**
- [ ] Strict types throughout; no `any` or equivalents
- [ ] Validation happens at entry points
- [ ] Errors propagate with actionable messages

**Testability**
- [ ] Code can be tested without real I/O
- [ ] Pure functions used wherever state is not required
- [ ] No hidden side effects

---

## Refactoring Approach

When improving existing code, work in this order to avoid regressions:

1. **Understand before touching.** Read the full context. Identify what the code *actually*
   does vs. what it *should* do.
2. **Add tests first** (if none exist) to lock in current behaviour.
3. **Rename** for clarity — low risk, high readability gain.
4. **Extract** small, well-named functions from large blocks.
5. **Remove duplication** once you can see the shared concept clearly.
6. **Restructure** layers and dependencies last, once the logic is clean.
7. **Delete dead code** — don't comment it out, trust version control.

Never refactor and add features in the same commit/change.

---

## Language-Agnostic Anti-Patterns to Eliminate

| Anti-pattern | Replace with |
|---|---|
| `any` / untyped | Explicit types or generics |
| Deeply nested conditionals | Early returns / guard clauses |
| Magic numbers/strings | Named constants |
| God function (does everything) | Small, focused functions |
| Catch-and-ignore `try/catch` | Explicit error handling and propagation |
| Boolean parameter flags | Separate functions or strategy objects |
| Mutable global state | Injected, scoped dependencies |
| Comments describing *what* | Self-documenting names |
| Speculative abstraction | YAGNI — wait for the real need |

---

## Output Format

When writing or refactoring code, always deliver:

1. **The code** — clean, complete, and immediately usable.
2. **A brief rationale** — one short paragraph explaining the key design decisions and any
   notable trade-offs made.
3. **What changed** (refactoring only) — a concise before/after summary of the most
   impactful improvements.

Do not pad with boilerplate commentary. Be direct. The code should largely speak for itself.
