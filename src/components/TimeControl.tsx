import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { useSaveGame } from '@/hooks/useSaveGame'
import { useSettingsStore } from '@/store/settingsStore'

type Speed = 0 | 1 | 2 | 3 | 4 | 5

/** 速度按钮文字：0=暂停，1-5=五档倍速 */
const SPEED_LABEL: Record<Speed, string> = {
  0: '⏸',
  1: 'Ⅰ',
  2: 'Ⅱ',
  3: 'Ⅲ',
  4: 'Ⅳ',
  5: 'Ⅴ',
}

/** 各速度对应的推进间隔（毫秒）
 * 按每月约 30 天计算：
 * 1档≈120秒/月, 2档≈75秒/月, 3档≈45秒/月, 4档≈30秒/月, 5档≈20秒/月
 */
const SPEED_INTERVAL: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 4000, // 慢速 ≈120秒/月
  2: 2500, //       ≈75秒/月
  3: 1500, // 标准 ≈45秒/月
  4: 1000, //       ≈30秒/月
  5: 666,  // 极速 ≈20秒/月
}

/** 即时制时间控制：按日推进，五档速度，空格暂停 */
export default function TimeControl() {
  const timeSpeed = useGameStore((s) => s.timeSpeed)
  const year = useGameStore((s) => s.year)
  const month = useGameStore((s) => s.month)
  const day = useGameStore((s) => s.day)
  const advanceOneDay = useGameStore((s) => s.advanceOneDay)
  const setTimeSpeed = useGameStore((s) => s.setTimeSpeed)
  const currentCountdown = useGameStore((s) => s.currentCountdown)
  const { writeSave } = useSaveGame()
  const autoSaveIntervalMinutes = useSettingsStore((s) => s.autoSaveIntervalMinutes)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 倒计时事件存在时强制暂停
  const hasCountdown = !!currentCountdown

  // 即时制时间推进：timeSpeed > 0 时按间隔自动推进一天
  useEffect(() => {
    if (timeSpeed === 0 || hasCountdown) return
    const intervalMs = SPEED_INTERVAL[timeSpeed as 1 | 2 | 3 | 4 | 5]
    const timer = setInterval(() => {
      advanceOneDay()
    }, intervalMs)
    return () => clearInterval(timer)
  }, [timeSpeed, hasCountdown, advanceOneDay])

  // 倒计时事件存在时自动暂停
  useEffect(() => {
    if (hasCountdown && timeSpeed > 0) {
      setTimeSpeed(0)
    }
  }, [hasCountdown, timeSpeed, setTimeSpeed])

  // 自动存档：按用户设置的周期自动保存（默认 15 分钟，与手动存档同目录，前缀 auto_ 区分，仅保留最近 5 个）
  useEffect(() => {
    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    const intervalMs = autoSaveIntervalMinutes * 60 * 1000
    autoSaveTimerRef.current = setInterval(async () => {
      const state = useGameStore.getState()
      if (state.gamePhase === 'playing') {
        const result = await writeSave(
          state as any,
          `${state.pmName} - ${state.year}年${state.month}月${state.day}日`,
          true, // isAuto
        )
        if (!result.ok) {
          console.error('[auto-save] 自动存档失败：', result.error)
        }
      }
    }, intervalMs)
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    }
  }, [writeSave, autoSaveIntervalMinutes])

  const speeds: Speed[] = [0, 1, 2, 3, 4, 5]

  return (
    <div className="flex items-center gap-3">
      {/* 日期显示 */}
      <div className="flex items-center gap-2">
        <span className="text-base">📅</span>
        <div className="font-mono text-sm font-bold tracking-wider text-amber-700">
          {year} 年 {String(month).padStart(2, '0')} 月 {String(day).padStart(2, '0')} 日
        </div>
      </div>

      {/* 速度按钮组 */}
      <div className="flex items-center gap-0.5 rounded-md border border-amber-400/40 bg-amber-50/80 p-0.5">
        {speeds.map((s) => {
          const active = timeSpeed === s
          return (
            <motion.button
              key={s}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setTimeSpeed(s)}
              className={`min-w-[32px] rounded px-2 py-1 font-mono text-[11px] font-bold tracking-wider transition-colors ${
                active
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'text-amber-700/70 hover:bg-amber-200/60 hover:text-amber-800'
              }`}
              title={s === 0 ? '暂停' : `速度 ${s}x`}
            >
              {SPEED_LABEL[s]}
            </motion.button>
          )
        })}
      </div>

      {/* 状态提示 */}
      <div className="hidden font-mono text-[10px] tracking-wider text-amber-700/50 lg:block">
        空格暂停 · {timeSpeed === 0 ? '已暂停' : `速度 ${timeSpeed}x`}
      </div>
    </div>
  )
}
