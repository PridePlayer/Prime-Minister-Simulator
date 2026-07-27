import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import MetricEffectBadge from '@/components/MetricEffectBadge'
import { shouldShowOptionEffects } from '@/engine/metrics'
import type { MetricKey } from '@/types/game'

const CATEGORY_STYLE: Record<string, { color: string; bg: string }> = {
  经济: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  外交: { color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  社会: { color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  军事: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  环境: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  突发: { color: '#dc2626', bg: 'rgba(220,38,38,0.2)' },
  政治体制: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  紧急: { color: '#dc2626', bg: 'rgba(220,38,38,0.2)' },
}

/** 事件弹窗：显示当前活动事件，玩家可在 7 天内决策，也可关闭后从收纳篮重开 */
export default function EventPopup() {
  const activePendingEventId = useGameStore((s) => s.activePendingEventId)
  const pendingEvents = useGameStore((s) => s.pendingEvents)
  const totalDays = useGameStore((s) => s.totalDays)
  const difficulty = useGameStore((s) => s.difficulty)
  const closePendingEvent = useGameStore((s) => s.closePendingEvent)
  const resolvePendingEvent = useGameStore((s) => s.resolvePendingEvent)
  const [selected, setSelected] = useState<string | null>(null)

  const event = pendingEvents.find((e) => e.instanceId === activePendingEventId)

  const handleChoose = async (optionId: string) => {
    if (!event) return
    setSelected(optionId)
    setTimeout(() => {
      resolvePendingEvent(event.instanceId, optionId)
      setSelected(null)
      // 不再每次决策都自动存档，依赖 15 分钟周期自动存档 + 手动存档
    }, 500)
  }

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 24, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 240 }}
            className="relative max-h-[90vh] w-[680px] max-w-[92vw] overflow-hidden rounded-xl shadow-2xl"
            style={{
              background: 'linear-gradient(165deg, #fef9f0 0%, #fde9c8 100%)',
              border: `2px solid ${event.isEmergency ? '#dc2626' : '#d97706'}`,
            }}
          >
            {/* 顶部标签栏 */}
            <div
              className="flex items-center justify-between px-6 py-3"
              style={{
                background: event.isEmergency
                  ? 'linear-gradient(90deg, #b91c1c, #dc2626)'
                  : 'linear-gradient(90deg, #b45309, #d97706)',
                color: 'white',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{event.isEmergency ? '🚨' : '📨'}</span>
                <span
                  className="rounded px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest"
                  style={{
                    color: CATEGORY_STYLE[event.category]?.color ?? '#d97706',
                    backgroundColor: 'rgba(255,255,255,0.25)',
                  }}
                >
                  {event.category}
                </span>
              </div>

              {/* 7 天倒计时 */}
              <Countdown daysLeft={event.deadlineDay - totalDays} />

              {/* 关闭按钮 */}
              <button
                onClick={closePendingEvent}
                className="rounded-full bg-white/20 px-3 py-1 font-mono text-xs font-bold text-white transition-colors hover:bg-white/40"
                title="关闭后可在事件收纳篮中重新打开"
              >
                ✕ 稍后处理
              </button>
            </div>

            {/* 主体内容 */}
            <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: '70vh' }}>
              {/* 标题 */}
              <h2 className="mb-3 font-serif text-2xl font-bold text-amber-950">
                {event.title}
              </h2>

              {/* 描述 */}
              <div className="mb-5 rounded-lg border border-amber-300/50 bg-amber-50/60 px-4 py-3">
                <p className="font-serif text-[14px] leading-relaxed text-amber-900/90">
                  {event.description}
                </p>
              </div>

              {/* 选项列表 */}
              <div className="space-y-2.5">
                {event.options.map((opt, i) => {
                  const isFading = selected && selected !== opt.id
                  const isSelected = selected === opt.id
                  return (
                    <motion.button
                      key={opt.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{
                        opacity: isFading ? 0.4 : 1,
                        y: 0,
                        scale: isSelected ? 1.01 : 1,
                      }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      disabled={!!selected}
                      onClick={() => handleChoose(opt.id)}
                      className={`relative w-full overflow-hidden rounded-lg border-2 p-4 text-left transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-100 shadow-lg'
                          : 'border-amber-300/50 bg-white/70 hover:border-amber-500/70 hover:bg-amber-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-serif text-[15px] font-bold text-amber-950">
                            {opt.label}
                          </div>
                          {opt.description && (
                            <div className="mt-0.5 font-serif text-xs italic text-amber-800/70">
                              {opt.description}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <motion.span
                            className="font-mono text-[10px] text-amber-700"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                          >
                            执行中…
                          </motion.span>
                        )}
                      </div>

                      {/* 预期影响（鼠标悬停显示指标说明与当前值）
                          困难模式下：模糊选项（tone=neutral/undefined）隐藏效果，需玩家自行判断 */}
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {shouldShowOptionEffects(opt, difficulty) ? (
                          <>
                            {(Object.entries(opt.effects) as [MetricKey, number][]).map(
                              ([key, val]) => (
                                <MetricEffectBadge
                                  key={key}
                                  metricKey={key}
                                  value={val}
                                  variant="light"
                                />
                              ),
                            )}
                            {opt.pmStatEffects &&
                              (Object.entries(opt.pmStatEffects) as [string, number][]).map(
                                ([key, val]) => (
                                  <MetricEffectBadge
                                    key={key}
                                    metricKey={key}
                                    value={val ?? 0}
                                    variant="light"
                                  />
                                ),
                              )}
                          </>
                        ) : (
                          <span className="font-mono text-[10px] italic text-parchment-200/40">
                            ? 后果未卜
                          </span>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* 默认选项提示 */}
              <div className="mt-4 flex items-center justify-center gap-1 font-mono text-[10px] text-amber-700/60">
                <span>💡</span>
                <span>
                  若 {event.deadlineDay - totalDays} 天内未决策，将自动选择：
                  <strong className="text-amber-800">
                    {event.options.find((o) => o.id === event.defaultOptionId)?.label ?? '默认选项'}
                  </strong>
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** 倒计时显示 */
function Countdown({ daysLeft }: { daysLeft: number }) {
  const isUrgent = daysLeft <= 2
  return (
    <motion.div
      animate={isUrgent ? { scale: [1, 1.06, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
      className={`flex items-center gap-1 rounded-full px-3 py-1 font-mono text-xs font-bold ${
        isUrgent
          ? 'bg-red-100 text-red-700'
          : 'bg-white/20 text-white'
      }`}
    >
      <span>{isUrgent ? '⚠' : '⏳'}</span>
      <span>剩余 {daysLeft} 天</span>
    </motion.div>
  )
}
