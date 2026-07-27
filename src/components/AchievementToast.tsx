import { motion, AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import type { Achievement } from '@/types/game'

/** 单条成就弹窗：6 秒后自动消失，也可手动关闭 */
function AchievementItem({
  achievement,
  onDismiss,
}: {
  achievement: Achievement
  onDismiss: () => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(), 6000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="pointer-events-auto relative overflow-hidden rounded-lg border border-gold/50 bg-ink-900/95 shadow-2xl backdrop-blur"
      style={{ width: '320px' }}
    >
      {/* 金色光带 */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />
      {/* 进度条（倒计时视觉提示） */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-gold/60"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 6, ease: 'linear' }}
      />

      <div className="flex items-start gap-3 p-3.5">
        {/* 成就图标 */}
        <motion.div
          initial={{ rotate: -15, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-gold/60 bg-ink-800 shadow-gold"
        >
          <span className="text-2xl">{achievement.icon}</span>
        </motion.div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="font-mono text-[9px] tracking-[0.2em] text-gold/70">
            🏆 成 就 解 锁
          </div>
          <div className="font-display text-base font-bold text-gold leading-tight mt-0.5">
            {achievement.name}
          </div>
          <div className="font-serif text-[11px] text-parchment-200/70 leading-snug mt-1">
            {achievement.desc}
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 text-parchment-200/30 transition-colors hover:text-gold"
          aria-label="关闭"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  )
}

/**
 * 成就解锁弹窗系统：
 * - 监听 store 中 achievements 数组的变化
 * - 用 ref 记录已展示过的成就 ID（避免读档时重复弹窗）
 * - 新解锁的成就进入队列，逐条展示（最多同时 3 条）
 * - 每条 6 秒后自动消失，也可手动关闭
 */
export default function AchievementToast() {
  const achievements = useGameStore((s) => s.achievements)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const [queue, setQueue] = useState<Achievement[]>([])

  useEffect(() => {
    // 首次挂载：将当前已解锁的成就全部标记为"已见"（不弹窗）
    // 这样只有本会话内新解锁的成就才会弹窗
    if (seenIdsRef.current.size === 0) {
      achievements.forEach((a) => {
        if (a.unlocked) seenIdsRef.current.add(a.id)
      })
      return
    }

    // 检测新解锁的成就
    const newlyUnlocked = achievements.filter(
      (a) => a.unlocked && !seenIdsRef.current.has(a.id),
    )
    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach((a) => seenIdsRef.current.add(a.id))
      setQueue((prev) => [...prev, ...newlyUnlocked])
    }
  }, [achievements])

  const dismiss = (id: string) => {
    setQueue((prev) => prev.filter((a) => a.id !== id))
  }

  // 最多同时显示 3 条
  const visible = queue.slice(0, 3)

  return (
    <div className="fixed right-4 top-16 z-[60] flex flex-col items-end gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visible.map((a) => (
          <AchievementItem
            key={a.id}
            achievement={a}
            onDismiss={() => dismiss(a.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
