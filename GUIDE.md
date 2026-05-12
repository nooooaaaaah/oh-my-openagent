# Plain-English Guide

## What Is This Thing?

This is a plugin for [OpenCode](https://opencode.ai) — a CLI tool that helps AI coding
agents work with your code. The plugin is a box of extra "stuff" that makes OpenCode
smarter:

- **Agents** — different AI "personalities" with different models and instructions
  (Sisyphus for deep work, Hephaestus for coding, etc.)
- **Tools** — extra things the AI can do (grep, glob, LSP, background tasks, etc.)
- **Hooks** — automation that runs at certain times (like "before the AI writes a file,
  check if it's read it first")
- **MCP servers** — services the AI can talk to (web search, etc.)
- **Skills** — reusable workflows (like "review my code before publishing")

It's all TypeScript. Bun is the runtime (like Node.js but faster).

## How It Connects to OpenCode

OpenCode has a plugin system. You write a file that exports `{ id, server }` and
OpenCode loads it at startup. The `server` function receives a connection object
(`PluginInput`) and returns a `Hooks` object — a set of functions OpenCode calls
at specific times.

This is the contract. The plugin doesn't run its own server or process. It just
hooks into OpenCode's:

```
  OpenCode                    Your plugin (oh-my-openagent)
  ─────────                   ──────────────────────────────
  Starts up         ──load──> src/index.ts exports { id, server }
                              server() returns Hooks object:
                                - config()     → agent definitions, tools, MCPs
                                - tool()       → 25 tools the AI can call
                                - chat.message() → runs on every user message
                                - chat.params()  → sets model params per session
                                - event()        → on session created/deleted/idle/error
                                - tool.execute.before() → guards before tool calls
                                - tool.execute.after()  → post-process after tool calls
                                - etc.

  User sends "grep for X"
              │
              ▼
  AI decides to call grep tool
              │
              ▼
  tool.execute.before() fires  ──> your guard hooks run
              │
              ▼
  grep tool executes           ──> your tool code runs
              │
              ▼
  tool.execute.after() fires   ──> your post-hooks run
              │
              ▼
  AI gets the result
```

The plugin also uses OpenCode's SDK (`@opencode-ai/sdk`) to:
- Create sub-sessions for background tasks (`createOpencodeClient`)
- Define agent configs (`AgentConfig`) with models, prompts, tool restrictions
- Read/write session data (messages, todos, session list)

OpenCode handles everything else: chat UI, streaming, provider API calls,
context window management. The plugin just adds stuff on top.

### The Two Packages

| Package | What It Is | Used For |
|---------|-----------|----------|
| `@opencode-ai/plugin` | Plugin API types | `Hooks`, `PluginInput`, `ToolDefinition`, `tool()` helper |
| `@opencode-ai/sdk` | SDK for working with OpenCode | `AgentConfig`, `createOpencodeClient()`, session CRUD |

You `import { tool } from "@opencode-ai/plugin"` to create tools. You
`import type { AgentConfig } from "@opencode-ai/sdk"` to define agents.

### What OpenCode Provides vs What the Plugin Provides

| Feature | OpenCode (built-in) | This Plugin (adds) |
|---------|-------------------|-------------------|
| Chat session | Full chat UI + streaming | Session recovery, compaction, notification |
| Tools | Basic read/write/bash | grep, glob, LSP, ast-grep, background tasks, skills, MCP |
| Agents | Basic agent switching | 11 agents with custom prompts, model routing, tool restrictions |
| Config | Simple settings.json | Multi-level JSONC config with Zod validation |
| MCP | Claude Code `.mcp.json` | 3-tier MCP (built-in + CC + skill-embedded), OAuth |
| Skills | — | Reusable workflow templates loaded at runtime |
| Background tasks | — | Parallel sub-agents with concurrency limits |
| Continuation | — | Auto-continue on incomplete todos, compaction guards |
| Hashline edit | — | Content-hash verified edits (no stale overwrites) |

## What You Need Installed

1. **Bun** — the JavaScript runtime. Install with:
   ```powershell
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
   Or download from [bun.sh](https://bun.sh). Version 1.3+.

2. **OpenCode** — the CLI this plugin extends:
   ```powershell
   npm install -g @opencode-ai/cli
   ```

## How to Build

```powershell
cd oh-my-openagent
bun install           # Download all dependencies
bun run build         # Compile the plugin (creates dist/)

# Tests and type checking (no runtime needed for these)
bun test              # Run all tests
bun run typecheck     # Check for TypeScript errors
```

After `bun run build`, you get:
- `dist/index.js` — the plugin file OpenCode loads
- `dist/cli/index.js` — the CLI commands (install, doctor, run)
- `assets/oh-my-opencode.schema.json` — for autocomplete in your editor

## How to Install/Use

```powershell
bunx oh-my-openagent install      # Interactive setup wizard
bunx oh-my-openagent doctor        # Check if everything is working
bunx oh-my-openagent run "..."     # Start a non-interactive session
```

The install wizard adds the plugin to your OpenCode config. After that, OpenCode
loads it automatically when you start a session.

Or just add this to `~/.opencoderc.jsonc`:
```jsonc
{
  "plugins": {
    "oh-my-openagent": {}
  }
}
```

## Config File

Settings go in `~/.config/opencode/oh-my-openagent.jsonc` (Windows: `%APPDATA%\opencode\`):

```jsonc
{
  "default_run_agent": "sisyphus",
  "background_task": {
    "defaultConcurrency": 3    // How many background tasks at once
  },
  "websearch": {
    "provider": "tavily"       // Or "exa" — need an API key
  },
  "hashline_edit": true,       // Stops the AI from editing files it hasn't read
  "disabled_hooks": []         // Turn off specific hooks by name
}
```

You can also put a config file in any project folder (`my-project/.opencode/oh-my-openagent.jsonc`)
and it merges with the user config. Project settings override user settings.

## How to Make Changes

### The Folder Layout

```
oh-my-openagent/
├── src/
│   ├── index.ts              # The main entry point — starts everything
│   ├── agents/               # AI agent definitions
│   ├── tools/                # Tool implementations (grep, glob, LSP, etc.)
│   ├── hooks/                # Automation hooks (44 of them)
│   ├── features/             # Big feature modules (background tasks, skills, etc.)
│   ├── shared/               # Utility code used everywhere
│   ├── config/               # Config schema (validates your jsonc file)
│   ├── cli/                  # CLI code (install, doctor, run commands)
│   ├── mcp/                  # Built-in MCP servers
│   ├── plugin/               # Wires everything together for OpenCode
│   └── plugin-handlers/      # Config loading pipeline
├── dist/                     # Build output (auto-generated)
├── packages/                 # Platform binaries (not needed for local use)
├── script/                   # Build scripts
└── docs/                     # User docs
```

### Common Things You Might Want to Do

**Add a new agent (AI personality):**
1. Create `src/agents/my-agent.ts` with a `createMyAgent()` factory
2. Register it in `src/agents/index.ts` barrel export
3. Add its name to the agent name enum in `src/config/schema/agent-names.ts`
4. Set its default model/category in `src/agents/agent-category-defaults.ts`
5. Run `bun run build` to compile

**Add a new tool (something the AI can do):**
1. Create `src/tools/my-tool/index.ts` with a `createMyTool()` factory
2. Register it in `src/plugin/tool-registry.ts`
3. The AI will automatically discover it

**Add a new hook (automation that runs at certain times):**
1. Create `src/hooks/my-hook/index.ts` with a `createMyHook()` factory
2. Pick the right tier and add it to the matching file in `src/plugin/hooks/`:
   - Session hooks → `create-session-hooks.ts`
   - Tool guard hooks → `create-tool-guard-hooks.ts`
   - Transform hooks → `create-transform-hooks.ts`
   - Continuation hooks → `create-continuation-hooks.ts`
   - Skill hooks → `create-skill-hooks.ts`
3. Add the hook name to `src/config/schema/hooks.ts`

**Add a new config setting:**
1. Create `src/config/schema/my-setting.ts` with a Zod schema
2. Add the field to `src/config/schema/oh-my-opencode-config.ts`
3. Access it via `pluginConfig.my_setting` in handlers
4. Run `bun run build:schema` to update autocomplete

### Conventions to Follow

- **Factories, not constructors:** Everything uses `createXXX()` functions
- **No catch-all files:** Don't make `utils.ts` or `helpers.ts` — give files real names
- **Barrel exports:** Each module has an `index.ts` that re-exports everything
- **kebab-case:** File and folder names use hyphens, not underscores
- **Tests beside code:** `my-thing.ts` has `my-thing.test.ts` in the same folder
- **No path aliases:** Use relative imports like `../../shared`, not `@/shared`
- **Bun only:** Don't use npm, yarn, pnpm — just bun

### Development Loop

```powershell
# Make changes to source files, then:
bun run build           # Compile
bun run typecheck       # Check types (no need for this if bun build succeeds)
bun test                # Run tests (optional)

# If you changed the config schema:
bun run build:schema    # Regenerate autocomplete schema
```

## How It All Starts Up

When OpenCode loads the plugin, this happens in order:

1. **Agent sort shim** — makes sure agents display in the right order
2. **Config loading** — reads your jsonc files, merges them, validates with Zod
3. **Create managers** — sets up background tasks, tmux, skill MCPs, config handler
4. **Create tools** — builds all the tool definitions the AI can use
5. **Create hooks** — builds all the automation hooks
6. **Wire it up** — connects everything to OpenCode's plugin API

## Where to Look for Specific Things

| If you want to... | Look in... |
|-------------------|-----------|
| Change how agents work | `src/agents/` |
| Add a new AI tool | `src/tools/` + register in `src/plugin/tool-registry.ts` |
| Change what happens before/after tool use | `src/hooks/` (tool guard tier) |
| Change session behavior | `src/hooks/` (session or continuation tier) |
| Change config validation | `src/config/schema/` |
| Change CLI commands | `src/cli/` |
| Add a built-in skill | `src/features/builtin-skills/` |
| Add a slash command | `src/features/builtin-commands/` |
| Understand utility functions | `src/shared/` |
| See how plugin wires together | `src/plugin/` |

## Real-World Examples

Here are concrete examples you can look at right now in the codebase. Each one
is a complete walkthrough of creating and registering something.

---

### Example: Add a New Subagent (Momus)

Momus is a reviewer agent that critiques plans. It's a good template for any
new subagent. Here's the whole chain:

**Step 1 — Create the agent factory** (`src/agents/momus.ts`):

```typescript
import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentMode } from "./types"
import { createAgentToolRestrictions } from "../shared/permission-compat"

const MODE: AgentMode = "subagent"

export function createMomusAgent(model: string): AgentConfig {
  // Block write/edit tools — this agent only reads and reviews
  const restrictions = createAgentToolRestrictions(["write", "edit", "apply_patch"])

  return {
    description: "Expert reviewer for plans",
    mode: MODE,
    model,
    temperature: 0.1,
    ...restrictions,
    prompt: `You are a ruthless plan reviewer. Find every gap.`
  } as AgentConfig
}
createMomusAgent.mode = MODE
```

**Step 2 — Register it** (`src/agents/builtin-agents.ts`, line 40):

```typescript
import { createMomusAgent } from "./momus"

const agentSources = {
  // ... other agents ...
  momus: createMomusAgent,   // <-- add yours here
}
```

That's it. The agent is now available for `call_omo_agent` and shows up
in the agent list. You can set its default model in the config:

```jsonc
{
  "agents": {
    "momus": { "model": "claude-sonnet-4-6" }
  }
}
```

---

### Example: Add a New Tool (Session Manager)

The session-manager tool gives the AI access to past chat sessions. It's
actually 4 tools in one factory. Here's the pattern:

**Step 1 — Create the tool** (`src/tools/session-manager/tools.ts`):

```typescript
import type { PluginInput } from "@opencode-ai/plugin"
import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool"

export function createSessionManagerTools(
  ctx: PluginInput
): Record<string, ToolDefinition> {
  // Tool 1: list sessions
  const session_list = tool({
    description: "List past chat sessions",
    args: {
      limit: tool.schema.number().optional().describe("Max sessions"),
    },
    execute: async (args, _context) => {
      // ... your logic here ...
      return "session list result"
    },
  })

  // Tool 2: read a session's messages
  const session_read = tool({
    description: "Read messages from a session",
    args: {
      session_id: tool.schema.string().describe("Session ID"),
    },
    execute: async (args, _context) => {
      return `messages for ${args.session_id}`
    },
  })

  return { session_list, session_read }
}
```

**Step 2 — Barrel-export it** (`src/tools/index.ts`, line 18):

```typescript
export { createSessionManagerTools } from "./session-manager"
```

**Step 3 — Register it in the tool registry** (`src/plugin/tool-registry.ts`, line 260):

```typescript
// Import at top
import { createSessionManagerTools } from "../tools"

// Inside createToolRegistry()
const allTools: Record<string, ToolDefinition> = {
  // ... other tools ...
  ...factories.createSessionManagerTools(ctx),   // <-- add yours here
}
```

The AI discovers it automatically on next session.

---

### Example: Add a New Hook (Task Resume Info)

This hook adds a "to continue:" link after certain tool calls so the AI knows
how to resume a paused task. 27 lines total.

**Step 1 — Create the hook** (`src/hooks/task-resume-info/hook.ts`):

```typescript
export function createTaskResumeInfoHook() {
  const toolExecuteAfter = async (
    input: { tool: string; sessionID: string; callID: string },
    output: { title: string; output: string; metadata: unknown }
  ) => {
    // Only fire for specific tools
    if (!["task", "call_omo_agent"].includes(input.tool)) return
    if (output.output.startsWith("Error:")) return

    // Append a "to continue:" link
    output.output = output.output.trimEnd() +
      `\n\nto continue: task(task_id="...", prompt="...")`
  }

  return {
    "tool.execute.after": toolExecuteAfter,
  }
}
```

**Step 2 — Register in the right tier** (`src/plugin/hooks/create-session-hooks.ts`, line 224):

```typescript
// Import at top
import { createTaskResumeInfoHook } from "../../hooks"

// Inside createSessionHooks()
const taskResumeInfo = isHookEnabled("task-resume-info")
  ? safeHook("task-resume-info", () => createTaskResumeInfoHook())
  : null

// Add to return object
return {
  // ... other hooks ...
  taskResumeInfo,   // <-- add yours here
}
```

**Step 3 — Add hook name to schema** (`src/config/schema/hooks.ts`):

```typescript
// Add "task-resume-info" to the HookNameSchema enum
```

Choose the right tier based on when you want the hook to fire:

| Tier | Fires When | File to Edit |
|------|-----------|-------------|
| Session | session.idle, session.error, chat.message | `create-session-hooks.ts` |
| Tool Guard | before/after every tool call | `create-tool-guard-hooks.ts` |
| Transform | on every chat message (rewrites prompts) | `create-transform-hooks.ts` |
| Continuation | session idle, compacted events | `create-continuation-hooks.ts` |
| Skill | chat.message for skill loading | `create-skill-hooks.ts` |

---

### Example: Add a Built-in Skill (AI Slop Remover)

Skills are workflows packaged as reusable prompts. The AI Slop Remover
teaches the AI how to clean up bad code comments.

**Step 1 — Create the skill** (`src/features/builtin-skills/skills/ai-slop-remover.ts`):

```typescript
import type { BuiltinSkill } from "../types"

export const aiSlopRemoverSkill: BuiltinSkill = {
  name: "ai-slop-remover",
  description: "Removes AI-generated code smells from a single file",
  // The template is the actual instructions the AI will follow
  template: `You are an expert at removing AI-generated "slop" patterns.

## REMOVE:
- Comments that restate the code: \`x += 1  # increment x\`
- Docstrings on trivial methods
- Section dividers: \`# ===== HELPER FUNCTIONS =====\`
- Commented-out code blocks

## KEEP:
- Comments explaining WHY (business logic, edge cases)
- Links to issues/tickets
- Regex explanations`,
  // Optional: restrict which tools can run during this skill
  allowedTools: ["read", "grep", "glob"],
}
```

**Step 2 — Register it** (`src/features/builtin-skills/skills.ts`, line 34):

```typescript
import { aiSlopRemoverSkill } from "./skills/index"

export function createBuiltinSkills(): BuiltinSkill[] {
  const skills = [
    // ... other skills ...
    aiSlopRemoverSkill,   // <-- add yours here
  ]
  return skills
}
```

Users load skills in their session with: `@ai-slop-remover path/to/file.ts`

---

### Example: Add a Slash Command (Stop Continuation)

Slash commands are simple text templates that describe what the command does.
The actual behavior is handled by a hook with the same name.

**Step 1 — Create the template** (`src/features/builtin-commands/templates/stop-continuation.ts`):

```typescript
export const STOP_CONTINUATION_TEMPLATE = `Stop all continuation mechanisms for the current session.

This command will:
1. Stop auto-continuation of incomplete tasks
2. Clear the boulder state for the current project

After running this command:
- The session will not auto-continue when idle
- You can manually continue work when ready

Use this when you need to pause automated continuation.`
```

**Step 2 — Create a hook to handle the command** (in `src/hooks/stop-continuation-guard/`):

```typescript
export function createStopContinuationGuardHook() {
  return {
    "chat.message": async (input, output) => {
      if (input.message?.text?.trim() === "/stop-continuation") {
        // Do the thing
        output.messages = [{ role: "assistant", content: "Stopped." }]
      }
    },
  }
}
```

**Step 3 — Register the hook** in `create-continuation-hooks.ts` (continuation tier
makes sense for a stop-continuation command).

Users run it with: `/stop-continuation`

---

### Example: Add a Config Setting

Suppose you want a `my_feature` flag in the config.

**Step 1 — Define the schema** (`src/config/schema/my-feature.ts`):

```typescript
import { z } from "zod"

export const MyFeatureConfigSchema = z.object({
  enabled: z.boolean().optional(),
  some_string: z.string().optional(),
})

export type MyFeatureConfig = z.infer<typeof MyFeatureConfigSchema>
```

**Step 2 — Add to root schema** (`src/config/schema/oh-my-opencode-config.ts`):

```typescript
import { MyFeatureConfigSchema } from "./my-feature"

export const OhMyOpenCodeConfigSchema = z.object({
  // ... existing fields ...
  my_feature: MyFeatureConfigSchema.optional(),   // <-- add yours here
})
```

**Step 3 — Access it in code**:

```typescript
const config = pluginConfig.my_feature
if (config?.enabled) {
  // do something
}
```

**Step 4 — Regenerate autocomplete schema**:

```bash
bun run build:schema
```

Users write in their config:

```jsonc
{
  "my_feature": { "enabled": true, "some_string": "hello" }
}
```

## Quick Reference: All Registration Points

| What You Want | File to Create | Register In |
|--------------|---------------|-------------|
| Subagent | `src/agents/my-agent.ts` (factory) | `src/agents/builtin-agents.ts` → `agentSources` object |
| Tool | `src/tools/my-tool/` (factory) | `src/tools/index.ts` barrel + `src/plugin/tool-registry.ts` |
| Hook | `src/hooks/my-hook/` (factory) | One of the `create-{tier}-hooks.ts` files + `src/config/schema/hooks.ts` |
| Skill | `src/features/builtin-skills/skills/my-skill.ts` | `src/features/builtin-skills/skills.ts` → `createBuiltinSkills()` |
| Slash command | `src/features/builtin-commands/templates/my-cmd.ts` (template) | Pair with a hook in the matching tier |
| Config field | `src/config/schema/my-thing.ts` (Zod schema) | `src/config/schema/oh-my-opencode-config.ts` root schema |

## Need to Debug?

- Logs go to `/tmp/oh-my-opencode.log`
- Run `bunx oh-my-opencode doctor` for a health check
- If a hook is causing problems, add it to `disabled_hooks` in config
- If hashline_edit rejects your edit, re-read the file first (stale content hash)
