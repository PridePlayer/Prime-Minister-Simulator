import type { GameEvent, GameState, NewsItem, EmergencyEvent, SecondaryMetrics, CabinetChatMessage, CabinetChatThread, DelayedConsequence, PendingEvent, Metrics } from '@/types/game'
import { EVENTS } from '@/data/events'
import { EMERGENCIES } from '@/data/emergencies'
import { INVASIONS } from '@/data/invasions'
import { INITIATIVES } from '@/data/initiatives'
import { PLAYABLE_PARTIES } from '@/data/parties'
import { applyEffects, naturalDecay, clamp } from './metrics'
import { DEBATE_QUESTIONS, DEBATE_CARDS } from '@/data/debates'
import { CONSTITUENCY_LETTERS } from '@/data/letters'
import { DIPLOMATIC_NOTES } from '@/data/notes'
import { rollFateEvent } from '@/data/fateEvents'
import { pickCabinetChatTemplate } from '@/data/cabinetChats'
import { NATIONAL_POLICIES } from '@/data/nationalPolicies'
import { deriveRelationLevel } from '@/data/diplomacy'
import { generateMonthlyAmbientNews } from '@/data/ambientNews'
import { checkPMTraitEvent, getTraitEventInstanceId } from '@/data/pmTraitEvents'
import { shouldShowOptionEffects, getScaledEffects } from '@/engine/metrics'

/** 事件默认冷却天数 */
export const EVENT_COOLDOWN_DAYS = 240

/** 计算本月最大行动次数：health < 30 时为 2，否则为 3 */
export function getMaxActionsPerTurn(state: GameState): number {
  return state.pmTraitsNumeric.health < 30 ? 2 : 3
}

/**
 * 应用总理性格特质（果断、韧性）对选项效果的缩放
 *
 * 果断（decisiveness）：
 *   - > 70：正向效果 +10%，负向效果 -10%（果断决策放大收益、缩小损失）
 *   - < 30：正向效果 -20%（优柔寡断惩罚，错失部分收益）
 *
 * 韧性（resilience）：
 *   - 当 consecutiveNegativeEvents >= 2 时，下一波负面效果按 (100 - resilience) / 100 缩放
 *   - 韧性 80 → 仅受 20% 损失
 *
 * 返回缩放后的效果对象与"是否为净负面事件"标志
 */
export function applyTraitScaling(
  effects: Partial<Metrics>,
  state: GameState,
): { scaledEffects: Partial<Metrics>; isNegative: boolean } {
  // 基于原始 effects 判定净正/负
  const netEffect = (Object.values(effects) as number[]).reduce((sum, v) => sum + (v ?? 0), 0)
  const isNegative = netEffect < 0

  let scaled: Partial<Metrics> = { ...effects }

  // 1. 韧性缩放：连续负面事件时降低损失
  if (isNegative && state.consecutiveNegativeEvents >= 2) {
    const resilienceScale = (100 - state.pmTraitsNumeric.resilience) / 100
    const next: Partial<Metrics> = {}
    for (const [k, v] of Object.entries(scaled)) {
      const key = k as keyof Metrics
      if (typeof v === 'number' && v < 0) {
        next[key] = Math.floor(v * resilienceScale)
      } else {
        next[key] = v
      }
    }
    scaled = next
  }

  // 2. 果断缩放：放大正向效果、缩小负向效果（>70）；优柔寡断惩罚正向效果（<30）
  if (state.pmTraitsNumeric.decisiveness > 70) {
    const next: Partial<Metrics> = {}
    for (const [k, v] of Object.entries(scaled)) {
      const key = k as keyof Metrics
      if (typeof v === 'number') {
        if (v > 0) next[key] = Math.floor(v * 1.1)
        else if (v < 0) next[key] = Math.floor(v * 0.9)
        else next[key] = v
      } else {
        next[key] = v
      }
    }
    scaled = next
  } else if (state.pmTraitsNumeric.decisiveness < 30) {
    // 优柔寡断惩罚：正向效果 -20%
    const next: Partial<Metrics> = {}
    for (const [k, v] of Object.entries(scaled)) {
      const key = k as keyof Metrics
      if (typeof v === 'number' && v > 0) {
        next[key] = Math.floor(v * 0.8)
      } else {
        next[key] = v
      }
    }
    scaled = next
  }

  return { scaledEffects: scaled, isNegative }
}

/** 检查事件是否在冷却期内 */
export function isEventInCooldown(state: GameState, eventId: string): boolean {
  const cooldown = state.eventCooldowns.find((c) => c.eventId === eventId)
  if (!cooldown) return false
  return state.totalDays - cooldown.triggeredDay < cooldown.cooldownDays
}

/** 记录事件触发到冷却池 */
export function recordEventTrigger(state: GameState, eventId: string): GameState {
  // 移除旧的冷却记录（同事件）
  const filtered = state.eventCooldowns.filter((c) => c.eventId !== eventId)
  return {
    ...state,
    eventCooldowns: [
      ...filtered,
      { eventId, triggeredDay: state.totalDays, cooldownDays: EVENT_COOLDOWN_DAYS },
    ],
  }
}

/** 清理已过期的冷却记录 */
export function cleanupExpiredCooldowns(state: GameState): GameState {
  return {
    ...state,
    eventCooldowns: state.eventCooldowns.filter(
      (c) => state.totalDays - c.triggeredDay < c.cooldownDays,
    ),
  }
}

/** 从事件库中挑选下一个事件
 *  注意：返回 chain 事件时，会通过副作用从 state.pendingChains 中移除该条目，
 *  避免同一事件链被反复触发。
 */
export function pickEvent(state: GameState): GameEvent | null {
  // 优先检查事件链
  const pendingChainIdx = state.pendingChains.findIndex((c) => c.triggerTurn <= state.turn)
  if (pendingChainIdx >= 0) {
    const pendingChain = state.pendingChains[pendingChainIdx]
    const chainEvent = EVENTS.find((e) => e.id === pendingChain.chainId)
    if (chainEvent) {
      // 立即从 pendingChains 中移除，防止重复触发
      state.pendingChains = [
        ...state.pendingChains.slice(0, pendingChainIdx),
        ...state.pendingChains.slice(pendingChainIdx + 1),
      ]
      return chainEvent
    }
    // 找不到对应事件：也移除这个无效的 chain 记录
    state.pendingChains = [
      ...state.pendingChains.slice(0, pendingChainIdx),
      ...state.pendingChains.slice(pendingChainIdx + 1),
    ]
  }

  // 检查紧急事件
  const emergency = checkEmergency(state)
  if (emergency) {
    return null // 紧急事件通过 currentEmergency 处理
  }

  // 检查入侵事件
  const invasion = checkInvasion(state)
  if (invasion) {
    return null // 入侵事件通过 currentEmergency 处理
  }

  // 普通随机事件：排除冷却期内的事件
  const available = EVENTS.filter((e) => {
    if (e.triggeredBy) return false // 事件链事件不随机触发
    if (e.minTurn && state.turn < e.minTurn) return false
    if (e.once && state.resolvedEventIds.includes(e.id)) return false
    // 冷却期内的事件不参与随机
    if (isEventInCooldown(state, e.id)) return false
    return true
  })
  if (available.length === 0) return null

  // 加权随机：道德过低增加丑闻/腐败类事件权重
  const weights = available.map((e) => {
    let w = e.weight ?? 1
    const isScandalEvent = e.id.includes('scandal') || e.id.includes('corruption')
    if (isScandalEvent) {
      if (state.pmTraitsNumeric.integrity < 30) {
        w *= 2
      } else if (state.pmTraitsNumeric.integrity < 50) {
        w *= 1.5
      }
    }
    return w
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < available.length; i++) {
    r -= weights[i]
    if (r <= 0) return available[i]
  }
  return available[available.length - 1]
}

/** 检查是否触发紧急事件 */
export function checkEmergency(state: GameState): EmergencyEvent | null {
  for (const emergency of EMERGENCIES) {
    // 检查触发条件
    const triggered = Object.entries(emergency.trigger).every(([key, threshold]) => {
      const value = state.metrics[key as keyof typeof state.metrics]
      return value <= threshold
    })

    if (!triggered) continue

    // 检查是否已触发过（不可重复的）
    if (!emergency.repeatable && state.triggeredEmergencyIds.includes(emergency.id)) {
      continue
    }

    // 检查冷却
    if (emergency.cooldown) {
      const lastTriggered = state.triggeredEmergencyIds.filter((id) => id.startsWith(emergency.id))
      if (lastTriggered.length > 0) {
        // 简化：只要有触发记录就认为在冷却中
        // 实际应该记录触发回合数
        continue
      }
    }

    return emergency
  }
  return null
}

/** 检查是否触发入侵事件 */
export function checkInvasion(state: GameState): EmergencyEvent | null {
  for (const invasion of INVASIONS) {
    if (invasion.trigger(state)) {
      // 将入侵事件转换为紧急事件格式
      return {
        id: invasion.id,
        title: invasion.title,
        category: '紧急',
        description: invasion.description,
        trigger: {},
        options: invasion.phases[0].options,
        repeatable: false,
      }
    }
  }
  return null
}

/** 生成新闻条目 */
export function makeNews(
  state: GameState,
  title: string,
  summary: string,
  category: NewsItem['category'],
  tone: NewsItem['tone'] = 'neutral',
): NewsItem {
  return {
    id: `news_${state.turn}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: `${state.year}年${state.month}月`,
    title,
    summary,
    category,
    tone,
  }
}

/** 选择某选项后产生的下一状态（不推进时间） */
export function resolveOption(
  state: GameState,
  event: GameEvent | EmergencyEvent,
  optionId: string,
): { state: GameState; news: NewsItem } {
  const option = event.options.find((o) => o.id === optionId)
  if (!option) return { state, news: makeNews(state, '决策无效', '未找到该选项。', '决策', 'neutral') }

  // 应用总理性格特质缩放（果断、韧性）→ 得到缩放后的 effects 与"是否净负面"标志
  const { scaledEffects, isNegative } = applyTraitScaling(option.effects, state)

  // 应用一级指标效果（困难模式缩放：加成打折、扣分放大）
  const metrics = applyEffects(state.metrics, scaledEffects, state.difficulty)

  // 应用二级指标效果
  let secondary = { ...state.secondary }
  if (option.secondaryEffects) {
    for (const [key, value] of Object.entries(option.secondaryEffects)) {
      const k = key as keyof SecondaryMetrics
      secondary[k] = Math.max(0, Math.min(100, secondary[k] + (value ?? 0)))
    }
  }

  const news = makeNews(
    state,
    option.newsTitle,
    option.newsSummary,
    event.category,
    option.tone ?? 'neutral',
  )

  const resolvedEventIds = event.once
    ? [...state.resolvedEventIds, event.id]
    : state.resolvedEventIds

  // 处理事件链
  let pendingChains = [...state.pendingChains]
  if (option.chainId) {
    const delay = option.chainDelay ?? 3
    pendingChains.push({
      chainId: option.chainId,
      triggerTurn: state.turn + delay,
    })
  }

  // 清理已过期的事件链（triggerTurn <= 当前回合视为已过期）
  pendingChains = pendingChains.filter((c) => c.triggerTurn > state.turn)

  // 如果是紧急事件，记录触发
  let triggeredEmergencyIds = [...state.triggeredEmergencyIds]
  if ('trigger' in event && Object.keys(event.trigger).length > 0) {
    triggeredEmergencyIds.push(event.id)
  }

  // 更新连续负面事件计数：净负面 ++，否则重置为 0
  const consecutiveNegativeEvents = isNegative
    ? state.consecutiveNegativeEvents + 1
    : 0

  // 记录事件冷却（防止短期内重复触发）
  let nextState: GameState = {
    ...state,
    metrics,
    secondary,
    currentEvent: null,
    currentEmergency: null,
    resolvedEventIds,
    pendingChains,
    triggeredEmergencyIds,
    consecutiveNegativeEvents,
    news: [news, ...state.news],
    eventsHandled: state.eventsHandled + 1,
  }

  // 困难模式盲选结果：若该选项效果被隐藏，决策后弹窗展示实际发生的数值变化
  if (!shouldShowOptionEffects(option, state.difficulty)) {
    nextState.decisionResult = {
      optionLabel: option.label,
      effects: getScaledEffects(scaledEffects, state.difficulty),
      pmStatEffects: option.pmStatEffects,
    }
  } else {
    nextState.decisionResult = null
  }

  // 应用 PMStats 变化（政治资本、党内威望、辩论技巧、风险指数）
  if (option.pmStatEffects) {
    const ps = option.pmStatEffects
    const clamp = (v: number) => Math.max(0, Math.min(100, v))
    nextState.pmStats = {
      politicalCapital: clamp(nextState.pmStats.politicalCapital + (ps.politicalCapital ?? 0)),
      partyPrestige: clamp(nextState.pmStats.partyPrestige + (ps.partyPrestige ?? 0)),
      rhetoric: clamp(nextState.pmStats.rhetoric + (ps.rhetoric ?? 0)),
      riskIndex: clamp(nextState.pmStats.riskIndex + (ps.riskIndex ?? 0)),
    }
  }

  // 应用总理性格特质变化（健康、魅力、果断、韧性、道德）
  const traitEffects = (option as { traitEffects?: Partial<GameState['pmTraitsNumeric']> }).traitEffects
  if (traitEffects) {
    const clamp = (v: number) => Math.max(0, Math.min(100, v))
    nextState.pmTraitsNumeric = {
      health: clamp(nextState.pmTraitsNumeric.health + (traitEffects.health ?? 0)),
      charisma: clamp(nextState.pmTraitsNumeric.charisma + (traitEffects.charisma ?? 0)),
      decisiveness: clamp(nextState.pmTraitsNumeric.decisiveness + (traitEffects.decisiveness ?? 0)),
      resilience: clamp(nextState.pmTraitsNumeric.resilience + (traitEffects.resilience ?? 0)),
      integrity: clamp(nextState.pmTraitsNumeric.integrity + (traitEffects.integrity ?? 0)),
    }
  }

  nextState = recordEventTrigger(nextState, event.id)

  return {
    state: nextState,
    news,
  }
}

/** 推进至下一月（自然衰减 + 税收 + 改革效果 + 新事件） */
export function advanceMonth(state: GameState): GameState {
  // 自然衰减
  let metrics = naturalDecay(state.metrics)

  // 月度税收收入：受税率档位 + 经济 + 稳定 + 民意综合影响
  // 税率基础值：low=1, medium=2, high=4, very_high=6
  const taxBaseMap = { low: 1, medium: 2, high: 4, very_high: 6 } as const
  const taxBase = taxBaseMap[state.taxRate ?? 'medium']
  // 经济越好税基越宽：每 20 点额外 +1（最高 +5）
  const econBonus = Math.floor(metrics.economy / 20)
  let taxIncome = taxBase + econBonus
  if (metrics.stability < 30) taxIncome -= 2 // 动乱影响税收
  else if (metrics.stability < 50) taxIncome -= 1
  // 民意极低时部分人群抗税
  if (metrics.approval < 25) taxIncome -= 1
  // 超高税制会触发地下经济，反向侵蚀税基
  if (state.taxRate === 'very_high') taxIncome -= 1
  taxIncome = Math.max(0, taxIncome) // 至少为 0，不会因税收扣国库
  if (taxIncome > 0) {
    metrics = { ...metrics, treasury: clamp(metrics.treasury + taxIncome) }
  }
  // 高税 / 超高税每月对经济与民意的拖累（已反映在 advanceDay 的实时效果中，这里只补足月度结算）
  if (state.taxRate === 'high') {
    metrics = { ...metrics, economy: clamp(metrics.economy - 1) }
  } else if (state.taxRate === 'very_high') {
    metrics = { ...metrics, economy: clamp(metrics.economy - 2), approval: clamp(metrics.approval - 1) }
  } else if (state.taxRate === 'low') {
    // 低税刺激经济但国库吃紧
    metrics = { ...metrics, economy: clamp(metrics.economy + 1) }
  }

  // 应用当前生效的国家政策每回合效果
  for (const policyId of state.activePolicies) {
    const policy = NATIONAL_POLICIES.find((p) => p.id === policyId)
    if (policy && policy.perTurnEffects) {
      metrics = applyEffects(metrics, policy.perTurnEffects)
    }
  }

  // 应用进行中改革的效果
  let secondary = { ...state.secondary }
  const activeInitiatives = state.activeInitiatives.map((ai) => {
    const initiative = INITIATIVES.find((i) => i.id === ai.initiativeId)
    if (initiative) {
      // 应用每回合效果
      metrics = applyEffects(metrics, initiative.perTurnEffects)
      if (initiative.perTurnSecondaryEffects) {
        for (const [key, value] of Object.entries(initiative.perTurnSecondaryEffects)) {
          const k = key as keyof SecondaryMetrics
          secondary[k] = Math.max(0, Math.min(100, secondary[k] + (value ?? 0)))
        }
      }
    }
    return { ...ai, elapsed: ai.elapsed + 1 }
  })

  // 检查完成的改革
  const completedInitiatives = [...state.completedInitiatives]
  const remainingInitiatives: typeof activeInitiatives = []
  let countries = [...state.countries]
  const completionNews: NewsItem[] = []
  // 改革完成时触发的延迟后果（模块联动）
  const completionDelayed: DelayedConsequence[] = []
  for (const ai of activeInitiatives) {
    if (ai.elapsed >= ai.duration) {
      // 改革完成
      const initiative = INITIATIVES.find((i) => i.id === ai.initiativeId)
      if (initiative) {
        metrics = applyEffects(metrics, initiative.completionEffects)
        if (initiative.completionSecondaryEffects) {
          for (const [key, value] of Object.entries(initiative.completionSecondaryEffects)) {
            const k = key as keyof SecondaryMetrics
            secondary[k] = Math.max(0, Math.min(100, secondary[k] + (value ?? 0)))
          }
        }
        completedInitiatives.push(ai.initiativeId)

        // 改革↔政策树联动：改革完成时解锁指定政策，并推送新闻
        if (initiative.unlocksPolicies && initiative.unlocksPolicies.length > 0) {
          for (const pid of initiative.unlocksPolicies) {
            const unlockedPolicy = NATIONAL_POLICIES.find((p) => p.id === pid)
            if (unlockedPolicy) {
              completionNews.push({
                id: `news_ini_unlock_${ai.initiativeId}_${pid}_${state.totalDays}`,
                timestamp: `${state.year}年${state.month}月`,
                title: `改革解锁新政策：${unlockedPolicy.category}·${unlockedPolicy.name}`,
                summary: `「${initiative.name}」的完成为政策树开辟了新分支。现在可在政策中心启用「${unlockedPolicy.name}」：${unlockedPolicy.description}`,
                category: '改革',
                tone: 'positive',
              })
            }
          }
        }

        // 模块联动：改革完成时触发延迟后果（如军事改革→后续外交摩擦）
        if (initiative.completionDelayedConsequence) {
          const dc = initiative.completionDelayedConsequence
          completionDelayed.push({
            id: `delayed_ini_${ai.initiativeId}_${state.totalDays}`,
            triggerDay: state.totalDays + dc.delayDays,
            title: dc.title,
            description: dc.description,
            effects: dc.effects,
            newsTitle: dc.newsTitle,
            newsSummary: dc.newsSummary,
            countryEffects: dc.countryEffects,
          })
        }

        // 外交类改革：对目标国关系额外加成
        if (initiative.requiresCountryTarget && ai.targetCountryId) {
          const diploGain = (initiative.completionEffects.diplomacy ?? 0) * 1.5
          const targetIdx = countries.findIndex((c) => c.id === ai.targetCountryId)
          if (targetIdx >= 0 && diploGain !== 0) {
            const oldRel = countries[targetIdx].relation
            const newRel = clamp(oldRel + Math.round(diploGain))
            const target = countries[targetIdx]
            const atWar = !!state.activeWar && state.activeWar.enemyCountryId === target.id
            countries[targetIdx] = {
              ...target,
              relation: newRel,
              relationLevel: deriveRelationLevel(newRel, atWar),
              // 缔结同盟改革完成时追加条约
              ...(initiative.id === 'ini_alliance' && !target.treaties.includes('军事同盟')
                ? { treaties: [...target.treaties, '军事同盟'] }
                : {}),
              // 对外援助完成时打开贸易协定
              ...(initiative.id === 'ini_foreign_aid' && !target.tradeAgreement
                ? { tradeAgreement: true }
                : {}),
            }
            completionNews.push({
              id: `news_ini_diplo_${ai.initiativeId}_${state.totalDays}`,
              timestamp: `${state.year}年${state.month}月`,
              title: `外交成果：与${target.name}关系${diploGain > 0 ? '提升' : '恶化'}`,
              summary: `「${initiative.name}」完成，与${target.name}的关系值${diploGain > 0 ? '+' : ''}${Math.round(diploGain)}（${oldRel}→${newRel}）。`,
              category: '外交',
              tone: diploGain > 0 ? 'positive' : 'negative',
            })
          }
        }
      }
    } else {
      remainingInitiatives.push(ai)
    }
  }

  // 更新时间
  const month = state.month >= 12 ? 1 : state.month + 1
  const year = state.month >= 12 ? state.year + 1 : state.year
  const turn = state.turn + 1

  // 更新议会冷却
  const parliament = { ...state.parliament }
  if (parliament.dissolveCooldown > 0) {
    parliament.dissolveCooldown--
  }
  if (parliament.dissolved && parliament.dissolveCooldown <= 0) {
    parliament.dissolved = false
  }

  const next: GameState = {
    ...state,
    metrics,
    secondary,
    month,
    year,
    turn,
    activeInitiatives: remainingInitiatives,
    completedInitiatives,
    parliament,
    countries,
  }

  // 外交改革完成时追加新闻
  if (completionNews.length > 0) {
    next.news = [...completionNews, ...state.news]
  }

  // ===== 月度环境新闻（背景新闻流）=====
  // 从最近 30 条新闻标题中收集，避免短期重复
  const recentTitles = next.news.slice(0, 30).map((n) => n.title)
  const ambientNews = generateMonthlyAmbientNews(next, recentTitles)
  if (ambientNews.length > 0) {
    next.news = [...ambientNews, ...next.news]
  }

  // 改革完成时注册延迟后果（模块联动）
  if (completionDelayed.length > 0) {
    next.delayedConsequences = [...(state.delayedConsequences ?? []), ...completionDelayed]
  }

  // ===== PMStats 月度自然恢复 =====
  // 政治资本：每月 +5（执政基础带来政治资源）
  // 党内威望：每月向 50 缓慢回归 ±2（无大事时趋于平淡）
  // 风险指数：每月 -2（时间冲淡负面记忆）
  // 辩论技巧：不自然变化（仅通过事件/特质）
  const currentPC = next.pmStats.politicalCapital
  const currentPP = next.pmStats.partyPrestige
  const currentRI = next.pmStats.riskIndex
  next.pmStats = {
    politicalCapital: Math.min(100, currentPC + 5),
    partyPrestige: currentPP >= 50 ? Math.max(50, currentPP - 1) : Math.min(50, currentPP + 2),
    rhetoric: next.pmStats.rhetoric,
    riskIndex: Math.max(0, currentRI - 2),
  }

  // ===== 魅力影响民调自然回升 =====
  // charisma > 80：每月 approval +2；> 60：每月 +1
  if (next.pmTraitsNumeric.charisma > 80) {
    next.metrics = { ...next.metrics, approval: clamp(next.metrics.approval + 2) }
  } else if (next.pmTraitsNumeric.charisma > 60) {
    next.metrics = { ...next.metrics, approval: clamp(next.metrics.approval + 1) }
  }

  // ===== 性格特质月度重置 =====
  // 行动力：每月重置为 maxActionsPerTurn（健康<30 时为 2，否则为 3）
  next.actionsThisTurn = getMaxActionsPerTurn(next)
  // 连续负面事件计数：每月清零（韧性机制在新月度重新计数）
  next.consecutiveNegativeEvents = 0

  // ===== 执政党组阁要求追踪：耐心值衰减与最后通牒 =====
  // （原 nextMonth 中的休眠机制，迁移至 advanceMonth 以在即时制中激活）
  if (next.playerPartyId) {
    const playerParty = PLAYABLE_PARTIES.find((p) => p.id === next.playerPartyId)
    if (playerParty && playerParty.coalitionDemands.length > 0) {
      // 每月耐心值自然衰减 1 点
      let newPatience = Math.max(0, next.partyPatience - 1)

      // 检查已完成的改革是否契合组阁要求（关键词匹配）
      // 契合则耐心值回升
      const demandKeywords: string[] = []
      for (const demand of playerParty.coalitionDemands) {
        if (demand.includes('绿色') || demand.includes('环保')) demandKeywords.push('green', 'environment', 'eco')
        if (demand.includes('医疗') || demand.includes('公共')) demandKeywords.push('health', 'medical', 'public')
        if (demand.includes('产业') || demand.includes('升级')) demandKeywords.push('industry', 'upgrade', 'tech')
        if (demand.includes('财政') || demand.includes('赤字')) demandKeywords.push('fiscal', 'budget', 'finance')
        if (demand.includes('减税') || demand.includes('放松管制') || demand.includes('减少干预')) demandKeywords.push('tax', 'deregul', 'free_market', 'liberty')
        if (demand.includes('国防') || demand.includes('治安') || demand.includes('军事')) demandKeywords.push('defense', 'military', 'security')
      }

      if (demandKeywords.length > 0 && next.completedInitiatives.length > 0) {
        for (const initId of next.completedInitiatives) {
          const init = INITIATIVES.find((i) => i.id === initId)
          if (init) {
            const initText = `${init.id} ${init.name} ${init.description}`.toLowerCase()
            if (demandKeywords.some((kw) => initText.includes(kw))) {
              newPatience = Math.min(100, newPatience + 8)
              break
            }
          }
        }
      }

      next.partyPatience = newPatience

      // 耐心值低于 30 且距上次通牒超过 6 个月 → 触发执政党最后通牒
      if (newPatience < 30 && next.turn - next.lastUltimatumTurn >= 6 && next.pendingEvents.length < 3) {
        next.lastUltimatumTurn = next.turn
        const demandsText = playerParty.coalitionDemands.join('；')
        const ultimatumEvent: PendingEvent = {
          instanceId: `ultimatum_${next.playerPartyId}_${next.turn}`,
          eventId: `party_ultimatum_${next.playerPartyId}`,
          title: `${playerParty.name}发出最后通牒`,
          description: `${playerParty.name}高层对您迟迟未落实组阁要求（${demandsText}）深感不满，党主席在闭门会议上明确要求您立即行动，否则将以撤回执政联盟支持相威胁，届时政府将面临垮台危机。`,
          category: '政治体制',
          options: [
            {
              id: 'promise',
              label: '承诺立即推进相关改革',
              description: '向党主席承诺在下个会期内推动落实组阁要求',
              effects: { prestige: -4, stability: 2 },
              newsTitle: '总理向执政党承诺推进改革',
              newsSummary: `${playerParty.name}接受了总理的承诺，但要求看到实际行动。`,
              tone: 'neutral',
            },
            {
              id: 'compromise',
              label: '做出部分让步',
              description: '在政策方向上做出妥协，换取党内耐心',
              effects: { approval: -3, prestige: -2, stability: 3 },
              newsTitle: '总理与执政党达成妥协',
              newsSummary: '政府调整部分政策方向，执政联盟暂时稳定。',
              tone: 'neutral',
            },
            {
              id: 'resign',
              label: '主动辞职',
              description: '承认无法满足党内要求，体面下台',
              effects: { approval: 5, prestige: -15 },
              newsTitle: '总理宣布辞职',
              newsSummary: `${playerParty.name}撤回支持后，总理宣布辞职。`,
              tone: 'negative',
              endsGame: true,
            },
          ],
          isEmergency: false,
          triggeredDay: next.totalDays,
          deadlineDay: next.totalDays + 21,
          defaultOptionId: 'promise',
        }
        next.pendingEvents = [...next.pendingEvents, ultimatumEvent]
        if (!next.activePendingEventId) {
          next.activePendingEventId = ultimatumEvent.instanceId
        }
        next.unreadAlerts = [
          ...next.unreadAlerts,
          { type: 'breaking', title: `最后通牒：${playerParty.name}要求落实组阁承诺`, timestamp: Date.now() },
        ]
      }
    }
  }

  // ===== 党内威望阈值触发党内挑战 =====
  // 党内威望 < 30 且距上次挑战 ≥8 个月 → 触发党内挑战事件
  if (next.pmStats.partyPrestige < 30 && next.turn - (next.lastUltimatumTurn || 0) >= 8) {
    next.lastUltimatumTurn = next.turn
    const challengeEvent: PendingEvent = {
      instanceId: `party_challenge_${next.turn}`,
      eventId: 'party_inner_challenge',
      title: '党内发起挑战',
      description: `${next.pmName || '总理'}所在的执政党内部出现异动。党内威望过低（${next.pmStats.partyPrestige}），一批议员联名要求召开党代会重新选举党魁。若处理不当，您可能失去党魁职位，进而失去总理宝座。`,
      category: '政治体制',
      options: [
        {
          id: 'consolidate',
          label: '拉拢党内元老，巩固领导地位',
          description: '消耗政治资本，但效果稳健',
          effects: { approval: -3, stability: 2 },
          pmStatEffects: { politicalCapital: -20, partyPrestige: +25 },
          newsTitle: '总理通过党内元老支持稳固地位',
          newsSummary: '党内挑战暂告平息，但政治资本消耗显著。',
          tone: 'neutral',
        },
        {
          id: 'purge',
          label: '清洗挑战者派系',
          description: '激进手段，短期稳定但长期代价',
          effects: { approval: -5, stability: -3, prestige: 4 },
          pmStatEffects: { partyPrestige: +20, riskIndex: +15 },
          newsTitle: '总理清洗党内反对派',
          newsSummary: '党内异见者被排除出决策层，表面统一但暗流涌动。',
          tone: 'negative',
        },
        {
          id: 'reform_promise',
          label: '承诺推动党内期待的改革',
          description: '以政策换支持，需后续兑现',
          effects: { approval: 2, stability: 3 },
          pmStatEffects: { partyPrestige: +15 },
          newsTitle: '总理与党内挑战者达成政策妥协',
          newsSummary: '执政党暂时团结，但改革承诺有待落实。',
          tone: 'neutral',
        },
        {
          id: 'resign',
          label: '主动辞职，体面退场',
          description: '承认失败，提前结束任期',
          effects: { approval: 5, prestige: -10 },
          newsTitle: '总理宣布辞去党魁及总理职务',
          newsSummary: '党内压力下，总理选择主动退场。',
          tone: 'negative',
          endsGame: true,
        },
      ],
      isEmergency: false,
      triggeredDay: next.totalDays,
      deadlineDay: next.totalDays + 21,
      defaultOptionId: 'consolidate',
    }
    next.pendingEvents = [...next.pendingEvents, challengeEvent]
    if (!next.activePendingEventId) {
      next.activePendingEventId = challengeEvent.instanceId
    }
    next.unreadAlerts = [
      ...next.unreadAlerts,
      { type: 'breaking', title: '党内挑战：威望过低引发党内异动', timestamp: Date.now() },
    ]
  }

  // ===== 检查执政联盟稳定性：盟友好感度过低时退出 =====
  const coalitionParties = next.parties.filter((p) => p.inCoalition && p.id !== 'party_ruling')
  for (const party of coalitionParties) {
    if (party.favorability < 25) {
      next.parties = next.parties.map((p) =>
        p.id === party.id ? { ...p, inCoalition: false } : p,
      )
      next.news = [
        makeNews(
          next,
          `${party.name}退出执政联盟`,
          `${party.name}因对政府不满宣布退出执政联盟，执政联盟席位大幅缩水。`,
          '议会',
          'negative',
        ),
        ...next.news,
      ]
    }
  }

  // ===== 检查不信任投票触发条件：执政联盟席位跌破50% =====
  const coalitionSeats = next.parties
    .filter((p) => p.inCoalition)
    .reduce((sum, p) => sum + p.seats, 0)
  const totalSeats = next.parties.reduce((sum, p) => sum + p.seats, 0)
  if (coalitionSeats < totalSeats * 0.5 && next.turn > 6 && !next.currentEmergency) {
    next.currentEmergency = {
      id: 'no_confidence_crisis',
      title: '议会发起不信任投票',
      category: '紧急',
      description: '反对党联合部分执政联盟成员，在议会发起不信任投票。您必须在48小时内说服足够多的议员支持您，否则将被迫下台。',
      trigger: {},
      options: [
        {
          id: 'negotiate',
          label: '紧急斡旋，以政治交易换取支持',
          description: '消耗大量政治资本',
          effects: { approval: 8, prestige: -6, stability: 2 },
          newsTitle: '总理惊险通过不信任投票',
          newsSummary: '多笔政治交易达成，但代价高昂。',
          tone: 'neutral',
        },
        {
          id: 'speech',
          label: '发表全国电视讲话，争取民意支持',
          description: '依赖民意施压议会',
          effects: { approval: 12, prestige: 8, stability: -5 },
          newsTitle: '总理电视讲话赢得民意',
          newsSummary: '民众支持率上升，部分议员改变立场。',
          tone: 'positive',
        },
        {
          id: 'accept',
          label: '接受结果，体面下台',
          description: '承认失败',
          effects: { approval: -10, prestige: -15 },
          newsTitle: '总理接受不信任投票结果',
          newsSummary: '政治生涯画上句号。',
          tone: 'negative',
          endsGame: true,
        },
      ],
      repeatable: false,
    }
    next.currentEvent = null
  }

  return next
}

/** 按日推进（即时制）：每天推进，月末时执行月度结算
 * 事件不再阻塞时间推进 —— 触发后进入 pendingEvents 队列（事件收纳篮）
 */
export function advanceDay(state: GameState): GameState {
  // 只有倒计时事件会暂停时间（在 store 中已处理）
  // 普通事件进入 pendingEvents，玩家可继续推进时间

  // 更新日期
  const daysInMonth = new Date(state.year, state.month, 0).getDate()
  let day = state.day + 1
  let month = state.month
  let year = state.year
  let totalDays = state.totalDays + 1

  // 月末结算
  let needMonthlySettlement = false
  if (day > daysInMonth) {
    day = 1
    month = month >= 12 ? 1 : month + 1
    year = month === 1 ? year + 1 : year
    needMonthlySettlement = true
  }

  let next: GameState = {
    ...state,
    day,
    month,
    year,
    totalDays,
  }

  // 清理过期冷却
  next = cleanupExpiredCooldowns(next)

  // 检查延迟后果触发 —— 也进入 pendingEvents 队列
  const triggeredConsequences = next.delayedConsequences.filter(
    (c) => c.triggerDay <= totalDays,
  )
  const remainingConsequences = next.delayedConsequences.filter(
    (c) => c.triggerDay > totalDays,
  )

  if (triggeredConsequences.length > 0) {
    next.delayedConsequences = remainingConsequences
    for (const consequence of triggeredConsequences) {
      const instanceId = `delayed_${consequence.id}_${totalDays}`
      next.pendingEvents = [
        ...next.pendingEvents,
        {
          instanceId,
          eventId: `delayed_${consequence.id}`,
          title: consequence.title,
          description: consequence.description,
          category: '突发',
          options: [{
            id: 'acknowledge',
            label: '面对后果',
            description: '接受这一既成事实',
            effects: consequence.effects,
            newsTitle: consequence.newsTitle,
            newsSummary: consequence.newsSummary,
            tone: 'negative',
            // 把延迟后果携带的国家影响绑到这个选项上，
            // 玩家点"面对后果"时由 resolvePendingEventInternal 应用到具体国家
            countryEffects: consequence.countryEffects,
          }],
          isEmergency: false,
          triggeredDay: totalDays,
          deadlineDay: totalDays + 21,
          defaultOptionId: 'acknowledge',
        },
      ]
      next.unreadAlerts = [
        ...next.unreadAlerts,
        { type: 'breaking', title: consequence.newsTitle, timestamp: Date.now() },
      ]
    }
    // 自动打开第一个延迟后果的弹窗
    if (!next.activePendingEventId && next.pendingEvents.length > 0) {
      next.activePendingEventId = next.pendingEvents[0].instanceId
    }
    return next
  }

  // 月末结算：执行 advanceMonth 逻辑
  if (needMonthlySettlement) {
    next = advanceMonth(next)
    next.day = day
    next.month = month
    next.year = year
    next.totalDays = totalDays
  }

  // 事件触发频率显著降低：每 35 天检查一次（原 25 天）
  // 上限同时不超过 3 个未处理事件
  if (totalDays % 35 === 0 && next.pendingEvents.length < 3) {
    const event = pickEvent(next)
    if (event) {
      // 默认选项取第一个
      const defaultOptionId = event.options[0]?.id ?? ''
      const instanceId = `${event.id}_${totalDays}_${Math.random().toString(36).slice(2, 6)}`
      next.pendingEvents = [
        ...next.pendingEvents,
        {
          instanceId,
          eventId: event.id,
          title: event.title,
          description: event.description,
          category: event.category,
          options: event.options,
          isEmergency: false,
          triggeredDay: totalDays,
          deadlineDay: totalDays + 21, // 21 天后自动决策
          defaultOptionId,
          once: event.once,
          chainInfo: undefined,
        },
      ]
      // 自动打开新事件的弹窗（仅当没有其他事件在打开时）
      if (!next.activePendingEventId) {
        next.activePendingEventId = instanceId
      }
      next.unreadAlerts = [
        ...next.unreadAlerts,
        { type: 'breaking', title: `新事件：${event.title}`, timestamp: Date.now() },
      ]
    }
  }

  // 检查紧急事件 —— 频率降低（每 25 天检查一次，原 15 天）
  if (totalDays % 25 === 0) {
    const emergency = checkEmergency(next)
    if (emergency && !next.triggeredEmergencyIds.includes(emergency.id)) {
      const defaultOptionId = emergency.options[0]?.id ?? ''
      const instanceId = `emerg_${emergency.id}_${totalDays}`
      // 果断影响紧急事件决策窗口期：默认 7 天，>70 延长到 10 天，<30 缩短到 4 天
      let emergencyWindow = 7
      if (next.pmTraitsNumeric.decisiveness > 70) {
        emergencyWindow = 10
      } else if (next.pmTraitsNumeric.decisiveness < 30) {
        emergencyWindow = 4
      }
      next.pendingEvents = [
        ...next.pendingEvents,
        {
          instanceId,
          eventId: emergency.id,
          title: emergency.title,
          description: emergency.description,
          category: '紧急',
          options: emergency.options,
          isEmergency: true,
          triggeredDay: totalDays,
          deadlineDay: totalDays + emergencyWindow,
          defaultOptionId,
          once: !emergency.repeatable,
        },
      ]
      if (!next.activePendingEventId) {
        next.activePendingEventId = instanceId
      }
      next.triggeredEmergencyIds = [...next.triggeredEmergencyIds, emergency.id]
      next.unreadAlerts = [
        ...next.unreadAlerts,
        { type: 'breaking', title: `紧急：${emergency.title}`, timestamp: Date.now() },
      ]
    }
  }

  // 检查入侵事件 —— 每 30 天检查一次（与紧急事件独立，条件更苛刻）
  // 入侵事件比紧急事件更严重，触发后进入 pendingEvents 队列标记为紧急
  if (totalDays % 30 === 0 && !next.currentEmergency) {
    const invasion = checkInvasion(next)
    if (invasion && !next.triggeredEmergencyIds.includes(invasion.id)) {
      const defaultOptionId = invasion.options[0]?.id ?? ''
      const instanceId = `invas_${invasion.id}_${totalDays}`
      next.pendingEvents = [
        ...next.pendingEvents,
        {
          instanceId,
          eventId: invasion.id,
          title: invasion.title,
          description: invasion.description,
          category: '军事',
          options: invasion.options,
          isEmergency: true,
          triggeredDay: totalDays,
          deadlineDay: totalDays + 14, // 入侵事件给 14 天决策窗口
          defaultOptionId,
          once: true,
        },
      ]
      if (!next.activePendingEventId) {
        next.activePendingEventId = instanceId
      }
      next.triggeredEmergencyIds = [...next.triggeredEmergencyIds, invasion.id]
      next.unreadAlerts = [
        ...next.unreadAlerts,
        { type: 'breaking', title: `入侵：${invasion.title}`, timestamp: Date.now() },
      ]
    }
  }

  // 随机触发质询（每90天检查一次，大幅降低频率）
  if (totalDays % 90 === 0 && !next.currentDebate) {
    const debateChance = next.metrics.approval < 40 ? 0.3 : 0.12
    if (Math.random() < debateChance) {
      const q = DEBATE_QUESTIONS[Math.floor(Math.random() * DEBATE_QUESTIONS.length)]
      const shuffled = [...DEBATE_CARDS].sort(() => Math.random() - 0.5)
      const hand = shuffled.slice(0, 3)
      next.currentDebate = { question: q.question, cards: hand }
      next.unreadAlerts = [
        ...next.unreadAlerts,
        { type: 'debate', title: '议会质询即将开始', timestamp: Date.now() },
      ]
    }
  }

  // 周期性生成选区信件（每 90 天，最多累积 4 封）
  if (totalDays % 90 === 0 && next.pendingLetters.length < 4) {
    const available = CONSTITUENCY_LETTERS.filter(
      (l) => !next.pendingLetters.some((pl) => pl.id === l.id),
    )
    if (available.length > 0) {
      const letter = available[Math.floor(Math.random() * available.length)]
      next.pendingLetters = [...next.pendingLetters, { ...letter }]
      next.unreadAlerts = [
        ...next.unreadAlerts,
        { type: 'letter', title: `新信件：${letter.subject}`, timestamp: Date.now() },
      ]
    }
  }

  // 周期性生成外部照会（每 120 天，最多累积 3 份）
  if (totalDays % 120 === 0 && next.pendingNotes.length < 3) {
    const available = DIPLOMATIC_NOTES.filter(
      (n) => !next.pendingNotes.some((pn) => pn.id === n.id),
    )
    if (available.length > 0) {
      const note = available[Math.floor(Math.random() * available.length)]
      next.pendingNotes = [...next.pendingNotes, { ...note }]
      next.unreadAlerts = [
        ...next.unreadAlerts,
        { type: 'note', title: `外部照会：${note.subject}`, timestamp: Date.now() },
      ]
    }
  }

  // ===== 季度命运事件（每 90 天 = 一个季度触发一次） =====
  const currentQuarter = Math.floor(totalDays / 90)
  if (currentQuarter > next.lastFateQuarter && next.pendingEvents.length < 4) {
    next.lastFateQuarter = currentQuarter
    const fateEvent = rollFateEvent(next.pmName, totalDays, next.turn)
    next.pendingEvents = [...next.pendingEvents, fateEvent]
    if (!next.activePendingEventId) {
      next.activePendingEventId = fateEvent.instanceId
    }
    next.unreadAlerts = [
      ...next.unreadAlerts,
      { type: 'breaking', title: `季度事件：${fateEvent.title}`, timestamp: Date.now() },
    ]
  }

  // ===== 内阁聊天消息生成（每 75 天一位部长发来消息） =====
  if (totalDays - next.lastCabinetChatDay >= 75) {
    const chatResult = generateCabinetChatForAdvanceDay(next)
    if (chatResult) {
      next.lastCabinetChatDay = totalDays
      // 添加未读提醒
      const ministerName = next.cabinet.find((c) => c.id === chatResult.ministerId)?.name ?? '内阁部长'
      next.unreadAlerts = [
        ...next.unreadAlerts,
        { type: 'breaking', title: `${ministerName}发来新消息`, timestamp: Date.now() },
      ]
    }
  }

  // ===== 总理特质事件触发（每 30 天检查一次） =====
  if (totalDays % 30 === 0 && !next.currentEvent && !next.currentEmergency && next.pendingEvents.length < 4) {
    const traitEvent = checkPMTraitEvent(next)
    if (traitEvent) {
      const instanceId = getTraitEventInstanceId(traitEvent, next.turn)
      next.pendingEvents = [
        ...next.pendingEvents,
        {
          instanceId,
          eventId: traitEvent.id,
          title: traitEvent.title,
          description: traitEvent.description,
          category: '政治体制',
          options: traitEvent.options,
          isEmergency: false,
          triggeredDay: totalDays,
          deadlineDay: totalDays + 14,
          defaultOptionId: traitEvent.options[0]?.id ?? '',
        },
      ]
      if (!next.activePendingEventId) {
        next.activePendingEventId = instanceId
      }
      next.unreadAlerts = [
        ...next.unreadAlerts,
        { type: 'breaking', title: `特质：${traitEvent.title}`, timestamp: Date.now() },
      ]
    }
  }

  // ===== 封官许爵承诺过期检查：超过 60 天未履行则触发失信事件 =====
  // 原本 pendingAppointments 只记录不检查，导致承诺永远不会过期。现补充触发逻辑。
  if (next.pendingAppointments.length > 0) {
    const BREACH_DAYS = 60 // 承诺 60 天未履行视为失信
    const expired = next.pendingAppointments.filter(
      (p) => totalDays - p.promiseDay >= BREACH_DAYS,
    )
    if (expired.length > 0 && next.pendingEvents.length < 4) {
      // 取最先过期的一项
      const breach = expired[0]
      const instanceId = `appt_breach_${breach.npcId}_${totalDays}`
      const partyName = next.parties.find((p) => p.id === breach.partyId)?.name ?? '某党派'
      next.pendingEvents = [
        ...next.pendingEvents,
        {
          instanceId,
          eventId: 'event_appointment_breach',
          title: '封官承诺失信',
          description: `您曾在密室会谈中向 ${partyName} 承诺给予要职，但已过 ${BREACH_DAYS} 天仍未履行。对方公开指责您食言，党内盟友也开始质疑您的信誉。`,
          category: '政治体制',
          isEmergency: false,
          options: [
            {
              id: 'fulfill_now',
              label: '立即兑现承诺',
              description: '亡羊补牢，安排对方进入内阁',
              effects: { prestige: -3, stability: 2 },
              newsTitle: '总理兑现迟到的封官承诺',
              newsSummary: `总理安排 ${partyName} 成员进入内阁，但延迟兑现已损害信誉。`,
              tone: 'neutral',
            },
            {
              id: 'apologize',
              label: '公开致歉，拖延处理',
              description: '承认拖延，承诺近期解决',
              effects: { prestige: -5, approval: -2 },
              newsTitle: '总理就封官承诺拖延公开致歉',
              newsSummary: `总理承认处理不当，但 ${partyName} 表示不满。`,
              tone: 'negative',
            },
            {
              id: 'ignore',
              label: '否认承诺，强硬应对',
              description: '坚称从未承诺，拒绝兑现',
              effects: { prestige: -4, stability: -4, diplomacy: -2 },
              newsTitle: '总理否认封官承诺，引发政治风波',
              newsSummary: `${partyName} 公布密室会谈记录，总理陷入信誉危机。`,
              tone: 'negative',
            },
          ],
          triggeredDay: totalDays,
          deadlineDay: totalDays + 14,
          defaultOptionId: 'apologize',
          once: false,
        },
      ]
      if (!next.activePendingEventId) {
        next.activePendingEventId = instanceId
      }
      // 移除已触发的承诺（避免重复触发）
      next.pendingAppointments = next.pendingAppointments.filter((p) => p !== breach)
      next.unreadAlerts = [
        ...next.unreadAlerts,
        { type: 'breaking', title: '封官承诺失信', timestamp: Date.now() },
      ]
    }
  }

  // ===== 任期届满大选检查（实时制）=====
  // 当 turn 达到 48 的倍数时触发大选（每届任期 48 个月）
  // 通过设置标志让 gameStore 检测并进入大选阶段
  if (next.turn >= 48 && next.turn % 48 === 0) {
    ;(next as any).__triggerElection = true
  }

  return next
}

/** 在 advanceDay 中生成内阁聊天消息（直接修改 state） */
function generateCabinetChatForAdvanceDay(state: GameState): { ministerId: string; message: CabinetChatMessage } | null {
  const cabinet = state.cabinet
  if (cabinet.length === 0) return null

  // 优先选取忠诚度低的部长
  const sortedByPriority = [...cabinet].sort((a, b) => a.loyalty - b.loyalty)
  const top = sortedByPriority.slice(0, Math.min(3, sortedByPriority.length))
  const member = top[Math.floor(Math.random() * top.length)]

  const existingThread = state.cabinetChats.find((t) => t.ministerId === member.id)
  const recentTexts = existingThread
    ? existingThread.messages.slice(-5).map((m) => m.text)
    : []

  const template = pickCabinetChatTemplate(member.role, state.metrics, recentTexts)
  if (!template) return null

  const message: CabinetChatMessage = {
    id: `msg_${member.id}_${state.totalDays}_${Math.floor(Math.random() * 1000)}`,
    sender: 'minister',
    text: template.text,
    day: state.totalDays,
    options: template.options,
  }

  // 直接更新 state.cabinetChats
  const existingIdx = state.cabinetChats.findIndex((t) => t.ministerId === member.id)
  if (existingIdx >= 0) {
    state.cabinetChats = state.cabinetChats.map((t, idx) =>
      idx === existingIdx
        ? { ...t, messages: [...t.messages, message] }
        : t,
    )
  } else {
    const newThread: CabinetChatThread = {
      ministerId: member.id,
      messages: [message],
    }
    state.cabinetChats = [...state.cabinetChats, newThread]
  }

  return { ministerId: member.id, message }
}