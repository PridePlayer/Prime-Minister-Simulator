import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { MEDIA_ACTIONS, INTELLIGENCE_ACTIONS } from '@/data/media'
import { useState } from 'react'
import { clamp } from '@/engine/metrics'

/** 舆论攻防页面 */
export default function MediaPage() {
  const metrics = useGameStore((s) => s.metrics)
  const pmStats = useGameStore((s) => s.pmStats)
  const parties = useGameStore((s) => s.parties)
  const [tab, setTab] = useState<'media' | 'intel'>('media')
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({})

  const handleMediaAction = (actionId: string) => {
    const action = MEDIA_ACTIONS.find((a) => a.id === actionId)
    if (!action) return

    // 检查政治资本
    if (pmStats.politicalCapital < action.cost) {
      alert('政治资本不足')
      return
    }

    // 应用效果
    const newMetrics = { ...metrics }
    if (action.effects.approval) {
      newMetrics.approval = clamp(newMetrics.approval + action.effects.approval)
    }
    if (action.effects.prestige) {
      newMetrics.prestige = clamp(newMetrics.prestige + action.effects.prestige)
    }
    if (action.effects.stability) {
      newMetrics.stability = clamp(newMetrics.stability + action.effects.stability)
    }

    const newPMStats = {
      ...pmStats,
      politicalCapital: pmStats.politicalCapital - action.cost,
      riskIndex: clamp(pmStats.riskIndex - (action.effects.riskIndex ?? 0)),
    }

    // 设置冷却
    setCooldowns((prev) => ({ ...prev, [actionId]: action.cooldown }))

    useGameStore.setState({
      metrics: newMetrics,
      pmStats: newPMStats,
      news: [
        {
          id: `news_media_${Date.now()}`,
          timestamp: `${useGameStore.getState().year}年${useGameStore.getState().month}月`,
          title: `执行${action.name}`,
          summary: action.description,
          category: '决策',
          tone: 'neutral',
        },
        ...useGameStore.getState().news,
      ],
    })
  }

  const handleIntelAction = (actionId: string) => {
    const action = INTELLIGENCE_ACTIONS.find((a) => a.id === actionId)
    if (!action) return

    // 检查政治资本
    if (pmStats.politicalCapital < action.cost) {
      alert('政治资本不足')
      return
    }

    // 应用效果
    const newMetrics = { ...metrics }
    if (action.effects.approval) {
      newMetrics.approval = clamp(newMetrics.approval + action.effects.approval)
    }
    if (action.effects.prestige) {
      newMetrics.prestige = clamp(newMetrics.prestige + action.effects.prestige)
    }

    const newPMStats = {
      ...pmStats,
      politicalCapital: pmStats.politicalCapital - action.cost,
      riskIndex: clamp(pmStats.riskIndex + (action.effects.riskIndex ?? 0)),
    }

    // 影响目标党派
    const newParties = parties.map((p) => {
      if (p.id === action.targetParty || p.name.includes(action.targetParty)) {
        return {
          ...p,
          favorability: clamp(p.favorability + (action.effects.oppositionApproval ?? 0)),
        }
      }
      return p
    })

    // 设置冷却
    setCooldowns((prev) => ({ ...prev, [actionId]: action.cooldown }))

    useGameStore.setState({
      metrics: newMetrics,
      pmStats: newPMStats,
      parties: newParties,
      news: [
        {
          id: `news_intel_${Date.now()}`,
          timestamp: `${useGameStore.getState().year}年${useGameStore.getState().month}月`,
          title: `执行${action.name}`,
          summary: action.description,
          category: '决策',
          tone: 'negative',
        },
        ...useGameStore.getState().news,
      ],
    })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          舆 论 攻 防
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
      </div>

      {/* 政治资本显示 */}
      <div className="doc-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-serif text-xs text-parchment-200/50">政治资本</div>
            <div className="font-mono text-2xl font-bold text-blue-400">
              {pmStats.politicalCapital}
            </div>
          </div>
          <div>
            <div className="font-serif text-xs text-parchment-200/50">风险指数</div>
            <div className="font-mono text-2xl font-bold text-red-400">
              {pmStats.riskIndex}
            </div>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('media')}
          className={`flex-1 px-4 py-2 font-serif text-sm rounded transition-colors ${
            tab === 'media'
              ? 'bg-gold text-ink-900'
              : 'bg-ink-900/40 text-parchment-200 hover:bg-ink-900/60'
          }`}
        >
          媒体公关
        </button>
        <button
          onClick={() => setTab('intel')}
          className={`flex-1 px-4 py-2 font-serif text-sm rounded transition-colors ${
            tab === 'intel'
              ? 'bg-gold text-ink-900'
              : 'bg-ink-900/40 text-parchment-200 hover:bg-ink-900/60'
          }`}
        >
          情报对抗
        </button>
      </div>

      {/* 媒体公关 */}
      {tab === 'media' && (
        <div className="space-y-3">
          {MEDIA_ACTIONS.map((action) => {
            const onCooldown = (cooldowns[action.id] ?? 0) > 0
            const canAfford = pmStats.politicalCapital >= action.cost

            return (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => !onCooldown && canAfford && handleMediaAction(action.id)}
                disabled={onCooldown || !canAfford}
                className={`w-full text-left p-4 rounded border transition-all ${
                  onCooldown || !canAfford
                    ? 'border-gold/10 bg-ink-900/20 opacity-50 cursor-not-allowed'
                    : 'border-gold/20 bg-ink-900/40 hover:border-gold/40 hover:bg-ink-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif text-sm font-semibold text-parchment-100">
                    {action.name}
                  </span>
                  <span className="font-mono text-xs text-blue-400">
                    消耗 {action.cost} 政治资本
                  </span>
                </div>
                <p className="font-serif text-xs text-parchment-200/60 mb-2">
                  {action.description}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {Object.entries(action.effects).map(([key, value]) => {
                    const v = value ?? 0
                    if (v === 0) return null
                    const label =
                      key === 'approval' ? '民意' :
                      key === 'prestige' ? '声望' :
                      key === 'stability' ? '稳定' :
                      key === 'riskIndex' ? '风险' : key
                    return (
                      <span
                        key={key}
                        className={`font-mono ${v > 0 ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {label} {v > 0 ? '+' : ''}{v}
                      </span>
                    )
                  })}
                </div>
                {onCooldown && (
                  <div className="mt-2 text-[10px] text-orange-400">
                    冷却中: {cooldowns[action.id]} 回合
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      )}

      {/* 情报对抗 */}
      {tab === 'intel' && (
        <div className="space-y-3">
          {INTELLIGENCE_ACTIONS.map((action) => {
            const onCooldown = (cooldowns[action.id] ?? 0) > 0
            const canAfford = pmStats.politicalCapital >= action.cost

            return (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => !onCooldown && canAfford && handleIntelAction(action.id)}
                disabled={onCooldown || !canAfford}
                className={`w-full text-left p-4 rounded border transition-all ${
                  onCooldown || !canAfford
                    ? 'border-gold/10 bg-ink-900/20 opacity-50 cursor-not-allowed'
                    : 'border-gold/20 bg-ink-900/40 hover:border-gold/40 hover:bg-ink-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif text-sm font-semibold text-parchment-100">
                    {action.name}
                  </span>
                  <span className="font-mono text-xs text-blue-400">
                    消耗 {action.cost} 政治资本
                  </span>
                </div>
                <p className="font-serif text-xs text-parchment-200/60 mb-2">
                  {action.description}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {Object.entries(action.effects).map(([key, value]) => {
                    const v = value ?? 0
                    if (v === 0) return null
                    const label =
                      key === 'approval' ? '民意' :
                      key === 'prestige' ? '声望' :
                      key === 'oppositionApproval' ? '对手支持' :
                      key === 'riskIndex' ? '风险' : key
                    return (
                      <span
                        key={key}
                        className={`font-mono ${v > 0 ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {label} {v > 0 ? '+' : ''}{v}
                      </span>
                    )
                  })}
                </div>
                {onCooldown && (
                  <div className="mt-2 text-[10px] text-orange-400">
                    冷却中: {cooldowns[action.id]} 回合
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
