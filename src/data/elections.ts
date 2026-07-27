/** 大选相关数据 */

/** 大选模式配置 */
export interface ElectionConfig {
  /** 是否为大选年 */
  isElectionYear: boolean
  /** 距离大选剩余回合 */
  turnsUntilElection: number
  /** 当前民调领先者 */
  pollLeader: 'ruling' | 'opposition' | 'undecided'
  /** 各党派支持率 */
  partyPolls: Record<string, number>
}

/** 巡回演讲事件 */
export interface CampaignEvent {
  id: string
  title: string
  description: string
  region: string
  options: {
    id: string
    label: string
    description: string
    effects: {
      approval?: number
      treasury?: number
      stability?: number
      prestige?: number
      economy?: number
      diplomacy?: number
    }
    newsTitle: string
    newsSummary: string
  }[]
}

/** 政策纲领 */
export interface PolicyPlatform {
  id: string
  name: string
  description: string
  targetVoters: string[]
  effects: {
    approval?: number
    economy?: number
    treasury?: number
    stability?: number
  }
}

/** 巡回演讲事件库 */
export const CAMPAIGN_EVENTS: CampaignEvent[] = [
  {
    id: 'campaign_factory_visit',
    title: '工厂视察',
    description: '您计划视察一家大型制造企业，工人和媒体都在关注您的表态。',
    region: '工业区',
    options: [
      {
        id: 'promise_investment',
        label: '承诺增加产业投资',
        description: '承诺政府将加大对制造业的支持',
        effects: { approval: 5, treasury: -8, economy: 4 },
        newsTitle: '总理承诺支持制造业',
        newsSummary: '总理在工厂视察中承诺增加产业投资，工人表示欢迎。',
      },
      {
        id: 'focus_automation',
        label: '强调技术升级',
        description: '强调自动化和产业升级的重要性',
        effects: { approval: -2, economy: 6, treasury: -3 },
        newsTitle: '总理强调产业升级',
        newsSummary: '总理呼吁制造业转型升级，部分工人担忧就业问题。',
      },
      {
        id: 'listen_concerns',
        label: '倾听工人诉求',
        description: '与工人座谈，了解他们的困难',
        effects: { approval: 4, stability: 2 },
        newsTitle: '总理倾听工人心声',
        newsSummary: '总理与工人深入交流，了解基层困难，展现亲民形象。',
      },
    ],
  },
  {
    id: 'campaign_farm_tour',
    title: '农村走访',
    description: '您来到农村地区，农民们对农业政策有诸多期待。',
    region: '农业区',
    options: [
      {
        id: 'subsidy_promise',
        label: '承诺提高农业补贴',
        description: '承诺增加对农业的财政支持',
        effects: { approval: 6, treasury: -10 },
        newsTitle: '总理承诺提高农业补贴',
        newsSummary: '总理在农村走访中承诺增加农业补贴，农民表示欢迎。',
      },
      {
        id: 'infrastructure_focus',
        label: '强调农村基建',
        description: '承诺改善农村基础设施',
        effects: { approval: 4, treasury: -6, economy: 2 },
        newsTitle: '总理关注农村基建',
        newsSummary: '总理承诺改善农村道路和水利设施，农民表示期待。',
      },
      {
        id: 'market_reform',
        label: '推动市场化改革',
        description: '强调农产品市场化和技术创新',
        effects: { approval: -3, economy: 5, treasury: 2 },
        newsTitle: '总理推动农业市场化',
        newsSummary: '总理呼吁农业市场化改革，部分农民表示担忧。',
      },
    ],
  },
  {
    id: 'campaign_university_speech',
    title: '大学演讲',
    description: '您受邀在大学发表演讲，青年学生对教育和就业问题高度关注。',
    region: '城市',
    options: [
      {
        id: 'education_reform',
        label: '承诺教育改革',
        description: '承诺增加教育投入，改善教学质量',
        effects: { approval: 5, treasury: -7 },
        newsTitle: '总理承诺教育改革',
        newsSummary: '总理在大学演讲中承诺增加教育投入，学生表示欢迎。',
      },
      {
        id: 'startup_support',
        label: '支持青年创业',
        description: '承诺提供创业资金和政策支持',
        effects: { approval: 6, treasury: -5, economy: 3 },
        newsTitle: '总理支持青年创业',
        newsSummary: '总理宣布青年创业支持计划，学生反响热烈。',
      },
      {
        id: 'meritocracy_speech',
        label: '强调能力竞争',
        description: '强调个人能力和市场竞争',
        effects: { approval: -2, economy: 4, prestige: 3 },
        newsTitle: '总理强调能力竞争',
        newsSummary: '总理呼吁青年提升自身能力，部分学生认为政府推卸责任。',
      },
    ],
  },
  {
    id: 'campaign_media_interview',
    title: '媒体专访',
    description: '主流媒体对您进行专访，全国观众都在关注您的表态。',
    region: '全国',
    options: [
      {
        id: 'honest_assessment',
        label: '坦诚评估政绩',
        description: '客观评价执政成绩和不足',
        effects: { approval: 4, prestige: 5 },
        newsTitle: '总理坦诚评估政绩',
        newsSummary: '总理在专访中坦诚评价执政表现，展现务实形象。',
      },
      {
        id: 'attack_opposition',
        label: '抨击反对党',
        description: '批评反对党的政策主张',
        effects: { approval: -3, prestige: 3, stability: -2 },
        newsTitle: '总理抨击反对党',
        newsSummary: '总理在专访中猛烈抨击反对党，选战氛围升温。',
      },
      {
        id: 'policy_focus',
        label: '聚焦政策主张',
        description: '详细阐述未来政策规划',
        effects: { approval: 3, economy: 2, prestige: 2 },
        newsTitle: '总理阐述政策规划',
        newsSummary: '总理在专访中详细阐述未来政策，选民反应积极。',
      },
    ],
  },
]

/** 政策纲领库 */
export const POLICY_PLATFORMS: PolicyPlatform[] = [
  {
    id: 'platform_economy',
    name: '经济优先',
    description: '以促进经济增长为核心，强调减税和市场化改革',
    targetVoters: ['企业主', '中产阶级'],
    effects: { economy: 5, treasury: -3, approval: 2 },
  },
  {
    id: 'platform_welfare',
    name: '民生保障',
    description: '以增加社会福利为核心，强调公平和保障',
    targetVoters: ['工薪阶层', '退休人员'],
    effects: { approval: 6, treasury: -8, stability: 3 },
  },
  {
    id: 'platform_security',
    name: '安全稳定',
    description: '以维护社会稳定为核心，强调法治和秩序',
    targetVoters: ['保守派', '中产阶级'],
    effects: { stability: 6, approval: 2, treasury: -4 },
  },
  {
    id: 'platform_environment',
    name: '绿色发展',
    description: '以环境保护为核心，强调可持续发展',
    targetVoters: ['青年', '城市中产'],
    effects: { approval: 4, economy: -2, treasury: -5 },
  },
]

/** 计算大选结果 */
export function calculateElectionResult(
  approval: number,
  economy: number,
  stability: number,
  prestige: number,
): {
  rulingPartySeats: number
  oppositionSeats: number
  winner: 'ruling' | 'opposition'
} {
  // 综合评分
  const score = (approval * 0.4 + economy * 0.25 + stability * 0.2 + prestige * 0.15) / 100
  
  // 基础席位分配（总席位100）
  const baseSeats = 50
  const seatVariation = Math.round((score - 0.5) * 40) // ±20席波动
  
  const rulingSeats = Math.max(10, Math.min(90, baseSeats + seatVariation))
  const oppositionSeats = 100 - rulingSeats
  
  return {
    rulingPartySeats: rulingSeats,
    oppositionSeats: oppositionSeats,
    winner: rulingSeats > 50 ? 'ruling' : 'opposition',
  }
}

/** 提前大选（解散议会） */
export function calculateSnapElectionResult(
  currentApproval: number,
  riskIndex: number,
): {
  success: boolean
  seatChange: number
  newsTitle: string
  newsSummary: string
} {
  // 成功率基于当前民调和风险指数
  const successRate = (currentApproval - riskIndex * 0.3) / 100
  const success = Math.random() < successRate
  
  if (success) {
    const seatGain = Math.round((currentApproval - 50) * 0.4)
    return {
      success: true,
      seatChange: seatGain,
      newsTitle: '提前大选获胜',
      newsSummary: `执政党在提前大选中获胜，席位增加${seatGain}席，巩固执政地位。`,
    }
  } else {
    const seatLoss = Math.round((50 - currentApproval) * 0.5)
    return {
      success: false,
      seatChange: -seatLoss,
      newsTitle: '提前大选失利',
      newsSummary: `执政党在提前大选中失利，席位减少${seatLoss}席，执政地位动摇。`,
    }
  }
}
