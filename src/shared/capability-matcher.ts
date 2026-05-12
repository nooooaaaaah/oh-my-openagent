import type {
  AgentCapabilityRequirements,
  CapabilityMatchResult,
  CategoryCapabilityRequirements,
  IntelligenceTier,
  ModelCapability,
} from "./capability-types"
import { INTELLIGENCE_TIER_RANK } from "./capability-types"
import { inferModelCapabilities } from "./capability-heuristics"

export type AvailableModelEntry = {
  provider: string
  modelId: string
  capabilities?: Partial<ModelCapability>
}

function scoreModel(model: string, capabilities: Partial<ModelCapability>, requirements: AgentCapabilityRequirements): number {
  let score = 0

  const tier = capabilities.intelligenceTier ?? "medium"
  const tierRank = INTELLIGENCE_TIER_RANK[tier]

  if (requirements.minIntelligence) {
    const minRank = INTELLIGENCE_TIER_RANK[requirements.minIntelligence]
    if (tierRank < minRank) return -1
    score += tierRank * 10
  }

  if (requirements.maxIntelligence) {
    const maxRank = INTELLIGENCE_TIER_RANK[requirements.maxIntelligence]
    if (tierRank > maxRank) {
      score -= (tierRank - maxRank) * 5
    }
  }

  if (requirements.minContextWindow) {
    const cw = capabilities.contextWindow ?? 128_000
    if (cw < requirements.minContextWindow) return -1
    score += Math.min(cw / 10000, 20)
  }

  if (requirements.supportsThinking && !capabilities.supportsThinking) {
    if (capabilities.supportsThinking === false) {
      if (requirements.requiresReasoningEffort) return -1
      score -= 15
    }
  }

  if (requirements.supportsVision && !capabilities.supportsVision) {
    return -1
  }

  if (requirements.preferredProviders && requirements.preferredProviders.length > 0) {
    const provider = capabilities.provider ?? ""
    const idx = requirements.preferredProviders.indexOf(provider)
    if (idx >= 0) {
      score += (requirements.preferredProviders.length - idx) * 3
    }
  }

  return score
}

export function findBestMatch(
  agentName: string,
  availableModels: AvailableModelEntry[],
  requirements: AgentCapabilityRequirements,
): CapabilityMatchResult | null {
  let bestScore = -Infinity
  let bestMatch: CapabilityMatchResult | null = null

  for (const entry of availableModels) {
    const fullModelId = `${entry.provider}/${entry.modelId}`
    const caps = entry.capabilities ?? inferModelCapabilities(fullModelId)
    const score = scoreModel(fullModelId, caps, requirements)

    if (score < 0) continue

    if (score > bestScore) {
      bestScore = score
      bestMatch = {
        model: fullModelId,
        provider: entry.provider,
        variant: capabilitiesToVariant(caps, requirements),
        score,
      }
    }
  }

  return bestMatch
}

export function findBestCategoryMatch(
  categoryName: string,
  availableModels: AvailableModelEntry[],
  requirements: CategoryCapabilityRequirements,
): CapabilityMatchResult | null {
  return findBestMatch(categoryName, availableModels, requirements as AgentCapabilityRequirements)
}

function capabilitiesToVariant(capabilities: Partial<ModelCapability>, requirements: AgentCapabilityRequirements): string | undefined {
  const variants = capabilities.supportedVariants ?? ["low", "medium", "high"]
  const tier = capabilities.intelligenceTier ?? "medium"

  if (tier === "max" || tier === "xhigh") {
    if (variants.includes("high")) return "high"
    if (variants.includes("medium")) return "medium"
  }

  if (tier === "high") {
    if (variants.includes("medium")) return "medium"
    if (variants.includes("high")) return "high"
  }

  return variants[Math.min(1, variants.length - 1)]
}

export function filterModelsByCapability(
  models: AvailableModelEntry[],
  requirements: AgentCapabilityRequirements,
): AvailableModelEntry[] {
  return models
    .map((entry) => {
      const fullModelId = `${entry.provider}/${entry.modelId}`
      const caps = entry.capabilities ?? inferModelCapabilities(fullModelId)
      const score = scoreModel(fullModelId, caps, requirements)
      return { entry, score }
    })
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry)
}

export function getDefaultVariantForModel(modelId: string): string {
  const caps = inferModelCapabilities(modelId)
  const variants = caps.supportedVariants ?? ["low", "medium", "high"]
  return variants[Math.min(1, variants.length - 1)]
}

export function supportsThinkingForModel(modelId: string): boolean {
  return inferModelCapabilities(modelId).supportsThinking ?? false
}

export function getContextWindowForModel(modelId: string): number {
  return inferModelCapabilities(modelId).contextWindow ?? 128_000
}
