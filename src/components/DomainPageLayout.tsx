import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import {
  DOMAIN_META,
  getActionsByDomain,
  type DomainType,
  type DomainAction,
} from '@/data/domainActions'
import type { Metrics, SecondaryMetrics, SecondaryMetricKey } from '@/types/game'

/** 二级指标元信息表（用于现状面板渲染） */
const SECONDARY_META: Record<SecondaryMetricKey, { label: string; positive: boolean; icon: string }> = {
  urbanSupport: { label: '城市支持', positive: true, icon: '🏙️' },
  ruralSupport: { label: '农村支持', positive: true, icon: '🌾' },
  youthSupport: { label: '青年支持', positive: true, icon: '🎓' },
  fiscalSurplus: { label: '财政盈余', positive: true, icon: '💰' },
  debtLevel: { label: '债务水平', positive: false, icon: '📉' },
  forexReserves: { label: '外汇储备', positive: true, icon: '🏦' },
  industrialOutput: { label: '工业产出', positive: true, icon: '🏭' },
  agriculturalOutput: { label: '农业产出', positive: true, icon: '🌱' },
  employmentRate: { label: '就业率', positive: true, icon: '💼' },
  inflationRate: { label: '通胀率', positive: false, icon: '🔥' },
  crimeRate: { label: '犯罪率', positive: false, icon: '🚨' },
  protestFrequency: { label: '抗议频率', positive: false, icon: '📣' },
  socialCohesion: { label: '社会团结', positive: true, icon: '🤝' },
  majorPowerRelations: { label: '大国关系', positive: true, icon: '🌐' },
  neighborRelations: { label: '邻国关系', positive: true, icon: '🗺️' },
  orgInfluence: { label: '国际组织影响力', positive: true, icon: '🏛️' },
  politicalPrestige: { label: '政坛威望', positive: true, icon: '👑' },
  mediaRating: { label: '媒体评价', positive: true, icon: '📰' },
  historicalLegacy: { label: '历史声望', positive: true, icon: '📜' },
  pollutionIndex: { label: '污染指数', positive: false, icon: '☣️' },
}

const PRIMARY_METRIC_LABEL: Record<keyof Metrics, { label: string; icon: string }> = {
  approval: { label: '民意', icon: '❤️' },
  treasury: { label: '国库', icon: '💰' },
  economy: { label: '经济', icon: '📈' },
  stability: { label: '稳定', icon: '🛡️' },
  diplomacy: { label: '外交', icon: '🌐' },
  prestige: { label: '声望', icon: '👑' },
}

/** 领域页面布局：现状面板 + 措施列表 + 新闻动态 + 行动历史 */
export default function DomainPageLayout({ domain }: { domain: DomainType }) {
  const meta = DOMAIN_META[domain]
  const metrics = useGameStore((s) => s.metrics)
  const secondary = useGameStore((s) => s.secondary)
  const pmStats = useGameStore((s) => s.pmStats)
  const turn = useGameStore((s) => s.turn)
  const year = useGameStore((s) => s.year)
  const month = useGameStore((s) => s.month)
  const news = useGameStore((s) => s.news)
  const domainActionCooldowns = useGameStore((s) => s.domainActionCooldowns)
  const domainActionHistory = useGameStore((s) => s.domainActionHistory)
  const executeDomainAction = useGameStore((s) => s.executeDomainAction)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const actions = useMemo(() => getActionsByDomain(domain), [domain])

  // 行动按 category 分组
  const groupedActions = useMemo(() => {
    const map = new Map<string, DomainAction[]>()
    for (const a of actions) {
      if (!map.has(a.category)) map.set(a.category, [])
      map.get(a.category)!.push(a)
    }
    return Array.from(map.entries())
  }, [actions])

  // 当前领域相关新闻
  const domainNews = useMemo(() => {
    const categoryMap: Record<DomainType, string[]> = {
      military: ['军事'],
      society: ['社会'],
      economy: ['经济'],
      environment: ['环境'],
    }
    const cats = categoryMap[domain]
    return news.filter((n) => cats.includes(n.category as string)).slice(0, 12)
  }, [news, domain])

  // 当前领域行动历史
  const domainHistory = useMemo(
    () => domainActionHistory.filter((h) => h.domain === domain).slice(-10).reverse(),
    [domainActionHistory, domain],
  )

  /** 校验某项行动是否可用 */
  const checkAction = (action: DomainAction): { ok: boolean; reason?: string } => {
    if (action.prerequisites) {
      for (const [k, v] of Object.entries(action.prerequisites)) {
        if (metrics[k as keyof Metrics] < (v ?? 0)) {
          return { ok: false, reason: `${PRIMARY_METRIC_LABEL[k as keyof Metrics].label}不足（需 ≥ ${v}）` }
        }
      }
    }
    if (pmStats.politicalCapital < action.politicalCapitalCost) {
      return { ok: false, reason: `政治资本不足（需 ${action.politicalCapitalCost}）` }
    }
    if (action.treasuryCost && metrics.treasury < action.treasuryCost) {
      return { ok: false, reason: `国库不足（需 ${action.treasuryCost}）` }
    }
    const cdKey = `${domain}:${action.id}`
    const last = domainActionCooldowns[cdKey] ?? -999
    const left = action.cooldown - (turn - last)
    if (left > 0) {
      return { ok: false, reason: `冷却中（剩 ${left} 月）` }
    }
    if (action.once) {
      const done = domainActionHistory.some(
        (h) => h.domain === domain && h.actionId === action.id,
      )
      if (done) return { ok: false, reason: '已执行（一次性）' }
    }
    return { ok: true }
  }

  const handleExecute = (action: DomainAction) => {
    const check = checkAction(action)
    if (!check.ok) return
    if (confirming !== action.id) {
      setConfirming(action.id)
      return
    }
    executeDomainAction(action.id)
    setConfirming(null)
  }

  const primaryValue = metrics[meta.primaryMetric]
  const primaryMeta = PRIMARY_METRIC_LABEL[meta.primaryMetric]

  return (
    <div className="flex flex-col">
      {/* 顶部标题 */}
      <div className="flex items-center gap-3 mb-3 sticky top-0 z-10 bg-ink-900/80 backdrop-blur-sm py-2 -mx-1 px-1 rounded">
        <span className="text-2xl">{meta.icon}</span>
        <span
          className="font-display text-lg font-bold tracking-[0.25em]"
          style={{ color: meta.color }}
        >
          {meta.label} 部
        </span>
        <span className="font-mono text-[11px] text-parchment-200/60 hidden sm:inline">
          {meta.statusTitle}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r to-transparent" style={{ background: `linear-gradient(to right, ${meta.color}66, transparent)` }} />
        <span className="font-mono text-[10px] text-parchment-200/40 whitespace-nowrap">
          第 {turn} 月 · {year}年{month}月
        </span>
      </div>

      {/* v1.5 改版：全屏可滚动布局，移除内部小滚动区 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* 左侧：措施列表 */}
        <div className="pr-1">
          {/* 主指标快览 */}
          <div className="doc-card p-3 mb-3" style={{ borderColor: `${meta.color}55` }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{primaryMeta.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-serif text-xs text-parchment-200/60">
                    {primaryMeta.label}（核心指标）
                  </span>
                  <span
                    className="font-display text-xl font-bold"
                    style={{ color: meta.color }}
                  >
                    {Math.round(primaryValue)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-ink-900/60 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, primaryValue)}%`,
                      backgroundColor: meta.color,
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 ml-2">
                <span className="font-mono text-[9px] text-parchment-200/40">政治资本</span>
                <span className="font-display text-sm font-bold text-gold">
                  {Math.round(pmStats.politicalCapital)}
                </span>
              </div>
            </div>
          </div>

          {/* 类别筛选 */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded px-2 py-0.5 font-serif text-[10px] font-semibold tracking-wider transition-colors ${
                activeCategory === null
                  ? 'bg-gold/20 text-gold border border-gold/40'
                  : 'text-parchment-200/50 border border-transparent hover:text-parchment-100'
              }`}
            >
              全部 ({actions.length})
            </button>
            {groupedActions.map(([cat, list]) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded px-2 py-0.5 font-serif text-[10px] font-semibold tracking-wider transition-colors ${
                  activeCategory === cat
                    ? 'bg-gold/20 text-gold border border-gold/40'
                    : 'text-parchment-200/50 border border-transparent hover:text-parchment-100'
                }`}
              >
                {cat} ({list.length})
              </button>
            ))}
          </div>

          {/* 行动卡片列表 */}
          <div className="space-y-2">
            {groupedActions
              .filter(([cat]) => !activeCategory || cat === activeCategory)
              .map(([cat, list]) => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-display text-xs font-bold tracking-widest" style={{ color: meta.color }}>
                      {cat}
                    </span>
                    <div
                      className="h-px flex-1"
                      style={{ background: `linear-gradient(to right, ${meta.color}33, transparent)` }}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {list.map((action) => {
                      const check = checkAction(action)
                      const isConfirming = confirming === action.id
                      return (
                        <motion.div
                          key={action.id}
                          whileHover={check.ok ? { x: 2 } : {}}
                          className={`doc-card p-2.5 transition-all ${
                            check.ok
                              ? 'hover:border-gold/40 hover:bg-ink-800/60'
                              : 'opacity-55'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{action.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-serif text-xs font-bold text-parchment-100">
                                {action.label}
                                {action.once && (
                                  <span className="ml-1 font-mono text-[8px] text-orange-400/70">一次性</span>
                                )}
                              </div>
                              <div className="font-mono text-[9px] text-parchment-200/40">
                                💼 {action.politicalCapitalCost}
                                {action.treasuryCost ? ` · 💰 ${action.treasuryCost}` : ''}
                                {action.cooldown < 999 ? ` · 冷却 ${action.cooldown}月` : ''}
                              </div>
                            </div>
                            {check.ok ? (
                              <button
                                onClick={() => handleExecute(action)}
                                className={`rounded px-3 py-1 font-serif text-[11px] font-bold transition-colors ${
                                  isConfirming
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25'
                                }`}
                              >
                                {isConfirming ? '确认?' : '执行'}
                              </button>
                            ) : (
                              <span className="font-mono text-[9px] text-red-400/70 whitespace-nowrap">
                                {check.reason}
                              </span>
                            )}
                          </div>
                          <p className="font-serif text-[10px] text-parchment-200/50 leading-relaxed mt-1">
                            {action.description}
                          </p>
                          {/* 效果预览 */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {Object.entries(action.metricEffects).map(([k, v]) => {
                              const key = k as keyof Metrics
                              const val = v ?? 0
                              if (val === 0) return null
                              return (
                                <span
                                  key={k}
                                  className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                                    val > 0
                                      ? 'bg-emerald-500/15 text-emerald-300'
                                      : 'bg-red-500/15 text-red-300'
                                  }`}
                                >
                                  {PRIMARY_METRIC_LABEL[key].label} {val > 0 ? '+' : ''}{val}
                                </span>
                              )
                            })}
                            {action.secondaryEffects &&
                              Object.entries(action.secondaryEffects).map(([k, v]) => {
                                const key = k as SecondaryMetricKey
                                const val = v ?? 0
                                if (val === 0) return null
                                const sm = SECONDARY_META[key]
                                const isPositive = sm.positive ? val > 0 : val < 0
                                return (
                                  <span
                                    key={k}
                                    className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                                      isPositive
                                        ? 'bg-emerald-500/15 text-emerald-300'
                                        : 'bg-red-500/15 text-red-300'
                                    }`}
                                  >
                                    {sm.label} {val > 0 ? '+' : ''}{val}
                                  </span>
                                )
                              })}
                          </div>
                          {isConfirming && check.ok && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <button
                                onClick={() => handleExecute(action)}
                                className="rounded bg-red-600 px-2 py-0.5 font-serif text-[10px] font-bold text-white"
                              >
                                确认执行
                              </button>
                              <button
                                onClick={() => setConfirming(null)}
                                className="rounded bg-ink-700 px-2 py-0.5 font-serif text-[10px] text-parchment-200"
                              >
                                取消
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 右侧：现状面板 + 新闻 + 历史 */}
        <div className="pl-1 space-y-3 lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          {/* 二级指标现状 */}
          <div className="doc-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-display text-xs font-bold tracking-widest text-gold">
                现状面板
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
            </div>
            <div className="space-y-1.5">
              {meta.secondaryMetrics.map((key) => {
                const sm = SECONDARY_META[key]
                const val = secondary[key as keyof SecondaryMetrics] ?? 0
                const isGood = sm.positive ? val >= 50 : val <= 50
                const color = isGood ? '#10b981' : val < 30 || val > 70 ? '#ef4444' : '#f59e0b'
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-serif text-[10px] text-parchment-200/70">
                        {sm.icon} {sm.label}
                      </span>
                      <span className="font-mono text-[10px] font-bold" style={{ color }}>
                        {Math.round(val)}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-ink-900/60 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, val))}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 领域新闻 */}
          <div className="doc-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-display text-xs font-bold tracking-widest text-gold">
                部门动态
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
            </div>
            {domainNews.length === 0 ? (
              <div className="font-mono text-[10px] text-parchment-200/30 text-center py-3">
                暂无{meta.label}相关动态
              </div>
            ) : (
              <div className="space-y-1.5">
                {domainNews.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded border-l-2 px-2 py-1 ${
                      n.tone === 'positive'
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : n.tone === 'negative'
                        ? 'border-red-500/50 bg-red-500/5'
                        : 'border-parchment-200/30 bg-ink-900/30'
                    }`}
                  >
                    <div className="font-serif text-[11px] font-bold text-parchment-100">
                      {n.title}
                    </div>
                    <div className="font-serif text-[10px] text-parchment-200/50 leading-relaxed mt-0.5">
                      {n.summary}
                    </div>
                    <div className="font-mono text-[9px] text-parchment-200/30 mt-0.5">
                      {n.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 行动历史 */}
          <div className="doc-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-display text-xs font-bold tracking-widest text-gold">
                已执行措施
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
            </div>
            {domainHistory.length === 0 ? (
              <div className="font-mono text-[10px] text-parchment-200/30 text-center py-3">
                尚未执行任何{meta.label}措施
              </div>
            ) : (
              <div className="space-y-1">
                {domainHistory.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded bg-ink-900/40 px-2 py-1"
                  >
                    <span className="font-serif text-[11px] text-parchment-100">
                      {h.actionLabel}
                    </span>
                    <span className="font-mono text-[9px] text-parchment-200/40">
                      第 {h.turn} 月
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
