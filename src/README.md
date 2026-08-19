# src/

Project source code. This directory is empty in the template by design — the **real content emerges from specs**, not from pre-existing code.

## Convention

Recommended structure per project:

```
src/
├── <domain-1>/        Domain module
│   ├── __init__.py
│   ├── models.py
│   ├── service.py
│   └── handlers.py
├── <domain-2>/
└── shared/            Shared utilities
```

## Principle

Before creating any file here, **there must be an approved spec** at `../specs/<feature>/spec.md`. See constitution, Principle 1.

## How to start

Use the `spec-writer` skill (`agents/skills/spec-writer.md`) or follow the SDD flow manually via `../specs/README.md`.
