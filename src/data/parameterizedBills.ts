import type { Metrics, SecondaryMetrics, ParameterizedBill } from '@/types/game'

/**
 * v1.5 法案参数化生成
 *
 * 法案 = 议题 × 强度 × 受益派系
 *
 *  - 议题（topic）：决定影响的指标维度与叙事方向（6 类）
 *  - 强度（intensity）：light/moderate/radical，影响效果幅度与立法成本
 *  - 受益派系（faction）：决定该法案的派系标签与议会支持率加成
 *
 * 与静态法律树（LAW_GROUPS）互补：
 *  - 静态法律：玩家主动切换的"制度档位"，长期生效、互斥
 *  - 参数化法案：每月由议员/利益集团随机提出的"一次性提案"，玩家可否决或推动立法
 *
 * 生成的法案为 Law 对象，可走标准 enactLaw 流程，立法完成后即生效。
 */

/** 议题类型 */
export type BillTopic =
  | 'economic_stimulus'
  | 'labor_protection'
  | 'environmental_regulation'
  | 'security_crackdown'
  | 'education_investment'
  | 'healthcare_reform'

/** 强度档位 */
export type BillIntensity = 'light' | 'moderate' | 'radical'

/** 受益派系 */
export type BillFaction =
  | 'financier'
  | 'labor'
  | 'industry'
  | 'reformist'
  | 'conservative'
  | 'regional'

/** 议题元信息 */
interface TopicMeta {
  label: string
  icon: string
  description: string
  /** 基础效果模板（强度会乘以系数） */
  baseEffects: Partial<Metrics>
  baseSecondaryEffects?: Partial<SecondaryMetrics>
  /** 该议题倾向的派系（用于和 faction 交叉校验） */
  naturalFaction: BillFaction
}

/** 议题池 */
const TOPIC_META: Record<BillTopic, TopicMeta> = {
  economic_stimulus: {
    label: '经济刺激方案',
    icon: '📈',
    description: '通过减税、补贴或基建投资拉动经济增长',
    baseEffects: { economy: 4, treasury: -3, approval: 1 },
    baseSecondaryEffects: { industrialOutput: 3, employmentRate: 2 },
    naturalFaction: 'financier',
  },
  labor_protection: {
    label: '劳工保护法案',
    icon: '⚒️',
    description: '提高最低工资、扩大工伤保险、限制工时',
    baseEffects: { approval: 3, economy: -2, stability: 1 },
    baseSecondaryEffects: { employmentRate: -1, socialCohesion: 3, protestFrequency: -2 },
    naturalFaction: 'labor',
  },
  environmental_regulation: {
    label: '环境管制条例',
    icon: '🌱',
    description: '限制排放、保护生态、推动绿色转型',
    baseEffects: { economy: -2, approval: 2, stability: 1 },
    baseSecondaryEffects: { industrialOutput: -2, socialCohesion: 2 },
    naturalFaction: 'reformist',
  },
  security_crackdown: {
    label: '治安整顿行动',
    icon: '🚨',
    description: '加强警力、严打犯罪、强化治安管控',
    baseEffects: { stability: 3, approval: -1, treasury: -2 },
    baseSecondaryEffects: { crimeRate: -4, protestFrequency: 1 },
    naturalFaction: 'conservative',
  },
  education_investment: {
    label: '教育投资计划',
    icon: '🎓',
    description: '扩建学校、提高教师待遇、普及职业教育',
    baseEffects: { approval: 2, treasury: -3, prestige: 1 },
    baseSecondaryEffects: { youthSupport: 4, socialCohesion: 2 },
    naturalFaction: 'reformist',
  },
  healthcare_reform: {
    label: '医疗改革方案',
    icon: '⚕️',
    description: '扩大医保覆盖、建设基层医疗、控制药价',
    baseEffects: { approval: 3, treasury: -4, stability: 1 },
    baseSecondaryEffects: { urbanSupport: 2, ruralSupport: 3, socialCohesion: 2 },
    naturalFaction: 'reformist',
  },
}

/** 强度系数 */
const INTENSITY_META: Record<BillIntensity, {
  label: string
  multiplier: number
  costMultiplier: number
  durationMonths: number
  minSeats: number
}> = {
  light: {
    label: '温和',
    multiplier: 0.6,
    costMultiplier: 0.7,
    durationMonths: 2,
    minSeats: 35,
  },
  moderate: {
    label: '标准',
    multiplier: 1.0,
    costMultiplier: 1.0,
    durationMonths: 3,
    minSeats: 45,
  },
  radical: {
    label: '激进',
    multiplier: 1.8,
    costMultiplier: 1.6,
    durationMonths: 5,
    minSeats: 55,
  },
}

/** 派系元信息 */
const FACTION_META: Record<BillFaction, {
  label: string
  icon: string
  /** 派系契合度加成：议题 naturalFaction 与 faction 一致时，效果 +20% */
  synergyBonus: number
}> = {
  financier: { label: '金融界', icon: '💰', synergyBonus: 0.2 },
  labor: { label: '工会', icon: '⚒️', synergyBonus: 0.2 },
  industry: { label: '工业界', icon: '🏭', synergyBonus: 0.2 },
  reformist: { label: '改革派', icon: '📚', synergyBonus: 0.2 },
  conservative: { label: '保守派', icon: '📜', synergyBonus: 0.2 },
  regional: { label: '地方势力', icon: '🏛️', synergyBonus: 0.15 },
}

/** 法案生成结果（与 game.ts 中的 ParameterizedBill 一致） */

/** 随机选一项 */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * 生成一条参数化法案
 *
 * 算法：
 *  1. 随机选议题 → 获得基础效果模板
 *  2. 随机选强度 → 应用倍数到效果与成本
 *  3. 随机选派系 → 若派系与议题契合，效果额外 +20%
 *  4. 合成 ParameterizedBill 对象，含完整叙事
 */
export function generateParameterizedBill(): ParameterizedBill {
  const topics = Object.keys(TOPIC_META) as BillTopic[]
  const intensities: BillIntensity[] = ['light', 'moderate', 'radical']
  const factions = Object.keys(FACTION_META) as BillFaction[]

  const topic = pick(topics)
  const intensity = pick(intensities)
  const faction = pick(factions)

  const topicMeta = TOPIC_META[topic]
  const intensityMeta = INTENSITY_META[intensity]
  const factionMeta = FACTION_META[faction]

  // 派系契合度
  const hasSynergy = topicMeta.naturalFaction === faction
  const synergyMultiplier = hasSynergy ? 1 + factionMeta.synergyBonus : 1
  const totalMultiplier = intensityMeta.multiplier * synergyMultiplier

  // 应用倍数到一级指标
  const perTurnEffects: Partial<Metrics> = {}
  for (const [k, v] of Object.entries(topicMeta.baseEffects)) {
    const key = k as keyof Metrics
    const scaled = Math.round((v ?? 0) * totalMultiplier)
    if (scaled !== 0) perTurnEffects[key] = scaled
  }

  // 应用倍数到二级指标
  let secondaryEffects: Partial<SecondaryMetrics> | undefined
  if (topicMeta.baseSecondaryEffects) {
    secondaryEffects = {}
    for (const [k, v] of Object.entries(topicMeta.baseSecondaryEffects)) {
      const key = k as keyof SecondaryMetrics
      const scaled = Math.round((v ?? 0) * totalMultiplier)
      if (scaled !== 0) (secondaryEffects as any)[key] = scaled
    }
  }

  // 立法成本
  const basePoliticalCost = 15
  const politicalCapital = Math.round(basePoliticalCost * intensityMeta.costMultiplier)
  const treasuryCost = Math.round((topicMeta.baseEffects.treasury ?? 0) * -0.5 * intensityMeta.costMultiplier)

  // 生成名称
  const intensityLabel = intensityMeta.label
  const factionLabel = factionMeta.label
  const topicLabel = topicMeta.label
  const billName = `${intensityLabel}版${topicLabel}（${factionLabel}提案）`

  // 生成叙事
  const enactNarrative = `${factionLabel}背景的议员联合提出《${billName}》，${topicMeta.description}。议会内就此展开${intensityMeta.durationMonths}个月的辩论与博弈。`

  const billId = `pbill_${topic}_${intensity}_${faction}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`

  return {
    id: billId,
    topic,
    intensity,
    faction,
    hasSynergy,
    name: billName,
    description: `${topicMeta.icon} ${topicMeta.description}（${intensityLabel}强度，由${factionLabel}推动）${hasSynergy ? '。派系契合度高，效果加成 +20%。' : ''}`,
    perTurnEffects,
    secondaryEffects,
    enactCost: {
      politicalCapital,
      treasury: treasuryCost > 0 ? treasuryCost : undefined,
    },
    enactMonths: intensityMeta.durationMonths,
    minSeats: intensityMeta.minSeats,
    enactNarrative,
  }
}

/**
 * 批量生成参数化法案（每月由系统调用）
 *  - count: 生成数量（默认 3）
 *  - 返回的法案 ID 互不重复
 */
export function generateMonthlyBills(count = 3): ParameterizedBill[] {
  const bills: ParameterizedBill[] = []
  const usedTopics = new Set<BillTopic>()
  for (let i = 0; i < count; i++) {
    let attempt = 0
    let bill = generateParameterizedBill()
    // 避免同月重复议题（最多重试 5 次）
    while (usedTopics.has(bill.topic as BillTopic) && attempt < 5) {
      bill = generateParameterizedBill()
      attempt++
    }
    usedTopics.add(bill.topic as BillTopic)
    bills.push(bill)
  }
  return bills
}

/** 议题展示元信息 */
export function getTopicMeta(topic: BillTopic): TopicMeta {
  return TOPIC_META[topic]
}

/** 强度展示元信息 */
export function getIntensityMeta(intensity: BillIntensity) {
  return INTENSITY_META[intensity]
}

/** 派系展示元信息 */
export function getBillFactionMeta(faction: BillFaction) {
  return FACTION_META[faction]
}
