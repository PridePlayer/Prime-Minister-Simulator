import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { METRIC_META } from '@/data/metrics'
import type { MetricKey, AttributionEntry, MonthlyAttributionReport } from '@/types/game'

/**
 * v1.5 月度归因报告页
 *
 * 在仪表盘上方点击"本月归因"打开，或月度结算后自动弹出。
 * 显示本月指标变化来自哪里：
 *  - 玩家决策（事件选项 / 政策 / 改革）
 *  - 自然衰减（极端值回归）
 *  - 国家政策每月效果
 *  - 改革每回合效果
 *  - 内阁加成
 *  - 宏观引擎传导（GDP↔失业↔通胀↔民意↔军费↔腐败）
 *
 * 让玩家明白"为什么民意掉了 8 点"，而非凭感觉猜测。
 */
const SOURCE_META: Record<AttributionEntry['source'], { label: string; icon: string; color: string }> = {
  decision: { label: '决策', icon: '⚖️', color: '#fbbf24' },
  event: { label: '事件', icon: '⚡', color: '#f59e0b' },
  policy: { label: '政策', icon: '🌐', color: '#06b6d4' },
  initiative: { label: '改革', icon: '📋', color: '#a855f7' },
  law: { label: '法律', icon: '⚖️', color: '#8b5cf6' },
  diplomacy: { label: '外交', icon: '🤝', color: '#0ea5e9' },
  war: { label: '战争', icon: '⚔️', color: '#ef4444' },
  natural: { label: '自然', icon: '🌿', color: '#22c55e' },
  cross_system: { label: '联动', icon: '🔗', color: '#ec4899' },
  monthly_simulation: { label: '宏观引擎', icon: '⚙️', color: '#64748b' },
}

interface MonthlyReportPageProps {
  /** 是否以弹窗形式打开（默认 false = 嵌入式面板） */
  asModal?: boolean
  onClose?: () => void
}

export default function MonthlyReportPage({ asModal = false, onClose }: MonthlyReportPageProps) {
  const monthlyAttribution = useGameStore((s) => s.monthlyAttribution) ?? []
  const curTurn = useGameStore((s) => s.turn)
  const curMonth = useGameStore((s) => s.month)
  const curYear = useGameStore((s) => s.year)
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null)

  // 由 turn 反推该报告对应的"刚结算完的月份"标签。
  // 当前状态 turn=curTurn 对应当前正在玩的月份 curMonth/curYear；
  // 报告 turn=T_r 是在"进入 turn T_r 那次月结算"时生成的，对应的是上一个月（刚结束的那个月）。
  // 因此 report 月 = curMonth - (curTurn - T_r) - 1（按绝对月计算，自动处理跨年）。
  const labelForTurn = useMemo(() => {
    const curAbs = curYear * 12 + curMonth // 1 月 = Y*12+1
    return (turn: number) => {
      const abs = curAbs - (curTurn - turn) - 1
      const y = Math.floor((abs - 1) / 12)
      const m = ((abs - 1) % 12) + 1
      return `${y}年${m}月`
    }
  }, [curTurn, curMonth, curYear])

  // 默认显示最近一个月
  const reports = useMemo(() => {
    return [...monthlyAttribution].sort((a, b) => b.turn - a.turn)
  }, [monthlyAttribution])

  const current: MonthlyAttributionReport | undefined = useMemo(() => {
    if (reports.length === 0) return undefined
    return reports.find((r) => r.turn === selectedTurn) ?? reports[0]
  }, [reports, selectedTurn])

  // 计算每项指标的"本月总变化"汇总
  const metricDeltas = useMemo(() => {
    if (!current) return null
    const totals: Record<string, number> = {}
    for (const entry of current.entries) {
      for (const [k, v] of Object.entries(entry.effects)) {
        totals[k] = (totals[k] ?? 0) + (v ?? 0)
      }
    }
    return totals
  }, [current])

  if (!current) {
    return (
      <div className="doc-card p-8 text-center">
        <div className="text-4xl opacity-40 mb-3">📊</div>
        <h3 className="font-serif text-lg text-parchment-100">尚无月度归因报告</h3>
        <p className="font-serif text-xs text-parchment-200/50 mt-2">
          月度结算后将自动生成报告，详细说明本月各项指标变化来自哪里。
        </p>
      </div>
    )
  }

  const content = (
    <div className="space-y-4">
      {/* 顶部：月份选择器 + 总览 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-lg font-bold tracking-[0.2em] text-gold">
            📊 本月归因报告
          </h2>
          <p className="font-serif text-xs text-parchment-200/50 mt-0.5">
            {labelForTurn(current.turn)} · 共 {current.entries.length} 条变化来源
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {reports.slice(0, 3).map((r) => (
            <button
              key={r.turn}
              onClick={() => setSelectedTurn(r.turn)}
              className={`px-2 py-1 rounded font-mono text-[10px] font-bold transition-colors ${
                r.turn === current.turn
                  ? 'bg-gold text-ink-900'
                  : 'bg-parchment-200/10 text-parchment-200/60 hover:bg-parchment-200/20'
              }`}
            >
              {labelForTurn(r.turn)}
            </button>
          ))}
        </div>
      </div>

      {/* 总览卡片：6 项指标的本月净变化 */}
      {metricDeltas && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {METRIC_META.map((meta) => {
            const key = meta.key as MetricKey
            const delta = metricDeltas[key] ?? 0
            const isPositive = delta > 0
            const isNegative = delta < 0
            return (
              <div
                key={key}
                className="rounded-md border border-gold/15 bg-ink-800/40 p-2 text-center"
              >
                <div className="text-[10px] text-parchment-200/60">{meta.icon} {meta.label}</div>
                <div
                  className={`font-mono text-lg font-bold mt-1 ${
                    isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-parchment-200/40'
                  }`}
                >
                  {delta > 0 ? '+' : ''}{delta}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 归因明细列表 */}
      <div className="space-y-2">
        <div className="px-1 font-mono text-[10px] font-bold tracking-wider text-parchment-200/60">
          变化来源明细
        </div>
        <AnimatePresence mode="popLayout">
          {current.entries.map((entry, idx) => (
            <motion.div
              key={`${current.turn}-${idx}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, delay: idx * 0.02 }}
              className="rounded-md border border-gold/15 bg-ink-800/40 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span className="text-base shrink-0">
                    {SOURCE_META[entry.source].icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-serif text-sm font-semibold text-parchment-100">
                      {entry.label}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
                        style={{
                          color: SOURCE_META[entry.source].color,
                          backgroundColor: `${SOURCE_META[entry.source].color}20`,
                        }}
                      >
                        {SOURCE_META[entry.source].label}
                      </span>
                      {entry.day !== undefined && (
                        <span className="font-mono text-[9px] text-parchment-200/40">
                          第 {entry.day} 天
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* 效果数值 */}
                <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                  {Object.entries(entry.effects).map(([k, v]) => {
                    if (!v || v === 0) return null
                    const meta = METRIC_META.find((m) => m.key === k)
                    if (!meta) return null
                    const isPositive = v > 0
                    return (
                      <span
                        key={k}
                        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                          isPositive
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-red-500/15 text-red-300'
                        }`}
                      >
                        {meta.icon} {isPositive ? '+' : ''}{v}
                      </span>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 底部说明 */}
      <div className="border-t border-gold/15 pt-3">
        <p className="font-serif text-[10px] text-parchment-200/40 leading-relaxed">
          报告自动汇总本月所有指标变化来源：玩家决策、自然回归、政策/改革每月效果、宏观引擎传导。
          仅保留最近 3 个月。点击上方月份切换查看历史报告。
        </p>
      </div>
    </div>
  )

  if (asModal) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85vh] w-[720px] max-w-[92vw] overflow-y-auto rounded-xl border-2 border-gold/30 bg-ink-900 p-5 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full bg-parchment-200/10 px-3 py-1.5 font-mono text-xs font-bold text-parchment-200/60 transition-colors hover:bg-parchment-200/20"
            >
              ✕
            </button>
            {content}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return <div className="doc-card p-5">{content}</div>
}
