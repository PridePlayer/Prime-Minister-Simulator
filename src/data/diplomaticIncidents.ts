import type { EventOption, ForeignCountry, GameState, PendingEvent, WarState } from '@/types/game'
import { clamp } from '@/engine/metrics'
import { deriveRelationLevel, WAR_STAGES } from '@/data/diplomacy'

/**
 * 外交动态化引擎
 * 让关系值"活"起来：低关系自然恶化、边境冲突事件、敌国在实力占优时主动宣战
 * —— 解决"外交存在感弱、永远无法宣战"的核心问题
 */

/** 边境/外交危机事件模板（按关系区间触发） */
interface IncidentTemplate {
  id: string
  title: (c: ForeignCountry) => string
  description: (c: ForeignCountry) => string
  options: (c: ForeignCountry) => EventOption[]
}

const INCIDENTS: IncidentTemplate[] = [
  {
    id: 'border_skirmish',
    title: (c) => `${c.name}边境武装摩擦`,
    description: (c) =>
      `两国边防部队在争议地带发生交火，双方互指对方率先开枪。${c.name}国内民族主义情绪高涨，其外交部发表措辞强硬的声明，要求我方"立即后撤并道歉"。前线指挥官请求指示。`,
    options: (c) => [
      {
        id: 'deescalate',
        label: '后撤部队，提议联合调查',
        description: '克制忍让，以外交途径降温',
        effects: { stability: -1, prestige: -2 },
        newsTitle: `我方从${c.name}争议边境后撤`,
        newsSummary: '政府呼吁双方保持克制，提议成立联合调查委员会。',
        tone: 'neutral',
        countryEffects: [{ countryId: c.id, relationDelta: 6 }],
      },
      {
        id: 'stand_firm',
        label: '寸土不让，向前线增兵',
        description: '强硬对峙，国内叫好但关系恶化',
        effects: { approval: 3, stability: -2, diplomacy: -3 },
        newsTitle: `我军增援${c.name}边境前线`,
        newsSummary: '国防部宣布向争议地区增派机械化部队，局势剑拔弩张。',
        tone: 'negative',
        countryEffects: [{ countryId: c.id, relationDelta: -12 }],
      },
      {
        id: 'protest',
        label: '外交抗议并要求赔偿',
        description: '走法律与舆论路线',
        effects: { prestige: 1, diplomacy: -1 },
        newsTitle: `我方就边境冲突向${c.name}提出严正抗议`,
        newsSummary: '外交部召见对方大使，要求彻查事件并赔偿损失。',
        tone: 'neutral',
        countryEffects: [{ countryId: c.id, relationDelta: -4 }],
      },
    ],
  },
  {
    id: 'fishing_boat',
    title: (c) => `${c.name}扣押我方渔船`,
    description: (c) =>
      `${c.name}海警以"非法越界捕捞"为由扣押我方三艘渔船及二十余名船员。船员家属在码头哭诉求助，媒体连篇累牍报道，要求政府"有所作为"。`,
    options: (c) => [
      {
        id: 'negotiate',
        label: '低调谈判，花钱消灾',
        description: '缴纳罚款换回船员',
        effects: { treasury: -2, approval: -2 },
        newsTitle: `被扣船员经谈判获释`,
        newsSummary: '政府缴纳"保证金"后，船员平安回国，但舆论批评政府软弱。',
        tone: 'neutral',
        countryEffects: [{ countryId: c.id, relationDelta: 4 }],
      },
      {
        id: 'coast_guard',
        label: '派海警护航强硬反制',
        description: '展示决心，风险是摩擦升级',
        effects: { approval: 4, diplomacy: -3, stability: -1 },
        newsTitle: `我方海警船队开赴争议海域`,
        newsSummary: '海军海警联合巡航，与对方舰艇形成对峙。',
        tone: 'neutral',
        countryEffects: [{ countryId: c.id, relationDelta: -8 }],
      },
    ],
  },
  {
    id: 'spy_scandal',
    title: (c) => `${c.name}驱逐我方外交官`,
    description: (c) =>
      `${c.name}反间谍部门宣布破获"我方间谍网"，驱逐三名我方外交官并召回国大使。国际媒体争相报道，我方情报部门否认指控但拒绝透露细节。`,
    options: (c) => [
      {
        id: 'retaliate',
        label: '对等驱逐报复',
        description: '以外交惯例回应',
        effects: { prestige: 2, diplomacy: -2 },
        newsTitle: `我方对等驱逐${c.name}外交官`,
        newsSummary: '外交部宣布三名对方外交官为"不受欢迎的人"。',
        tone: 'neutral',
        countryEffects: [{ countryId: c.id, relationDelta: -6 }],
      },
      {
        id: 'downplay',
        label: '冷处理，秘密渠道沟通',
        description: '避免事态扩大',
        effects: { prestige: -2 },
        newsTitle: `政府低调处理${c.name}外交风波`,
        newsSummary: '官方仅表示"遗憾"，反对党批评政府"丧权辱国"。',
        tone: 'neutral',
        countryEffects: [{ countryId: c.id, relationDelta: 3 }],
      },
    ],
  },
  {
    id: 'military_flyover',
    title: (c) => `${c.name}军机抵近侦察`,
    description: (c) =>
      `${c.name}多架军机连续三日抵近我方领空侦察，空军多次紧急升空拦截。国防部研判这是在试探我方防空反应速度，军方将领主张"予以警告射击"。`,
    options: (c) => [
      {
        id: 'intercept_only',
        label: '仅伴飞监视，保持克制',
        description: '专业处置，不开第一枪',
        effects: { stability: 1 },
        newsTitle: '我方战机专业拦截抵近侦察机',
        newsSummary: '国防部公布拦截影像，强调"全程专业克制"。',
        tone: 'neutral',
        countryEffects: [{ countryId: c.id, relationDelta: -3 }],
      },
      {
        id: 'warning_shot',
        label: '警告射击，划出红线',
        description: '强硬驱离，可能引发危机',
        effects: { approval: 3, diplomacy: -4, stability: -2 },
        newsTitle: `我军向${c.name}侦察机鸣枪示警`,
        newsSummary: '对方强烈抗议"危险挑衅"，两国战机在空中激烈对峙。',
        tone: 'negative',
        countryEffects: [{ countryId: c.id, relationDelta: -10 }],
      },
    ],
  },
  {
    id: 'trade_dispute',
    title: (c) => `${c.name}挑起贸易争端`,
    description: (c) =>
      `${c.name}突然对我方出口商品加征惩罚性关税，并指控我方"倾销"。出口企业损失惨重，商界联合会紧急约见贸易部长，要求政府反制。`,
    options: (c) => [
      {
        id: 'counter_tariff',
        label: '对等加征报复性关税',
        description: '贸易战开打，两败俱伤',
        effects: { economy: -3, treasury: 2, approval: 2 },
        newsTitle: `我方对${c.name}商品加征报复性关税`,
        newsSummary: '贸易战正式开打，两国商会哀鸿遍野。',
        tone: 'negative',
        countryEffects: [{ countryId: c.id, relationDelta: -8, liftTradeAgreement: true }],
      },
      {
        id: 'wto_complaint',
        label: '诉诸国际仲裁',
        description: '程序漫长但占理',
        effects: { diplomacy: 2, economy: -1 },
        newsTitle: `我方就关税问题提起国际仲裁`,
        newsSummary: '国际贸易组织受理我方申诉，裁决预计需数月。',
        tone: 'neutral',
        countryEffects: [{ countryId: c.id, relationDelta: 2 }],
      },
      {
        id: 'concede',
        label: '谈判让步，开放部分市场',
        description: '以市场换和平',
        effects: { economy: -2, approval: -2, diplomacy: 2 },
        newsTitle: `我方与${c.name}达成贸易和解`,
        newsSummary: '政府同意扩大对方商品市场准入，国内企业界颇有微词。',
        tone: 'neutral',
        countryEffects: [{ countryId: c.id, relationDelta: 6 }],
      },
    ],
  },
  {
    id: 'cyber_attack',
    title: (c) => `针对我方的大规模网络攻击`,
    description: (c) =>
      `国家电网与银行系统遭到协同网络攻击，多地短暂停电。网络安全部门溯源后发现攻击来自${c.name}境内的"爱国黑客组织"，证据指向其军方情报部门的暗中支持。`,
    options: (c) => [
      {
        id: 'public_accuse',
        label: '公开指控并提交证据',
        description: '占领舆论高地',
        effects: { diplomacy: -2, prestige: 2, stability: -2 },
        newsTitle: `我方公开指控${c.name}发动网络攻击`,
        newsSummary: '网络安全部门公布溯源报告，多国表示"严重关切"。',
        tone: 'negative',
        countryEffects: [{ countryId: c.id, relationDelta: -7 }],
      },
      {
        id: 'covert_response',
        label: '以牙还牙，秘密网络反击',
        description: '情报战升级',
        effects: { stability: -1 },
        pmStatEffects: { riskIndex: 8 },
        newsTitle: '我方关键基础设施完成安全加固',
        newsSummary: '官方低调处理攻击事件，知情人士透露"反击已在暗中进行"。',
        tone: 'neutral',
        countryEffects: [{ countryId: c.id, relationDelta: -4 }],
      },
      {
        id: 'reinforce',
        label: '加强防御，不作声张',
        description: '闷声补墙',
        effects: { treasury: -3, stability: 1 },
        newsTitle: '国家网络安全等级全面提升',
        newsSummary: '政府拨款升级关键基础设施网络防御体系。',
        tone: 'neutral',
      },
    ],
  },
]

/**
 * 每月外交动态结算（在 advanceMonth 中调用）：
 * 1. 关系自然漂移：敌对且不沟通的持续恶化；友好+贸易缓慢升温
 * 2. 低关系国家概率触发危机事件（进入事件收纳篮）
 * 3. 敌对且军力占优的国家可能主动对我宣战
 */
export function runMonthlyDiplomacy(
  state: GameState,
  playerMilitaryStrength: number,
): {
  countries: ForeignCountry[]
  newPendingEvent: PendingEvent | null
  newWar: WarState | null
  warNews: string | null
} {
  let countries = state.countries.map((c) => {
    if (c.relationLevel === '交战') return c
    let rel = c.relation
    // 恶化漂移：关系越差越难维持（边境摩擦、民意对立）
    if (rel < 20) rel -= 1.2
    else if (rel < 35) rel -= 0.6
    else if (rel > 60 && c.tradeAgreement) rel += 0.5
    // 制裁中的国家持续恶化
    if (c.sanctioned) rel -= 0.8
    rel = clamp(rel)
    return { ...c, relation: rel, relationLevel: deriveRelationLevel(rel) }
  })

  // 危机事件：对关系 < 38 的国家，每月约 18% 概率触发一次
  let newPendingEvent: PendingEvent | null = null
  const hostile = countries.filter((c) => c.relation < 38 && c.relationLevel !== '交战')
  if (hostile.length > 0 && state.pendingEvents.length < 4 && Math.random() < 0.18) {
    const target = hostile[Math.floor(Math.random() * hostile.length)]
    // 边境摩擦仅邻国触发；其他事件通用
    const pool = INCIDENTS.filter((t) => (t.id === 'border_skirmish' ? target.isNeighbor : true))
    const tpl = pool[Math.floor(Math.random() * pool.length)]
    newPendingEvent = {
      instanceId: `dipincident_${tpl.id}_${target.id}_${state.totalDays}`,
      eventId: `dipincident_${tpl.id}`,
      title: tpl.title(target),
      description: tpl.description(target),
      category: '外交',
      options: tpl.options(target),
      isEmergency: false,
      triggeredDay: state.totalDays,
      deadlineDay: state.totalDays + 21,
      defaultOptionId: tpl.options(target)[0].id,
    }
  }

  // 敌国主动宣战：关系 ≤ 10 且军力明显占优时，每月 22% 概率
  let newWar: WarState | null = null
  let warNews: string | null = null
  if (!state.activeWar) {
    const aggressor = countries.find(
      (c) =>
        c.relation <= 10 &&
        c.relationLevel !== '交战' &&
        c.military > playerMilitaryStrength * 1.05 &&
        Math.random() < 0.22,
    )
    if (aggressor) {
      countries = countries.map((c) =>
        c.id === aggressor.id ? { ...c, relation: 0, relationLevel: '交战' as const } : c,
      )
      const firstStage = WAR_STAGES[0]
      newWar = {
        id: `war_incoming_${state.totalDays}`,
        enemyCountryId: aggressor.id,
        enemyCountryName: aggressor.name,
        enemyMilitary: aggressor.military,
        warScore: -5, // 被突袭方开局劣势
        currentStageId: firstStage.id,
        currentOrder: firstStage.order,
        completedStages: [],
        chosenOptions: [],
        startTurn: state.turn,
        ended: false,
      }
      warNews = aggressor.name
    }
  }

  return { countries, newPendingEvent, newWar, warNews }
}
