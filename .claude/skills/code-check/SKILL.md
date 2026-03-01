---
name: code-check
description: Run type-check and lint:eslint after code changes, auto-fix errors up to 5 attempts each, report to user if still failing. Trigger proactively after every code edit, refactor, or new feature — also when user mentions type errors, tsc, lint, or eslint.
---

# Code Check Skill

After making code changes, always run both type checking and linting before considering the task done.
The two checks are independent — run them in sequence, fixing each in turn.

---

## Phase 1 — TypeScript Type Check

### Step 1 — Run

```bash
pnpm type-check
```

If clean (exit code 0), move on to Phase 2.

### Step 2 — Fix errors

TypeScript errors follow this format:

```
src/path/to/file.ts(line,col): error TSxxxx: <message>
```

For each error:
1. Read the file at the reported location
2. Understand the root cause — don't just cast away the problem
3. Apply a targeted fix

Common fixes:
- **Type mismatch** — update the type annotation or the value at the call site, whichever is wrong
- **Property does not exist** — add the property to the interface if genuinely missing, or fix the access path
- **Possibly undefined** — add a null check, narrow the type, or mark the field optional
- **Argument type mismatch** — check the function signature vs. the call site, fix the right side
- **Missing return type** — infer from implementation and annotate

Avoid these shortcuts — they hide real problems:
- `as any` (unless surrounding code already uses `any` intentionally)
- `// @ts-ignore` or `// @ts-expect-error`
- Widening types to `unknown` just to silence the error

### Step 3 — Retry loop (max 5 attempts)

After fixing, re-run `pnpm type-check`. Repeat up to **5 attempts total**.

- Clean → move on to Phase 2
- Still errors → fix and retry
- After 5 attempts still failing → report (see Escalation)

---

## Phase 2 — ESLint

### Step 1 — Run

```bash
pnpm lint:eslint
```

This already applies `--fix` automatically, so many issues self-resolve on the first run.
If the output is clean, you're done — report overall success.

### Step 2 — Fix remaining errors

ESLint errors that survive `--fix` cannot be auto-repaired and require code changes. They appear as:

```
/abs/path/to/file.ts
  line:col  error  <message>  rule-name
```

Read the flagged file, understand the rule violation, and fix the underlying code.
Common examples:
- **no-unused-vars** — remove the unused variable or use it
- **vue/no-unused-components** — remove the component import/registration or use it in the template
- **@typescript-eslint/...** — follow the specific rule's intent, don't disable it

### Step 3 — Retry loop (max 5 attempts)

After each manual fix, re-run `pnpm lint:eslint`. Repeat up to **5 attempts total**.

- Clean → report overall success (both phases passed)
- Still errors → fix and retry
- After 5 attempts still failing → report (see Escalation)

---

## Escalation

If either phase is still failing after 5 attempts, **stop and report**:

```
[type-check / lint] still failing after 5 fix attempts. Remaining errors:

<paste full error output>

Please review these manually — they may require broader context or architectural decisions.
```

Do not keep looping silently.

---

## Tips

- Fix all errors in a single file with one Edit call to avoid partial states
- If fixing one file causes new errors elsewhere, handle them in the same attempt before re-running
- If the same error keeps recurring after a fix, you addressed the symptom not the cause — re-read more carefully
