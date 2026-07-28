import type { LawGroup } from '@/types/game'

/**
 * 法律系统（维多利亚3风格）
 * 每个法律组内档位互斥；修改法律需要政治资本、议会席位与数个月审议期。
 * 法律效果跨系统传导：劳工法影响失业与抗议，兵役法影响军队兵员，媒体法影响民意与黑金……
 */
export const LAW_GROUPS: LawGroup[] = [
  {
    id: 'economy_system',
    name: '经济制度',
    icon: '🏦',
    description: '决定市场与政府在经济中的角色边界',
    laws: [
      {
        id: 'free_market',
        name: '自由市场经济',
        description: '最大限度放开市场，减少管制。资本欢呼，增长强劲，但贫富分化与失业波动加剧。',
        perTurnEffects: { economy: 2, treasury: 1, stability: -1 },
        secondaryEffects: { industrialOutput: 2, employmentRate: -1, socialCohesion: -1 },
        enactCost: { politicalCapital: 25 },
        enactMonths: 4,
        minSeats: 45,
        enactNarrative: '《经济自由化法案》在议会引发激烈辩论，商界游说团体频繁出入议事厅。',
      },
      {
        id: 'mixed_economy',
        name: '混合经济体制',
        description: '市场为主、政府适度调控的现行体制。',
        perTurnEffects: { economy: 1 },
        secondaryEffects: {},
        enactCost: { politicalCapital: 10 },
        enactMonths: 2,
        isDefault: true,
      },
      {
        id: 'state_capitalism',
        name: '国家干预经济',
        description: '强化国企与产业政策。调控有力、失业可控，但市场活力与外资信心受挫。',
        perTurnEffects: { economy: -1, stability: 1, treasury: -1 },
        secondaryEffects: { employmentRate: 2, industrialOutput: -1, forexReserves: -1 },
        enactCost: { politicalCapital: 25 },
        enactMonths: 4,
        minSeats: 45,
        enactNarrative: '《产业振兴与国家投资法案》递交议会，反对党指责政府"开倒车"。',
      },
    ],
  },
  {
    id: 'labor',
    name: '劳工制度',
    icon: '⛏️',
    description: '平衡劳动者权益与企业用人自由',
    laws: [
      {
        id: 'employer_friendly',
        name: '弹性用工制度',
        description: '放宽解雇限制与工时管制。企业成本下降、投资上升，工会强烈反弹。',
        perTurnEffects: { economy: 2, approval: -1 },
        secondaryEffects: { employmentRate: 2, protestFrequency: 2, youthSupport: -2 },
        enactCost: { politicalCapital: 20 },
        enactMonths: 3,
        enactNarrative: '工会扬言发动全国总罢工，抗议《弹性用工法案》',
      },
      {
        id: 'standard_labor',
        name: '标准劳动保障',
        description: '现行的平衡性劳动法规。',
        perTurnEffects: {},
        secondaryEffects: {},
        enactCost: { politicalCapital: 10 },
        enactMonths: 2,
        isDefault: true,
      },
      {
        id: 'union_protection',
        name: '强力工会保护',
        description: '赋予工会集体谈判与罢工的广泛权利。工人拥护，企业投资意愿下降。',
        perTurnEffects: { approval: 1, economy: -2, stability: 1 },
        secondaryEffects: { employmentRate: -2, socialCohesion: 2, industrialOutput: -1 },
        enactCost: { politicalCapital: 20 },
        enactMonths: 3,
        enactNarrative: '《劳工权益保障法案》获工会盛大支持，商界联名上书反对。',
      },
    ],
  },
  {
    id: 'welfare',
    name: '福利制度',
    icon: '🏥',
    description: '决定国家为公民提供多少社会保障',
    laws: [
      {
        id: 'minimal_welfare',
        name: '低福利自食其力',
        description: '削减社会福利开支，鼓励个人奋斗。国库宽裕，底层民众不满。',
        perTurnEffects: { treasury: 2, approval: -1, stability: -1 },
        secondaryEffects: { ruralSupport: -2, crimeRate: 1, fiscalSurplus: 2 },
        enactCost: { politicalCapital: 22 },
        enactMonths: 3,
        enactNarrative: '《财政紧缩与社会责任法案》引发底层选民的愤怒集会。',
      },
      {
        id: 'basic_safety_net',
        name: '基本保障网',
        description: '覆盖基本医疗与失业救济的现行福利体系。',
        perTurnEffects: { treasury: -1, stability: 1 },
        secondaryEffects: { socialCohesion: 1 },
        enactCost: { politicalCapital: 10 },
        enactMonths: 2,
        isDefault: true,
      },
      {
        id: 'welfare_state',
        name: '高福利国家',
        description: '从摇篮到坟墓的全面保障。民心大振、社会团结，财政负担沉重。',
        perTurnEffects: { approval: 2, stability: 1, treasury: -3, economy: -1 },
        secondaryEffects: { socialCohesion: 3, crimeRate: -2, debtLevel: 2 },
        enactCost: { politicalCapital: 28, treasury: 10 },
        enactMonths: 5,
        minSeats: 50,
        enactNarrative: '《全民福利法案》被反对党抨击为"透支子孙的民粹主义"。',
      },
    ],
  },
  {
    id: 'security',
    name: '治安制度',
    icon: '🚨',
    description: '警察权力与公民自由之间的取舍',
    laws: [
      {
        id: 'community_policing',
        name: '轻刑教化路线',
        description: '以社区矫治与教育代替严刑峻法。人权组织赞赏，犯罪率可能回升。',
        perTurnEffects: { approval: 1, stability: -1 },
        secondaryEffects: { crimeRate: 2, youthSupport: 2, socialCohesion: 1 },
        enactCost: { politicalCapital: 15 },
        enactMonths: 3,
      },
      {
        id: 'standard_security',
        name: '标准治安体系',
        description: '现行的常规警务与司法体系。',
        perTurnEffects: {},
        secondaryEffects: {},
        enactCost: { politicalCapital: 10 },
        enactMonths: 2,
        isDefault: true,
      },
      {
        id: 'iron_fist',
        name: '铁腕治安',
        description: '扩大警察权力、加重刑罚、增设监控。犯罪率大降，自由派与青年强烈不满。',
        perTurnEffects: { stability: 2, approval: -1, prestige: -1 },
        secondaryEffects: { crimeRate: -3, protestFrequency: -2, youthSupport: -3, mediaRating: -1 },
        enactCost: { politicalCapital: 22 },
        enactMonths: 3,
        enactNarrative: '《公共安全强化法案》遭人权组织痛斥为"警察国家的开端"。',
      },
    ],
  },
  {
    id: 'military_service',
    name: '军事制度',
    icon: '🎖️',
    description: '决定军队的兵员来源与规模',
    laws: [
      {
        id: 'volunteer_army',
        name: '志愿兵役制',
        description: '职业化志愿军队。兵员精干但规模有限。',
        perTurnEffects: { treasury: -1 },
        secondaryEffects: { youthSupport: 1 },
        enactCost: { politicalCapital: 15 },
        enactMonths: 3,
        isDefault: true,
      },
      {
        id: 'conscription',
        name: '义务兵役制',
        description: '适龄青年依法服役两年。陆军兵员大幅扩充，青年与家长怨言四起。',
        perTurnEffects: { approval: -1, stability: -1 },
        secondaryEffects: { youthSupport: -3, employmentRate: -1 },
        enactCost: { politicalCapital: 25, treasury: 5 },
        enactMonths: 4,
        minSeats: 48,
        enactNarrative: '《国防服役法》恢复义务兵役，大学校园爆发反征兵示威。',
      },
      {
        id: 'total_mobilization',
        name: '全民皆兵体制',
        description: '预备役常态化、民防体系全面铺开。国防潜力极大化，经济与社会付出沉重代价。',
        perTurnEffects: { economy: -2, stability: 1, approval: -2, treasury: -2 },
        secondaryEffects: { employmentRate: -2, protestFrequency: 2 },
        enactCost: { politicalCapital: 35, treasury: 10 },
        enactMonths: 6,
        minSeats: 55,
        enactNarrative: '《全民国防法》震动全国：这究竟是居安思危，还是战争的先声？',
      },
    ],
  },
  {
    id: 'media_law',
    name: '媒体制度',
    icon: '📺',
    description: '新闻自由的边界',
    laws: [
      {
        id: 'free_press',
        name: '完全新闻自由',
        description: '媒体不受任何事前审查。监督有力、黑金难藏，但丑闻与批评铺天盖地。',
        perTurnEffects: { prestige: 1, approval: -1 },
        secondaryEffects: { mediaRating: 2, politicalPrestige: -1 },
        enactCost: { politicalCapital: 15 },
        enactMonths: 2,
        isDefault: true,
      },
      {
        id: 'regulated_press',
        name: '有限媒体管制',
        description: '以"国家安全与公序良俗"为由对媒体实施有限审查。批评声减少，国际社会侧目。',
        perTurnEffects: { approval: 1, prestige: -1, diplomacy: -1 },
        secondaryEffects: { mediaRating: -2, protestFrequency: 1 },
        enactCost: { politicalCapital: 20 },
        enactMonths: 3,
        enactNarrative: '《媒体管理法案》引发新闻界总罢工威胁，国际观察组织深表关切。',
      },
      {
        id: 'state_propaganda',
        name: '国家宣传体系',
        description: '主要媒体国有化，统一宣传口径。民意可被塑造，但纸包不住火，一旦穿帮代价惨重。',
        perTurnEffects: { approval: 2, prestige: -2, diplomacy: -1 },
        secondaryEffects: { mediaRating: -3, historicalLegacy: -1, youthSupport: -2 },
        enactCost: { politicalCapital: 35, treasury: 8 },
        enactMonths: 5,
        minSeats: 55,
        enactNarrative: '《国家传播法案》在议会强行闯关，独立媒体编辑部彻夜亮灯。',
      },
    ],
  },
  {
    id: 'electoral_system',
    name: '选举制度',
    icon: '🗳️',
    description: '权力如何产生——改动它就是在改动游戏本身',
    laws: [
      {
        id: 'proportional',
        name: '比例代表制',
        description: '席位按得票比例分配，小党林立，联合政府成为常态。',
        perTurnEffects: { stability: 1 },
        secondaryEffects: { socialCohesion: 1 },
        enactCost: { politicalCapital: 15 },
        enactMonths: 3,
        isDefault: true,
      },
      {
        id: 'majoritarian',
        name: '多数决选举制',
        description: '单一选区多数决，大党通吃。执政更稳，小党消亡，失败者更加愤怒。',
        perTurnEffects: { stability: -1, prestige: 1 },
        secondaryEffects: { protestFrequency: 1, politicalPrestige: 1 },
        enactCost: { politicalCapital: 30 },
        enactMonths: 5,
        minSeats: 55,
        enactNarrative: '《选举制度改革法案》被小党痛斥为"政治谋杀"，街头出现绝食抗议。',
      },
      {
        id: 'managed_democracy',
        name: '管控式民主',
        description: '保留选举形式，但候选人需经"资格审查"。权力从此高枕无忧，民主名存实亡。',
        perTurnEffects: { stability: 2, approval: -2, diplomacy: -2, prestige: -2 },
        secondaryEffects: { protestFrequency: 3, youthSupport: -3, orgInfluence: -2, historicalLegacy: -2 },
        enactCost: { politicalCapital: 50, treasury: 10 },
        enactMonths: 6,
        minSeats: 60,
        enactNarrative: '《候选人资格审查法案》震动全国：这是自共和国成立以来最危险的一次投票。',
      },
    ],
  },
]

/** 初始生效法律（每组默认档） */
export function getDefaultLaws(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const g of LAW_GROUPS) {
    const def = g.laws.find((l) => l.isDefault) ?? g.laws[0]
    map[g.id] = def.id
  }
  return map
}

/** 按 ID 查找法律及其所在组 */
export function findLaw(lawId: string): { group: LawGroup; law: LawGroup['laws'][number] } | null {
  for (const group of LAW_GROUPS) {
    const law = group.laws.find((l) => l.id === lawId)
    if (law) return { group, law }
  }
  return null
}
