import { describe, it, expect } from "bun:test"

import { createMessagesTransformHandler } from "./messages-transform"
import type { CreatedHooks } from "../create-hooks"

type TestPart = {
  type: string
  id?: string
  sessionID?: string
  messageID?: string
  callID?: string
  tool_use_id?: string
  content?: string
  text?: string
  synthetic?: boolean
}

type TestMessage = {
  info: { role: "assistant" | "user" }
  parts: TestPart[]
}

type TransformHook = (
  input: Record<string, never>,
  output: { messages: TestMessage[] },
) => Promise<void>

function makeHook(handler: TransformHook): NonNullable<CreatedHooks["contextInjectorMessagesTransform"]> {
  return {
    "experimental.chat.messages.transform": handler as never,
  } as never
}

function makeHooks(overrides: {
  contextInjector?: TransformHook
}): CreatedHooks {
  return {
    contextInjectorMessagesTransform: overrides.contextInjector ? makeHook(overrides.contextInjector) : undefined,
  } as CreatedHooks
}

async function runHandler(
  hooks: CreatedHooks,
  messages: TestMessage[],
): Promise<void> {
  const handler = createMessagesTransformHandler({ hooks })
  await handler({} as never, { messages: messages as never })
}

describe("createMessagesTransformHandler", () => {
  it("runs context-injector hook", async () => {
    //#given
    let ran = false
    const hooks = makeHooks({
      contextInjector: async () => {
        ran = true
      },
    })

    //#when
    await runHandler(hooks, [])

    //#then
    expect(ran).toBe(true)
  })

  it("continues when context-injector throws", async () => {
    //#given
    const hooks = makeHooks({
      contextInjector: async () => {
        throw new Error("context-injector boom")
      },
    })

    //#when / #then
    await runHandler(hooks, [])
  })

  it("appends a synthetic user turn when transformed messages end with assistant prefill", async () => {
    //#given
    const messages: TestMessage[] = [
      { info: { role: "user" }, parts: [{ type: "text", text: "work on this" }] },
      { info: { role: "assistant" }, parts: [{ type: "text", text: "partial assistant tail" }] },
    ]

    //#when
    await runHandler(makeHooks({}), messages)

    //#then
    expect(messages.at(-1)?.info).toMatchObject({ role: "user" })
    expect(messages.at(-1)?.parts[0]).toMatchObject({
      type: "text",
      text: "[internal] Continue from the previous assistant state.",
      synthetic: true,
    })
  })
})
