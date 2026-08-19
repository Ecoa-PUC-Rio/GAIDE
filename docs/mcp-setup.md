# Connecting the project's MCP servers in your tool

`.mcp.json` at the repo root is the **canonical reference** for the MCP servers this project uses — which servers, which commands, which env vars. The MCP protocol is an open standard, but each tool stores its configuration in its own place, so use `.mcp.json` as the source and mirror the entries you need:

| Tool | Where MCP servers are configured |
| --- | --- |
| **Claude Code** | Reads `.mcp.json` natively — nothing to do. Approve the servers when prompted, and enable the disabled ones by removing the leading `_` from their name. |
| **Google Antigravity** | UI: the MCP store / "Manage MCP servers" panel (Agent settings). Add each server's command, args, and env from `.mcp.json`. |
| **Cursor** | `.cursor/mcp.json` in the repo (same JSON shape) or Cursor Settings → MCP. |
| **Codex CLI** | `~/.codex/config.toml`, `[mcp_servers.<name>]` sections mirroring command/args/env. |
| **Zed** | Settings → `context_servers`, mirroring command/args/env. |

Notes:

- Servers named with a leading `_` in `.mcp.json` are disabled examples — enable by renaming, then mirror.
- Env vars like `${GITHUB_TOKEN}` come from your local environment; never write real values into any of these config files (Constitution Principle 6).
- The `_playwright` server is what the `verifier` skill uses to exercise web UIs end-to-end; enable it before running verification on a web project.
