import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'

/** 突发新闻弹窗：决策后具象化头条 */
export default function BreakingNews() {
  const news = useGameStore((s) => s.breakingNews)
  const dismiss = useGameStore((s) => s.dismissBreakingNews)

  const toneColor =
    news?.tone === 'positive'
      ? '#7a9d55'
      : news?.tone === 'negative'
        ? '#b34554'
        : '#c9a961'

  return (
    <AnimatePresence>
      {news && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="modal-content relative w-full max-w-md overflow-hidden p-0"
          >
            {/* 顶部色条 */}
            <div className="h-1.5" style={{ backgroundColor: toneColor }} />

            <div className="p-6">
              <div className="mb-3 flex items-center gap-2">
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="rounded px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-parchment-50"
                  style={{ backgroundColor: toneColor }}
                >
                  BREAKING
                </motion.span>
                <div
                  className="h-px flex-1"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${toneColor}66, transparent)`,
                  }}
                />
              </div>

              <h2
                className="font-display text-2xl font-semibold leading-tight"
                style={{ color: toneColor }}
              >
                {news.title}
              </h2>
              <p className="mt-2 font-serif text-sm leading-relaxed text-parchment-200/85">
                {news.summary}
              </p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={dismiss}
                className="btn-gold mt-5 w-full py-2 text-sm"
              >
                知道了
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
