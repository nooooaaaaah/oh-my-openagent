# oh-my-openagent — Architecture

This is a plugin for [OpenCode](https://opencode.ai). It adds agents, tools, hooks, MCP servers, and skills. Everything is TypeScript, built with Bun.

## Why This Structure

OpenCode loads plugins as ESM bundles: you export `{ id, server }` where `server(input)` returns a `Hooks` object — functions OpenCode calls at specific times. The whole codebase is organized around that contract:

```
src/
  index.ts              # Entry: exports { id: "oh-my-openagent", server }
  create-managers.ts    # Runtime managers (background tasks, tmux, etc.)
  create-tools.ts       # Tool registry (what the AI can call)
  create-hooks.ts       # 44 lifecycle hooks in 5 tiers
  plugin-interface.ts   # Wires managers + tools + hooks into OpenCode's Hooks format
  agents/               # 11 agent definitions
  hooks/                # 44 lifecycle hooks
  tools/                # ~25 tool implementations
  features/             # Feature modules (background-agent, skill-loader, etc.)
  shared/               # Cross-cutting utilities
  config/               # Zod v4 config schema
  cli/                  # CLI: install, doctor, run, mcp-oauth
  plugin/               # OpenCode hook handler implementations
  mcp/                  # Built-in MCP servers
  plugin-handlers/      # Config loading pipeline
```

**Why so many files?** OpenCode plugins are monolithic — everything loads at startup. Without discipline it becomes spaghetti. Conventions enforce modularity: no catch-all files, 200-LOC soft limit, barrel exports, factory pattern, kebab-case.

## Why Agents & Categories

Different LLM tasks need different models. The category system maps task complexity to model capability:

| Category | Used For |
|----------|----------|
| quick | grep, glob, simple reads |
| unspecified-low | moderate tasks |
| unspecified-high | complex reasoning |
| deep | architecture-level analysis |
| ultrabrain | hardest problems |
| artistry | creative/writing |
| visual-engineering | vision tasks |
| writing | prose/generation |

Agents (Sisyphus, Hephaestus, etc.) are personas with a default category, model, and system prompt. The `call_omo_agent` tool dispatches to agents; `delegate-task` maps tasks to categories.

## Why Background Tasks

Long-running work shouldn't block the main chat. Background slots give parallelism — configurable per model/provider with FIFO queuing and circuit breakers.

## Why Hashline Edit

Every Read output is tagged with content hashes. Edit validates those hashes before applying. Stale hash = file changed since you read it = reject. Prevents overwriting outdated content.

## Why MCP Tiers

| Tier | What | Why |
|------|------|-----|
| 1. Built-in | Remote MCPs (websearch) | Always available |
| 2. Claude Code | `.mcp.json` files | Standard CC config, env var expansion |
| 3. Skill-embedded | SKILL.md YAML frontmatter | Skills declare their own MCP servers |

Three tiers load independently, isolated per-session for security.

## Initialization Flow

```
serverPlugin(input, options)
  installAgentSortShim()        # Canonical agent ordering
  initConfigContext()           # Detect config layout
  detectExternalSkillPlugin()   # Warn on conflicts
  injectServerAuthIntoClient()  # Wire auth into SDK client
  loadPluginConfig()            # JSONC → merge → Zod validate → migrate
  createManagers()              # Tmux, Background, SkillMcp, ConfigHandler
  createTools()                 # SkillContext + Categories + ToolRegistry
  createHooks()                 # Session + ToolGuard + Transform + Continuation + Skill
  createPluginInterface()       # Wire everything into Hooks format
```

## Architecture Invariants

- **Canonical agent order:** Sisyphus → Hephaestus → Prometheus → Atlas (enforced by sort shim)
- **Hashline edit pairing:** Read tags with hashes; edit rejects on mismatch
- **5-tier hooks:** Session (20) + ToolGuard (12) + Transform (3) + Continuation (7) + Skill (2) = 44
- **Per-session MCP isolation:** Tier-3 clients keyed by `sessionID:skillName:serverName`
- **Two fallback systems:** `model-fallback` (proactive) vs `runtime-fallback` (reactive)

## Conventions

- **Runtime:** Bun only. Never npm/yarn/pnpm.
- **TypeScript:** strict mode, ESNext, bundler moduleResolution, bun-types
- **Tests:** Bun test, co-located `*.test.ts`, given/when/then style
- **Factory pattern:** `createXXX()` for everything
- **File naming:** kebab-case, no catch-all files
- **Imports:** relative within module, barrel across modules. No path aliases (`@/`)
- **Config:** JSONC with comments, snake_case keys, Zod v4 validation
- **No emojis in code**
- **No `as any`, `@ts-ignore`, `@ts-expect-error`**
