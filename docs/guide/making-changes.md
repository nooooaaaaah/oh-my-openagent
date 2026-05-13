# Making Changes

## Folder Layout

```
oh-my-openagent/
├── src/
│   ├── index.ts              # Main entry — starts everything
│   ├── agents/               # Agent definitions
│   ├── tools/                # Tool implementations
│   ├── hooks/                # 44 automation hooks
│   ├── features/             # Feature modules (background tasks, skills, etc.)
│   ├── shared/               # Utility code
│   ├── config/               # Config schema (Zod)
│   ├── cli/                  # CLI commands
│   ├── mcp/                  # Built-in MCP servers
│   ├── plugin/               # Wires everything for OpenCode
│   └── plugin-handlers/      # Config loading
├── dist/                     # Build output
├── script/                   # Build scripts
└── docs/                     # Docs
```

## How to Add an Agent

1. Create `src/agents/my-agent.ts` with a factory:
   ```typescript
   const MODE: AgentMode = "subagent"
   export function createMyAgent(model: string): AgentConfig {
     return { description: "...", mode: MODE, model, ... }
   }
   createMyAgent.mode = MODE
   ```
2. Register in `src/agents/builtin-agents.ts` → `agentSources` object
3. Add name to `src/config/schema/agent-names.ts` enum

## How to Add a Tool

1. Create `src/tools/my-tool/index.ts`:
   ```typescript
   import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool"

   export function createMyTool(ctx): ToolDefinition {
     return tool({
       description: "...",
       args: { ... },
       execute: async (args, _context) => { ... },
     })
   }
   ```
2. Export from `src/tools/index.ts` barrel
3. Register in `src/plugin/tool-registry.ts`:
   ```typescript
   const allTools = {
     ...factories.createMyTool(ctx),   // add here
   }
   ```

## How to Add a Hook

1. Create `src/hooks/my-hook/index.ts`:
   ```typescript
   export function createMyHook() {
     return {
       "tool.execute.after": async (input, output) => { ... },
     }
   }
   ```
2. Pick a tier and add to the matching `src/plugin/hooks/create-{tier}-hooks.ts`:
   - **Session** → `create-session-hooks.ts` (session.idle, session.error, chat.message, chat.params)
   - **Tool Guard** → `create-tool-guard-hooks.ts` (before/after every tool call)
   - **Transform** → `create-transform-hooks.ts` (rewrites chat messages)
   - **Continuation** → `create-continuation-hooks.ts` (idle events, compaction)
   - **Skill** → `create-skill-hooks.ts` (skill loading on chat)
3. Add the hook name to `src/config/schema/hooks.ts` (for `disabled_hooks` support)

## How to Add a Built-in Skill

1. Create `src/features/builtin-skills/skills/my-skill.ts`:
   ```typescript
   import type { BuiltinSkill } from "../types"

   export const mySkill: BuiltinSkill = {
     name: "my-skill",
     description: "What it does",
     template: `Instructions the AI follows...`,
   }
   ```
2. Register in `src/features/builtin-skills/skills.ts` → `createBuiltinSkills()`

## How to Add a Slash Command

1. Create the template in `src/features/builtin-commands/templates/my-command.ts`:
   ```typescript
   export const MY_COMMAND_TEMPLATE = `Description of what the command does...`
   ```
2. Create a hook to handle it in `src/hooks/`:
   ```typescript
   export function createMyCommandHook() {
     return {
       "chat.message": async (input, output) => {
         if (input.message?.text?.trim() === "/my-command") { ... }
       },
     }
   }
   ```
3. Register the hook in the matching tier

## How to Add a Config Field

1. Create `src/config/schema/my-setting.ts`:
   ```typescript
   import { z } from "zod"
   export const MySettingSchema = z.object({ ... })
   ```
2. Add field to `src/config/schema/oh-my-opencode-config.ts` root schema
3. Access via `pluginConfig.my_setting` in handlers
4. Run `bun run build:schema` to update autocomplete

## Conventions

- **Factories:** Everything uses `createXXX()` functions
- **No catch-all files:** Don't make `utils.ts` or `helpers.ts`
- **Barrel exports:** Each module has an `index.ts` that re-exports
- **kebab-case:** File and folder names use hyphens
- **Tests beside code:** `my-thing.ts` has `my-thing.test.ts` in the same folder
- **No path aliases:** Use relative imports (`../../shared`), not `@/shared`
- **Bun only:** Don't use npm, yarn, pnpm

## Quick Reference: Registration Points

| What | Create | Register In |
|------|--------|-------------|
| Subagent | `src/agents/my-agent.ts` | `src/agents/builtin-agents.ts` → `agentSources` |
| Tool | `src/tools/my-tool/` | `src/tools/index.ts` barrel + `src/plugin/tool-registry.ts` |
| Hook | `src/hooks/my-hook/` | One of the `create-{tier}-hooks.ts` files + `src/config/schema/hooks.ts` |
| Skill | `src/features/builtin-skills/skills/my-skill.ts` | `src/features/builtin-skills/skills.ts` → `createBuiltinSkills()` |
| Slash command | `src/features/builtin-commands/templates/my-cmd.ts` | Pair with a hook in the matching tier |
| Config field | `src/config/schema/my-thing.ts` | `src/config/schema/oh-my-opencode-config.ts` root schema |
