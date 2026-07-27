import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { METRIC_META } from '@/data/metrics'
import type { MetricKey } from '@/types/game'

/** 行动选项弹窗：点击总理行动后弹出，提供具体决策分支 */
export default function ActionDialog() {
  const dialog = useGameStore((s) => s.actionDialog)
  const chooseActionDialogOption = useGameStore((s) => s.chooseActionDialogOption)

  return (
    <AnimatePresence>
      {dialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="modal-content relative w-full max-w-lg p-6"
          >
            {/* 标题区 */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="rounded bg-gold/20 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-widest text-gold">
                  总理行动
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
              </div>
              <h2 className="mt-3 font-display text-2xl font-semibold text-parchment-50">
                {dialog.title}
              </h2>
              <p className="mt-1 font-serif text-sm italic text-parchment-200/60">
                {dialog.description}
              </p>
            </div>

            {/* 选项 */}
            <div className="flex flex-col gap-2.5">
              {dialog.options.map((opt, i) => (
                <motion.button
                  key={opt.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => chooseActionDialogOption(opt.id)}
                  className="option-btn w-full p-3 text-left"
                >
                  <div className="font-serif text-sm font-semibold text-parchment-100">
                    {opt.label}
                  </div>
                  {opt.description && (
                    <div className="mt-0.5 font-serif text-xs italic text-parchment-200/50">
                      {opt.description}
                    </div>
                  )}
                  {/* 预期影响 */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(Object.entries(opt.effects) as [MetricKey, number][]).map(
                      ([key, val]) => {
                        const meta = METRIC_META.find((m) => m.key === key)
                        if (!meta) return null
                        const positive = val > 0
                        return (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px]"
                            style={{
                              color: positive ? '#7a9d55' : '#b34554',
                              backgroundColor: positive
                                ? 'rgba(122,157,85,0.12)'
                                : 'rgba(179,69,84,0.12)',
                            }}
                          >
                            {meta.icon} {positive ? '+' : ''}{val}
                          </span>
                        )
                      },
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
