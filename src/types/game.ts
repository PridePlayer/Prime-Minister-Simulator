// 总理模拟器 — 核心类型定义

/** 一级指标（0-100） */
export interface Metrics {
  approval: number
  treasury: number
  economy: number
  stability: number
  diplomacy: number
  prestige: number
}

export type MetricKey = keyof Metrics

/** 二级指标 */
export interface SecondaryMetrics {
  // 民意 → 城市 / 农村 / 青年
  urbanSupport: number
  ruralSupport: number
  youthSupport: number
  // 国库 → 盈余 / 债务 / 外汇
  fiscalSurplus: number
  debtLevel: number
  forexReserves: number
  // 经济 → 工业 / 农业 / 就业 / 通胀
  industrialOutput: number
  agriculturalOutput: number
  employmentRate: number
  inflationRate: number
  // 稳定 → 犯罪 / 抗议 / 团结
  crimeRate: number
  protestFrequency: number
  socialCohesion: number
  // 外交 → 大国 / 邻国 / 国际组织
  majorPowerRelations: number
  neighborRelations: number
  orgInfluence: number
  // 声望 → 政坛 / 媒体 / 历史
  politicalPrestige: number
  mediaRating: number
  historicalLegacy: number
}

export type SecondaryMetricKey = keyof SecondaryMetrics

/** 二级指标元信息 */
export interface SecondaryMetricMeta {
  key: SecondaryMetricKey
  parent: MetricKey
  label: string
  /** 值越高越好？(true=正向, false=负向) */
  positive: boolean
}

/** 指标元信息 */
export interface MetricMeta {
  key: MetricKey
  label: string
  icon: string
  desc: string
}

/** 新闻语气 */
export type NewsTone = 'positive' | 'negative' | 'neutral'

/** 事件选项 */
export interface EventOption {
  id: string
  label: string
  description?: string
  effects: Partial<Metrics>
  secondaryEffects?: Partial<SecondaryMetrics>
  newsTitle: string
  newsSummary: string
  tone?: NewsTone
  /** 触发事件链：选中此选项后，指定回合后触发 chainId */
  chainId?: string
  /** 延迟触发回合数（默认 3） */
  chainDelay?: number
  /** 总理个人数值变化（politicalCapital/partyPrestige/rhetoric/riskIndex） */
  pmStatEffects?: Partial<PMStats>
  /** 选择此选项将立即结束游戏（如主动辞职） */
  endsGame?: boolean
  /** 隐藏效果预览：true=任何难度下都不显示加减分（纯盲选）；不设=按难度规则决定 */
  hideEffects?: boolean
  /** 困难模式下强制显示效果（用于关键抉择，避免完全盲选导致不公） */
  alwaysShowEffects?: boolean
  /** 延迟后果：选中此选项后，指定天数后触发一次性效果+新闻（激活 addDelayedConsequence 机制） */
  delayedConsequence?: {
    /** 延迟天数 */
    delayDays: number
    title: string
    description: string
    effects: Partial<Metrics>
    newsTitle: string
    newsSummary: string
    /** 延迟触发时对具体国家的影响（联动外交页面） */
    countryEffects?: CountryEffect[]
  }
  /** 选项直接对具体国家的影响（立即生效，联动外交页面） */
  countryEffects?: CountryEffect[]
}

/** 事件分类 */
export type EventCategory = '经济' | '外交' | '社会' | '军事' | '环境' | '突发' | '政治体制'

/** 游戏事件 */
export interface GameEvent {
  id: string
  title: string
  category: EventCategory
  description: string
  options: EventOption[]
  weight?: number
  minTurn?: number
  once?: boolean
  /** 事件链：由哪个事件+选项触发 */
  triggeredBy?: { eventId: string; optionId: string }
}

/** 主动改革 */
export interface Initiative {
  id: string
  name: string
  category: EventCategory | '改革'
  description: string
  /** 改革所需国库消耗 */
  cost: number
  /** 改革需要持续回合数 */
  duration: number
  /** 每回合效果（持续期间） */
  perTurnEffects: Partial<Metrics>
  /** 每回合二级指标效果 */
  perTurnSecondaryEffects?: Partial<SecondaryMetrics>
  /** 改革完成时一次性效果 */
  completionEffects: Partial<Metrics>
  /** 改革完成时二级指标效果 */
  completionSecondaryEffects?: Partial<SecondaryMetrics>
  /** 前提条件 */
  prerequisites?: Partial<{ [K in MetricKey]: number }>
  /** 仅可执行一次 */
  once?: boolean
  /** 是否为激进改革（改变国家路径） */
  radical?: boolean
  /** 改革消耗政治资本 */
  politicalCapitalCost?: number
  /** 改革对派系好感度的影响 */
  factionEffects?: Partial<Record<string, number>>
  /** 外交类改革：是否需要选择目标国家
   *  若为 true，启动时必须指定 targetCountryId；
   *  完成时除常规效果外，会对目标国关系额外加成（基于 completionEffects.diplomacy） */
  requiresCountryTarget?: boolean
  /** 改革完成时触发的延迟后果（模块联动：改革→后续衍生事件，如军事改革→外交摩擦） */
  completionDelayedConsequence?: {
    /** 延迟天数（自完成日起） */
    delayDays: number
    title: string
    description: string
    effects: Partial<Metrics>
    newsTitle: string
    newsSummary: string
    /** 改革完成延迟触发时对具体国家的影响（联动外交页面） */
    countryEffects?: CountryEffect[]
  }
  /** 前置改革：必须已完成这些改革才能启动（改革树前后链） */
  requiresInitiative?: string[]
  /** 改革完成时解锁的政策 ID 列表（改革↔政策树联动：改革可改变政策树） */
  unlocksPolicies?: string[]
}

/** 事件冷却记录 */
export interface EventCooldown {
  /** 事件 ID */
  eventId: string
  /** 触发时的总天数 */
  triggeredDay: number
  /** 冷却天数（默认 180） */
  cooldownDays: number
}

/** NPC 记忆记录 */
export interface NPCMemory {
  /** NPC 标识 */
  npcId: string
  /** 玩家对该 NPC 的关键行为记录 */
  events: {
    /** 行为类型 */
    type: 'promoted' | 'betrayed' | 'dismissed' | 'helped' | 'insulted'
    /** 发生天数 */
    day: number
    /** 描述 */
    description: string
  }[]
  /** 当前语气倾向 */
  tone: 'friendly' | 'neutral' | 'resentful' | 'hostile'
}

/** 延迟后果（定时炸弹） */
export interface DelayedConsequence {
  /** 唯一 ID */
  id: string
  /** 触发天数 */
  triggerDay: number
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 触发时的全局指标效果 */
  effects: Partial<Metrics>
  /** 触发时的新闻标题 */
  newsTitle: string
  /** 触发时的新闻摘要 */
  newsSummary: string
  /** 对具体国家的影响（与外交页面联动，非孤立的全局 diplomacy 数字） */
  countryEffects?: CountryEffect[]
}

/** 对具体国家的影响：让事件/改革/延迟后果能真正联动外交页面 */
export interface CountryEffect {
  /** 指定具体国家 id（如 northoria）；不填则按下方 target 规则 */
  countryId?: string
  /** 影响所有邻国（isNeighbor=true 的国家） */
  targetNeighbors?: boolean
  /** 影响所有国家 */
  targetAll?: boolean
  /** 关系值变化（正数改善，负数恶化） */
  relationDelta?: number
  /** 强制设置制裁状态 */
  setSanctioned?: boolean
  /** 强制解除制裁 */
  liftSanctioned?: boolean
  /** 强制设置贸易状态 */
  setTradeAgreement?: boolean
  /** 强制解除贸易 */
  liftTradeAgreement?: boolean
}

/** 倒计时事件 */
export interface CountdownEvent {
  /** 唯一 ID */
  id: string
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 剩余秒数 */
  remainingSeconds: number
  /** 总秒数 */
  totalSeconds: number
  /** 选项（必须在倒计时内决策） */
  options: EventOption[]
}

/** 组阁谈判条件 */
export interface CoalitionDemand {
  /** 小党 ID */
  partyId: string
  /** 要求描述 */
  description: string
  /** 条件类型 */
  type: 'minister_post' | 'policy_commitment' | 'budget_allocation'
  /** 具体要求（如部长职位名） */
  detail: string
  /** 接受后该党的席位贡献 */
  seatsOffered: number
  /** 接受后该党好感度变化 */
  favorabilityChange: number
  /** 接受后对玩家的影响 */
  effects?: Partial<Metrics>
}

/** 内阁候选人（详细属性） */
export interface CabinetCandidate {
  id: string
  name: string
  /** 所属党派/派系 */
  faction: string
  /** 专业能力值 0-100 */
  capability: number
  /** 政治影响力 0-100 */
  influence: number
  /** 忠诚度 0-100 */
  loyalty: number
  /** 隐藏丑闻率 0-100 */
  riskProfile: number
  /** 各项数值加成 */
  bonuses: CabinetBonus
  /** 可担任的职位 */
  suitableRoles: string[]
  /** NPC 性格标签 */
  traits?: NPCTrait[]
}

/** 正在进行的改革 */
export interface ActiveInitiative {
  initiativeId: string
  /** 已执行回合数 */
  elapsed: number
  /** 总回合数 */
  duration: number
  name: string
  /** 外交改革的目标国家 ID（仅外交类改革使用） */
  targetCountryId?: string
}

/** 新闻条目 */
export interface NewsItem {
  id: string
  timestamp: string
  title: string
  summary: string
  category: EventCategory | '决策' | '改革' | '议会' | '内阁' | '紧急' | '军事'
  tone: 'positive' | 'negative' | 'neutral'
}

/** 内阁成员各项加成（每回合生效，受忠诚度影响） */
export interface CabinetBonus {
  approval: number
  treasury: number
  economy: number
  stability: number
  diplomacy: number
  prestige: number
}

/** 内阁成员 */
export interface CabinetMember {
  id: string
  name: string
  role: string
  loyalty: number
  specialty: MetricKey
  advice: string
  /** 可被解职 */
  dismissible?: boolean
  /** 各项数值加成（每回合生效，受忠诚度缩放） */
  bonuses: CabinetBonus
}

/** 议会状态 */
export interface ParliamentState {
  /** 执政党席位占比 0-100 */
  rulingPartySeats: number
  /** 议会对总理的信任度 0-100 */
  confidence: number
  /** 议会是否已被解散（冷却中） */
  dissolved: boolean
  /** 解散冷却回合 */
  dissolveCooldown: number
  /** 本届任期已解散议会次数 */
  dissolutionsThisTerm: number
  /** 本届任期开始时的回合数 */
  termStartTurn: number
}

/** 总统状态 */
export interface PresidentState {
  name: string
  /** 总统与总理关系 0-100 */
  relation: number
  /** 总统所属政党是否与总理一致 */
  sameParty: boolean
  /** 总统背景描述（影响事件文本） */
  background?: string
  /** 总统性格倾向：强势/温和/务实 */
  temperament?: 'strong' | 'moderate' | 'pragmatic'
}

/** 议会行动类型 */
export type ParliamentActionType = 'dissolve' | 'qa_session' | 'vote_confidence' | 'propose_law'

/** 议会行动 */
export interface ParliamentAction {
  id: ParliamentActionType
  label: string
  description: string
  /** 是否可用 */
  available: (state: GameState) => boolean
  /** 执行结果 */
  execute: (state: GameState) => Partial<GameState>
}

/** 紧急事件（临界点触发） */
export interface EmergencyEvent {
  id: string
  title: string
  category: '紧急'
  description: string
  /** 触发条件：哪些指标低于阈值 */
  trigger: Partial<{ [K in MetricKey]: number }>
  options: EventOption[]
  /** 是否可重复触发 */
  repeatable?: boolean
  /** 冷却回合 */
  cooldown?: number
  /** 是否仅触发一次 */
  once?: boolean
}

/** 入侵事件 */
export interface InvasionEvent {
  id: string
  title: string
  category: '军事'
  description: string
  /** 入侵来源国家 */
  invader: string
  /** 触发条件 */
  trigger: (state: GameState) => boolean
  /** 多阶段选项 */
  phases: {
    id: string
    label: string
    description: string
    options: EventOption[]
  }[]
}

/** 总理可执行的动作类型 */
export type PMActionType =
  | 'initiative'   // 发起改革
  | 'parliament'   // 议会互动
  | 'cabinet'      // 内阁调整
  | 'diplomacy'    // 外交行动
  | 'inspect'      // 视察地方
  | 'speech'       // 发表演说

/** 总理动作 */
export interface PMAction {
  id: PMActionType
  label: string
  icon: string
  description: string
  cooldown: number
  lastUsedTurn: number
}

/** 成就 */
export interface Achievement {
  id: string
  name: string
  desc: string
  icon: string
  unlocked: boolean
}

/** 结局评级 */
export type EndingGrade = 'S' | 'A' | 'B' | 'C' | 'D'

/** 屏幕路由 */
export type Screen = 'menu' | 'game' | 'ending'

/** 游戏子页面路由 */
export type GamePage =
  | 'dashboard'
  | 'initiatives'
  | 'cabinet'
  | 'cabinet_chat'
  | 'parliament'
  | 'news'
  | 'debate'
  | 'letters'
  | 'media'
  | 'election'
  | 'tasks'
  | 'policies'
  | 'diplomacy'
  | 'military'
  | 'society'
  | 'economy'
  | 'environment'
  | 'pm_profile'
  | 'encyclopedia'

/** 内阁聊天选项（部长发来的请求/要求，总理的回应选项） */
export interface CabinetChatOption {
  id: string
  label: string
  description?: string
  effects?: Partial<Metrics>
  pmStatEffects?: Partial<PMStats>
  /** 总理的回复文本 */
  reply: string
  /** 部长忠诚度变化 */
  loyaltyChange?: number
  /** 是否为开除该部长选项 */
  dismiss?: boolean
  /** 选择后产生的新闻 */
  newsTitle?: string
  newsSummary?: string
  newsTone?: NewsTone
}

/** 内阁聊天消息 */
export interface CabinetChatMessage {
  id: string
  /** 发送者：pm=总理，minister=部长 */
  sender: 'pm' | 'minister'
  text: string
  /** 发送时的总天数 */
  day: number
  /** 部长发来消息时附带的选项（总理可点击回应） */
  options?: CabinetChatOption[]
  /** 是否已被总理回应（用于禁用按钮） */
  resolved?: boolean
  /** 选中的选项 ID */
  selectedOptionId?: string
}

/** 内阁聊天会话（每个部长一个会话） */
export interface CabinetChatThread {
  ministerId: string
  messages: CabinetChatMessage[]
}

/** 国家政策（可切换的政策方向，每类一项当前政策） */
export interface NationalPolicy {
  id: string
  /** 政策类别（经济/社会/外交/军事/环境/政治） */
  category: string
  name: string
  description: string
  /** 当前生效中的政策每回合效果 */
  perTurnEffects: Partial<Metrics>
  /** 切换到该政策的代价（一次性，可包含任意一级指标及政治资本） */
  switchCost: Partial<Metrics> & { politicalCapital?: number }
  /** 切换前置条件（指标阈值） */
  prerequisites?: Partial<Metrics>
  /** 是否为初始默认政策 */
  isDefault?: boolean
  /** 前置政策：必须曾启用过这些政策（政策树前后链，查 adoptedPolicies 历史） */
  requiresPolicy?: string[]
  /** 改革锁定：仅当指定改革之一完成时才解锁（改革↔政策树联动） */
  unlockedByInitiative?: string[]
}

/** 任务节点 */
export interface TaskNode {
  id: string
  /** 任务类别 */
  category: '经济' | '社会' | '外交' | '军事' | '政治' | '终极'
  title: string
  description: string
  /** 完成条件（指标阈值） */
  requirements: Partial<Metrics> & { term?: number; turn?: number }
  /** 奖励 */
  rewards?: {
    achievements?: string[]
    effects?: Partial<Metrics>
    pmStatEffects?: Partial<PMStats>
  }
  /** 是否已完成 */
  completed?: boolean
  /** 前置任务 ID */
  prerequisiteTasks?: string[]
  /** 关联成就 ID */
  achievementId?: string
}

/** 事件链待触发 */
export interface PendingChain {
  chainId: string
  triggerTurn: number
}

/** 总理背景身份 */
export type PMBackground = 'legal_expert' | 'union_representative' | 'political_dynasty'

/** 总理个人特质 */
export type PMTrait = 'hardliner' | 'coordinator' | 'pragmatist' | 'idealist'

/** 总理个人数值 */
export interface PMStats {
  /** 政治资本：核心消耗资源 */
  politicalCapital: number
  /** 党内威望：低于临界值触发党内挑战 */
  partyPrestige: number
  /** 辩论技巧：影响质询成功率 */
  rhetoric: number
  /** 风险指数：负面事件积累程度 */
  riskIndex: number
}

/**
 * 总理个人特质（数值化，0-100，可在游戏中被事件改变）
 * 与 PMStats（消耗性资源）区分：特质是性格/能力倾向，相对稳定
 */
export interface PMTraits {
  /** 健康：低于 30 触发病休事件，影响行动次数 */
  health: number
  /** 魅力：影响民调回升和外交好感 */
  charisma: number
  /** 果断：影响紧急事件响应速度和成功率 */
  decisiveness: number
  /** 韧性：抗压能力，降低连续负面事件的连锁影响 */
  resilience: number
  /** 道德：影响腐败/丑闻事件触发概率和黑料卡使用代价 */
  integrity: number
}

/** 议会党派 */
export interface PoliticalParty {
  id: string
  name: string
  color: string
  seats: number
  /** 对总理的好感度 */
  favorability: number
  /** 是否为执政联盟成员 */
  inCoalition: boolean
  /** 组阁条件（如需要部长职位等） */
  coalitionDemands?: string[]
  /** 党派介绍 */
  description?: string
  /** 政治立场 */
  stance?: string
  /** 竞选承诺 */
  manifesto?: string[]
  /** 党派图标 */
  icon?: string
}

/** 内阁候选人属性 */
export interface CabinetCandidate {
  id: string
  name: string
  /** 所属党派/派系 */
  faction: string
  /** 专业能力值 0-100 */
  capability: number
  /** 政治影响力 0-100 */
  influence: number
  /** 忠诚度 0-100 */
  loyalty: number
  /** 隐藏丑闻率 0-100 */
  riskProfile: number
  /** 各项数值加成 */
  bonuses: CabinetBonus
  /** 可担任的职位 */
  suitableRoles: string[]
}

/** 质询卡牌 */
export interface DebateCard {
  id: string
  name: string
  description: string
  /** 依赖的总理属性 */
  dependsOn: 'rhetoric' | 'politicalCapital' | 'partyPrestige'
  /** 消耗值 */
  cost: number
  /** 基础成功率 */
  baseSuccessRate: number
  /** 成功效果 */
  successEffects: Partial<Metrics> & Partial<PMStats>
  /** 失败效果 */
  failEffects: Partial<Metrics> & Partial<PMStats>
  /** 成功新闻 */
  successNews: { title: string; summary: string }
  /** 失败新闻 */
  failNews: { title: string; summary: string }
}

/** 选区信件 */
export interface ConstituencyLetter {
  id: string
  from: string
  subject: string
  content: string
  /** 回复选项 */
  options: {
    id: string
    label: string
    effects: Partial<Metrics>
    newsTitle: string
    newsSummary: string
  }[]
}

// ===================== 卡牌系统 =====================

/** 卡牌类别 */
export type CardCategory = 'PMQs' | 'BACKROOM' | 'LEAK' | 'SPIN' | 'WHIP' | 'DOSSIER'

/** 卡牌消耗 */
export interface CardCost {
  politicalCapital?: number
  treasury?: number
  /** 风险指数增加值（打出后增加） */
  riskIndex?: number
  /** 需消耗的黑料卡 ID（用于爆料/勒索卡） */
  dossierCardId?: string
  /** 需要解职的大臣（用于替罪羊卡） */
  dismissMinisterLoyaltyBelow?: number
}

/** 卡牌打出条件 */
export interface CardConditions {
  /** 最低辩论技巧要求 */
  minRhetoric?: number
  /** 议会席位上限条件（如 <51） */
  parliamentSeatsBelow?: number
  /** 冷却天数（同一张卡牌两次打出之间的最小间隔） */
  cooldownDays?: number
}

/** 卡牌成功效果 */
export interface CardEffectsOnSuccess {
  publicApprovalChange?: number
  partyPrestigeChange?: number
  rhetoricChange?: number
  seatsGained?: number
  /** 写入 NPC 记忆日志 */
  addNpcMemory?: { npcId: string; tag: string }
  /** 民调下跌减少比例（如 0.5 表示减少 50% 损失） */
  mitigateApprovalLoss?: number
}

/** 卡牌失败效果 */
export interface CardEffectsOnFailure {
  publicApprovalChange?: number
  partyPrestigeChange?: number
  oppositionHatredChange?: number
}

/** 卡牌（数据定义） */
export interface Card {
  id: string
  name: string
  category: CardCategory
  description: string
  cost: CardCost
  conditions?: CardConditions
  /** 基础成功率（0-100）；字符串表示动态公式（在 cardEngine 中求值） */
  successProbability: number | string
  effectsOnSuccess: CardEffectsOnSuccess
  effectsOnFailure?: CardEffectsOnFailure
  /** 卡牌色调（前端 UI 使用） */
  color: 'red' | 'yellow' | 'blue' | 'purple' | 'green' | 'black' | 'gray'
  /** 卡牌图标 emoji */
  icon: string
  /** 成功音效文件名（在 src/assets/audio/sfx 下） */
  successSound?: string
  /** 失败音效文件名 */
  failSound?: string
}

/** 黑料卡（玩家调查 NPC 后生成） */
export interface DossierCard {
  id: string
  /** 目标 NPC ID（议员/大臣） */
  targetNpcId: string
  /** 目标 NPC 显示名 */
  targetNpcName: string
  /** 目标 NPC 所属党派 ID */
  targetPartyId?: string
  /** 黑料标题 */
  title: string
  /** 黑料描述 */
  description: string
  /** 黑料严重度（1-5），影响打出效果强度 */
  severity: number
  /** 生成时的天数 */
  createdDay: number
}

/** 手牌槽中的卡牌实例（运行时） */
export interface CardHandItem {
  /** 唯一实例 ID */
  instanceId: string
  /** 卡牌定义 ID */
  cardId: string
  /** 上次打出该卡牌的游戏天数（用于冷却） */
  lastPlayedDay: number
}

/** 卡牌事件槽位（玩家拖拽卡牌至中央事件时填充） */
export interface CardEventSlot {
  /** 当前激活的卡牌事件实例 ID */
  instanceId: string
  /** 事件类型（决定哪些卡牌类别可打出） */
  eventType: 'pmqs' | 'backroom' | 'leak' | 'spin'
  /** 事件标题 */
  title: string
  /** 事件描述 */
  description: string
  /** 接受的卡牌类别 */
  acceptedCategories: CardCategory[]
  /** 触发该事件的源 NPC（如反对党党魁） */
  sourceNpcId?: string
  /** 触发该事件的源党派 ID */
  sourcePartyId?: string
  /** 当前民调下跌量（用于 SPIN 卡牌 mitigateApprovalLoss） */
  pendingApprovalLoss?: number
  /** 触发时的游戏天数 */
  triggeredDay: number
  /** 截止天数（超时未打出则按失败结算） */
  deadlineDay: number
}

/** 卡牌打出结果 */
export interface CardPlayResult {
  success: boolean
  /** 资源是否足够（false = 弹回手牌） */
  resourceOk: boolean
  /** 是否满足前置条件（false = 弹回手牌） */
  conditionOk: boolean
  /** 结算消息 */
  message: string
  /** 应用后的状态变更（在 store 中应用） */
  effects: {
    metricsDelta?: Partial<Metrics>
    pmStatsDelta?: Partial<PMStats>
    seatsGained?: number
    /** 触发议会解散 */
    dissolveParliament?: boolean
    /** 添加延迟后果 */
    delayedConsequence?: {
      delayDays: number
      title: string
      description: string
      effects: Partial<Metrics>
      newsTitle: string
      newsSummary: string
    }
    /** NPC 记忆写入 */
    npcMemory?: { npcId: string; tag: string }
    /** 新闻条目 */
    news?: { title: string; summary: string; tone: NewsTone }
  }
}

/** 外部照会 */
export interface DiplomaticNote {
  id: string
  from: string
  subject: string
  content: string
  /** 接受条款效果 */
  acceptEffects: Partial<Metrics>
  /** 拒绝条款效果 */
  rejectEffects: Partial<Metrics>
  /** 接受新闻 */
  acceptNews: { title: string; summary: string }
  /** 拒绝新闻 */
  rejectNews: { title: string; summary: string }
}

/** 待处理事件（进入事件收纳篮，玩家可在 14 天内决策） */
export interface PendingEvent {
  /** 唯一 ID（含时间戳，避免同名事件冲突） */
  instanceId: string
  /** 原事件 ID */
  eventId: string
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 分类 */
  category: EventCategory | '紧急'
  /** 选项 */
  options: EventOption[]
  /** 是否为紧急事件 */
  isEmergency: boolean
  /** 触发时的总天数 */
  triggeredDay: number
  /** 截止天数（默认 7 天后） */
  deadlineDay: number
  /** 默认选项 ID（超时自动选择） */
  defaultOptionId: string
  /** 是否为一次性事件 */
  once?: boolean
  /** 事件链触发信息 */
  chainInfo?: { chainId?: string; chainDelay?: number }
}

/** NPC性格标签 */
export type NPCTrait = 'idealist' | 'pragmatist' | 'hardliner' | 'moderate' | 'opportunist'

/** NPC基础接口 */
export interface NPCBase {
  id: string
  name: string
  role: string
  /** 性格标签 */
  traits: NPCTrait[]
  /** 对总理态度 */
  attitude: number
}

/** 外交关系等级 */
export type RelationLevel =
  | '盟友'      // 80-100
  | '友好'      // 60-79
  | '正常'      // 40-59
  | '紧张'      // 20-39
  | '敌对'      // 1-19
  | '交战'      // 0（处于战争状态）

/** 外国国家 */
export interface ForeignCountry {
  /** 唯一 ID */
  id: string
  /** 国家名称 */
  name: string
  /** 国家旗帜 emoji */
  flag: string
  /** 政体 */
  government: '民主' | '威权' | '君主' | '混合' | '神权'
  /** 综合国力 0-100（影响战争难度与外交分量） */
  power: number
  /** 军事实力 0-100（战争胜负关键） */
  military: number
  /** 是否拥有核武器 */
  nuclear: boolean
  /** 是否为邻国 */
  isNeighbor: boolean
  /** 与玩家国家的关系值 0-100 */
  relation: number
  /** 当前关系等级（由 relation 派生） */
  relationLevel: RelationLevel
  /** 已签订的条约/状态标签 */
  treaties: string[]
  /** 是否处于贸易状态 */
  tradeAgreement: boolean
  /** 是否处于制裁状态 */
  sanctioned: boolean
  /** 间谍渗透等级 0-3（玩家对该国的情报掌握程度） */
  espionageLevel: number
  /** 最近一次对该国采取行动的回合（防止刷屏） */
  lastActionTurn: number
}

/** 外交行动定义 */
export interface DiplomaticActionDef {
  id: string
  label: string
  description: string
  icon: string
  /** 行动类别 */
  kind: 'diplomatic' | 'economic' | 'covert' | 'military'
  /** 关系阈值要求（低于则不可用） */
  minRelation?: number
  /** 关系阈值要求（高于则不可用，如制裁需关系较低） */
  maxRelation?: number
  /** 是否需要邻国 */
  requiresNeighbor?: boolean
  /** 政治资本代价 */
  politicalCapitalCost: number
  /** 国库代价 */
  treasuryCost?: number
  /** 行动冷却回合数 */
  cooldown: number
  /** 执行效果：对关系、指标、条约等的影响 */
  execute: (country: ForeignCountry, state: GameState) => {
    country: Partial<ForeignCountry>
    metrics?: Partial<Metrics>
    pmStats?: Partial<PMStats>
    news: { title: string; summary: string; tone: NewsTone }
    /** 是否触发战争（目标国家 ID） */
    triggerWar?: string
  }
}

/** 战争阶段 */
export interface WarStage {
  /** 阶段 ID */
  id: string
  /** 阶段标题 */
  title: string
  /** 阶段描述（叙事文本） */
  narrative: string
  /** 阶段序号（从 0 开始） */
  order: number
  /** 此阶段的决策选项 */
  options: WarOption[]
}

/** 战争决策选项 */
export interface WarOption {
  id: string
  label: string
  description: string
  icon: string
  /** 军事力量加成（影响最终胜负） */
  militaryModifier: number
  /** 经济代价（每回合国库消耗） */
  economyCost?: number
  /** 民意变化 */
  approvalChange?: number
  /** 稳定变化 */
  stabilityChange?: number
  /** 国际声望变化 */
  prestigeChange?: number
  /** 外交关系变化 */
  diplomacyChange?: number
  /** 选项叙事文本 */
  narrative: string
  /** 选项对应的新闻 */
  newsTitle: string
  newsSummary: string
  newsTone: NewsTone
}

/** 战争状态（进行中的战争） */
export interface WarState {
  /** 唯一 ID */
  id: string
  /** 敌对国家 ID */
  enemyCountryId: string
  /** 敌对国家名称（快照，防止国家数据变化） */
  enemyCountryName: string
  /** 敌国军事实力（快照） */
  enemyMilitary: number
  /** 玩家累计军事优势分（越高越有利） */
  warScore: number
  /** 当前阶段 ID */
  currentStageId: string
  /** 当前阶段序号 */
  currentOrder: number
  /** 已完成的阶段 */
  completedStages: string[]
  /** 已选择过的选项（用于结局叙事） */
  chosenOptions: { stageId: string; optionId: string; label: string }[]
  /** 战争开始的回合 */
  startTurn: number
  /** 战争是否已结束 */
  ended: boolean
  /** 战争结果（结束后填充） */
  outcome?: 'victory' | 'defeat' | 'stalemate' | 'pyrrhic'
  /** 战后叙事 */
  epilogue?: string
}

/** 故事节拍所属阶段：与回合数对应 */
export type StoryPhase = 'early' | 'mid' | 'late'

/** 故事节拍分类 */
export type StoryCategory = '民间百态' | '朝堂风云' | '国际视角' | '节令时序'

/** 一段叙事节拍：短小的氛围文字，定期浮现以增强国家代入感 */
export interface StoryBeat {
  /** 唯一 ID */
  id: string
  /** 分类 */
  category: StoryCategory
  /** 所属阶段 */
  phase: StoryPhase
  /** 标题 */
  title: string
  /** 2-4 句叙事性文字 */
  text: string
  /** 生效起始回合（含） */
  minTurn: number
  /** 生效截止回合（含） */
  maxTurn: number
}

export interface GameState {
  pmName: string
  /** 国家名称（玩家自定义，默认"埃尔瓦尼亚共和国"） */
  countryName: string
  term: number
  year: number
  month: number
  /** 日（1-31，即时制下按日推进） */
  day: number
  /** 总天数（从开局累计） */
  totalDays: number
  turn: number
  screen: Screen
  /** 难度：normal=普通（显示全部效果预览），hard=困难（减少加成、增加扣分、隐藏部分选项效果） */
  difficulty: 'normal' | 'hard'
  /** 游戏阶段：用于控制开局流程 */
  gamePhase: 'character_creation' | 'coalition' | 'cabinet_setup' | 'playing' | 'election' | 'ending'
  /** 时间流速：0=暂停, 1/2/3/4/5 五档速度 */
  timeSpeed: 0 | 1 | 2 | 3 | 4 | 5
  /** 上次设置的非零速度（空格键恢复时使用） */
  previousTimeSpeed: 1 | 2 | 3 | 4 | 5
  /** 总理背景身份 */
  pmBackground: PMBackground | null
  /** 总理个人特质（最多2项，老式枚举；保留用于向后兼容） */
  pmTraits: PMTrait[]
  /** 总理个人数值 */
  pmStats: PMStats
  /** 总理性格特质（数值化滑块，0-100，可在游戏中被事件改变） */
  pmTraitsNumeric: PMTraits
  /** 一级指标 */
  metrics: Metrics
  /** 二级指标 */
  secondary: SecondaryMetrics
  /** 当前事件（兼容旧逻辑，新事件进入 pendingEvents） */
  currentEvent: GameEvent | null
  /** 当前紧急事件（优先级高于普通事件） */
  currentEmergency: EmergencyEvent | null
  /** 待处理事件队列（事件收纳篮，玩家可在 7 天内决策） */
  pendingEvents: PendingEvent[]
  /** 当前在弹窗中打开的待处理事件（instanceId） */
  activePendingEventId: string | null
  /** 新闻流 */
  news: NewsItem[]
  /** 内阁 */
  cabinet: CabinetMember[]
  /** 已处理事件 ID */
  resolvedEventIds: string[]
  /** 待触发的事件链 */
  pendingChains: PendingChain[]
  /** 已完成改革 ID */
  completedInitiatives: string[]
  /** 正在进行的改革 */
  activeInitiatives: ActiveInitiative[]
  /** 议会状态 */
  parliament: ParliamentState
  /** 议会党派 */
  parties: PoliticalParty[]
  /** 总统状态 */
  president: PresidentState
  /** 总理可用动作 */
  pmActions: PMAction[]
  /** 已触发的紧急事件 ID（防止重复触发） */
  triggeredEmergencyIds: string[]
  /** 事件冷却池（防止短期内重复触发同名事件） */
  eventCooldowns: EventCooldown[]
  /** 成就 */
  achievements: Achievement[]
  /** 当前质询事件 */
  currentDebate: {
    question: string
    cards: DebateCard[]
  } | null
  /** 待处理的选区信件 */
  pendingLetters: ConstituencyLetter[]
  /** 待处理的外部照会 */
  pendingNotes: DiplomaticNote[]
  /** 待处理的倒计时事件 */
  currentCountdown: CountdownEvent | null
  /** 延迟后果队列（定时炸弹） */
  delayedConsequences: DelayedConsequence[]
  /** NPC 记忆记录 */
  npcMemories: NPCMemory[]
  /** Breaking News 弹窗（决策后具象化头条） */
  breakingNews: {
    id: string
    title: string
    summary: string
    tone: NewsTone
    imageUrl?: string
  } | null
  /** 上次显示 Breaking News 弹窗的回合（用于限制弹窗频率，至少间隔 2 月） */
  lastBreakingNewsTurn: number
  /** 未读消息提醒（质询/信件/照会到达时） */
  unreadAlerts: {
    type: 'debate' | 'letter' | 'note' | 'countdown' | 'breaking'
    title: string
    timestamp: number
  }[]
  /** 玩家所选执政党 ID（用于追踪组阁要求落实情况） */
  playerPartyId: string | null
  /** 执政党耐心值 0-100：低于阈值时触发"以辞职相威胁"事件 */
  partyPatience: number
  /** 上次触发执政党最后通牒的回合（防止频繁触发） */
  lastUltimatumTurn: number
  /** 内阁聊天会话列表（每个部长一个） */
  cabinetChats: CabinetChatThread[]
  /** 当前生效的国家政策 ID 列表（按 category 一项） */
  activePolicies: string[]
  /** 历史上曾启用过的政策 ID（用于政策树前置链判定，启动即写入，不可回退） */
  adoptedPolicies: string[]
  /** 上次命运事件触发的季度（防止重复触发） */
  lastFateQuarter: number
  /** 上次内阁聊天生成的天数（控制生成频率） */
  lastCabinetChatDay: number
  /** 外国国家列表（含外交关系） */
  countries: ForeignCountry[]
  /** 当前进行中的战争（同时最多一场） */
  activeWar: WarState | null
  /** 已结束的战争历史（用于结局叙事） */
  warHistory: { enemy: string; outcome: WarState['outcome']; turn: number }[]
  /** 领域行动冷却记录：key = `${domain}:${actionId}`，value = 上次执行回合 */
  domainActionCooldowns: Record<string, number>
  /** 已执行的领域行动历史（用于叙事与统计） */
  domainActionHistory: { domain: string; actionId: string; actionLabel: string; turn: number }[]
  // ===================== 卡牌系统运行时状态 =====================
  /** 玩家手牌（每张卡的运行时实例，含冷却信息） */
  cardHand: CardHandItem[]
  /** 已收集的黑料卡（可用于打出 LEAK 类卡牌） */
  dossierCards: DossierCard[]
  /** 当前激活的卡牌事件槽位（中央 Drop Zone）；为 null 表示无激活事件 */
  activeCardEvent: CardEventSlot | null
  /** PMQs 卡牌"归咎前任"30 天内使用次数（用于惩罚成功率） */
  blamePredecessorCount: number
  /** 上次使用"归咎前任"的游戏天数 */
  lastBlameDay: number
  /** "封官许爵"未履行承诺列表：[{partyId, promiseDay, npcId}] */
  pendingAppointments: { partyId: string; npcId: string; promiseDay: number }[]
  /** 上次触发 PMQs 议会质询的游戏天数（防止放弃后同日重复触发） */
  lastPmqsTriggerDay: number
  /** 上次触发叙事节拍的游戏天数（约每 45 天触发一次） */
  lastStoryDay: number
  /** 当前展示中的叙事节拍（null 表示无展示）；30 天后自动清除 */
  currentStoryBeat: StoryBeat | null
  /** 民意是否曾跌破 20（用于"不倒翁"成就判定，需持久化以跨存档保留） */
  hadLowApproval: boolean
  /** 税率档位：low=低税 medium=中税 high=高税 very_high=超高税；影响每月国库进账与民意/经济 */
  taxRate: 'low' | 'medium' | 'high' | 'very_high'
  /** 上次调整税率的游戏天数（防止频繁调整：每次调整至少间隔 30 天） */
  lastTaxChangeDay: number
  /** 困难模式盲选后的结果弹窗：展示实际发生的指标变化（仅当选项效果被隐藏时设置） */
  decisionResult: {
    optionLabel: string
    effects: Partial<Metrics>
    pmStatEffects?: Partial<PMStats>
  } | null
  /** 本月剩余行动次数（每月在 advanceMonth 中重置为 maxActionsPerTurn；健康<30 时为 2，否则为 3） */
  actionsThisTurn: number
  /** 连续负面事件计数（用于韧性缩放；每月在 advanceMonth 中清零） */
  consecutiveNegativeEvents: number
  /** 突击新闻发布会 minigame 是否开启（开启时暂停游戏时间） */
  pressConferenceOpen: boolean
  /** 当前突击新闻发布会的丑闻严重度（0-100） */
  pressConferenceSeverity: number
  /** 深夜官邸密室游说 minigame 是否开启（开启时暂停游戏时间；存档加载时强制为 false） */
  backroomLobbyOpen: boolean
  /** 病休状态：健康值低于 30 触发后置为 true，期间行动次数受限、事件暂停 */
  healthEventActive: boolean
  endingReason?: string
  endingGrade?: EndingGrade
  /** 大选开始时的状态快照（用于大选阶段对比与结算） */
  electionSnapshot?: { approval: number; seats: number; term: number }
  eventsHandled: number
}

/** 存档数据 */
export interface SaveData {
  version: string
  savedAt: string
  gameState: GameState
}

/** 存档元信息（用于存档列表） */
export interface SaveMeta {
  saveId: string
  fileName: string
  savedAt: string
  saveName: string
  pmName: string
  countryName?: string
  term: number
  turn: number
  year: number
  month: number
  day: number
  metrics: Metrics | null
  fileSize: number
  /** 是否为自动存档 */
  isAuto: boolean
}

/** window.api 类型 */
export interface ElectronAPI {
  // 兼容旧版
  hasSave: () => Promise<boolean>
  loadSave: () => Promise<SaveData | null>
  writeSave: (data: SaveData, isAuto?: boolean) => Promise<string | void>
  deleteSave: () => Promise<void>
  // 新增多存档
  listSaves: () => Promise<SaveMeta[]>
  loadSaveById: (saveId: string) => Promise<SaveData | null>
  deleteSaveById: (saveId: string) => Promise<boolean>
  renameSave: (saveId: string, newName: string) => Promise<boolean>
  // 诊断
  getSaveDir: () => Promise<string>
  openSaveDir: () => Promise<boolean>
  diagnose: () => Promise<{
    ok: boolean
    savesDir: string
    exists: boolean
    totalFiles: number
    saveFiles: number
    files: string[]
    error?: string
  }>
  // 对话框
  confirmDialog: (message: string, title?: string) => Promise<boolean>
  // 窗口控制（自绘标题栏）
  windowMinimize: () => Promise<void>
  windowMaximizeToggle: () => Promise<void>
  windowClose: () => Promise<void>
  windowIsMaximized: () => Promise<boolean>
  windowSetFullScreen: (fullscreen: boolean) => Promise<boolean>
  windowIsFullScreen: () => Promise<boolean>
  onMaximizeChange: (cb: (maximized: boolean) => void) => () => void
  onFullScreenChange: (cb: (fullscreen: boolean) => void) => () => void
  getVersion: () => string
}