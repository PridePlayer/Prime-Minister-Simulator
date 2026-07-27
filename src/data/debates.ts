import type { DebateCard } from '@/types/game'

/** 质询卡牌库 */
export const DEBATE_CARDS: DebateCard[] = [
  {
    id: 'card_counterattack',
    name: '强硬反击',
    description: '以犀利的言辞反击反对党的质疑',
    dependsOn: 'rhetoric',
    cost: 0,
    baseSuccessRate: 60,
    successEffects: {
      approval: 8,
      prestige: 10,
      stability: 3,
    },
    failEffects: {
      approval: -5,
      prestige: -8,
      stability: -3,
    },
    successNews: {
      title: '总理质询中表现强势',
      summary: '总理在议会质询中以犀利言辞反击反对党,赢得支持者喝彩。',
    },
    failNews: {
      title: '总理质询中失言',
      summary: '总理在质询中言辞不当,遭到反对党猛烈抨击。',
    },
  },
  {
    id: 'card_deflect',
    name: '转移话题',
    description: '巧妙地将话题转移到其他议题',
    dependsOn: 'politicalCapital',
    cost: 10,
    baseSuccessRate: 75,
    successEffects: {
      approval: 2,
      prestige: 3,
    },
    failEffects: {
      approval: -3,
      prestige: -5,
    },
    successNews: {
      title: '总理巧妙转移质询焦点',
      summary: '总理成功将话题转移,避免了直接回应敏感问题。',
    },
    failNews: {
      title: '总理转移话题失败',
      summary: '总理试图转移话题但被识破,遭到媒体批评。',
    },
  },
  {
    id: 'card_compromise',
    name: '妥协让步',
    description: '承认部分问题并承诺改进',
    dependsOn: 'partyPrestige',
    cost: 0,
    baseSuccessRate: 80,
    successEffects: {
      approval: 5,
      stability: 5,
      prestige: -3,
    },
    failEffects: {
      approval: -2,
      prestige: -8,
      stability: -2,
    },
    successNews: {
      title: '总理承认问题并承诺改进',
      summary: '总理在质询中展现灵活姿态,承诺解决民众关切。',
    },
    failNews: {
      title: '总理妥协未获认可',
      summary: '总理的让步未能平息质疑,反而被视为软弱。',
    },
  },
  {
    id: 'card_blame_predecessor',
    name: '归咎前任',
    description: '将问题归咎于前任政府的遗留问题',
    dependsOn: 'rhetoric',
    cost: 5,
    baseSuccessRate: 65,
    successEffects: {
      approval: 3,
      prestige: 5,
    },
    failEffects: {
      approval: -8,
      prestige: -10,
    },
    successNews: {
      title: '总理将问题归咎于前任',
      summary: '总理成功将责任推向前任政府,减轻当前压力。',
    },
    failNews: {
      title: '总理推诿责任遭质疑',
      summary: '总理频繁归咎前任的做法引发公众反感。',
    },
  },
  {
    id: 'card_data_dump',
    name: '数据轰炸',
    description: '用大量数据和报告回应质疑',
    dependsOn: 'politicalCapital',
    cost: 8,
    baseSuccessRate: 70,
    successEffects: {
      approval: 4,
      prestige: 6,
      economy: 2,
    },
    failEffects: {
      approval: -4,
      prestige: -6,
    },
    successNews: {
      title: '总理用数据回应质疑',
      summary: '总理展示详实数据,有力回应了反对党的指控。',
    },
    failNews: {
      title: '总理数据遭质疑',
      summary: '总理提供的数据被指存在偏差,引发新的争议。',
    },
  },
  {
    id: 'card_emotional_appeal',
    name: '情感诉求',
    description: '以个人经历和情感打动听众',
    dependsOn: 'rhetoric',
    cost: 0,
    baseSuccessRate: 55,
    successEffects: {
      approval: 10,
      prestige: 5,
      stability: 2,
    },
    failEffects: {
      approval: -6,
      prestige: -8,
    },
    successNews: {
      title: '总理真情流露打动议会',
      summary: '总理以个人经历回应质疑,赢得广泛同情。',
    },
    failNews: {
      title: '总理情感诉求被视为作秀',
      summary: '总理的煽情做法遭到媒体和反对党批评。',
    },
  },
]

/** 质询问题库 */
export const DEBATE_QUESTIONS = [
  {
    id: 'q_economy',
    question: '反对党领袖质疑您的经济政策导致通胀上升,民众生活成本增加,您如何回应?',
    category: '经济',
  },
  {
    id: 'q_stability',
    question: '近期社会治安事件频发,反对党指责政府治理不力,您有何解释?',
    category: '社会',
  },
  {
    id: 'q_diplomacy',
    question: '反对党批评您的外交政策损害了国家利益,您如何辩护?',
    category: '外交',
  },
  {
    id: 'q_treasury',
    question: '反对党指出国库储备持续下降,质疑您的财政管理能力,您如何回应?',
    category: '经济',
  },
  {
    id: 'q_approval',
    question: '民调显示您的支持率持续下滑,反对党要求您解释原因并承诺改进,您如何回应?',
    category: '社会',
  },
  {
    id: 'q_prestige',
    question: '反对党指责您在国际舞台上损害了国家形象,您如何回应?',
    category: '外交',
  },
]
