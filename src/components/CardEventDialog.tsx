// 卡牌事件弹窗：中央 Drop Zone + 事件描述 + 黑料卡选择
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { useState } from 'react'
import type { CardPlayResult } from '@/types/game'

const EVENT_TYPE_LABEL: Record<string, { icon: string; color: string; ring: string }> = {
  pmqs:     { icon: '🎤', color: 'text-red-300',    ring: 'ring-red-500/40' },
  backroom: { icon: '🤝', color: 'text-purple-300', ring: 'ring-purple-500/40' },
  leak:     { icon: '📁', color: 'text-gray-300',   ring: 'ring-gray-500/40' },
  spin:     { icon: '🔄', color: 'text-blue-300',   ring: 'ring-blue-500/40' },
}

export default function CardEventDialog() {
  const slot = useGameStore((s) => s.activeCardEvent)
  const dossierCards = useGameStore((s) => s.dossierCards)
  const playCardFromHand = useGameStore((s) => s.playCardFromHand)
  const dismissCardEvent = useGameStore((s) => s.dismissCardEvent)
  const totalDays = useGameStore((s) => s.totalDays)

  const [dragOver, setDragOver] = useState(false)
  const [selectedDossierId, setSelectedDossierId] = useState<string | undefined>(undefined)
  const [lastResult, setLastResult] = useState<CardPlayResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  if (!slot) return null

  const meta = EVENT_TYPE_LABEL[slot.eventType] || EVENT_TYPE_LABEL.pmqs
  const daysLeft = slot.deadlineDay - totalDays

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!dragOver) setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // 只在真正离开容器时清除
    if (e.currentTarget === e.target) {
      setDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (!data.handItemId) return

      const result = playCardFromHand(data.handItemId, selectedDossierId)
      setLastResult(result)
      setShowResult(true)

      // 资源不足：弹回手牌，不关闭弹窗
      if (!result.resourceOk || !result.conditionOk) {
        setTimeout(() => setShowResult(false), 1500)
      } else {
        // 打出成功，3 秒后自动关闭结果展示
        setTimeout(() => {
          setShowResult(false)
          setLastResult(null)
          setSelectedDossierId(undefined)
        }, 2500)
      }
    } catch {
      // 解析失败：忽略
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key={slot.instanceId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: -20, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="relative w-[640px] max-w-[92vw] rounded-lg border-2 border-gold/40 bg-gradient-to-b from-ink-900 to-ink-950 shadow-2xl"
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between border-b border-gold/20 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{meta.icon}</span>
              <div>
                <div className={`font-display text-base font-bold ${meta.color}`}>
                  {slot.title}
                </div>
                <div className="font-mono text-[9px] tracking-wider text-parchment-200/50">
                  类型：{slot.eventType.toUpperCase()} · 截止 {daysLeft} 天
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('放弃应对将按失败结算，确定吗？')) {
                  dismissCardEvent()
                }
              }}
              className="rounded px-2 py-1 font-mono text-[10px] text-parchment-200/60 transition-colors hover:bg-red-900/40 hover:text-red-300"
            >
              ✕ 放弃
            </button>
          </div>

          {/* 事件描述 */}
          <div className="px-5 py-3">
            <p className="font-serif text-xs leading-relaxed text-parchment-200/80">
              {slot.description}
            </p>
            {slot.pendingApprovalLoss && (
              <div className="mt-2 rounded-sm border border-red-500/30 bg-red-950/30 px-2 py-1">
                <span className="font-mono text-[10px] text-red-300">
                  ⚠ 即将民调下跌：{Math.abs(slot.pendingApprovalLoss)}%
                </span>
              </div>
            )}
          </div>

          {/* 黑料卡选择（当事件接受 LEAK 类卡时） */}
          {slot.acceptedCategories.includes('LEAK') && dossierCards.length > 0 && (
            <div className="px-5 pb-2">
              <div className="font-serif text-[10px] text-parchment-200/60 mb-1">
                选择黑料卡（打出 LEAK 卡时消耗）：
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {dossierCards.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDossierId(d.id === selectedDossierId ? undefined : d.id)}
                    className={`rounded border px-2 py-1 text-left transition-all ${
                      d.id === selectedDossierId
                        ? 'border-gold bg-gold/20'
                        : 'border-gray-700 bg-ink-800/60 hover:border-gray-500'
                    }`}
                  >
                    <div className="font-serif text-[10px] font-bold text-gray-200">
                      📁 {d.title}
                    </div>
                    <div className="font-mono text-[8px] text-parchment-200/50">
                      目标：{d.targetNpcName} · 严重度 {d.severity}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Drop Zone */}
          <div className="px-5 py-3">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative flex h-44 items-center justify-center rounded-md border-2 border-dashed
                transition-all duration-200
                ${dragOver
                  ? `border-gold bg-gold/10 ring-4 ${meta.ring}`
                  : 'border-parchment-200/30 bg-ink-900/40'
                }
              `}
            >
              {showResult && lastResult ? (
                /* 打出结果展示 */
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center px-4"
                >
                  <div className="text-3xl mb-1">
                    {lastResult.success ? '✓' : !lastResult.resourceOk ? '↩' : '✗'}
                  </div>
                  <div
                    className={`font-display text-base font-bold ${
                      lastResult.success
                        ? 'text-emerald-300'
                        : !lastResult.resourceOk
                        ? 'text-amber-300'
                        : 'text-red-300'
                    }`}
                  >
                    {lastResult.success
                      ? '打出成功！'
                      : !lastResult.resourceOk
                      ? '资源不足，卡牌弹回'
                      : '打出失败'}
                  </div>
                  <div className="mt-1 font-serif text-[10px] text-parchment-200/70">
                    {lastResult.message}
                  </div>
                </motion.div>
              ) : dragOver ? (
                /* 拖拽悬停状态 */
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="text-center"
                >
                  <div className="text-4xl mb-2">📥</div>
                  <div className="font-display text-sm font-bold text-gold">
                    释放鼠标打出卡牌
                  </div>
                  <div className="mt-1 font-mono text-[9px] text-parchment-200/60">
                    接受：{slot.acceptedCategories.join(' / ')}
                  </div>
                </motion.div>
              ) : (
                /* 默认空状态 */
                <div className="text-center">
                  <div className="text-4xl mb-2 opacity-50">🃏</div>
                  <div className="font-serif text-xs text-parchment-200/60">
                    将手牌拖拽至此处打出
                  </div>
                  <div className="mt-1 font-mono text-[9px] text-parchment-200/40">
                    接受卡牌类别：{slot.acceptedCategories.join(' · ')}
                  </div>
                  {slot.acceptedCategories.includes('LEAK') && dossierCards.length === 0 && (
                    <div className="mt-2 font-mono text-[9px] text-amber-300/80">
                      ⚠ LEAK 类卡牌需要消耗黑料卡，当前手牌无黑料
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 底部：截止日期提示 */}
          <div className="border-t border-gold/10 px-5 py-2 flex items-center justify-between">
            <div className="font-mono text-[9px] text-parchment-200/40">
              触发日：第 {slot.triggeredDay} 天 · 截止日：第 {slot.deadlineDay} 天
            </div>
            <div className="font-mono text-[9px]">
              <span className={daysLeft <= 1 ? 'text-red-300' : 'text-parchment-200/60'}>
                {daysLeft > 0 ? `剩 ${daysLeft} 天` : '已超时'}
              </span>
            </div>
          </div>

          {/* 印章动画（打出成功时） */}
          {showResult && lastResult?.success && (
            <motion.div
              initial={{ scale: 2, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 0.9, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="rounded-full border-4 border-red-500/70 px-6 py-2">
                <span className="font-display text-2xl font-bold text-red-500/80">已 议</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
