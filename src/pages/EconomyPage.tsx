import { motion } from 'motion/react'
import DomainPageLayout from '@/components/DomainPageLayout'
import { useGameStore } from '@/store/gameStore'
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

/** 经济页面 = 税率调节面板 + 通用领域布局 */
export default function EconomyPage() {
  const taxRate = useGameStore((s) => s.taxRate)
  const lastTaxChangeDay = useGameStore((s) => s.lastTaxChangeDay)
  const totalDays = useGameStore((s) => s.totalDays)
  const treasury = useGameStore((s) => s.metrics.treasury)
  const economy = useGameStore((s) => s.metrics.economy)
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

  return (
    <div className="flex flex-col h-full">
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
