---
name: security-reviewer
description: Security review of the current diff (or PR) by a clean-context reviewer — logic-level flaws, authz reasoning, abuse-case coverage, and scanner-suppression audit. Use for changes touching auth, sensitive data, external input, or new dependencies, or when the user asks for a security review.
---

# Skill: security-reviewer

## Why this exists alongside the scanners

The hooks and CI already run semgrep, gitleaks, and osv-scanner — they catch *pattern-level* flaws. This review catches what scanners structurally cannot: authorization logic (IDOR, tenant isolation), abuse cases from the spec, and diffs that quietly disarm the scanners themselves. Like `code-reviewer`, it runs in a **clean context** — a reviewer following the rubric in `agents/reviewers/security-reviewer.md` that sees only the diff and the governing documents. In Claude Code this is the `security-reviewer` subagent; in tools without subagents, open a **fresh conversation/agent** given only the rubric and the brief below. Your job in this skill is orchestration, not judgment.

## When to activate

- The diff touches authentication, authorization, session handling, or crypto
- The diff handles sensitive data (PII, financial, credentials) or new external input
- A new dependency is introduced
- A scanner finding was suppressed or a scanner config changed
- The user explicitly asks for a security review

## Playbook

### 1. Identify the review scope

```bash
git diff --staged   # if anything is staged
git diff            # otherwise, working tree
```

For an open PR, use `gh pr diff <number>`.

### 2. Locate the governing documents

- `specs/constitution.md` (Principles 6 and 10 are the security anchors)
- The feature's `specs/<feature>/spec.md` — its **Security considerations** section is the review contract
- Relevant ADRs in `docs/adr/`

### 3. Spawn the reviewer with a minimal brief

Launch the clean-context reviewer (the `security-reviewer` subagent in Claude Code; elsewhere, a fresh conversation pointed at `agents/reviewers/security-reviewer.md`). Pass **only**:

- How to collect the diff (the exact command from step 1)
- The document paths from step 2

Do **not** pass: summaries of the implementation conversation, assurances about which parts are safe, or justifications for suppressions. If a suppression needs the author's private context to look legitimate, that is a finding.

### 4. Deliver the report

Present the subagent's report to the human **verbatim** — do not soften blockers, do not pre-answer findings. The human decides what to fix, dismiss, or justify.

## Expected output

The subagent's structured Markdown report. **Do not commit nor apply changes** — this flow is read-only and advisory.
