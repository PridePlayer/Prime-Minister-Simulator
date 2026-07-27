import type { CabinetChatOption } from '@/types/game'

/** 内阁部长聊天模板
 *  部长会定期发来消息（请求/要求/汇报），玩家有多个回应选项
 *  选项有对应后果（指标变化、忠诚度变化、新闻）
 */

export interface CabinetChatTemplate {
  /** 适用职位（匹配 cabinet.role）；'any' 表示任意部长 */
  role: string | 'any'
  /** 适用专长（匹配 cabinet.specialty），可选 */
  specialty?: string
  /** 部长发来的消息文本（含 {name} 占位符为部长名） */
  text: string
  /** 总理可选的回应选项 */
  options: CabinetChatOption[]
  /** 触发条件：当前指标低于阈值时优先选取 */
  trigger?: {
    metric: 'approval' | 'treasury' | 'economy' | 'stability' | 'diplomacy' | 'prestige'
    below?: number
    above?: number
  }
  /** 权重 */
  weight?: number
}

export const CABINET_CHAT_TEMPLATES: CabinetChatTemplate[] = [
  // ===== 财政部长 =====
  {
    role: '财政部长',
    text: '总理，国库连续数月入不敷出，我建议立即启动财政紧缩方案，削减非必要开支 15%。当然，这会影响一些惠民项目，您看怎么办？',
    trigger: { metric: 'treasury', below: 40 },
    options: [
      {
        id: 'approve_austerity',
        label: '批准紧缩方案',
        description: '削减开支，国库回血，但民意受损',
        effects: { treasury: 8, approval: -5, stability: -2 },
        reply: '批准。立即执行紧缩方案，国库不能再透支了。',
        loyaltyChange: 3,
        newsTitle: '政府启动财政紧缩',
        newsSummary: '财政部宣布削减 15% 非必要开支，民间有异议。',
        newsTone: 'neutral',
      },
      {
        id: 'partial',
        label: '只削减行政开支，保留民生',
        description: '温和方案，效果有限',
        effects: { treasury: 3, approval: -1 },
        reply: '只削减行政开支，民生项目不动。再想办法开源。',
        loyaltyChange: 1,
        newsTitle: '政府温和削减行政开支',
        newsSummary: '财政部小幅削减行政开支，保留民生投入。',
        newsTone: 'neutral',
      },
      {
        id: 'reject',
        label: '否决，要求另寻开源之策',
        description: '部长会失望',
        effects: { approval: 2 },
        reply: '紧缩会动摇执政根基。你回去想想怎么增加税收吧。',
        loyaltyChange: -4,
        newsTitle: '总理否决财政紧缩方案',
        newsSummary: '财政部紧缩方案被总理否决，部长面露难色。',
        newsTone: 'negative',
      },
      {
        id: 'dismiss',
        label: '【开除】认为他无能',
        description: '立即解除该部长职务，从候补名单选新人',
        effects: { stability: -3, prestige: 2 },
        reply: '既然你想不出办法，那就让能想出办法的人来当这个部长。',
        dismiss: true,
        loyaltyChange: -100,
        newsTitle: '财政部长被解职',
        newsSummary: '总理以"施政不力"为由解除财政部长职务。',
        newsTone: 'negative',
      },
    ],
  },
  {
    role: '财政部长',
    text: '总理，本财年税收超出预期 12%，我建议将超额部分用于偿还国债，长期看有利于国家信用。但也有人主张用于民生投入，您的意见？',
    trigger: { metric: 'treasury', above: 60 },
    options: [
      {
        id: 'repay_debt',
        label: '偿还国债，强化信用',
        effects: { treasury: -5, economy: 3, prestige: 2 },
        reply: '偿还国债，国家信用比短期民意更重要。',
        loyaltyChange: 2,
        newsTitle: '政府动用超额税收偿还国债',
        newsSummary: '财政部宣布偿还部分国债，国际评级机构表示欢迎。',
        newsTone: 'positive',
      },
      {
        id: 'invest_people',
        label: '投入民生项目',
        effects: { treasury: -3, approval: 5, stability: 2 },
        reply: '取之于民用之于民，超额税收投入民生项目。',
        loyaltyChange: 1,
        newsTitle: '政府将超额税收投入民生',
        newsSummary: '财政部宣布追加民生预算，民众欢迎。',
        newsTone: 'positive',
      },
      {
        id: 'reserve',
        label: '存入应急储备',
        effects: { treasury: 4 },
        reply: '先存起来，以备不时之需。',
        loyaltyChange: 0,
      },
    ],
  },
  // ===== 外交部长 =====
  {
    role: '外交部长',
    text: '总理，邻国邀请我国参加区域峰会，但议程中包含一项对我国不利的贸易条款。我建议有条件参加，您的指示？',
    options: [
      {
        id: 'attend_conditional',
        label: '有条件参加',
        description: '尝试修改条款',
        effects: { diplomacy: 3, prestige: 1 },
        reply: '参加，但明确表态：条款不修改就不签署联合声明。',
        loyaltyChange: 2,
        newsTitle: '总理有条件出席区域峰会',
        newsSummary: '我国代表团在峰会上坚持立场，赢得谈判空间。',
        newsTone: 'positive',
      },
      {
        id: 'attend',
        label: '正常参加',
        description: '维持外交礼节',
        effects: { diplomacy: 1, approval: 1 },
        reply: '正常参加，先看看再说。',
        loyaltyChange: 0,
      },
      {
        id: 'decline',
        label: '拒绝参加',
        description: '表达抗议',
        effects: { diplomacy: -5, approval: 3, prestige: -2 },
        reply: '拒绝参加。这种议程我们不能背书。',
        loyaltyChange: -2,
        newsTitle: '我国拒绝参加区域峰会',
        newsSummary: '外交部宣布不参加峰会，邻国表示遗憾。',
        newsTone: 'negative',
      },
      {
        id: 'dismiss',
        label: '【开除】认为他外交软弱',
        description: '立即解除该部长职务',
        effects: { stability: -2, prestige: 1, diplomacy: -3 },
        reply: '这种外交水平，我换个更硬的人来。',
        dismiss: true,
        loyaltyChange: -100,
        newsTitle: '外交部长被解职',
        newsSummary: '总理对外交工作不满，解除外交部长职务。',
        newsTone: 'negative',
      },
    ],
  },
  // ===== 内政部长 =====
  {
    role: '内政部长',
    text: '总理，多个城市出现抗议活动，要求降低物价。我建议启动临时价格管制，但经济部门警告这会扭曲市场。您怎么看？',
    trigger: { metric: 'stability', below: 45 },
    options: [
      {
        id: 'price_control',
        label: '启动价格管制',
        description: '稳定民意但伤经济',
        effects: { stability: 4, approval: 3, economy: -3 },
        reply: '启动价格管制，先稳住局面再说。',
        loyaltyChange: 2,
        newsTitle: '政府启动临时价格管制',
        newsSummary: '内政部宣布对民生必需品实施价格管制。',
        newsTone: 'neutral',
      },
      {
        id: 'subsidy',
        label: '发放民生补贴',
        description: '花钱消灾',
        effects: { treasury: -4, approval: 4, stability: 2 },
        reply: '不发限价令，发补贴。让老百姓有钱买东西。',
        loyaltyChange: 1,
        newsTitle: '政府发放民生补贴',
        newsSummary: '财政部配合内政部发放民生补贴，缓解物价压力。',
        newsTone: 'positive',
      },
      {
        id: 'suppress',
        label: '强硬驱散抗议',
        description: '快速止乱但留隐患',
        effects: { stability: 2, approval: -6, prestige: -3 },
        reply: '驱散抗议，恢复秩序。',
        loyaltyChange: -3,
        newsTitle: '政府强硬驱散抗议',
        newsSummary: '内政部出动警力驱散多地抗议，国际媒体关注。',
        newsTone: 'negative',
      },
      {
        id: 'dismiss',
        label: '【开除】认为他维稳不力',
        description: '立即解除该部长职务',
        effects: { stability: -4, prestige: 1 },
        reply: '维稳是你本职工作，做不好就换人。',
        dismiss: true,
        loyaltyChange: -100,
        newsTitle: '内政部长被解职',
        newsSummary: '总理以内政部长维稳不力为由将其解职。',
        newsTone: 'negative',
      },
    ],
  },
  // ===== 国防部长 =====
  {
    role: '国防部长',
    text: '总理，军方建议明年将军费提高 8%，用于装备现代化。但财政部门表示吃紧。我支持军方提议，请总理定夺。',
    options: [
      {
        id: 'approve_military',
        label: '批准增加军费',
        effects: { treasury: -5, prestige: 3, stability: 1, diplomacy: -1 },
        reply: '批准。国防现代化不能等。',
        loyaltyChange: 3,
        newsTitle: '政府增加军费预算',
        newsSummary: '国防部获准明年军费增长 8%。',
        newsTone: 'neutral',
      },
      {
        id: 'compromise_military',
        label: '增加 4%，分两年执行',
        description: '折中方案',
        effects: { treasury: -3, prestige: 1 },
        reply: '涨 4%，分两年执行，给财政留余地。',
        loyaltyChange: 0,
      },
      {
        id: 'reject_military',
        label: '否决，优先民生',
        effects: { treasury: 2, approval: 2, prestige: -2 },
        reply: '否决。当下民生比军费更紧迫。',
        loyaltyChange: -4,
        newsTitle: '总理否决军费增长方案',
        newsSummary: '国防部提议被否决，军方高层表示遗憾。',
        newsTone: 'negative',
      },
      {
        id: 'dismiss',
        label: '【开除】认为他偏向军方',
        description: '立即解除该部长职务',
        effects: { stability: -2, prestige: -2 },
        reply: '国防部长应该听总理的，不是听军方的。换人。',
        dismiss: true,
        loyaltyChange: -100,
        newsTitle: '国防部长被解职',
        newsSummary: '总理以"立场偏差"为由解除国防部长职务。',
        newsTone: 'negative',
      },
    ],
  },
  // ===== 经济部长 =====
  {
    role: '经济部长',
    text: '总理，本季度经济数据不佳，工业产值连续两月下滑。我建议推出产业刺激计划，但需要国库投入。或者，我们可以减少对市场的干预。',
    trigger: { metric: 'economy', below: 45 },
    options: [
      {
        id: 'stimulus',
        label: '推出产业刺激计划',
        effects: { treasury: -6, economy: 5, approval: 2 },
        reply: '推出刺激计划，但要确保资金用在刀刃上。',
        loyaltyChange: 2,
        newsTitle: '政府推出产业刺激计划',
        newsSummary: '经济部宣布多项产业扶持政策。',
        newsTone: 'positive',
      },
      {
        id: 'deregulation',
        label: '减少市场干预',
        description: '长期看好但短期波动',
        effects: { economy: 3, stability: -2, approval: -1 },
        reply: '减少干预，让市场自己调节。',
        loyaltyChange: 0,
        newsTitle: '政府减少市场干预',
        newsSummary: '经济部宣布简化多项行政审批。',
        newsTone: 'neutral',
      },
      {
        id: 'do_nothing',
        label: '观察一段时间',
        description: '不作为',
        effects: { economy: -2 },
        reply: '再观察一个月，等数据更清晰再说。',
        loyaltyChange: -2,
      },
      {
        id: 'dismiss',
        label: '【开除】认为他经济无能',
        description: '立即解除该部长职务',
        effects: { stability: -2, economy: -1, prestige: 1 },
        reply: '经济搞成这样，我换个懂行的人来。',
        dismiss: true,
        loyaltyChange: -100,
        newsTitle: '经济部长被解职',
        newsSummary: '总理以经济工作不力为由解职经济部长。',
        newsTone: 'negative',
      },
    ],
  },
  // ===== 总理府秘书长 =====
  {
    role: '总理府秘书长',
    text: '总理，最近媒体对您的报道偏负面，我建议安排一次深度专访，重塑公众形象。或者举办一场公开辩论，直接回应质疑。',
    trigger: { metric: 'approval', below: 45 },
    options: [
      {
        id: 'interview',
        label: '安排深度专访',
        effects: { approval: 3, prestige: 2 },
        reply: '安排专访，但题目要事先沟通。',
        loyaltyChange: 2,
        newsTitle: '总理接受深度专访',
        newsSummary: '总理在专访中详解施政方向，公众反应正面。',
        newsTone: 'positive',
      },
      {
        id: 'debate',
        label: '举办公开辩论',
        description: '高风险高回报',
        effects: { approval: 5, prestige: 3, stability: -1 },
        reply: '公开辩论，让民众看到我的诚意。',
        loyaltyChange: 3,
        newsTitle: '总理参加公开辩论',
        newsSummary: '总理在辩论中表现稳健，民意回升。',
        newsTone: 'positive',
      },
      {
        id: 'low_profile',
        label: '保持低调',
        description: '不回应',
        effects: { approval: -1 },
        reply: '先做实事，舆论自然会变。',
        loyaltyChange: -1,
      },
      {
        id: 'dismiss',
        label: '【开除】认为他公关无能',
        description: '立即解除该部长职务',
        effects: { stability: -2, approval: -1 },
        reply: '形象管理是秘书长的本职，做不好就换人。',
        dismiss: true,
        loyaltyChange: -100,
        newsTitle: '总理府秘书长被解职',
        newsSummary: '总理对公关工作不满，解除秘书长职务。',
        newsTone: 'negative',
      },
    ],
  },
  // ===== 通用：低忠诚度威胁 =====
  {
    role: 'any',
    text: '总理，我对您近期的某些决策有些不同看法。坦白说，党内部分同志也有类似担忧。我希望您能听听我们的声音。',
    options: [
      {
        id: 'listen',
        label: '耐心倾听，表示理解',
        effects: { approval: 1, prestige: -1 },
        reply: '你说，我听着。有什么建议尽管提。',
        loyaltyChange: 5,
      },
      {
        id: 'explain',
        label: '解释决策考量',
        effects: { prestige: 1 },
        reply: '我解释一下这个决策的背景...',
        loyaltyChange: 2,
      },
      {
        id: 'reject_advice',
        label: '直接驳回',
        description: '强势表态',
        effects: { prestige: 2, stability: -1 },
        reply: '决策已经做出，希望你支持。党内团结要紧。',
        loyaltyChange: -6,
      },
      {
        id: 'dismiss',
        label: '【开除】认为是挑衅',
        description: '立即解除该部长职务',
        effects: { stability: -3, prestige: 2 },
        reply: '既然你不认可我的决策，那不必留你在内阁。',
        dismiss: true,
        loyaltyChange: -100,
        newsTitle: '内阁部长因"立场分歧"被解职',
        newsSummary: '一位内阁部长因公开质疑总理决策被解职。',
        newsTone: 'negative',
      },
    ],
  },
  // ===== 通用：高忠诚度支持 =====
  {
    role: 'any',
    text: '总理，最近施政效果不错，党内同志普遍反映支持率回升。我会继续在部里推动您的政策落地，请放心。',
    options: [
      {
        id: 'thank',
        label: '表示感谢',
        effects: { approval: 1 },
        reply: '辛苦了，继续加油。',
        loyaltyChange: 3,
      },
      {
        id: 'promote',
        label: '暗示未来提拔',
        effects: { prestige: 1 },
        reply: '你的努力我都看在眼里，将来会有更适合你的位置。',
        loyaltyChange: 6,
      },
      {
        id: 'task',
        label: '交办新任务',
        effects: { stability: 1 },
        reply: '既然你这么得力，下个季度的重点改革你来牵头。',
        loyaltyChange: 2,
      },
    ],
  },
  // ===== 财政部长 - 增税建议 =====
  {
    role: '财政部长',
    text: '总理，我研究了一份针对高净值人群的财富税方案，预计每年可增加 8% 财政收入。但资本界肯定会强烈反对，可能引发资本外流。要不要试一试？',
    options: [
      {
        id: 'wealth_tax',
        label: '推进财富税改革',
        description: '高风险高回报',
        effects: { treasury: 6, economy: -3, approval: 4, stability: -2 },
        reply: '推进。富人应该多承担一些。',
        loyaltyChange: 3,
        newsTitle: '政府推进财富税改革',
        newsSummary: '财政部公布财富税方案，引发资本界激烈讨论。',
        newsTone: 'neutral',
      },
      {
        id: 'luxury_tax',
        label: '改征奢侈品税',
        description: '温和替代方案',
        effects: { treasury: 3, approval: 2 },
        reply: '不征财富税，改征奢侈品税，打击面小一些。',
        loyaltyChange: 1,
        newsTitle: '政府征收奢侈品税',
        newsSummary: '财政部宣布对奢侈品加征消费税。',
        newsTone: 'neutral',
      },
      {
        id: 'no_tax',
        label: '不增税',
        description: '维持现状',
        effects: { economy: 1 },
        reply: '不增税，避免资本外流。',
        loyaltyChange: -1,
      },
    ],
  },
  // ===== 外交部长 - 大国博弈 =====
  {
    role: '外交部长',
    text: '总理，某大国大使馆私下递交照会，希望我国在即将投票的国际决议中支持他们。如果支持，将获得大量援助；如果反对，可能面临制裁。这事比较棘手。',
    options: [
      {
        id: 'support_big',
        label: '支持大国立场',
        effects: { treasury: 5, diplomacy: 3, prestige: -3, approval: -2 },
        reply: '从国家利益出发，支持他们。',
        loyaltyChange: 1,
        newsTitle: '我国在国际决议中支持大国立场',
        newsSummary: '政府宣布支持大国提案，获得相应援助承诺。',
        newsTone: 'neutral',
      },
      {
        id: 'abstain',
        label: '投弃权票',
        description: '保持中立',
        effects: { diplomacy: -1, prestige: 1 },
        reply: '投弃权票，保持中立。',
        loyaltyChange: 0,
      },
      {
        id: 'oppose_big',
        label: '反对大国立场',
        effects: { diplomacy: -5, prestige: 4, approval: 3, treasury: -3 },
        reply: '反对。我们不能被人牵着鼻子走。',
        loyaltyChange: 2,
        newsTitle: '我国在国际决议中反对大国立场',
        newsSummary: '政府宣布反对大国提案，民间民族主义者欢呼。',
        newsTone: 'neutral',
      },
    ],
  },
  // ===== 内政部长 - 治安问题 =====
  {
    role: '内政部长',
    text: '总理，最近几个大城市治安事件频发，民众安全感下降。我建议增加警力部署，并启动"雷霆行动"打击有组织犯罪。',
    options: [
      {
        id: 'thunder',
        label: '启动雷霆行动',
        effects: { stability: 4, approval: 3, treasury: -3 },
        reply: '启动雷霆行动，重拳出击。',
        loyaltyChange: 3,
        newsTitle: '政府启动雷霆治安行动',
        newsSummary: '内政部宣布全国同步打击有组织犯罪。',
        newsTone: 'positive',
      },
      {
        id: 'community_police',
        label: '推广社区警务',
        description: '温和长效',
        effects: { stability: 2, approval: 2, treasury: -2 },
        reply: '推广社区警务，建立长效机制。',
        loyaltyChange: 1,
        newsTitle: '政府推广社区警务',
        newsSummary: '内政部在全国推广社区警务模式。',
        newsTone: 'positive',
      },
      {
        id: 'ignore_crime',
        label: '不作为',
        effects: { stability: -3, approval: -2 },
        reply: '过段时间自然会平息。',
        loyaltyChange: -3,
      },
    ],
  },
]

/** 从模板池中为指定部长挑选一条消息 */
export function pickCabinetChatTemplate(
  role: string,
  metrics: { approval: number; treasury: number; economy: number; stability: number; diplomacy: number; prestige: number },
  recentTexts: string[],
): CabinetChatTemplate | null {
  // 优先匹配触发条件且未近期用过的模板
  const candidates = CABINET_CHAT_TEMPLATES.filter((t) => {
    if (t.role !== role && t.role !== 'any') return false
    if (recentTexts.includes(t.text)) return false
    return true
  })
  if (candidates.length === 0) return null

  // 优先选取触发条件匹配的
  const triggered = candidates.filter((t) => {
    if (!t.trigger) return false
    const v = metrics[t.trigger.metric]
    if (t.trigger.below !== undefined && v < t.trigger.below) return true
    if (t.trigger.above !== undefined && v > t.trigger.above) return true
    return false
  })
  const pool = triggered.length > 0 ? triggered : candidates
  return pool[Math.floor(Math.random() * pool.length)]
}
