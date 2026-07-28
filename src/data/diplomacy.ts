import type {
  ForeignCountry,
  DiplomaticActionDef,
  WarStage,
  WarState,
  RelationLevel,
  CountryEffect,
} from '@/types/game'
import { clamp } from '@/engine/metrics'

/** 由关系值派生关系等级 */
export function deriveRelationLevel(relation: number, atWar = false): RelationLevel {
  if (atWar) return '交战'
  if (relation >= 80) return '盟友'
  if (relation >= 60) return '友好'
  if (relation >= 40) return '正常'
  if (relation >= 20) return '紧张'
  return '敌对'
}

/** 关系等级对应颜色 */
export const RELATION_COLORS: Record<RelationLevel, string> = {
  '盟友': '#4ade80',
  '友好': '#a3e635',
  '正常': '#eab308',
  '紧张': '#fb923c',
  '敌对': '#ef4444',
  '交战': '#dc2626',
}

/**
 * 对具体国家应用一组 CountryEffect，返回新的 countries 数组。
 * 用于让事件选项 / 延迟后果 / 改革完成真正联动外交页面（而非孤立改全局 diplomacy 数字）。
 *
 * - countryId 指定具体国家；否则 targetNeighbors / targetAll 决定范围
 * - relationDelta 累加到 relation，并重新派生 relationLevel
 * - setSanctioned / liftSanctioned / setTradeAgreement / liftTradeAgreement 切换状态
 * - 处于战争（relationLevel='交战'）的国家不受 relationDelta 影响（避免与战争机制冲突）
 */
export function applyCountryEffects(
  countries: ForeignCountry[],
  effects: CountryEffect[] | undefined,
): ForeignCountry[] {
  if (!effects || effects.length === 0) return countries

  return countries.map((c) => {
    // 判断此国家是否被本组 effect 命中，并累加 relationDelta
    let relationDelta = 0
    let setSanctioned: boolean | undefined
    let liftSanctioned: boolean | undefined
    let setTradeAgreement: boolean | undefined
    let liftTradeAgreement: boolean | undefined

    for (const eff of effects) {
      const hit = eff.countryId
        ? c.id === eff.countryId
        : eff.targetAll
        ? true
        : eff.targetNeighbors
        ? c.isNeighbor
        : false
      if (!hit) continue
      if (eff.relationDelta) relationDelta += eff.relationDelta
      if (eff.setSanctioned !== undefined) setSanctioned = eff.setSanctioned
      if (eff.liftSanctioned) liftSanctioned = true
      if (eff.setTradeAgreement !== undefined) setTradeAgreement = eff.setTradeAgreement
      if (eff.liftTradeAgreement) liftTradeAgreement = true
    }

    // 未命中任何效果，原样返回
    if (
      relationDelta === 0 &&
      setSanctioned === undefined &&
      !liftSanctioned &&
      setTradeAgreement === undefined &&
      !liftTradeAgreement
    ) {
      return c
    }

    // 战争中的国家：忽略 relationDelta（战争期间关系已锁定）
    const atWar = c.relationLevel === '交战'
    const newRelation = atWar ? c.relation : clamp(c.relation + relationDelta)
    let next: ForeignCountry = {
      ...c,
      relation: newRelation,
      relationLevel: atWar ? c.relationLevel : deriveRelationLevel(newRelation),
    }
    if (setSanctioned === true) next.sanctioned = true
    if (liftSanctioned) next.sanctioned = false
    if (setTradeAgreement === true) next.tradeAgreement = true
    if (liftTradeAgreement) next.tradeAgreement = false
    return next
  })
}

/** 初始外国列表 */
export const INITIAL_COUNTRIES: ForeignCountry[] = [
  {
    id: 'northoria',
    name: '北境利亚',
    flag: '🦅',
    government: '威权',
    power: 82,
    military: 88,
    nuclear: true,
    isNeighbor: true,
    relation: 45,
    relationLevel: '正常',
    treaties: [],
    tradeAgreement: false,
    sanctioned: false,
    espionageLevel: 0,
    lastActionTurn: 0,
  },
  {
    id: 'sundara',
    name: '桑达拉',
    flag: '☀️',
    government: '民主',
    power: 68,
    military: 55,
    nuclear: false,
    isNeighbor: true,
    relation: 62,
    relationLevel: '友好',
    treaties: ['互不侵犯条约'],
    tradeAgreement: true,
    sanctioned: false,
    espionageLevel: 1,
    lastActionTurn: 0,
  },
  {
    id: 'westmark',
    name: '西马克',
    flag: '⚜️',
    government: '君主',
    power: 75,
    military: 70,
    nuclear: true,
    isNeighbor: false,
    relation: 55,
    relationLevel: '正常',
    treaties: [],
    tradeAgreement: false,
    sanctioned: false,
    espionageLevel: 0,
    lastActionTurn: 0,
  },
  {
    id: 'zakhara',
    name: '扎卡拉',
    flag: '🌙',
    government: '神权',
    power: 60,
    military: 65,
    nuclear: false,
    isNeighbor: false,
    relation: 35,
    relationLevel: '紧张',
    treaties: [],
    tradeAgreement: false,
    sanctioned: false,
    espionageLevel: 0,
    lastActionTurn: 0,
  },
  {
    id: 'eastoria',
    name: '东瀛洲',
    flag: '🌸',
    government: '混合',
    power: 88,
    military: 72,
    nuclear: false,
    isNeighbor: false,
    relation: 70,
    relationLevel: '友好',
    treaties: ['贸易协定'],
    tradeAgreement: true,
    sanctioned: false,
    espionageLevel: 1,
    lastActionTurn: 0,
  },
  {
    id: 'sudalia',
    name: '南联邦',
    flag: '🔥',
    government: '威权',
    power: 50,
    military: 80,
    nuclear: true,
    isNeighbor: false,
    relation: 25,
    relationLevel: '紧张',
    treaties: [],
    tradeAgreement: false,
    sanctioned: true,
    espionageLevel: 0,
    lastActionTurn: 0,
  },
]

/** 外交行动库 */
export const DIPLOMATIC_ACTIONS: DiplomaticActionDef[] = [
  {
    id: 'improve_relations',
    label: '改善关系',
    description: '派遣特使进行高层访问，赠送国礼，提升两国关系。',
    icon: '🤝',
    kind: 'diplomatic',
    minRelation: 10,
    maxRelation: 90,
    politicalCapitalCost: 5,
    treasuryCost: 3,
    cooldown: 3,
    execute: (country) => ({
      country: { relation: clamp(country.relation + 8) },
      metrics: { diplomacy: 1 },
      news: {
        title: `${country.name}关系改善`,
        summary: `特使团访问${country.name}取得积极成果，两国关系回暖。`,
        tone: 'positive',
      },
    }),
  },
  {
    id: 'trade_deal',
    label: '签订贸易协定',
    description: '与对方签署贸易协定，互通有无，提升经济与外交。',
    icon: '💼',
    kind: 'economic',
    minRelation: 50,
    politicalCapitalCost: 8,
    treasuryCost: 5,
    cooldown: 12,
    execute: (country) => ({
      country: {
        relation: clamp(country.relation + 5),
        tradeAgreement: true,
        treaties: [...new Set([...country.treaties, '贸易协定'])],
      },
      metrics: { economy: 4, treasury: 3, diplomacy: 2 },
      news: {
        title: `与${country.name}签订贸易协定`,
        summary: `双边贸易额预计增长 30%，商界普遍看好合作前景。`,
        tone: 'positive',
      },
    }),
  },
  {
    id: 'cultural_exchange',
    label: '文化交流',
    description: '举办文化年、互派留学生，深化民间理解。',
    icon: '🎭',
    kind: 'diplomatic',
    minRelation: 40,
    politicalCapitalCost: 4,
    treasuryCost: 2,
    cooldown: 6,
    execute: (country) => ({
      country: { relation: clamp(country.relation + 4) },
      metrics: { prestige: 2, approval: 1 },
      news: {
        title: `${country.name}文化年开幕`,
        summary: `${country.name}文化展览吸引数十万观众，民间好感度上升。`,
        tone: 'positive',
      },
    }),
  },
  {
    id: 'sanctions',
    label: '实施制裁',
    description: '对目标国实施经济制裁，断绝部分贸易。损害关系但提升国际立场。',
    icon: '🚫',
    kind: 'economic',
    maxRelation: 50,
    politicalCapitalCost: 10,
    cooldown: 12,
    execute: (country) => ({
      country: {
        relation: clamp(country.relation - 15),
        sanctioned: true,
        tradeAgreement: false,
        treaties: country.treaties.filter((t) => t !== '贸易协定'),
      },
      metrics: { economy: -2, treasury: -1, prestige: 3, diplomacy: -2 },
      news: {
        title: `对${country.name}实施制裁`,
        summary: `政府宣布对${country.name}实施全面经济制裁，国际社会反应不一。`,
        tone: 'neutral',
      },
    }),
  },
  {
    id: 'damage_relations',
    label: '破坏关系',
    description: '撤回大使、取消高层互访、制造外交摩擦。大幅降低关系，为后续行动铺路。',
    icon: '🗡️',
    kind: 'covert',
    maxRelation: 80,
    politicalCapitalCost: 6,
    cooldown: 6,
    execute: (country) => ({
      country: { relation: clamp(country.relation - 12) },
      metrics: { diplomacy: -3, prestige: -1 },
      pmStats: { riskIndex: 4 },
      news: {
        title: `与${country.name}关系恶化`,
        summary: `外交部宣布召回驻${country.name}大使，双边关系急剧降温。`,
        tone: 'negative',
      },
    }),
  },
  {
    id: 'espionage',
    label: '派遣间谍',
    description: '渗透对方情报系统，窃取军政机密。被发现将严重损害关系。',
    icon: '🕵️',
    kind: 'covert',
    maxRelation: 70,
    politicalCapitalCost: 12,
    cooldown: 8,
    execute: (country) => {
      // 60% 成功，40% 被发现
      const success = Math.random() < 0.6
      if (success) {
        return {
          country: { espionageLevel: Math.min(3, country.espionageLevel + 1) },
          pmStats: { riskIndex: 3 },
          news: {
            title: `对${country.name}情报渗透加深`,
            summary: `情报部门成功获取${country.name}军政机密，未被发现。`,
            tone: 'positive',
          },
        }
      }
      return {
        country: { relation: clamp(country.relation - 20) },
        pmStats: { riskIndex: 8 },
        metrics: { prestige: -4, diplomacy: -3 },
        news: {
          title: `间谍事件曝光`,
          summary: `我方间谍在${country.name}被捕，对方提出强烈抗议，外交关系急剧恶化。`,
          tone: 'negative',
        },
      }
    },
  },
  {
    id: 'coup_support',
    label: '暗中策动政变',
    description: '支持对方国内反对派，试图颠覆政权。高风险高回报，失败将引发战争可能。',
    icon: '🎭',
    kind: 'covert',
    maxRelation: 40,
    politicalCapitalCost: 20,
    cooldown: 24,
    execute: (country) => {
      const successChance = 0.35 + (country.power < 60 ? 0.15 : 0) + (country.espionageLevel * 0.1)
      const success = Math.random() < successChance
      if (success) {
        return {
          country: {
            relation: clamp(country.relation - 10),
            government: '民主' as const,
            power: Math.max(30, country.power - 20),
            military: Math.max(20, country.military - 15),
          },
          pmStats: { riskIndex: 12 },
          metrics: { prestige: 8, diplomacy: -2 },
          news: {
            title: `${country.name}政权更迭`,
            summary: `${country.name}发生不流血政变，亲我方势力上台。`,
            tone: 'positive',
          },
        }
      }
      // 失败 → 触发战争
      return {
        country: { relation: 0 },
        pmStats: { riskIndex: 20 },
        metrics: { prestige: -10, diplomacy: -8, stability: -5 },
        news: {
          title: `政变失败，${country.name}对我宣战`,
          summary: `策动政变的阴谋败露，${country.name}国民群情激愤，政府正式对我宣战。`,
          tone: 'negative',
        },
        triggerWar: country.id,
      }
    },
  },
  {
    id: 'military_drill',
    label: '联合军演',
    description: '与盟友举行联合军事演习，展示决心，提升军事互信。',
    icon: '⚔️',
    kind: 'military',
    minRelation: 65,
    politicalCapitalCost: 6,
    cooldown: 8,
    execute: (country) => ({
      country: { relation: clamp(country.relation + 3) },
      metrics: { stability: 2, prestige: 2 },
      news: {
        title: `与${country.name}举行联合军演`,
        summary: `两国海空军在边境举行大规模联合演习，向潜在对手发出明确信号。`,
        tone: 'positive',
      },
    }),
  },
  {
    id: 'manufacture_pretext',
    label: '制造战争借口',
    description: '授意情报部门在边境制造事端并栽赃对方，为开战制造"正当性"。需要间谍渗透等级≥2。一旦败露，国际声望扫地。',
    icon: '🎭',
    kind: 'covert',
    maxRelation: 55,
    politicalCapitalCost: 18,
    cooldown: 12,
    execute: (country, state) => {
      if (country.espionageLevel < 2) {
        return {
          country: {},
          news: {
            title: '行动搁置：情报网不足以支撑秘密行动',
            summary: `对${country.name}的渗透等级过低（需≥2），情报局长拒绝执行高风险任务。`,
            tone: 'neutral',
          },
        }
      }
      // 道德越低越果决；败露概率 35%
      const exposed = Math.random() < 0.35
      if (exposed) {
        return {
          country: { relation: Math.max(0, country.relation - 25) },
          pmStats: { riskIndex: 18 },
          metrics: { prestige: -10, diplomacy: -8, approval: -5 },
          news: {
            title: '栽赃行动败露，国际舆论哗然',
            summary: `我方特工在${country.name}边境制造事端时被当场抓获，证据链直指总理府。各国纷纷谴责，反对党要求彻查。`,
            tone: 'negative',
          },
        }
      }
      return {
        country: { relation: Math.max(3, country.relation - 30) },
        pmStats: { riskIndex: 8 },
        metrics: { approval: 3, stability: -2 },
        news: {
          title: `${country.name}边境爆发"武装挑衅"事件`,
          summary: `据官方通报，${country.name}军队在边境制造流血冲突。国内群情激愤，要求政府强硬回应的呼声高涨。（战争借口已就绪：可对${country.name}宣战）`,
          tone: 'neutral',
        },
      }
    },
  },
  {
    id: 'declare_war',
    label: '宣战',
    description: '正式向对方国家宣战。一旦宣战将进入完整战争事件链，胜负由双方真实军事力量（三军状态、将领、军费投入）与总理决策共同决定。',
    icon: '⚔️',
    kind: 'military',
    maxRelation: 45,
    politicalCapitalCost: 25,
    cooldown: 999,
    execute: (country) => ({
      country: { relation: 0, relationLevel: '交战' },
      pmStats: { riskIndex: 25 },
      metrics: { stability: -8, diplomacy: -10, prestige: -5 },
      news: {
        title: `总理宣布对${country.name}开战`,
        summary: `总理在国会发表演说，正式宣布对${country.name}进入战争状态。全国进入战时体制。`,
        tone: 'negative',
      },
      triggerWar: country.id,
    }),
  },
]

/** 战争事件链阶段定义 */
export const WAR_STAGES: WarStage[] = [
  {
    id: 'stage_mobilization',
    title: '战前动员',
    narrative:
      '战争阴云笼罩大地。作为总理，您必须决定国家的动员方式——这将决定整个战争的基调与代价。',
    order: 0,
    options: [
      {
        id: 'full_mob',
        label: '全面动员',
        description: '举国进入战时体制，征召所有适龄青年，工业全面转产军需。',
        icon: '🎖️',
        militaryModifier: 25,
        economyCost: 8,
        approvalChange: -5,
        stabilityChange: 3,
        narrative:
          '工厂日夜轰鸣，年轻人涌向征兵站。全面动员让国家像一台战争机器般运转，但也意味着巨大牺牲。',
        newsTitle: '国家进入全面动员',
        newsSummary: '总理签署全面动员令，所有适龄青年接到征召通知。',
        newsTone: 'neutral',
      },
      {
        id: 'limited_mob',
        label: '有限动员',
        description: '仅动员预备役与部分常备军，保持经济基本运转。',
        icon: '🪖',
        militaryModifier: 12,
        economyCost: 4,
        approvalChange: -2,
        narrative:
          '有限的动员让国家在战争与日常之间寻找平衡。前线兵力尚可，但不足以压倒强敌。',
        newsTitle: '预备役全面征召',
        newsSummary: '政府宣布有限动员，预备役军人开始集结。',
        newsTone: 'neutral',
      },
      {
        id: 'defensive_mob',
        label: '防御部署',
        description: '不主动出击，依托防线进行防御。代价小但难获全胜。',
        icon: '🛡️',
        militaryModifier: 5,
        economyCost: 2,
        approvalChange: 2,
        stabilityChange: 5,
        narrative:
          '军队进入防御阵地，民众相对安心。但若敌军猛攻，防线未必能撑住。',
        newsTitle: '军队进入防御部署',
        newsSummary: '前线部队构筑防御工事，政府强调"以守代攻"。',
        newsTone: 'neutral',
      },
    ],
  },
  {
    id: 'stage_strategy',
    title: '战略选择',
    narrative:
      '战争进入相持阶段。前线指挥官等待您的战略决策——是进攻、消耗，还是固守待变？',
    order: 1,
    options: [
      {
        id: 'offensive',
        label: '主动进攻',
        description: '集中兵力发动大规模进攻，寻求决战。胜则大胜，败则大败。',
        icon: '⚔️',
        militaryModifier: 20,
        economyCost: 6,
        approvalChange: -3,
        prestigeChange: 5,
        narrative:
          '炮火连天，部队如潮水般涌向敌阵。这是豪赌——要么一举击溃敌军，要么损失惨重。',
        newsTitle: '我军发动大规模进攻',
        newsSummary: '前线部队在炮火掩护下发起总攻，战况激烈。',
        newsTone: 'neutral',
      },
      {
        id: 'attrition',
        label: '消耗战',
        description: '利用国力优势拖垮对手，缓慢但稳健。',
        icon: '⏳',
        militaryModifier: 10,
        economyCost: 10,
        approvalChange: -4,
        stabilityChange: -2,
        narrative:
          '战争变成了一场耐力赛。双方在前线僵持，比拼的是后勤与意志。',
        newsTitle: '战争转入消耗阶段',
        newsSummary: '前线进入僵持，双方比拼后勤补给能力。',
        newsTone: 'neutral',
      },
      {
        id: 'defensive_hold',
        label: '固守要塞',
        description: '依托坚固工事消耗敌军，等待国际调停。',
        icon: '🏰',
        militaryModifier: 8,
        economyCost: 3,
        stabilityChange: 3,
        diplomacyChange: 3,
        narrative:
          '部队依托要塞顽强防御，敌军攻势受挫。国际社会开始呼吁停火。',
        newsTitle: '我军固守要塞，敌军攻势受阻',
        newsSummary: '前线防御战取得阶段性成果，国际调停呼声渐起。',
        newsTone: 'positive',
      },
    ],
  },
  {
    id: 'stage_crisis',
    title: '关键时刻',
    narrative:
      '战争进入最关键时刻。情报显示敌军正在集结最后的预备队，您必须做出决断。',
    order: 2,
    options: [
      {
        id: 'escalate',
        label: '升级战争',
        description: '动用一切手段，包括考虑非常规武器。军事收益高但道德代价巨大。',
        icon: '☢️',
        militaryModifier: 30,
        economyCost: 8,
        approvalChange: -10,
        stabilityChange: -8,
        diplomacyChange: -15,
        prestigeChange: -10,
        narrative:
          '最高机密会议在深夜召开。升级意味着跨越某条不可逆的红线，历史将永远铭记这一刻。',
        newsTitle: '战争升级，国际社会震惊',
        newsSummary: '政府暗示将采取"非常规手段"，国际舆论强烈反弹。',
        newsTone: 'negative',
      },
      {
        id: 'negotiate',
        label: '寻求谈判',
        description: '通过中立国斡旋，寻求体面的停战协议。',
        icon: '🕊️',
        militaryModifier: 0,
        economyCost: 2,
        approvalChange: 5,
        diplomacyChange: 8,
        prestigeChange: -3,
        narrative:
          '外交渠道悄然开启。虽然前线将士渴望胜利，但理性的声音主张见好就收。',
        newsTitle: '中立国提出停战斡旋',
        newsSummary: '双方代表在第三国秘密会面，停战谈判有望启动。',
        newsTone: 'positive',
      },
      {
        id: 'hold_ground',
        label: '坚守阵地',
        description: '不冒进也不退让，按现有节奏继续作战。',
        icon: '🎯',
        militaryModifier: 12,
        economyCost: 4,
        approvalChange: 0,
        narrative:
          '指挥部维持既有战略，前线将士继续英勇作战。胜负将由战场本身决定。',
        newsTitle: '前线维持现有战略',
        newsSummary: '我军按既定计划作战，战局仍在掌控之中。',
        newsTone: 'neutral',
      },
    ],
  },
]

/** 计算战争结果
 *  - 玩家军事优势 = warScore + 自身军事实力(估算) - 敌国军事实力
 *  - 按优势分判定胜负等级
 */
export function resolveWar(
  warScore: number,
  enemyMilitary: number,
  playerBaseMilitary = 60,
): { outcome: NonNullable<WarState['outcome']>; epilogue: string } {
  const advantage = warScore + (playerBaseMilitary - enemyMilitary)
  if (advantage >= 30) {
    return {
      outcome: 'victory',
      epilogue:
        '我军取得决定性胜利。敌国政府被迫签署停战协议，承认战败。凯旋的将士受到民众夹道欢迎，总理的威望达到顶峰。然而战争的创伤需要多年才能愈合，国际社会对我国的态度也变得更加复杂。',
    }
  }
  if (advantage >= 10) {
    return {
      outcome: 'pyrrhic',
      epilogue:
        '这是一场惨胜。我军在付出巨大代价后勉强取胜，前线伤亡惨重，国库空虚。胜利的钟声里夹杂着无数家庭的悲泣。历史学家将这场战争称为"得不偿失的胜利"。',
    }
  }
  if (advantage >= -10) {
    return {
      outcome: 'stalemate',
      epilogue:
        '战争以僵局告终。双方在第三国斡旋下签署停战协议，恢复战前状态。没有胜利者，只有满目疮痍的边境与失去亲人的家庭。总理在国内面临"为何而战"的质疑。',
    }
  }
  return {
    outcome: 'defeat',
    epilogue:
      '我军遭遇重大失败。前线崩溃，敌军长驱直入，政府被迫签署屈辱的城下之盟。总理威信扫地，国内爆发大规模抗议，国际地位一落千丈。这场战败将长久地阴影笼罩在国家之上。',
  }
}
