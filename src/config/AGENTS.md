# src/config/ — Zod v4 Config Schema

Defines the shape of `oh-my-openagent.jsonc` — what fields are valid, their types,
defaults, and how they compose. Auto-emitted to `assets/oh-my-opencode.schema.json`
for IDE autocomplete.

## SCHEMA TREE

```
schema/
├── oh-my-opencode-config.ts    # ROOT: composes all sub-schemas
├── agent-names.ts              # Enum of 11 builtin agent names
├── agent-overrides.ts          # Per-agent override schema (model, category, prompt, etc.)
├── agent-definitions.ts        # Custom agent paths (.md/.json)
├── categories.ts               # 8 builtin categories + custom
├── hooks.ts                    # Enum of 53 valid hook names (for disabled_hooks)
├── skills.ts                   # SKILL.md source paths, recursive resolution
├── commands.ts                 # Builtin command name enum
├── experimental.ts             # Feature flags (task system, plugin timeout, etc.)
├── background-task.ts          # Concurrency per model/provider, timeouts, circuit breaker
├── tmux.ts                     # Interactive bash via tmux sessions
├── websearch.ts                # Search provider: "exa" | "tavily"
├── claude-code.ts              # Claude Code MCP compat settings
├── notification.ts             # OS notification settings
├── keyword-detector.ts         # Disable specific keyword triggers
├── runtime-fallback.ts         # Reactive provider error fallback
├── ...
```

## HOW TO ADD A CONFIG FIELD

1. Create `src/config/schema/{name}.ts` with a Zod schema
2. Add the field to `OhMyOpenCodeConfigSchema` in `oh-my-opencode-config.ts`
3. Access via `pluginConfig.{field_name}` in handlers
4. Run `bun run build:schema` to regenerate `assets/oh-my-opencode.schema.json`

## KEY PRINCIPLES

- All root fields optional — Zod fills defaults
- `agents` / `categories` / `claude_code`: deep-merged recursively (walked config + user)
- `disabled_*` arrays: Set union across config levels
- `mcp_env_allowlist`: user config only (security — walked configs cannot extend it)
- Configs walked from pwd to $HOME: closer wins, merged on top of user config
- Migrations tracked via `_migrations` array — idempotent, timestamped backups
