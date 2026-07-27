// 卡牌数据：四大核心模块（PMQs / Backroom / Leak / Spin）
// 严格按照卡牌系统数据结构与规则逻辑规范实现
import type { Card } from '@/types/game'

/**
 * 1. 议会质询卡牌 (PMQs Cards)
 *    触发：按日流逝时每 14-30 天固定触发，或重大事件发生时强制触发
 *    选牌：从玩家质询牌库中随机抽 4 张供选择
 */
export const PMQS_CARDS: Card[] = [
  {
    id: 'pmqs_counter_attack',
    name: '强硬反击',
    category: 'PMQs',
    description: '在质询台上正面回击反对党党魁，掷地有声地驳斥其指控。气势如虹可振奋本党士气，但若气场不足则被反咬。',
    icon: '🔴',
    color: 'red',
    cost: { politicalCapital: 0 },
    // SuccessRate = 50% + (Rhetoric * 0.4)% + (PublicApproval - 50)% * 0.2
    successProbability: '50 + rhetoric * 0.4 + (approval - 50) * 0.2',
    effectsOnSuccess: {
      publicApprovalChange: 4,
      partyPrestigeChange: 5,
      rhetoricChange: 1,
    },
    effectsOnFailure: {
      publicApprovalChange: -5,
      partyPrestigeChange: -3,
    },
    successSound: 'cheer.mp3',
    failSound: 'boo.mp3',
  },
  {
    id: 'pmqs_change_topic',
    name: '转移话题',
    category: 'PMQs',
    description: '以反问或新议题引开注意力，平稳避开本次质询。所有数值保持不变，但消耗政治资本。',
    icon: '🟡',
    color: 'yellow',
    cost: { politicalCapital: 10 },
    successProbability: 100,
    effectsOnSuccess: {},
    successSound: 'page_flip.mp3',
  },
  {
    id: 'pmqs_compromise',
    name: '妥协让步',
    category: 'PMQs',
    description: '承认部分指控并承诺改进，以国库拨款落实承诺。民调小幅回升，但本党保守派认为总理软弱。',
    icon: '🔵',
    color: 'blue',
    cost: { treasury: 10 },
    successProbability: 100,
    effectsOnSuccess: {
      publicApprovalChange: 2,
      // 注：保守派好感度 -10 在 cardEngine 中通过 partyPrestige -3 体现
    },
    successSound: 'gavel.mp3',
  },
  {
    id: 'pmqs_blame_predecessor',
    name: '归咎前任',
    category: 'PMQs',
    description: '将问题归咎于上届政府的遗留烂摊子。30 天内连续使用超过 1 次，反对党会反咬"总理又在甩锅"，成功率减半。',
    icon: '🟣',
    color: 'purple',
    cost: { politicalCapital: 5 },
    // 基础 80%，30 天内使用 >1 次降至 40%（在 cardEngine 中动态调整）
    successProbability: 80,
    effectsOnSuccess: {
      // 民调下跌减少 50%（在 cardEngine 中根据 pendingApprovalLoss 计算）
      mitigateApprovalLoss: 0.5,
    },
    effectsOnFailure: {
      publicApprovalChange: -3,
      partyPrestigeChange: -2,
    },
    conditions: { cooldownDays: 7 },
    successSound: 'gavel.mp3',
    failSound: 'boo.mp3',
  },
]

/**
 * 2. 密室表决卡牌 (Backroom Deal Cards)
 *    触发：重大法案表决前 24 小时，且当前执政联盟席位 < 51
 */
export const BACKROOM_CARDS: Card[] = [
  {
    id: 'backroom_bribe',
    name: '许以重利',
    category: 'BACKROOM',
    description: '将目标小党党魁或中立议员拉进密室，承诺在下一期预算中给对方选区定向拨款 30 亿。换来 3~5 席赞成票。',
    icon: '💵',
    color: 'green',
    cost: { treasury: 30 },
    successProbability: 100,
    effectsOnSuccess: {
      seatsGained: 4, // 3~5 席，cardEngine 中随机
    },
    successSound: 'coin_bag.mp3',
  },
  {
    id: 'backroom_appoint',
    name: '封官许爵',
    category: 'BACKROOM',
    description: '私下许诺在 60 天内任命目标议员为大臣。换来 2 席赞成票。若 60 天内未履行承诺，该党派立即退出执政联盟并在 7 天内发起不信任表决。',
    icon: '👑',
    color: 'purple',
    cost: { politicalCapital: 5 },
    successProbability: 100,
    effectsOnSuccess: {
      seatsGained: 2,
    },
    // 延迟后果在 cardEngine 中生成（60 天后触发"退出联盟+不信任案"）
    successSound: 'seal_stamp.mp3',
  },
  {
    id: 'backroom_chicken',
    name: '悬崖战术',
    category: 'BACKROOM',
    description: '与反对党党魁进行最后 24 小时悬崖博弈。若玩家民调 > 反对党民调，对方妥协投赞成/弃权票（+4 席）；若玩家民调 ≤ 反对党民调，法案流产并直接触发议会解散大选。',
    icon: '🗡️',
    color: 'red',
    cost: { politicalCapital: 20 },
    // 动态公式：玩家民调 > 反对党民调时 100%，否则 0%
    // 这里用字符串标记，cardEngine 中求值
    successProbability: 'playerApproval > oppositionApproval ? 100 : 0',
    effectsOnSuccess: {
      seatsGained: 4,
    },
    effectsOnFailure: {
      // 法案流产 + 触发议会解散（dissolveParliament 在 cardEngine 中标记）
    },
    successSound: 'cheer.mp3',
    failSound: 'parliament_dissolve.mp3',
  },
]

/**
 * 3. 黑料与爆料卡牌 (Dossier & Leak Cards)
 *    积累：玩家消耗 PC 指示情报部门调查 NPC，成功后生成【黑料卡】存入手牌库
 *    打出：消耗 1 张【黑料卡】
 */
export const LEAK_CARDS: Card[] = [
  {
    id: 'leak_anonymous',
    name: '匿名爆料',
    category: 'LEAK',
    description: '通过匿名渠道向媒体爆料目标议员/大臣的黑料。目标强制辞职，剥夺其所属党派 2~4 席表决权，目标党派支持率 -5%。',
    icon: '💣',
    color: 'black',
    cost: {
      riskIndex: 5,
      dossierCardId: '*', // 表示消耗任意 1 张黑料卡
    },
    successProbability: 100,
    effectsOnSuccess: {
      // 席位 -2~4、目标党派支持率 -5% 在 cardEngine 中根据 dossierCard.severity 计算
      seatsGained: -3, // 负数表示扣除对方席位（实际语义：本方相对优势 +3）
      publicApprovalChange: 0,
    },
    successSound: 'newspaper_slam.mp3',
  },
  {
    id: 'leak_blackmail',
    name: '政治勒索',
    category: 'LEAK',
    description: '拿出黑料私下威胁目标议员，使其在下次表决中请假缺席或投弃权票。目标 NPC 写入 BLACKMAILED 记忆，后续在不信任案中 100% 投反对票报复。',
    icon: '🖤',
    color: 'black',
    cost: {
      dossierCardId: '*',
      politicalCapital: 3,
    },
    successProbability: 100,
    effectsOnSuccess: {
      // 强制缺席 / 弃权 → 等效本方 +1 席
      seatsGained: 1,
      addNpcMemory: { npcId: '*', tag: 'BLACKMAILED' },
    },
    successSound: 'whisper.mp3',
  },
  {
    id: 'leak_coverup',
    name: '掩盖丑闻',
    category: 'LEAK',
    description: '当自身或盟友丑闻曝光时，消耗政治资本当轮掩盖。15~60 天后有 70% 概率触发"深度曝光事件"，RiskIndex +30，PublicApproval -20%。',
    icon: '🛡️',
    color: 'gray',
    cost: { politicalCapital: 25 },
    successProbability: 100,
    effectsOnSuccess: {
      // 当轮掩盖，无立即民调扣除
      mitigateApprovalLoss: 1.0,
    },
    // 延迟后果（深度曝光）在 cardEngine 中按 70% 概率添加
    successSound: 'gavel.mp3',
  },
]

/**
 * 4. 舆论洗白卡牌 (Spin Doctoring Cards)
 *    触发：负面事件（经济衰退、基建倒塌）导致民调下跌时，进入公关窗口期
 */
export const SPIN_CARDS: Card[] = [
  {
    id: 'spin_reframe',
    name: '重新框架',
    category: 'SPIN',
    description: '将负面词汇重构包装，用"改革阵痛期""结构性调整"等术语替代"衰退""失败"。减少 50% 的民调下跌损失。',
    icon: '🔄',
    color: 'blue',
    cost: { politicalCapital: 15 },
    successProbability: 100,
    effectsOnSuccess: {
      mitigateApprovalLoss: 0.5,
    },
    successSound: 'spin.mp3',
  },
  {
    id: 'spin_scapegoat',
    name: '寻找替罪羊',
    category: 'SPIN',
    description: '解职 1 名忠诚度 < 50 的大臣，将事件责任归咎于个人。减少 80% 的民调下跌损失，但被解职大臣所属派系好感度 -30。',
    icon: '🐐',
    color: 'red',
    cost: { dismissMinisterLoyaltyBelow: 50 },
    successProbability: 100,
    effectsOnSuccess: {
      mitigateApprovalLoss: 0.8,
    },
    // 解职 + 派系好感 -30 在 cardEngine 中处理
    successSound: 'gavel.mp3',
  },
  {
    id: 'spin_whip',
    name: '三道红线警告',
    category: 'SPIN',
    description: '强制党内所有议员必须按党派立场投票（强行通过法案）。党内独立派议员忠诚度 -20。',
    icon: '🚩',
    color: 'red',
    cost: { politicalCapital: 30 },
    successProbability: 100,
    effectsOnSuccess: {
      // 强行通过：本方 +5 席（等效）
      seatsGained: 5,
    },
    // 独立派议员忠诚度 -20 在 cardEngine 中处理
    successSound: 'seal_stamp.mp3',
  },
]

/** 所有卡牌定义的汇总表 */
export const ALL_CARDS: Card[] = [...PMQS_CARDS, ...BACKROOM_CARDS, ...LEAK_CARDS, ...SPIN_CARDS]

/** 按 ID 查找卡牌定义 */
export function getCardById(id: string): Card | undefined {
  return ALL_CARDS.find((c) => c.id === id)
}

/** 按类别获取卡牌 */
export function getCardsByCategory(category: Card['category']): Card[] {
  return ALL_CARDS.filter((c) => c.category === category)
}

/**
 * 新游戏初始手牌：玩家开局获得 4 张 PMQs 卡 + 2 张 SPIN 卡
 * （黑料卡与密室卡在事件中临时获得）
 */
export function getInitialHandCardIds(): string[] {
  return [
    'pmqs_counter_attack',
    'pmqs_change_topic',
    'pmqs_compromise',
    'pmqs_blame_predecessor',
    'spin_reframe',
    'spin_scapegoat',
  ]
}
