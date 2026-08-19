# ADR 0003 — Agent-agnostic layout: portable policy, per-tool bindings

- **Status:** accepted
- **Date:** 2026-08-18
- **Decision-makers:** José Menezes

## Context

GAIDE's governed layer lived entirely inside `.claude/` — briefing, skills, reviewer subagents, hooks, permissions. Only Claude Code reads that directory. A team opening the repo in Google Antigravity (or Cursor, Codex, Zed, Copilot, Gemini CLI) inherited the *documents* (specs, constitution, ADRs) but lost every skill, every reviewer, and every inline enforcement mechanism — precisely the "governed" half of the template. Meanwhile, most of that content was never Claude-specific: the skills are plain Markdown procedures, the hook logic is shell that runs anywhere, and the briefing is prose. Only the *bindings* — hook event protocol, skill registration format, permission syntax — are proprietary.

Two ecosystem facts shaped the options: `AGENTS.md` has become the open cross-tool briefing standard (read natively by Codex, Cursor, Zed, Copilot, Gemini CLI), and Antigravity reads workspace rules from `.agents/rules/*.md` and slash-invocable workflows from `.agents/workflows/*.md` — a near 1:1 match for GAIDE's skills.

## Decision

Split the repo into a **portable layer** (single source of truth) and **generated per-tool bindings**:

1. **Briefing:** `AGENTS.md` at the root is canonical. `.claude/CLAUDE.md` shrinks to an `@AGENTS.md` import; `.agents/rules/gaide.md` points Antigravity at it.
2. **Procedures:** skills move to `agents/skills/`, reviewer rubrics to `agents/reviewers/`, phrased tool-neutrally (clean-context review = subagent where supported, fresh conversation elsewhere).
3. **Enforcement logic:** hook bodies move to `scripts/` as standalone checks (`check-secrets.sh`, `check-file.sh`, `check-security.sh`, `check-clean-state.sh`) taking file args/stdin and exiting 1 on findings. `.claude/hooks/` become thin adapters translating Claude's hook payload/exit-2 protocol to those scripts.
4. **Sync:** `scripts/sync-adapters.sh` generates `.claude/skills/<name>/SKILL.md`, `.claude/agents/*.md`, and `.agents/workflows/*.md` from the sources, marks them GENERATED, and offers `--check` for CI drift detection. Generated directories are fully owned by the script.
5. **Enforcement tiers, documented honestly:** inline edit-time blocking exists only where the tool has hooks (today: Claude Code). The guaranteed floor for every agent and human is pre-commit + CI — promoted from "outer harness" to the minimum guaranteed harness. Other tools are instructed (AGENTS.md, Antigravity rules) to run the `scripts/` checks manually.
6. **Permissions and MCP:** `.claude/settings.json` stays as a Claude-only binding — the policy it enforces is already stated in the constitution and AGENTS.md ground rules, and the universal part (secrets) is enforced git-level by gitleaks. `.mcp.json` stays as the canonical MCP reference, with `docs/mcp-setup.md` mapping it to each tool's config location.

## Alternatives considered

- **Symlink `CLAUDE.md` → `AGENTS.md`:** breaks on Windows checkouts and some tools; the `@import` is explicit and portable.
- **Keep `.claude/` as source and copy outward:** inverts the dependency — the proprietary dialect would remain canonical and every other tool second-class.
- **N independent copies, no sync script:** guaranteed drift; the sync script plus CI `--check` makes divergence mechanically impossible to merge.
- **Duplicate hook logic per tool:** no other tool has hook events today, so there is nothing to duplicate into; extracting to `scripts/` gives humans and future tools a callable interface instead.

## Consequences

### Positive

- The governed layer (briefing, skills, reviews, checks) now reaches every AGENTS.md-reading tool and Antigravity, not just Claude Code.
- Skills are now registered correctly in Claude Code: the sync generates the `.claude/skills/<name>/SKILL.md` format it actually loads (the previous flat `.claude/skills/*.md` files were silently ignored).
- Enforcement checks are runnable by hand (`scripts/*.sh`), by pre-commit, by CI, and by any future tool that gains hooks.
- Consistent with the project's own thesis: the portable guarantee is a mechanism (pre-commit/CI), not an instruction.

### Negative (accepted costs)

- Generated files are committed; contributors must edit sources and re-run `scripts/sync-adapters.sh` (CI blocks drift, but the loop is extra friction).
- Inline edit-time enforcement remains Claude Code-only; in other tools the first mechanical gate is at commit time.
- `.claude/skills/`, `.claude/agents/`, and `.agents/workflows/` cannot hold hand-written tool-specific extras — the sync script deletes anything without a source in `agents/`.

### Neutral

- `.claude/settings.json` (permissions) and `.claude/hooks/` remain hand-maintained Claude bindings; equivalents for other tools are added if/when those tools grow the capability.

## Constitution adherence

Honors Principle 5 (this ADR), Principle 7 (single concern: portability restructure), and the harness-expiry note (harness re-examined as the tool landscape shifts). Principles 6, 9, 10 keep their mechanical enforcement — relocated, not weakened: the same checks run from `scripts/`, and the commit/CI layer is unchanged.

## Future review

Revisit when: (a) other tools ship inline hook/permission mechanisms worth binding to; (b) the AGENTS.md standard or Antigravity's `.agents/` conventions change; (c) a skills/workflow interchange format emerges that makes the sync script unnecessary.
