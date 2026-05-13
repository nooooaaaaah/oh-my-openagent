# Project Map

```
oh-my-openagent/
├── src/                          # All source code
│   ├── index.ts                  # Plugin entry point. Default-export { id, server }
│   ├── create-hooks.ts           # Composes all 44 hooks into 5 tiers
│   ├── create-managers.ts        # Creates runtime managers (background tasks, tmux, etc.)
│   ├── create-tools.ts           # Builds the tool registry
│   ├── create-runtime-tmux-config.ts  # Tmux integration detection + config
│   ├── plugin-config.ts          # Loads + merges + validates JSONC config
│   ├── plugin-interface.ts       # Wires managers/tools/hooks into OpenCode's Hooks format
│   ├── plugin-state.ts           # Shared model resolution cache
│   │
│   ├── agents/                   # 11 agent definitions
│   │   ├── atlas/                # Todo orchestrator agent
│   │   ├── builtin-agents/       # Registration helpers, conditional factories
│   │   ├── hephaestus/           # Autonomous deep worker (model variants)
│   │   ├── prometheus/           # Strategic planner
│   │   ├── sisyphus/             # Main orchestrator (model variant prompts)
│   │   ├── sisyphus-junior/      # Category-spawned executor
│   │   ├── agent-builder.ts      # buildAgent() composition
│   │   ├── types.ts              # AgentConfig, AgentMode, etc.
│   │   ├── oracle.ts             # Read-only consultant
│   │   ├── librarian.ts          # External search
│   │   ├── explore.ts            # Codebase grep
│   │   ├── multimodal-looker.ts  # Vision/PDF
│   │   ├── metis.ts              # Pre-planning consultant
│   │   ├── momus.ts              # Plan reviewer
│   │   └── ...                   # Dynamic prompt builders, utils
│   │
│   ├── cli/                      # Standalone CLI (install, doctor, run, mcp-oauth)
│   │   ├── run/                  # Non-interactive session runner
│   │   ├── doctor/               # Health diagnostics (system, config, tools, models)
│   │   ├── config-manager/       # Config file management
│   │   ├── boulder/              # Multi-step operation state
│   │   ├── mcp-oauth/            # OAuth login for MCP servers
│   │   └── ...                   # get-local-version, cli-program.ts
│   │
│   ├── config/                   # Zod v4 config schema (validates oh-my-openagent.jsonc)
│   │   └── schema/               # 30+ schema files: hooks, commands, agents, categories, etc.
│   │
│   ├── features/                 # Self-contained feature modules
│   │   ├── background-agent/     # Task lifecycle, concurrency, polling, circuit breaker (~47 files)
│   │   ├── opencode-skill-loader/ # 4-scope skill discovery (project > opencode > user > global)
│   │   ├── tmux-subagent/        # Tmux pane management, session orchestration
│   │   ├── mcp-oauth/            # OAuth 2.0 + PKCE + DCR for MCP servers
│   │   ├── skill-mcp-manager/    # Per-session skill-embedded MCP client lifecycle
│   │   ├── claude-code-plugin-loader/  # Unified CC plugin discovery
│   │   ├── builtin-skills/       # 9 built-in skills (git-master, playwright, etc.)
│   │   ├── builtin-commands/     # Slash command templates
│   │   ├── claude-tasks/         # Sisyphus task schema + atomic file storage
│   │   ├── claude-code-mcp-loader/  # Tier-2 MCP: .mcp.json parse + ${VAR} expansion
│   │   ├── context-injector/     # AGENTS.md/README.md injection into session
│   │   ├── claude-code-agent-loader/  # Load agents from .opencode/agents/
│   │   ├── claude-code-command-loader/ # Load /commands from config
│   │   ├── claude-code-session-state/  # Subagent session state tracking
│   │   ├── boulder-state/        # Persistent state for multi-step operations
│   │   ├── run-continuation-state/    # State for `oh-my-opencode run` continuation
│   │   ├── hook-message-injector/     # System message injection helper
│   │   ├── task-toast-manager/   # Task progress notifications
│   │   └── tool-metadata-store/  # Tool execution metadata cache
│   │
│   ├── hooks/                    # 44 lifecycle hooks + test mock dirs
│   │   ├── shared/               # Cross-hook helpers (timing, prompt builders)
│   │   ├── session hooks/        # (20) contextWindowMonitor, sessionRecovery, modelFallback, etc.
│   │   ├── tool guard hooks/     # (14) commentChecker, rulesInjector, hashlineReadEnhancer, etc.
│   │   ├── transform hooks/      # (3) keywordDetector, contextInjector, claudeCodeHooks
│   │   ├── continuation hooks/   # (7) todoContinuationEnforcer, compactionContextInjector, atlas, etc.
│   │   ├── skill hooks/          # (2) categorySkillReminder, autoSlashCommand
│   │   └── zauc-*/               # Test mocks (NOT hooks; placed here for test isolation order)
│   │
│   ├── tools/                    # 16 tool directories → 20–25 config-gated tools
│   │   ├── lsp/                  # 6 LSP tools (goto_definition, find_references, etc.)
│   │   ├── grep/                 # Grep search (60s timeout, 10MB limit)
│   │   ├── glob/                 # Glob file search (60s timeout, 100 file limit)
│   │   ├── ast-grep/             # AST-based structural search + replace
│   │   ├── session-manager/      # session_list/read/search/info
│   │   ├── background-task/      # background_output/cancel
│   │   ├── call-omo-agent/       # Dispatch to named agents
│   │   ├── delegate-task/        # Full task delegation with categories + skills
│   │   ├── skill/                # Load skill or run command
│   │   ├── skill-mcp/            # Call skill-embedded MCP servers
│   │   ├── hashline-edit/        # Content-hash verified edit tool
│   │   ├── interactive-bash/     # Tmux-backed interactive bash
│   │   ├── look-at/              # Image/PDF analysis
│   │   ├── slashcommand/         # Discover /commands from config
│   │   ├── task/                 # Sisyphus task system CRUD
│   │   └── shared/               # Shared tool utilities
│   │
│   ├── mcp/                      # 3 built-in remote MCP servers
│   │
│   ├── plugin/                   # OpenCode hook handler implementations
│   │   └── hooks/                # 5-tier hook composition files (create-session-hooks, etc.)
│   │
│   ├── plugin-handlers/          # 6-phase config loading pipeline
│   ├── shared/                   # Cross-cutting utilities (~258 files)
│   │   ├── model-capabilities/   # Model capability cache and heuristics
│   │   ├── tmux/                 # Tmux command runner (only way to call tmux)
│   │   ├── migration/            # Config file migration helpers
│   │   ├── command-executor/     # Execute system commands safely
│   │   └── git-worktree/         # Git worktree utilities
│   │
│   ├── testing/                  # Test utilities
│   ├── generated/                # Auto-generated files (e.g. model capability cache)
│   └── __tests__/                # Plugin-level integration tests
│
├── docs/                         # Documentation
│   ├── AGENTS.md                 # Architecture doc
│   ├── guide/                    # User guides
│   │   ├── overview.md           # What this is + OpenCode integration
│   │   ├── getting-started.md    # Build, install, config
│   │   ├── making-changes.md     # How to extend
│   │   ├── examples.md           # Real walkthroughs
│   │   └── debug.md              # Troubleshooting
│   ├── reference/                # CLI, config, features reference
│   ├── examples/                 # Example configs
│   └── troubleshooting/          # Per-provider troubleshooting
│
├── packages/                     # 11 platform binary packages (npm publishing only)
├── script/                       # Build scripts (build, schema, binaries, publish)
├── bin/                          # Platform-detection JS shim for CLI
├── assets/                       # oh-my-opencode.schema.json (auto-generated)
├── signatures/                   # CLA signature registry (open-source only)
├── .github/                      # GitHub Actions workflows + issue templates
├── .opencode/                    # OpenCode project config
│   ├── skills/                   # Built-in skill definitions
│   └── command/                  # Custom slash commands
│
├── package.json                  # Bun project config, dependencies, scripts
├── tsconfig.json                 # TypeScript config
├── bunfig.toml                   # Bun configuration (test preload)
├── test-setup.ts                 # Test preload (resets state between tests)
└── postinstall.mjs               # Verifies platform binary + OpenCode version
```

## What Each Top-Level Thing Does

| Path | Purpose |
|------|---------|
| `src/index.ts` | Plugin entry point. Exports `{ id: "oh-my-openagent", server }` for OpenCode |
| `src/agents/` | Factory functions for every agent (Sisyphus, Hephaestus, Prometheus, etc.) |
| `src/hooks/` | Automation that runs before/after tool calls, on session events, on messages |
| `src/tools/` | Every tool the AI can call (grep, glob, LSP, edit, etc.) |
| `src/features/` | Big feature modules: background-agent, skill-loader, tmux, MCP OAuth, etc. |
| `src/config/` | Validates your `oh-my-openagent.jsonc` with Zod schemas |
| `src/cli/` | CLI commands: `install`, `doctor`, `run`, `mcp-oauth` |
| `src/plugin/` | Wires hooks/tools/managers into OpenCode's plugin API |
| `src/plugin-handlers/` | Config loading pipeline (agents, tools, MCPs, commands) |
| `src/shared/` | Utilities used everywhere: logger, model resolution, file utils |
| `src/mcp/` | Built-in MCP servers (websearch, etc.) |
| `docs/` | All documentation |
| `packages/` | Pre-compiled binaries for macOS/Linux/Windows (npm publish only, skip for local dev) |
| `script/` | Build and automation scripts |
| `bin/` | JS shim that detects platform and runs the right binary |
