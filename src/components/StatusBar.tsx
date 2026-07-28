import { useGameStore, TERM_LENGTH } from '@/store/gameStore'
import { average } from '@/engine/metrics'
import { metricColor, METRIC_META } from '@/data/metrics'
import MetricTooltip from '@/components/MetricTooltip'
import type { MetricKey } from '@/types/game'
import logoIcon from '@/icon/icon.png'

/** PMStats 显示条 */
function PMStatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1.5" title={`${label}：${value}`}>
      <div className="flex items-center gap-1">
        <span className="text-xs">{icon}</span>
        <span className="font-mono text-[9px] tracking-wider text-parchment-200/60">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-1 w-10 overflow-hidden rounded-full bg-ink-700">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${value}%`, backgroundColor: color }}
          />
        </div>
        <span className="font-mono text-xs font-semibold" style={{ color }}>
          {value}
        </span>
      </div>
    </div>
  )
}

/** 顶部状态栏 */
export default function StatusBar() {
  const { pmName, countryName, term, year, month, day, turn, metrics, pmStats, partyPatience } = useGameStore()
  const turnInTerm = ((turn - 1) % TERM_LENGTH) + 1
  const avg = average(metrics)
  const cabinetSupport = Math.round(
    useGameStore.getState().cabinet.reduce((a, c) => a + c.loyalty, 0) /
      useGameStore.getState().cabinet.length,
  )

  // 任期将满警告：本届任期剩余不足 4 个月时显示橙色提示
  const monthsRemaining = TERM_LENGTH - turnInTerm + 1
  const electionNear = turnInTerm >= 44 && turnInTerm <= TERM_LENGTH

  // PMStats 颜色：政治资本金、党内威望绿、辩论技巧蓝、风险指数红（越高越危险）
  const pcColor = pmStats.politicalCapital < 25 ? '#ef4444' : pmStats.politicalCapital < 50 ? '#f59e0b' : '#fbbf24'
  const ppColor = pmStats.partyPrestige < 30 ? '#ef4444' : pmStats.partyPrestige < 50 ? '#f59e0b' : '#10b981'
  const rhColor = pmStats.rhetoric < 30 ? '#f59e0b' : '#3b82f6'
  const riColor = pmStats.riskIndex > 60 ? '#ef4444' : pmStats.riskIndex > 30 ? '#f59e0b' : '#10b981'

  // 执政党耐心值：< 30 触发最后通牒，< 50 显示橙色警告
  const patColor = partyPatience < 30 ? '#ef4444' : partyPatience < 50 ? '#f59e0b' : '#a855f7'
  const patWarn = partyPatience < 50

  return (
    <header className="status-bar relative flex items-center gap-2 px-4 py-2 overflow-hidden">
      {/* 左：总理与任期 */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/50 bg-ink-900 shadow-gold overflow-hidden">
          <img src={logoIcon} alt="logo" className="h-full w-full object-cover" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-base font-semibold text-parchment-100">
            {pmName}
          </div>
          <div className="font-mono text-[10px] tracking-wider text-gold/80">
            {countryName} · 第 {term} 届 · 执政第 {turnInTerm} 月
          </div>
        </div>
      </div>

      {/* 中左：年月日与回合
          固定 min-width + tabular-nums，避免月/日位数变化（1↔12、1↔31）
          导致容器宽度跳动，进而挤压右侧所有元素左右平移 */}
      <div className="flex flex-col items-center shrink-0 border-l border-gold/20 pl-3 min-w-[216px]">
        <div className="font-display text-lg font-semibold tracking-wide text-gold tabular-nums">
          {year} 年 {month} 月 {day} 日
        </div>
        <div className="font-mono text-[9px] tracking-[0.3em] text-parchment-200/60 tabular-nums">
          本届第 {turnInTerm} / {TERM_LENGTH} 月
        </div>
        {electionNear && (
          <div className="mt-0.5 rounded-full border border-orange-500/50 bg-orange-950/60 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-orange-300 animate-pulse">
            ⚠ 任期将满 · 大选临近（剩 {monthsRemaining} 月）
          </div>
        )}
      </div>

      {/* 中：6 项核心指标（带 hover tooltip） */}
      <div className="flex items-center gap-1 border-l border-gold/20 pl-2 shrink-0">
        {METRIC_META.map((m) => {
          const value = metrics[m.key as MetricKey]
          const color = metricColor(value)
          return (
            <MetricTooltip
              key={m.key}
              label={m.label}
              description={m.desc}
              value={value}
            >
              <div
                className="flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:bg-ink-700/40 cursor-help"
                title={`${m.label}：${value}`}
              >
                <span className="text-sm">{m.icon}</span>
                <span className="font-mono text-xs font-bold" style={{ color }}>
                  {value}
                </span>
              </div>
            </MetricTooltip>
          )
        })}
      </div>

      {/* 中右：综合国力 */}
      <div className="text-right border-l border-gold/20 pl-3 shrink-0">
        <div className="font-mono text-[9px] tracking-wider text-parchment-200/60">
          国力
        </div>
        <div
          className="font-mono text-lg font-semibold"
          style={{ color: metricColor(avg) }}
        >
          {avg}
        </div>
      </div>

      {/* 右：PMStats 四项资源 */}
      <div className="flex items-center gap-0.5 border-l border-gold/20 pl-2 shrink-0">
        <PMStatBar label="政治资本" value={pmStats.politicalCapital} color={pcColor} icon="💼" />
        <PMStatBar label="党内威望" value={pmStats.partyPrestige} color={ppColor} icon="🏛️" />
        <PMStatBar label="辩论技巧" value={pmStats.rhetoric} color={rhColor} icon="🗣️" />
        <PMStatBar label="风险指数" value={pmStats.riskIndex} color={riColor} icon="⚠️" />
      </div>

      {/* 最右：内阁支持 */}
      <div className="text-right border-l border-gold/20 pl-2 shrink-0">
        <div className="font-mono text-[9px] tracking-wider text-parchment-200/60">
          内阁支持
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <div className="h-1 w-10 overflow-hidden rounded-full bg-ink-600">
            <div
              className="h-full rounded-full bg-gold transition-all duration-500"
              style={{ width: `${cabinetSupport}%` }}
            />
          </div>
          <span className="font-mono text-xs text-parchment-100">{cabinetSupport}</span>
        </div>
      </div>

      {/* 执政党耐心值：< 50 时高亮显示警告 */}
      <div className="text-right border-l border-gold/20 pl-2 shrink-0" title={`执政党耐心：${partyPatience}/100${patWarn ? '（耐心不足，可能触发最后通牒）' : ''}`}>
        <div className={`font-mono text-[9px] tracking-wider flex items-center gap-1 justify-end ${patWarn ? 'text-red-400 animate-pulse' : 'text-parchment-200/60'}`}>
          执政党耐心
          {patWarn && <span className="text-[9px]">⚠</span>}
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <div className={`h-1 w-10 overflow-hidden rounded-full bg-ink-600 ${patWarn ? 'ring-1 ring-red-500/40' : ''}`}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${partyPatience}%`, backgroundColor: patColor }}
            />
          </div>
          <span className="font-mono text-xs" style={{ color: patColor }}>{partyPatience}</span>
        </div>
      </div>
    </header>
  )
}
