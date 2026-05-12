import type { PluginContext } from "./types"

import { getMainSessionID } from "../features/claude-code-session-state"
import { clearBoulderState } from "../features/boulder-state"
import { log } from "../shared"
import { resolveSessionAgent } from "./session-agent-resolver"

import type { CreatedHooks } from "../create-hooks"

export function createToolExecuteBeforeHandler(args: {
  ctx: PluginContext
  hooks: CreatedHooks
}): (
  input: { tool: string; sessionID: string; callID: string },
  output: { args: Record<string, unknown> },
) => Promise<void> {
  const { ctx, hooks } = args

  return async (input, output): Promise<void> => {
    if (input.tool.toLowerCase() === "bash" && typeof output.args.command === "string") {
      if (output.args.command.includes("\x00")) {
        output.args.command = output.args.command.replace(/\x00/g, "")
        log("[tool-execute-before] Stripped null bytes from bash command", {
          sessionID: input.sessionID,
          callID: input.callID,
        })
      }
    }

    await hooks.writeExistingFileGuard?.["tool.execute.before"]?.(input, output)
    await hooks.claudeCodeHooks?.["tool.execute.before"]?.(input, output)
    await hooks.nonInteractiveEnv?.["tool.execute.before"]?.(input, output)
    await hooks.bashFileReadGuard?.["tool.execute.before"]?.(input, output)
    await hooks.commentChecker?.["tool.execute.before"]?.(input, output)
    await hooks.directoryAgentsInjector?.["tool.execute.before"]?.(input, output)
    await hooks.directoryReadmeInjector?.["tool.execute.before"]?.(input, output)
    await hooks.rulesInjector?.["tool.execute.before"]?.(input, output)
    await hooks.tasksTodowriteDisabler?.["tool.execute.before"]?.(input, output)
      await hooks.prometheusMdOnly?.["tool.execute.before"]?.(input, output)
    await hooks.sisyphusJuniorNotepad?.["tool.execute.before"]?.(input, output)
    await hooks.atlasHook?.["tool.execute.before"]?.(input, output)
    await hooks.compactionTodoPreserver?.["tool.execute.before"]?.(input, output)

    const normalizedToolName = input.tool.toLowerCase()
    if (
      normalizedToolName === "question"
      || normalizedToolName === "ask_user_question"
      || normalizedToolName === "askuserquestion"
    ) {
      const sessionID = input.sessionID || getMainSessionID()
      await hooks.sessionNotification?.({
        event: {
          type: "tool.execute.before",
          properties: {
            sessionID,
            tool: input.tool,
            args: output.args,
          },
        },
      })
    }

    if (input.tool === "task") {
      const argsObject = output.args
      const category = typeof argsObject.category === "string" ? argsObject.category : undefined
      const subagentType = typeof argsObject.subagent_type === "string" ? argsObject.subagent_type : undefined
      const taskId = typeof argsObject.task_id === "string" ? argsObject.task_id : undefined

      if (category) {
        argsObject.subagent_type = "sisyphus-junior"
      } else if (!subagentType && taskId) {
        const resolvedAgent = await resolveSessionAgent(ctx.client, taskId)
        argsObject.subagent_type = resolvedAgent ?? "continue"
      }

    }

    if (input.tool === "skill") {
      const rawName = typeof output.args.name === "string" ? output.args.name : undefined
      const command = rawName?.replace(/^\//, "").toLowerCase()
      const sessionID = input.sessionID || getMainSessionID()

      if (command === "stop-continuation" && sessionID) {
        hooks.stopContinuationGuard?.stop(sessionID)
        hooks.todoContinuationEnforcer?.cancelAllCountdowns()
        clearBoulderState(ctx.directory)
        log("[stop-continuation] All continuation mechanisms stopped", {
          sessionID,
        })
      }

      // Clear stop state when user explicitly resumes work via work-starting commands.
      // This ensures /stop-continuation persists until the user intentionally restarts.
      const workStartingCommands = ["start-work"]
      if (workStartingCommands.includes(command ?? "") && sessionID) {
        if (hooks.stopContinuationGuard?.isStopped(sessionID)) {
          hooks.stopContinuationGuard.clear(sessionID)
          log("[stop-continuation] Stop state cleared by work-starting command", {
            sessionID,
            command,
          })
        }
      }
    }
  }
}
