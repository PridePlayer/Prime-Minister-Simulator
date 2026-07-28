import type { RegionId, Region, LocalGovernor, GovernorTrait } from '@/types/game'

/**
 * v1.5 国情页面：地方行政区划 + 地方长官
 *
 * 8 个一级行政区（虚构地名以避免敏感），每个区有：
 *  - 人口 / 经济权重 / 行政成本（影响国库与稳定）
 *  - 地方长官（虚构姓名，避免敏感）
 *  - 忠诚度 / 能力值 / 派系立场（决定该区是否服从中央）
 *  - 当前状态（安定/动荡/自治/脱离）
 *
 * 玩家可对每个区单独行动（拨款/视察/换人/镇压/放权）
 * 与地方长官互动（约谈/拉拢/施压/调查腐败）
 */

export const REGIONS: Region[] = [
  {
    id: 'north_capital',
    name: '京畿区',
    icon: '🏛️',
    description: '首都所在地，全国政治文化中心。人口稠密，行政成本最高，但稳定收益也最显著。',
    population: 18,
    economyWeight: 22,
    adminCost: 4,
    geography: '平原',
    loyalty: 70,
    stability: 65,
    governorId: 'gov_001',
  },
  {
    id: 'east_industrial',
    name: '东海工业带',
    icon: '🏭',
    description: '传统重工业与港口群所在地，税收重镇，但污染与失业问题突出。',
    population: 15,
    economyWeight: 28,
    adminCost: 3,
    geography: '沿海',
    loyalty: 55,
    stability: 50,
    governorId: 'gov_002',
  },
  {
    id: 'south_commerce',
    name: '南方商埠',
    icon: '⛵',
    description: '外贸枢纽，私人资本活跃。地方实力派强势，常与中央博弈财政分成。',
    population: 14,
    economyWeight: 24,
    adminCost: 3,
    geography: '沿海',
    loyalty: 48,
    stability: 60,
    governorId: 'gov_003',
  },
  {
    id: 'west_frontier',
    name: '西部边陲',
    icon: '🏜️',
    description: '边疆与少数民族聚居区，战略要地。地方势力错综复杂，易受外部势力渗透。',
    population: 6,
    economyWeight: 8,
    adminCost: 5,
    geography: '高原',
    loyalty: 38,
    stability: 45,
    governorId: 'gov_004',
  },
  {
    id: 'central_granary',
    name: '中原粮仓',
    icon: '🌾',
    description: '传统农业大省，粮食基地。人口众多，民意基础深厚但经济增速缓慢。',
    population: 22,
    economyWeight: 14,
    adminCost: 3,
    geography: '平原',
    loyalty: 62,
    stability: 70,
    governorId: 'gov_005',
  },
  {
    id: 'northern_forest',
    name: '北疆林海',
    icon: '🌲',
    description: '林业与生态资源保护区，地广人稀。战略缓冲地带，需长期投入国防。',
    population: 4,
    economyWeight: 6,
    adminCost: 4,
    geography: '林原',
    loyalty: 65,
    stability: 75,
    governorId: 'gov_006',
  },
  {
    id: 'southwest_mountain',
    name: '西南山地',
    icon: '⛰️',
    description: '山地高原，交通不便但矿藏丰富。地方治理难度大，民风彪悍。',
    population: 9,
    economyWeight: 10,
    adminCost: 5,
    geography: '山地',
    loyalty: 42,
    stability: 40,
    governorId: 'gov_007',
  },
  {
    id: 'overseas_territory',
    name: '海外领地',
    icon: '🏝️',
    description: '海外孤悬的小型领地，象征性意义大于实际价值，但牵涉外交关系。',
    population: 2,
    economyWeight: 3,
    adminCost: 2,
    geography: '海岛',
    loyalty: 55,
    stability: 60,
    governorId: 'gov_008',
  },
]

export const GOVERNORS: LocalGovernor[] = [
  {
    id: 'gov_001',
    name: '陈伯雅',
    regionId: 'north_capital',
    age: 58,
    faction: 'technocrat',
    loyalty: 75,
    competence: 70,
    corruption: 18,
    traits: ['technocrat', 'cautious'],
    biography: '曾任内政部副部长，技术官僚出身，行政能力强但缺乏基层政治基础。',
    preferredPolicy: 'strengthen_admin',
  },
  {
    id: 'gov_002',
    name: '林振邦',
    regionId: 'east_industrial',
    age: 62,
    faction: 'business',
    loyalty: 50,
    competence: 75,
    corruption: 42,
    traits: ['pragmatist', 'business_oriented'],
    biography: '工业巨头出身，与本地商界关系密切，能推动经济但腐败传闻不断。',
    preferredPolicy: 'tax_break',
  },
  {
    id: 'gov_003',
    name: '黄海涛',
    regionId: 'south_commerce',
    age: 55,
    faction: 'business',
    loyalty: 45,
    competence: 78,
    corruption: 38,
    traits: ['opportunist', 'business_oriented'],
    biography: '改革派少壮，外贸起家。能力突出，但与中央常有财政分成上的龃龉。',
    preferredPolicy: 'decentralize',
  },
  {
    id: 'gov_004',
    name: '阿勒泰·别克',
    regionId: 'west_frontier',
    age: 49,
    faction: 'local',
    loyalty: 35,
    competence: 60,
    corruption: 28,
    traits: ['local_chieftain', 'independent'],
    biography: '本地世袭家族代表，与中央关系疏远。注重地方利益，倾向自治。',
    preferredPolicy: 'autonomy',
  },
  {
    id: 'gov_005',
    name: '苏文远',
    regionId: 'central_granary',
    age: 64,
    faction: 'technocrat',
    loyalty: 68,
    competence: 65,
    corruption: 22,
    traits: ['technocrat', 'conservative'],
    biography: '农业专家出身，老成持重。民意基础好，但改革意愿不强。',
    preferredPolicy: 'agri_subsidy',
  },
  {
    id: 'gov_006',
    name: '完颜昊',
    regionId: 'northern_forest',
    age: 51,
    faction: 'military',
    loyalty: 70,
    competence: 68,
    corruption: 15,
    traits: ['military_background', 'disciplinarian'],
    biography: '退役少将转任，作风硬朗。重视国防与生态，民望中等。',
    preferredPolicy: 'defense_invest',
  },
  {
    id: 'gov_007',
    name: '木雅·阿旺',
    regionId: 'southwest_mountain',
    age: 47,
    faction: 'local',
    loyalty: 40,
    competence: 55,
    corruption: 35,
    traits: ['local_chieftain', 'independent'],
    biography: '山地部族领袖转任，治理能力一般，但能与本地部族沟通。腐败中等。',
    preferredPolicy: 'autonomy',
  },
  {
    id: 'gov_008',
    name: '郑和风',
    regionId: 'overseas_territory',
    age: 53,
    faction: 'technocrat',
    loyalty: 60,
    competence: 72,
    corruption: 12,
    traits: ['technocrat', 'diplomat'],
    biography: '外交官出身，外语流利。治理能力强，但领地资源有限。',
    preferredPolicy: 'foreign_trade',
  },
]

/** 派系立场标签 → 显示用名称 */
export const FACTION_LABELS: Record<string, { label: string; color: string }> = {
  technocrat: { label: '技术官僚', color: '#06b6d4' },
  business: { label: '商界派', color: '#f59e0b' },
  local: { label: '地方派', color: '#a855f7' },
  military: { label: '军方背景', color: '#ef4444' },
  reformist: { label: '改革派', color: '#22c55e' },
  conservative: { label: '保守派', color: '#64748b' },
}

/** 长官性格特质标签 */
export const GOVERNOR_TRAIT_META: Record<string, { label: string; icon: string }> = {
  technocrat: { label: '技术官僚', icon: '🎓' },
  cautious: { label: '谨慎', icon: '🛡️' },
  pragmatist: { label: '务实', icon: '⚖️' },
  business_oriented: { label: '亲商', icon: '💰' },
  opportunist: { label: '机会主义', icon: '🎭' },
  local_chieftain: { label: '地方豪强', icon: '👑' },
  independent: { label: '独立倾向', icon: '🌀' },
  conservative: { label: '保守', icon: '📜' },
  military_background: { label: '军方背景', icon: '🎖️' },
  disciplinarian: { label: '铁腕', icon: '⚔️' },
  diplomat: { label: '外交家', icon: '🕊️' },
}

/** 地方长官性格特质（用于新增长官时随机抽取） */
export const ALL_GOVERNOR_TRAITS: GovernorTrait[] = [
  'technocrat', 'cautious', 'pragmatist', 'business_oriented', 'opportunist',
  'local_chieftain', 'independent', 'conservative', 'military_background',
  'disciplinarian', 'diplomat',
]

/** 备用长官候选池（用于换人时随机选派） */
export const REPLACEMENT_GOVERNOR_POOL: { name: string; faction: string; competence: number; traits: GovernorTrait[] }[] = [
  { name: '王慕白', faction: 'technocrat', competence: 68, traits: ['technocrat', 'cautious'] },
  { name: '李文渊', faction: 'reformist', competence: 75, traits: ['pragmatist', 'business_oriented'] },
  { name: '赵立诚', faction: 'military', competence: 70, traits: ['military_background', 'disciplinarian'] },
  { name: '钱思齐', faction: 'business', competence: 72, traits: ['business_oriented', 'opportunist'] },
  { name: '周明远', faction: 'technocrat', competence: 65, traits: ['technocrat', 'conservative'] },
  { name: '吴浩然', faction: 'reformist', competence: 80, traits: ['pragmatist', 'cautious'] },
  { name: '郑书宁', faction: 'technocrat', competence: 73, traits: ['technocrat', 'diplomat'] },
  { name: '冯世安', faction: 'conservative', competence: 60, traits: ['conservative', 'cautious'] },
]

/** 获取某区的地方长官 */
export function getGovernorByRegion(regionId: RegionId): LocalGovernor | undefined {
  return GOVERNORS.find((g) => g.regionId === regionId)
}

/** 获取初始 regions 状态（玩家开始游戏时的快照） */
export function getInitialRegions(): Region[] {
  return REGIONS.map((r) => ({ ...r }))
}

/** 获取初始 governors 状态 */
export function getInitialGovernors(): LocalGovernor[] {
  return GOVERNORS.map((g) => ({ ...g }))
}

/** 对地方长官行动的菜单定义 */
export interface RegionActionDef {
  id: string
  label: string
  icon: string
  description: string
  /** 政治资本消耗 */
  cost: number
  /** 行动效果（应用到当前 region / governor） */
  effects: {
    loyaltyDelta?: number
    stabilityDelta?: number
    corruptionDelta?: number
    /** 中央指标影响 */
    centralEffects?: Partial<{
      approval: number
      treasury: number
      economy: number
      stability: number
      diplomacy: number
      prestige: number
    }>
  }
  /** 是否需要冷却（同区同行动） */
  cooldownDays: number
}

export const REGION_ACTIONS: RegionActionDef[] = [
  {
    id: 'allocate_funds',
    label: '拨款扶持',
    icon: '💰',
    description: '向该区拨付专项转移支付，提振地方经济与稳定，但消耗国库',
    cost: 8,
    effects: {
      loyaltyDelta: 6,
      stabilityDelta: 5,
      centralEffects: { treasury: -4, economy: 1 },
    },
    cooldownDays: 60,
  },
  {
    id: 'inspection',
    label: '视察走访',
    icon: '🚶',
    description: '亲自赴该区视察，提振长官忠诚与民意，但消耗政治资本',
    cost: 5,
    effects: {
      loyaltyDelta: 8,
      stabilityDelta: 3,
      centralEffects: { approval: 3, prestige: 1 },
    },
    cooldownDays: 45,
  },
  {
    id: 'replace_governor',
    label: '撤换长官',
    icon: '🔄',
    description: '罢免现任长官并委派新人。强力但破坏地方派系关系',
    cost: 20,
    effects: {
      loyaltyDelta: -10, // 新任长官忠诚默认 50
      stabilityDelta: -8,
      corruptionDelta: -15, // 新任长官腐败默认 10
      centralEffects: { stability: -2, prestige: -3 },
    },
    cooldownDays: 120,
  },
  {
    id: 'anti_corruption',
    label: '反贪调查',
    icon: '🔍',
    description: '派驻反贪组调查该区腐败，降低腐败但得罪地方长官',
    cost: 12,
    effects: {
      loyaltyDelta: -15,
      corruptionDelta: -25,
      stabilityDelta: -3,
      centralEffects: { approval: 5, prestige: 2 },
    },
    cooldownDays: 90,
  },
  {
    id: 'grant_autonomy',
    label: '下放权限',
    icon: '📜',
    description: '与该区签订自治协议，长期换稳定，但中央权威下降',
    cost: 10,
    effects: {
      loyaltyDelta: 18,
      stabilityDelta: 10,
      centralEffects: { stability: 3, prestige: -5, economy: -1 },
    },
    cooldownDays: 120,
  },
  {
    id: 'martial_law',
    label: '紧急戒严',
    icon: '⚔️',
    description: '对该区实施军事管制，强力维稳但激起民怨与国际关注',
    cost: 15,
    effects: {
      loyaltyDelta: -20,
      stabilityDelta: 20,
      centralEffects: { approval: -8, stability: -2, diplomacy: -3, treasury: -3 },
    },
    cooldownDays: 90,
  },
]

/** 与地方长官互动的菜单 */
export interface GovernorInteractionDef {
  id: string
  label: string
  icon: string
  description: string
  cost: number
  effects: {
    loyaltyDelta?: number
    corruptionDelta?: number
    competenceDelta?: number
    centralEffects?: Partial<{ approval: number; treasury: number; prestige: number }>
  }
}

export const GOVERNOR_INTERACTIONS: GovernorInteractionDef[] = [
  {
    id: 'private_dinner',
    label: '私人晚宴',
    icon: '🍷',
    description: '邀约长官共进晚餐，建立私人关系',
    cost: 4,
    effects: { loyaltyDelta: 8, corruptionDelta: 3, centralEffects: { treasury: -2 } },
  },
  {
    id: 'promotion_promise',
    label: '许诺升迁',
    icon: '🎯',
    description: '暗示将来擢升至中央，换取当下配合',
    cost: 6,
    effects: { loyaltyDelta: 12, centralEffects: { prestige: -1 } },
  },
  {
    id: 'pressure',
    label: '施压训诫',
    icon: '⚡',
    description: '召见训话，强硬要求配合中央政策',
    cost: 3,
    effects: { loyaltyDelta: -10, competenceDelta: 3, corruptionDelta: -5 },
  },
  {
    id: 'bribe',
    label: '私下打点',
    icon: '💼',
    description: '通过中间人输送利益，建立黑金关系',
    cost: 8,
    effects: { loyaltyDelta: 20, corruptionDelta: 15, centralEffects: { treasury: -3 } },
  },
]
