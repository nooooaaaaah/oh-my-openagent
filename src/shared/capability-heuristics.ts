import type { ModelCapability, IntelligenceTier } from "./capability-types"

export function extractModelName(modelId: string): string {
  const parts = modelId.split("/")
  return parts.length >= 2 ? parts.slice(1).join("/") : modelId
}

export function extractProvider(modelId: string): string | undefined {
  const parts = modelId.split("/")
  return parts.length >= 2 ? parts[0] : undefined
}

export function inferModelCapabilities(modelId: string): Partial<ModelCapability> {
  const name = extractModelName(modelId).toLowerCase()
  const provider = extractProvider(modelId)

  const capabilities: Partial<ModelCapability> = {
    provider: provider ?? "unknown",
    modelId,
    contextWindow: 128_000,
    supportsThinking: false,
    supportsVision: false,
    supportsToolUse: true,
    intelligenceTier: "medium",
    supportedVariants: ["low", "medium", "high"],
    supportsReasoningEffort: false,
  }

  if (name.includes("opus")) {
    capabilities.intelligenceTier = "max"
    capabilities.supportsThinking = true
    capabilities.supportedVariants = ["low", "medium", "high", "max"]
    capabilities.contextWindow = 200_000
  } else if (name.includes("sonnet")) {
    capabilities.intelligenceTier = "high"
    capabilities.supportsThinking = true
    capabilities.contextWindow = 200_000
  } else if (name.includes("haiku")) {
    capabilities.intelligenceTier = "medium"
    capabilities.supportsThinking = true
    capabilities.contextWindow = 200_000
  } else if (name.includes("claude")) {
    capabilities.intelligenceTier = "high"
    capabilities.supportsThinking = true
    capabilities.contextWindow = 200_000
  } else if (/gpt-4/.test(name) || /gpt-5/.test(name)) {
    capabilities.intelligenceTier = "xhigh"
    capabilities.supportsReasoningEffort = true
    capabilities.maxReasoningEffort = "max"
    capabilities.reasoningEffortAliases = {}
    capabilities.supportedVariants = ["low", "medium", "high", "xhigh"]
    capabilities.contextWindow = 128_000
  } else if (/o\d/.test(name)) {
    capabilities.intelligenceTier = "xhigh"
    capabilities.supportsReasoningEffort = true
    capabilities.maxReasoningEffort = "high"
    capabilities.supportedVariants = ["low", "medium", "high"]
  } else if (name.includes("gpt")) {
    capabilities.intelligenceTier = "medium"
    capabilities.supportedVariants = ["low", "medium", "high"]
  } else if (name.includes("gemini")) {
    capabilities.intelligenceTier = "high"
    capabilities.supportsVision = true
    capabilities.supportedVariants = ["low", "medium", "high"]
    capabilities.contextWindow = 1_000_000
  } else if (name.includes("kimi") || name.includes("k2")) {
    capabilities.intelligenceTier = "high"
    if (name.includes("think")) {
      capabilities.supportsThinking = true
    }
    capabilities.contextWindow = 128_000
  } else if (name.includes("glm")) {
    capabilities.intelligenceTier = "medium"
    capabilities.contextWindow = 128_000
  } else if (name.includes("minimax")) {
    capabilities.intelligenceTier = "medium"
    capabilities.contextWindow = 128_000
  } else if (name.includes("deepseek")) {
    capabilities.intelligenceTier = "high"
    capabilities.supportsReasoningEffort = true
    capabilities.maxReasoningEffort = "max"
    capabilities.reasoningEffortAliases = {
      low: "high",
      medium: "high",
      xhigh: "max",
    }
    capabilities.contextWindow = 128_000
  } else if (name.includes("mistral") || name.includes("codestral")) {
    capabilities.intelligenceTier = "high"
    capabilities.contextWindow = 128_000
  } else if (name.includes("llama")) {
    capabilities.intelligenceTier = "medium"
    capabilities.contextWindow = 128_000
  } else if (name.includes("qwen")) {
    capabilities.intelligenceTier = "medium"
    capabilities.contextWindow = 128_000
    if (name.includes("qwq") || name.includes("qvq")) {
      capabilities.supportsThinking = true
    }
  }

  if (name.includes("vision") || name.includes("v-") || name.includes("vl")) {
    capabilities.supportsVision = true
  }

  return capabilities
}

export function estimateIntelligenceTier(modelId: string): IntelligenceTier {
  return inferModelCapabilities(modelId).intelligenceTier ?? "medium"
}
