import { z } from "zod"

export const BuiltinCommandNameSchema = z.enum([
  "init-deep",

  "refactor",
  "start-work",
  "stop-continuation",
  "remove-ai-slops",
  "hyperplan",
])

export type BuiltinCommandName = z.infer<typeof BuiltinCommandNameSchema>
