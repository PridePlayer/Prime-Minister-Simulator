import { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import type { ReactNode } from 'react'

/** 所有指标的中文定义说明（供 Tooltip 调用） */
export const METRIC_DESCRIPTIONS: Record<string, string> = {
  approval: '民意支持率，反映民众对政府的满意程度',
  treasury: '国库资金，用于推行改革和应对危机',
  economy: '经济活力，影响就业和税收',
  stability: '社会稳定度，过低会引发动荡',
  diplomacy: '外交关系，影响国际地位',
  prestige: '国际声望，反映国家影响力',
  politicalCapital: '政治资本：核心消耗资源，用于强行压制议会反对票、拉拢议员或平息危机',
  partyPrestige: '党内威望：低于临界值时将触发党内挑战或罢免机制',
  rhetoric: '辩论技巧：决定质询环节中高难度回答策略的成功率',
  riskIndex: '风险指数：记录政府负面事件的积累程度，影响媒体报道倾向',
}

interface MetricTooltipProps {
  /** 指标名称 */
  label: string
  /** 指标定义说明 */
  description: string
  /** 当前数值 */
  value: number
  /** 最大值，默认 100 */
  max?: number
  /** 触发悬浮的子元素 */
  children: ReactNode
}

/** 根据数值高低返回对应的颜色 */
function getValueColor(value: number): string {
  if (value < 20) return '#dc2626' // 红色：危急
  if (value < 35) return '#fb923c' // 橙色：警告
  if (value >= 60) return '#5a7d3a' // 绿色：良好
  return '#c9a961' // 金色：默认
}

/** 全局数值悬浮提示组件
 *  鼠标悬浮在子元素上时，弹出 Tooltip 显示该指标的定义与当前剩余数值
 *  使用 Portal 渲染到 document.body，z-index 极高，避免被父容器 overflow 裁剪或其他元素遮挡
 */
export default function MetricTooltip({
  label,
  description,
  value,
  max = 100,
  children,
}: MetricTooltipProps) {
  const [visible, setVisible] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'top' as 'top' | 'bottom' })

  const valueColor = useMemo(() => getValueColor(value), [value])
  const percentage = Math.max(0, Math.min(100, (value / max) * 100))

  // 进入悬浮时计算位置（基于视口坐标，使用 fixed 定位）
  const updatePosition = () => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const tooltipWidth = 240 // w-60
    const tooltipHeight = 110 // 预估高度
    const gap = 8

    // 默认放在上方，空间不够则放下方
    const spaceAbove = rect.top
    const placement = spaceAbove >= tooltipHeight + gap ? 'top' : 'bottom'

    let left = rect.left + rect.width / 2 - tooltipWidth / 2
    // 水平边界保护
    left = Math.max(8, Math.min(window.innerWidth - tooltipWidth - 8, left))

    const top = placement === 'top'
      ? rect.top - tooltipHeight - gap
      : rect.bottom + gap

    setPos({ top, left, placement })
  }

  // 窗口滚动/缩放时更新位置
  useEffect(() => {
    if (!visible) return
    updatePosition()
    const onScroll = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [visible])

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={() => {
        updatePosition()
        setVisible(true)
      }}
      onMouseLeave={() => setVisible(false)}
      onMouseDown={() => setVisible(false)}
    >
      {children}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={{ opacity: 0, y: pos.placement === 'top' ? 6 : -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: pos.placement === 'top' ? 6 : -6, scale: 0.96 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="pointer-events-none fixed"
              style={{
                top: pos.top,
                left: pos.left,
                zIndex: 99999,
                width: 240,
              }}
              role="tooltip"
            >
              {/* 箭头 */}
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={
                  pos.placement === 'top'
                    ? { bottom: -6 }
                    : { top: -6, transform: 'translateX(-50%) rotate(180deg)' }
                }
              >
                <div
                  className="h-0 w-0"
                  style={{
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid rgba(201,169,97,0.3)',
                  }}
                />
                <div
                  className="h-0 w-0 -mt-[7px]"
                  style={{
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '5px solid #0d1b2a',
                  }}
                />
              </div>

              {/* 内容卡片 */}
              <div className="rounded-sm border border-gold/30 bg-ink-900/95 px-3 py-2.5 shadow-seal backdrop-blur-sm">
                {/* 标签 */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-serif text-[13px] font-semibold tracking-wide text-parchment-200">
                    {label}
                  </span>
                  <span
                    className="font-mono text-sm font-bold"
                    style={{ color: valueColor }}
                  >
                    {value}
                    <span className="ml-0.5 text-[10px] text-parchment-200/50">
                      /{max}
                    </span>
                  </span>
                </div>

                {/* 数值条 */}
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-700/60">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%`, backgroundColor: valueColor }}
                  />
                </div>

                {/* 描述说明 */}
                <p className="mt-2 font-serif text-[11px] leading-relaxed text-parchment-200/70">
                  {description}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
