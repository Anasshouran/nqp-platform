# Git Safety Rules

**Origin:** Incident 2026-11-12 (M5-E-ب) — accidental `git reset --mixed` + `git checkout -- .` + `git clean -fd` destroyed working tree and deleted 2 untracked paths. No critical loss confirmed, but process was destructive and avoidable.

## Forbidden without explicit human approval

### `git clean -fd` — **BANNED project-wide**

No exceptions. If you need to remove untracked files:

1. `git clean -fdn` (dry-run) — review EVERY path
2. Move files you're unsure about to `/tmp/git-clean-review/` first
3. Document each deleted path in commit message or PR description

### `git reset --hard` / `--mixed`

**Required before:**
1. `git branch backup-$(date +%Y%m%d-%H%M)` (preserve current state)
2. `git stash` if there are uncommitted changes
3. `git status` captured in the commit message

### `git checkout -- .` / `git restore .`

**Required before:**
1. `git stash` or `git branch backup-...`

### Any `git` command that:
- Deletes untracked files
- Rewrites history (rebase, reset, amend on pushed branches)
- Changes branch state mid-task

**Rule:** if a git command deletes anything without `-n`/dry-run first, **STOP**.

## Recovery protocol (if something was deleted)

1. **STOP** — do not run more git commands
2. `git fsck --lost-found` — check for dangling objects
3. Check editor history (`~/.config/Code/User/History`, `Cursor/User/History`)
4. Check Docker volumes (`docker ps`, `docker exec <c> find /app`)
5. Check filesystem snapshots (Time Machine, Timeshift, APFS)
6. **Before `git gc`**: dangling objects live ~30 days; save them if unsure

## Incident log

### 2026-11-12 — M5-E-ب

**Command chain:** `git reset --mixed 783fa5f` → `git checkout -- .` → `git clean -fd`

**Lost:**
- `backend/apps/shipping/management/` (untracked; skeleton/scratch)
- `frontend/__tests__/` (untracked; skeleton/scratch)

**Not lost:**
- All commits (reflog intact, `1a06adb` original M5-E-ب preserved)
- M5-E-ب current state (845 tests)

**Recovery:** Owner confirmed both paths were scratch, not WIP. No action needed.

**Lesson:** dry-run first (`-n`), backup branch second, destructive command third. Never the reverse.

### Template for future incidents

```markdown
### YYYY-MM-DD — <branch/context>

**Command chain:** ...
**Lost:** ...
**Not lost:** ...
**Recovery:** ...
**Lesson:** ...
```
