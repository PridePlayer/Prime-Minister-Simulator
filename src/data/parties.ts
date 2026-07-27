import type { PoliticalParty } from '@/types/game'

/** 可选政党（开局玩家选择执政党）—— 席位总和按 100 席议会设计 */
export const PLAYABLE_PARTIES: PoliticalParty[] = [
  {
    id: 'party_progressive',
    name: '进步联盟',
    color: '#ec4899',
    seats: 22,
    favorability: 75,
    inCoalition: true,
    icon: '🌹',
    description: '主张社会公平与可持续发展的中左翼政党，深耕城市与青年群体。',
    stance: '中左翼 · 进步主义',
    manifesto: ['扩大公共医疗与教育投入', '推进绿色能源转型', '提高富人税率'],
    coalitionDemands: ['推进绿色能源转型改革', '扩大公共医疗投入'],
  },
  {
    id: 'party_centrist',
    name: '国民和谐党',
    color: '#06b6d4',
    seats: 20,
    favorability: 70,
    inCoalition: true,
    icon: '⚖️',
    description: '奉行实用主义与中间路线的执政型政党，强调财政稳健与社会共识。',
    stance: '中间派 · 实用主义',
    manifesto: ['平衡财政收支', '推动产业升级', '维护社会和谐'],
    coalitionDemands: ['维持财政赤字可控', '推动产业升级改革'],
  },
  {
    id: 'party_conservative',
    name: '自由人民党',
    color: '#f59e0b',
    seats: 21,
    favorability: 65,
    inCoalition: true,
    icon: '🦁',
    description: '强调传统价值、市场自由与国家安全的右翼政党，受企业与农村支持。',
    stance: '中右翼 · 保守主义',
    manifesto: ['减税与放松管制', '强化国防与治安', '保护传统家庭价值'],
    coalitionDemands: ['通过减税或放松管制改革', '增加国防预算或强化治安'],
  },
  {
    id: 'party_green',
    name: '生态未来党',
    color: '#22c55e',
    seats: 12,
    favorability: 60,
    inCoalition: false,
    icon: '🌱',
    description: '以生态优先和直接民主为核心理念的新兴政党，在青年中人气飙升。',
    stance: '环保主义 · 直接民主',
    manifesto: ['禁止高污染项目', '推动循环经济', '降低法定投票年龄'],
    coalitionDemands: ['要求通过环保法案', '要求设立环境法庭'],
  },
  {
    id: 'party_labour',
    name: '劳动者联合',
    color: '#ef4444',
    seats: 10,
    favorability: 55,
    inCoalition: false,
    icon: '✊',
    description: '代表工人阶级与传统产业利益的左翼政党，主张强有力的工会保护。',
    stance: '左翼 · 工会主义',
    manifesto: ['提高最低工资', '扩大工会权力', '反对外包与裁员'],
    coalitionDemands: ['要求提高最低工资', '要求修订劳动法'],
  },
  {
    id: 'party_liberty',
    name: '自由民主党',
    color: '#8b5cf6',
    seats: 7,
    favorability: 50,
    inCoalition: false,
    icon: '🕊️',
    description: '推崇个人自由、最小政府与自由贸易的经典自由主义政党。',
    stance: '自由意志主义 · 市场派',
    manifesto: ['大幅削减政府规模', '推动自由贸易协定', '保障个人隐私权'],
    coalitionDemands: ['要求减税', '要求减少政府干预'],
  },
]

/** 其他议会小党派（不可选，仅用于组阁） */
export const MINOR_PARTIES: PoliticalParty[] = [
  {
    id: 'party_regional_north',
    name: '北方联盟',
    color: '#0ea5e9',
    seats: 5,
    favorability: 45,
    inCoalition: false,
    icon: '🏔️',
    description: '代表北方边境地区利益的地区性政党。',
    stance: '地区主义',
    manifesto: ['增加北方基建投入'],
    coalitionDemands: ['要求北方基建拨款', '要求设立北方发展基金'],
  },
  {
    id: 'party_regional_south',
    name: '南方自治党',
    color: '#84cc16',
    seats: 3,
    favorability: 40,
    inCoalition: false,
    icon: '🌊',
    description: '主张南方各省扩大自治权的地区性政党。',
    stance: '地区主义 · 自治派',
    manifesto: ['扩大地方自治权'],
    coalitionDemands: ['要求下放税收权限', '要求南方自治章程'],
  },
]

/** 获取所有政党（按席位排序） */
export function getAllParties(): PoliticalParty[] {
  return [...PLAYABLE_PARTIES, ...MINOR_PARTIES].sort((a, b) => b.seats - a.seats)
}

/** 根据所选执政党构造初始议会（执政党+若干小党） */
export function buildInitialParliament(rulingPartyId: string): PoliticalParty[] {
  const ruling = PLAYABLE_PARTIES.find((p) => p.id === rulingPartyId)
  if (!ruling) return getAllParties()

  // 执政党保持原有席位（议会共 100 席）
  const rulingWithBoost: PoliticalParty = {
    ...ruling,
    inCoalition: true,
    favorability: 80,
  }

  // 其余可玩家党派作为潜在盟友/反对党
  const otherPlayable = PLAYABLE_PARTIES.filter((p) => p.id !== rulingPartyId).map((p) => ({
    ...p,
    inCoalition: false,
    favorability: p.favorability - 10,
  }))

  // 小党派
  const minors = MINOR_PARTIES.map((p) => ({ ...p }))

  return [rulingWithBoost, ...otherPlayable, ...minors].sort((a, b) => b.seats - a.seats)
}

/** 初始议会状态（兼容旧接口） */
export const INITIAL_PARTIES: PoliticalParty[] = getAllParties()

/** 不信任投票事件 */
export interface NoConfidenceEvent {
  id: string
  title: string
  description: string
  options: {
    id: string
    label: string
    description: string
    effects: {
      favorability: number
      politicalCapital?: number
      approval?: number
      prestige?: number
    }
    newsTitle: string
    newsSummary: string
  }[]
}

/** 组阁谈判事件 */
export interface CoalitionNegotiationEvent {
  id: string
  title: string
  description: string
  targetParty: string
  options: {
    id: string
    label: string
    description: string
    acceptDemands: boolean
    effects: {
      favorability: number
      politicalCapital?: number
      approval?: number
      prestige?: number
    }
    newsTitle: string
    newsSummary: string
  }[]
}

/** 组阁谈判事件库 */
export const COALITION_NEGOTIATIONS: CoalitionNegotiationEvent[] = [
  {
    id: 'coalition_green_demand',
    title: '生态未来党的组阁条件',
    description: '生态未来党表示愿意加入执政联盟，但要求通过环保法案并设立环境法庭。',
    targetParty: 'party_green',
    options: [
      {
        id: 'accept',
        label: '接受全部条件',
        description: '承诺通过环保法案',
        acceptDemands: true,
        effects: { favorability: 25, politicalCapital: -18, approval: 6 },
        newsTitle: '生态未来党加入执政联盟',
        newsSummary: '政府承诺推进环保立法，绿党加入执政联盟。',
      },
      {
        id: 'partial',
        label: '部分妥协',
        description: '设立环境法庭，但暂缓激进环保法案',
        acceptDemands: false,
        effects: { favorability: 10, politicalCapital: -8, approval: 3 },
        newsTitle: '与绿党谈判取得进展',
        newsSummary: '政府做出部分让步，绿党仍在评估。',
      },
      {
        id: 'reject',
        label: '拒绝要求',
        description: '坚持经济发展优先',
        acceptDemands: false,
        effects: { favorability: -18, prestige: 6 },
        newsTitle: '与绿党组阁谈判破裂',
        newsSummary: '绿党批评政府忽视环境，拒绝合作。',
      },
    ],
  },
  {
    id: 'coalition_labour_demand',
    title: '劳动者联合的合作意向',
    description: '劳动者联合表示愿意支持政府，但要求提高最低工资并修订劳动法。',
    targetParty: 'party_labour',
    options: [
      {
        id: 'accept',
        label: '接受全部条件',
        description: '承诺大幅提高最低工资',
        acceptDemands: true,
        effects: { favorability: 28, politicalCapital: -20, approval: 8, prestige: -5 },
        newsTitle: '劳动者联合加入执政联盟',
        newsSummary: '政府承诺提高最低工资，劳工党加入联盟。',
      },
      {
        id: 'partial',
        label: '提出折中方案',
        description: '适度调整工资，修订部分条款',
        acceptDemands: false,
        effects: { favorability: 12, politicalCapital: -10, approval: 3 },
        newsTitle: '与劳工党达成部分共识',
        newsSummary: '政府提出折中方案，劳工党仍在评估。',
      },
      {
        id: 'reject',
        label: '拒绝要求',
        description: '坚持财政纪律优先',
        acceptDemands: false,
        effects: { favorability: -20, prestige: 8, approval: -3 },
        newsTitle: '劳工党批评政府保守',
        newsSummary: '劳动者联合指责政府忽视工人权益。',
      },
    ],
  },
  {
    id: 'coalition_liberty_demand',
    title: '自由民主党的合作条件',
    description: '自由民主党愿意支持政府，但要求大幅减税并减少政府干预。',
    targetParty: 'party_liberty',
    options: [
      {
        id: 'accept',
        label: '接受全部条件',
        description: '承诺大幅减税',
        acceptDemands: true,
        effects: { favorability: 22, politicalCapital: -15, approval: -4, prestige: 8 },
        newsTitle: '自由民主党加入执政联盟',
        newsSummary: '政府承诺减税，自民党加入联盟。',
      },
      {
        id: 'partial',
        label: '部分妥协',
        description: '小幅减税，但保留监管',
        acceptDemands: false,
        effects: { favorability: 10, politicalCapital: -8, approval: 2 },
        newsTitle: '与自民党谈判有进展',
        newsSummary: '政府考虑小幅减税，自民党仍在评估。',
      },
      {
        id: 'reject',
        label: '拒绝要求',
        description: '维持现有税收体系',
        acceptDemands: false,
        effects: { favorability: -15, prestige: 5, approval: 3 },
        newsTitle: '自民党批评政府扩权',
        newsSummary: '自由民主党指责政府过度干预经济。',
      },
    ],
  },
]

/** 不信任投票事件库 */
export const NO_CONFIDENCE_EVENTS: NoConfidenceEvent[] = [
  {
    id: 'no_confidence_crisis',
    title: '议会发起不信任投票',
    description: '反对党联合部分执政联盟成员，在议会发起不信任投票。您必须在48小时内说服足够多的议员支持您，否则将被迫下台。',
    options: [
      {
        id: 'negotiate',
        label: '紧急斡旋，以政治交易换取支持',
        description: '消耗大量政治资本',
        effects: { favorability: 20, politicalCapital: -25, approval: 8, prestige: -6 },
        newsTitle: '总理惊险通过不信任投票',
        newsSummary: '多笔政治交易达成，但代价高昂。',
      },
      {
        id: 'speech',
        label: '发表全国电视讲话，争取民意支持',
        description: '依赖民意施压议会',
        effects: { favorability: 15, approval: 12, prestige: 8 },
        newsTitle: '总理电视讲话赢得民意',
        newsSummary: '民众支持率上升，部分议员改变立场。',
      },
      {
        id: 'accept',
        label: '接受结果，体面下台',
        description: '承认失败',
        effects: { favorability: -30, approval: -10, prestige: -15 },
        newsTitle: '总理接受不信任投票结果',
        newsSummary: '政治生涯画上句号。',
      },
    ],
  },
]
