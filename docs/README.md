# Project documentation

```
docs/
├── getting-started.md   First feature, step by step — start here
├── mcp-setup.md         Connecting the MCP servers in each tool
├── adr/                 Architecture Decision Records (use the adr-writer skill)
├── assets/              README images; `python3 docs/assets/render.py` regenerates them
└── user/                (optional) End-user documentation
```

## ADRs

ADRs live in `adr/` as `NNNN-title-in-kebab-case.md`. They are immutable once accepted. To create one, use the `agents/skills/adr-writer.md` skill.

ADRs in this template:
- (none by default — generated as the project evolves)

## Conventions

- ADRs and docs in English (default)
- Standard Markdown; no proprietary extensions
