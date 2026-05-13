# Getting Started

## Prerequisites

1. **Bun** — the JavaScript runtime. Version 1.3+:
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```

2. **OpenCode** — the CLI tool this plugin extends:
   ```powershell
   npm install -g @opencode-ai/cli
   ```

## Build

```powershell
cd oh-my-openagent
bun install              # Download dependencies
bun run build            # Compile plugin (creates dist/)
```

Output:
- `dist/index.js` — the plugin bundle OpenCode loads
- `dist/cli/index.js` — standalone CLI (install, doctor, run)
- `assets/oh-my-opencode.schema.json` — config autocomplete

Run tests and typecheck:
```powershell
bun test                 # Run all tests
bun run typecheck        # Check TypeScript errors
```

## Install / Use

```powershell
bunx oh-my-openagent install        # Interactive setup wizard
bunx oh-my-openagent doctor          # Health check
bunx oh-my-openagent run "..."       # Non-interactive session
```

The install wizard registers the plugin in your OpenCode config. After that, OpenCode loads it automatically.

Or add it manually to `~/.opencoderc.jsonc`:
```jsonc
{
  "plugins": {
    "oh-my-openagent": {}
  }
}
```

## Config File

Settings go in `~/.config/opencode/oh-my-openagent.jsonc` (or `%APPDATA%\opencode\` on Windows):

```jsonc
{
  "default_run_agent": "sisyphus",
  "background_task": {
    "defaultConcurrency": 3
  },
  "websearch": {
    "provider": "tavily"
  },
  "hashline_edit": true,
  "disabled_hooks": []
}
```

You can also put a config in any project folder (`my-project/.opencode/oh-my-openagent.jsonc`) and it merges with the user config. Project settings override user settings.

## Development Workflow

```powershell
bun run build          # Compile after changes
bun run typecheck      # Check types
bun test               # Run tests

# If you changed the config schema:
bun run build:schema   # Regenerate autocomplete schema

# Clean:
bun run clean          # rm -rf dist
```

For local dev you only need `bun run build` + `bunx oh-my-opencode install`. The platform binaries in `packages/` are only for npm distribution, not needed for personal use.
