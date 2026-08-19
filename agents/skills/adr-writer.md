---
name: adr-writer
description: Records Architecture Decision Records (ADRs) in the Michael Nygard format. Use when a relevant architectural decision is made (technology choice, structural pattern, significant trade-off) and needs to be persisted with its context and consequences.
---

# Skill: adr-writer

## When to activate
- Technology choice (database, framework, significant library)
- Structural pattern adopted (authentication, observability, error handling)
- Significant trade-off (chose X over Y because Z)
- A reverted or superseded decision (create a new ADR marking the previous one as `superseded`)

## Before starting
1. List existing ADRs in `docs/adr/`.
2. Determine the next sequential number (4 digits, leading zero).
3. Confirm with the user: "I'll record this decision as ADR XXXX. OK?"

## Template (adapted Michael Nygard format)

Create file `docs/adr/NNNN-title-in-kebab-case.md`:

```markdown
# ADR NNNN — <Short descriptive title>

- **Status:** proposed | accepted | rejected | superseded by ADR XXXX
- **Date:** YYYY-MM-DD
- **Decision-makers:** [names]

## Context

The problem, constraints, requirements. What made this decision necessary. Prior state.

## Decision

What was decided. Present tense: "We will use X."

## Alternatives considered

- **Option A:** pros, cons, reason for rejection.
- **Option B:** ...

## Consequences

### Positive
- ...

### Negative (accepted costs)
- ...

### Neutral
- ...

## Constitution adherence

Which constitution principles this decision honors or tensions.

## Future review

When should this decision be revisited? Under what signals?
```

## Principles

- **ADR is immutable.** Decisions change via a new ADR that marks the previous one `superseded`. Do not edit accepted ADRs.
- **Short is good.** An overly long ADR signals an undercooked decision.
- **Honest about costs.** List the negative consequences candidly; an ADR with no costs is suspicious.
- **Present context.** Whoever reads this in 2 years needs to understand why this was chosen.

## Expected output
One versioned file `docs/adr/NNNN-title.md`.
