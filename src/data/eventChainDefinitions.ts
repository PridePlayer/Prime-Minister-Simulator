import type { GameState } from '@/types/game'

/**
 * 多阶段事件链定义
 *
 * 与旧的 `EventOption.chainId` 单跳式事件链不同，EventChainDefinition 描述一条
 * 完整的多阶段剧情线：从引发事件到中间升级再到最终抉择，每个阶段可设定延迟
 * 天数与可选的推进条件。
 *
 * 触发方式：
 * 1. 玩家在某事件选项中通过 `chainId` 引用本 chainId → 加入 pendingChains
 * 2. eventEngine.resolvePendingEvent / resolveOption 解析选项时识别 chainId，
 *    若 EventChainDefinitions 中存在同 chainId 的定义，则按阶段调度而非单跳。
 *
 * 调度机制（见 eventEngine.advanceDay / resolvePendingEventInternal）：
 * - pendingChains 中的条目携带 chainId + triggerTurn
 * - 触发时若发现该 chainId 在 EVENT_CHAIN_DEFINITIONS 中有定义，则
 *   按"当前阶段"调度对应 eventId；下一阶段在玩家解决当前阶段事件后追加。
 */
export interface EventChainStage {
  /** 阶段 ID（同 chain 内唯一） */
  stageId: string
  /** 该阶段触发的事件 ID（对应 eventChainEvents.ts 中的 GameEvent.id） */
  eventId: string
  /** 距上一阶段完成后的延迟天数（首阶段 = 距链触发的延迟） */
  delayDays: number
  /** 可选：推进到此阶段需满足的条件；不满足则链中断 */
  condition?: (state: GameState) => boolean
}

export interface EventChainDefinition {
  /** 链 ID（与 EventOption.chainId 对应） */
  chainId: string
  /** 链标题（用于调试与日志） */
  title: string
  /** 链的阶段序列（按顺序触发） */
  stages: EventChainStage[]
}

/**
 * 三条多阶段事件链定义
 *
 * 每条链包含 4 个阶段，从引发事件逐级升级到最终抉择。
 * 玩家在中途的选择会决定链是否继续推进，以及最终结局的走向。
 */
export const EVENT_CHAIN_DEFINITIONS: EventChainDefinition[] = [
  // ============================================================================
  // 链 1：边境冲突升级链
  // 边境摩擦 → 军事小冲突 → 外交危机 → 制裁或谈判
  // ============================================================================
  {
    chainId: 'chain_border_conflict',
    title: '边境冲突升级链',
    stages: [
      {
        stageId: 'stage_border_friction',
        eventId: 'chain_border_friction',
        delayDays: 0,
      },
      {
        stageId: 'stage_military_skirmish',
        eventId: 'chain_military_skirmish',
        delayDays: 21,
        condition: (s) => s.metrics.diplomacy < 60, // 关系未修复才升级
      },
      {
        stageId: 'stage_diplomatic_crisis',
        eventId: 'chain_diplomatic_crisis',
        delayDays: 30,
        condition: (s) => s.metrics.stability < 70, // 局势未稳定才升级
      },
      {
        stageId: 'stage_sanctions_or_negotiation',
        eventId: 'chain_sanctions_or_negotiation',
        delayDays: 35,
      },
    ],
  },

  // ============================================================================
  // 链 2：经济危机链
  // 衰退信号 → 银行挤兑 → 紧缩措施 → 复苏或崩溃
  // ============================================================================
  {
    chainId: 'chain_economic_crisis',
    title: '经济危机链',
    stages: [
      {
        stageId: 'stage_recession_signal',
        eventId: 'chain_recession_signal',
        delayDays: 0,
      },
      {
        stageId: 'stage_bank_runs',
        eventId: 'chain_bank_runs',
        delayDays: 25,
        condition: (s) => s.metrics.economy < 50, // 经济未恢复才升级
      },
      {
        stageId: 'stage_austerity_measure',
        eventId: 'chain_austerity_measure',
        delayDays: 30,
        condition: (s) => s.metrics.treasury < 40, // 财政紧绷才升级
      },
      {
        stageId: 'stage_recovery_or_collapse',
        eventId: 'chain_recovery_or_collapse',
        delayDays: 40,
      },
    ],
  },

  // ============================================================================
  // 链 3：政治丑闻链
  // 谣言传播 → 媒体调查 → 议会质询 → 辞职或挺过
  // ============================================================================
  {
    chainId: 'chain_political_scandal',
    title: '政治丑闻链',
    stages: [
      {
        stageId: 'stage_rumor_spread',
        eventId: 'chain_rumor_spread',
        delayDays: 0,
      },
      {
        stageId: 'stage_media_investigation',
        eventId: 'chain_media_investigation',
        delayDays: 20,
        condition: (s) => s.pmStats.riskIndex > 30, // 风险指数未回落才升级
      },
      {
        stageId: 'stage_parliament_inquiry',
        eventId: 'chain_parliament_inquiry',
        delayDays: 28,
        condition: (s) => s.pmStats.partyPrestige < 60, // 党内不稳才升级
      },
      {
        stageId: 'stage_resignation_or_survival',
        eventId: 'chain_resignation_or_survival',
        delayDays: 35,
      },
    ],
  },
]

/**
 * 通过 chainId 查找事件链定义
 */
export function findEventChainDefinition(
  chainId: string,
): EventChainDefinition | undefined {
  return EVENT_CHAIN_DEFINITIONS.find((c) => c.chainId === chainId)
}

/**
 * 给定链 ID 与当前已完成的阶段 ID 列表，返回下一阶段定义。
 * 若已是末阶段或下一阶段条件不满足，返回 null（链终止）。
 */
export function getNextChainStage(
  chainId: string,
  completedStageIds: string[],
  state: GameState,
): EventChainStage | null {
  const def = findEventChainDefinition(chainId)
  if (!def) return null

  // 找到第一个尚未完成且条件满足的阶段
  for (const stage of def.stages) {
    if (completedStageIds.includes(stage.stageId)) continue
    if (stage.condition && !stage.condition(state)) {
      // 条件不满足，链中断
      return null
    }
    return stage
  }
  return null
}
