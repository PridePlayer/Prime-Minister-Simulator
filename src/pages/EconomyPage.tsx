import { motion } from 'motion/react'
import DomainPageLayout from '@/components/DomainPageLayout'
import { useGameStore } from '@/store/gameStore'
import { growthLabel, unemploymentLabel } from '@/engine/simulation'
import type { GameState } from '@/types/game'

type TaxRate = GameState['taxRate']

/** 税率档位元信息 */
const TAX_META: Record<TaxRate, { label: string; icon: string; desc: string; color: string }> = {
  low: {
    label: '低税率',
    icon: '🌱',
    desc: '让利于民，刺激经济，但国库月进账较少',
    color: '#10b981',
  },
  medium: {
    label: '标准税率',
    icon: '⚖️',
    desc: '财政与民生的平衡点（默认）',
    color: '#f59e0b',
  },
  high: {
    label: '高税率',
    icon: '💰',
    desc: '国库充盈，但抑制经济活力、惹民众不满',
    color: '#f97316',
  },
  very_high: {
    label: '超高税率',
    icon: '🔥',
    desc: '战时级榨取，国库暴涨但经济重创、地下经济滋生',
    color: '#ef4444',
  },
}

/** 税率档位顺序（用于冷却判定与差值计算） */
const TAX_ORDER: TaxRate[] = ['low', 'medium', 'high', 'very_high']

/** 经济页面 = 宏观仪表盘 + 税率调节面板 + 通用领域布局 */
export default function EconomyPage() {
  const taxRate = useGameStore((s) => s.taxRate)
  const lastTaxChangeDay = useGameStore((s) => s.lastTaxChangeDay)
  const totalDays = useGameStore((s) => s.totalDays)
  const treasury = useGameStore((s) => s.metrics.treasury)
  const economy = useGameStore((s) => s.metrics.economy)
  const macro = useGameStore((s) => s.macro)
  const secondary = useGameStore((s) => s.secondary)
  const setTaxRate = useGameStore((s) => s.setTaxRate)

  const curMeta = TAX_META[taxRate]
  // 30 天冷却
  const daysSinceChange = totalDays - lastTaxChangeDay
  const cooldownLeft = Math.max(0, 30 - daysSinceChange)
  const canChange = lastTaxChangeDay === 0 || daysSinceChange >= 30

  // 预估月进账（与 advanceMonth 中的逻辑保持一致）
  const taxBaseMap: Record<TaxRate, number> = { low: 1, medium: 2, high: 4, very_high: 6 }
  const econBonus = Math.floor(economy / 20)
  const projectedIncome = Math.max(0, taxBaseMap[taxRate] + econBonus)

  // 宏观指标颜色
  const growthColor =
    macro.gdpGrowth >= 4 ? '#10b981' :
    macro.gdpGrowth >= 1 ? '#84cc16' :
    macro.gdpGrowth >= -1 ? '#eab308' :
    macro.gdpGrowth >= -3 ? '#f97316' : '#ef4444'

  const unemploymentColor =
    macro.unemployment < 5 ? '#10b981' :
    macro.unemployment < 8 ? '#84cc16' :
    macro.unemployment < 12 ? '#eab308' :
    macro.unemployment < 16 ? '#f97316' : '#ef4444'

  // 通胀标尺：50 为温和，>60 偏高，>70 危险
  const inflation = secondary.inflationRate
  const inflationColor =
    inflation < 45 ? '#84cc16' :
    inflation < 55 ? '#10b981' :
    inflation < 65 ? '#eab308' :
    inflation < 75 ? '#f97316' : '#ef4444'

  return (
    <div className="flex flex-col h-full">
      {/* 宏观经济仪表盘 */}
      <div className="doc-card p-3 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📈</span>
          <span className="font-display text-sm font-bold tracking-widest text-gold">
            宏观经济仪表盘
          </span>
          <span className="font-mono text-[10px] text-parchment-200/50">
            系统传导链核心：税收 = GDP × 税率；失业 → 抗议；通胀 → 民意
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* GDP 总量 */}
          <MacroCard
            icon="🏛️"
            label="GDP 总量"
            value={`¥${macro.gdp.toFixed(0)}B`}
            sub={`基准 1000B · ${macro.gdp >= 1000 ? '+' : ''}${(((macro.gdp - 1000) / 1000) * 100).toFixed(1)}%`}
            color="#fbbf24"
            subColor={macro.gdp >= 1000 ? '#7a9d55' : '#b34554'}
          />

          {/* GDP 增长率 */}
          <MacroCard
            icon="📊"
            label="GDP 月增长率"
            value={`${macro.gdpGrowth > 0 ? '+' : ''}${macro.gdpGrowth.toFixed(1)}%`}
            sub={growthLabel(macro.gdpGrowth)}
            color={growthColor}
            barValue={Math.min(100, Math.max(0, 50 + macro.gdpGrowth * 6))}
          />

          {/* 失业率 */}
          <MacroCard
            icon="👷"
            label="失业率"
            value={`${macro.unemployment.toFixed(1)}%`}
            sub={unemploymentLabel(macro.unemployment)}
            color={unemploymentColor}
            barValue={Math.min(100, macro.unemployment * 4)}
            inverted
          />

          {/* 通胀率 */}
          <MacroCard
            icon="🔥"
            label="通胀指数"
            value={Math.round(inflation).toString()}
            sub={
              inflation < 45 ? '通缩偏冷' :
              inflation < 55 ? '温和健康' :
              inflation < 65 ? '偏高预警' :
              inflation < 75 ? '过热危险' : '恶性通胀'
            }
            color={inflationColor}
            barValue={inflation}
            inverted
          />
        </div>

        {/* 月度财政收支 */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[10px]">
          <div className="rounded border border-emerald-500/20 bg-emerald-950/15 p-2">
            <div className="text-parchment-200/50">月度税收进账</div>
            <div className="text-emerald-300 font-bold text-base mt-0.5">
              +¥{macro.lastTaxIncome.toFixed(1)}B
            </div>
            <div className="text-parchment-200/30 text-[9px] mt-0.5">
              = GDP × {taxRate === 'low' ? '18%' : taxRate === 'medium' ? '25%' : taxRate === 'high' ? '33%' : '42%'} / 12
            </div>
          </div>
          <div className="rounded border border-red-500/20 bg-red-950/15 p-2">
            <div className="text-parchment-200/50">月度军费支出</div>
            <div className="text-red-400 font-bold text-base mt-0.5">
              -¥{macro.lastMilitarySpending.toFixed(1)}B
            </div>
            <div className="text-parchment-200/30 text-[9px] mt-0.5">
              = GDP × 国防预算% / 12
            </div>
          </div>
          <div className="rounded border border-gold/20 bg-gold/5 p-2">
            <div className="text-parchment-200/50">月度净收支</div>
            <div className={`font-bold text-base mt-0.5 ${
              macro.lastTaxIncome - macro.lastMilitarySpending > 0 ? 'text-emerald-300' : 'text-red-400'
            }`}>
              {macro.lastTaxIncome - macro.lastMilitarySpending > 0 ? '+' : ''}
              ¥{(macro.lastTaxIncome - macro.lastMilitarySpending).toFixed(1)}B
            </div>
            <div className="text-parchment-200/30 text-[9px] mt-0.5">
              税收 - 军费（不含其他施政支出）
            </div>
          </div>
        </div>

        {/* 传导链说明 */}
        <div className="mt-3 font-mono text-[9px] text-parchment-200/40 leading-relaxed">
          <span className="text-gold/60">传导链：</span>
          税率↑ → GDP增速↓ → 失业率↑ → 抗议↑ → 稳定↓；
          战争/制裁 → GDP↓ → 通胀↑ → 民意↓；
          军费%↑ → 国库支出↑ → 战备↑ → 真实军力↑
        </div>
      </div>

      {/* 税率调节面板 */}
      <div className="doc-card p-3 mb-3" style={{ borderColor: `${curMeta.color}55` }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🏛️</span>
          <span className="font-display text-sm font-bold tracking-widest text-gold">
            财政税率
          </span>
          <span className="font-mono text-[10px] text-parchment-200/50">
            调整税率影响每月国库进账、经济活力与民意
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-parchment-200/50">国库</span>
            <span className="font-display text-sm font-bold text-gold">
              {Math.round(treasury)}
            </span>
            <span className="font-mono text-[9px] text-emerald-400/70">
              预计 +{projectedIncome}/月
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TAX_ORDER.map((rate) => {
            const meta = TAX_META[rate]
            const isActive = taxRate === rate
            const isLocked = !canChange && !isActive
            return (
              <motion.button
                key={rate}
                whileHover={canChange ? { scale: 1.02 } : {}}
                whileTap={canChange ? { scale: 0.98 } : {}}
                disabled={isLocked || isActive}
                onClick={() => setTaxRate(rate)}
                className={`relative rounded border p-2 text-left transition-all ${
                  isActive
                    ? 'bg-ink-700/70 shadow-lg'
                    : isLocked
                    ? 'opacity-40 cursor-not-allowed bg-ink-900/30 border-parchment-200/10'
                    : 'bg-ink-800/40 hover:bg-ink-700/50 cursor-pointer'
                }`}
                style={{
                  borderColor: isActive ? meta.color : undefined,
                  borderWidth: isActive ? '1.5px' : '1px',
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">{meta.icon}</span>
                  <span
                    className="font-serif text-xs font-bold"
                    style={{ color: isActive ? meta.color : undefined }}
                  >
                    {meta.label}
                  </span>
                  {isActive && (
                    <span
                      className="ml-auto font-mono text-[8px] px-1 py-0.5 rounded"
                      style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                    >
                      当前
                    </span>
                  )}
                </div>
                <p className="font-serif text-[9px] text-parchment-200/55 leading-relaxed">
                  {meta.desc}
                </p>
                <div className="font-mono text-[8px] text-parchment-200/40 mt-1">
                  基础进账 +{taxBaseMap[rate]}/月
                </div>
              </motion.button>
            )
          })}
        </div>

        {!canChange && (
          <div className="mt-2 flex items-center gap-1.5 font-mono text-[9px] text-orange-400/80">
            <span className="animate-pulse">⏳</span>
            <span>税率调整冷却中：还需 {cooldownLeft} 天</span>
          </div>
        )}
      </div>

      {/* 通用领域布局 */}
      <div className="flex-1 min-h-0">
        <DomainPageLayout domain="economy" />
      </div>
    </div>
  )
}

/** 宏观经济卡片 */
function MacroCard({
  icon,
  label,
  value,
  sub,
  color,
  subColor,
  barValue,
  inverted,
}: {
  icon: string
  label: string
  value: string
  sub: string
  color: string
  subColor?: string
  barValue?: number
  inverted?: boolean
}) {
  return (
    <div className="rounded-md border border-parchment-200/15 bg-ink-900/40 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-base">{icon}</span>
        <span className="font-serif text-[10px] text-parchment-200/60">{label}</span>
      </div>
      <div className="font-display text-xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="font-mono text-[9px] mt-0.5" style={{ color: subColor ?? color }}>
        {sub}
      </div>
      {barValue !== undefined && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-ink-900/60 mt-1.5">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, barValue)}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      )}
      {inverted && (
        <div className="font-mono text-[8px] text-parchment-200/30 mt-0.5">越低越好</div>
      )}
    </div>
  )
}
