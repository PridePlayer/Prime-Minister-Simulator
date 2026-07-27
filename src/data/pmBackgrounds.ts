import type { PMBackground, PMTrait, PMStats, PMTraits } from '@/types/game'

export interface BackgroundInfo {
  id: PMBackground
  name: string
  description: string
  icon: string
  initialStats: Partial<PMStats>
  effects: string[]
}

export interface TraitInfo {
  id: PMTrait
  name: string
  description: string
  icon: string
  initialStats: Partial<PMStats>
  effects: string[]
}

export const BACKGROUNDS: BackgroundInfo[] = [
  {
    id: 'legal_expert',
    name: '资深律政专家',
    description: '多年法律从业经验，深谙制度运作，在议会中拥有广泛人脉。',
    icon: '⚖️',
    initialStats: {
      politicalCapital: 80,
      partyPrestige: 70,
      rhetoric: 75,
      riskIndex: 20,
    },
    effects: [
      '法案表决通过率 +10%',
      '初始政治资本 +80',
      '辩论技巧 +75',
    ],
  },
  {
    id: 'union_representative',
    name: '基层工会代表',
    description: '从基层工人成长起来的领袖，深受民众爱戴，但与商界关系紧张。',
    icon: '🔨',
    initialStats: {
      politicalCapital: 60,
      partyPrestige: 65,
      rhetoric: 70,
      riskIndex: 30,
    },
    effects: [
      '选民基础支持率 +15',
      '企业界好感度 -10',
      '初始民意 +65',
    ],
  },
  {
    id: 'political_dynasty',
    name: '政治世家成员',
    description: '出身政治名门，党内根基深厚，但被批评为"特权阶层"。',
    icon: '👑',
    initialStats: {
      politicalCapital: 90,
      partyPrestige: 85,
      rhetoric: 65,
      riskIndex: 25,
    },
    effects: [
      '党内派系初始好感度 +20',
      '初始政治资本 +90',
      '党内威望 +85',
    ],
  },
]

export const TRAITS: TraitInfo[] = [
  {
    id: 'hardliner',
    name: '强硬派',
    description: '立场坚定，绝不妥协，但容易激化矛盾。',
    icon: '🔥',
    initialStats: {
      rhetoric: 10,
      riskIndex: -10,
    },
    effects: [
      '辩论技巧 +10',
      '风险指数 -10',
      '强硬选项成功率 +15%',
    ],
  },
  {
    id: 'coordinator',
    name: '协调者',
    description: '善于调和各方利益，但可能被视为缺乏原则。',
    icon: '🤝',
    initialStats: {
      politicalCapital: 10,
      partyPrestige: 5,
    },
    effects: [
      '政治资本 +10',
      '党内威望 +5',
      '妥协选项成功率 +15%',
    ],
  },
  {
    id: 'pragmatist',
    name: '实用主义者',
    description: '以结果为导向，灵活务实，但可能牺牲理想。',
    icon: '🎯',
    initialStats: {
      politicalCapital: 15,
      riskIndex: -5,
    },
    effects: [
      '政治资本 +15',
      '风险指数 -5',
      '务实选项成功率 +15%',
    ],
  },
  {
    id: 'idealist',
    name: '理想主义者',
    description: '追求崇高目标，深受民众敬仰，但可能脱离现实。',
    icon: '✨',
    initialStats: {
      partyPrestige: 15,
      riskIndex: 5,
    },
    effects: [
      '党内威望 +15',
      '风险指数 +5',
      '理想选项成功率 +15%',
    ],
  },
]

export const DEFAULT_PM_STATS: PMStats = {
  politicalCapital: 50,
  partyPrestige: 50,
  rhetoric: 50,
  riskIndex: 50,
}

/** 总理性格特质默认值（0-100，可被事件改变） */
export const DEFAULT_PM_TRAITS: PMTraits = {
  health: 80,
  charisma: 50,
  decisiveness: 50,
  resilience: 50,
  integrity: 60,
}

/** 性格特质元数据（用于 UI 展示和滑块配置） */
export const TRAIT_META: {
  key: keyof PMTraits
  label: string
  icon: string
  description: string
  /** 低值警告阈值 */
  lowWarn?: number
  /** 高值警告阈值 */
  highWarn?: number
}[] = [
  { key: 'health', label: '健康', icon: '❤️', description: '总理的身体健康状况。低于 30 可能触发病休事件，每月行动次数受限。', lowWarn: 30 },
  { key: 'charisma', label: '魅力', icon: '✨', description: '个人魅力影响民调回升速度和外交好感度加成。', lowWarn: 25 },
  { key: 'decisiveness', label: '果断', icon: '⚡', description: '紧急事件响应速度和决策成功率。过低会导致优柔寡断惩罚。', lowWarn: 30 },
  { key: 'resilience', label: '韧性', icon: '🛡️', description: '抗压能力，降低连续负面事件的连锁损失。', lowWarn: 25 },
  { key: 'integrity', label: '道德', icon: '⚖️', description: '廉洁程度。过低增加腐败/丑闻触发概率，提高黑料卡使用代价。', lowWarn: 30, highWarn: 90 },
]
