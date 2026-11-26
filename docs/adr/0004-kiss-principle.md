# ADR 0004 — KISS becomes Principle 11 of the constitution

- **Status:** accepted
- **Date:** 2026-11-26
- **Decision-makers:** José Menezes

## Context

Simplicity already appeared in GAIDE, but only as *advice*. `AGENTS.md` carried a "Simplicity first" bullet among the Karpathy-inspired operating standards, the session loop said "make the smallest possible change", and the code-reviewer rubric had a soft `(G) Maintainability` item about clear names and single-responsibility functions. None of it was enforceable: a reviewer who wanted to reject a plugin registry built for one plugin had no principle to name, and an agent that produced one had broken no rule.

That gap matters more in AI-assisted development than it did before. Generating code is now nearly free, while reading it costs exactly what it always did. Asked for a feature, a generative agent reliably over-delivers — an interface with a single implementation, three configuration flags nobody requested, a layer of indirection that only forwards calls, a dependency pulled in to save a few lines. Each addition is individually plausible, which is what makes it hard to reject in review; collectively they are the maintenance bill of the project.

This is the same structural problem as Principles 9 and 10. The template's own thesis is that an instruction is weaker than a principle, and a principle is weaker than a mechanism. Simplicity was sitting at the weakest tier.

## Decision

Promote KISS from an operating standard to a constitutional principle, and give review a name for it:

1. **`specs/constitution.md` gains Principle 11 — "KISS: the simplest thing that satisfies the spec".** It enumerates the concrete patterns rejected at review (abstraction with a single caller, unrequested configuration option, forwarding-only layer, generality absent from the spec, dependency replacing a few lines of code) and states the escape hatch: the reason is written in the plan's trade-offs or in an ADR, not left implicit in the diff. It also draws the boundary against Principle 7 — Principle 7 bounds *how many concerns* a change carries, Principle 11 bounds *how much machinery* it carries.
2. **The code-reviewer rubric gains teeth.** `agents/reviewers/code-reviewer.md` item `(G)` becomes "Simplicity and maintainability" and instructs the reviewer to name the simpler shape it expected, rather than to note a vague preference.
3. **The briefing and the Antigravity rules state it as a must.** `AGENTS.md` adds it to the mandatory pre-change list, and `.agents/rules/gaide.md` to the non-negotiables. The existing "Simplicity first" bullet stays but now points at the principle, so the two readings cannot drift apart.
4. **The attribution is honest.** The constitution attributes KISS to Kelly Johnson at Lockheed's Skunk Works, with the "attributed" hedge the historical record warrants — the variant "keep it short and simple" predates him, appearing in print in 1938.

## Alternatives considered

- **Leave it as an operating standard.** Rejected: the whole point of the constitution is that the things worth keeping are the ones an agent cannot quietly decline. Advice is declined silently every session.
- **Add a mechanical gate (complexity metrics, a diff-size limit, a lint rule).** Rejected: cyclomatic complexity and line counts do not distinguish a necessary state machine from a speculative plugin registry, and the gate's false positives would train people to bypass it. Simplicity is a judgment call; the right mechanism for a judgment call is the clean-context reviewer, which already exists.
- **Fold it into Principle 7 (atomic changes).** Rejected: the two fail independently. A change can be perfectly atomic and badly over-built, and conflating them would weaken both.
- **Write it as YAGNI rather than KISS.** Rejected: YAGNI covers unrequested features, which Principle 1 (spec before code) and the spec-adherence rubric item already catch. The gap is complexity inside work that *was* requested, which is what KISS names.

## Consequences

### Positive

- A reviewer can now block avoidable complexity by citing a principle, and the author's recourse is to simplify or to write the reason down — both better outcomes than the argument the rubric used to produce.
- Over-engineering costs the agent something, as the other principles already do: justifying it requires a plan entry or an ADR.
- The "write the reason down" escape hatch turns a rejected simpler alternative into a durable record, which is what the plan's trade-off section was for.
- Smaller, simpler diffs make the rest of the constitution cheaper to honor — easier to spec, to test, and to review before approving.

### Negative (accepted costs)

- "Simplest thing that satisfies the spec" is a judgment call, so reviews will occasionally disagree about it. The principle narrows the argument to named patterns, but it does not eliminate it.
- The principle can be misread as a ban on all abstraction. It is not: it asks for a written reason, and the reason is often obvious and brief.
- Projects generated before this change keep ten principles until they re-run `gaide init`; the constitution is project-owned, so the eleventh does not arrive on its own.
