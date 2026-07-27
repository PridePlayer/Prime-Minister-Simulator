import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { CAMPAIGN_EVENTS, POLICY_PLATFORMS, calculateSnapElectionResult } from '@/data/elections'
import { useState } from 'react'
import { clamp, applyEffects } from '@/engine/metrics'
import type { Metrics } from '@/types/game'
import {
  MAX_DISSOLUTIONS_PER_TERM,
  DISSOLUTION_COOLDOWN_MONTHS,
} from '@/data/parliament'

/** 大选页面 */
export default function ElectionPage() {
  const metrics = useGameStore((s) => s.metrics)
  const pmStats = useGameStore((s) => s.pmStats)
  const parliament = useGameStore((s) => s.parliament)
  const parties = useGameStore((s) => s.parties)
  const turn = useGameStore((s) => s.turn)
  const [tab, setTab] = useState<'overview' | 'campaign' | 'platform' | 'snap'>('overview')
  const [campaignEvent, setCampaignEvent] = useState<typeof CAMPAIGN_EVENTS[0] | null>(null)
  const [snapResult, setSnapResult] = useState<ReturnType<typeof calculateSnapElectionResult> | null>(null)

  // 计算执政联盟席位
  const coalitionSeats = parties
    .filter((p) => p.inCoalition)
    .reduce((sum, p) => sum + p.seats, 0)
  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0)

  // 综合评分
  const score = Math.round(
    (metrics.approval * 0.4 + metrics.economy * 0.25 + metrics.stability * 0.2 + metrics.prestige * 0.15)
  )

  const handleCampaignOption = (optionId: string) => {
    if (!campaignEvent) return
    const option = campaignEvent.options.find((o) => o.id === optionId)
    if (!option) return

    const newMetrics = applyEffects(metrics, option.effects, useGameStore.getState().difficulty)

    useGameStore.setState({
      metrics: newMetrics,
      news: [
        {
          id: `news_campaign_${Date.now()}`,
          timestamp: `${useGameStore.getState().year}年${useGameStore.getState().month}月`,
          title: option.newsTitle,
          summary: option.newsSummary,
          category: '决策',
          tone: 'neutral',
        },
        ...useGameStore.getState().news,
      ],
    })

    setCampaignEvent(null)
  }

  const handleSnapElection = () => {
    // 修复：提前大选即解散议会，复用议会冷却机制（每届1次、18月冷却、任期前6月禁用）
    // 直接调用 executeParliamentAction('dissolve')，避免独立席位计算导致反复刷席位冲到100
    const state = useGameStore.getState()
    const dissolveAction = state.executeParliamentAction
    dissolveAction('dissolve')

    // 展示结果（从最新 state 读取解散后产生的新闻）
    const after = useGameStore.getState()
    const latestNews = after.news[0]
    setSnapResult({
      success: latestNews?.tone === 'positive',
      newsTitle: latestNews?.title ?? '提前大选已举行',
      newsSummary: latestNews?.summary ?? '',
      seatChange: after.parliament.rulingPartySeats - state.parliament.rulingPartySeats,
    })
  }

  /** 提前大选（解散议会）是否可用，及不可用原因（parliament/turn 已在顶部声明，此处复用） */
  const snapAvailable =
    !parliament.dissolved &&
    parliament.dissolveCooldown <= 0 &&
    parliament.dissolutionsThisTerm < MAX_DISSOLUTIONS_PER_TERM &&
    (turn - parliament.termStartTurn) >= 6
  const snapReason = !snapAvailable
    ? parliament.dissolved
      ? `议会已解散，重组倒计时 ${parliament.dissolveCooldown} 个月`
      : parliament.dissolveCooldown > 0
      ? `冷却中：剩余 ${parliament.dissolveCooldown} 个月（共 ${DISSOLUTION_COOLDOWN_MONTHS} 个月）`
      : parliament.dissolutionsThisTerm >= MAX_DISSOLUTIONS_PER_TERM
      ? `本届已用过解散权（每届上限 ${MAX_DISSOLUTIONS_PER_TERM} 次），需连任开启新任期`
      : `本届任期尚未满 6 个月`
    : null

  // 政策纲领冷却：每项纲领每月只能选一次
  const [platformCooldowns, setPlatformCooldowns] = useState<Record<string, number>>({})
  const currentTurn = useGameStore.getState().turn

  const handlePlatformSelect = (platformId: string) => {
    const platform = POLICY_PLATFORMS.find((p) => p.id === platformId)
    if (!platform) return

    // 冷却检查：当月已选过则禁止
    if (platformCooldowns[platformId] === currentTurn) return

    const newMetrics = { ...metrics }
    for (const [key, value] of Object.entries(platform.effects)) {
      newMetrics[key as keyof Metrics] = clamp(newMetrics[key as keyof Metrics] + (value ?? 0))
    }

    setPlatformCooldowns({ ...platformCooldowns, [platformId]: currentTurn })

    useGameStore.setState({
      metrics: newMetrics,
      news: [
        {
          id: `news_platform_${Date.now()}`,
          timestamp: `${useGameStore.getState().year}年${useGameStore.getState().month}月`,
          title: `调整政策纲领：${platform.name}`,
          summary: platform.description,
          category: '决策',
          tone: 'positive',
        },
        ...useGameStore.getState().news,
      ],
    })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          大 选 中 心
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
      </div>

      {/* Tab 切换 */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { key: 'overview', label: '概览' },
          { key: 'campaign', label: '巡回演讲' },
          { key: 'platform', label: '政策纲领' },
          { key: 'snap', label: '提前大选' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-3 py-2 font-serif text-xs rounded transition-colors ${
              tab === t.key
                ? 'bg-gold text-ink-900'
                : 'bg-ink-900/40 text-parchment-200 hover:bg-ink-900/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 概览 */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="doc-card p-4">
            <div className="font-serif text-sm font-semibold text-parchment-200 mb-3">执政联盟席位</div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-mono text-3xl font-bold text-blue-400">{coalitionSeats}</span>
              <span className="font-mono text-sm text-parchment-200/50">/ {totalSeats} 席</span>
            </div>
            <div className="progress-track h-3">
              <motion.div
                className="h-full rounded-full bg-blue-500"
                animate={{ width: `${(coalitionSeats / totalSeats) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[10px] text-parchment-200/50">执政联盟</span>
              <span className="font-mono text-[10px] text-parchment-200/50">
                过半数线: {Math.ceil(totalSeats / 2)} 席
              </span>
            </div>
          </div>

          <div className="doc-card p-4">
            <div className="font-serif text-sm font-semibold text-parchment-200 mb-3">大选形势评估</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-serif text-[10px] text-parchment-200/50 mb-1">综合评分</div>
                <div className={`font-mono text-2xl font-bold ${
                  score >= 60 ? 'text-green-400' : score >= 40 ? 'text-orange-400' : 'text-red-400'
                }`}>
                  {score}
                </div>
              </div>
              <div>
                <div className="font-serif text-[10px] text-parchment-200/50 mb-1">胜选概率</div>
                <div className={`font-mono text-2xl font-bold ${
                  score >= 60 ? 'text-green-400' : score >= 40 ? 'text-orange-400' : 'text-red-400'
                }`}>
                  {Math.min(95, Math.max(5, score))}%
                </div>
              </div>
            </div>
            <div className="mt-3 font-serif text-xs text-parchment-200/60">
              {score >= 60
                ? '形势大好，可考虑提前大选巩固执政地位。'
                : score >= 40
                ? '形势尚可，需继续巩固支持基础。'
                : '形势严峻，建议谨慎行事，避免提前大选。'}
            </div>
          </div>

          {/* 党派支持率 */}
          <div className="doc-card p-4">
            <div className="font-serif text-sm font-semibold text-parchment-200 mb-3">各党派席位</div>
            <div className="space-y-2">
              {parties.map((party) => (
                <div key={party.id} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: party.color }}
                  />
                  <span className="font-serif text-xs text-parchment-200 flex-1">
                    {party.name}
                  </span>
                  <span className="font-mono text-xs text-parchment-100">
                    {party.seats} 席
                  </span>
                  {party.inCoalition && (
                    <span className="font-mono text-[10px] text-green-400">联盟</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 巡回演讲 */}
      {tab === 'campaign' && (
        <div className="space-y-3">
          <div className="doc-card p-4">
            <div className="font-serif text-xs text-parchment-200/50 mb-2">
              选择巡回演讲地点，争取选民支持
            </div>
          </div>
          {CAMPAIGN_EVENTS.map((event) => (
            <motion.button
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setCampaignEvent(event)}
              className="w-full text-left p-4 rounded border border-gold/20 bg-ink-900/40 hover:border-gold/40 hover:bg-ink-900/60 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📍</span>
                <span className="font-serif text-sm font-semibold text-parchment-100">
                  {event.title}
                </span>
                <span className="font-mono text-[10px] text-parchment-200/50 ml-auto">
                  {event.region}
                </span>
              </div>
              <p className="font-serif text-xs text-parchment-200/60">
                {event.description}
              </p>
            </motion.button>
          ))}
        </div>
      )}

      {/* 政策纲领 */}
      {tab === 'platform' && (
        <div className="space-y-3">
          <div className="doc-card p-4">
            <div className="font-serif text-xs text-parchment-200/50 mb-2">
              调整政策纲领以迎合摇摆选民
            </div>
          </div>
          {POLICY_PLATFORMS.map((platform) => (
            <motion.button
              key={platform.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handlePlatformSelect(platform.id)}
              className="w-full text-left p-4 rounded border border-gold/20 bg-ink-900/40 hover:border-gold/40 hover:bg-ink-900/60 transition-colors"
            >
              <div className="font-serif text-sm font-semibold text-parchment-100 mb-1">
                {platform.name}
              </div>
              <p className="font-serif text-xs text-parchment-200/60 mb-2">
                {platform.description}
              </p>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-serif text-[10px] text-parchment-200/50">目标选民:</span>
                {platform.targetVoters.map((v) => (
                  <span key={v} className="font-mono text-[10px] text-gold/70">
                    {v}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {Object.entries(platform.effects).map(([key, value]) => {
                  const v = value ?? 0
                  if (v === 0) return null
                  const label =
                    key === 'approval' ? '民意' :
                    key === 'economy' ? '经济' :
                    key === 'treasury' ? '国库' :
                    key === 'stability' ? '稳定' : key
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
            </motion.button>
          ))}
        </div>
      )}

      {/* 提前大选（即解散议会，复用议会冷却机制） */}
      {tab === 'snap' && (
        <div className="space-y-4">
          <div className="doc-card p-4">
            <div className="font-serif text-sm font-semibold text-parchment-200 mb-3">
              提前解散议会
            </div>
            <p className="font-serif text-xs text-parchment-200/60 mb-4">
              若当前民调占优，可借此赢取绝对多数席位；若预判失误，则面临失去执政权的风险。
              <span className="text-amber-300/80"> 每届任期最多 1 次，冷却 {DISSOLUTION_COOLDOWN_MONTHS} 个月，任期前 6 个月不可用。</span>
            </p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="font-serif text-[10px] text-parchment-200/50">当前民意</div>
                <div className="font-mono text-xl font-bold text-parchment-100">
                  {metrics.approval}
                </div>
              </div>
              <div>
                <div className="font-serif text-[10px] text-parchment-200/50">风险指数</div>
                <div className="font-mono text-xl font-bold text-red-400">
                  {pmStats.riskIndex}
                </div>
              </div>
            </div>
            <div className="font-serif text-xs text-parchment-200/60 mb-4">
              预估成功率: {Math.max(5, Math.min(95, Math.round(metrics.approval - pmStats.riskIndex * 0.3)))}%
            </div>

            {/* 冷却状态显示 */}
            <div className="mb-4 rounded border border-gold/20 bg-ink-900/40 p-3 font-serif text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-parchment-200/60">本届已用解散权</span>
                <span className={`font-mono font-bold ${parliament.dissolutionsThisTerm >= MAX_DISSOLUTIONS_PER_TERM ? 'text-red-400' : 'text-green-400'}`}>
                  {parliament.dissolutionsThisTerm} / {MAX_DISSOLUTIONS_PER_TERM}
                </span>
              </div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-parchment-200/60">冷却状态</span>
                <span className={`font-mono font-bold ${parliament.dissolveCooldown > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                  {parliament.dissolveCooldown > 0 ? `剩余 ${parliament.dissolveCooldown} 月` : '就绪'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-parchment-200/60">任期进度</span>
                <span className="font-mono font-bold text-parchment-200">
                  第 {turn - parliament.termStartTurn + 1} 月 {turn - parliament.termStartTurn < 6 ? '(需满6月)' : '✓'}
                </span>
              </div>
            </div>

            {snapReason && (
              <div className="mb-3 rounded border border-red-500/30 bg-red-900/20 p-2 font-serif text-xs text-red-300">
                ⚠ {snapReason}
              </div>
            )}
            <button
              onClick={handleSnapElection}
              disabled={!snapAvailable}
              className={`w-full px-4 py-3 font-serif text-sm font-semibold rounded transition-colors ${
                snapAvailable
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-ink-900/50 text-parchment-200/30 cursor-not-allowed'
              }`}
            >
              提前解散议会
            </button>
          </div>

          {snapResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`doc-card p-4 ${snapResult.success ? 'border-green-500/30' : 'border-red-500/30'}`}
            >
              <div className="text-center mb-3">
                <div className="text-4xl mb-2">{snapResult.success ? '🎉' : '😞'}</div>
                <h3 className={`font-display text-lg font-bold ${
                  snapResult.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {snapResult.newsTitle}
                </h3>
              </div>
              <p className="font-serif text-xs text-parchment-200/70 text-center">
                {snapResult.newsSummary}
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* 巡回演讲事件弹窗 */}
      <AnimatePresence>
        {campaignEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/90 backdrop-blur-sm"
            onClick={() => setCampaignEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="doc-card p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📍</span>
                <h3 className="font-display text-lg font-bold text-gold">
                  {campaignEvent.title}
                </h3>
                <span className="font-mono text-[10px] text-parchment-200/50 ml-auto">
                  {campaignEvent.region}
                </span>
              </div>
              <p className="font-serif text-sm text-parchment-200 mb-5 leading-relaxed">
                {campaignEvent.description}
              </p>
              <div className="space-y-3">
                {campaignEvent.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleCampaignOption(option.id)}
                    className="option-btn w-full text-left p-4"
                  >
                    <div className="font-serif text-sm font-semibold text-parchment-100 mb-1">
                      {option.label}
                    </div>
                    <div className="font-serif text-xs text-parchment-200/60 mb-2">
                      {option.description}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {Object.entries(option.effects).map(([key, value]) => {
                        const v = value ?? 0
                        if (v === 0) return null
                        const label =
                          key === 'approval' ? '民意' :
                          key === 'treasury' ? '国库' :
                          key === 'economy' ? '经济' :
                          key === 'stability' ? '稳定' : key
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
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
