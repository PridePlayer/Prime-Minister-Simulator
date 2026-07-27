import type { EventOption, GameState } from '@/types/game'

/** 倒计时事件：限时决策，营造紧迫感
 *  触发条件：极端危急状态下的限时抉择
 *  不同于普通紧急事件（进入待办列表），倒计时事件会暂停时间，强迫玩家在限定秒数内决策
 */

export interface CountdownEventDef {
  id: string
  title: string
  description: string
  /** 倒计时总秒数（玩家真实秒数） */
  totalSeconds: number
  /** 触发条件：仅检查指标条件，冷却由 checkCountdownEvent 统一处理 */
  trigger: (state: GameState) => boolean
  /** 选项 */
  options: EventOption[]
  /** 冷却天数：触发后多少天内不再触发 */
  cooldownDays: number
}

export const COUNTDOWN_EVENTS: CountdownEventDef[] = [
  // ===== 议会政变：48 秒决策（模拟 48 小时）=====
  {
    id: 'cd_coup_attempt',
    title: '军事政变！48小时决断',
    description:
      '军方强硬派已包围总统府与议会大厦，要求您立即交出权力。情报显示他们已控制国家电视台。您必须在「48小时」内做出抉择——每个选项的代价与收益截然不同。',
    totalSeconds: 48,
    trigger: (s) =>
      s.metrics.stability < 18 &&
      s.metrics.prestige < 25 &&
      s.parliament.confidence < 30 &&
      s.turn > 10,
    cooldownDays: 240,
    options: [
      {
        id: 'resist',
        label: '调集忠诚部队反击',
        description: '动员仍忠于政府的部队，硬碰硬',
        effects: { stability: -10, treasury: -15, approval: 8, prestige: 12, diplomacy: -4 },
        newsTitle: '总理调集部队反击政变',
        newsSummary: '首都街头发生激烈交火，局势极度危险。',
        tone: 'negative',
      },
      {
        id: 'negotiate',
        label: '与政变将领谈判',
        description: '许以政治改革换取和平交权',
        effects: { stability: 6, approval: -8, prestige: -15, diplomacy: 2 },
        newsTitle: '总理与政变将领达成协议',
        newsSummary: '政变将领同意停火，但总理被迫让步。',
        tone: 'neutral',
      },
      {
        id: 'flee',
        label: '紧急出逃海外',
        description: '保命为上，流亡他国',
        effects: { stability: -20, approval: -25, prestige: -40, diplomacy: -10 },
        newsTitle: '总理流亡海外，政府瘫痪',
        newsSummary: '总理乘专机紧急离境，国家陷入权力真空。',
        tone: 'negative',
      },
      {
        id: 'surrender',
        label: '主动交权，避免内战',
        description: '体面退场，保全国家',
        effects: { stability: 12, approval: -10, prestige: -25, diplomacy: 4 },
        newsTitle: '总理宣布辞职，政权和平交接',
        newsSummary: '总理为避免内战主动交权，国际社会表示赞赏。',
        tone: 'neutral',
      },
    ],
  },

  // ===== 恐怖袭击：60 秒决策（模拟 60 分钟黄金时间）=====
  {
    id: 'cd_terror_attack',
    title: '恐怖袭击！60分钟黄金救援',
    description:
      '情报部门紧急报告：一伙武装分子劫持了中央火车站，扣押逾 300 名人质。他们要求释放被关押的同伴，否则每 15 分钟处决一名人质。特种部队已就位，等待您的命令。',
    totalSeconds: 60,
    trigger: (s) =>
      s.metrics.stability < 35 &&
      s.metrics.approval < 30 &&
      s.turn > 6,
    cooldownDays: 300,
    options: [
      {
        id: 'assault',
        label: '命令特种部队强攻',
        description: '速战速决，但人质伤亡风险高',
        effects: { stability: 4, approval: -6, prestige: 8, treasury: -4 },
        newsTitle: '特种部队强攻火车站',
        newsSummary: '行动结束，部分人质获救，但仍有伤亡。',
        tone: 'neutral',
      },
      {
        id: 'negotiate',
        label: '派谈判专家斡旋',
        description: '拖延时间，争取和平解决',
        effects: { stability: -3, approval: 5, prestige: -4, treasury: -6 },
        newsTitle: '政府派谈判专家与劫匪斡旋',
        newsSummary: '谈判持续数小时，部分人质被释放。',
        tone: 'neutral',
      },
      {
        id: 'concede',
        label: '答应劫匪要求，释放囚犯',
        description: '保住所有人质，但损害法治',
        effects: { stability: 8, approval: 6, prestige: -10, diplomacy: -3 },
        newsTitle: '政府妥协，释放被关押的武装分子',
        newsSummary: '所有人质获释，但政府被批软弱。',
        tone: 'negative',
      },
    ],
  },

  // ===== 外交最后通牒：90 秒决策（模拟 90 分钟）=====
  {
    id: 'cd_ultimatum',
    title: '大国最后通牒：90分钟回应',
    description:
      '一个大国通过秘密渠道向我国发出最后通牒：除非在 90 分钟内同意其全部条件（包括外交让步、资源特许与军事基地），否则将对我国实施毁灭性打击。情报显示其舰队已进入战备状态。',
    totalSeconds: 90,
    trigger: (s) =>
      s.metrics.diplomacy < 20 &&
      s.metrics.stability < 40 &&
      s.turn > 14,
    cooldownDays: 360,
    options: [
      {
        id: 'submit',
        label: '全盘接受条件',
        description: '避免战争，但国家尊严尽失',
        effects: { stability: 8, diplomacy: 10, approval: -15, prestige: -20, treasury: -10 },
        newsTitle: '政府接受大国最后通牒',
        newsSummary: '危机解除，但民众愤怒抗议政府的软弱。',
        tone: 'negative',
      },
      {
        id: 'partial',
        label: '部分接受，拖延谈判',
        description: '外交辞令，争取时间',
        effects: { stability: -4, diplomacy: -2, approval: 2, prestige: 4 },
        newsTitle: '政府对最后通牒给出折中回应',
        newsSummary: '大国表示不满，但同意继续谈判。',
        tone: 'neutral',
      },
      {
        id: 'defy',
        label: '强硬拒绝，全国进入战备',
        description: '硬刚到底，准备应战',
        effects: { stability: -12, diplomacy: -15, approval: 12, prestige: 8, treasury: -8 },
        newsTitle: '总理强硬拒绝大国最后通牒',
        newsSummary: '民众群情激昂，但战争阴云密布。',
        tone: 'negative',
      },
      {
        id: 'escalate',
        label: '向国际社会公开通牒内容',
        description: '舆论战，将大国置于道义被告席',
        effects: { stability: -2, diplomacy: -5, approval: 8, prestige: 6 },
        newsTitle: '政府公开大国最后通牒，引发国际哗然',
        newsSummary: '多国谴责大国行径，但大国矢口否认。',
        tone: 'neutral',
      },
    ],
  },

  // ===== 财政崩盘：30 秒决策（模拟 30 小时）=====
  {
    id: 'cd_bank_run',
    title: '银行挤兑潮！30小时救市',
    description:
      '全国主要银行出现恐慌性挤兑，ATM 现金告罄，民众排队到街角。央行行长警告：若 30 小时内不能稳定信心，金融系统将全面崩溃。每分钟都在流失国库储备。',
    totalSeconds: 30,
    trigger: (s) =>
      s.metrics.treasury < 15 &&
      s.metrics.economy < 30 &&
      s.turn > 8,
    cooldownDays: 240,
    options: [
      {
        id: 'freeze',
        label: '紧急冻结所有存款',
        description: '止血，但民怨沸腾',
        effects: { treasury: 15, economy: -10, approval: -20, stability: -8 },
        newsTitle: '政府宣布紧急冻结银行存款',
        newsSummary: '挤兑停止，但民众愤怒，多家银行遭破坏。',
        tone: 'negative',
      },
      {
        id: 'bailout',
        label: '动用外汇储备全力救市',
        description: '保住银行，但耗尽家底',
        effects: { treasury: -10, economy: 8, approval: 10, stability: 4, diplomacy: -2 },
        newsTitle: '央行动用外汇储备救市',
        newsSummary: '挤兑潮平息，民众信心部分恢复。',
        tone: 'positive',
      },
      {
        id: 'guarantee',
        label: '宣布无限额存款担保',
        description: '信用背书，无实际注资',
        effects: { treasury: -4, economy: 4, approval: 6, stability: 2 },
        newsTitle: '政府宣布无限额存款担保',
        newsSummary: '民众信心回升，挤兑减缓，但市场仍观望。',
        tone: 'neutral',
      },
    ],
  },

  // ===== 总统罢免：45 秒决策（模拟 45 小时宪法危机）=====
  {
    id: 'cd_president_dismiss',
    title: '总统动用罢免权！45小时宪法危机',
    description:
      '异党总统突然宣布动用宪法第 47 条，罢免您的总理职务，并任命临时总理。议会一片哗然，街头出现支持与反对的两派群众对峙。宪法法院表示需 45 小时做出裁决。您必须决定如何应对。',
    totalSeconds: 45,
    trigger: (s) =>
      s.president.sameParty === false &&
      s.president.relation < 25 &&
      s.metrics.prestige < 35 &&
      s.turn > 12,
    cooldownDays: 300,
    options: [
      {
        id: 'defy',
        label: '拒绝接受，号召议会与民众抵制',
        description: '硬抗总统令，赌民意支持',
        effects: { stability: -10, approval: 8, prestige: 5, diplomacy: -3 },
        newsTitle: '总理拒绝接受总统罢免令',
        newsSummary: '议会与街头分裂为两派，宪法危机加剧。',
        tone: 'negative',
      },
      {
        id: 'court',
        label: '诉诸宪法法院裁决',
        description: '走法律程序，等待裁决',
        effects: { stability: -2, approval: 2, prestige: 0, diplomacy: 2 },
        newsTitle: '总理将罢免案提交宪法法院',
        newsSummary: '宪法法院承诺 45 小时内做出裁决。',
        tone: 'neutral',
      },
      {
        id: 'compromise',
        label: '与总统秘密谈判，主动辞职换条件',
        description: '体面退场，换取政治遗产',
        effects: { stability: 6, approval: -8, prestige: -10, diplomacy: 4 },
        newsTitle: '总理与总统达成秘密协议，主动辞职',
        newsSummary: '宪法危机和平解决，但政治版图重塑。',
        tone: 'neutral',
      },
      {
        id: 'military',
        label: '寻求军方支持，反制总统',
        description: '军事背书，强行留任',
        effects: { stability: -15, approval: -10, prestige: 10, diplomacy: -8 },
        newsTitle: '总理获军方表态支持，拒绝下台',
        newsSummary: '军方介入政治，国际社会高度关注。',
        tone: 'negative',
      },
    ],
  },
]

/** 检查是否触发倒计时事件
 *  返回第一个满足触发条件且不在冷却期内的事件
 */
export function checkCountdownEvent(state: GameState): CountdownEventDef | null {
  for (const event of COUNTDOWN_EVENTS) {
    if (!event.trigger(state)) continue

    // 检查冷却：通过 triggeredEmergencyIds 中以 cd_<id>_day<N> 格式存储的记录判断
    const lastTriggerDay = state.triggeredEmergencyIds
      .filter((id) => id.startsWith(`cd_${event.id}_day`))
      .map((id) => {
        const match = id.match(/_day(\d+)$/)
        return match ? parseInt(match[1], 10) : 0
      })
      .sort((a, b) => b - a)[0]

    if (lastTriggerDay && state.totalDays - lastTriggerDay < event.cooldownDays) {
      continue
    }

    return event
  }
  return null
}

