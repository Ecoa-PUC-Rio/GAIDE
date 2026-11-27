# Plan: Export history as CSV

> **Prerequisite:** `spec.md` approved ✓

## Architectural decisions

For each relevant decision, indicate whether it requires an ADR:

- **Sync vs. async threshold (10,000 rows):** no ADR — convention already present in other features.
- **In-memory CSV generation vs. streaming:** **ADR required** — trade-off between simplicity and robustness under load. See `docs/adr/0003-csv-streaming.md` (to be created via the `adr-writer` skill).
- **Async queue:** reuses existing infra (internal `Job Queue`); no new ADR.

## Affected components

- `src/exports/csv_exporter.py` — new CSV generation module (streaming)
- `src/exports/handlers.py` — HTTP endpoint `/api/exports/history`
- `src/exports/async_job.py` — async queue orchestration
- `src/exports/email.py` — email dispatch via MCP `_email-service`
- `tests/exports/` — tests derived from the 9 acceptance criteria
- `docs/adr/0003-csv-streaming.md` — architectural decision
- `src/ui/settings/ExportPanel.tsx` — selection and download UI

## Implementation sequence

1. **Red tests** — generate tests via `test-generator` skill from the spec
2. **ADR 0003** — record the streaming decision via `adr-writer` skill
3. **Sync download, end to end** — CSV exporter + HTTP endpoint delivering CSV inline for volumes < 10,000
4. **Async job** — queue + worker + signed-link persistence
5. **Email** — send signed link expiring in 24h
6. **UI** — export panel
7. **Verification** — all tests green; review via `code-reviewer` skill

## Testing strategy

- **Unit:** `csv_exporter` (formatting, header, UTF-8 encoding with BOM if relevant)
- **Integration:** HTTP handler in both modes (sync and async)
- **Security:** cross-tenant data leakage; unauthenticated attempts
- **Manual:** open the generated CSV in Excel/LibreOffice to validate parsing

## Implementation risks

- **Risk:** special characters (accents, commas inside fields) can break parsers — **Mitigation:** RFC 4180 quoting + tests with problematic strings
- **Risk:** signed link could be indexed by bots or leak via referrer — **Mitigation:** `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`

## Sprint contract

> Agreed before implementation; the reviewer checks each item one by one.

- [ ] Authenticated user downloads a CSV of their own history for a chosen date range — verify by: log in, Settings > Export data, pick range, download opens in Excel/LibreOffice
- [ ] Unauthenticated request is rejected — verify by: `curl -i /api/exports/history` returns `401`
- [ ] No cross-tenant data in the export — verify by: export as user A, grep the CSV for user B's records
- [ ] Volumes > 10,000 rows go async and arrive by email — verify by: trigger an export on a seeded large account, receive email, signed link works once and expires in 24h

## Definition of Done

- [ ] All 9 spec criteria have green tests
- [ ] ADR 0003 recorded and referenced in the code
- [ ] `code-reviewer` skill ran without blockers
- [ ] Human review approved
- [ ] User documentation updated (`docs/user/export.md`)
- [ ] No secrets, no hardcoded URLs
