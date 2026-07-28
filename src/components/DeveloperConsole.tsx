// 开发者控制台：调试用弹窗，可直接调整已就任月份数（turn）
// 入口：右上角"菜单" → "开发者选项" → 二次确认后打开（v0.2.1 起，不再用 ~ 快捷键）
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { useSettingsStore } from '@/store/settingsStore'

interface DeveloperConsoleProps {
  open: boolean
  onClose: () => void
}

interface QuickButton {
  label: string
  delta?: number
  setTo?: number
}

const QUICK_BUTTONS: QuickButton[] = [
  { label: '-12月', delta: -12 },
  { label: '-1月', delta: -1 },
  { label: '+1月', delta: 1 },
  { label: '+12月', delta: 12 },
  { label: '跳到大选', setTo: 48 },
  { label: '跳到任期开始', setTo: 1 },
]

/** 开发者控制台：调整 turn 字段，同步重算日期 */
export default function DeveloperConsole({ open, onClose }: DeveloperConsoleProps) {
  const turn = useGameStore((s) => s.turn)
  const year = useGameStore((s) => s.year)
  const month = useGameStore((s) => s.month)
  const day = useGameStore((s) => s.day)
  const totalDays = useGameStore((s) => s.totalDays)
  const setTurn = useGameStore((s) => s.setTurn)
  const triggerTutorial = useSettingsStore((s) => s.triggerTutorial)
  const [tutorialFeedback, setTutorialFeedback] = useState<string>('')

  const [inputValue, setInputValue] = useState<string>(String(turn))
  const [feedback, setFeedback] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 打开时同步输入框为当前 turn 并聚焦
  useEffect(() => {
    if (open) {
      setInputValue(String(turn))
      setFeedback('')
      setTutorialFeedback('')
      const timer = setTimeout(() => inputRef.current?.focus(), 60)
      return () => clearTimeout(timer)
    }
  }, [open, turn])

  // ESC 键关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [open, onClose])

  const applyTurn = (rawTurn: number) => {
    const clamped = Math.max(1, Math.min(200, Math.floor(rawTurn)))
    if (Number.isNaN(clamped)) {
      setFeedback('请输入有效数字（1-200）')
      return
    }
    if (clamped === turn) {
      setFeedback(`当前执政月数已经是 ${clamped}`)
      setInputValue(String(clamped))
      return
    }
    setTurn(clamped)
    setFeedback(`已设置 turn = ${clamped}`)
    setInputValue(String(clamped))
  }

  const handleSetClick = () => {
    const parsed = parseInt(inputValue, 10)
    if (Number.isNaN(parsed)) {
      setFeedback('请输入有效数字（1-200）')
      return
    }
    applyTurn(parsed)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSetClick()
    }
  }

  const handleQuick = (btn: QuickButton) => {
    if (btn.setTo !== undefined) {
      applyTurn(btn.setTo)
    } else if (btn.delta !== undefined) {
      applyTurn(turn + btn.delta)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[480px] max-w-full rounded-lg border border-zinc-700 bg-zinc-900 font-mono text-zinc-100 shadow-2xl"
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400">▶</span>
                <h2 className="text-sm font-bold tracking-wider text-zinc-100">开发者控制台</h2>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                  调试用 · 入口在右上角菜单
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="关闭"
                className="px-2 text-sm text-zinc-500 transition-colors hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* 主体 */}
            <div className="space-y-3 p-4">
              {/* 当前状态 */}
              <div className="rounded border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
                <div>
                  当前 turn = <span className="text-emerald-400">{turn}</span>
                </div>
                <div>
                  当前日期 ={' '}
                  <span className="text-zinc-300">
                    {year}年{month}月{day}日
                  </span>{' '}
                  （总天数 {totalDays}）
                </div>
              </div>

              {/* 输入框 + 设置按钮 */}
              <div>
                <label className="mb-1 block text-[11px] text-zinc-500">
                  设置 turn（范围 1-200）
                </label>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="number"
                    min={1}
                    max={200}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleSetClick}
                    className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                  >
                    设置
                  </button>
                </div>
              </div>

              {/* 快捷按钮网格 */}
              <div>
                <label className="mb-1 block text-[11px] text-zinc-500">快捷操作</label>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_BUTTONS.map((btn) => (
                    <button
                      key={btn.label}
                      onClick={() => handleQuick(btn)}
                      className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-zinc-700"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 反馈消息 */}
              {feedback && (
                <div className="rounded border border-emerald-800/50 bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-300">
                  {feedback}
                </div>
              )}

              {/* 警告 */}
              <div className="rounded border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-[11px] leading-relaxed text-amber-300/90">
                ⚠ 此操作会改变游戏时间，可能影响成就判定与存档兼容性
              </div>

              {/* 教程触发区 */}
              <div className="rounded border border-sky-700/40 bg-sky-950/30 px-3 py-2">
                <div className="mb-1.5 text-[11px] font-bold text-sky-300">教程与辅助</div>
                <button
                  onClick={() => {
                    triggerTutorial()
                    setTutorialFeedback('已立即开启新手教程（关闭本窗口后即可看到）')
                    setTimeout(() => setTutorialFeedback(''), 4000)
                    onClose()
                  }}
                  className="w-full rounded bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-600"
                >
                  ▶ 立即重看新手教程
                </button>
                {tutorialFeedback && (
                  <div className="mt-1.5 text-[10px] text-sky-300/80">{tutorialFeedback}</div>
                )}
                <div className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                  适合在忘记机制或演示给他人时使用，不影响成就判定。
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
