import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import MetricEffectBadge from '@/components/MetricEffectBadge'

/**
 * 决策结果反馈飞字：屏幕右下方浮起的小卡片
 * - 当 store.decisionResult 被设置时浮现
 * - 列出本次决策造成的指标 / PMStats / PMTraits 变化
 * - 自动 6 秒后消失，也可点击 ✕ 立即关闭
 * - 关闭后调用 set({ decisionResult: null }) 清空状态，避免重复弹出
 *
 * 用于解决"决策后无反馈"的玩家痛点：所有难度下都展示实际数值变化。
 */
const AUTO_DISMISS_MS = 6000

/** PMTraits 标签 */
const TRAIT_LABELS: Record<string, { label: string; icon: string }> = {
  health: { label: '健康', icon: '❤️' },
  charisma: { label: '魅力', icon: '✨' },
  decisiveness: { label: '果断', icon: '⚡' },
  resilience: { label: '韧性', icon: '🛡️' },
  integrity: { label: '道德', icon: '⚖️' },
}

/** 把 effects + pmStatEffects + traitEffects 合并到统一渲染列表 */
function collectEffects(
  decision: NonNullable<ReturnType<typeof useGameStore.getState>['decisionResult']>,
) {
  const items: { key: string; value: number; kind: 'metric' | 'pmStat' | 'trait' }[] = []
  if (decision.effects) {
    for (const [k, v] of Object.entries(decision.effects)) {
      if (v && v !== 0) items.push({ key: k, value: v, kind: 'metric' })
    }
  }
  if (decision.pmStatEffects) {
    for (const [k, v] of Object.entries(decision.pmStatEffects)) {
      if (v && v !== 0) items.push({ key: k, value: v, kind: 'pmStat' })
    }
  }
  if (decision.traitEffects) {
    for (const [k, v] of Object.entries(decision.traitEffects)) {
      if (v && v !== 0) items.push({ key: k, value: v, kind: 'trait' })
    }
  }
  return items
}

export default function DecisionResultToast() {
  const decisionResult = useGameStore((s) => s.decisionResult)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (decisionResult) {
      setVisible(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setVisible(false)
        // 动画完成后清空 store 中的状态
        setTimeout(() => {
          useGameStore.setState({ decisionResult: null })
        }, 400)
      }, AUTO_DISMISS_MS)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [decisionResult])

  const items = decisionResult ? collectEffects(decisionResult) : []
  const hasAnyEffect = items.length > 0

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50" data-decision-toast>
      <AnimatePresence>
        {decisionResult && visible && (
          <motion.div
            key={decisionResult.optionLabel + JSON.stringify(decisionResult.effects)}
            initial={{ opacity: 0, x: 60, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            className="pointer-events-auto relative"
            style={{ width: 340 }}
          >
            <div
              className="relative overflow-hidden rounded-lg"
              style={{
                border: '1px solid rgba(245,158,11,0.55)',
                boxShadow:
                  '0 10px 30px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,158,11,0.12)',
                background:
                  'linear-gradient(135deg, rgba(58,36,24,0.97) 0%, rgba(42,24,16,0.99) 100%)',
              }}
            >
              {/* 顶部金色光带 */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />

              {/* 关闭按钮 */}
              <button
                onClick={() => {
                  setVisible(false)
                  setTimeout(() => {
                    useGameStore.setState({ decisionResult: null })
                  }, 400)
                }}
                className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-parchment-200/60 transition-colors hover:bg-gold/20 hover:text-gold"
                aria-label="关闭"
              >
                <span className="text-xs leading-none">✕</span>
              </button>

              <div className="px-4 pb-3 pt-4">
                {/* 顶部：标题 */}
                <div className="mb-2 flex items-center gap-2 pr-6">
                  <span className="text-base leading-none">📋</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold/70">
                    决 策 反 馈
                  </span>
                </div>

                <div className="mb-2 font-display text-sm font-bold leading-tight text-parchment-100">
                  {decisionResult.optionLabel}
                </div>

                {/* 效果徽章 */}
                <div className="flex flex-wrap gap-1.5">
                  {hasAnyEffect ? (
                    items.map((it) => {
                      // trait 单独渲染（MetricEffectBadge 不处理 trait）
                      if (it.kind === 'trait') {
                        const meta = TRAIT_LABELS[it.key]
                        const positive = it.value > 0
                        return (
                          <span
                            key={`trait_${it.key}`}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
                            style={{
                              color: positive ? '#7a9d55' : '#b34554',
                              backgroundColor: positive
                                ? 'rgba(122,157,85,0.12)'
                                : 'rgba(179,69,84,0.12)',
                            }}
                          >
                            {meta?.icon ?? '📊'} {positive ? '+' : ''}{it.value}
                          </span>
                        )
                      }
                      // metric 与 pmStat 都用 MetricEffectBadge 渲染
                      return (
                        <MetricEffectBadge
                          key={`${it.kind}_${it.key}`}
                          metricKey={it.key}
                          value={it.value}
                          variant="dark"
                        />
                      )
                    })
                  ) : (
                    <span className="font-serif text-xs text-parchment-200/50">
                      无指标变化
                    </span>
                  )}
                </div>
              </div>

              {/* 底部渐变金色装饰线 */}
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent opacity-80" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
