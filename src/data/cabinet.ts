import type { CabinetMember, CabinetBonus, MetricKey } from '@/types/game'

/** 初始内阁成员 */
export const INITIAL_CABINET: CabinetMember[] = [
  {
    id: 'cab_finance',
    name: '陈守正',
    role: '财政部长',
    loyalty: 70,
    specialty: 'treasury',
    advice: '国库储备需时刻关注，量入为出方能长久。',
    dismissible: true,
    bonuses: { approval: 0, treasury: 3, economy: 1, stability: 0, diplomacy: 0, prestige: 0 },
  },
  {
    id: 'cab_foreign',
    name: '林若曦',
    role: '外交部长',
    loyalty: 65,
    specialty: 'diplomacy',
    advice: '广结善友，以理服人，方显大国风范。',
    dismissible: true,
    bonuses: { approval: 0, treasury: 0, economy: 0, stability: 0, diplomacy: 3, prestige: 1 },
  },
  {
    id: 'cab_interior',
    name: '赵铁山',
    role: '内政部长',
    loyalty: 60,
    specialty: 'stability',
    advice: '社会稳定是发展的基石，不可掉以轻心。',
    dismissible: true,
    bonuses: { approval: 0, treasury: 0, economy: 0, stability: 3, diplomacy: 0, prestige: 0 },
  },
  {
    id: 'cab_defense',
    name: '霍长风',
    role: '国防部长',
    loyalty: 68,
    specialty: 'prestige',
    advice: '强军方能安邦，但穷兵黩武亦非良策。',
    dismissible: true,
    bonuses: { approval: 0, treasury: -1, economy: 0, stability: 1, diplomacy: 0, prestige: 3 },
  },
  {
    id: 'cab_economy',
    name: '苏明远',
    role: '经济部长',
    loyalty: 64,
    specialty: 'economy',
    advice: '经济如水，宜疏不宜堵，活力在于流通。',
    dismissible: true,
    bonuses: { approval: 0, treasury: 1, economy: 3, stability: 0, diplomacy: 0, prestige: 0 },
  },
  {
    id: 'cab_secretary',
    name: '白若雪',
    role: '总理府秘书长',
    loyalty: 75,
    specialty: 'approval',
    advice: '民心向背，关乎成败，请总理多体察民意。',
    dismissible: true,
    bonuses: { approval: 3, treasury: 0, economy: 0, stability: 0, diplomacy: 0, prestige: 1 },
  },
]

/** 候补成员类型 */
export interface ReplacementCandidate {
  name: string
  loyalty: number
  specialty: MetricKey
  advice: string
  bonuses: CabinetBonus
}

/** 可任命的候补内阁成员（按职位分组） */
export const REPLACEMENT_CANDIDATES: Record<string, ReplacementCandidate[]> = {
  '财政部长': [
    { name: '王德明', loyalty: 80, specialty: 'treasury', advice: '财政纪律是治国之本。', bonuses: { approval: 0, treasury: 4, economy: 1, stability: 0, diplomacy: 0, prestige: 0 } },
    { name: '张慧芳', loyalty: 60, specialty: 'treasury', advice: '应大胆投资未来，不能只守财。', bonuses: { approval: 0, treasury: 2, economy: 3, stability: 0, diplomacy: 0, prestige: 0 } },
    { name: '李伯安', loyalty: 70, specialty: 'treasury', advice: '减税才能刺激经济活力。', bonuses: { approval: 1, treasury: 1, economy: 3, stability: 0, diplomacy: 0, prestige: 0 } },
  ],
  '外交部长': [
    { name: '周文博', loyalty: 75, specialty: 'diplomacy', advice: '以实力为后盾的外交才有底气。', bonuses: { approval: 0, treasury: 0, economy: 0, stability: 0, diplomacy: 4, prestige: 1 } },
    { name: '吴雅琴', loyalty: 65, specialty: 'diplomacy', advice: '多边外交是我国的最佳策略。', bonuses: { approval: 1, treasury: 0, economy: 0, stability: 0, diplomacy: 3, prestige: 1 } },
    { name: '郑凯文', loyalty: 55, specialty: 'diplomacy', advice: '应该更加独立自主，不必迎合大国。', bonuses: { approval: 2, treasury: 0, economy: 0, stability: -1, diplomacy: 3, prestige: 2 } },
  ],
  '内政部长': [
    { name: '孙志刚', loyalty: 72, specialty: 'stability', advice: '严打犯罪，维护社会秩序。', bonuses: { approval: -1, treasury: 0, economy: 0, stability: 4, diplomacy: 0, prestige: 1 } },
    { name: '钱秀英', loyalty: 68, specialty: 'stability', advice: '民生安定才是社会稳定的根基。', bonuses: { approval: 2, treasury: 0, economy: 0, stability: 3, diplomacy: 0, prestige: 0 } },
    { name: '马天宇', loyalty: 58, specialty: 'stability', advice: '应给予地方更多自治空间。', bonuses: { approval: 1, treasury: 0, economy: 1, stability: 2, diplomacy: 1, prestige: 0 } },
  ],
  '国防部长': [
    { name: '韩卫国', loyalty: 78, specialty: 'prestige', advice: '强军是国运所系。', bonuses: { approval: 0, treasury: -1, economy: 0, stability: 2, diplomacy: -1, prestige: 4 } },
    { name: '杨建华', loyalty: 62, specialty: 'prestige', advice: '国防现代化需要科技支撑。', bonuses: { approval: 0, treasury: -1, economy: 1, stability: 1, diplomacy: 0, prestige: 3 } },
    { name: '刘安民', loyalty: 55, specialty: 'prestige', advice: '军费应适度控制，民生更重要。', bonuses: { approval: 1, treasury: 1, economy: 0, stability: 1, diplomacy: 1, prestige: 1 } },
  ],
  '经济部长': [
    { name: '何志强', loyalty: 70, specialty: 'economy', advice: '制造业是经济命脉。', bonuses: { approval: 0, treasury: 1, economy: 4, stability: 0, diplomacy: 0, prestige: 0 } },
    { name: '徐丽萍', loyalty: 66, specialty: 'economy', advice: '数字经济是未来方向。', bonuses: { approval: 1, treasury: 0, economy: 3, stability: 0, diplomacy: 0, prestige: 1 } },
    { name: '黄伟民', loyalty: 58, specialty: 'economy', advice: '应减少对市场的干预。', bonuses: { approval: -1, treasury: 2, economy: 3, stability: -1, diplomacy: 0, prestige: 0 } },
  ],
  '总理府秘书长': [
    { name: '陈思远', loyalty: 82, specialty: 'approval', advice: '舆论引导至关重要。', bonuses: { approval: 4, treasury: 0, economy: 0, stability: 0, diplomacy: 0, prestige: 1 } },
    { name: '方正直', loyalty: 72, specialty: 'approval', advice: '总理应多下基层，倾听民声。', bonuses: { approval: 3, treasury: 0, economy: 0, stability: 1, diplomacy: 0, prestige: 0 } },
    { name: '叶晓梅', loyalty: 60, specialty: 'approval', advice: '透明施政才能赢得信任。', bonuses: { approval: 2, treasury: 0, economy: 0, stability: 0, diplomacy: 1, prestige: 2 } },
  ],
}

/** 全新部门候选成员（可用于设立新部门时任命） */
export const NEW_DEPARTMENT_CANDIDATES: ReplacementCandidate[] = [
  {
    name: '钱学曾',
    loyalty: 72,
    specialty: 'economy',
    advice: '新兴产业是未来增长引擎，宜早布局。',
    bonuses: { approval: 1, treasury: 1, economy: 3, stability: 0, diplomacy: 0, prestige: 1 },
  },
  {
    name: '沈雅芳',
    loyalty: 68,
    specialty: 'approval',
    advice: '以人为本，新部门应贴近民生需求。',
    bonuses: { approval: 3, treasury: 0, economy: 1, stability: 1, diplomacy: 0, prestige: 0 },
  },
  {
    name: '周大伟',
    loyalty: 65,
    specialty: 'stability',
    advice: '制度建设先行，秩序方能稳固。',
    bonuses: { approval: 0, treasury: 0, economy: 0, stability: 4, diplomacy: 0, prestige: 0 },
  },
  {
    name: '林清和',
    loyalty: 75,
    specialty: 'diplomacy',
    advice: '开放合作，新部门应承担国际协调职能。',
    bonuses: { approval: 0, treasury: 0, economy: 1, stability: 0, diplomacy: 3, prestige: 2 },
  },
  {
    name: '苏婉清',
    loyalty: 70,
    specialty: 'prestige',
    advice: '创新驱动，树立国家科技与文化新形象。',
    bonuses: { approval: 1, treasury: 0, economy: 1, stability: 0, diplomacy: 1, prestige: 3 },
  },
  {
    name: '郭守义',
    loyalty: 60,
    specialty: 'treasury',
    advice: '新部门须严控预算，避免财政负担。',
    bonuses: { approval: 0, treasury: 3, economy: 1, stability: 1, diplomacy: 0, prestige: 0 },
  },
]

/** 预设新部门名称（用户也可自定义） */
export const PRESET_DEPARTMENT_NAMES: string[] = [
  '科技部长',
  '教育部长',
  '环保部长',
  '卫生部长',
  '文化部长',
  '交通部长',
  '能源部长',
  '数字事务部长',
]

/** 随机内阁建议语（按指标） */
export const CABINET_ADVICES: Record<string, string[]> = {
  low_approval: ['民意低迷，建议近期多做顺应民心的决策。', '支持率告急，需尽快推出惠民举措。', '建议总理发表电视讲话，直接回应民众关切。'],
  low_treasury: ['国库吃紧，财政紧缩已势在必行。', '入不敷出，建议暂缓大额开支。', '应考虑开源节流，否则将面临财政危机。'],
  low_economy: ['经济疲软，刺激增长是当务之急。', '市场信心不足，需释放积极信号。', '建议推出产业扶持政策，提振企业信心。'],
  low_stability: ['社会不稳苗头显现，需加强治安与疏导。', '秩序堪忧，建议谨慎处理敏感议题。', '建议增加社区巡逻，强化基层治理。'],
  low_diplomacy: ['外交受挫，宜主动修补关系。', '国际形象受损，需展现合作姿态。', '建议安排出访，修复与主要大国的关系。'],
  low_prestige: ['总理声望下滑，建议多参与国际活动。', '政坛影响力减弱，需巩固党内支持。', '建议推动标志性改革，重塑执政形象。'],
  good: ['形势大好，总理可乘势推进改革。', '百业兴旺，正是布局长远之机。', '当前局势有利，可考虑主动出击。'],
}