/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import type { PluginInput } from "@opencode-ai/plugin"

import { OhMyOpenCodeConfigSchema } from "./config/schema/oh-my-opencode-config"
import { createManagers } from "./create-managers"
import { createModelCacheState } from "./plugin-state"

type CleanupRegistration = {
  shutdown: () => void | Promise<void>
}

const markServerRunningInProcess = mock(() => {})
let backgroundManagerOptions: {
  onSubagentSessionCreated?: (event: { sessionID: string; parentID: string; title: string }) => Promise<void>
} | null = null
const registeredCleanupManagers: CleanupRegistration[] = []

class MockBackgroundManager {
  constructor(config: {
    onSubagentSessionCreated?: (event: { sessionID: string; parentID: string; title: string }) => Promise<void>
  }) {
    backgroundManagerOptions = config
  }
}

class MockSkillMcpManager {
  constructor(..._args: unknown[]) {}
}

class MockTmuxSessionManager {
  constructor(_ctx: PluginInput, _config: unknown) {}

  async cleanup(): Promise<void> {}
}

function createConfigHandler(): ReturnType<typeof import("./plugin-handlers").createConfigHandler> {
  return async () => {}
}

function initTaskToastManager(): ReturnType<typeof import("./features/task-toast-manager").initTaskToastManager> {
  return {} as ReturnType<typeof import("./features/task-toast-manager").initTaskToastManager>
}

function registerManagerForCleanup(manager: CleanupRegistration): void {
  registeredCleanupManagers.push(manager)
}

function createDeps(): NonNullable<Parameters<typeof createManagers>[0]["deps"]> {
  return {
    BackgroundManagerClass: MockBackgroundManager as typeof import("./features/background-agent").BackgroundManager,
    SkillMcpManagerClass: MockSkillMcpManager as typeof import("./features/skill-mcp-manager").SkillMcpManager,
    TmuxSessionManagerClass: MockTmuxSessionManager as typeof import("./features/tmux-subagent").TmuxSessionManager,
    initTaskToastManagerFn: initTaskToastManager,
    registerManagerForCleanupFn: registerManagerForCleanup,
    createConfigHandlerFn: createConfigHandler,
    markServerRunningInProcessFn: markServerRunningInProcess,
  }
}

function createTmuxConfig(enabled: boolean) {
  return {
    enabled,
    layout: "main-vertical" as const,
    main_pane_size: 60,
    main_pane_min_width: 120,
    agent_pane_min_width: 40,
    isolation: "inline" as const,
  }
}

function createContext(directory: string): PluginInput {
  const shell = Object.assign(
    () => {
      throw new Error("shell should not be called in this test")
    },
    {
      braces: () => [],
      escape: (input: string) => input,
      env() {
        return shell
      },
      cwd() {
        return shell
      },
      nothrow() {
        return shell
      },
      throws() {
        return shell
      },
    },
  )

  return {
    project: {
      id: "project-id",
      worktree: directory,
      time: { created: Date.now() },
    },
    directory,
    worktree: directory,
    serverUrl: new URL("http://localhost:4096"),
    $: shell,
    client: {} as PluginInput["client"],
  }
}

describe("createManagers", () => {
  beforeEach(() => {
    markServerRunningInProcess.mockClear()
    backgroundManagerOptions = null
    registeredCleanupManagers.length = 0
  })

  it("#given tmux integration is disabled #when managers are created #then it does not mark the tmux server as running", () => {
    const args = {
      ctx: createContext("/tmp"),
      pluginConfig: OhMyOpenCodeConfigSchema.parse({}),
      tmuxConfig: createTmuxConfig(false),
      modelCacheState: createModelCacheState(),
      backgroundNotificationHookEnabled: false,
      deps: createDeps(),
    }

    createManagers(args)

    expect(markServerRunningInProcess).not.toHaveBeenCalled()
  })

  it("#given tmux integration is enabled #when managers are created #then it marks the tmux server as running", () => {
    const args = {
      ctx: createContext("/tmp"),
      pluginConfig: OhMyOpenCodeConfigSchema.parse({}),
      tmuxConfig: createTmuxConfig(true),
      modelCacheState: createModelCacheState(),
      backgroundNotificationHookEnabled: false,
      deps: createDeps(),
    }

    createManagers(args)

    expect(markServerRunningInProcess).toHaveBeenCalledTimes(1)
  })
})
