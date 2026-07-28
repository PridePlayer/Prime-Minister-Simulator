import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Bell, X, Trash2 } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'

const ALERT_LABEL: Record<string, string> = {
  debate: '议会质询',
  letter: '选区信件',
  note: '外交照会',
  countdown: '紧急倒计时',
  breaking: '突发新闻',
  policy: '政策解锁',
  task: '任务完成',
}

/** 重要提醒类型：只弹这些类型的提醒，其余静默
 *  policy/task 也加入，让玩家看到"改革解锁政策""任务完成"的即时反馈 */
const IMPORTANT_TYPES = new Set(['countdown', 'breaking', 'note', 'policy', 'task'])

/** 单条提醒：10 秒后自动消失 */
function AlertItem({
  alert,
  onDismiss,
}: {
  alert: { type: string; title: string; timestamp: number }
  onDismiss: () => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // 10 秒后自动消失
    timerRef.current = setTimeout(() => onDismiss(), 10000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDismiss])

  const label = ALERT_LABEL[alert.type] ?? '提醒'
  const isUrgent = alert.type === 'countdown' || alert.type === 'breaking'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
      className={`flex items-center gap-2 rounded border px-2.5 py-1.5 shadow-lg backdrop-blur ${
        isUrgent
          ? 'border-red-500/40 bg-red-950/80'
          : 'border-amber-500/30 bg-ink-900/90'
      }`}
      style={{ maxWidth: '280px' }}
    >
      <span className={`shrink-0 text-[10px] ${isUrgent ? 'text-red-400' : 'text-amber-400'}`}>
        {isUrgent ? '⚠' : '📌'}
      </span>
      <div className="flex-1 min-w-0">
        <div className={`font-mono text-[8px] tracking-widest ${isUrgent ? 'text-red-400/80' : 'text-amber-400/70'}`}>
          {label}
        </div>
        <div className="truncate font-serif text-[11px] text-parchment-100">
          {alert.title}
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 text-parchment-200/30 transition-colors hover:text-gold"
        aria-label="关闭提醒"
      >
        <X size={10} />
      </button>
    </motion.div>
  )
}

/** 右下角未读提醒 + 通知中心（可一键清除所有通知）
 *  - 仅弹窗显示重要类型提醒（最多 3 条，10 秒自动消失）
 *  - 通知中心按钮常驻右下角，点击展开全部通知列表，可一键清除
 */
export default function NotificationAlerts() {
  const alerts = useGameStore((s) => s.unreadAlerts)
  const clearAlerts = useGameStore((s) => s.clearAlerts)
  const [showCenter, setShowCenter] = useState(false)

  // 仅弹窗显示重要类型的提醒，最多 3 条（最新的在前）
  const importantAlerts = alerts
    .filter((a) => IMPORTANT_TYPES.has(a.type))
    .slice(-3)
    .reverse()

  // 单条提醒消失：从 unreadAlerts 中移除指定项
  const dismissOne = (timestamp: number, type: string) => {
    const remaining = alerts.filter((a) => !(a.timestamp === timestamp && a.type === type))
    if (remaining.length === 0) {
      clearAlerts()
    } else {
      clearAlerts()
      useGameStore.setState({ unreadAlerts: remaining })
    }
  }

  const totalCount = alerts.length

  return (
    <div className="fixed right-3 bottom-3 z-40 flex flex-col items-end gap-1.5 pointer-events-none">
      {/* 通知中心按钮（常驻，有未读时显示角标） */}
      {totalCount > 0 && (
        <div className="pointer-events-auto">
          <button
            onClick={() => setShowCenter((v) => !v)}
            title="通知中心"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-ink-900/90 text-gold shadow-lg backdrop-blur transition-colors hover:bg-ink-800"
          >
            <Bell size={15} />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold text-white">
              {totalCount}
            </span>
          </button>
        </div>
      )}

      {/* 弹窗提醒列表 */}
      <AnimatePresence mode="popLayout">
        {importantAlerts.map((alert, i) => (
          <div key={`${alert.type}-${alert.timestamp}-${i}`} className="pointer-events-auto">
            <AlertItem
              alert={alert}
              onDismiss={() => dismissOne(alert.timestamp, alert.type)}
            />
          </div>
        ))}
      </AnimatePresence>

      {/* 通知中心面板 */}
      <AnimatePresence>
        {showCenter && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto w-80 rounded-lg border border-gold/40 bg-ink-900/95 shadow-2xl backdrop-blur"
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between border-b border-gold/20 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Bell size={12} className="text-gold" />
                <span className="font-serif text-xs font-bold text-gold">通知中心</span>
                <span className="font-mono text-[10px] text-parchment-200/50">({totalCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    clearAlerts()
                  }}
                  disabled={totalCount === 0}
                  title="清除所有通知"
                  className="flex items-center gap-1 rounded bg-red-900/40 px-2 py-0.5 font-mono text-[10px] font-bold text-red-300 transition-colors hover:bg-red-900/70 disabled:opacity-30"
                >
                  <Trash2 size={10} />
                  一键清除
                </button>
                <button
                  onClick={() => setShowCenter(false)}
                  className="rounded p-0.5 text-parchment-200/40 transition-colors hover:text-gold"
                  aria-label="关闭通知中心"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* 通知列表 */}
            <div className="max-h-64 overflow-y-auto p-1.5">
              {totalCount === 0 ? (
                <div className="py-6 text-center font-serif text-xs text-parchment-200/40">
                  暂无通知
                </div>
              ) : (
                <div className="space-y-1">
                  {[...alerts].reverse().map((alert, i) => {
                    const label = ALERT_LABEL[alert.type] ?? '提醒'
                    const isUrgent = alert.type === 'countdown' || alert.type === 'breaking'
                    return (
                      <div
                        key={`${alert.type}-${alert.timestamp}-${i}`}
                        className={`group flex items-start gap-2 rounded px-2 py-1.5 transition-colors hover:bg-ink-700/40 ${
                          isUrgent ? 'border-l-2 border-red-500/60' : 'border-l-2 border-amber-500/40'
                        }`}
                      >
                        <span className={`mt-0.5 shrink-0 text-[10px] ${isUrgent ? 'text-red-400' : 'text-amber-400'}`}>
                          {isUrgent ? '⚠' : '📌'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-mono text-[8px] tracking-widest ${isUrgent ? 'text-red-400/70' : 'text-amber-400/60'}`}>
                            {label}
                          </div>
                          <div className="font-serif text-[11px] leading-snug text-parchment-100">
                            {alert.title}
                          </div>
                        </div>
                        <button
                          onClick={() => dismissOne(alert.timestamp, alert.type)}
                          className="shrink-0 text-parchment-200/20 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                          aria-label="删除该通知"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
