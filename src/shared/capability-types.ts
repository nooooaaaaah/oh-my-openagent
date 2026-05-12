export type IntelligenceTier = "low" | "medium" | "high" | "xhigh" | "max"

export type ModelCapability = {
  provider: string
  modelId: string
  contextWindow: number
  supportsThinking: boolean
  supportsVision: boolean
  supportsToolUse: boolean
  intelligenceTier: IntelligenceTier
  supportedVariants: string[]
  supportsReasoningEffort: boolean
  maxReasoningEffort?: string
  reasoningEffortAliases?: Record<string, string>
}

export type AgentCapabilityRequirements = {
  minContextWindow?: number
  supportsThinking?: boolean
  supportsVision?: boolean
  minIntelligence?: IntelligenceTier
  maxIntelligence?: IntelligenceTier
  preferredProviders?: string[]
  supportsReasoningEffort?: boolean
  requiresReasoningEffort?: boolean
}

export type CategoryCapabilityRequirements = {
  minContextWindow?: number
  supportsThinking?: boolean
  supportsVision?: boolean
  minIntelligence?: IntelligenceTier
  maxIntelligence?: IntelligenceTier
  preferredProviders?: string[]
  supportsReasoningEffort?: boolean
  requiresReasoningEffort?: boolean
}

export type CapabilityMatchResult = {
  model: string
  provider: string
  variant?: string
  reasoningEffort?: string
  score: number
}

export const INTELLIGENCE_TIER_RANK: Record<IntelligenceTier, number> = {
  low: 1,
  medium: 2,
  high: 3,
  xhigh: 4,
  max: 5,
}
