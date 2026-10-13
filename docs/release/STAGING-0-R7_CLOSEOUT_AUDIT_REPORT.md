# STAGING-0-R7 CLOSEOUT — Git Integrity & Evidence Audit

- **Phase:** STAGING-0-R7-CLOSEOUT (read-only audit after STAGING-0-R7)
- **Date:** 2026-10-09
- **Type:** Read-only. No fixes implemented, no history/DNS/TLS/Nginx changes.
- **Analyst:** opencode agent (big-pickle)

---

## Git integrity verdict

**PASS (CONDITIONED on owner committing the two R7 deliverables).**

- Branch `staging`, HEAD `687d6b93…` (short `687d6b9`), tracking the R4
  remediation commits; worktree is **clean for tracked files**.
- The R7 code changes that were asserted to be in HEAD are confirmed present in
  commit `954dfbb`, identical to what the R7 report records.
- No unrelated or unexpected entries were swept into the two commits examined.
- The two R7 deliverables (test file + report) remain uncommitted, complete, and
  consistent with the implementation and recorded results.

---

## Check-by-check results

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Read R7 report | **PASS** | `docs/release/STAGING-0-R7_PRE_HTTPS_REMEDIATION_REPORT.md` exists (181 lines), all 14 sections present, 11-gate matrix with verdict **ACCEPTED WITH CONDITIONS**. |
| 2 | `git status --short`, branch, HEAD, history | **PASS** | Branch `staging`; HEAD `687d6b9`; only untracked entries; recent chain `687d6b9 → 954dfbb → bb32042 → d83602a → 776d4a6 …` (pull-based deployment history intact). |
| 3 | Commits `954dfbb` & `687d6b9` scope | **PASS** | See commit-by-commit findings below. No unrelated changes accidentally included. |
| 4 | Uncommitted test file + report exist/complete | **PASS** | Test file 8 test functions (85 lines), report complete; both correspond to actual implementation/results. |
| 5 | Eight CSRF tests present & reproducible | **PASS** | Collected **8** tests; run → **8 passed, 0 failed** in 0.05s. |
| 6 | Nginx compose + tracked-key findings consistent | **PASS** | `docker compose config` renders `published "8443" / target 443`; `*.pem` ignored; no key blob in object store. |
| 7 | Whether uncommitted files should be committed separately | **CONDITIONED** | Yes — commit R7 test + R7 report as a distinct commit; see recommendation below. |

---

## Commit-by-commit findings

### `954dfbb` — `fix(staging): STAGING-0-R4 remediation — blocking gates, immutable images, CSRF wiring, HR & public test fixes`
Author `Anas <Anass2018@gmail.com>`, 2026-10-09 04:04:30 +0200. 11 files, +470/−103.

R7 code changes present in this commit (verified byte-level):
- `backend/nqp_backend/settings.py`: added `parse_csrf_trusted_origins()` helper
  (lines 160–173) and `CSRF_TRUSTED_ORIGINS = parse_csrf_trusted_origins(…)`
  (line 174) — exactly the Gate-D extraction described in R7 §5.
- `deploy/staging/docker-compose.yml`: nginx `ports` `- "443:443"` →
  `- "127.0.0.1:8443:443"` plus the host-443 ownership comment — exactly the
  Gate-E change described in R7 §5.

Other files in the commit (pre-existing R4/R6 worktree state, NOT R7-invented
and consistent with R7 §3 baseline): `.github/workflows/ci.yml`,
`.github/workflows/staging.yml` (pull-based GHCR token bearer flow),
`backend/apps/hr/serializers.py` (TrainingEnrollment duplicates check),
`backend/apps/public/tests/test_public.py` (test adjustments),
`deploy/staging/.env.example`, `deploy/staging/README.md`, `deploy/staging/deploy.sh`,
`deploy/staging/nginx/staging.conf`, `frontend/package.json`.

No surprising content: the staging.yml delta is the GHCR pull/token
implementation; no `on:`/schedule/cron additions beyond the existing CI; none of
the untracked worktree artifacts (`.tmp`, `",\necho"`, `backend/afyatna`,
`.backups/`, `.dev-run/`, `frontend/src/utils/labels.ts.bak`) appear in any ref.

### `687d6b9` — `docs(staging): STAGING-0-R4 remediation report`
Author `Anas`, 2026-10-09 04:06:09 +0200. 1 file, +192:
`docs/audit/STAGING-0-R4-REMEDIATION-REPORT.md`. Documentation only; no code.
No R7 content, no unrelated changes.

Verdict: both commits are correctly scoped; the R7 code changes they carry are
the two edits documented in the R7 report and nothing else.

---

## Uncommitted test/report status

- `backend/apps/accounts/tests/test_csrf_trusted_origins.py` — untracked, 8 test
  functions, imports `nqp_backend.settings.parse_csrf_trusted_origins` which
  resolves to the **committed** helper in HEAD (worktree clean, so the test runs
  against HEAD's implementation — consistent).
- `docs/release/STAGING-0-R7_PRE_HTTPS_REMEDIATION_REPORT.md` — untracked,
  complete with all sections.
- Pre-existing untracked R5/R6 reports remain present and untouched.

---

## Verification results and exact commands

```
git branch --show-current                                   → staging
git log --format="%H %s" -1                                 → 687d6b93… docs(staging): …R4 remediation report
git status --short                                          → only untracked; no tracked modifications
git log --oneline -8                                        → 687d6b9 954dfbb bb32042 d83602a 776d4a6 f26c0aa 90bf159 8958c1b
git show --stat 954dfbb / 687d6b9                           → scoped file lists above
git show 954dfbb -- backend/nqp_backend/settings.py         → helper + CSRF_TRUSTED_ORIGINS lines confirmed
git show 954dfbb -- deploy/staging/docker-compose.yml       → "127.0.0.1:8443:443" confirmed
git ls-tree -r --name-only $ref | grep -iE "\.pem$|\.key$"  → NONE tracked in any head/tag ref
git cat-file -t d95a01af                                    → fatal: Not a valid object name (key blob absent)
git check-ignore -v deploy/ssl/privkey.pem fullchain.pem    → .gitignore:51 deploy/ssl/*.pem (both ignored)
python -m pytest apps/accounts/tests/test_csrf_trusted_origins.py --collect-only → 8 collected
python -m pytest apps/accounts/tests/test_csrf_trusted_origins.py -q            → 8 passed
docker compose config --quiet (placeholder env, temp .env removed after)        → CONFIG SYNTAX OK
docker compose config → grep port                            → published:"8443" / target:443
```

---

## Discrepancies or risks

| Finding | Severity | Notes |
|---|---|---|
| R7 code changes were folded into owner commit `954dfbb` | Low | Documented in R7 §3; worktree clean and the two edits are unambiguous inside the commit. Not a hygiene problem but mixes phase work with general remediation. |
| Full `accounts` test suite not run in R7 (timeout) | Low | R7 ran a targeted 53-test regression; this audit re-ran only the 8 CSRF tests. CI remains the source of truth for the full suite. |
| Test file carries an unused `import os` and `import pytest` | Low | Cosmetic; no behavior impact. Not corrected per read-only mandate. |
| R5 "privkey tracked in git" claim does not reproduce | Low | Revised in R7 §8; this audit independently confirms no tracked key and no key blob object. |
| No owner commit of R7 deliverables yet | Info | Blocking nothing technically; recommended next action below. |

---

## Recommended next action

1. Owner commits the two R7 deliverables **in a separate commit** from code:
   - `git add backend/apps/accounts/tests/test_csrf_trusted_origins.py docs/release/STAGING-0-R7_PRE_HTTPS_REMEDIATION_REPORT.md`
   - message e.g. `test+docs(staging): STAGING-0-R7 closeout — CSRF trusted-origins tests and report`
   - Optionally include R5/R6 release reports in the same or separate docs commit.
2. Do **not** touch `954dfbb`/`687d6b9` (no amend/rebase — history already clean).
3. M4 (HTTPS activation) remains **out of scope** and must not start until owner
   supplies the staging hostname, DNS record, and real certificate (R7 §11).

---

## Stop statement

Audit complete. All checks resolved; git integrity **PASS**, deliverables
**CONDITIONED** pending owner commit. **Stopping here.** M4 not started.