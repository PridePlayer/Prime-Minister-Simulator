/** 舆论攻防相关数据 */

/** 媒体行动 */
export interface MediaAction {
  id: string
  name: string
  description: string
  cost: number
  effects: {
    approval?: number
    prestige?: number
    stability?: number
    riskIndex?: number
  }
  cooldown: number
}

/** 情报对抗行动 */
export interface IntelligenceAction {
  id: string
  name: string
  description: string
  cost: number
  targetParty: string
  effects: {
    oppositionApproval?: number
    approval?: number
    prestige?: number
    riskIndex?: number
  }
  cooldown: number
}

/** 媒体行动库 */
export const MEDIA_ACTIONS: MediaAction[] = [
  {
    id: 'media_pr_team',
    name: '部署公关团队',
    description: '雇佣专业公关团队压制负面报道',
    cost: 15,
    effects: { approval: 5, riskIndex: -8 },
    cooldown: 4,
  },
  {
    id: 'media_positive_coverage',
    name: '正面报道引导',
    description: '通过官方渠道发布正面新闻',
    cost: 10,
    effects: { approval: 3, prestige: 2 },
    cooldown: 3,
  },
  {
    id: 'media_crisis_management',
    name: '危机公关',
    description: '针对负面事件进行危机处理',
    cost: 20,
    effects: { approval: 8, riskIndex: -15, stability: 3 },
    cooldown: 6,
  },
  {
    id: 'media_transparency',
    name: '透明施政',
    description: '主动公开政府信息，提升公信力',
    cost: 5,
    effects: { approval: 4, prestige: 5, riskIndex: -5 },
    cooldown: 5,
  },
]

/** 情报对抗行动库 */
export const INTELLIGENCE_ACTIONS: IntelligenceAction[] = [
  {
    id: 'intel_opposition_scandal',
    name: '曝光反对党丑闻',
    description: '向媒体暗中提供反对党的负面材料',
    cost: 25,
    targetParty: 'opposition',
    effects: { oppositionApproval: -10, approval: 3, riskIndex: 5 },
    cooldown: 8,
  },
  {
    id: 'intel_center_pressure',
    name: '施压中间派',
    description: '通过媒体施压中间派联盟',
    cost: 15,
    targetParty: 'center',
    effects: { oppositionApproval: -5, approval: 2, riskIndex: 3 },
    cooldown: 6,
  },
  {
    id: 'intel_left_attack',
    name: '攻击左翼主张',
    description: '通过媒体批评左翼进步党的激进主张',
    cost: 12,
    targetParty: 'left',
    effects: { oppositionApproval: -6, approval: 2, riskIndex: 4 },
    cooldown: 5,
  },
  {
    id: 'intel_right_counter',
    name: '反击右翼批评',
    description: '通过媒体反击右翼保守党的批评',
    cost: 12,
    targetParty: 'right',
    effects: { oppositionApproval: -5, approval: 1, riskIndex: 3 },
    cooldown: 5,
  },
]

/** 应用媒体行动效果 */
export function applyMediaAction(
  currentMetrics: any,
  action: MediaAction,
): any {
  const newMetrics = { ...currentMetrics }
  
  if (action.effects.approval) {
    newMetrics.approval = Math.max(0, Math.min(100, newMetrics.approval + action.effects.approval))
  }
  if (action.effects.prestige) {
    newMetrics.prestige = Math.max(0, Math.min(100, newMetrics.prestige + action.effects.prestige))
  }
  if (action.effects.stability) {
    newMetrics.stability = Math.max(0, Math.min(100, newMetrics.stability + action.effects.stability))
  }
  
  return newMetrics
}

/** 应用情报对抗效果 */
export function applyIntelligenceAction(
  currentMetrics: any,
  currentPMStats: any,
  action: IntelligenceAction,
): { metrics: any; pmStats: any } {
  const newMetrics = { ...currentMetrics }
  const newPMStats = { ...currentPMStats }
  
  if (action.effects.approval) {
    newMetrics.approval = Math.max(0, Math.min(100, newMetrics.approval + action.effects.approval))
  }
  if (action.effects.prestige) {
    newMetrics.prestige = Math.max(0, Math.min(100, newMetrics.prestige + action.effects.prestige))
  }
  if (action.effects.riskIndex) {
    newPMStats.riskIndex = Math.max(0, Math.min(100, newPMStats.riskIndex + action.effects.riskIndex))
  }
  
  return { metrics: newMetrics, pmStats: newPMStats }
}
