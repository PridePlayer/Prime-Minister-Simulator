import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import EncyclopediaPage from '@/pages/EncyclopediaPage'

/** 百科全书弹窗：从右上角"菜单"触发，以弹窗形式展示百科内容
 *  - 全屏遮罩 + 居中弹窗（max-w-4xl, max-h-[85vh]）
 *  - 顶部标题"📚 百科全书"和关闭按钮
 *  - 点击遮罩或 ESC 关闭
 *  - 淡入 + 缩放动画（motion/react） */
export default function EncyclopediaModal() {
  const open = useGameStore((s) => s.encyclopediaOpen)
  const setEncyclopediaOpen = useGameStore((s) => s.setEncyclopediaOpen)

  // ESC 键关闭弹窗
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setEncyclopediaOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setEncyclopediaOpen])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setEncyclopediaOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-4xl max-h-[85vh] flex-col overflow-hidden rounded-xl border-2 border-gold/40 bg-ink-900 shadow-2xl"
          >
            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between border-b border-gold/30 bg-ink-800/80 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📚</span>
                <div>
                  <h2 className="font-display text-base font-bold tracking-[0.25em] text-gold">
                    百 科 全 书
                  </h2>
                  <p className="font-mono text-[10px] text-parchment-200/50">
                    Encyclopedia · ESC 关闭
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEncyclopediaOpen(false)}
                className="rounded-full bg-gold/15 px-3 py-1.5 font-mono text-xs font-bold text-gold transition-colors hover:bg-gold/30"
              >
                ✕ 关闭
              </button>
            </div>

            {/* 内容区：直接复用 EncyclopediaPage */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <EncyclopediaPage />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
