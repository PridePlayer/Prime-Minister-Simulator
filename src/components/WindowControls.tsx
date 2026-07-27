import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Minus, Square, X, Copy } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { useSaveGame } from '@/hooks/useSaveGame'

/** 窗口控制按钮组：最小化 / 最大化切换 / 关闭
 *  在 Electron 环境中通过 window.api 操控主窗口；非 Electron 环境下按钮禁用
 *  关闭按钮：若正处于游戏中，先提示玩家保存进度
 *  全屏模式下：整组按钮隐藏（无需窗口控制）
 */
export default function WindowControls({ variant = 'bar' }: { variant?: 'bar' | 'inline' }) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [hasApi, setHasApi] = useState(false)
  const [showClosePrompt, setShowClosePrompt] = useState(false)
  const [closing, setClosing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const { writeSave } = useSaveGame()

  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return
    setHasApi(true)
    window.api.windowIsMaximized().then(setIsMaximized).catch(() => {})
    if (window.api.windowIsFullScreen) {
      window.api.windowIsFullScreen().then(setIsFullScreen).catch(() => {})
    }
    const unsubMax = window.api.onMaximizeChange((maximized) => setIsMaximized(maximized))
    const unsubFs = window.api.onFullScreenChange
      ? window.api.onFullScreenChange((fs) => setIsFullScreen(fs))
      : () => {}
    return () => {
      unsubMax()
      unsubFs()
    }
  }, [])

  // 全屏模式下不显示任何窗口控制按钮
  if (isFullScreen) return null

  const handleMinimize = () => window.api?.windowMinimize()
  const handleMaximize = () => window.api?.windowMaximizeToggle()

  // 关闭：若正处于游戏中，先提示保存
  const handleClose = () => {
    const state = useGameStore.getState()
    const inGame = state.screen === 'game' && state.gamePhase === 'playing'
    if (inGame && !closing) {
      setShowClosePrompt(true)
      return
    }
    window.api?.windowClose()
  }

  // 保存并关闭
  const handleSaveAndClose = async () => {
    const state = useGameStore.getState()
    const result = await writeSave(state as any)
    setClosing(true)
    setShowClosePrompt(false)
    if (!result.ok) {
      setToast('✗ 存档失败：' + (result.error || '未知错误'))
      setClosing(false)
      setTimeout(() => setToast(null), 3000)
      return
    }
    setToast('✓ 已保存，正在关闭...')
    setTimeout(() => window.api?.windowClose(), 400)
  }

  // 不保存直接关闭
  const handleCloseWithoutSave = () => {
    setClosing(true)
    setShowClosePrompt(false)
    window.api?.windowClose()
  }

  if (variant === 'inline') {
    // 行内紧凑形态：用于底部时间控制条等场景
    return (
      <div
        className="flex items-center gap-0.5 rounded-md border border-amber-400/30 bg-ink-900/60 px-0.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          disabled={!hasApi}
          title="最小化"
          className="flex h-7 w-8 items-center justify-center rounded text-amber-700/80 transition-colors hover:bg-amber-500/15 hover:text-amber-600 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={handleMaximize}
          disabled={!hasApi}
          title={isMaximized ? '还原' : '最大化'}
          className="flex h-7 w-8 items-center justify-center rounded text-amber-700/80 transition-colors hover:bg-amber-500/15 hover:text-amber-600 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          {isMaximized ? <Copy size={11} /> : <Square size={11} />}
        </button>
        <button
          onClick={handleClose}
          disabled={!hasApi}
          title="关闭"
          className="flex h-7 w-8 items-center justify-center rounded text-amber-700/80 transition-colors hover:bg-red-600/80 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <X size={13} />
        </button>
      </div>
    )
  }

  // 经典形态：常驻于标题栏（占满高度）
  return (
    <>
      <div
        className="flex h-full items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          disabled={!hasApi}
          title="最小化"
          className="flex h-full w-11 items-center justify-center text-parchment-200/60 transition-colors hover:bg-gold/10 hover:text-gold disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleMaximize}
          disabled={!hasApi}
          title={isMaximized ? '还原' : '最大化'}
          className="flex h-full w-11 items-center justify-center text-parchment-200/60 transition-colors hover:bg-gold/10 hover:text-gold disabled:opacity-30 disabled:hover:bg-transparent"
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          onClick={handleClose}
          disabled={!hasApi}
          title="关闭"
          className="flex h-full w-11 items-center justify-center text-parchment-200/60 transition-colors hover:bg-red-600/80 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <X size={14} />
        </button>
      </div>

      {/* 关闭前保存提示弹窗 */}
      <AnimatePresence>
        {showClosePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowClosePrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[400px] max-w-[90vw] rounded-xl border-2 border-gold/50 bg-gradient-to-br from-ink-800 to-ink-900 p-6 shadow-2xl"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl">💾</span>
                <h3 className="font-serif text-base font-bold text-gold">保存进度？</h3>
              </div>
              <p className="mb-5 font-serif text-sm leading-relaxed text-parchment-200/80">
                即将关闭窗口，未保存的进度将丢失。是否在关闭前保存当前游戏？
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSaveAndClose}
                  className="w-full rounded-lg bg-gold px-4 py-2.5 font-serif text-sm font-bold text-ink-900 transition-colors hover:bg-gold/80"
                >
                  💾 保存并关闭
                </button>
                <button
                  onClick={handleCloseWithoutSave}
                  className="w-full rounded-lg bg-red-900/50 px-4 py-2.5 font-serif text-sm font-bold text-red-300 transition-colors hover:bg-red-900/70"
                >
                  不保存直接关闭
                </button>
                <button
                  onClick={() => setShowClosePrompt(false)}
                  className="w-full rounded-lg bg-ink-700 px-4 py-2.5 font-serif text-sm font-bold text-parchment-200 transition-colors hover:bg-ink-600"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast 提示 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-8 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-ink-900/95 px-6 py-3 font-serif text-sm font-bold text-gold shadow-2xl border border-gold/40"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
