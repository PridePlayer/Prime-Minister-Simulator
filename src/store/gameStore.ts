import { create } from 'zustand'
import type { GameState, Screen, EventOption, Achievement, SecondaryMetrics, ActiveInitiative, EmergencyEvent, GamePage, PMBackground, PMTrait, PMStats, PMTraits, GameEvent, PendingEvent, CabinetChatThread, CabinetChatMessage, CabinetChatOption, WarState, WarCommandState, WarCommandGeneral, FrontDeployment, Metrics, MetricKey, AttributionEntry } from '@/types/game'
import { INITIAL_METRICS, deriveSecondary } from '@/data/metrics'
import { INITIAL_CABINET, CABINET_ADVICES, REPLACEMENT_CANDIDATES } from '@/data/cabinet'
import { ACHIEVEMENTS } from '@/data/achievements'
import { INITIATIVES } from '@/data/initiatives'
import { resolveOption, advanceMonth, advanceDay, pickEvent, makeNews, checkEmergency, checkInvasion, recordEventTrigger, getMaxActionsPerTurn, applyTraitScaling } from '@/engine/eventEngine'
import { checkCountdownEvent } from '@/data/countdownEvents'
import {
  checkEarlyEnd,
  calcGrade,
  gradeNarrative,
  TERM_LENGTH,
} from '@/engine/endings'
import { average, allAbove, clamp, scaleEffectValue, applyEffects } from '@/engine/metrics'
import { INITIAL_PARLIAMENT, INITIAL_PRESIDENT, PARLIAMENT_ACTIONS, PRESIDENT_ACTIONS, CABINET_ACTIONS, DAILY_ACTIONS, MAX_DISSOLUTIONS_PER_TERM, generateRandomPresident } from '@/data/parliament'
import { DEFAULT_PM_STATS, DEFAULT_PM_TRAITS, BACKGROUNDS, TRAITS } from '@/data/pmBackgrounds'
import { INITIAL_PARTIES, buildInitialParliament, PLAYABLE_PARTIES } from '@/data/parties'
import { DEBATE_CARDS, DEBATE_QUESTIONS } from '@/data/debates'
import { CONSTITUENCY_LETTERS } from '@/data/letters'
import { DIPLOMATIC_NOTES } from '@/data/notes'
import { rollFateEvent } from '@/data/fateEvents'
import { pickCabinetChatTemplate } from '@/data/cabinetChats'
import { NATIONAL_POLICIES, getDefaultPolicy, POLICY_CATEGORIES } from '@/data/nationalPolicies'
import {
  INITIAL_COUNTRIES,
  DIPLOMATIC_ACTIONS,
  WAR_STAGES,
  deriveRelationLevel,
  applyCountryEffects,
  resolveWar,
} from '@/data/diplomacy'
import { DOMAIN_ACTIONS, getActionById as getDomainActionById } from '@/data/domainActions'
import {
  getInitialRegions,
  getInitialGovernors,
  REGION_ACTIONS,
  GOVERNOR_INTERACTIONS,
  REPLACEMENT_GOVERNOR_POOL,
} from '@/data/regions'
import type { RegionId } from '@/types/game'
import { INITIAL_MACRO, INITIAL_PERSONAL_LIFE, getPlayerMilitaryStrength } from '@/engine/simulation'
import { INITIAL_MILITARY, GENERAL_CANDIDATES } from '@/data/military'
import { LAW_GROUPS, getDefaultLaws, findLaw } from '@/data/laws'
import { getInitialHandCardIds, getCardById } from '@/data/cards'
import { pickStoryBeat } from '@/data/nationalStory'
import { TASK_TREE, findNewlyCompletedTasks } from '@/data/taskTree'
import {
  findEventChainDefinition,
  getNextChainStage,
} from '@/data/eventChainDefinitions'
import {
  playCard as enginePlayCard,
  shouldTriggerPmqs,
  createPmqsEvent,
  createBackroomEvent,
  createSpinEvent,
  timeoutCardEvent,
  calcSuccessRate,
  checkResources,
  checkConditions,
  checkSlotAccepts,
} from '@/engine/cardEngine'
import type { Card, CardHandItem, DossierCard, CardEventSlot, CardPlayResult } from '@/types/game'

const START_YEAR = 2026
const START_MONTH = 1
const START_DAY = 1

/** 模块级缓存：上次抽到的叙事节拍 ID，用于避免连续两次抽到同一条 */
let lastPickedStoryBeatId: string | null = null

function createInitialState(): GameState {
  return {
    pmName: '总理',
    countryName: '埃尔瓦尼亚共和国',
    term: 1,
    year: START_YEAR,
    month: START_MONTH,
    day: START_DAY,
    totalDays: 1,
    turn: 1,
    screen: 'menu',
    gamePhase: 'character_creation',
    difficulty: 'normal',
    timeSpeed: 0,
    previousTimeSpeed: 3, // 默认恢复到 3 档（标准速度）
    pmBackground: null,
    pmTraits: [],
    pmStats: { ...DEFAULT_PM_STATS },
    pmTraitsNumeric: { ...DEFAULT_PM_TRAITS },
    metrics: { ...INITIAL_METRICS },
    secondary: deriveSecondary(INITIAL_METRICS),
    currentEvent: null,
    currentEmergency: null,
    pendingEvents: [],
    activePendingEventId: null,
    news: [],
    cabinet: INITIAL_CABINET.map((c) => ({ ...c })),
    resolvedEventIds: [],
    pendingChains: [],
    completedInitiatives: [],
    activeInitiatives: [],
    parliament: { ...INITIAL_PARLIAMENT },
    parties: INITIAL_PARTIES.map((p) => ({ ...p })),
    president: { ...INITIAL_PRESIDENT },
    pmActions: [
      { id: 'initiative', label: '发起改革', icon: '📋', description: '启动一项改革计划', cooldown: 0, lastUsedTurn: 0 },
      { id: 'parliament', label: '议会互动', icon: '🏛️', description: '与议会进行互动', cooldown: 0, lastUsedTurn: 0 },
      { id: 'cabinet', label: '内阁调整', icon: '👥', description: '调整内阁成员', cooldown: 0, lastUsedTurn: 0 },
      { id: 'diplomacy', label: '外交行动', icon: '🌐', description: '执行外交行动', cooldown: 0, lastUsedTurn: 0 },
      { id: 'inspect', label: '视察地方', icon: '🚗', description: '下基层视察', cooldown: 8, lastUsedTurn: 0 },
      { id: 'speech', label: '发表演说', icon: '🎙️', description: '向全国发表演说', cooldown: 6, lastUsedTurn: 0 },
    ],
    triggeredEmergencyIds: [],
    eventCooldowns: [],
    achievements: ACHIEVEMENTS.map((a) => ({ ...a })),
    currentDebate: null,
    pendingLetters: [],
    pendingNotes: [],
    currentCountdown: null,
    delayedConsequences: [],
    npcMemories: [],
    breakingNews: null,
    lastBreakingNewsTurn: -999, // 初始值确保首次弹窗不受限
    unreadAlerts: [],
    playerPartyId: null,
    partyPatience: 100,
    completedTaskIds: [],
    lastUltimatumTurn: 0,
    cabinetChats: [],
    activePolicies: POLICY_CATEGORIES.map((cat) => getDefaultPolicy(cat).id),
    adoptedPolicies: POLICY_CATEGORIES.map((cat) => getDefaultPolicy(cat).id),
    lastFateQuarter: 0,
    lastCabinetChatDay: 0,
    countries: INITIAL_COUNTRIES.map((c) => ({ ...c, treaties: [...c.treaties] })),
    // v1.5：地方行政区与长官
    regions: getInitialRegions(),
    governors: getInitialGovernors(),
    regionActionCooldowns: {},
    activeWar: null,
    warHistory: [],
    warCommand: null,
    lastNpcProactiveCheckDay: 0,
    domainActionCooldowns: {},
    domainActionHistory: [],
    eventsHandled: 0,
    // 卡牌系统初始状态
    cardHand: getInitialHandCardIds().map((cardId, idx) => ({
      instanceId: `hand_init_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      cardId,
      lastPlayedDay: 0,
    })),
    dossierCards: [],
    activeCardEvent: null,
    blamePredecessorCount: 0,
    lastBlameDay: 0,
    pendingAppointments: [],
    lastPmqsTriggerDay: 0,
    lastStoryDay: 0,
    currentStoryBeat: null,
    hadLowApproval: false,
    lowestApproval: 100,
    approvalRecoveryAchieved: false,
    taxRate: 'medium',
    lastTaxChangeDay: 0,
    decisionResult: null,
    // 性格特质相关字段：行动力（在 advanceMonth 中重置）与连续负面事件计数
    actionsThisTurn: 0,
    consecutiveNegativeEvents: 0,
    // 突击新闻发布会 minigame 状态
    pressConferenceOpen: false,
    pressConferenceSeverity: 0,
    // 深夜官邸密室游说 minigame 状态
    backroomLobbyOpen: false,
    // 病休状态（健康<30 触发后置 true；每月由 checkPMTraitEvent 维护）
    healthEventActive: false,
    // 宏观经济 / 军事 / 法律 / 个人生活（系统打通新增）
    macro: { ...INITIAL_MACRO },
    military: JSON.parse(JSON.stringify(INITIAL_MILITARY)) as GameState['military'],
    activeLaws: getDefaultLaws(),
    enactingLaw: null,
    personalLife: { ...INITIAL_PERSONAL_LIFE },
    // v1.5：指标历史记录（每月推送一次，最多保留 60 个月/5 年）
    metricHistory: [],
  }
}

interface GameStore extends GameState {
  hasSave: boolean
  gamePage: GamePage
  /** 右侧弹出面板当前展示的页面（议会/民意/内阁），null 表示关闭 */
  sidePanelPage: GamePage | null
  /** 当前行动选项弹窗（点击总理行动后弹出） */
  actionDialog: {
    title: string
    description: string
    options: EventOption[]
    /** 触发该弹窗的行动ID */
    actionId: string
  } | null
  /** 是否显示事件收纳篮 */
  showEventBasket: boolean
  /** 百科弹窗是否打开 */
  encyclopediaOpen: boolean
  /** 开发者控制台是否打开（v0.2.1：从 ~ 快捷键改为右上角菜单二次确认进入） */
  devConsoleOpen: boolean
  setHasSave: (v: boolean) => void
  setGamePage: (page: GamePage) => void
  setSidePanelPage: (page: GamePage | null) => void
  setActionDialog: (dialog: GameStore['actionDialog']) => void
  setDevConsoleOpen: (v: boolean) => void
  startNewGame: (pmName: string, background: PMBackground, traits: PMTrait[], partyId?: string, countryName?: string, numericTraits?: PMTraits, difficulty?: 'normal' | 'hard') => void
  loadGame: (state: GameState) => void
  goTo: (screen: Screen) => void
  chooseOption: (optionId: string) => void
  chooseEmergencyOption: (optionId: string) => void
  chooseActionDialogOption: (optionId: string) => void
  // nextMonth 已移除：月结算统一由 advanceOneDay → eventEngine.advanceMonth 驱动
  advanceOneDay: () => void
  setTimeSpeed: (speed: 0 | 1 | 2 | 3 | 4 | 5) => void
  togglePause: () => void
  /** 开发者控制台用：直接设置 turn，并同步重算 year/month/day/totalDays */
  setTurn: (newTurn: number) => void
  unlockAchievement: (id: string) => void
  startInitiative: (initiativeId: string, targetCountryId?: string) => void
  executeParliamentAction: (actionId: string) => void
  executePresidentAction: (actionId: string) => void
  executeCabinetAction: (actionId: string) => void
  executeDailyAction: (actionId: string) => void
  handleDebate: (cardId: string, success: boolean) => void
  handleLetter: (letterId: string, optionId: string) => void
  handleNote: (noteId: string, accept: boolean) => void
  handleCountdown: (optionId: string) => void
  updatePMStats: (stats: Partial<PMStats>) => void
  /** 更新数值化性格特质（事件后期改变总理特质，如健康下降） */
  updatePMTraitsNumeric: (traits: Partial<PMTraits>) => void
  handleCoalitionNegotiation: (partyId: string, optionId: string) => void
  handleNoConfidenceVote: (optionId: string) => void
  /** 清除 Breaking News 弹窗 */
  dismissBreakingNews: () => void
  /** 清除未读提醒 */
  clearAlerts: (type?: 'debate' | 'letter' | 'note' | 'countdown' | 'breaking' | 'policy' | 'task') => void
  /** 记录 NPC 行为（用于 NPC 记忆系统） */
  recordNPCAction: (npcId: string, actionType: 'promoted' | 'betrayed' | 'dismissed' | 'helped' | 'insulted', description: string) => void
  /** 添加延迟后果 */
  addDelayedConsequence: (consequence: {
    title: string
    description: string
    delayDays: number
    effects: Partial<GameState['metrics']>
    newsTitle: string
    newsSummary: string
  }) => void
  /** 设置倒计时事件 */
  setCountdownEvent: (event: {
    title: string
    description: string
    totalSeconds: number
    options: EventOption[]
  }) => void
  /** 设置 Breaking News */
  setBreakingNews: (news: { title: string; summary: string; tone: 'positive' | 'negative' | 'neutral' }) => void
  /** 打开/关闭事件收纳篮 */
  setShowEventBasket: (v: boolean) => void
  /** 打开/关闭百科弹窗 */
  setEncyclopediaOpen: (v: boolean) => void
  /** 在弹窗中打开某个待处理事件 */
  openPendingEvent: (instanceId: string) => void
  /** 关闭困难模式盲选结果弹窗 */
  dismissDecisionResult: () => void
  /** 关闭当前展示的叙事节拍 */
  dismissStoryBeat: () => void
  /** 调整税率档位（影响每月国库进账、民意、经济；30 天冷却） */
  setTaxRate: (rate: 'low' | 'medium' | 'high' | 'very_high') => void
  /** 关闭当前事件弹窗（不决策，事件仍在收纳篮中） */
  closePendingEvent: () => void
  /** v1.5：对地方行政区执行行动 */
  executeRegionAction: (regionId: RegionId, actionId: string) => void
  /** v1.5：与地方长官互动 */
  interactWithGovernor: (governorId: string, interactionId: string) => void
  /** 决策待处理事件 */
  resolvePendingEvent: (instanceId: string, optionId: string) => void
  /** 玩家主动结束游戏（提前结算） */
  endGameEarly: () => void
  /** 回应内阁部长的聊天消息（选择选项） */
  resolveCabinetChat: (ministerId: string, messageId: string, optionId: string) => void
  /** 切换国家政策（付出代价） */
  switchPolicy: (policyId: string) => void
  /** 执行外交行动 */
  executeDiplomaticAction: (countryId: string, actionId: string) => void
  /** 推进战争事件链到下一阶段（选择某选项后调用） */
  resolveWarStage: (optionId: string) => void
  /** 关闭已结束战争的结算弹窗（保留历史） */
  dismissWarEpilogue: () => void
  /** 执行领域行动（军事/社会/经济/环境） */
  executeDomainAction: (actionId: string) => void
  // ===================== 法律系统 =====================
  /** 启动立法（修改某法律组为指定法律） */
  enactLaw: (groupId: string, lawId: string) => void
  /** v1.5：推动参数化法案（议题×强度×派系）进入立法审议期 */
  enactParameterizedBill: (billId: string) => void
  /** v1.5：放弃参数化法案提案 */
  dismissParameterizedBill: (billId: string) => void
  // ===================== 军事系统 =====================
  /** 调整军费预算（占GDP%，30天冷却） */
  setDefenseBudget: (value: number) => void
  /** 任命将领（从后备池征召或复职） */
  appointGeneral: (generalId: string) => void
  /** 解职将领（政治代价：军方不满） */
  dismissGeneral: (generalId: string) => void
  // ===================== 战争指挥系统 =====================
  /** 将将领指派到指定战区（将领技能加成该战区我军强度） */
  assignGeneralToSector: (generalId: string, sector: string) => void
  /** 将将领从战区撤回（解除指派） */
  unassignGeneralFromSector: (generalId: string) => void
  /** 增援指定战区：消耗国库提升我军强度 */
  reinforceSector: (sector: string) => void
  // ===================== 卡牌系统 =====================
  /** 打出一张手牌至当前激活的卡牌事件槽位 */
  playCardFromHand: (handItemId: string, dossierCardId?: string) => CardPlayResult
  /** 触发 PMQs 卡牌事件（自动暂停时间） */
  triggerPmqsEvent: () => void
  /** 触发密室会谈卡牌事件 */
  triggerBackroomEvent: (billTitle: string) => void
  /** 触发舆论洗白卡牌事件 */
  triggerSpinEvent: (cause: string, approvalLoss: number) => void
  /** 关闭当前卡牌事件（按超时失败结算） */
  dismissCardEvent: () => void
  /** 收集一张黑料卡（调查 NPC 后） */
  collectDossierCard: (npcId: string, npcName: string, partyId: string | undefined, title: string, desc: string, severity: number) => void
  /** 添加卡牌到手牌（事件奖励） */
  addCardToHand: (cardId: string) => void
  /** 移除手牌中的某张卡（打出后或丢弃） */
  removeCardFromHand: (handItemId: string) => void
  /** 卡牌事件超时检查（在 advanceDay 中调用） */
  checkCardEventTimeout: () => void
  /** 启动任期届满大选（暂停时间进入大选阶段） */
  startGeneralElection: () => void
  /** 结算大选结果（won=true 连任，won=false 落败进入结局） */
  resolveGeneralElection: (result: { won: boolean; seats: number; narrative: string }) => void
  // ===================== 突击新闻发布会 minigame =====================
  /** minigame 是否开启 */
  pressConferenceOpen: boolean
  /** 当前丑闻严重度（0-100） */
  pressConferenceSeverity: number
  /** 启动突击新闻发布会（暂停时间） */
  startPressConference: (severity: number) => void
  /** 结束突击新闻发布会，应用最终效果到 metrics 并推送新闻，恢复时间 */
  endPressConference: (result: { finalSeverity: number; approvalDelta: number; prestigeDelta: number }) => void
  // ===================== 深夜官邸密室游说 minigame =====================
  /** minigame 是否开启 */
  backroomLobbyOpen: boolean
  /** 启动深夜官邸密室游说（暂停时间） */
  startBackroomLobby: () => void
  /** 结束密室游说，根据结果应用消耗与奖励并恢复时间 */
  endBackroomLobby: (result: {
    success: boolean
    totalInfluence: number
    bribedReps: { id: string; influence: number }[]
    usedThreaten: boolean
  }) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),
  hasSave: false,
  gamePage: 'dashboard',
  sidePanelPage: null,
  actionDialog: null,
  showEventBasket: false,
  encyclopediaOpen: false,
  pressConferenceOpen: false,
  pressConferenceSeverity: 0,
  backroomLobbyOpen: false,
  devConsoleOpen: false,

  setHasSave: (v) => set({ hasSave: v }),
  setGamePage: (page) => set({ gamePage: page }),
  setSidePanelPage: (page) => set({ sidePanelPage: page }),
  setActionDialog: (dialog) => set({ actionDialog: dialog }),
  setShowEventBasket: (v) => set({ showEventBasket: v }),
  setEncyclopediaOpen: (v) => set({ encyclopediaOpen: v }),
  setDevConsoleOpen: (v) => set({ devConsoleOpen: v }),

  startNewGame: (pmName, background, traits, partyId, countryName, numericTraits, difficulty) => {
    const state = createInitialState()
    state.pmName = pmName.trim() || '总理'
    state.countryName = (countryName?.trim() || '埃尔瓦尼亚共和国')
    state.pmBackground = background
    state.pmTraits = traits
    state.difficulty = difficulty ?? 'normal'
    // 应用数值化性格特质（滑块）；若未提供则使用默认值
    state.pmTraitsNumeric = numericTraits ? { ...numericTraits } : { ...DEFAULT_PM_TRAITS }

    // 应用背景加成
    const bgData = BACKGROUNDS.find((b) => b.id === background)
    if (bgData) {
      state.pmStats = { ...state.pmStats, ...bgData.initialStats }
    }

    // 应用特质加成
    traits.forEach((traitId) => {
      const traitData = TRAITS.find((t) => t.id === traitId)
      if (traitData) {
        state.pmStats = {
          politicalCapital: state.pmStats.politicalCapital + (traitData.initialStats.politicalCapital || 0),
          partyPrestige: state.pmStats.partyPrestige + (traitData.initialStats.partyPrestige || 0),
          rhetoric: state.pmStats.rhetoric + (traitData.initialStats.rhetoric || 0),
          riskIndex: state.pmStats.riskIndex + (traitData.initialStats.riskIndex || 0),
        }
      }
    })

    // 根据所选政党构造议会
    if (partyId) {
      state.parties = buildInitialParliament(partyId).map((p) => ({ ...p }))
      state.playerPartyId = partyId
      state.partyPatience = 100
      state.lastUltimatumTurn = 0
      const ruling = state.parties.find((p) => p.id === partyId)
      if (ruling) {
        state.parliament.rulingPartySeats = ruling.seats
        state.parliament.confidence = 55 + Math.floor(ruling.favorability / 5)
      }
    }

    // 随机生成总统（60% 同党，40% 异党），异党总统增加游戏挑战
    state.president = generateRandomPresident(partyId, false)

    // 进入游戏，但先进入组阁阶段
    state.screen = 'game'
    state.gamePhase = 'coalition'
    state.timeSpeed = 0
    // 开局欢迎新闻
    state.news = [
      makeNews(
        state,
        `${state.pmName}就任${state.countryName}总理`,
        '新总理在国会宣誓就职，承诺带领国家走向繁荣。',
        '决策',
        'positive',
      ),
    ]
    // 解锁初登大宝成就
    state.achievements = state.achievements.map((a) =>
      a.id === 'ach_first' ? { ...a, unlocked: true } : a,
    )
    // 组阁阶段不触发开局事件
    state.currentEvent = null
    set({ ...state, hasSave: false })
  },

  loadGame: (state) => set({
    ...state,
    // 兼容旧存档：补齐外交/战争字段
    countries: state.countries && state.countries.length > 0
      ? state.countries
      : INITIAL_COUNTRIES.map((c) => ({ ...c, treaties: [...c.treaties] })),
    activeWar: state.activeWar ?? null,
    warHistory: state.warHistory ?? [],
    // 兼容旧存档：补齐战争指挥面板与 NPC 主动行动字段
    warCommand: state.warCommand ?? null,
    lastNpcProactiveCheckDay: state.lastNpcProactiveCheckDay ?? 0,
    // 兼容旧存档：补齐多阶段事件链字段（v1.5 新增；旧存档无此字段时初始化为空数组）
    pendingChains: state.pendingChains ?? [],
    // 兼容旧存档：补齐领域行动字段
    domainActionCooldowns: state.domainActionCooldowns ?? {},
    domainActionHistory: state.domainActionHistory ?? [],
    // 加载存档后强制暂停时间，避免一加载就开始快速推进
    timeSpeed: 0,
    previousTimeSpeed: state.previousTimeSpeed ?? 3,
    // 清除可能卡住的全屏弹窗状态
    actionDialog: null,
    showEventBasket: false,
    activePendingEventId: null,
    breakingNews: null,
    // 加载存档后关闭开发者控制台（避免残留状态）
    devConsoleOpen: false,
    lastBreakingNewsTurn: state.lastBreakingNewsTurn ?? -999,
    currentCountdown: null,
    // 兼容旧存档：补齐 adoptedPolicies（历史启用记录，用于政策树前置链）
    adoptedPolicies: state.adoptedPolicies ?? state.activePolicies,
    // 兼容旧存档：补齐数值化性格特质
    pmTraitsNumeric: state.pmTraitsNumeric ?? { ...DEFAULT_PM_TRAITS },
    // 兼容旧存档：补齐难度字段
    difficulty: state.difficulty ?? 'normal',
    // 兼容旧存档：补齐税率字段
    taxRate: state.taxRate ?? 'medium',
    lastTaxChangeDay: state.lastTaxChangeDay ?? 0,
    // 兼容旧存档：补齐执政党耐心值/最后通牒追踪字段（政治机制激活用）
    partyPatience: state.partyPatience ?? 100,
    completedTaskIds: state.completedTaskIds ?? [],
    lastUltimatumTurn: state.lastUltimatumTurn ?? 0,
    // 兼容旧存档：补齐盲选结果弹窗字段
    decisionResult: state.decisionResult ?? null,
    // 兼容旧存档：补齐卡牌系统字段
    cardHand: state.cardHand ?? getInitialHandCardIds().map((cardId, idx) => ({
      instanceId: `hand_load_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      cardId,
      lastPlayedDay: 0,
    })),
    dossierCards: state.dossierCards ?? [],
    activeCardEvent: null, // 加载时清除未完成的卡牌事件
    blamePredecessorCount: state.blamePredecessorCount ?? 0,
    lastBlameDay: state.lastBlameDay ?? 0,
    pendingAppointments: state.pendingAppointments ?? [],
    lastPmqsTriggerDay: state.lastPmqsTriggerDay ?? 0,
    lastStoryDay: state.lastStoryDay ?? 0,
    currentStoryBeat: state.currentStoryBeat ?? null,
    hadLowApproval: state.hadLowApproval ?? false,
    lowestApproval: state.lowestApproval ?? 100,
    approvalRecoveryAchieved: state.approvalRecoveryAchieved ?? false,
    // 兼容旧存档：补齐性格特质相关字段（行动力与连续负面事件计数）
    actionsThisTurn: state.actionsThisTurn ?? 0,
    consecutiveNegativeEvents: state.consecutiveNegativeEvents ?? 0,
    // 兼容旧存档：清除可能卡住的突击新闻发布会 minigame 状态
    pressConferenceOpen: false,
    pressConferenceSeverity: state.pressConferenceSeverity ?? 0,
    // 兼容旧存档：清除可能卡住的密室游说 minigame 状态（加载时永远不应处于开启状态）
    backroomLobbyOpen: false,
    // 兼容旧存档：补齐病休状态字段（旧存档无此字段时按当前健康值判定）
    healthEventActive: state.healthEventActive ?? false,
    // 兼容旧存档：补齐宏观经济/军事/法律/个人生活字段
    macro: state.macro ?? { ...INITIAL_MACRO },
    military: state.military ?? (JSON.parse(JSON.stringify(INITIAL_MILITARY)) as GameState['military']),
    activeLaws: state.activeLaws ?? getDefaultLaws(),
    enactingLaw: state.enactingLaw ?? null,
    personalLife: state.personalLife ?? { ...INITIAL_PERSONAL_LIFE },
    // 兼容旧存档：补齐指标历史记录字段（v1.5 新增；旧存档无此字段时初始化为空数组）
    metricHistory: state.metricHistory ?? [],
    // v0.3 兜底：议员提案 / NPC 记忆 / 主动行动冷却（旧存档无这些字段）
    proposedParameterizedBills: state.proposedParameterizedBills ?? [],
    npcMemories: state.npcMemories ?? [],
    eventCooldowns: state.eventCooldowns ?? [],
    // 清除大选触发标志和快照（读档后不应处于大选阶段或触发大选）
    electionSnapshot: undefined,
    // 确保 gamePhase 为 playing（防止存档时处于 election/coalition 等特殊阶段）
    gamePhase: 'playing',
  }),

  goTo: (screen) => set({ screen }),

  chooseOption: (optionId) => {
    const state = get()
    if (!state.currentEvent) return
    const event = state.currentEvent
    const option = event.options.find((o) => o.id === optionId)
    const { state: next } = resolveOption(state, event, optionId)
    // 若该选项标记为结束游戏（如主动辞职），立即进入结算
    if (option?.endsGame) {
      const grade = calcGrade(next.metrics)
      set({
        ...next,
        endingReason: '总理主动辞职，提前结束任期。',
        endingGrade: grade,
        screen: 'ending',
        timeSpeed: 0,
      })
      checkAchievements(set, get, { ...next, endingGrade: grade })
      return
    }
    // 丑闻类事件触发突击新闻发布会（50% 概率）
    tryTriggerPressConference(next, event.id)
    set({ ...next })
    checkAchievements(set, get, next)
  },

  chooseEmergencyOption: (optionId) => {
    const state = get()
    if (!state.currentEmergency) return
    const emergency = state.currentEmergency
    const option = emergency.options.find((o) => o.id === optionId)
    const { state: next } = resolveOption(state, emergency, optionId)
    if (option?.endsGame) {
      const grade = calcGrade(next.metrics)
      set({
        ...next,
        endingReason: '总理主动辞职，提前结束任期。',
        endingGrade: grade,
        screen: 'ending',
        timeSpeed: 0,
      })
      checkAchievements(set, get, { ...next, endingGrade: grade })
      return
    }
    // 丑闻类紧急事件也触发突击新闻发布会（50% 概率）
    tryTriggerPressConference(next, emergency.id)
    set({ ...next })
    checkAchievements(set, get, next)
  },

  // 原 nextMonth（死代码，全库无调用点）已删除：其中指标历史与归因聚合逻辑已迁移至 eventEngine.advanceMonth
  unlockAchievement: (id) =>
    set((s) => ({
      achievements: s.achievements.map((a) =>
        a.id === id && !a.unlocked ? { ...a, unlocked: true } : a,
      ),
    })),

  startInitiative: (initiativeId, targetCountryId) => {
    const state = get()
    const initiative = INITIATIVES.find((i) => i.id === initiativeId)
    if (!initiative) return

    // 外交类改革必须指定目标国
    if (initiative.requiresCountryTarget && !targetCountryId) return
    if (targetCountryId && !state.countries.some((c) => c.id === targetCountryId)) return

    // 检查前提条件
    if (initiative.prerequisites) {
      for (const [key, value] of Object.entries(initiative.prerequisites)) {
        if (state.metrics[key as keyof typeof state.metrics] < (value ?? 0)) {
          return // 不满足前提条件
        }
      }
    }

    // 检查是否已完成（once 类型）
    if (initiative.once && state.completedInitiatives.includes(initiativeId)) {
      return
    }

    // 检查是否正在进行
    if (state.activeInitiatives.some((ai) => ai.initiativeId === initiativeId)) {
      return
    }

    // 改革树前后链：前置改革必须已完成
    if (initiative.requiresInitiative && initiative.requiresInitiative.length > 0) {
      const allMet = initiative.requiresInitiative.every((iid) =>
        state.completedInitiatives.includes(iid),
      )
      if (!allMet) return
    }

    // 检查国库是否足够
    if (state.metrics.treasury < initiative.cost) {
      return
    }

    // 检查政治资本是否足够（重构：改革同步消耗政治资本）
    const politicalCapitalCost = initiative.politicalCapitalCost ?? Math.max(5, Math.round(initiative.cost / 2))
    if (state.pmStats.politicalCapital < politicalCapitalCost) {
      return
    }

    // 启动改革
    const newActive: ActiveInitiative = {
      initiativeId,
      elapsed: 0,
      duration: initiative.duration,
      name: initiative.name,
      ...(targetCountryId ? { targetCountryId } : {}),
    }

    // 外交类改革：在改革名称后追加目标国名
    const targetCountry = targetCountryId
      ? state.countries.find((c) => c.id === targetCountryId)
      : undefined
    const displayName = targetCountry
      ? `${initiative.name}（目标：${targetCountry.name}）`
      : initiative.name

    // 扣除国库和政治资本
    const next: GameState = {
      ...state,
      metrics: {
        ...state.metrics,
        treasury: clamp(state.metrics.treasury - initiative.cost),
      },
      pmStats: {
        ...state.pmStats,
        politicalCapital: clamp(state.pmStats.politicalCapital - politicalCapitalCost),
      },
      activeInitiatives: [...state.activeInitiatives, { ...newActive, name: displayName }],
      news: [
        makeNews(
          state,
          `总理启动改革：${displayName}`,
          `耗资国库 ${initiative.cost}、政治资本 ${politicalCapitalCost}。${initiative.description}`,
          '改革',
          'positive',
        ),
        ...state.news,
      ],
    }

    // 应用派系影响（改革影响利益集团好感度）
    if (initiative.factionEffects) {
      next.parties = next.parties.map((p) => {
        const change = initiative.factionEffects?.[p.id]
        if (change) {
          return { ...p, favorability: clamp(p.favorability + change) }
        }
        return p
      })
    } else {
      // 默认派系影响：激进改革降低保守派好感，温和改革提升温和派好感
      const isRadical = initiative.radical
      next.parties = next.parties.map((p) => {
        if (p.id === 'party_ruling') return p
        // 简化：根据改革类别调整派系好感度
        if (isRadical) {
          return { ...p, favorability: clamp(p.favorability - 3) }
        }
        return p
      })
    }

    set({ ...next })
  },

  executeParliamentAction: (actionId) => {
    const state = get()
    const action = PARLIAMENT_ACTIONS.find((a) => a.id === actionId)
    if (!action || !action.available(state)) return

    const result = action.execute(state)
    const news = makeNews(state, result.news.title, result.news.summary, '议会', result.news.tone)

    const next: GameState = {
      ...state,
      ...result.state,
      secondary: deriveSecondary(result.state.metrics ?? state.metrics),
      news: [news, ...state.news],
    }

    set({ ...next })
  },

  executePresidentAction: (actionId) => {
    const state = get()
    const action = PRESIDENT_ACTIONS.find((a) => a.id === actionId)
    if (!action || !action.available(state)) return

    const result = action.execute(state)
    const news = makeNews(state, result.news.title, result.news.summary, '决策', result.news.tone)

    const next: GameState = {
      ...state,
      ...result.state,
      secondary: deriveSecondary(result.state.metrics ?? state.metrics),
      news: [news, ...state.news],
    }

    set({ ...next })
  },

  executeCabinetAction: (actionId) => {
    const state = get()
    const action = CABINET_ACTIONS.find((a) => a.id === actionId)
    if (!action || !action.available(state)) return

    const result = action.execute(state)
    const news = makeNews(state, result.news.title, result.news.summary, '内阁', result.news.tone)

    const next: GameState = {
      ...state,
      ...result.state,
      news: [news, ...state.news],
    }

    set({ ...next })
  },

  executeDailyAction: (actionId) => {
    const state = get()
    const action = DAILY_ACTIONS.find((a) => a.id === actionId)
    if (!action) return

    // 行动力检查：本月行动次数已耗尽时禁止执行任何日常行动
    if (state.actionsThisTurn <= 0) return

    const lastUsedTurn = state.pmActions.find((a) => a.id === actionId)?.lastUsedTurn ?? 0
    if (!action.available(state, { [actionId]: lastUsedTurn })) return

    // 重构：弹出行动选项弹窗，提供 2-4 个具体决策分支
    // 根据行动类型生成不同的选项
    const dialogOptions: EventOption[] = generateDailyActionOptions(actionId, state)

    set({
      actionDialog: {
        title: action.label,
        description: action.description,
        options: dialogOptions,
        actionId,
      },
    })
  },

  handleDebate: (cardId, success) => {
    const state = get()
    if (!state.currentDebate) return

    const card = state.currentDebate.cards.find((c) => c.id === cardId)
    if (!card) return

    const effects = success ? card.successEffects : card.failEffects
    const newsData = success ? card.successNews : card.failNews

    // 应用效果
    const metrics = { ...state.metrics }
    const pmStats = { ...state.pmStats }

    for (const [key, value] of Object.entries(effects)) {
      if (key in metrics) {
        metrics[key as keyof typeof metrics] = clamp(metrics[key as keyof typeof metrics] + (value ?? 0))
      } else if (key in pmStats) {
        pmStats[key as keyof typeof pmStats] = clamp(pmStats[key as keyof typeof pmStats] + (value ?? 0))
      }
    }

    const news = makeNews(state, newsData.title, newsData.summary, '议会', success ? 'positive' : 'negative')

    set({
      metrics,
      pmStats,
      currentDebate: null,
      news: [news, ...state.news],
    })
  },

  handleLetter: (letterId, optionId) => {
    const state = get()
    const letter = state.pendingLetters.find((l) => l.id === letterId)
    if (!letter) return

    const option = letter.options.find((o) => o.id === optionId)
    if (!option) return

    // 困难模式：加成打折、扣分放大
    const metrics = applyEffects(state.metrics, option.effects, state.difficulty)

    const news = makeNews(state, option.newsTitle, option.newsSummary, '决策', 'neutral')

    set({
      metrics,
      pendingLetters: state.pendingLetters.filter((l) => l.id !== letterId),
      news: [news, ...state.news],
    })
  },

  handleNote: (noteId, accept) => {
    const state = get()
    const note = state.pendingNotes.find((n) => n.id === noteId)
    if (!note) return

    const effects = accept ? note.acceptEffects : note.rejectEffects
    const newsData = accept ? note.acceptNews : note.rejectNews

    const metrics = { ...state.metrics }
    for (const [key, value] of Object.entries(effects)) {
      metrics[key as keyof typeof metrics] = clamp(metrics[key as keyof typeof metrics] + (value ?? 0))
    }

    const news = makeNews(state, newsData.title, newsData.summary, '外交', accept ? 'positive' : 'negative')

    set({
      metrics,
      pendingNotes: state.pendingNotes.filter((n) => n.id !== noteId),
      news: [news, ...state.news],
    })
  },

  updatePMStats: (stats) => {
    const state = get()
    const pmStats = { ...state.pmStats }
    for (const [key, value] of Object.entries(stats)) {
      pmStats[key as keyof typeof pmStats] = clamp(pmStats[key as keyof typeof pmStats] + (value ?? 0))
    }
    set({ pmStats })
  },

  updatePMTraitsNumeric: (traits) => {
    const state = get()
    const pmTraitsNumeric = { ...state.pmTraitsNumeric }
    for (const [key, value] of Object.entries(traits)) {
      const k = key as keyof PMTraits
      pmTraitsNumeric[k] = clamp(pmTraitsNumeric[k] + (value ?? 0))
    }
    set({ pmTraitsNumeric })
  },

  handleCoalitionNegotiation: (partyId, optionId) => {
    const state = get()
    const party = state.parties.find((p) => p.id === partyId)
    if (!party) return

    // 模拟选项效果（这里简化处理，实际应该从事件数据中获取）
    const favorabilityChange = optionId === 'accept' ? 20 : optionId === 'partial' ? 8 : -15
    const politicalCapitalChange = optionId === 'accept' ? -15 : optionId === 'partial' ? -5 : 0
    const approvalChange = optionId === 'accept' ? 5 : optionId === 'partial' ? 2 : -3
    const inCoalition = optionId === 'accept' || (optionId === 'partial' && party.favorability + favorabilityChange >= 60)

    const parties = state.parties.map((p) =>
      p.id === partyId
        ? {
            ...p,
            favorability: clamp(p.favorability + favorabilityChange),
            inCoalition: inCoalition,
          }
        : p
    )

    const pmStats = { ...state.pmStats }
    pmStats.politicalCapital = clamp(pmStats.politicalCapital + politicalCapitalChange)

    const metrics = { ...state.metrics }
    metrics.approval = clamp(metrics.approval + approvalChange)

    const news = makeNews(
      state,
      optionId === 'accept' ? `${party.name}加入执政联盟` : optionId === 'partial' ? `与${party.name}谈判取得进展` : `${party.name}拒绝合作`,
      optionId === 'accept' ? '执政联盟席位增加' : optionId === 'partial' ? '双方仍在协商中' : '谈判破裂',
      '议会',
      optionId === 'accept' ? 'positive' : optionId === 'partial' ? 'neutral' : 'negative'
    )

    set({
      parties,
      pmStats,
      metrics,
      news: [news, ...state.news],
    })
  },

  handleNoConfidenceVote: (optionId) => {
    const state = get()

    // 根据选项决定结果
    let passed = false
    let politicalCapitalChange = 0
    let approvalChange = 0
    let prestigeChange = 0
    let stabilityChange = 0
    let confidenceChange = 0

    if (optionId === 'negotiate') {
      passed = false
      politicalCapitalChange = -25
      approvalChange = 8
      prestigeChange = -6
      stabilityChange = 2
      confidenceChange = 10
    } else if (optionId === 'speech') {
      // 成功率基于辩论技巧和民意
      const successRate = (state.pmStats.rhetoric + state.metrics.approval) / 200
      passed = Math.random() > successRate
      if (!passed) {
        approvalChange = 12
        prestigeChange = 8
        stabilityChange = -5
        confidenceChange = 15
      } else {
        approvalChange = -8
        prestigeChange = -10
        confidenceChange = -20
      }
    } else if (optionId === 'accept') {
      passed = true
      approvalChange = -10
      prestigeChange = -15
    }

    const pmStats = { ...state.pmStats }
    pmStats.politicalCapital = clamp(pmStats.politicalCapital + politicalCapitalChange)
    pmStats.partyPrestige = clamp(pmStats.partyPrestige + prestigeChange)

    const metrics = { ...state.metrics }
    metrics.approval = clamp(metrics.approval + approvalChange)
    metrics.stability = clamp(metrics.stability + stabilityChange)

    const parliament = { ...state.parliament }
    parliament.confidence = clamp(parliament.confidence + confidenceChange)

    const news = makeNews(
      state,
      passed ? '不信任投票通过' : '不信任投票被否决',
      passed ? '总理被迫下台' : '总理成功保住职位',
      '议会',
      passed ? 'negative' : 'positive'
    )

    if (passed) {
      // 游戏结束
      set({
        pmStats,
        metrics,
        parliament,
        news: [news, ...state.news],
        endingReason: '不信任投票通过，被迫下台',
        endingGrade: 'D',
        screen: 'ending',
      })
    } else {
      set({
        pmStats,
        metrics,
        parliament,
        news: [news, ...state.news],
      })
    }
  },

  // ===== 新增方法 =====

  chooseActionDialogOption: (optionId) => {
    const state = get()
    if (!state.actionDialog) return
    const option = state.actionDialog.options.find((o) => o.id === optionId)
    if (!option) return

    const actionId = state.actionDialog.actionId

    // 应用总理性格特质缩放（果断、韧性）→ 得到缩放后的 effects
    const { scaledEffects, isNegative } = applyTraitScaling(option.effects, state)

    // 魅力外交加成：diplomacy 行动或 dip_ 前缀选项，魅力 > 70 时 diplomacy 额外 +2
    const isDiplomaticAction = actionId === 'diplomacy' || optionId.startsWith('dip_')
    const finalEffects: Partial<typeof option.effects> = { ...scaledEffects }
    if (isDiplomaticAction && state.pmTraitsNumeric.charisma > 70) {
      finalEffects.diplomacy = (finalEffects.diplomacy ?? 0) + 2
    }

    // 应用效果（困难模式缩放）
    const metrics = applyEffects(state.metrics, finalEffects, state.difficulty)

    // 应用二级指标效果
    const secondary = { ...state.secondary }
    if (option.secondaryEffects) {
      for (const [key, value] of Object.entries(option.secondaryEffects)) {
        const k = key as keyof typeof secondary
        secondary[k] = clamp(secondary[k] + (value ?? 0))
      }
    }

    // 更新行动冷却
    const pmActions = state.pmActions.map((a) =>
      a.id === actionId ? { ...a, lastUsedTurn: state.turn } : a,
    )

    const news = makeNews(state, option.newsTitle, option.newsSummary, '决策', option.tone ?? 'neutral')

    // 特殊处理：跳转到对应页面
    let gamePage = state.gamePage
    if (optionId === 'go_initiatives') gamePage = 'initiatives'
    if (optionId === 'go_cabinet') gamePage = 'cabinet'

    // 行动力递减：每次执行日常行动后 actionsThisTurn--（最低 0）
    const actionsThisTurn = Math.max(0, state.actionsThisTurn - 1)
    // 连续负面事件计数：净负面 ++，否则重置为 0
    const consecutiveNegativeEvents = isNegative
      ? state.consecutiveNegativeEvents + 1
      : 0

    // 总理日常行动不属于突发新闻，仅记录到新闻列表，不弹 Breaking News
    set({
      metrics,
      secondary,
      pmActions,
      actionDialog: null,
      gamePage,
      actionsThisTurn,
      consecutiveNegativeEvents,
      news: [news, ...state.news],
    })
  },

  advanceOneDay: () => {
    const state = get()
    // 倒计时事件存在时仍暂停时间（强制玩家先处理紧急决策）
    if (state.currentCountdown) return
    if (state.gamePhase !== 'playing') return

    let next = advanceDay(state)

    // v1.5：检查待处理事件是否超时——自动选择"最差"选项，让忽视有代价
    // （此前是选默认选项，等于忽视无代价，玩家可拖延所有事件）
    const expiredEvents = next.pendingEvents.filter(
      (e) => e.deadlineDay <= next.totalDays,
    )
    if (expiredEvents.length > 0) {
      for (const ev of expiredEvents) {
        const worstId = pickWorstOptionId(ev.options, ev.defaultOptionId)
        next = resolvePendingEventInternal(next, ev.instanceId, worstId, true)
      }
    }

    // 检查倒计时事件触发（极端危急状态下触发，暂停时间强制限时决策）
    // 每天 17:00 整点检查一次（totalDays % 1 === 0 即每天检查），但通过冷却机制控制频率
    if (!next.currentCountdown && !next.currentEmergency) {
      const countdownEvent = checkCountdownEvent(next)
      if (countdownEvent) {
        next.currentCountdown = {
          id: `cd_${countdownEvent.id}_day${next.totalDays}`,
          title: countdownEvent.title,
          description: countdownEvent.description,
          remainingSeconds: countdownEvent.totalSeconds,
          totalSeconds: countdownEvent.totalSeconds,
          options: countdownEvent.options,
        }
        next.timeSpeed = 0 // 自动暂停游戏时间
        // 记录触发（用于冷却检查）：以 cd_<id>_day<totalDays> 格式存入 triggeredEmergencyIds
        next.triggeredEmergencyIds = [
          ...next.triggeredEmergencyIds,
          `cd_${countdownEvent.id}_day${next.totalDays}`,
        ]
        next.unreadAlerts = [
          ...next.unreadAlerts,
          { type: 'countdown', title: countdownEvent.title, timestamp: Date.now() },
        ]
      }
    }

    // 叙事节拍：展示 30 天后自动清除；每 ~45 天抽取一条新节拍（避开上次的 ID）
    if (next.currentStoryBeat && next.totalDays - next.lastStoryDay >= 30) {
      next.currentStoryBeat = null
    }
    if (!next.currentStoryBeat && next.totalDays - next.lastStoryDay >= 45) {
      const beat = pickStoryBeat(next, lastPickedStoryBeatId)
      if (beat) {
        next.currentStoryBeat = beat
        next.lastStoryDay = next.totalDays
        lastPickedStoryBeatId = beat.id
      }
    }

    // 任期届满大选检查（实时制）：eventEngine.advanceDay 会在 turn % TERM_LENGTH === 0 时设置 __triggerElection 标志
    if ((next as any).__triggerElection) {
      delete (next as any).__triggerElection
      set({
        ...next,
        gamePhase: 'election',
        timeSpeed: 0,
        electionSnapshot: {
          approval: next.metrics.approval,
          seats: next.parliament.rulingPartySeats,
          term: next.term,
        },
        news: [
          makeNews(
            next,
            `任期届满 · 第 ${next.term} 届大选正式开启`,
            '四年任期已满，全国进入大选周期。请组织竞选团队，迎接选民裁决。',
            '决策',
            'neutral',
          ),
          ...next.news,
        ],
      })
      checkAchievements(set, get, next)
      applyTaskCompletions(set, get, next)
      return
    }

    set({ ...next })
    checkAchievements(set, get, next)
    applyTaskCompletions(set, get, next)
  },

  setTimeSpeed: (speed) => {
    // 记录非零速度作为"上次速度"，供空格键恢复使用
    if (speed > 0) {
      set({ timeSpeed: speed, previousTimeSpeed: speed as 1 | 2 | 3 | 4 | 5 })
    } else {
      set({ timeSpeed: 0 })
    }
  },

  togglePause: () => {
    const current = get().timeSpeed
    if (current === 0) {
      // 恢复到上次设置的非零速度
      set({ timeSpeed: get().previousTimeSpeed || 1 })
    } else {
      // 暂停：先记录当前速度
      set({ previousTimeSpeed: current, timeSpeed: 0 })
    }
  },

  setTurn: (newTurn) => {
    // 限制范围 1-200，向下取整
    const clamped = Math.max(1, Math.min(200, Math.floor(newTurn)))
    // 每 turn = 1 个月，基于起始年月重算 year/month
    const year = START_YEAR + Math.floor((START_MONTH - 1 + clamped - 1) / 12)
    const month = ((START_MONTH - 1 + clamped - 1) % 12) + 1
    const day = START_DAY
    const totalDays = clamped * 30 // 粗略换算
    set({ turn: clamped, year, month, day, totalDays })
  },

  handleCountdown: (optionId) => {
    const state = get()
    if (!state.currentCountdown) return
    const option = state.currentCountdown.options.find((o) => o.id === optionId)
    if (!option) return

    // 困难模式缩放
    const metrics = applyEffects(state.metrics, option.effects, state.difficulty)

    const news = makeNews(state, option.newsTitle, option.newsSummary, '紧急', option.tone ?? 'neutral')

    // Breaking News 冷却：距上次弹窗至少 2 个月
    const canShowBreaking = state.turn - state.lastBreakingNewsTurn >= 2
    set({
      metrics,
      currentCountdown: null,
      news: [news, ...state.news],
      breakingNews: canShowBreaking ? {
        id: `breaking_${Date.now()}`,
        title: option.newsTitle,
        summary: option.newsSummary,
        tone: option.tone ?? 'neutral',
      } : null,
      ...(canShowBreaking ? { lastBreakingNewsTurn: state.turn } : {}),
    })
  },

  dismissBreakingNews: () => set((s) => ({ breakingNews: null, lastBreakingNewsTurn: s.turn })),

  clearAlerts: (type) => set((s) => ({
    unreadAlerts: type ? s.unreadAlerts.filter((a) => a.type !== type) : [],
  })),

  recordNPCAction: (npcId, actionType, description) => {
    const state = get()
    const existing = state.npcMemories.find((m) => m.npcId === npcId)
    const newEvent = {
      type: actionType,
      day: state.totalDays,
      description,
    }

    let npcMemories
    if (existing) {
      // 更新语气：被背叛/解职后语气变差
      let tone = existing.tone
      if (actionType === 'betrayed' || actionType === 'dismissed' || actionType === 'insulted') {
        tone = existing.tone === 'hostile' ? 'hostile' : 'resentful'
      } else if (actionType === 'promoted' || actionType === 'helped') {
        tone = existing.tone === 'friendly' ? 'friendly' : 'neutral'
      }
      npcMemories = state.npcMemories.map((m) =>
        m.npcId === npcId
          ? { ...m, events: [...m.events, newEvent], tone }
          : m,
      )
    } else {
      let tone: 'friendly' | 'neutral' | 'resentful' | 'hostile' = 'neutral'
      if (actionType === 'betrayed' || actionType === 'dismissed' || actionType === 'insulted') {
        tone = 'resentful'
      } else if (actionType === 'promoted' || actionType === 'helped') {
        tone = 'friendly'
      }
      npcMemories = [
        ...state.npcMemories,
        { npcId, events: [newEvent], tone },
      ]
    }

    set({ npcMemories })
  },

  addDelayedConsequence: (consequence) => {
    const state = get()
    const newConsequence = {
      id: `delayed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      triggerDay: state.totalDays + consequence.delayDays,
      title: consequence.title,
      description: consequence.description,
      effects: consequence.effects,
      newsTitle: consequence.newsTitle,
      newsSummary: consequence.newsSummary,
    }
    set({
      delayedConsequences: [...state.delayedConsequences, newConsequence],
    })
  },

  setCountdownEvent: (event) => {
    set({
      currentCountdown: {
        id: `countdown_${Date.now()}`,
        title: event.title,
        description: event.description,
        remainingSeconds: event.totalSeconds,
        totalSeconds: event.totalSeconds,
        options: event.options,
      },
      timeSpeed: 0, // 自动暂停
      unreadAlerts: [
        ...get().unreadAlerts,
        { type: 'countdown', title: event.title, timestamp: Date.now() },
      ],
    })
  },

  setBreakingNews: (news) => {
    const state = get()
    // 冷却限制：距上次弹窗至少 2 个月
    if (state.turn - state.lastBreakingNewsTurn < 2) {
      // 冷却中：不弹窗，但仍加入未读提醒
      set({
        unreadAlerts: [
          ...state.unreadAlerts,
          { type: 'breaking', title: news.title, timestamp: Date.now() },
        ],
      })
      return
    }
    set({
      breakingNews: {
        id: `breaking_${Date.now()}`,
        title: news.title,
        summary: news.summary,
        tone: news.tone,
      },
      lastBreakingNewsTurn: state.turn,
      unreadAlerts: [
        ...state.unreadAlerts,
        { type: 'breaking', title: news.title, timestamp: Date.now() },
      ],
    })
  },

  openPendingEvent: (instanceId) => {
    set({ activePendingEventId: instanceId })
  },

  dismissDecisionResult: () => {
    set({ decisionResult: null })
  },

  dismissStoryBeat: () => {
    set({ currentStoryBeat: null })
  },

  setTaxRate: (rate) => {
    const state = get()
    // 30 天冷却：防止频繁调整
    if (state.totalDays - state.lastTaxChangeDay < 30 && state.lastTaxChangeDay > 0) {
      return
    }
    if (state.taxRate === rate) return
    // 调整税率会立即产生小幅民意/稳定波动（除中立切换到中税外）
    const cur = state.taxRate
    let approvalDelta = 0
    let stabilityDelta = 0
    // 提税惹民怨，降税得民心
    const order: Array<typeof cur> = ['low', 'medium', 'high', 'very_high']
    const curIdx = order.indexOf(cur)
    const newIdx = order.indexOf(rate)
    const diff = newIdx - curIdx
    approvalDelta = -diff * 2 // 升一档 -2 民意，降一档 +2
    stabilityDelta = diff > 0 ? -1 : (diff < 0 ? 1 : 0) // 加税引发轻微不安
    const clamp = (v: number) => Math.max(0, Math.min(100, v))
    const news = makeNews(
      state,
      rate === 'very_high' ? '政府大幅提高税率'
        : rate === 'high' ? '政府上调税率'
        : rate === 'low' ? '政府宣布减税'
        : '政府恢复标准税率',
      rate === 'very_high' ? `${state.pmName}总理宣布实施战时级高税收政策，民间反应强烈。`
        : rate === 'high' ? `财政部上调各税种征收比例，预计国库月进账显著增加。`
        : rate === 'low' ? `减税方案正式生效，民众与企业均受益，但财政压力上升。`
        : `税率回调至基准水平，财政与民生重新平衡。`,
      '经济',
      rate === 'low' || rate === 'medium' ? 'positive' : 'negative',
    )
    set({
      taxRate: rate,
      lastTaxChangeDay: state.totalDays,
      metrics: {
        ...state.metrics,
        approval: clamp(state.metrics.approval + approvalDelta),
        stability: clamp(state.metrics.stability + stabilityDelta),
      },
      news: [news, ...state.news],
    })
  },

  closePendingEvent: () => {
    set({ activePendingEventId: null })
  },

  // v1.5：对地方行政区执行行动（拨款/视察/换人/反贪/下放/戒严）
  executeRegionAction: (regionId, actionId) => {
    const state = get()
    const region = state.regions?.find((r) => r.id === regionId)
    if (!region) return
    const action = REGION_ACTIONS.find((a) => a.id === actionId)
    if (!action) return

    // 政治资本不足
    if (state.pmStats.politicalCapital < action.cost) {
      set({
        unreadAlerts: [
          ...state.unreadAlerts,
          { type: 'breaking', title: `政治资本不足：需要 ${action.cost} 点（当前 ${state.pmStats.politicalCapital}）`, timestamp: Date.now() },
        ],
      })
      return
    }

    // 冷却检查
    const cooldownKey = `${regionId}:${actionId}`
    const lastDay = state.regionActionCooldowns?.[cooldownKey] ?? -999
    if (state.totalDays - lastDay < action.cooldownDays) {
      const remaining = action.cooldownDays - (state.totalDays - lastDay)
      set({
        unreadAlerts: [
          ...state.unreadAlerts,
          { type: 'breaking', title: `行动冷却中：${remaining} 天后可再次执行`, timestamp: Date.now() },
        ],
      })
      return
    }

    // 应用效果
    let next: GameState = { ...state }
    next.pmStats = {
      ...next.pmStats,
      politicalCapital: clamp(next.pmStats.politicalCapital - action.cost),
    }
    next.regions = (next.regions ?? []).map((r) =>
      r.id === regionId
        ? {
            ...r,
            loyalty: clamp(r.loyalty + (action.effects.loyaltyDelta ?? 0)),
            stability: clamp(r.stability + (action.effects.stabilityDelta ?? 0)),
          }
        : r,
    )
    // 撤换长官：从池中随机选派新人
    if (actionId === 'replace_governor') {
      const pool = REPLACEMENT_GOVERNOR_POOL
      const candidate = pool[Math.floor(Math.random() * pool.length)]
      const newGovernorId = `gov_new_${state.totalDays}_${Math.random().toString(36).slice(2, 6)}`
      const newGovernor = {
        id: newGovernorId,
        name: candidate.name,
        regionId,
        age: 45 + Math.floor(Math.random() * 15),
        faction: candidate.faction,
        loyalty: 50,
        competence: candidate.competence,
        corruption: 10,
        traits: candidate.traits,
        biography: `${candidate.faction === 'technocrat' ? '技术官僚' : candidate.faction === 'business' ? '商界' : candidate.faction === 'military' ? '军方' : '地方'}背景，新近由中央委派。`,
        preferredPolicy: 'strengthen_admin',
      }
      next.governors = [
        ...(next.governors ?? []).filter((g) => g.regionId !== regionId),
        newGovernor,
      ]
      next.regions = (next.regions ?? []).map((r) =>
        r.id === regionId ? { ...r, governorId: newGovernorId } : r,
      )
    }
    // 反贪：长官腐败下降
    if (actionId === 'anti_corruption' && action.effects.corruptionDelta) {
      next.governors = (next.governors ?? []).map((g) =>
        g.regionId === regionId
          ? {
              ...g,
              corruption: clamp(g.corruption + (action.effects.corruptionDelta ?? 0)),
              loyalty: clamp(g.loyalty + (action.effects.loyaltyDelta ?? 0)),
            }
          : g,
      )
    }
    // 应用中央指标影响
    if (action.effects.centralEffects) {
      next.metrics = applyEffects(next.metrics, action.effects.centralEffects)
    }
    // 更新冷却
    next.regionActionCooldowns = {
      ...(next.regionActionCooldowns ?? {}),
      [cooldownKey]: state.totalDays,
    }
    // 推入归因缓冲
    next.pendingAttributionBuffer = [
      ...(next.pendingAttributionBuffer ?? []),
      {
        source: 'decision',
        label: `${region.name}：${action.label}`,
        effects: action.effects.centralEffects ?? {},
        day: state.totalDays,
      },
    ]
    // 新闻
    const news = makeNews(
      next,
      `${region.name}：${action.label}`,
      action.description,
      '政治体制',
      actionId === 'martial_law' || actionId === 'anti_corruption' ? 'negative' : 'neutral',
    )
    next.news = [news, ...next.news]
    set(next)
  },

  // v1.5：与地方长官互动
  interactWithGovernor: (governorId, interactionId) => {
    const state = get()
    const governor = state.governors?.find((g) => g.id === governorId)
    if (!governor) return
    const interaction = GOVERNOR_INTERACTIONS.find((i) => i.id === interactionId)
    if (!interaction) return

    if (state.pmStats.politicalCapital < interaction.cost) {
      set({
        unreadAlerts: [
          ...state.unreadAlerts,
          { type: 'breaking', title: `政治资本不足：需要 ${interaction.cost} 点（当前 ${state.pmStats.politicalCapital}）`, timestamp: Date.now() },
        ],
      })
      return
    }

    let next: GameState = { ...state }
    next.pmStats = {
      ...next.pmStats,
      politicalCapital: clamp(next.pmStats.politicalCapital - interaction.cost),
    }
    next.governors = (next.governors ?? []).map((g) =>
      g.id === governorId
        ? {
            ...g,
            loyalty: clamp(g.loyalty + (interaction.effects.loyaltyDelta ?? 0)),
            corruption: clamp(g.corruption + (interaction.effects.corruptionDelta ?? 0)),
            competence: clamp(g.competence + (interaction.effects.competenceDelta ?? 0)),
          }
        : g,
    )
    // 同步 region.loyalty（地方长官忠诚会传导到该区整体忠诚度的一半）
    next.regions = (next.regions ?? []).map((r) =>
      r.governorId === governorId
        ? {
            ...r,
            loyalty: clamp(
              r.loyalty + Math.floor((interaction.effects.loyaltyDelta ?? 0) / 2),
            ),
          }
        : r,
    )
    if (interaction.effects.centralEffects) {
      next.metrics = applyEffects(next.metrics, interaction.effects.centralEffects)
    }
    next.pendingAttributionBuffer = [
      ...(next.pendingAttributionBuffer ?? []),
      {
        source: 'decision',
        label: `与${governor.name}：${interaction.label}`,
        effects: interaction.effects.centralEffects ?? {},
        day: state.totalDays,
      },
    ]
    set(next)
  },

  resolvePendingEvent: (instanceId, optionId) => {
    const state = get()
    const event = state.pendingEvents.find((e) => e.instanceId === instanceId)
    const option = event?.options.find((o) => o.id === optionId)
    const next = resolvePendingEventInternal(state, instanceId, optionId, false)
    if (option?.endsGame) {
      const grade = calcGrade(next.metrics)
      set({
        ...next,
        endingReason: '总理主动辞职，提前结束任期。',
        endingGrade: grade,
        screen: 'ending',
        timeSpeed: 0,
      })
      checkAchievements(set, get, { ...next, endingGrade: grade })
      return
    }
    set({ ...next })
    checkAchievements(set, get, next)
  },

  endGameEarly: () => {
    const state = get()
    const grade = calcGrade(state.metrics)
    set({
      endingReason: '总理主动辞职，提前结束任期。',
      endingGrade: grade,
      screen: 'ending',
      timeSpeed: 0,
    })
  },

  resolveCabinetChat: (ministerId, messageId, optionId) => {
    const state = get()
    const thread = state.cabinetChats.find((t) => t.ministerId === ministerId)
    if (!thread) return
    const msg = thread.messages.find((m) => m.id === messageId)
    if (!msg || msg.resolved) return
    const option = msg.options?.find((o) => o.id === optionId)
    if (!option) return

    // 应用效果（困难模式缩放）
    const metrics = option.effects
      ? applyEffects(state.metrics, option.effects, state.difficulty)
      : { ...state.metrics }

    // 应用 PMStats 效果
    const pmStats = { ...state.pmStats }
    if (option.pmStatEffects) {
      const ps = option.pmStatEffects
      pmStats.politicalCapital = clamp(pmStats.politicalCapital + (ps.politicalCapital ?? 0))
      pmStats.partyPrestige = clamp(pmStats.partyPrestige + (ps.partyPrestige ?? 0))
      pmStats.rhetoric = clamp(pmStats.rhetoric + (ps.rhetoric ?? 0))
      pmStats.riskIndex = clamp(pmStats.riskIndex + (ps.riskIndex ?? 0))
    }

    // 更新部长忠诚度
    let cabinet = state.cabinet
    const member = cabinet.find((c) => c.id === ministerId)
    let newsItems = state.news

    if (option.dismiss && member) {
      // 开除该部长，从候补名单选新成员
      const candidates = REPLACEMENT_CANDIDATES[member.role]
      if (candidates && candidates.length > 0) {
        const candidate = candidates[Math.floor(Math.random() * candidates.length)]
        cabinet = cabinet.map((c) =>
          c.id === ministerId
            ? { ...c, name: candidate.name, loyalty: candidate.loyalty, advice: candidate.advice, bonuses: { ...candidate.bonuses } }
            : c,
        )
        // 记录被解职行为
        const npcMemories = [...state.npcMemories]
        const existingIdx = npcMemories.findIndex((n) => n.npcId === ministerId)
        if (existingIdx >= 0) {
          npcMemories[existingIdx] = {
            ...npcMemories[existingIdx],
            events: [
              ...npcMemories[existingIdx].events,
              { type: 'dismissed', day: state.totalDays, description: `被总理在聊天中开除，理由：${option.label}` },
            ],
            tone: 'hostile',
          }
        }
        if (option.newsTitle) {
          newsItems = [
            {
              id: `news_cabchat_${Date.now()}`,
              timestamp: `${state.year}年${state.month}月`,
              title: option.newsTitle,
              summary: option.newsSummary ?? '',
              category: '内阁',
              tone: option.newsTone ?? 'negative',
            },
            ...newsItems,
          ]
        }
        // 添加 PM 的回复 + 系统消息（部长已替换）
        const cabinetChats = state.cabinetChats.map((t) => {
          if (t.ministerId !== ministerId) return t
          return {
            ...t,
            messages: [
              ...t.messages.map((m) =>
                m.id === messageId
                  ? { ...m, resolved: true, selectedOptionId: optionId }
                  : m,
              ),
              {
                id: `msg_pm_${Date.now()}`,
                sender: 'pm' as const,
                text: option.reply,
                day: state.totalDays,
              },
              {
                id: `msg_sys_${Date.now()}`,
                sender: 'minister' as const,
                text: `（${member.name} 已被解职，${candidate.name} 接任 ${member.role}）`,
                day: state.totalDays,
              },
            ],
          }
        })
        set({
          metrics,
          pmStats,
          cabinet,
          npcMemories,
          cabinetChats,
          news: newsItems,
        })
        return
      }
    }

    // 普通选项：调整忠诚度
    if (option.loyaltyChange && member) {
      cabinet = cabinet.map((c) =>
        c.id === ministerId
          ? { ...c, loyalty: clamp(c.loyalty + (option.loyaltyChange ?? 0)) }
          : c,
      )
    }

    // 添加新闻
    if (option.newsTitle) {
      newsItems = [
        {
          id: `news_cabchat_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: option.newsTitle,
          summary: option.newsSummary ?? '',
          category: '内阁',
          tone: option.newsTone ?? 'neutral',
        },
        ...newsItems,
      ]
    }

    // 更新聊天会话：标记原消息为已回应 + 添加 PM 回复
    const cabinetChats = state.cabinetChats.map((t) => {
      if (t.ministerId !== ministerId) return t
      return {
        ...t,
        messages: [
          ...t.messages.map((m) =>
            m.id === messageId
              ? { ...m, resolved: true, selectedOptionId: optionId }
              : m,
          ),
          {
            id: `msg_pm_${Date.now()}`,
            sender: 'pm' as const,
            text: option.reply,
            day: state.totalDays,
          },
        ],
      }
    })

    set({
      metrics,
      pmStats,
      cabinet,
      cabinetChats,
      news: newsItems,
    })
  },

  switchPolicy: (policyId) => {
    const state = get()
    const policy = NATIONAL_POLICIES.find((p) => p.id === policyId)
    if (!policy) return

    // 检查是否已是当前政策
    const currentIdx = state.activePolicies.findIndex((pid) => {
      const p = NATIONAL_POLICIES.find((np) => np.id === pid)
      return p?.category === policy.category
    })
    if (currentIdx >= 0 && state.activePolicies[currentIdx] === policyId) return

    // 检查指标前置条件
    if (policy.prerequisites) {
      for (const [key, value] of Object.entries(policy.prerequisites)) {
        if (state.metrics[key as keyof typeof state.metrics] < (value ?? 0)) return
      }
    }

    // 政策树前后链：前置政策必须曾启用过（adoptedPolicies 历史记录）
    if (policy.requiresPolicy && policy.requiresPolicy.length > 0) {
      const allMet = policy.requiresPolicy.every((pid) => state.adoptedPolicies.includes(pid))
      if (!allMet) return
    }

    // 改革↔政策树联动：若政策被改革锁定，必须已完成对应改革之一
    if (policy.unlockedByInitiative && policy.unlockedByInitiative.length > 0) {
      const unlocked = policy.unlockedByInitiative.some((iid) =>
        state.completedInitiatives.includes(iid),
      )
      if (!unlocked) return
    }

    // 检查代价是否足够
    const cost = policy.switchCost
    if (cost.treasury && state.metrics.treasury < cost.treasury) return
    if (cost.politicalCapital && state.pmStats.politicalCapital < cost.politicalCapital) return

    // 应用代价：treasury 为正数代表扣除量；stability/approval/economy/prestige/diplomacy 为带符号 delta
    const metrics = { ...state.metrics }
    if (cost.treasury) metrics.treasury = clamp(metrics.treasury - cost.treasury)
    const signedMetricKeys: (keyof typeof metrics)[] = ['economy', 'stability', 'diplomacy', 'prestige', 'approval']
    for (const k of signedMetricKeys) {
      const v = cost[k]
      if (typeof v === 'number') {
        metrics[k] = clamp(metrics[k] + v)
      }
    }

    const pmStats = { ...state.pmStats }
    if (cost.politicalCapital) pmStats.politicalCapital = clamp(pmStats.politicalCapital - cost.politicalCapital)

    // 更新 activePolicies
    const newActivePolicies = [...state.activePolicies]
    const catIdx = newActivePolicies.findIndex((pid) => {
      const p = NATIONAL_POLICIES.find((np) => np.id === pid)
      return p?.category === policy.category
    })
    if (catIdx >= 0) {
      newActivePolicies[catIdx] = policyId
    } else {
      newActivePolicies.push(policyId)
    }

    // 记录到 adoptedPolicies 历史（政策树前置链依据，去重）
    const newAdoptedPolicies = state.adoptedPolicies.includes(policyId)
      ? state.adoptedPolicies
      : [...state.adoptedPolicies, policyId]

    const oldPolicy = state.activePolicies
      .map((pid) => NATIONAL_POLICIES.find((np) => np.id === pid))
      .find((p) => p?.category === policy.category)

    set({
      metrics,
      pmStats,
      activePolicies: newActivePolicies,
      adoptedPolicies: newAdoptedPolicies,
      news: [
        {
          id: `news_policy_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: `政策调整：${policy.category}路线切换为「${policy.name}」`,
          summary: `原政策：${oldPolicy?.name ?? '无'} → 新政策：${policy.name}。${policy.description}`,
          category: '改革',
          tone: 'neutral',
        },
        ...state.news,
      ],
    })
  },

  executeDiplomaticAction: (countryId, actionId) => {
    const state = get()
    if (state.activeWar) return // 战争期间禁用其他外交行动
    const country = state.countries.find((c) => c.id === countryId)
    const action = DIPLOMATIC_ACTIONS.find((a) => a.id === actionId)
    if (!country || !action) return

    // 校验可用性
    if (action.minRelation !== undefined && country.relation < action.minRelation) return
    if (action.maxRelation !== undefined && country.relation > action.maxRelation) return
    if (action.requiresNeighbor && !country.isNeighbor) return
    if (state.pmStats.politicalCapital < action.politicalCapitalCost) return
    if (action.treasuryCost && state.metrics.treasury < action.treasuryCost) return
    // 冷却判定修复：lastActionTurn === 0 表示从未使用过，不应触发冷却
    // 旧逻辑 turn - 0 < cooldown 在 cooldown=999（宣战）时恒真，导致宣战永远静默无效
    if (action.cooldown >= 999) {
      // 每国限一次的行动（如宣战）：用战争档案判定，避免被其他行动共享的 lastActionTurn 误拦
      if (state.warHistory.some((w) => w.enemy === country.name)) return
    } else if (country.lastActionTurn > 0 && state.turn - country.lastActionTurn < action.cooldown) {
      return
    }

    // 执行
    const result = action.execute(country, state)

    // 应用国库/政治资本代价
    const metrics = { ...state.metrics }
    if (action.treasuryCost) metrics.treasury = clamp(metrics.treasury - action.treasuryCost)
    if (result.metrics) {
      for (const [k, v] of Object.entries(result.metrics)) {
        metrics[k as keyof typeof metrics] = clamp(metrics[k as keyof typeof metrics] + (v ?? 0))
      }
    }
    const pmStats = { ...state.pmStats }
    pmStats.politicalCapital = clamp(pmStats.politicalCapital - action.politicalCapitalCost)
    if (result.pmStats) {
      for (const [k, v] of Object.entries(result.pmStats)) {
        pmStats[k as keyof typeof pmStats] = clamp(pmStats[k as keyof typeof pmStats] + (v ?? 0))
      }
    }

    // 更新国家状态
    // 魅力外交好感加成：仅对正向关系变化生效（negotiation/aid 等），不放大制裁/断交的负面变化
    // charisma > 80：额外 +3；> 60：额外 +2；> 40：额外 +1
    const charismaBonus =
      state.pmTraitsNumeric.charisma > 80 ? 3 :
      state.pmTraitsNumeric.charisma > 60 ? 2 :
      state.pmTraitsNumeric.charisma > 40 ? 1 : 0
    const countries = state.countries.map((c) => {
      if (c.id !== countryId) return c
      const merged: typeof c = { ...c, ...result.country, lastActionTurn: state.turn }
      // 仅当本次行动改善了关系（新值 > 旧值）且未触发战争时，附加魅力加成
      if (
        !result.triggerWar &&
        typeof result.country?.relation === 'number' &&
        result.country.relation > c.relation &&
        charismaBonus > 0
      ) {
        merged.relation = clamp(merged.relation + charismaBonus)
      } else {
        merged.relation = clamp(merged.relation)
      }
      merged.relationLevel = deriveRelationLevel(merged.relation, !!result.triggerWar)
      return merged
    })

    // Breaking News 冷却：距上次弹窗至少 2 个月
    const canShowBreakingDip = state.turn - state.lastBreakingNewsTurn >= 2
    set({
      metrics,
      pmStats,
      countries,
      news: [
        {
          id: `news_dip_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: result.news.title,
          summary: result.news.summary,
          category: '外交',
          tone: result.news.tone,
        },
        ...state.news,
      ],
      breakingNews: canShowBreakingDip ? {
        id: `breaking_dip_${Date.now()}`,
        title: result.news.title,
        summary: result.news.summary,
        tone: result.news.tone,
      } : null,
      ...(canShowBreakingDip ? { lastBreakingNewsTurn: state.turn } : {}),
    })

    // 若触发战争 → 创建 WarState
    if (result.triggerWar) {
      const enemy = countries.find((c) => c.id === result.triggerWar)
      if (enemy) {
        const firstStage = WAR_STAGES[0]
        const war: WarState = {
          id: `war_${Date.now()}`,
          enemyCountryId: enemy.id,
          enemyCountryName: enemy.name,
          enemyMilitary: enemy.military,
          warScore: 0,
          currentStageId: firstStage.id,
          currentOrder: firstStage.order,
          completedStages: [],
          chosenOptions: [],
          startTurn: state.turn,
          ended: false,
        }
        // 初始化战争指挥状态：3 个战区，从现役将领快照可调遣列表
        const playerStrength = getPlayerMilitaryStrength(state)
        const enemyStr = enemy.military
        // 我军强度按军力比例分摊到三线，敌军强度同理（略带随机扰动）
        const mkSector = (name: string, bias: number): FrontDeployment => {
          const our = Math.max(20, Math.min(100, Math.round(playerStrength / 3 + bias)))
          const ene = Math.max(20, Math.min(100, Math.round(enemyStr / 3 + (Math.random() * 10 - 5))))
          const status: FrontDeployment['status'] =
            our > ene + 8 ? 'advancing' : our < ene - 8 ? 'retreating' : our > ene ? 'holding' : 'stalemate'
          return { sector: name, enemyStrength: ene, ourStrength: our, status }
        }
        const warCommand: WarCommandState = {
          deployments: [
            mkSector('北线', 4),
            mkSector('南线', 0),
            mkSector('海岸线', -4),
          ],
          availableGenerals: state.military.generals
            .filter((g) => g.active)
            .map((g) => ({ id: g.id, name: g.name, skill: g.skill })),
          warExhaustion: 10,
          supplyLines: 80,
        }
        set({ activeWar: war, warCommand, timeSpeed: 0 })
      }
    }
  },

  resolveWarStage: (optionId) => {
    const state = get()
    const war = state.activeWar
    if (!war || war.ended) return
    const stage = WAR_STAGES.find((s) => s.id === war.currentStageId)
    if (!stage) return
    const option = stage.options.find((o) => o.id === optionId)
    if (!option) return

    // 累加军事优势分
    const warScore = war.warScore + option.militaryModifier
    // 应用各类指标变化
    const metrics = { ...state.metrics }
    if (option.economyCost) metrics.treasury = clamp(metrics.treasury - option.economyCost)
    if (option.approvalChange) metrics.approval = clamp(metrics.approval + option.approvalChange)
    if (option.stabilityChange) metrics.stability = clamp(metrics.stability + option.stabilityChange)
    if (option.prestigeChange) metrics.prestige = clamp(metrics.prestige + option.prestigeChange)
    if (option.diplomacyChange) metrics.diplomacy = clamp(metrics.diplomacy + option.diplomacyChange)

    const chosenOptions = [...war.chosenOptions, { stageId: stage.id, optionId: option.id, label: option.label }]
    const completedStages = [...war.completedStages, stage.id]

    // 推进到下一阶段
    const nextOrder = war.currentOrder + 1
    const nextStage = WAR_STAGES.find((s) => s.order === nextOrder)

    // 若所有阶段完成 → 结算
    if (!nextStage) {
      // 战争胜负使用玩家真实军力（三军状态+将领+军费），替代旧的硬编码基准
      const playerStrength = getPlayerMilitaryStrength(state)
      const result = resolveWar(warScore, war.enemyMilitary, playerStrength)
      const endedWar: WarState = {
        ...war,
        warScore,
        chosenOptions,
        completedStages,
        ended: true,
        outcome: result.outcome,
        epilogue: result.epilogue,
      }
      // 战后国家关系重置
      const countries = state.countries.map((c) => {
        if (c.id !== war.enemyCountryId) return c
        const newRelation =
          result.outcome === 'victory' ? 40 :
          result.outcome === 'pyrrhic' ? 25 :
          result.outcome === 'stalemate' ? 20 : 10
        return {
          ...c,
          relation: newRelation,
          relationLevel: deriveRelationLevel(newRelation),
        }
      })
      // 战后指标结算
      const postMetrics = { ...metrics }
      if (result.outcome === 'victory') {
        postMetrics.prestige = clamp(postMetrics.prestige + 15)
        postMetrics.approval = clamp(postMetrics.approval + 10)
        postMetrics.stability = clamp(postMetrics.stability + 5)
      } else if (result.outcome === 'pyrrhic') {
        postMetrics.prestige = clamp(postMetrics.prestige + 3)
        postMetrics.approval = clamp(postMetrics.approval - 5)
        postMetrics.treasury = clamp(postMetrics.treasury - 10)
      } else if (result.outcome === 'stalemate') {
        postMetrics.prestige = clamp(postMetrics.prestige - 5)
        postMetrics.approval = clamp(postMetrics.approval - 3)
      } else {
        postMetrics.prestige = clamp(postMetrics.prestige - 20)
        postMetrics.approval = clamp(postMetrics.approval - 15)
        postMetrics.stability = clamp(postMetrics.stability - 10)
        postMetrics.economy = clamp(postMetrics.economy - 8)
      }
      // 战争损耗：军队兵力/装备/士气根据战果削减
      const lossFactor =
        result.outcome === 'victory' ? 0.92 :
        result.outcome === 'pyrrhic' ? 0.78 :
        result.outcome === 'stalemate' ? 0.85 : 0.7
      const postWarMilitary = {
        ...state.military,
        branches: {
          army: {
            ...state.military.branches.army,
            personnel: Math.max(10, Math.round(state.military.branches.army.personnel * lossFactor)),
            equipment: clamp(state.military.branches.army.equipment * lossFactor),
            morale: clamp(state.military.branches.army.morale + (result.outcome === 'victory' ? 10 : -15)),
          },
          navy: {
            ...state.military.branches.navy,
            equipment: clamp(state.military.branches.navy.equipment * (lossFactor + 0.05)),
            morale: clamp(state.military.branches.navy.morale + (result.outcome === 'victory' ? 8 : -12)),
          },
          airForce: {
            ...state.military.branches.airForce,
            equipment: clamp(state.military.branches.airForce.equipment * (lossFactor + 0.03)),
            morale: clamp(state.military.branches.airForce.morale + (result.outcome === 'victory' ? 8 : -12)),
          },
        },
      }
      // Breaking News 冷却：距上次弹窗至少 2 个月
      const canShowBreakingWar = state.turn - state.lastBreakingNewsTurn >= 2
      set({
        metrics: postMetrics,
        countries,
        military: postWarMilitary,
        activeWar: endedWar,
        warHistory: [...state.warHistory, { enemy: war.enemyCountryName, outcome: result.outcome, turn: state.turn }],
        news: [
          {
            id: `news_war_end_${Date.now()}`,
            timestamp: `${state.year}年${state.month}月`,
            title: `对${war.enemyCountryName}战争结束`,
            summary: result.epilogue.slice(0, 80) + '...',
            category: '军事',
            tone: result.outcome === 'victory' ? 'positive' : result.outcome === 'defeat' ? 'negative' : 'neutral',
          },
          ...state.news,
        ],
        breakingNews: canShowBreakingWar ? {
          id: `breaking_war_end_${Date.now()}`,
          title: `战争结束：${result.outcome === 'victory' ? '胜利' : result.outcome === 'pyrrhic' ? '惨胜' : result.outcome === 'stalemate' ? '僵局' : '战败'}`,
          summary: result.epilogue,
          tone: result.outcome === 'victory' ? 'positive' : result.outcome === 'defeat' ? 'negative' : 'neutral',
        } : null,
        ...(canShowBreakingWar ? { lastBreakingNewsTurn: state.turn } : {}),
      })
      return
    }

    // 推进到下一阶段
    set({
      metrics,
      activeWar: {
        ...war,
        warScore,
        chosenOptions,
        completedStages,
        currentStageId: nextStage.id,
        currentOrder: nextStage.order,
      },
      news: [
        {
          id: `news_war_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: option.newsTitle,
          summary: option.newsSummary,
          category: '军事',
          tone: option.newsTone,
        },
        ...state.news,
      ],
    })
  },

  dismissWarEpilogue: () => set({ activeWar: null, warCommand: null }),

  executeDomainAction: (actionId) => {
    const state = get()
    const action = getDomainActionById(actionId)
    if (!action) return

    // 校验前置指标
    if (action.prerequisites) {
      for (const [k, v] of Object.entries(action.prerequisites)) {
        if (state.metrics[k as keyof typeof state.metrics] < (v ?? 0)) return
      }
    }
    // 校验资源
    if (state.pmStats.politicalCapital < action.politicalCapitalCost) return
    if (action.treasuryCost && state.metrics.treasury < action.treasuryCost) return

    // 冷却校验
    const cdKey = `${action.domain}:${action.id}`
    const lastTurn = state.domainActionCooldowns[cdKey] ?? -999
    if (state.turn - lastTurn < action.cooldown) return

    // 一次性唯一行动校验
    if (action.once) {
      const alreadyDone = state.domainActionHistory.some(
        (h) => h.domain === action.domain && h.actionId === action.id,
      )
      if (alreadyDone) return
    }

    // 应用一级指标效果
    const metrics = { ...state.metrics }
    for (const [k, v] of Object.entries(action.metricEffects)) {
      metrics[k as keyof typeof metrics] = clamp(
        metrics[k as keyof typeof metrics] + (v ?? 0),
      )
    }
    // 国库代价（独立扣除）
    if (action.treasuryCost) {
      metrics.treasury = clamp(metrics.treasury - action.treasuryCost)
    }

    // 二级指标效果
    const secondary = { ...state.secondary }
    if (action.secondaryEffects) {
      for (const [k, v] of Object.entries(action.secondaryEffects)) {
        secondary[k as keyof typeof secondary] = clamp(
          secondary[k as keyof typeof secondary] + (v ?? 0),
        )
      }
    }

    // 总理个人数值
    const pmStats = { ...state.pmStats }
    pmStats.politicalCapital = clamp(pmStats.politicalCapital - action.politicalCapitalCost)
    if (action.pmStatEffects) {
      for (const [k, v] of Object.entries(action.pmStatEffects)) {
        pmStats[k as keyof typeof pmStats] = clamp(
          pmStats[k as keyof typeof pmStats] + (v ?? 0),
        )
      }
    }

    // 更新冷却与历史
    const domainActionCooldowns = {
      ...state.domainActionCooldowns,
      [cdKey]: state.turn,
    }
    const domainActionHistory = [
      ...state.domainActionHistory,
      {
        domain: action.domain,
        actionId: action.id,
        actionLabel: action.label,
        turn: state.turn,
      },
    ]

    // Breaking News 冷却：距上次弹窗至少 2 个月
    const canShowBreakingDom = state.turn - state.lastBreakingNewsTurn >= 2
    set({
      metrics,
      secondary,
      pmStats,
      domainActionCooldowns,
      domainActionHistory,
      news: [
        {
          id: `news_dom_${action.domain}_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: action.news.title,
          summary: action.news.summary,
          category: action.domain === 'military' ? '军事' : action.domain === 'society' ? '社会' : action.domain === 'economy' ? '经济' : '环境',
          tone: action.news.tone,
        },
        ...state.news,
      ],
      breakingNews: canShowBreakingDom ? {
        id: `breaking_dom_${Date.now()}`,
        title: action.news.title,
        summary: action.news.summary,
        tone: action.news.tone,
      } : null,
      ...(canShowBreakingDom ? { lastBreakingNewsTurn: state.turn } : {}),
    })
  },

  // ===================== 法律系统 =====================
  enactLaw: (groupId, lawId) => {
    const state = get()
    if (state.enactingLaw) return // 同时只能推进一项立法
    const group = LAW_GROUPS.find((g) => g.id === groupId)
    const law = group?.laws.find((l) => l.id === lawId)
    if (!group || !law) return
    // 已是当前法律
    if (state.activeLaws[groupId] === lawId) return
    // 席位门槛
    if (law.minSeats && state.parliament.rulingPartySeats < law.minSeats) return
    // 成本校验
    if (state.pmStats.politicalCapital < law.enactCost.politicalCapital) return
    if (law.enactCost.treasury && state.metrics.treasury < law.enactCost.treasury) return

    const pmStats = { ...state.pmStats }
    pmStats.politicalCapital = clamp(pmStats.politicalCapital - law.enactCost.politicalCapital)
    const metrics = { ...state.metrics }
    if (law.enactCost.treasury) {
      metrics.treasury = clamp(metrics.treasury - law.enactCost.treasury)
    }

    set({
      pmStats,
      metrics,
      enactingLaw: {
        groupId,
        lawId,
        startTurn: state.turn,
        duration: law.enactMonths,
      },
      news: [
        {
          id: `news_law_start_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: `政府提交《${law.name}》草案`,
          summary: law.enactNarrative ?? `${group.name}改革正式启动：${law.description}。预计议会审议需 ${law.enactMonths} 个月。`,
          category: '议会',
          tone: 'neutral',
        },
        ...state.news,
      ],
      unreadAlerts: [
        ...state.unreadAlerts,
        { type: 'policy', title: `立法启动：《${law.name}》`, timestamp: Date.now() },
      ],
    })
  },

  // v1.5：推动参数化法案进入审议期
  enactParameterizedBill: (billId) => {
    const state = get()
    if (state.enactingLaw) return // 同时只能推进一项立法
    const bill = state.proposedParameterizedBills?.find((b) => b.id === billId)
    if (!bill) return
    // 席位门槛
    if (bill.minSeats && state.parliament.rulingPartySeats < bill.minSeats) {
      set({
        unreadAlerts: [
          ...state.unreadAlerts,
          { type: 'breaking', title: `席位不足：需要 ${bill.minSeats} 席（当前 ${state.parliament.rulingPartySeats}）`, timestamp: Date.now() },
        ],
      })
      return
    }
    // 政治资本
    if (state.pmStats.politicalCapital < bill.enactCost.politicalCapital) {
      set({
        unreadAlerts: [
          ...state.unreadAlerts,
          { type: 'breaking', title: `政治资本不足：需要 ${bill.enactCost.politicalCapital} 点`, timestamp: Date.now() },
        ],
      })
      return
    }
    // 国库
    if (bill.enactCost.treasury && state.metrics.treasury < bill.enactCost.treasury) {
      set({
        unreadAlerts: [
          ...state.unreadAlerts,
          { type: 'breaking', title: `国库不足：需要 ${bill.enactCost.treasury} 点`, timestamp: Date.now() },
        ],
      })
      return
    }
    const pmStats = { ...state.pmStats, politicalCapital: clamp(state.pmStats.politicalCapital - bill.enactCost.politicalCapital) }
    const metrics = { ...state.metrics }
    if (bill.enactCost.treasury) {
      metrics.treasury = clamp(metrics.treasury - bill.enactCost.treasury)
    }
    set({
      pmStats,
      metrics,
      enactingLaw: {
        groupId: 'parameterized_proposals',
        lawId: bill.id,
        startTurn: state.turn,
        duration: bill.enactMonths,
      },
      news: [
        {
          id: `news_pbill_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: `政府推动《${bill.name}》`,
          summary: bill.enactNarrative ?? `${bill.description}。预计议会审议需 ${bill.enactMonths} 个月。`,
          category: '议会',
          tone: 'neutral',
        },
        ...state.news,
      ],
      unreadAlerts: [
        ...state.unreadAlerts,
        { type: 'policy', title: `立法启动：《${bill.name}》`, timestamp: Date.now() },
      ],
    })
  },

  // v1.5：放弃参数化法案提案
  dismissParameterizedBill: (billId) => {
    const state = get()
    set({
      proposedParameterizedBills: (state.proposedParameterizedBills ?? []).filter((b) => b.id !== billId),
    })
  },

  // ===================== 军事系统 =====================
  setDefenseBudget: (value) => {
    const state = get()
    // 30 天冷却
    if (state.military.lastBudgetChangeDay !== 0 && state.totalDays - state.military.lastBudgetChangeDay < 30) return
    const clamped = Math.max(0.5, Math.min(8, value))
    const old = state.military.defenseBudget
    set({
      military: {
        ...state.military,
        defenseBudget: clamped,
        lastBudgetChangeDay: state.totalDays,
      },
      news: [
        {
          id: `news_milbudget_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: `国防预算调整：${old.toFixed(1)}% → ${clamped.toFixed(1)}% GDP`,
          summary:
            clamped > old
              ? '国防部获得追加预算，各军种战备提升计划启动，财政部警告赤字压力上升。'
              : '政府削减国防开支以充实国库，军方高层私下表达强烈不满。',
          category: '军事',
          tone: 'neutral',
        },
        ...state.news,
      ],
    })
  },

  appointGeneral: (generalId) => {
    const state = get()
    // 从后备池或已解职将领中任命
    const candidate =
      GENERAL_CANDIDATES.find((g) => g.id === generalId) ??
      state.military.generals.find((g) => g.id === generalId && !g.active)
    if (!candidate) return
    if (state.military.generals.some((g) => g.id === generalId && g.active)) return
    if (state.pmStats.politicalCapital < 8) return

    const pmStats = { ...state.pmStats, politicalCapital: clamp(state.pmStats.politicalCapital - 8) }
    const generals = state.military.generals.some((g) => g.id === generalId)
      ? state.military.generals.map((g) => (g.id === generalId ? { ...g, active: true } : g))
      : [...state.military.generals, { ...candidate, active: true }]
    set({
      pmStats,
      military: { ...state.military, generals },
      news: [
        {
          id: `news_gen_appoint_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: `${candidate.name}出任${candidate.branch === 'army' ? '陆军' : candidate.branch === 'navy' ? '海军' : candidate.branch === 'airForce' ? '空军' : '联合参谋'}要职`,
          summary: `国防部发布任命令：${candidate.name}（${candidate.trait}）正式就职。`,
          category: '军事',
          tone: 'neutral',
        },
        ...state.news,
      ],
    })
  },

  dismissGeneral: (generalId) => {
    const state = get()
    const general = state.military.generals.find((g) => g.id === generalId && g.active)
    if (!general) return
    if (state.pmStats.politicalCapital < 10) return

    const pmStats = { ...state.pmStats, politicalCapital: clamp(state.pmStats.politicalCapital - 10) }
    const generals = state.military.generals.map((g) =>
      g.id === generalId ? { ...g, active: false } : g,
    )
    // 解职高威望将领损害稳定与军队士气
    const metrics = { ...state.metrics }
    const military = { ...state.military, generals }
    if (general.skill >= 70) {
      metrics.stability = clamp(metrics.stability - 3)
      metrics.prestige = clamp(metrics.prestige - 2)
      for (const key of ['army', 'navy', 'airForce'] as const) {
        military.branches = {
          ...military.branches,
          [key]: { ...military.branches[key], morale: clamp(military.branches[key].morale - 4) },
        }
      }
    }
    set({
      pmStats,
      metrics,
      military,
      news: [
        {
          id: `news_gen_dismiss_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: `${general.name}被解除军职`,
          summary: `总理签署解职令，${general.name}（${general.trait}）黯然去职。军中议论纷纷。`,
          category: '军事',
          tone: 'negative',
        },
        ...state.news,
      ],
    })
  },

  // ===================== 战争指挥系统 =====================
  assignGeneralToSector: (generalId, sector) => {
    const state = get()
    if (!state.warCommand) return
    // 校验：将领在可调遣列表中
    const gen = state.warCommand.availableGenerals.find((g) => g.id === generalId)
    if (!gen) return
    // 校验：战区存在
    const deployment = state.warCommand.deployments.find((d) => d.sector === sector)
    if (!deployment) return

    // 若该将领已分配到其他战区，先从原战区撤回（移除其技能加成）
    let deployments = state.warCommand.deployments.map((d) => {
      // 找到该将领此前分配的战区，扣除其技能带来的加成
      const prev = state.warCommand!.availableGenerals.find((g) => g.id === generalId && g.assignedSector === d.sector)
      if (prev) {
        return {
          ...d,
          ourStrength: clamp(d.ourStrength - Math.round(prev.skill * 0.25)),
        }
      }
      return d
    })
    // 若目标战区已有其他将领，先撤换（移除旧将领加成）
    const occupied = state.warCommand.availableGenerals.find(
      (g) => g.assignedSector === sector && g.id !== generalId,
    )
    if (occupied) {
      deployments = deployments.map((d) =>
        d.sector === sector
          ? { ...d, ourStrength: clamp(d.ourStrength - Math.round(occupied.skill * 0.25)) }
          : d,
      )
    }
    // 应用新将领加成到目标战区
    const bonus = Math.round(gen.skill * 0.25)
    deployments = deployments.map((d) =>
      d.sector === sector ? { ...d, ourStrength: clamp(d.ourStrength + bonus) } : d,
    )
    // 重算战区状态
    deployments = deployments.map((d) => {
      const status: FrontDeployment['status'] =
        d.ourStrength > d.enemyStrength + 8 ? 'advancing' :
        d.ourStrength < d.enemyStrength - 8 ? 'retreating' :
        d.ourStrength > d.enemyStrength ? 'holding' : 'stalemate'
      return { ...d, status }
    })
    // 更新将领分配：被撤换的将领回到未分配，新将领分配到目标战区
    const availableGenerals: WarCommandGeneral[] = state.warCommand.availableGenerals.map((g) => {
      if (g.id === generalId) return { ...g, assignedSector: sector }
      if (occupied && g.id === occupied.id) return { ...g, assignedSector: undefined }
      return g
    })

    set({
      warCommand: { ...state.warCommand, deployments, availableGenerals },
      news: [
        {
          id: `news_war_assign_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: `${gen.name}受命指挥${sector}`,
          summary: `战时调令：${gen.name}进驻${sector}司令部，统揽该方向作战事宜。`,
          category: '军事',
          tone: 'neutral',
        },
        ...state.news,
      ],
    })
  },

  unassignGeneralFromSector: (generalId) => {
    const state = get()
    if (!state.warCommand) return
    const gen = state.warCommand.availableGenerals.find((g) => g.id === generalId)
    if (!gen || !gen.assignedSector) return

    // 从该战区移除将领技能加成
    const bonus = Math.round(gen.skill * 0.25)
    let deployments = state.warCommand.deployments.map((d) =>
      d.sector === gen.assignedSector
        ? { ...d, ourStrength: clamp(d.ourStrength - bonus) }
        : d,
    )
    // 重算战区状态
    deployments = deployments.map((d) => {
      const status: FrontDeployment['status'] =
        d.ourStrength > d.enemyStrength + 8 ? 'advancing' :
        d.ourStrength < d.enemyStrength - 8 ? 'retreating' :
        d.ourStrength > d.enemyStrength ? 'holding' : 'stalemate'
      return { ...d, status }
    })
    const availableGenerals = state.warCommand.availableGenerals.map((g) =>
      g.id === generalId ? { ...g, assignedSector: undefined } : g,
    )

    set({
      warCommand: { ...state.warCommand, deployments, availableGenerals },
    })
  },

  reinforceSector: (sector) => {
    const state = get()
    if (!state.warCommand) return
    const deployment = state.warCommand.deployments.find((d) => d.sector === sector)
    if (!deployment) return
    // 增援代价：国库 -6，政治资本 -3；提升该战区我军强度 +10
    if (state.metrics.treasury < 6) return
    if (state.pmStats.politicalCapital < 3) return

    const metrics = { ...state.metrics, treasury: clamp(state.metrics.treasury - 6) }
    const pmStats = { ...state.pmStats, politicalCapital: clamp(state.pmStats.politicalCapital - 3) }
    // 补给线略受影响（增援消耗后勤）
    const supplyLines = clamp(state.warCommand.supplyLines - 3)
    // 战争疲劳度略增
    const warExhaustion = clamp(state.warCommand.warExhaustion + 2)
    let deployments = state.warCommand.deployments.map((d) =>
      d.sector === sector ? { ...d, ourStrength: clamp(d.ourStrength + 10) } : d,
    )
    // 重算战区状态
    deployments = deployments.map((d) => {
      const status: FrontDeployment['status'] =
        d.ourStrength > d.enemyStrength + 8 ? 'advancing' :
        d.ourStrength < d.enemyStrength - 8 ? 'retreating' :
        d.ourStrength > d.enemyStrength ? 'holding' : 'stalemate'
      return { ...d, status }
    })

    set({
      metrics,
      pmStats,
      warCommand: { ...state.warCommand, deployments, supplyLines, warExhaustion },
      news: [
        {
          id: `news_war_reinforce_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: `${sector}增援到位`,
          summary: `后勤部门紧急调拨预备队与物资开赴${sector}，前线将士士气大振。`,
          category: '军事',
          tone: 'positive',
        },
        ...state.news,
      ],
    })
  },

  // ===================== 卡牌系统 =====================
  playCardFromHand: (handItemId, dossierCardId) => {
    const state = get()
    const handItem = state.cardHand.find((h) => h.instanceId === handItemId)
    if (!handItem) {
      return { success: false, resourceOk: false, conditionOk: true, message: '手牌不存在', effects: {} }
    }
    const card = getCardById(handItem.cardId)
    if (!card) {
      return { success: false, resourceOk: false, conditionOk: true, message: '卡牌定义不存在', effects: {} }
    }
    const dossierCard = dossierCardId
      ? state.dossierCards.find((d) => d.id === dossierCardId)
      : undefined

    // 引擎结算
    const result = enginePlayCard(card, state, handItem, state.activeCardEvent, dossierCard)

    // 资源/条件不足：弹回手牌，不消耗
    if (!result.resourceOk || !result.conditionOk) {
      return result
    }

    // 应用效果
    const newMetrics = { ...state.metrics }
    if (result.effects.metricsDelta) {
      for (const [k, v] of Object.entries(result.effects.metricsDelta)) {
        newMetrics[k as keyof typeof newMetrics] = clamp(newMetrics[k as keyof typeof newMetrics] + (v ?? 0))
      }
    }

    const newPmStats = { ...state.pmStats }
    if (result.effects.pmStatsDelta) {
      for (const [k, v] of Object.entries(result.effects.pmStatsDelta)) {
        newPmStats[k as keyof typeof newPmStats] = clamp(newPmStats[k as keyof typeof newPmStats] + (v ?? 0))
      }
    }

    // 议会席位变化（仅当卡牌事件为 backroom 时）
    const newParliament = { ...state.parliament }
    if (result.effects.seatsGained && state.activeCardEvent?.eventType === 'backroom') {
      newParliament.rulingPartySeats = clamp(newParliament.rulingPartySeats + result.effects.seatsGained)
    }

    // 议会解散（悬崖战术失败）
    let dissolved = state.parliament.dissolved
    let dissolveCooldown = state.parliament.dissolveCooldown
    if (result.effects.dissolveParliament) {
      dissolved = true
      dissolveCooldown = 6 // 6 个月冷却
    }

    // 消耗黑料卡
    let newDossierCards = state.dossierCards
    if (card.cost.dossierCardId && dossierCard) {
      newDossierCards = state.dossierCards.filter((d) => d.id !== dossierCard.id)
    }

    // 寻找替罪羊：解职忠诚度 <50 的大臣
    let newCabinet = state.cabinet
    if (card.id === 'spin_scapegoat' && result.success) {
      const target = state.cabinet.find((m) => m.loyalty < 50)
      if (target) {
        newCabinet = state.cabinet.filter((m) => m.id !== target.id)
      }
    }

    // 添加延迟后果
    let newDelayed = state.delayedConsequences
    if (result.effects.delayedConsequence) {
      const dc = result.effects.delayedConsequence
      newDelayed = [
        ...newDelayed,
        {
          id: `card_dc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: dc.title,
          description: dc.description,
          triggerDay: state.totalDays + dc.delayDays,
          effects: dc.effects,
          newsTitle: dc.newsTitle,
          newsSummary: dc.newsSummary,
        },
      ]
    }

    // 封官许爵：记录承诺
    let newPendingAppointments = state.pendingAppointments
    if (card.id === 'backroom_appoint' && result.success && state.activeCardEvent?.sourcePartyId) {
      newPendingAppointments = [
        ...newPendingAppointments,
        {
          partyId: state.activeCardEvent.sourcePartyId,
          npcId: state.activeCardEvent.sourceNpcId || 'unknown',
          promiseDay: state.totalDays,
        },
      ]
    }

    // 归咎前任：更新计数
    let newBlameCount = state.blamePredecessorCount
    let newLastBlameDay = state.lastBlameDay
    if (card.id === 'pmqs_blame_predecessor') {
      // 30 天外重置
      if (state.totalDays - state.lastBlameDay > 30) {
        newBlameCount = 1
      } else {
        newBlameCount = state.blamePredecessorCount + 1
      }
      newLastBlameDay = state.totalDays
    }

    // 新闻
    const newNews = result.effects.news
      ? [
          {
            id: `news_card_${Date.now()}`,
            timestamp: `${state.year}年${state.month}月`,
            title: result.effects.news.title,
            summary: result.effects.news.summary,
            category: '决策' as const,
            tone: result.effects.news.tone,
          },
          ...state.news,
        ]
      : state.news

    // 卡牌打出后更新手牌冷却（手牌保留，下次冷却到期可再用）
    const newHand = state.cardHand.map((h) =>
      h.instanceId === handItemId
        ? { ...h, lastPlayedDay: state.totalDays }
        : h,
    )

    // 关闭卡牌事件槽位（打出后即关闭）
    set({
      metrics: newMetrics,
      pmStats: newPmStats,
      parliament: { ...newParliament, dissolved, dissolveCooldown },
      dossierCards: newDossierCards,
      cabinet: newCabinet,
      delayedConsequences: newDelayed,
      pendingAppointments: newPendingAppointments,
      blamePredecessorCount: newBlameCount,
      lastBlameDay: newLastBlameDay,
      cardHand: newHand,
      activeCardEvent: null,
      news: newNews,
      // 卡牌事件处理完毕后恢复时间流速
      timeSpeed: state.previousTimeSpeed || 1,
    })

    return result
  },

  triggerPmqsEvent: () => {
    const state = get()
    if (state.activeCardEvent) return
    if (state.parliament.dissolved) return
    const slot = createPmqsEvent(state)
    const prevSpeed = state.timeSpeed > 0 ? (state.timeSpeed as 1 | 2 | 3 | 4 | 5) : state.previousTimeSpeed
    set({
      activeCardEvent: slot,
      // 记录触发日，防止放弃后同日重复触发
      lastPmqsTriggerDay: state.totalDays,
      // 自动暂停时间
      previousTimeSpeed: prevSpeed,
      timeSpeed: 0,
    })
  },

  triggerBackroomEvent: (billTitle) => {
    const state = get()
    if (state.activeCardEvent) return
    const slot = createBackroomEvent(state, billTitle)
    const prevSpeed = state.timeSpeed > 0 ? (state.timeSpeed as 1 | 2 | 3 | 4 | 5) : state.previousTimeSpeed
    set({
      activeCardEvent: slot,
      previousTimeSpeed: prevSpeed,
      timeSpeed: 0,
    })
  },

  triggerSpinEvent: (cause, approvalLoss) => {
    const state = get()
    if (state.activeCardEvent) return
    const slot = createSpinEvent(state, cause, approvalLoss)
    const prevSpeed = state.timeSpeed > 0 ? (state.timeSpeed as 1 | 2 | 3 | 4 | 5) : state.previousTimeSpeed
    set({
      activeCardEvent: slot,
      previousTimeSpeed: prevSpeed,
      timeSpeed: 0,
    })
  },

  dismissCardEvent: () => {
    const state = get()
    if (!state.activeCardEvent) return
    const result = timeoutCardEvent(state.activeCardEvent)
    const newMetrics = { ...state.metrics }
    if (result.effects.metricsDelta) {
      for (const [k, v] of Object.entries(result.effects.metricsDelta)) {
        newMetrics[k as keyof typeof newMetrics] = clamp(newMetrics[k as keyof typeof newMetrics] + (v ?? 0))
      }
    }
    const newNews = result.effects.news
      ? [
          {
            id: `news_card_timeout_${Date.now()}`,
            timestamp: `${state.year}年${state.month}月`,
            title: result.effects.news.title,
            summary: result.effects.news.summary,
            category: '决策' as const,
            tone: result.effects.news.tone,
          },
          ...state.news,
        ]
      : state.news
    set({
      activeCardEvent: null,
      metrics: newMetrics,
      news: newNews,
      // 卡牌事件超时/放弃后恢复时间流速
      timeSpeed: state.previousTimeSpeed || 1,
    })
  },

  collectDossierCard: (npcId, npcName, partyId, title, desc, severity) => {
    const state = get()
    const newCard: DossierCard = {
      id: `dossier_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      targetNpcId: npcId,
      targetNpcName: npcName,
      targetPartyId: partyId,
      title,
      description: desc,
      severity,
      createdDay: state.totalDays,
    }
    set({ dossierCards: [newCard, ...state.dossierCards] })
  },

  addCardToHand: (cardId) => {
    const state = get()
    const card = getCardById(cardId)
    if (!card) return
    const newItem: CardHandItem = {
      instanceId: `hand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      cardId,
      lastPlayedDay: 0,
    }
    set({ cardHand: [...state.cardHand, newItem] })
  },

  removeCardFromHand: (handItemId) => {
    const state = get()
    set({ cardHand: state.cardHand.filter((h) => h.instanceId !== handItemId) })
  },

  checkCardEventTimeout: () => {
    const state = get()
    if (!state.activeCardEvent) return
    if (state.totalDays > state.activeCardEvent.deadlineDay) {
      get().dismissCardEvent()
    }
  },

  startGeneralElection: () => {
    const state = get()
    set({
      gamePhase: 'election',
      timeSpeed: 0,
      electionSnapshot: {
        approval: state.metrics.approval,
        seats: state.parliament.rulingPartySeats,
        term: state.term,
      },
      news: [
        makeNews(
          state,
          `任期届满 · 第 ${state.term} 届大选正式开启`,
          '四年任期已满，全国进入大选周期。请组织竞选团队，迎接选民裁决。',
          '决策',
          'neutral',
        ),
        ...state.news,
      ],
    })
  },

  resolveGeneralElection: (result) => {
    const state = get()
    if (result.won) {
      // 连任成功：进入新一届任期
      const next: Partial<GameStore> = {
        term: state.term + 1,
        gamePhase: 'playing',
        timeSpeed: 0,
        parliament: {
          ...state.parliament,
          rulingPartySeats: result.seats,
          dissolutionsThisTerm: 0,
          termStartTurn: state.turn,
          dissolved: false,
          dissolveCooldown: 0,
        },
        electionSnapshot: undefined,
        news: [
          makeNews(
            state,
            `${state.pmName}成功连任第 ${state.term + 1} 届总理`,
            result.narrative,
            '决策',
            'positive',
          ),
          ...state.news,
        ],
      }
      set(next)
      checkAchievements(set, get, { ...state, ...next } as GameState)
    } else {
      // 连任失败：进入结局屏幕
      const grade = calcGrade(state.metrics)
      set({
        endingReason: result.narrative,
        endingGrade: grade,
        screen: 'ending',
        gamePhase: 'ending',
        electionSnapshot: undefined,
      })
      checkAchievements(set, get, { ...state, endingGrade: grade })
    }
  },

  // ===================== 突击新闻发布会 minigame =====================
  startPressConference: (severity) => {
    const state = get()
    if (state.pressConferenceOpen) return
    const prevSpeed = state.timeSpeed > 0 ? (state.timeSpeed as 1 | 2 | 3 | 4 | 5) : state.previousTimeSpeed
    set({
      pressConferenceOpen: true,
      pressConferenceSeverity: clamp(severity),
      previousTimeSpeed: prevSpeed,
      timeSpeed: 0,
    })
  },

  endPressConference: (result) => {
    const state = get()
    const metrics = { ...state.metrics }
    metrics.approval = clamp(metrics.approval + result.approvalDelta)
    metrics.prestige = clamp(metrics.prestige + result.prestigeDelta)
    const news = makeNews(
      state,
      `${state.pmName}总理召开突击新闻发布会回应丑闻`,
      `发布会结束后，民调${result.approvalDelta >= 0 ? '上升' : '下跌'}${Math.abs(result.approvalDelta)}点，声望${result.prestigeDelta >= 0 ? '提升' : '下降'}${Math.abs(result.prestigeDelta)}点。丑闻严重度收于${Math.round(result.finalSeverity)}。`,
      '决策',
      result.approvalDelta >= 0 ? 'positive' : 'negative',
    )
    set({
      pressConferenceOpen: false,
      pressConferenceSeverity: 0,
      metrics,
      news: [news, ...state.news],
      timeSpeed: state.previousTimeSpeed || 1,
    })
  },

  // ===================== 深夜官邸密室游说 minigame =====================
  startBackroomLobby: () => {
    const state = get()
    if (state.backroomLobbyOpen) return
    const prevSpeed = state.timeSpeed > 0 ? (state.timeSpeed as 1 | 2 | 3 | 4 | 5) : state.previousTimeSpeed
    set({
      backroomLobbyOpen: true,
      previousTimeSpeed: prevSpeed,
      timeSpeed: 0,
    })
  },

  endBackroomLobby: (result) => {
    const state = get()
    const metrics = { ...state.metrics }
    const pmStats = { ...state.pmStats }

    // 消耗结算：
    //   - 已收买的代表中，按其影响力近似折算资源消耗（每点影响力约 1 单位国库 + 0.5 政治资本）
    //   - 若使用过威逼，额外增加风险指数 8
    const totalInfluence = result.totalInfluence
    const treasuryCost = Math.min(metrics.treasury, Math.round(totalInfluence * 1.0))
    const capitalCost = Math.min(pmStats.politicalCapital, Math.round(totalInfluence * 0.5))
    metrics.treasury = clamp(metrics.treasury - treasuryCost)
    pmStats.politicalCapital = clamp(pmStats.politicalCapital - capitalCost)

    // 成败影响：成功则民意、稳定、声望上升；失败则声望略降
    if (result.success) {
      metrics.approval = clamp(metrics.approval + 4)
      metrics.stability = clamp(metrics.stability + 3)
      metrics.prestige = clamp(metrics.prestige + 5)
      pmStats.partyPrestige = clamp(pmStats.partyPrestige + 3)
    } else {
      metrics.prestige = clamp(metrics.prestige - 2)
    }

    // 威逼使用：风险指数上升
    if (result.usedThreaten) {
      pmStats.riskIndex = clamp(pmStats.riskIndex + 8)
    }

    // 生成新闻
    const newsTitle = result.success
      ? `${state.pmName}总理密会各方代表，达成利益同盟`
      : `${state.pmName}总理深夜密室游说未果`
    const newsSummary = result.success
      ? `经一夜斡旋，总理成功收买${result.bribedReps.length}位利益集团代表，累计影响力达${totalInfluence}。国库支出${treasuryCost}，政治资本消耗${capitalCost}。`
      : `总理深夜召集利益集团代表密谈，但未能形成稳固同盟。共收买${result.bribedReps.length}位代表，累计影响力${totalInfluence}。${result.usedThreaten ? '期间传出威逼风声，风险指数上升。' : ''}`
    const news = makeNews(state, newsTitle, newsSummary, '决策', result.success ? 'positive' : 'negative')

    set({
      backroomLobbyOpen: false,
      metrics,
      pmStats,
      news: [news, ...state.news],
      timeSpeed: state.previousTimeSpeed || 1,
    })
  },
}))

/** 生成内阁聊天消息（每个部长定期发来消息） */
export function generateCabinetChatMessage(state: GameState): {
  ministerId: string
  message: CabinetChatMessage
} | null {
  // 随机选一位在任部长
  const cabinet = state.cabinet
  if (cabinet.length === 0) return null

  // 优先选取忠诚度低或所辖指标低的部长
  const sortedByPriority = [...cabinet].sort((a, b) => a.loyalty - b.loyalty)
  const top = sortedByPriority.slice(0, Math.min(3, sortedByPriority.length))
  const member = top[Math.floor(Math.random() * top.length)]

  // 收集该部长近期收到的消息文本，避免重复
  const existingThread = state.cabinetChats.find((t) => t.ministerId === member.id)
  const recentTexts = existingThread
    ? existingThread.messages.slice(-5).map((m) => m.text)
    : []

  const template = pickCabinetChatTemplate(member.role, state.metrics, recentTexts)
  if (!template) return null

  const message: CabinetChatMessage = {
    id: `msg_${member.id}_${state.totalDays}_${Math.floor(Math.random() * 1000)}`,
    sender: 'minister',
    text: template.text,
    day: state.totalDays,
    options: template.options,
  }

  return { ministerId: member.id, message }
}

/**
 * v1.5：选取"最差"选项——自动决策时让忽视有代价。
 * 计算每个选项的一级指标效果总和（approval/treasury/economy/stability/diplomacy/prestige），
 * 返回总和最低（最负面）的选项 ID。若所有选项效果相同，回退到默认选项。
 */
function pickWorstOptionId(
  options: Array<{ id: string; effects?: Partial<Metrics> }>,
  defaultOptionId: string,
): string {
  if (!options || options.length === 0) return defaultOptionId
  let worstId = options[0].id
  let worstSum = Infinity
  for (const opt of options) {
    const effects = opt.effects ?? {}
    const sum =
      (effects.approval ?? 0) +
      (effects.treasury ?? 0) +
      (effects.economy ?? 0) +
      (effects.stability ?? 0) +
      (effects.diplomacy ?? 0) +
      (effects.prestige ?? 0)
    if (sum < worstSum) {
      worstSum = sum
      worstId = opt.id
    }
  }
  // 若最差选项与默认选项效果相同（所有选项效果一致），仍使用默认以保留叙事连贯
  return worstId
}

/**
 * v1.5：事件效果放大系数。
 * 此前事件效果多为 ±3~5，决策感弱。v1.5 将事件决策效果放大至 ±8~15 范围，
 * 让单次决策有真实分量。仅对待处理事件（pendingEvents）生效，
 * 不影响改革/政策/法律等系统的效果应用。
 */
const EVENT_EFFECT_AMPLIFIER = 2

/** 内部函数：解决一个待处理事件并返回新状态 */
function resolvePendingEventInternal(
  state: GameState,
  instanceId: string,
  optionId: string,
  isAuto: boolean,
): GameState {
  const event = state.pendingEvents.find((e) => e.instanceId === instanceId)
  if (!event) return state

  const option = event.options.find((o) => o.id === optionId) ?? event.options[0]
  if (!option) return state

  // v1.5：放大事件效果（±3~5 → ±6~10，配合性格特质缩放可达 ±8~15）
  const amplifiedEffects: Partial<Metrics> = {}
  for (const key of Object.keys(option.effects ?? {}) as MetricKey[]) {
    amplifiedEffects[key] = (option.effects?.[key] ?? 0) * EVENT_EFFECT_AMPLIFIER
  }

  // 应用总理性格特质缩放（果断、韧性）→ 得到缩放后的 effects 与"是否净负面"标志
  const { scaledEffects, isNegative } = applyTraitScaling(amplifiedEffects, state)

  // 应用一级指标效果（困难模式缩放：加成打折、扣分放大）
  const metrics = applyEffects(state.metrics, scaledEffects, state.difficulty)

  // 应用二级指标效果
  const secondary = { ...state.secondary }
  if (option.secondaryEffects) {
    for (const [key, value] of Object.entries(option.secondaryEffects)) {
      const k = key as keyof typeof secondary
      secondary[k] = clamp(secondary[k] + (value ?? 0))
    }
  }

  // 应用 PMStats 效果（修复：此前只展示未真正生效）
  const pmStats = { ...state.pmStats }
  if (option.pmStatEffects) {
    const ps = option.pmStatEffects
    pmStats.politicalCapital = clamp(pmStats.politicalCapital + (ps.politicalCapital ?? 0))
    pmStats.partyPrestige = clamp(pmStats.partyPrestige + (ps.partyPrestige ?? 0))
    pmStats.rhetoric = clamp(pmStats.rhetoric + (ps.rhetoric ?? 0))
    pmStats.riskIndex = clamp(pmStats.riskIndex + (ps.riskIndex ?? 0))
  }

  // 应用总理特质效果（health/charisma 等）
  const pmTraitsNumeric = { ...state.pmTraitsNumeric }
  if (option.traitEffects) {
    for (const [k, v] of Object.entries(option.traitEffects)) {
      const key = k as keyof typeof pmTraitsNumeric
      pmTraitsNumeric[key] = clamp(pmTraitsNumeric[key] + (v ?? 0))
    }
  }

  // 应用个人生活效果（家庭/黑金/压力）
  const personalLife = { ...(state.personalLife ?? { familyRelation: 70, corruption: 5, stress: 30, spouseName: '苏婉' }) }
  if (option.personalLifeEffects) {
    const pl = option.personalLifeEffects
    personalLife.familyRelation = clamp(personalLife.familyRelation + (pl.familyRelation ?? 0))
    personalLife.corruption = clamp(personalLife.corruption + (pl.corruption ?? 0))
    personalLife.stress = clamp(personalLife.stress + (pl.stress ?? 0))
  }

  // 更新连续负面事件计数：净负面 ++，否则重置为 0（韧性机制依赖此计数）
  const consecutiveNegativeEvents = isNegative
    ? state.consecutiveNegativeEvents + 1
    : 0

  // 记录事件冷却
  let nextState: GameState = {
    ...state,
    metrics,
    secondary,
    pmStats,
    pmTraitsNumeric,
    personalLife,
    consecutiveNegativeEvents,
    pendingEvents: state.pendingEvents.filter((e) => e.instanceId !== instanceId),
    activePendingEventId: state.activePendingEventId === instanceId ? null : state.activePendingEventId,
    resolvedEventIds: event.once ? [...state.resolvedEventIds, event.eventId] : state.resolvedEventIds,
    eventsHandled: state.eventsHandled + 1,
  }
  nextState = recordEventTrigger(nextState, event.eventId)

  // v1.5：推入月度归因缓冲区，让玩家明白本月指标变化来自哪次决策
  // 自动决策时标注"自动"，让玩家意识到忽视的代价
  const attributionLabel = isAuto
    ? `自动决策（忽视超时）：${event.title}`
    : `${event.title}：${option.label}`
  nextState.pendingAttributionBuffer = [
    ...(nextState.pendingAttributionBuffer ?? []),
    {
      source: 'event',
      label: attributionLabel,
      effects: scaledEffects,
      day: nextState.totalDays,
    },
  ]

  // 处理事件链（支持旧式单跳链与新式多阶段链）
  if (option.chainId) {
    const def = findEventChainDefinition(option.chainId)
    if (def) {
      // 多阶段链：根据当前事件 ID 推断已完成的阶段，调度下一阶段
      let completedStageIds: string[] = []
      const currentStageIdx = def.stages.findIndex(
        (s) => s.eventId === event.eventId,
      )
      if (currentStageIdx >= 0) {
        completedStageIds = def.stages
          .slice(0, currentStageIdx + 1)
          .map((s) => s.stageId)
      }
      const nextStage = getNextChainStage(option.chainId, completedStageIds, nextState)
      if (nextStage) {
        nextState.pendingChains = [
          ...nextState.pendingChains,
          {
            chainId: option.chainId,
            triggerTurn: nextState.turn,
            triggerDay: nextState.totalDays + nextStage.delayDays,
            stageEventId: nextStage.eventId,
            completedStageIds: [...completedStageIds, nextStage.stageId],
          },
        ]
      }
    } else {
      // 旧式单跳链：chainId 即事件 ID
      const delay = option.chainDelay ?? 3
      nextState.pendingChains = [
        ...nextState.pendingChains,
        { chainId: option.chainId, triggerTurn: state.turn + delay },
      ]
    }
  }

  // 激活 addDelayedConsequence 机制：选项可携带延迟后果
  if (option.delayedConsequence) {
    const dc = option.delayedConsequence
    nextState.delayedConsequences = [
      ...nextState.delayedConsequences,
      {
        id: `delayed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        triggerDay: nextState.totalDays + dc.delayDays,
        title: dc.title,
        description: dc.description,
        effects: dc.effects,
        newsTitle: dc.newsTitle,
        newsSummary: dc.newsSummary,
        countryEffects: dc.countryEffects,
      },
    ]
  }

  // 模块联动：选项直接对具体国家的影响（立即生效，联动外交页面）
  if (option.countryEffects && option.countryEffects.length > 0) {
    nextState.countries = applyCountryEffects(nextState.countries, option.countryEffects)
  }

  // 生成新闻（自动决策时加上标记）
  const newsTitle = isAuto ? `【超时自动决策】${option.newsTitle}` : option.newsTitle
  const news = makeNews(
    nextState,
    newsTitle,
    option.newsSummary,
    event.category === '紧急' ? '紧急' : '决策',
    option.tone ?? 'neutral',
  )
  nextState.news = [news, ...nextState.news]

  // 生成 Breaking News 弹窗
  nextState.breakingNews = {
    id: `breaking_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: newsTitle,
    summary: option.newsSummary,
    tone: option.tone ?? 'neutral',
  }

  // 丑闻类事件触发突击新闻发布会（非自动决策时 50% 概率）
  if (!isAuto) {
    tryTriggerPressConference(nextState, event.eventId)
  }

  // 决策结果反馈：所有模式下都设置，让玩家看到本次决策的数值变化
  // 自动决策（超时）时不弹结果，避免无意义打扰
  if (!isAuto) {
    nextState.decisionResult = {
      optionLabel: option.label,
      effects: scaledEffects,
      pmStatEffects: option.pmStatEffects,
      traitEffects: (option as { traitEffects?: Partial<GameState['pmTraitsNumeric']> }).traitEffects,
    }
  }

  return nextState
}

/**
 * 丑闻类事件触发突击新闻发布会 minigame
 * 当事件 ID 含 scandal/corruption 时，有 50% 概率切入新闻发布会
 * 严重度 = 50 + riskIndex/2（riskIndex 近似为 100 - 平均指标）
 */
function tryTriggerPressConference(state: GameState, eventId: string) {
  if (state.pressConferenceOpen) return
  const eventIdLower = eventId.toLowerCase()
  const isScandalEvent =
    eventIdLower.includes('scandal') || eventIdLower.includes('corruption')
  if (!isScandalEvent) return
  if (Math.random() >= 0.5) return
  const avgMetric = average(state.metrics)
  const riskIndex = 100 - avgMetric
  const severity = 50 + riskIndex / 2
  state.pressConferenceOpen = true
  state.pressConferenceSeverity = clamp(severity)
  const prevSpeed =
    state.timeSpeed > 0
      ? (state.timeSpeed as 1 | 2 | 3 | 4 | 5)
      : state.previousTimeSpeed
  state.previousTimeSpeed = prevSpeed
  state.timeSpeed = 0
}

/** 为日常行动生成选项弹窗的内容 */
function generateDailyActionOptions(actionId: string, state: GameState): EventOption[] {
  switch (actionId) {
    case 'inspect':
      return [
        {
          id: 'inspect_urban',
          label: '视察城市工业区',
          description: '前往工业重镇，了解产业工人诉求',
          effects: { approval: 4, economy: 2, stability: 2 },
          newsTitle: '总理视察工业重镇',
          newsSummary: '总理深入工厂车间，承诺关注工人权益。',
          tone: 'positive' as const,
        },
        {
          id: 'inspect_rural',
          label: '走访农村地区',
          description: '下乡了解农民生计',
          effects: { approval: 5, stability: 3, treasury: -3 },
          newsTitle: '总理走访农村',
          newsSummary: '总理在农村地区调研，承诺改善基础设施。',
          tone: 'positive' as const,
        },
        {
          id: 'inspect_disaster',
          label: '视察灾区',
          description: '前往近期受灾地区安抚民心',
          effects: { approval: 6, stability: 4, treasury: -5 },
          newsTitle: '总理亲赴灾区',
          newsSummary: '总理视察灾区，承诺拨款重建。',
          tone: 'positive' as const,
        },
      ]
    case 'speech':
      return [
        {
          id: 'speech_national',
          label: '发表全国电视讲话',
          description: '通过电视向全国人民传达施政方针',
          effects: { approval: 5, prestige: 4, stability: 2 },
          newsTitle: '总理发表全国讲话',
          newsSummary: '总理的讲话稳定了民心，提振了士气。',
          tone: 'positive' as const,
        },
        {
          id: 'speech_parliament',
          label: '在议会发表政策演说',
          description: '向议员阐述未来政策方向',
          effects: { prestige: 3, stability: 2, economy: 2 },
          newsTitle: '总理在议会发表演说',
          newsSummary: '总理的政策演说获得议员掌声。',
          tone: 'neutral' as const,
        },
        {
          id: 'speech_international',
          label: '在国际场合发声',
          description: '借国际舞台提升国家形象',
          effects: { diplomacy: 5, prestige: 4 },
          newsTitle: '总理国际舞台发声',
          newsSummary: '总理在国际会议上的发言获得关注。',
          tone: 'positive' as const,
        },
      ]
    case 'diplomacy':
      return [
        {
          id: 'dip_neighbor',
          label: '出访邻国',
          description: '加强与邻国的双边关系',
          effects: { diplomacy: 4, economy: 2, prestige: 2 },
          newsTitle: '总理出访邻国',
          newsSummary: '总理访问邻国，签署多项合作协议。',
          tone: 'positive' as const,
        },
        {
          id: 'dip_major_power',
          label: '与大国进行战略对话',
          description: '寻求大国支持',
          effects: { diplomacy: 5, treasury: -3, prestige: 3 },
          newsTitle: '总理与大国领导人会晤',
          newsSummary: '战略对话取得积极成果。',
          tone: 'neutral' as const,
        },
        {
          id: 'dip_aid',
          label: '提供国际援助',
          description: '向友好国家提供经济援助',
          effects: { diplomacy: 6, treasury: -8, prestige: 5 },
          newsTitle: '总理宣布对外援助',
          newsSummary: '政府向友好国家提供援助，国际声誉提升。',
          tone: 'positive' as const,
        },
      ]
    case 'initiative':
      // 改革行动：跳转到改革页面
      return [
        {
          id: 'go_initiatives',
          label: '查看可推行的改革方案',
          description: '打开改革清单，选择一项启动',
          effects: {},
          newsTitle: '总理考虑启动新改革',
          newsSummary: '政府正在评估各项改革方案。',
          tone: 'neutral' as const,
        },
      ]
    case 'parliament':
      return [
        {
          id: 'parliament_qa',
          label: '出席议会质询',
          description: '亲自回应议员提问',
          effects: { prestige: 3, approval: 2, stability: 1 },
          newsTitle: '总理出席议会质询',
          newsSummary: '总理在议会质询中表现从容。',
          tone: 'neutral' as const,
        },
        {
          id: 'parliament_lobby',
          label: '私下游说议员',
          description: '消耗政治资本拉拢关键议员',
          effects: { stability: 2 },
          newsTitle: '总理游说议员',
          newsSummary: '总理在议会内部积极活动。',
          tone: 'neutral' as const,
        },
        {
          id: 'parliament_propose',
          label: '提出新法案',
          description: '推动立法进程',
          effects: { prestige: 2, stability: 1, treasury: -2 },
          newsTitle: '总理提出新法案',
          newsSummary: '新法案已提交议会审议。',
          tone: 'positive' as const,
        },
      ]
    case 'cabinet':
      return [
        {
          id: 'go_cabinet',
          label: '打开内阁管理界面',
          description: '查看内阁成员，进行解职或任命',
          effects: {},
          newsTitle: '总理考虑调整内阁',
          newsSummary: '政府内部可能进行人事调整。',
          tone: 'neutral' as const,
        },
      ]
    default:
      return [
        {
          id: 'default_yes',
          label: '执行',
          description: '执行该行动',
          effects: { approval: 1 },
          newsTitle: '总理采取行动',
          newsSummary: '总理采取了具体行动。',
          tone: 'neutral' as const,
        },
      ]
  }
}

/** 根据当前状态检查并解锁成就
 *  普通难度下门槛已提高，避免轻易获取成就 */
function checkAchievements(
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
  state: GameState,
) {
  // v1.5 重构不倒翁成就追踪：使用 lowestApproval + approvalRecoveryAchieved 双标志
  // 避免旧版 hadLowApproval 在某些边界条件下被误设为 true 的问题
  const currentApproval = state.metrics.approval
  const prevLowest = state.lowestApproval ?? 100
  const lowestApproval = Math.min(prevLowest, currentApproval)
  const hadLowApproval = state.hadLowApproval || currentApproval < 20

  // 只有在民意曾跌破 20 后，才检查是否回升到 50 以上
  const approvalRecoveryAchieved =
    state.approvalRecoveryAchieved ||
    (hadLowApproval && currentApproval >= 50)

  const stateUpdates: Partial<GameState> = {}
  if (lowestApproval !== prevLowest) stateUpdates.lowestApproval = lowestApproval
  if (hadLowApproval !== state.hadLowApproval) stateUpdates.hadLowApproval = hadLowApproval
  if (approvalRecoveryAchieved !== state.approvalRecoveryAchieved) {
    stateUpdates.approvalRecoveryAchieved = approvalRecoveryAchieved
  }
  if (Object.keys(stateUpdates).length > 0) set(stateUpdates)

  const updated: Achievement[] = state.achievements.map((a) => {
    if (a.unlocked) return a
    let unlock = false
    switch (a.id) {
      case 'ach_three_terms':
        unlock = state.term >= 3
        break
      case 'ach_full_house':
        // 提高门槛：六项指标同时达到 85 以上
        unlock = allAbove(state.metrics, 85)
        break
      case 'ach_economy_miracle':
        unlock = state.metrics.economy >= 100
        break
      case 'ach_diplomacy_master':
        unlock = state.metrics.diplomacy >= 100
        break
      case 'ach_centurion':
        // 提高门槛：执政超过 150 个回合
        unlock = state.turn > 150
        break
      case 'ach_reelect':
        unlock = state.term >= 2
        break
      case 'ach_survivor':
        // v1.5 修复：必须民意真正跌破 20（lowestApproval < 20）后回升到 50 以上
        // 使用 approvalRecoveryAchieved 双标志确保时序正确（先跌后涨）
        unlock = approvalRecoveryAchieved && lowestApproval < 20
        break
    }
    return unlock ? { ...a, unlocked: true } : a
  })
  set({ achievements: updated })
}

/**
 * 任务完成检查：扫描任务树，对未在 completedTaskIds 中的任务检测完成条件。
 * 新完成的任务：
 *   1. 应用 rewards.effects 到 metrics、rewards.pmStatEffects 到 pmStats
 *   2. rewards.achievements 与 achievementId 调用 unlockAchievement
 *   3. 写入 completedTaskIds
 *   4. push unreadAlerts 提示玩家"任务完成 +X"
 *
 * 在 advanceOneDay 末尾调用，紧跟 checkAchievements 之后。
 */
function applyTaskCompletions(
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
  state: GameState,
) {
  const newly = findNewlyCompletedTasks(state)
  if (newly.length === 0) return

  const metrics = { ...state.metrics }
  const pmStats = { ...state.pmStats }
  const completedTaskIds = [...state.completedTaskIds]
  const unreadAlerts = [...state.unreadAlerts]
  const achievementsToUnlock: string[] = []

  for (const task of newly) {
    completedTaskIds.push(task.id)
    if (task.rewards?.effects) {
      for (const [k, v] of Object.entries(task.rewards.effects)) {
        const key = k as keyof typeof metrics
        metrics[key] = clamp(metrics[key] + (v ?? 0))
      }
    }
    if (task.rewards?.pmStatEffects) {
      const ps = task.rewards.pmStatEffects
      pmStats.politicalCapital = clamp(pmStats.politicalCapital + (ps.politicalCapital ?? 0))
      pmStats.partyPrestige = clamp(pmStats.partyPrestige + (ps.partyPrestige ?? 0))
      pmStats.rhetoric = clamp(pmStats.rhetoric + (ps.rhetoric ?? 0))
      pmStats.riskIndex = clamp(pmStats.riskIndex + (ps.riskIndex ?? 0))
    }
    if (task.rewards?.achievements) {
      for (const aid of task.rewards.achievements) achievementsToUnlock.push(aid)
    }
    if (task.achievementId) {
      achievementsToUnlock.push(task.achievementId)
    }
    unreadAlerts.push({
      type: 'task',
      title: `任务完成：${task.title}`,
      timestamp: Date.now(),
    })
  }

  set({ metrics, pmStats, completedTaskIds, unreadAlerts })

  // 触发成就解锁（独立 set，避免重复刷状态）
  for (const aid of achievementsToUnlock) {
    get().unlockAchievement(aid)
  }
}

/** 获取内阁建议（基于当前最弱指标） */
export function getCabinetAdvice(state: GameState): string {
  const m = state.metrics
  const entries = (Object.entries(m) as [keyof typeof m, number][])
  const weakest = entries.reduce((min, cur) => (cur[1] < min[1] ? cur : min))
  const avg = average(m)
  if (avg >= 65) return CABINET_ADVICES.good[Math.floor(Math.random() * CABINET_ADVICES.good.length)]
  const key = `low_${weakest[0]}`
  const list = CABINET_ADVICES[key] ?? CABINET_ADVICES.good
  return list[Math.floor(Math.random() * list.length)]
}

export { TERM_LENGTH }