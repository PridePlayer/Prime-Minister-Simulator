import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import {
  PARLIAMENT_ACTIONS,
  PRESIDENT_ACTIONS,
  PARLIAMENT_EVENTS,
  PRESIDENT_EVENTS,
  MAX_DISSOLUTIONS_PER_TERM,
  DISSOLUTION_COOLDOWN_MONTHS,
} from '@/data/parliament'
import BillVotingDialog from '@/components/BillVotingDialog'
import { useState, useCallback } from 'react'
import type { Metrics, EventOption, GameState } from '@/types/game'
import { clamp, applyEffects, shouldShowOptionEffects } from '@/engine/metrics'

/**
 * 解释某项议会行动为何不可用，用于在按钮下方给出明确提示。
 * 与 PARLIAMENT_ACTIONS[*].available 的判定保持一致。
 */
function explainUnavailable(actionId: string, state: GameState): string | null {
  const p = state.parliament
  switch (actionId) {
    case 'dissolve':
      if (p.dissolved) {
        return `议会已解散，重组倒计时 ${p.dissolveCooldown} 个月（共 ${DISSOLUTION_COOLDOWN_MONTHS} 个月冷却）`
      }
      if (p.dissolveCooldown > 0) {
        return `冷却中：剩余 ${p.dissolveCooldown} 个月（共 ${DISSOLUTION_COOLDOWN_MONTHS} 个月）`
      }
      if (p.dissolutionsThisTerm >= MAX_DISSOLUTIONS_PER_TERM) {
        return `本届已用过解散权（每届上限 ${MAX_DISSOLUTIONS_PER_TERM} 次），需连任开启新任期`
      }
      if (state.turn - p.termStartTurn < 6) {
        return `本届任期尚未满 6 个月（当前第 ${state.turn - p.termStartTurn + 1} 月）`
      }
      return null
    case 'qa_session':
    case 'vote_confidence':
    case 'propose_law':
      if (p.dissolved) {
        return `议会已解散，重组倒计时 ${p.dissolveCooldown} 个月，期间无法开展议会活动`
      }
      if (actionId === 'vote_confidence' && p.confidence < 40) {
        return `议会信任度不足 40（当前 ${p.confidence}）`
      }
      if (actionId === 'propose_law' && p.rulingPartySeats < 40) {
        return `执政党席位不足 40%（当前 ${p.rulingPartySeats}%）`
      }
      return null
    default:
      return null
  }
}

/** 政治互动事件弹窗 */
interface PoliticalEvent {
  id: string
  title: string
  description: string
  options: EventOption[]
  source: 'parliament' | 'president'
  /** 原始行动ID（用于执行行动效果） */
  actionId?: string
}

/** 议会/总统互动页面（独立全屏） */
export default function ParliamentPage() {
  const parliament = useGameStore((s) => s.parliament)
  const president = useGameStore((s) => s.president)
  const metrics = useGameStore((s) => s.metrics)
  const difficulty = useGameStore((s) => s.difficulty)
  const executeParliamentAction = useGameStore((s) => s.executeParliamentAction)
  const executePresidentAction = useGameStore((s) => s.executePresidentAction)
  const triggerPmqsEvent = useGameStore((s) => s.triggerPmqsEvent)
  const totalDays = useGameStore((s) => s.totalDays)
  const lastPmqsTriggerDay = useGameStore((s) => s.lastPmqsTriggerDay)
  const [tab, setTab] = useState<'parliament' | 'president'>('parliament')
  const [politicalEvent, setPoliticalEvent] = useState<PoliticalEvent | null>(null)
  const [showBillVoting, setShowBillVoting] = useState(false)

  // 手动发起质询冷却：距上次自动/手动触发需满 30 天（手动比自动频率高）
  const daysSinceLastPmqs = totalDays - lastPmqsTriggerDay
  const canManualTrigger = !parliament.dissolved && daysSinceLastPmqs >= 30

  /** 触发议会行动：先执行行动，再随机弹出事件 */
  const handleParliamentAction = useCallback((actionId: string) => {
    // 先执行原有行动
    executeParliamentAction(actionId)

    // 70%概率触发议会事件
    if (Math.random() < 0.7) {
      const event = PARLIAMENT_EVENTS[Math.floor(Math.random() * PARLIAMENT_EVENTS.length)]
      setPoliticalEvent({
        ...event,
        source: 'parliament',
        actionId,
      })
    }
  }, [executeParliamentAction])

  /** 触发总统行动：先执行行动，再随机弹出事件 */
  const handlePresidentAction = useCallback((actionId: string) => {
    executePresidentAction(actionId)

    // 70%概率触发总统事件
    if (Math.random() < 0.7) {
      const event = PRESIDENT_EVENTS[Math.floor(Math.random() * PRESIDENT_EVENTS.length)]
      setPoliticalEvent({
        ...event,
        source: 'president',
        actionId,
      })
    }
  }, [executePresidentAction])

  /** 处理政治事件选项 */
  const handlePoliticalOption = useCallback((optionId: string) => {
    if (!politicalEvent) return
    const option = politicalEvent.options.find((o) => o.id === optionId)
    if (!option) return

    // 应用效果（困难模式缩放）
    const currentMetrics = useGameStore.getState().metrics
    const difficulty = useGameStore.getState().difficulty
    const newMetrics = applyEffects(currentMetrics, option.effects, difficulty)

    // 如果是总统事件，还影响总统关系
    let newPresident = { ...useGameStore.getState().president }
    if (politicalEvent.source === 'president') {
      const relChange = option.tone === 'positive' ? 5 : option.tone === 'negative' ? -5 : 2
      newPresident = { ...newPresident, relation: clamp(newPresident.relation + relChange) }
    }

    // 如果是议会事件，还影响议会信任度
    let newParliament = { ...useGameStore.getState().parliament }
    if (politicalEvent.source === 'parliament') {
      const confChange = option.tone === 'positive' ? 4 : option.tone === 'negative' ? -4 : 1
      newParliament = { ...newParliament, confidence: clamp(newParliament.confidence + confChange) }
    }

    useGameStore.setState({
      metrics: newMetrics,
      president: newPresident,
      parliament: newParliament,
      news: [
        {
          id: `news_pol_${Date.now()}`,
          timestamp: `${useGameStore.getState().year}年${useGameStore.getState().month}月`,
          title: option.newsTitle,
          summary: option.newsSummary,
          category: politicalEvent.source === 'parliament' ? '议会' : '决策',
          tone: option.tone ?? 'neutral',
        },
        ...useGameStore.getState().news,
      ],
    })

    setPoliticalEvent(null)
  }, [politicalEvent])

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          政 治 互 动
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('parliament')}
          className={`flex-1 px-4 py-2.5 font-serif text-sm rounded transition-colors border ${
            tab === 'parliament'
              ? 'bg-gold text-ink-900 border-gold font-bold'
              : 'bg-ink-800/60 text-parchment-200 border-gold/20 hover:border-gold/50'
          }`}
        >
          议会
        </button>
        <button
          onClick={() => setTab('president')}
          className={`flex-1 px-4 py-2.5 font-serif text-sm rounded transition-colors border ${
            tab === 'president'
              ? 'bg-gold text-ink-900 border-gold font-bold'
              : 'bg-ink-800/60 text-parchment-200 border-gold/20 hover:border-gold/50'
          }`}
        >
          总统
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'parliament' ? (
          <motion.div
            key="parliament"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-4 flex-1"
          >
            {/* 议会状态概览 */}
            <div className="doc-card p-4">
              <div className="font-serif text-sm font-semibold text-parchment-200 mb-3">议会状态</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-serif text-[10px] text-parchment-200/50 mb-1">执政党席位</div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-2xl font-bold text-parchment-100">
                      {parliament.rulingPartySeats}%
                    </span>
                  </div>
                  <div className="progress-track h-2 mt-2">
                    <motion.div
                      className="h-full rounded-full bg-blue-500"
                      animate={{ width: `${parliament.rulingPartySeats}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="font-serif text-[10px] text-parchment-200/50 mb-1">议会信任度</div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="font-mono text-2xl font-bold"
                      style={{
                        color:
                          parliament.confidence >= 60
                            ? '#4ade80'
                            : parliament.confidence >= 35
                            ? '#fb923c'
                            : '#f87171',
                      }}
                    >
                      {parliament.confidence}
                    </span>
                  </div>
                  <div className="progress-track h-2 mt-2">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor:
                          parliament.confidence >= 60
                            ? '#4ade80'
                            : parliament.confidence >= 35
                            ? '#fb923c'
                            : '#f87171',
                      }}
                      animate={{ width: `${parliament.confidence}%` }}
                    />
                  </div>
                </div>
              </div>
              {parliament.dissolved && (
                <div className="mt-3 rounded-sm border border-orange-500/40 bg-orange-500/10 px-3 py-2">
                  <div className="font-serif text-xs font-bold text-orange-300">
                    ⏸ 议会已解散 · 重组冷却中
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-orange-300/80">
                    剩余 {parliament.dissolveCooldown} / {DISSOLUTION_COOLDOWN_MONTHS} 个月，期间所有议会活动暂停
                  </div>
                </div>
              )}
            </div>

            {/* 议会行动 */}
            <div className="space-y-3 pb-4">
              <div className="font-serif text-sm font-semibold text-parchment-200/60">可用行动</div>

              {/* 提交法案表决（密室政治机制） */}
              {!parliament.dissolved && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setShowBillVoting(true)}
                  data-bill-voting="true"
                  className="w-full doc-card p-4 text-left transition-colors hover:border-gold/40 hover:bg-ink-800/80 border-l-4 border-l-amber-500/60"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📜</span>
                    <span className="font-serif text-sm font-semibold text-parchment-100">
                      提交法案表决
                    </span>
                    <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-300">
                      密室政治
                    </span>
                  </div>
                  <p className="font-serif text-xs text-parchment-200/60 leading-relaxed">
                    将法案提交议会表决。票数不足时可进入密室会谈，通过利益勾兑、政治威胁或游说拉票。悬崖表决失败可能引发宪政危机。
                  </p>
                </motion.button>
              )}

              {/* 手动发起议会质询（卡牌系统） */}
              {!parliament.dissolved && (
                <motion.button
                  whileHover={canManualTrigger ? { scale: 1.01 } : {}}
                  whileTap={canManualTrigger ? { scale: 0.99 } : {}}
                  onClick={() => canManualTrigger && triggerPmqsEvent()}
                  disabled={!canManualTrigger}
                  className={`w-full doc-card p-4 text-left transition-colors border-l-4 border-l-red-500/60 ${
                    canManualTrigger
                      ? 'hover:border-gold/40 hover:bg-ink-800/80'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🎤</span>
                    <span className="font-serif text-sm font-semibold text-parchment-100">
                      发起议会质询
                    </span>
                    <span className="ml-auto rounded-full bg-red-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-red-300">
                      卡牌
                    </span>
                  </div>
                  <p className="font-serif text-xs text-parchment-200/60 leading-relaxed">
                    主动召集议会质询，使用质询卡牌应对反对党发难。手动发起冷却 30 天，系统每 60 天自动触发一次。
                  </p>
                  {!canManualTrigger && (
                    <p className="mt-2 font-mono text-[10px] text-orange-300/80">
                      ⚠ 冷却中（剩 {30 - daysSinceLastPmqs} 天）
                    </p>
                  )}
                </motion.button>
              )}

              {PARLIAMENT_ACTIONS.map((action) => {
                const currentState = useGameStore.getState()
                const available = action.available(currentState)
                const reason = !available ? explainUnavailable(action.id, currentState) : null
                return (
                  <motion.button
                    key={action.id}
                    whileHover={available ? { scale: 1.01 } : {}}
                    whileTap={available ? { scale: 0.99 } : {}}
                    onClick={() => available && handleParliamentAction(action.id)}
                    disabled={!available}
                    className={`w-full doc-card p-4 text-left transition-colors ${
                      available
                        ? 'hover:border-gold/40 hover:bg-ink-800/80'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{action.icon}</span>
                      <span className="font-serif text-sm font-semibold text-parchment-100">
                        {action.label}
                      </span>
                    </div>
                    <p className="font-serif text-xs text-parchment-200/60 leading-relaxed">
                      {action.description}
                    </p>
                    {reason && (
                      <p className="mt-2 font-mono text-[10px] leading-relaxed text-orange-300/80">
                        ⚠ {reason}
                      </p>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="president"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-4 flex-1"
          >
            {/* 总统状态概览 */}
            <div className="doc-card p-4">
              <div className="font-serif text-sm font-semibold text-parchment-200 mb-3">总统关系</div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-ink-900/50 border border-gold/20 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <div className="font-serif text-base font-semibold text-parchment-100">
                    {president.name}
                  </div>
                  <div className="font-serif text-xs text-parchment-200/50">
                    {president.sameParty ? '同党' : '异党'}总统
                    {president.temperament && (
                      <span className="ml-1">
                        · {president.temperament === 'strong' ? '强势' : president.temperament === 'moderate' ? '温和' : '务实'}
                      </span>
                    )}
                  </div>
                  {president.background && (
                    <div className="font-serif text-[10px] text-parchment-200/40 mt-0.5">
                      {president.background}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-serif text-[10px] text-parchment-200/50">关系</span>
                  <span
                    className="font-mono text-lg font-bold"
                    style={{
                      color:
                        president.relation >= 60
                          ? '#4ade80'
                          : president.relation >= 35
                          ? '#fb923c'
                          : '#f87171',
                    }}
                  >
                    {president.relation}
                  </span>
                </div>
                <div className="progress-track h-2">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor:
                        president.relation >= 60
                          ? '#4ade80'
                          : president.relation >= 35
                          ? '#fb923c'
                          : '#f87171',
                    }}
                    animate={{ width: `${president.relation}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 总统行动 */}
            <div className="space-y-3 pb-4">
              <div className="font-serif text-sm font-semibold text-parchment-200/60">可用行动</div>
              {PRESIDENT_ACTIONS.map((action) => {
                const available = action.available(useGameStore.getState())
                return (
                  <motion.button
                    key={action.id}
                    whileHover={available ? { scale: 1.01 } : {}}
                    whileTap={available ? { scale: 0.99 } : {}}
                    onClick={() => available && handlePresidentAction(action.id)}
                    disabled={!available}
                    className={`w-full doc-card p-4 text-left transition-colors ${
                      available
                        ? 'hover:border-gold/40 hover:bg-ink-800/80'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{action.icon}</span>
                      <span className="font-serif text-sm font-semibold text-parchment-100">
                        {action.label}
                      </span>
                    </div>
                    <p className="font-serif text-xs text-parchment-200/60 leading-relaxed">
                      {action.description}
                    </p>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 政治互动事件弹窗 */}
      <AnimatePresence>
        {politicalEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setPoliticalEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{politicalEvent.source === 'parliament' ? '🏛️' : '👤'}</span>
                <h3 className="font-display text-lg font-bold text-gold">
                  {politicalEvent.title}
                </h3>
              </div>
              <p className="font-serif text-sm text-parchment-200 mb-5 leading-relaxed">
                {politicalEvent.description}
              </p>
              <div className="space-y-3">
                {politicalEvent.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handlePoliticalOption(option.id)}
                    className="option-btn w-full text-left p-4"
                  >
                    <div className="font-serif text-sm font-semibold text-parchment-100 mb-1">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="font-serif text-xs text-parchment-200/60 mb-2">
                        {option.description}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {shouldShowOptionEffects(option, difficulty) ? (
                        Object.entries(option.effects).map(([key, value]) => {
                          const labelMap: Record<string, string> = {
                            economy: '经济', treasury: '国库', stability: '稳定',
                            diplomacy: '外交', prestige: '声望', approval: '民意',
                          }
                          const v = value ?? 0
                          return (
                            <span
                              key={key}
                              className={`font-mono ${v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-parchment-200/50'}`}
                            >
                              {labelMap[key] ?? key} {v > 0 ? '+' : ''}{v}
                            </span>
                          )
                        })
                      ) : (
                        <span className="font-mono italic text-parchment-200/40">? 后果未卜</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 法案表决弹窗（密室政治机制） */}
      <AnimatePresence>
        {showBillVoting && (
          <BillVotingDialog onClose={() => setShowBillVoting(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
