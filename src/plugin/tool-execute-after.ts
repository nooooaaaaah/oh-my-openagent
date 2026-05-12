import { recoverToolMetadata } from "../features/tool-metadata-store"
import type { CreatedHooks } from "../create-hooks"
import { log } from "../shared/logger"
import type { PluginContext } from "./types"

function getMetadataString(metadata: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === "string") {
      return value
    }
  }

  return undefined
}

function getPluginDirectory(ctx: PluginContext): string | null {
  if (typeof ctx === "object" && ctx !== null && "directory" in ctx && typeof ctx.directory === "string") {
    return ctx.directory
  }

  return null
}

export function createToolExecuteAfterHandler(args: {
  ctx: PluginContext
  hooks: CreatedHooks
}): (
  input: { tool: string; sessionID: string; callID: string },
  output:
    | { title: string; output: string; metadata: Record<string, unknown> }
    | undefined,
) => Promise<void> {
  const { ctx, hooks } = args

  // OpenCode injects tool call ids into execute() context and after-hook input via undocumented runtime fields.
  // We must treat their identity as a best-effort correlation key, not a guaranteed public contract.

  return async (
    input: { tool: string; sessionID: string; callID?: string; callId?: string; call_id?: string },
    output: { title: string; output: string; metadata: Record<string, unknown> } | undefined,
  ): Promise<void> => {
    if (!output) return

    const hookInput = {
      tool: input.tool,
      sessionID: input.sessionID,
      callID: input.callID ?? input.callId ?? input.call_id ?? "",
    }

    const nativeSessionId = getMetadataString(output.metadata, ["sessionId", "sessionID", "session_id"])
    const stored = recoverToolMetadata(input.sessionID, input)
    if (stored) {
      if (stored.title) {
        output.title = stored.title
      }
      if (stored.metadata) {
        if (nativeSessionId) {
          log("[tool-execute-after] Native output metadata already includes session linkage; preserving native metadata precedence", {
            tool: input.tool,
            sessionID: input.sessionID,
            callID: input.callID ?? input.callId ?? input.call_id,
            nativeSessionId,
          })
          output.metadata = { ...stored.metadata, ...output.metadata }
        } else {
          output.metadata = { ...output.metadata, ...stored.metadata }
        }
      }
    } else if (!nativeSessionId) {
      log("[tool-execute-after] Unable to recover stored metadata and no native session linkage was present", {
        tool: input.tool,
        sessionID: input.sessionID,
        callID: input.callID ?? input.callId ?? input.call_id,
      })
    }

    const runToolExecuteAfterHooks = async (): Promise<void> => {
      await hooks.toolOutputTruncator?.["tool.execute.after"]?.(hookInput, output)
      await hooks.claudeCodeHooks?.["tool.execute.after"]?.(hookInput, output)
      await hooks.preemptiveCompaction?.["tool.execute.after"]?.(hookInput, output)
      await hooks.contextWindowMonitor?.["tool.execute.after"]?.(hookInput, output)
      await hooks.commentChecker?.["tool.execute.after"]?.(hookInput, output)
      await hooks.directoryAgentsInjector?.["tool.execute.after"]?.(hookInput, output)
      await hooks.directoryReadmeInjector?.["tool.execute.after"]?.(hookInput, output)
      await hooks.rulesInjector?.["tool.execute.after"]?.(hookInput, output)
      await hooks.emptyTaskResponseDetector?.["tool.execute.after"]?.(hookInput, output)
      await hooks.agentUsageReminder?.["tool.execute.after"]?.(hookInput, output)
      await hooks.categorySkillReminder?.["tool.execute.after"]?.(hookInput, output)
      await hooks.interactiveBashSession?.["tool.execute.after"]?.(hookInput, output)
      await hooks.editErrorRecovery?.["tool.execute.after"]?.(hookInput, output)
      await hooks.delegateTaskRetry?.["tool.execute.after"]?.(hookInput, output)
      await hooks.atlasHook?.["tool.execute.after"]?.(hookInput, output)
      await hooks.taskResumeInfo?.["tool.execute.after"]?.(hookInput, output)
      await hooks.readImageResizer?.["tool.execute.after"]?.(hookInput, output)
      await hooks.hashlineReadEnhancer?.["tool.execute.after"]?.(hookInput, output)
      await hooks.jsonErrorRecovery?.["tool.execute.after"]?.(hookInput, output)
    }

    if (input.tool === "extract" || input.tool === "discard") {
      const originalOutput = {
        title: output.title,
        output: output.output,
        metadata: { ...output.metadata },
      }

      try {
        await runToolExecuteAfterHooks()
      } catch (error) {
        output.title = originalOutput.title
        output.output = originalOutput.output
        output.metadata = originalOutput.metadata
        log("[tool-execute-after] Failed to process extract/discard hooks", {
          tool: input.tool,
          sessionID: input.sessionID,
          callID: input.callID ?? input.callId ?? input.call_id,
          error,
        })
      }

      return
    }

    await runToolExecuteAfterHooks()
  }
}
