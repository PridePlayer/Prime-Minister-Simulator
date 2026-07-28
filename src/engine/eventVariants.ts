import type { GameEvent, GameState } from '@/types/game'

/**
 * v1.5：事件变体改写系统
 *
 * 问题：玩家在短时间内连续看到同类事件（如两次罢工、两次记者会）时，
 * 即便事件 ID 不同，文案高度相似也会显得"复读"。
 *
 * 方案：每次给玩家展示一个事件前，检查近期已触发事件中是否有同分类的。
 * 若有，则对当前事件的标题/描述做"变体改写"——根据变体序号套用不同的
 * 时间/地点/角色后缀，让玩家感觉事件是世界中的"新一次"而非"旧条目复读"。
 *
 * 这是纯文案层面的改写，事件选项、效果、ID 全部不变，仅影响玩家观感。
 */

/** 变体后缀表：每个分类提供 4 套备选措辞 */
const VARIANT_SUFFIXES: Record<string, { titleSuffix: string[]; descPrefix: string[] }> = {
  经济: {
    titleSuffix: ['（新一轮）', '：第二波', '：升级版', '：变种危机'],
    descPrefix: ['【与上轮类似但更复杂】', '【局势已变】', '【这次波及更广】', '【再起波澜】'],
  },
  社会: {
    titleSuffix: ['：再度爆发', '（扩大化）', '：新一轮', '：变种'],
    descPrefix: ['【事态升级】', '【这次规模更大】', '【与上次有别】', '【再次发酵】'],
  },
  外交: {
    titleSuffix: ['（再起波澜）', '：续篇', '：新阶段', '：升级版'],
    descPrefix: ['【外交风云再起】', '【此次涉及更广】', '【局势已变】', '【新一轮博弈】'],
  },
  军事: {
    titleSuffix: ['（新一轮）', '：续战', '：新动向', '：变种事态'],
    descPrefix: ['【战事再起】', '【局势升级】', '【新动向】', '【再次触发】'],
  },
  环境: {
    titleSuffix: ['（复发）', '：第二波', '：扩大化', '：新阶段'],
    descPrefix: ['【环境再受冲击】', '【这次影响更广】', '【新一轮危机】', '【再次发酵】'],
  },
  政治体制: {
    titleSuffix: ['（再起）', '：续篇', '：新阶段', '：变种'],
    descPrefix: ['【政治风云再起】', '【这次波及更广】', '【局势已变】', '【新一轮博弈】'],
  },
  突发: {
    titleSuffix: ['（再发）', '：续发', '：新情况', '：变种'],
    descPrefix: ['【突发再起】', '【这次更紧急】', '【新一轮突发】', '【再次发酵】'],
  },
  紧急: {
    titleSuffix: ['（再起）', '：第二波', '：扩大化', '：新阶段'],
    descPrefix: ['【紧急再起】', '【这次更危急】', '【新一轮危机】', '【再次告急】'],
  },
}

/** 检查近期是否触发过同分类事件（冷却期内） */
function hasRecentSameCategoryEvent(state: GameState, category: string, currentEventId: string): boolean {
  const RECENT_DAYS = 90 // 90 天内视为"近期"
  return state.eventCooldowns.some(
    (c) =>
      c.eventId !== currentEventId &&
      state.totalDays - c.triggeredDay < RECENT_DAYS &&
      // 通过事件 ID 模式匹配同分类（约定事件 ID 中带分类前缀如 eco_, soc_, dip_, mil_）
      isSameCategoryById(c.eventId, category),
  )
}

/** 通过事件 ID 前缀猜测分类（避免引入完整事件库做查找） */
function isSameCategoryById(eventId: string, category: string): boolean {
  const prefixMap: Record<string, string[]> = {
    经济: ['eco_', 'econ_', 'treasury_', 'budget_'],
    社会: ['soc_', 'society_', 'protest_', 'strike_'],
    外交: ['dip_', 'diplomacy_', 'treaty_'],
    军事: ['mil_', 'military_', 'war_'],
    环境: ['env_', 'eco_env', 'pollution_'],
    政治体制: ['pol_', 'politics_', 'party_'],
    突发: ['break_', 'urgent_'],
    紧急: ['emg_', 'emergency_'],
  }
  const prefixes = prefixMap[category] ?? []
  return prefixes.some((p) => eventId.startsWith(p))
}

/**
 * 给事件套用变体后缀，避免文案复读。
 * 仅在"近期触发过同分类事件"时启用。
 *
 * @returns 新的 GameEvent 对象（不改原对象）；若不需要变体则原样返回
 */
export function applyVariantIfRepeated(
  event: GameEvent,
  state: GameState,
): GameEvent {
  if (!hasRecentSameCategoryEvent(state, event.category, event.id)) {
    return event
  }
  const variants = VARIANT_SUFFIXES[event.category]
  if (!variants) return event

  // 用 totalDays 作为伪随机种子，保证同一事件在同一时刻变体一致
  const seed = (state.totalDays + event.id.length) % 4
  const titleSuffix = variants.titleSuffix[seed]
  const descPrefix = variants.descPrefix[seed]

  return {
    ...event,
    title: `${event.title}${titleSuffix}`,
    description: `${descPrefix}${event.description}`,
  }
}
