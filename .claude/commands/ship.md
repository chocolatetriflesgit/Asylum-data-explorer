---
description: Safely branch, commit, push, and open a PR — with pre-flight checks that stop before anything can go wrong between local and hosted.
---

# /ship — safe PR flow

You are shipping the current work as a pull request for a **non-technical user on Windows** who uses **GitHub Desktop**, has **no `gh` CLI**, and merges via **Squash-and-merge on github.com**. Follow this procedure exactly and in order. Do **not** improvise git commands outside it. Narrate each step in plain English.

The golden rule this command exists to protect:

> Work only ever flows **one way**: a branch → push → PR → Squash-and-merge on github.com → local `main` catches up on its own. Local `main` is a read-only mirror. Nothing is ever committed or merged directly onto local `main`.

If any **STOP** condition below is hit, halt and explain it in plain English — do not work around it.

---

## Step 1 — Pre-flight (never skip)

```bash
git fetch origin --quiet
git rev-list --left-right --count origin/main...main
```

Read the two numbers as `LEFT<TAB>RIGHT`:

- **RIGHT > 0** — local `main` has commits that GitHub doesn't. This is the dangerous state (something landed on local `main` directly). **STOP.** Explain: "Your local main has drifted ahead of GitHub's. We should not branch from it. The fix is usually `git fetch origin && git reset --hard origin/main`, but that's destructive so I'll wait for your go-ahead." Do not proceed until resolved.
- **LEFT > 0, RIGHT = 0** — local `main` is simply behind GitHub. Fine. Branches below are cut from `origin/main`, so this doesn't matter.
- **0  0** — perfectly in sync. Ideal.

## Step 2 — Establish a safe branch

```bash
git branch --show-current
git status --porcelain
```

- **If currently on `main`:** never commit here. Create a branch cut from the freshly-fetched hosted main:
  ```bash
  git switch -c claude/<short-kebab-topic> origin/main
  ```
- **If already on a `claude/*` branch** (e.g. running inside a worktree): stay on it. Confirm it descends from current `origin/main`; if it's badly behind, tell the user and offer to rebase — don't silently force anything.

Pick `<short-kebab-topic>` from the change (e.g. `claude/fix-yaxis-labels`).

## Step 3 — Build if needed, then commit

- If any `src/*.jsx` changed, **re-bundle first** (CI rejects a stale `index.html`):
  ```bash
  python scripts/bundle.py
  ```
- Stage and commit with a **Conventional Commits** message that leads with *why*. **ASCII only** — no em-dashes, curly quotes, or other non-ASCII (they break the PR step and read badly in history). Use a hyphen `-`, not `—`.
  ```bash
  git add -A
  git commit -m "type(scope): why-first summary in plain ASCII"
  ```

## Step 4 — Push from here

Push the branch directly from the current checkout (this is the reliable path — GitHub Desktop chokes when a branch is checked out in a worktree with `'<branch>' is already used by worktree at ...`):

```bash
git push -u origin <branch-name>
```

If the push is rejected, read the message and match it to [Known errors](#known-errors) below before retrying.

## Step 5 — Open the PR (ASCII-safe, no gh)

`gh` is unavailable and `curl`/Python fail TLS against `api.github.com` on this machine; only `git.exe` and PowerShell reach GitHub. Use the working recipe:

1. Write the PR title + body to a temp JSON file, then **re-encode as pure ASCII** so PowerShell 5.1 doesn't mangle it (non-ASCII bodies return `400 Problems parsing JSON`):
   ```python
   import json; d = {"title": "...", "head": "<branch>", "base": "main", "body": "..."}
   json.dump(d, open(r"<scratch>/pr.json","w",encoding="ascii"), ensure_ascii=True)
   ```
2. Get a token from git's credential store (works from **bash**, not PowerShell):
   ```bash
   printf "protocol=https\nhost=github.com\n" | git credential fill | grep '^password=' | cut -d= -f2-
   ```
3. POST it via PowerShell's `Invoke-RestMethod`, passing the token and JSON path as env vars.

If any part of this fails, fall back to giving the user the **compare URL** the push printed (`https://github.com/<owner>/<repo>/pull/new/<branch>`) so they can open the PR by hand.

## Step 6 — Hand off

- Give the user the **PR link** and one line: "Open this, review, then click **Squash and merge**."
- Remind them: after it merges, local `main` will catch up on its own the next time it fetches — they don't need to touch local `main`.
- Do **not** merge the PR yourself.

---

## Known errors

- **`'<branch>' is already used by worktree at ...`** (in GitHub Desktop) — a Claude worktree owns the checkout. Don't fix it in Desktop; just `git push -u origin <branch>` from the checkout (Step 4). Unambiguous — no need to ask.
- **Push of `main` rejected: "must not contain merge commits"** — something merged onto local `main`. Safe fix is `git fetch origin && git reset --hard origin/main`, but it's destructive: **ask first**. Prevent recurrence by setting GitHub Desktop's pull behaviour to **Rebase**.
- **Push race / non-fast-forward on the branch** — a data-update commit or another PR landed. `git fetch origin` and rebase the branch onto the new `origin/main`, then push again.
