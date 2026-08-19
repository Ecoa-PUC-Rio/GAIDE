---
name: spec-writer
description: Writes specs in the Spec-Driven Development (SDD) format — walks the user through spec → plan → tasks before any code. Use when the user asks for a new feature, a meaningful behavioral change, or when no corresponding spec exists in the specs/ directory.
---

# Skill: spec-writer

## When to activate
- The user asks for a new feature
- The user describes a desired behavior without referencing implementation
- No `specs/<feature>/spec.md` exists for it
- There is ambiguity about what needs to be built

## Before starting
1. Read `specs/constitution.md` to know the non-negotiable principles.
2. Check whether a related spec already exists in `specs/`.
3. Confirm with the user: "I'll write the spec first, without touching code. OK?"

## Structure of the spec to produce

Create the file at `specs/<feature-slug>/spec.md` following this template:

```markdown
# Spec: <Feature name>

## Context
Why this feature exists. What problem it solves. For whom.

## Expected behavior
Executable description of what the application should do. Does not include *how*.

### Use cases
1. **Main case:** [given/when/then]
2. **Alternative case:** [given/when/then]
3. **Error case:** [given/when/then]

## Acceptance criteria
Verifiable list (each item testable):
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] ...

## Out of scope
Explicitly list what this feature does NOT do.

## Security considerations
Data sensitivity, authentication/authorization, abuse cases. "None" is acceptable; silence is not. Each abuse case becomes a negative acceptance criterion.

## Dependencies
Other specs, systems, or MCPs required.

## Constitution adherence
Confirm which constitution principles apply and how they will be honored.
```

## Workflow

### Step 1 — Spec
Drive a conversation to fill in the spec. Don't infer behaviors that weren't stated.

### Step 2 — Plan
Once the spec is user-approved, create `specs/<slug>/plan.md` with:
- Architectural decisions needed (if relevant, suggest creating an ADR via `adr-writer`)
- Implementation sequence (task order)
- Identified risks

### Step 3 — Tasks
Once the plan is approved, create `specs/<slug>/tasks.md` decomposing into atomic tasks (~30 min each):
- [ ] Task 1 — concrete description, affected files, completion criterion
- [ ] Task 2 — ...

### Step 4 — Human validation
Pause and ask for explicit human approval before starting implementation.

## Principles

- **Don't code in this skill.** This skill produces documents, not code.
- **Don't invent requirements.** If something is ambiguous, ask the user.
- **Respect the constitution.** If the feature violates a principle, flag it before proceeding.
- **Atomicity.** Small, independent tasks make assisted implementation easier.

## Expected output
Three files in `specs/<feature-slug>/`:
- `spec.md`
- `plan.md`
- `tasks.md`

With explicit user confirmation at each step.
