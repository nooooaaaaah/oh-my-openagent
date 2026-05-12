# oh-my-openagent — Personal OpenCode Plugin

This is a plugin for [OpenCode](https://opencode.ai), the CLI for AI coding agents.
It extends OpenCode with custom agents, tools, lifecycle hooks, and an MCP gateway —
all the "batteries included" stuff you'd otherwise have to wire up by hand.

## WHY THIS STRUCTURE?

OpenCode loads plugins as ESM bundles with a specific API: you export `{ id, server }`
where `server(input, options)` returns a `Hooks` object. The Hooks object has keys like
`config`, `tool`, `chat.message`, `event`, etc. — each is a function OpenCode calls at
the right time.

The entire codebase is organized around that contract:

```
src/
  index.ts              # Plugin entry: default export { id: "oh-my-openagent", server }
  create-managers.ts    # Creates runtime managers before hooks/tools
  create-tools.ts       # Builds the tool registry
  create-hooks.ts       # Composes all hooks into 5 tiers
  plugin-interface.ts   # Wires managers + tools + hooks into OpenCode's Hooks format

  config/               # Config schema (Zod v4). Defines what goes in oh-my-openagent.jsonc
  agents/               # 11 agent definitions (Sisyphus, Hephaestus, Prometheus, etc.)
  hooks/                # ~44 lifecycle hooks (things that happen before/after tool calls, etc.)
  tools/                # ~25 tool implementations (grep, glob, LSP, background_task, etc.)
  features/             # Feature modules (background-agent, skill-loader, tmux, etc.)
  shared/               # Cross-cutting utilities (logger, model resolution, config loading)
  cli/                  # CLI: install wizard, doctor, run, mcp-oauth
  mcp/                  # Built-in remote MCP servers (websearch, etc.)
  plugin-handlers/      # Config loading pipeline
  plugin/               # OpenCode hook handler implementations + test
```

### Why so many files (1300+ source files)?

OpenCode plugins are monolithic by nature — everything loads at startup. Without
discipline, the whole thing becomes spaghetti. The conventions enforce modularity:

- **No catch-all files** (`utils.ts`, `helpers.ts`, `service.ts` are banned)
- **~200 LOC soft limit per file**
- **Barrel exports** (`index.ts` re-exports) for every module
- **Factory pattern** (`createXXX()`) for everything
- **kebab-case** file/directory names

This means every concern gets its own file, which keeps things navigable but explodes
file count.

### Why the agent/category system?

Different LLM tasks need different models. You don't use GPT-4o for a quick grep search,
and you don't use Haiku for deep architecture planning. The category system maps task
complexity to model capabilities:

```
Categories:
  quick              → cheap, fast models (grep, glob, simple reads)
  unspecified-low    → moderate tasks
  unspecified-high   → complex reasoning
  deep               → architecture-level analysis
  ultrabrain         → hardest problems
  artistry           → creative/writing
  visual-engineering → vision tasks
  writing            → prose/generation
```

Agents (Sisyphus, Hephaestus, etc.) are personas — each is assigned a default category,
model, and system prompt. The `call_omo_agent` tool dispatches work to agents, and the
delegate-task tool maps the task into the right category. It's a routing layer.

### Why background tasks?

Long-running work (deep analysis, multi-file refactors) shouldn't block the main chat.
Background slots give parallelism — configurable per model/provider with FIFO queuing
and circuit breakers.

### Why hashline_edit?

The Read tool tags every output with content hashes. The edit tool validates those hashes
before applying. Stale hash = file changed since you read it = reject. Prevents overwriting
outdated content.

### Why the MCP tiers?

| Tier | What | Why |
|------|------|-----|
| 1. Built-in | Remote MCPs (websearch) | Shipped with the plugin, always available |
| 2. Claude Code | `.mcp.json` files | Standard CC MCP config, env var expansion |
| 3. Skill-embedded | SKILL.md YAML frontmatter | Skills can declare their own MCP servers |

The three tiers are loaded independently and isolated per-session for security.

## HOW TO BUILD & DEPLOY

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- OpenCode (`npm install -g @opencode-ai/cli`)

### Build

```bash
bun install
bun run build        # Builds dist/index.js + dist/cli + schema
```

This produces:
- `dist/index.js` — the ESM plugin bundle OpenCode loads
- `dist/cli/index.js` — the standalone CLI (`oh-my-opencode install`, `doctor`, `run`)
- `assets/oh-my-opencode.schema.json` — JSON Schema for IDE autocomplete

### Install locally

```bash
bunx oh-my-opencode install
```

This wizard registers the plugin in your OpenCode config so OpenCode loads it at startup.

Or add it manually to `~/.opencoderc.jsonc`:
```jsonc
{
  "plugins": {
    "oh-my-openagent": {}
  }
}
```

### Run commands

```bash
bunx oh-my-opencode doctor        # Health check
bunx oh-my-opencode run "..."     # Non-interactive session
```

### Config file

`~/.config/opencode/oh-my-openagent.jsonc` (or `%APPDATA%/opencode/` on Windows):

```jsonc
{
  "$schema": "./assets/oh-my-opencode.schema.json",
  "default_run_agent": "sisyphus",
  "background_task": {
    "defaultConcurrency": 5
  }
}
```

Configs are walked from pwd up to $HOME: any `.opencode/oh-my-openagent.jsonc` directory
near your project merges on top of the user config. This lets you have project-specific
agent overrides.

### Development workflow

```bash
bun run build          # Quick rebuild (plugin bundle only)
bun run typecheck      # tsc --noEmit
bun test               # Run tests
bun run build:schema   # Regenerate schema after config changes
bun run clean          # rm -rf dist
```

### If you only need the plugin (no CLI binary)

The platform-specific binaries in `packages/` and the `bin/` shim are for npm distribution.
For local dev, you only need `bun run build` + `bunx oh-my-opencode install`.

## KEY CONFIG FIELDS

| Field | Type | Purpose |
|-------|------|---------|
| `default_run_agent` | string | Default agent for `oh-my-opencode run` |
| `agent_order` | string[] | Display order in agent list |
| `agents.{name}.model` | string | Override model per agent |
| `agents.{name}.category` | string | Override category per agent |
| `disabled_*` | string[] | Disable specific agents/hooks/tools/skills/commands |
| `hashline_edit` | boolean | Enable content-hash verified edit tool |
| `model_fallback` | boolean | Auto-fallback on model error |
| `background_task.defaultConcurrency` | number | Parallel background tasks (default 5) |
| `websearch.provider` | "exa"\|"tavily" | Web search backend |
| `tmux.enabled` | boolean | Interactive bash via tmux sessions |

## ARCHITECTURE INVARIANTS

- **Canonical agent order:** Sisyphus → Hephaestus → Prometheus → Atlas (enforced by sort shim)
- **Hashline edit pairing:** Read tags output with hashes; edit rejects on mismatch
- **5-tier hooks:** Session (20) + ToolGuard (12) + Transform (3) + Continuation (7) + Skill (2) = 44 total
- **Per-session MCP isolation:** Tier-3 MCP clients keyed by `sessionID:skillName:serverName`
- **Two fallback systems:** `model-fallback` (proactive, at request time) vs `runtime-fallback` (reactive, on session error)

## CONVENTIONS

- **Runtime:** Bun only. Never npm/yarn/pnpm.
- **TypeScript:** strict mode, ESNext, bundler moduleResolution, bun-types
- **Tests:** Bun test, co-located `*.test.ts`, given/when/then style
- **Factory pattern:** `createXXX()` for everything
- **File naming:** kebab-case, no catch-all files
- **Imports:** relative within module, barrel across modules. No path aliases (`@/`)
- **Config:** JSONC with comments, snake_case keys, Zod v4 validation
- **No emojis in code**
- **No `as any`, `@ts-ignore`, `@ts-expect-error`**

## INITIALIZATION FLOW

```
serverPlugin(input, options)
  ├─→ installAgentSortShim()       # Canonical agent ordering
  ├─→ initConfigContext()          # Detect config layout (opencode vs openagent)
  ├─→ detectExternalSkillPlugin()  # Warn on conflicts
  ├─→ injectServerAuthIntoClient() # Wire auth into SDK client
  ├─→ loadPluginConfig()           # JSONC → merge → Zod validate → migrate
  ├─→ createManagers()             # Tmux, Background, SkillMcp, ConfigHandler
  ├─→ createTools()                # SkillContext + Categories + ToolRegistry
  ├─→ createHooks()                # Session + ToolGuard + Transform + Continuation + Skill
  └─→ createPluginInterface()      # Wire everything into Hooks format
```

## TROUBLESHOOTING

- **Logger:** writes to `/tmp/oh-my-opencode.log`
- **Plugin load timeout:** 10s for Claude Code discovery
- **Background tasks:** 5 concurrent per `providerID/modelID` by default, FIFO queue
- **Stale read hashes:** If hashline_edit rejects an edit, re-read the file first
