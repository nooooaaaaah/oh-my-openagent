# src/features/ — 19 Feature Modules

Standalone feature modules wired into `plugin/` layer. Each self-contained with own types, implementation, and co-located tests.

## MODULE MAP

| Module | Files | Purpose |
|--------|-------|---------|
| **background-agent** | 47 | Task lifecycle, concurrency (5/key), polling, circuit breaker |
| **opencode-skill-loader** | 33 | YAML frontmatter skill discovery from 4 scopes |
| **tmux-subagent** | 34 | Tmux pane management, session orchestration |
| **mcp-oauth** | 18 | OAuth 2.0 + PKCE + DCR for MCP servers |
| **skill-mcp-manager** | 18 | Tier-3 MCP client lifecycle per session |
| **claude-code-plugin-loader** | 16 | Unified CC plugin discovery (commands, agents, skills, hooks, MCPs) |
| **builtin-skills** | 17 | 9 built-in skill files (git-master, playwright, review-work, etc.) |
| **builtin-commands** | 11 | Command templates: refactor, init-deep, handoff, etc. |
| **claude-tasks** | 7 | Sisyphus task schema + atomic file storage |
| **claude-code-mcp-loader** | 11 | Tier-2 MCP loader: `.mcp.json` parse + `${VAR}` expansion |
| **context-injector** | 6 | AGENTS.md/README.md injection into session |
| **run-continuation-state** | 5 | Persistent state for `oh-my-opencode run` |
| **hook-message-injector** | 5 | System message injection helper |
| **boulder-state** | 5 | Persistent state for boulder/multi-step ops |
| **task-toast-manager** | 4 | Task progress notifications |
| **tool-metadata-store** | 3 | Tool execution metadata cache |
| **claude-code-session-state** | 3 | Subagent session state tracking |
| **claude-code-command-loader** | 3 | Load `/commands` from `.opencode/commands/` |
| **claude-code-agent-loader** | 3 | Load agents from `.opencode/agents/` |

## KEY MODULES

### background-agent
Core orchestration engine:
- States: `pending → running → completed | error | cancelled | interrupt`
- Concurrency: per-key limits via `ConcurrencyManager` (FIFO queue)
- Circuit breaker: automatic failure detection and recovery

### opencode-skill-loader
4-scope skill discovery (project > opencode > user > global):
- YAML frontmatter parsing from SKILL.md files
- Priority deduplication, provider gating

### builtin-skills
Skills: git-master, playwright, playwright-cli, dev-browser, review-work, ai-slop-remover, frontend-ui-ux. Browser variant selected by `browser_automation_engine` config.
