import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { METRIC_META, metricColor } from '@/data/metrics'
import type { MetricKey } from '@/types/game'
import HistoryChart from './HistoryChart'

/**
 * 历史曲线面板（v1.5）
 *
 * 在仪表盘底部展示多张月度趋势折线图，让玩家看到走势而非瞬时值。
 *
 * 布局：
 *  - 上半：6 项一级指标（民意/国库/经济/稳定/外交/声望）2 列网格
 *  - 下半：3 项宏观经济（GDP 总量 / 失业率 / 通胀指数）3 列网格
 *  - 顶部含折叠/展开按钮，默认展开，玩家可点击收起
 *  - 数据来自 store.metricHistory（每月由 eventEngine.advanceMonth 月结算推送，最多保留 60 条记录，覆盖 48 个月任期）
 */
export default function HistoryChartsPanel() {
  const metricHistory = useGameStore((s) => s.metricHistory)
  const [expanded, setExpanded] = useState(true)

  // 抽取每个指标的历史数据数组（按时间顺序）
  const series = useMemo(() => {
    const approval = metricHistory.map((h) => h.approval)
    const treasury = metricHistory.map((h) => h.treasury)
    const economy = metricHistory.map((h) => h.economy)
    const stability = metricHistory.map((h) => h.stability)
    const diplomacy = metricHistory.map((h) => h.diplomacy)
    const prestige = metricHistory.map((h) => h.prestige)
    const gdpTotal = metricHistory.map((h) => h.gdpTotal)
    const unemploymentRate = metricHistory.map((h) => h.unemploymentRate)
    const inflationIndex = metricHistory.map((h) => h.inflationIndex)
    return {
      approval,
      treasury,
      economy,
      stability,
      diplomacy,
      prestige,
      gdpTotal,
      unemploymentRate,
      inflationIndex,
    }
  }, [metricHistory])

  // 统计：已记录月数 / 起始月份
  const monthCount = metricHistory.length
  const startTurn = monthCount > 0 ? metricHistory[0].turn : 0
  const endTurn = monthCount > 0 ? metricHistory[monthCount - 1].turn : 0

  // 6 项一级指标配置（从 METRIC_META 派生标签和图标）
  const metricCharts = METRIC_META.map((meta) => {
    const key = meta.key as MetricKey
    return {
      key,
      label: `${meta.icon} ${meta.label}`,
      data: series[key],
      color: metricColor(60), // 基础色：折线趋势色会动态覆盖
      positive: true,
    }
  })

  // 3 项宏观经济指标配置
  const macroCharts = [
    {
      key: 'gdpTotal' as const,
      label: 'GDP 总量',
      data: series.gdpTotal,
      color: '#5a7d3a',
      unit: '亿',
      positive: true,
    },
    {
      key: 'unemploymentRate' as const,
      label: '失业率',
      data: series.unemploymentRate,
      color: '#b5722a',
      unit: '%',
      positive: false, // 失业率越低越好
    },
    {
      key: 'inflationIndex' as const,
      label: '通胀指数',
      data: series.inflationIndex,
      color: '#b5722a',
      unit: '',
      positive: false, // 通胀率越低越好
    },
  ]

  return (
    <div className="doc-card p-4" data-history-charts-panel>
      {/* 标题栏：含折叠按钮 */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="font-display text-sm font-semibold tracking-[0.25em] text-gold">
          历 史 曲 线
        </span>
        <span className="font-serif text-[10px] italic text-parchment-200/40">
          {monthCount > 0
            ? `（已记录 ${monthCount} 个月 · 第 ${startTurn}~${endTurn} 月）`
            : '（尚无历史数据，下月起开始记录）'}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        <button
          onClick={() => setExpanded((v) => !v)}
          className="font-mono text-[10px] text-gold/70 hover:text-gold transition-colors px-2 py-1 rounded border border-gold/20 hover:border-gold/40"
        >
          {expanded ? '收起 ▲' : '展开 ▼'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* 上：6 项一级指标 2 列网格 */}
            <div className="mb-2">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="font-mono text-[10px] text-gold/60">▎</span>
                <span className="font-serif text-[11px] font-semibold text-parchment-200/70">
                  一级指标走势
                </span>
                <span className="font-serif text-[9px] italic text-parchment-200/35">
                  （绿=上行良好，红=下行警示）
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {metricCharts.map((cfg) => (
                  <HistoryChart
                    key={cfg.key}
                    data={cfg.data}
                    label={cfg.label}
                    color={cfg.color}
                    height={90}
                    positive={cfg.positive}
                  />
                ))}
              </div>
            </div>

            {/* 下：3 项宏观经济指标 3 列网格 */}
            <div className="mt-3 pt-3 border-t border-gold/10">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="font-mono text-[10px] text-gold/60">▎</span>
                <span className="font-serif text-[11px] font-semibold text-parchment-200/70">
                  宏观经济走势
                </span>
                <span className="font-serif text-[9px] italic text-parchment-200/35">
                  （GDP 总量 / 失业率 / 通胀指数）
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {macroCharts.map((cfg) => (
                  <HistoryChart
                    key={cfg.key}
                    data={cfg.data}
                    label={cfg.label}
                    color={cfg.color}
                    height={90}
                    unit={cfg.unit}
                    positive={cfg.positive}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
