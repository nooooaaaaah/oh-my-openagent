# src/ — Plugin Source

See [docs/AGENTS.md](../docs/AGENTS.md) for the high-level architecture and *why* this exists.

## KEY FILES

| File | Purpose |
|------|---------|
| `index.ts` | Plugin entry; exports `{ id: "oh-my-openagent", server }` for OpenCode |
| `plugin-config.ts` | JSONC parse, multi-level merge, Zod v4 validation, migration |
| `plugin-state.ts` | `createModelCacheState()` — shared model resolution cache |
| `plugin-interface.ts` | Wires managers + tools + hooks into OpenCode's 10 `Hooks` handlers |
| `create-managers.ts` | TmuxSessionManager, BackgroundManager, SkillMcpManager, ConfigHandler |
| `create-tools.ts` | SkillContext + AvailableCategories + ToolRegistry |
| `create-hooks.ts` | 5-tier composition → 44 hooks |

## DIRECTORIES

| Directory | Files | Purpose |
|-----------|-------|---------|
| `agents/` | 96 | 11 agent factories (Sisyphus, Hephaestus, Prometheus, Oracle, Librarian, Explore, Atlas, Metis, Momus, Multimodal-Looker, Sisyphus-Junior) |
| `hooks/` | 570 | 44 lifecycle hooks (session, tool guard, transform, continuation, skill tiers) |
| `tools/` | 306 | 16 tool implementations producing 20–25 config-gated tools |
| `features/` | 389 | Feature modules (background-agent, skill-loader, tmux, builtin-skills, etc.) |
| `shared/` | 258 | Cross-cutting utilities: logger, model resolution, config loading, file utils |
| `cli/` | 150 | Commander.js CLI: install, doctor, run, mcp-oauth |
| `plugin/` | 55 | OpenCode hook handlers + 5-tier hook composition + tests |
| `config/` | 41 | Zod v4 schema system (32 schema files) |
| `plugin-handlers/` | 27 | 6-phase config loading pipeline |
| `mcp/` | 7 | 3 built-in remote MCP servers (websearch, etc.) |

## STATS

- 1304 source files + 663 test files
- ~278k LOC total
- 120 barrel `index.ts` files (module boundaries)
- Build target: ESM bundle via `bun build`

## INITIALIZATION (5 steps + wire-up)

```
serverPlugin(input, options)
  1. installAgentSortShim()        # patches Array.prototype.sort for canonical agent order
  2. initConfigContext()           # detects config layout (opencode vs openagent naming)
  3. detectExternalSkillPlugin()   # warn on conflicting skill plugins
  4. injectServerAuthIntoClient()  # wire auth headers into SDK client
  5. loadPluginConfig()            # walk project + user JSONC → Zod safeParse → migrate
  6. createManagers/Tools/Hooks/PluginInterface
```

## HOOK COMPOSITION (5-tier, 44 total)

```
createHooks()
  ├─→ createCoreHooks()
  │   ├─ createSessionHooks()      # 20: contextWindowMonitor, preemptiveCompaction,
  │   │                              sessionRecovery, sessionNotification, thinkMode,
  │   │                              modelFallback, anthropicContextWindowLimitRecovery,
  │   │                              agentUsageReminder, nonInteractiveEnv,
  │   │                              interactiveBashSession, editErrorRecovery,
  │   │                              delegateTaskRetry, startWork, prometheusMdOnly,
  │   │                              sisyphusJuniorNotepad, noSisyphusGpt,
  │   │                              noHephaestusNonGpt, taskResumeInfo,
  │   │                              anthropicEffort, runtimeFallback
  │   ├─ createToolGuardHooks()    # 12: commentChecker, toolOutputTruncator,
  │   │                              directoryAgentsInjector, directoryReadmeInjector,
  │   │                              emptyTaskResponseDetector, rulesInjector,
  │   │                              tasksTodowriteDisabler, writeExistingFileGuard,
  │   │                              bashFileReadGuard, hashlineReadEnhancer,
  │   │                              jsonErrorRecovery, readImageResizer
  │   └─ createTransformHooks()    # 3: claudeCodeHooks, keywordDetector,
  │                                  contextInjectorMessagesTransform
  ├─→ createContinuationHooks()    # 7: stopContinuationGuard, compactionContextInjector,
  │                                  compactionTodoPreserver, todoContinuationEnforcer,
  │                                  unstableAgentBabysitter, backgroundNotificationHook,
  │                                  atlasHook
  └─→ createSkillHooks()           # 2: categorySkillReminder, autoSlashCommand
```

Total: 44 hooks. Each produces `(input, output) => void` handlers; the matching OpenCode
handler invokes them in registration order via `safeHook()` wrappers.

## NOTES

- `plugin-interface.ts` is the **only** layer that talks to OpenCode's `Plugin` API
- Reach for `shared/` before adding helpers anywhere else
- Path aliases are forbidden — use relative imports within a module, barrel across modules
- Config loads from JSONC files walked from pwd to $HOME, merged on top of user config
