import type { NPCMemory } from '@/types/game'

/** NPC 语气模板：不同语气下的对话文本 */
export interface NPCToneTemplate {
  /** 问候语 */
  greeting: string
  /** 同意时 */
  agreement: string
  /** 反对时 */
  disagreement: string
  /** 警告时 */
  warning: string
}

/** 各语气对应的对话模板 */
export const NPC_TONES: Record<string, NPCToneTemplate> = {
  friendly: {
    greeting: '总理，很高兴见到您。有什么需要我效劳的？',
    agreement: '我完全支持您的决定，这就去办。',
    disagreement: '恕我直言，这个方案可能需要再斟酌一下。',
    warning: '作为朋友，我必须提醒您注意这个风险。',
  },
  neutral: {
    greeting: '总理好。请指示。',
    agreement: '明白，按您的指示执行。',
    disagreement: '我保留意见，但服从决定。',
    warning: '提醒您关注此事。',
  },
  resentful: {
    greeting: '哦，是总理啊。有何贵干？',
    agreement: '行吧，您说了算。（暗自冷笑）',
    disagreement: '哼，又是一个不得人心的决定。',
    warning: '您最好小心点，别怪我没提醒您。',
  },
  hostile: {
    greeting: '（阴阳怪气）哟，总理还记得我啊？',
    agreement: '（皮笑肉不笑）遵命，总理大人。',
    disagreement: '这是彻头彻尾的错误！我会让所有人知道。',
    warning: '您的好日子不多了，等着瞧吧。',
  },
}

/** 根据 NPC 记忆获取语气 */
export function getNPCTone(npcMemories: NPCMemory[] | undefined, npcId: string): string {
  const memory = npcMemories?.find((m) => m.npcId === npcId)
  return memory?.tone ?? 'neutral'
}

/** 获取 NPC 对话文本 */
export function getNPCDialogue(
  npcMemories: NPCMemory[] | undefined,
  npcId: string,
  context: 'greeting' | 'agreement' | 'disagreement' | 'warning',
): string {
  const tone = getNPCTone(npcMemories, npcId)
  return NPC_TONES[tone]?.[context] ?? NPC_TONES.neutral[context]
}

/** 检查是否有背叛记录的 NPC（用于不信任投票时投反对票） */
export function getBetrayedNPCs(npcMemories: NPCMemory[] | undefined): string[] {
  if (!npcMemories) return []
  return npcMemories
    .filter((m) => m.tone === 'resentful' || m.tone === 'hostile')
    .map((m) => m.npcId)
}
