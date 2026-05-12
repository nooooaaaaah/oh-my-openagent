# src/hooks/ — 44 Lifecycle Hooks

5-tier composition wired in `src/plugin/hooks/`. All hooks follow `createXXXHook(deps) → HookFunction` factory pattern.

## TIER COMPOSITION

| Tier | Composer | Count | Where Applied |
|------|----------|-------|---------------|
| **Session** | `create-session-hooks.ts` | 20 | session.idle, session.error, chat.params, chat.message |
| **Tool Guard** | `create-tool-guard-hooks.ts` | 14 | tool.execute.before, tool.execute.after |
| **Transform** | `create-transform-hooks.ts` | 3 | experimental.chat.messages.transform |
| **Continuation** | `create-continuation-hooks.ts` | 7 | session.idle, session.compacted, chat.message |
| **Skill** | `create-skill-hooks.ts` | 2 | chat.message |
| **Total** | | **44** | |

Hook name allowlist for `disabled_hooks`: 53 enum values in `src/config/schema/hooks.ts`.

### Tier 1: Session Hooks (19 + 1 = 20)

| Hook | Event | Purpose |
|------|-------|---------|
| `contextWindowMonitor` | session.idle | Track context usage percentage |
| `preemptiveCompaction` | session.idle | Trigger compaction before hitting context limit |
| `sessionRecovery` | session.error | Recover from structural errors |
| `sessionNotification` | session.idle | OS notifications on completion |
| `thinkMode` | chat.params | Model variant switching for extended thinking |
| `anthropicContextWindowLimitRecovery` | session.error | Multi-strategy context recovery |
| `agentUsageReminder` | chat.message | Remind about available agents |
| `nonInteractiveEnv` | chat.message | Adjust behavior for `run` command |
| `interactiveBashSession` | tool.execute | Tmux session lifecycle for interactive_bash |
| `editErrorRecovery` | tool.execute.after | Retry failed file edits |
| `delegateTaskRetry` | tool.execute.after | Retry failed task delegations |
| `startWork` | chat.message | `/start-work` command handler |
| `prometheusMdOnly` | tool.execute.before | Enforce .md-only writes for Prometheus |
| `sisyphusJuniorNotepad` | chat.message | Notepad injection for subagents |
| `taskResumeInfo` | chat.message | Inject task context on resume |
| `anthropicEffort` | chat.params | Adjust reasoning effort level |
| `modelFallback` | chat.params | Provider-level proactive model fallback |
| `noSisyphusGpt` | chat.message | Block Sisyphus from non-GPT providers |
| `noHephaestusNonGpt` | chat.message | Block Hephaestus from non-GPT models |
| `runtimeFallback` | event | Reactive auto-switch on API provider errors |

### Tier 2: Tool Guard Hooks (14)

| Hook | Event | Purpose |
|------|-------|---------|
| `commentChecker` | tool.execute.after | Block AI-slop comment patterns |
| `toolOutputTruncator` | tool.execute.after | Truncate oversized tool output |
| `directoryAgentsInjector` | tool.execute.before | Inject dir-local AGENTS.md into context |
| `directoryReadmeInjector` | tool.execute.before | Inject dir-local README.md into context |
| `emptyTaskResponseDetector` | tool.execute.after | Detect empty task results |
| `rulesInjector` | tool.execute.before | Conditional rules injection |
| `tasksTodowriteDisabler` | tool.execute.before | Disable TodoWrite when task system active |
| `writeExistingFileGuard` | tool.execute.before | Require Read before Write/Edit |
| `bashFileReadGuard` | tool.execute.before | Guard bash commands that read files |
| `readImageResizer` | tool.execute.after | Resize large images for context efficiency |
| `hashlineReadEnhancer` | tool.execute.after | Tag Read outputs with `LINE#ID` hashes |
| `jsonErrorRecovery` | tool.execute.after | Detect JSON parse errors, inject reminder |
| `todoDescriptionOverride` | tool.execute.before | Override todo item descriptions |
| `webfetchRedirectGuard` | tool.execute.before | Guard webfetch redirect behavior |

### Tier 3: Transform Hooks (3)

| Hook | Event | Purpose |
|------|-------|---------|
| `claudeCodeHooks` | messages.transform | Claude Code settings.json compat |
| `keywordDetector` | messages.transform | Detect ultrawork/search/analyze modes |
| `contextInjectorMessagesTransform` | messages.transform | Inject AGENTS.md/README.md into context |

### Tier 4: Continuation Hooks (7)

| Hook | Event | Purpose |
|------|-------|---------|
| `stopContinuationGuard` | chat.message | `/stop-continuation` command handler |
| `compactionContextInjector` | session.compacted | Re-inject context after compaction |
| `compactionTodoPreserver` | session.compacted | Preserve todos through compaction |
| `todoContinuationEnforcer` | session.idle | Force continuation on incomplete todos |
| `unstableAgentBabysitter` | session.idle | Monitor unstable agent behavior |
| `backgroundNotificationHook` | event | Background task completion notifications |
| `atlasHook` | event | Master orchestrator for boulder/background sessions |

### Tier 5: Skill Hooks (2)

| Hook | Event | Purpose |
|------|-------|---------|
| `categorySkillReminder` | chat.message | Hint to load skills before invoking categories |
| `autoSlashCommand` | chat.message | Auto-execute matching `/command` from user message |

## STRUCTURE

```
hooks/
├── shared/                    # Cross-hook helpers (timing, prompt builders, etc.)
├── (42 hook directories)
├── zauc-mocks-bg, …           # Test mocks (NOT hooks; sorted here for test isolation)
└── (each hook dir)/
    ├── index.ts        # createXXXHook factory + barrel
    ├── *.ts            # implementation
    └── *.test.ts       # bun:test
```

## ADDING A NEW HOOK

1. `mkdir src/hooks/{name}` + `index.ts` exporting `createXXXHook(deps)`
2. Pick tier → add to matching `create-{tier}-hooks.ts`
3. Add hook name to `config/schema/hooks.ts` `HookNameSchema`
4. Cover with co-located `*.test.ts`

## NOTES

- Tier order within a phase matters: earlier hooks see un-mutated input
- `zauc-mocks-*` dirs are NOT hooks — placed here for `bun:test` sort-order isolation
- `runtime-fallback` vs `model-fallback`: reactive vs proactive — independent systems
