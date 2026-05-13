# Examples

Each walkthrough shows a real file from the codebase, the code to write, and the registration point.

---

## Add a Subagent (Momus)

Momus is a reviewer that critiques plans. Good template for any read-only subagent.

**Create the factory** (`src/agents/momus.ts`):
```typescript
import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentMode } from "./types"
import { createAgentToolRestrictions } from "../shared/permission-compat"

const MODE: AgentMode = "subagent"

export function createMomusAgent(model: string): AgentConfig {
  const restrictions = createAgentToolRestrictions(["write", "edit", "apply_patch"])
  return {
    description: "Expert reviewer for plans",
    mode: MODE,
    model,
    temperature: 0.1,
    ...restrictions,
    prompt: `You are a ruthless plan reviewer. Find every gap.`,
  } as AgentConfig
}
createMomusAgent.mode = MODE
```

**Register** (`src/agents/builtin-agents.ts`, line 40):
```typescript
import { createMomusAgent } from "./momus"
const agentSources = {
  // ...other agents...
  momus: createMomusAgent,
}
```

Done. Override its model in config:
```jsonc
{ "agents": { "momus": { "model": "claude-sonnet-4-6" } } }
```

---

## Add a Tool (Session Manager)

Creates 4 tools (`session_list`, `session_read`, etc.) that let the AI browse past sessions.

**Create the factory** (`src/tools/session-manager/tools.ts`):
```typescript
import type { PluginInput } from "@opencode-ai/plugin"
import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool"

export function createSessionManagerTools(
  ctx: PluginInput
): Record<string, ToolDefinition> {
  const session_list = tool({
    description: "List past chat sessions",
    args: {
      limit: tool.schema.number().optional().describe("Max sessions"),
    },
    execute: async (args, _context) => {
      return "session list result"
    },
  })

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

**Barrel export** (`src/tools/index.ts`, line 18):
```typescript
export { createSessionManagerTools } from "./session-manager"
```

**Register** (`src/plugin/tool-registry.ts`, line 260):
```typescript
import { createSessionManagerTools } from "../tools"

const allTools: Record<string, ToolDefinition> = {
  ...factories.createSessionManagerTools(ctx),
}
```

The AI discovers it automatically.

---

## Add a Hook (Task Resume Info)

Adds a "to continue:" link after certain tool calls. 27 lines.

**Create the hook** (`src/hooks/task-resume-info/hook.ts`):
```typescript
export function createTaskResumeInfoHook() {
  const toolExecuteAfter = async (
    input: { tool: string; sessionID: string; callID: string },
    output: { title: string; output: string; metadata: unknown }
  ) => {
    if (!["task", "call_omo_agent"].includes(input.tool)) return
    if (output.output.startsWith("Error:")) return
    output.output = output.output.trimEnd() +
      `\n\nto continue: task(task_id="...", prompt="...")`
  }
  return { "tool.execute.after": toolExecuteAfter }
}
```

**Register** in the session tier (`src/plugin/hooks/create-session-hooks.ts`, line 224):
```typescript
import { createTaskResumeInfoHook } from "../../hooks"

const taskResumeInfo = isHookEnabled("task-resume-info")
  ? safeHook("task-resume-info", () => createTaskResumeInfoHook())
  : null

return { /* ...other hooks... */ taskResumeInfo }
```

**Add name to schema** (`src/config/schema/hooks.ts`):
```typescript
// Add "task-resume-info" to HookNameSchema
```

---

## Add a Built-in Skill (AI Slop Remover)

Packages reusable instructions as a loadable skill.

**Create the skill** (`src/features/builtin-skills/skills/ai-slop-remover.ts`):
```typescript
import type { BuiltinSkill } from "../types"

export const aiSlopRemoverSkill: BuiltinSkill = {
  name: "ai-slop-remover",
  description: "Removes AI-generated code smells from a single file",
  template: `You are an expert at removing AI-generated "slop" patterns.

## REMOVE:
- Comments that restate code: \`x += 1  # increment x\`
- Docstrings on trivial methods
- Section dividers
- Commented-out code

## KEEP:
- Comments explaining WHY (business logic, edge cases)
- Links to issues/tickets`,
  allowedTools: ["read", "grep", "glob"],
}
```

**Register** (`src/features/builtin-skills/skills.ts`, line 34):
```typescript
import { aiSlopRemoverSkill } from "./skills/index"

export function createBuiltinSkills(): BuiltinSkill[] {
  return [/* ...other skills... */, aiSlopRemoverSkill]
}
```

Users load with: `@ai-slop-remover path/to/file.ts`

---

## Add a Slash Command (Stop Continuation)

Text template + hook handler.

**Create template** (`src/features/builtin-commands/templates/stop-continuation.ts`):
```typescript
export const STOP_CONTINUATION_TEMPLATE = `Stop all continuation mechanisms.

This will:
1. Stop auto-continuation of incomplete tasks
2. Clear the boulder state

After: session will not auto-continue when idle.`
```

**Create hook** (`src/hooks/stop-continuation-guard/`):
```typescript
export function createStopContinuationGuardHook() {
  return {
    "chat.message": async (input, output) => {
      if (input.message?.text?.trim() === "/stop-continuation") {
        output.messages = [{ role: "assistant", content: "Stopped." }]
      }
    },
  }
}
```

**Register hook** in `create-continuation-hooks.ts`.

Users run: `/stop-continuation`

---

## Add a Config Setting

**Define schema** (`src/config/schema/my-feature.ts`):
```typescript
import { z } from "zod"
export const MyFeatureConfigSchema = z.object({
  enabled: z.boolean().optional(),
  some_string: z.string().optional(),
})
export type MyFeatureConfig = z.infer<typeof MyFeatureConfigSchema>
```

**Add to root** (`src/config/schema/oh-my-opencode-config.ts`):
```typescript
import { MyFeatureConfigSchema } from "./my-feature"
export const OhMyOpenCodeConfigSchema = z.object({
  my_feature: MyFeatureConfigSchema.optional(),
})
```

**Use in code**:
```typescript
if (pluginConfig.my_feature?.enabled) { ... }
```

**Regenerate schema**: `bun run build:schema`

Users add to config:
```jsonc
{ "my_feature": { "enabled": true, "some_string": "hello" } }
```
