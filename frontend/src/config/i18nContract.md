# i18n Contract — AFYATNA | NQP Frontend (Wave 1)

## Status

Adopted in UI/UX Phase 2B Wave 1. This is an **explicit, minimal contract**, not a
full translation project.

## Realities observed in the codebase (evidence)

- **No i18n library** is used (`i18next`, `react-intl`, etc. are absent from
  `package.json`). No translation files/locale bundles exist.
- The **public layout shell** (`src/components/layouts/PublicLayout.tsx`) owns the
  only language mechanism: a `'ar' | 'en'` state, a `tl()` lookup into the static
  `UI_STRINGS` map (~112 keys), `document.documentElement.lang`/`dir` switching, and
  `localStorage['nqp_lang']` persistence.
- **`UI_STRINGS` only covers navigation, footer, and shared chrome labels.** Public
  page *body* content (articles, notices, disease guides, travel requirements, etc.)
  is authored in Arabic and is **not** translated in English mode.
- **Staff / operational area has no global language toggle.** `LayoutChrome` and
  `GenericRoleLayout` render no switch; operational pages are Arabic-primary.
- `AssistantFab` exposes its own widget-level language toggle that only affects the
  in-page assistant chat (not platform chrome).

## Contract

### Public / Traveler

- **Arabic** is the primary authored content language.
- **English** is partially supported: the chrome shell (nav/footer/header) is
  translatable via `UI_STRINGS`; page body content remains Arabic in English mode.
- The language switch is **truthful about its scope**: it toggles shell/navigation
  chrome, not page content. We do **not** claim full English page content.

### Staff / Operational

- **Arabic-primary by design.** No staff global language toggle is offered, so there
  is no misleading "English" control in operational flows.

## Rules

1. **No new dependency** may be added to implement i18n without explicit approval.
2. Do **not** add a second competing i18n abstraction; keep `tl()` + `UI_STRINGS`
   as the single chrome-translation mechanism.
3. Chrome strings that are translatable belong in `UI_STRINGS` in `PublicLayout`.
4. Domain/clinical terminology must not be translated ad hoc without an approved
   terminology map.
5. If a page would show an English toggle while remaining materially Arabic-only at
   the content level, prefer **no toggle** or a scoped toggle labelled for the
   shell — never advertise unsupported bilingual content.

## Deferred

Full English translation of public page content and staff surfaces is outside this
Wave and would require an approved terminology map and a translation strategy.