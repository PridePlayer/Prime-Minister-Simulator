import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { useSaveGame } from '@/hooks/useSaveGame'
import { METRIC_META } from '@/data/metrics'
import type { MetricKey, PendingEvent } from '@/types/game'

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

/** 事件收纳篮：展示所有待处理事件，可点击打开 */
export default function EventBasket() {
  const showEventBasket = useGameStore((s) => s.showEventBasket)
  const setShowEventBasket = useGameStore((s) => s.setShowEventBasket)
  const pendingEvents = useGameStore((s) => s.pendingEvents)
  const totalDays = useGameStore((s) => s.totalDays)
  const openPendingEvent = useGameStore((s) => s.openPendingEvent)
  const resolvePendingEvent = useGameStore((s) => s.resolvePendingEvent)

  return (
    <AnimatePresence>
      {showEventBasket && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowEventBasket(false)}
        >
          <motion.div
            initial={{ scale: 0.95, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85vh] w-[640px] max-w-[92vw] overflow-hidden rounded-xl border-2 border-amber-300/40 bg-gradient-to-br from-amber-50 to-orange-100 shadow-2xl"
          >
            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between border-b-2 border-amber-400/40 bg-gradient-to-r from-amber-200/80 to-orange-200/80 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🗂️</span>
                <div>
                  <h2 className="font-serif text-xl font-bold text-amber-900">事件收纳篮</h2>
                  <p className="font-mono text-[10px] text-amber-700/70">
                    Event Basket · 待处理 {pendingEvents.length} 件
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEventBasket(false)}
                className="rounded-full bg-amber-700/20 px-3 py-1.5 font-mono text-xs font-bold text-amber-900 transition-colors hover:bg-amber-700/40"
              >
                ✕ 关闭
              </button>
            </div>

            {/* 事件列表 */}
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {pendingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="text-6xl opacity-40">📭</div>
                  <p className="font-serif text-lg text-amber-800/70">事件篮是空的</p>
                  <p className="font-mono text-xs text-amber-700/50">
                    政务清平，国泰民安
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingEvents.map((event) => (
                    <EventBasketCard
                      key={event.instanceId}
                      event={event}
                      currentDay={totalDays}
                      onOpen={() => {
                        openPendingEvent(event.instanceId)
                        setShowEventBasket(false)
                      }}
                      onQuickResolve={(optionId) => resolvePendingEvent(event.instanceId, optionId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface EventBasketCardProps {
  event: PendingEvent
  currentDay: number
  onOpen: () => void
  onQuickResolve: (optionId: string) => void
}

function EventBasketCard({ event, currentDay, onOpen, onQuickResolve }: EventBasketCardProps) {
  const cat = CATEGORY_STYLE[event.category] ?? CATEGORY_STYLE['突发']
  const daysLeft = event.deadlineDay - currentDay
  const isUrgent = daysLeft <= 2
  const isEmergency = event.isEmergency

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-lg border-2 p-4 shadow-sm transition-all hover:shadow-md ${
        isEmergency
          ? 'border-red-400/60 bg-red-50/80'
          : isUrgent
            ? 'border-orange-400/60 bg-orange-50/80'
            : 'border-amber-300/40 bg-white/80'
      }`}
    >
      {/* 顶部标签行 */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="rounded px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest"
            style={{ color: cat.color, backgroundColor: cat.bg }}
          >
            {event.category}
          </span>
          {isEmergency && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="rounded bg-red-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white"
            >
              紧急
            </motion.span>
          )}
        </div>
        <div
          className={`font-mono text-[10px] font-bold ${
            isUrgent ? 'text-red-600' : 'text-amber-700'
          }`}
        >
          {isUrgent ? '⚠ ' : '⏳ '}
          剩余 {daysLeft} 天
        </div>
      </div>

      {/* 标题 */}
      <h3 className="mb-1 font-serif text-lg font-bold text-amber-950">
        {event.title}
      </h3>

      {/* 描述 */}
      <p className="mb-3 line-clamp-2 font-serif text-xs text-amber-800/80">
        {event.description}
      </p>

      {/* 选项数 + 操作按钮 */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-amber-700/60">
          {event.options.length} 个决策分支
        </span>
        <button
          onClick={onOpen}
          className="rounded-md bg-amber-600 px-4 py-1.5 font-serif text-xs font-bold text-white transition-colors hover:bg-amber-700"
        >
          打开处理 →
        </button>
      </div>
    </motion.div>
  )
}
