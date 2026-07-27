import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'

/** 倒计时事件弹窗：限时决策，营造紧迫感 */
export default function CountdownTimer() {
  const currentCountdown = useGameStore((s) => s.currentCountdown)
  const handleCountdown = useGameStore((s) => s.handleCountdown)

  // 每秒递减倒计时，到 0 时自动选择第一个选项
  useEffect(() => {
    if (!currentCountdown) return
    const timer = setInterval(() => {
      const cd = useGameStore.getState().currentCountdown
      if (!cd) {
        clearInterval(timer)
        return
      }
      const next = cd.remainingSeconds - 1
      if (next <= 0) {
        clearInterval(timer)
        // 倒计时归零：自动选择第一个选项（触发失败效果由选项自身决定）
        const first = cd.options[0]
        if (first) {
          handleCountdown(first.id)
        }
      } else {
        // 直接更新 store 中的 remainingSeconds
        useGameStore.setState({
          currentCountdown: { ...cd, remainingSeconds: next },
        })
      }
    }, 1000)
    return () => clearInterval(timer)
    // 仅在倒计时事件 ID 变化时重置定时器
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCountdown?.id, handleCountdown])

  // 倒计时数字颜色：>60 绿色，30-60 橙色，<30 红色闪烁
  const remaining = currentCountdown?.remainingSeconds ?? 0
  const numberColorClass =
    remaining > 60
      ? 'text-moss-light'
      : remaining >= 30
        ? 'text-orange-400'
        : 'text-red-500 animate-pulse'

  return (
    <AnimatePresence>
      {currentCountdown && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="modal-content relative w-full max-w-lg overflow-hidden p-6"
            style={{
              boxShadow:
                '0 0 0 2px rgba(220,38,38,0.5), 0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* 红色脉冲边框 */}
            <div className="pointer-events-none absolute inset-0 animate-pulse rounded-md border-2 border-crimson/70" />

            <div className="relative">
              {/* 标题区 */}
              <div className="mb-2 flex items-center gap-2">
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="rounded bg-crimson px-2 py-0.5 font-mono text-[10px] font-semibold tracking-widest text-parchment-50"
                >
                  紧急倒计时
                </motion.span>
                <div className="h-px flex-1 bg-gradient-to-r from-crimson/50 to-transparent" />
              </div>
              <h2 className="font-display text-2xl font-semibold leading-tight text-red-50">
                {currentCountdown.title}
              </h2>

              {/* 描述 */}
              <p className="mt-2 font-serif text-sm leading-relaxed text-parchment-200/80">
                {currentCountdown.description}
              </p>

              {/* 大号倒计时数字 */}
              <div className="my-6 flex flex-col items-center">
                <motion.div
                  key={remaining}
                  initial={{ scale: 1.3, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`font-mono text-7xl font-bold ${numberColorClass}`}
                >
                  {remaining}
                </motion.div>
                <div className="mt-1 font-mono text-[10px] tracking-widest text-parchment-200/50">
                  秒
                </div>
              </div>

              {/* 选项列表 */}
              <div className="flex flex-col gap-2">
                {currentCountdown.options.map((opt) => (
                  <motion.button
                    key={opt.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleCountdown(opt.id)}
                    className="option-btn emergency w-full p-3 text-left"
                  >
                    <div className="font-serif text-sm font-semibold text-parchment-100">
                      {opt.label}
                    </div>
                    {opt.description && (
                      <div className="mt-0.5 font-serif text-xs italic text-parchment-200/50">
                        {opt.description}
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
