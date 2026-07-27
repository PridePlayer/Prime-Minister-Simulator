// 卡牌引擎：成功率求值 / 资源扣减检查 / 后果结算 / 延迟后果生成
import type {
  Card,
  CardPlayResult,
  CardEventSlot,
  GameState,
  PMStats,
  Metrics,
  DossierCard,
  CardHandItem,
} from '@/types/game'
import { getCardById, getCardsByCategory } from '@/data/cards'
import { clamp } from './metrics'

/**
 * 安全求值动态成功率公式
 * 支持的变量：rhetoric, approval, partyPrestige, riskIndex, playerApproval, oppositionApproval
 * 支持的语法：基本四则运算 + 三元表达式
 */
function evaluateSuccessFormula(formula: string, ctx: {
  rhetoric: number
  approval: number
  partyPrestige: number
  riskIndex: number
  playerApproval: number
  oppositionApproval: number
}): number {
  try {
    // 用 Function 沙箱求值（输入可信：所有公式来自 src/data/cards.ts，非用户输入）
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'rhetoric', 'approval', 'partyPrestige', 'riskIndex',
      'playerApproval', 'oppositionApproval',
      `"use strict"; return (${formula});`,
    )
    const result = fn(
      ctx.rhetoric, ctx.approval, ctx.partyPrestige, ctx.riskIndex,
      ctx.playerApproval, ctx.oppositionApproval,
    )
    const num = Number(result)
    if (Number.isNaN(num)) return 0
    return clamp(num)
  } catch {
    return 50 // 公式异常时退回 50%
  }
}

/** 计算卡牌打出时的实际成功率 */
export function calcSuccessRate(card: Card, state: GameState, slot?: CardEventSlot | null): number {
  if (typeof card.successProbability === 'number') {
    let rate = card.successProbability

    // 归咎前任：30 天内连续使用 >1 次降至 40%
    if (card.id === 'pmqs_blame_predecessor') {
      const daysSinceLast = state.totalDays - state.lastBlameDay
      if (daysSinceLast < 30 && state.blamePredecessorCount >= 1) {
        rate = 40
      }
    }

    return clamp(rate)
  }

  // 字符串公式
  // 反对党民调 = 100 - 玩家民调（粗略估算）
  const oppositionApproval = 100 - state.metrics.approval
  return evaluateSuccessFormula(card.successProbability, {
    rhetoric: state.pmStats.rhetoric,
    approval: state.metrics.approval,
    partyPrestige: state.pmStats.partyPrestige,
    riskIndex: state.pmStats.riskIndex,
    playerApproval: state.metrics.approval,
    oppositionApproval,
  })
}

/** 检查资源是否足够 */
export function checkResources(card: Card, state: GameState, dossierCard?: DossierCard): boolean {
  const { cost } = card
  if (cost.politicalCapital && state.pmStats.politicalCapital < cost.politicalCapital) return false
  if (cost.treasury && state.metrics.treasury < cost.treasury) return false
  if (cost.dossierCardId) {
    // 需要 1 张黑料卡
    if (state.dossierCards.length === 0) return false
    if (dossierCard && !state.dossierCards.find((d) => d.id === dossierCard.id)) return false
  }
  if (cost.dismissMinisterLoyaltyBelow !== undefined) {
    // 需要有忠诚度 < 阈值的大臣可解职
    const candidate = state.cabinet.find((m) => m.loyalty < cost.dismissMinisterLoyaltyBelow!)
    if (!candidate) return false
  }
  return true
}

/** 检查前置条件 */
export function checkConditions(card: Card, state: GameState, handItem?: CardHandItem): { ok: boolean; reason?: string } {
  const cond = card.conditions
  if (!cond) return { ok: true }

  if (cond.minRhetoric !== undefined && state.pmStats.rhetoric < cond.minRhetoric) {
    return { ok: false, reason: `辩论技巧不足（需要 ${cond.minRhetoric}）` }
  }

  if (cond.parliamentSeatsBelow !== undefined && state.parliament.rulingPartySeats >= cond.parliamentSeatsBelow) {
    return { ok: false, reason: `执政党席位需低于 ${cond.parliamentSeatsBelow}%` }
  }

  if (cond.cooldownDays !== undefined && handItem) {
    const daysSince = state.totalDays - handItem.lastPlayedDay
    if (daysSince < cond.cooldownDays) {
      return { ok: false, reason: `冷却中（剩 ${cond.cooldownDays - daysSince} 天）` }
    }
  }

  return { ok: true }
}

/** 检查事件槽位是否接受该卡牌类别 */
export function checkSlotAccepts(card: Card, slot: CardEventSlot | null): boolean {
  if (!slot) return false
  return slot.acceptedCategories.includes(card.category)
}

/**
 * 主入口：尝试打出一张卡牌
 * @returns CardPlayResult，由 store 应用
 */
export function playCard(
  card: Card,
  state: GameState,
  handItem: CardHandItem,
  slot: CardEventSlot | null,
  dossierCard?: DossierCard,
): CardPlayResult {
  // 1. 检查槽位是否接受
  if (!checkSlotAccepts(card, slot)) {
    return {
      success: false,
      resourceOk: true,
      conditionOk: true,
      message: '该卡牌无法在此事件中打出',
      effects: {},
    }
  }

  // 2. 检查前置条件
  const condCheck = checkConditions(card, state, handItem)
  if (!condCheck.ok) {
    return {
      success: false,
      resourceOk: true,
      conditionOk: false,
      message: condCheck.reason || '前置条件不满足',
      effects: {},
    }
  }

  // 3. 检查资源
  if (!checkResources(card, state, dossierCard)) {
    return {
      success: false,
      resourceOk: false,
      conditionOk: true,
      message: '资源不足，卡牌弹回手牌',
      effects: {},
    }
  }

  // 4. 计算成功率并掷骰
  const rate = calcSuccessRate(card, state, slot)
  const success = Math.random() * 100 < rate

  // 5. 应用资源消耗（无论成功失败都消耗）
  const pmStatsDelta: Partial<PMStats> = {}
  const metricsDelta: Partial<Metrics> = {}

  if (card.cost.politicalCapital) pmStatsDelta.politicalCapital = -card.cost.politicalCapital
  if (card.cost.treasury) metricsDelta.treasury = -card.cost.treasury
  if (card.cost.riskIndex) pmStatsDelta.riskIndex = card.cost.riskIndex

  const result: CardPlayResult = {
    success,
    resourceOk: true,
    conditionOk: true,
    message: '',
    effects: {
      metricsDelta,
      pmStatsDelta,
    },
  }

  // 6. 结算效果
  if (success) {
    const eff = card.effectsOnSuccess
    if (eff.publicApprovalChange) metricsDelta.approval = (metricsDelta.approval || 0) + eff.publicApprovalChange
    if (eff.partyPrestigeChange) pmStatsDelta.partyPrestige = (pmStatsDelta.partyPrestige || 0) + eff.partyPrestigeChange
    if (eff.rhetoricChange) pmStatsDelta.rhetoric = (pmStatsDelta.rhetoric || 0) + eff.rhetoricChange
    if (eff.seatsGained) result.effects.seatsGained = eff.seatsGained

    // mitigateApprovalLoss：减少事件本应造成的民调下跌
    if (eff.mitigateApprovalLoss && slot?.pendingApprovalLoss) {
      const mitigated = Math.round(slot.pendingApprovalLoss * eff.mitigateApprovalLoss)
      metricsDelta.approval = (metricsDelta.approval || 0) + mitigated
      result.message = `民调下跌减少 ${eff.mitigateApprovalLoss * 100}%`
    }

    // 卡牌专属逻辑
    applyCardSpecificSuccessLogic(card, state, slot, dossierCard, result)

    // 新闻
    if (!result.effects.news) {
      result.effects.news = {
        title: `${card.name}成功`,
        summary: card.description.slice(0, 60) + (card.description.length > 60 ? '...' : ''),
        tone: 'positive',
      }
    }

    // 音效提示（由前端读取 card.successSound 播放，不在 result 中）
    result.message = result.message || `${card.name} 打出成功`
  } else {
    const eff = card.effectsOnFailure
    if (eff) {
      if (eff.publicApprovalChange) metricsDelta.approval = (metricsDelta.approval || 0) + eff.publicApprovalChange
      if (eff.partyPrestigeChange) pmStatsDelta.partyPrestige = (pmStatsDelta.partyPrestige || 0) + eff.partyPrestigeChange
    }

    // 悬崖战术失败 → 触发议会解散
    if (card.id === 'backroom_chicken') {
      result.effects.dissolveParliament = true
      result.effects.news = {
        title: '悬崖战术失败，议会解散',
        summary: '反对党毫不退让，总理赌局失败，法案流产并直接引发议会解散大选。',
        tone: 'negative',
      }
    } else {
      result.effects.news = {
        title: `${card.name}失败`,
        summary: '卡牌打出未达预期效果。',
        tone: 'negative',
      }
    }

    result.message = `${card.name} 打出失败`
  }

  return result
}

/** 卡牌专属成功逻辑（延迟后果、NPC 记忆、派系影响等） */
function applyCardSpecificSuccessLogic(
  card: Card,
  state: GameState,
  slot: CardEventSlot | null,
  dossierCard: DossierCard | undefined,
  result: CardPlayResult,
) {
  switch (card.id) {
    case 'backroom_appoint': {
      // 封官许爵：60 天后未履行承诺触发退出联盟+不信任案
      if (slot?.sourcePartyId) {
        const promiseDay = state.totalDays
        result.effects.delayedConsequence = {
          delayDays: 60,
          title: '密室承诺到期',
          description: `曾许诺任命 ${slot.sourceNpcId || '某议员'} 为大臣，60 天期限已到。该党派质疑总理信用，立即退出执政联盟，并在 7 天内发起不信任表决案。`,
          effects: { stability: -10 },
          newsTitle: '执政联盟瓦解，不信任表决案启动',
          newsSummary: '被背约的党派宣布退出执政联盟，并联合反对党发起不信任表决。',
        }
        // 同时记录到 pendingAppointments（玩家若在 60 天内任命可解除）
        // 此处仅返回效果，store 中将 promise 加入 pendingAppointments
      }
      break
    }

    case 'leak_anonymous': {
      // 匿名爆料：根据黑料严重度扣除对方席位
      if (dossierCard) {
        const seatsLost = 2 + Math.floor(dossierCard.severity / 2) // 2~4 席
        result.effects.seatsGained = -seatsLost
        result.effects.news = {
          title: `${dossierCard.targetNpcName} 被爆黑料，被迫辞职`,
          summary: `媒体曝光 ${dossierCard.title}，目标所属党派失去 ${seatsLost} 席表决权，党派支持率 -5%。`,
          tone: 'positive',
        }
        // 消耗黑料卡（store 中从 dossierCards 移除）
      }
      break
    }

    case 'leak_blackmail': {
      // 政治勒索：写入 NPC 记忆
      if (dossierCard) {
        result.effects.npcMemory = {
          npcId: dossierCard.targetNpcId,
          tag: 'BLACKMAILED',
        }
        result.effects.news = {
          title: `${dossierCard.targetNpcName} 接受勒索，表决日请假缺席`,
          summary: '安全局提供的材料让目标脸色铁青，最终同意"表决当天请假缺席"。',
          tone: 'neutral',
        }
      }
      break
    }

    case 'leak_coverup': {
      // 掩盖丑闻：70% 概率 15~60 天后深度曝光
      if (Math.random() < 0.7) {
        const delay = 15 + Math.floor(Math.random() * 46) // 15~60 天
        result.effects.delayedConsequence = {
          delayDays: delay,
          title: '掩盖丑闻深度曝光',
          description: '曾被掩盖的丑闻通过深度调查重新浮出水面，引发舆论海啸。',
          effects: { approval: -20 },
          newsTitle: '丑闻深度曝光，总理府陷入危机',
          newsSummary: '媒体联合调查揭穿了此前的掩盖行为，公众信任崩塌。',
        }
      }
      // 道德特质影响掩盖丑闻卡代价：道德越高，掩盖行为带来的风险指数代价越大
      // （高道德总理使用下三滥手段承受更大心理/政治风险）
      // integrity > 70：+40；> 50：+35；< 30：+20（寡廉鲜耻，反而代价低）；其余：+30
      const coverupRiskCost =
        state.pmTraitsNumeric.integrity > 70 ? 40 :
        state.pmTraitsNumeric.integrity > 50 ? 35 :
        state.pmTraitsNumeric.integrity < 30 ? 20 : 30
      result.effects.pmStatsDelta = {
        ...result.effects.pmStatsDelta,
        riskIndex: (result.effects.pmStatsDelta?.riskIndex || 0) + coverupRiskCost,
      }
      break
    }

    case 'spin_scapegoat': {
      // 寻找替罪羊：解职 1 名忠诚度 <50 的大臣
      const target = state.cabinet.find((m) => m.loyalty < 50)
      if (target) {
        // store 中从 cabinet 移除该大臣，并降低其派系好感
        result.effects.news = {
          title: `${target.name} 被解职，承担事件责任`,
          summary: `${target.name} 成为本次事件的替罪羊，被立即解职。其所属派系好感度 -30。`,
          tone: 'neutral',
        }
      }
      break
    }

    case 'pmqs_blame_predecessor': {
      // 归咎前任：记录使用次数（store 中更新 blamePredecessorCount / lastBlameDay）
      break
    }
  }
}

/**
 * 抽取 N 张卡牌（不重复，从指定类别池中）
 * 用于 PMQs 等场景"随机抽 4 张"
 */
export function drawRandomCards(category: Card['category'], count: number): Card[] {
  const pool = getCardsByCategory(category)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, pool.length))
}

/**
 * 检查当前是否应触发 PMQs 卡牌事件
 * 触发条件：每 60 天（约 2 个月）固定触发，或重大事件发生时强制触发
 * 使用 lastPmqsTriggerDay 防止放弃后同一天重复触发
 * @returns 是否触发
 */
export function shouldTriggerPmqs(state: GameState): boolean {
  // 若当前已有激活卡牌事件，不重复触发
  if (state.activeCardEvent) return false
  if (state.parliament.dissolved) return false
  // 首次触发：第 60 天
  if (state.lastPmqsTriggerDay === 0 && state.totalDays < 60) return false
  // 距上次触发满 60 天才再次触发
  return state.totalDays - state.lastPmqsTriggerDay >= 60
}

/**
 * 创建 PMQs 卡牌事件槽位
 */
export function createPmqsEvent(state: GameState): CardEventSlot {
  return {
    instanceId: `pmqs_${state.totalDays}_${Math.random().toString(36).slice(2, 6)}`,
    eventType: 'pmqs',
    title: '议会质询（PMQs）',
    description: '反对党党魁在质询台上向总理发难，全场媒体聚焦。请选择一张质询卡牌应对。',
    acceptedCategories: ['PMQs'],
    sourceNpcId: 'opposition_leader',
    triggeredDay: state.totalDays,
    deadlineDay: state.totalDays + 3, // 3 天内必须应对
  }
}

/**
 * 创建密室表决卡牌事件槽位
 */
export function createBackroomEvent(state: GameState, billTitle: string): CardEventSlot {
  return {
    instanceId: `backroom_${state.totalDays}_${Math.random().toString(36).slice(2, 6)}`,
    eventType: 'backroom',
    title: `密室会谈：${billTitle}`,
    description: '法案票数不足，进入倒计时 24 小时密室会谈阶段。可单独拉拢反对党党魁或中立议员。',
    acceptedCategories: ['BACKROOM', 'LEAK'],
    triggeredDay: state.totalDays,
    deadlineDay: state.totalDays + 1,
  }
}

/**
 * 创建舆论洗白卡牌事件槽位
 */
export function createSpinEvent(state: GameState, cause: string, approvalLoss: number): CardEventSlot {
  return {
    instanceId: `spin_${state.totalDays}_${Math.random().toString(36).slice(2, 6)}`,
    eventType: 'spin',
    title: `公关窗口期：${cause}`,
    description: `${cause}导致民调即将下跌 ${approvalLoss}%。可打出舆论洗白卡牌减少损失。`,
    acceptedCategories: ['SPIN'],
    pendingApprovalLoss: -approvalLoss, // 负数表示损失
    triggeredDay: state.totalDays,
    deadlineDay: state.totalDays + 2,
  }
}

/** 卡牌事件超时未打出 → 按失败结算 */
export function timeoutCardEvent(slot: CardEventSlot): CardPlayResult {
  return {
    success: false,
    resourceOk: true,
    conditionOk: true,
    message: `${slot.title} 已超时，按默认失败处理`,
    effects: {
      metricsDelta: { approval: -3 },
      news: {
        title: `${slot.title}超时未应对`,
        summary: '总理在关键时刻犹豫不决，错失良机。',
        tone: 'negative',
      },
    },
  }
}
