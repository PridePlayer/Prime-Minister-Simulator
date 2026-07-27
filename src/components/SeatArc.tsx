import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { useState, useRef, useMemo } from 'react'
import type { PoliticalParty } from '@/types/game'

interface SeatArcProps {
  /** 党派列表，不传则从 store 读取 */
  parties?: PoliticalParty[]
  /** SVG 尺寸（宽度），默认 220 */
  size?: number
  /** 是否显示 51% 过半数线，默认 true */
  showMajorityLine?: boolean
}

// 总席位数（100 席）
const TOTAL_SEATS = 100
// 半圆从 180°（左侧）开始顺时针扫描到 360°（右侧），共 180°
const RING_START = 180
const RING_SPAN = 180

/** 极坐标转笛卡尔坐标 */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

/**
 * 半圆环状点图议会席位分布
 * - 100 个席位按党派顺序排成半圆（每个席位一个小圆点）
 * - 51 席位置画红色过半数标记
 * - 执政党以金色描边高亮
 * - 鼠标悬浮显示党派信息 Tooltip
 */
export default function SeatArc({ parties, size = 220, showMajorityLine = true }: SeatArcProps) {
  const storeParties = useGameStore((s) => s.parties)
  const data = parties ?? storeParties

  const [hovered, setHovered] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // SVG 几何参数（半圆：宽度为 size，高度为 size/2）
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.42
  const dotR = Math.max(2.4, size * 0.018)
  const svgHeight = size / 2

  // 识别执政党
  const rulingId = useMemo(() => {
    const coalition = data.filter((p) => p.inCoalition)
    const pool = coalition.length > 0 ? coalition : data
    return [...pool].sort((a, b) => b.seats - a.seats)[0]?.id
  }, [data])

  // 计算每个席位的归属党派与角度
  // 注意：将实际席位按比例归一化为 100 个点（每个点代表 1% 席位）
  const totalSeatsRaw = data.reduce((sum, p) => sum + p.seats, 0) || 1
  const seats = useMemo(() => {
    const arr: { party: PoliticalParty; index: number; angle: number; isRuling: boolean }[] = []
    // 每个党派按比例分配的点数（四舍五入），最后修正使总和恰好为 100
    const allocations: { party: PoliticalParty; count: number }[] = data.map((p) => ({
      party: p,
      count: Math.round((p.seats / totalSeatsRaw) * TOTAL_SEATS),
    }))
    const allocated = allocations.reduce((s, a) => s + a.count, 0)
    // 修正舍入误差：差值加到席位最多的党派
    if (allocated !== TOTAL_SEATS && allocations.length > 0) {
      const maxIdx = allocations.reduce(
        (max, a, i, arr) => (a.count > arr[max].count ? i : max),
        0,
      )
      allocations[maxIdx].count += TOTAL_SEATS - allocated
    }
    let currentSeat = 0
    for (const { party, count } of allocations) {
      for (let i = 0; i < count; i++) {
        const seatGlobalIndex = currentSeat + i
        const angle = RING_START + (seatGlobalIndex / TOTAL_SEATS) * RING_SPAN
        arr.push({
          party,
          index: seatGlobalIndex,
          angle,
          isRuling: party.id === rulingId,
        })
      }
      currentSeat += count
    }
    return arr
  }, [data, rulingId, totalSeatsRaw])

  // 51 席过半数线位置
  const majorityAngle = RING_START + (51 / TOTAL_SEATS) * RING_SPAN
  const majorityOuter = polarToCartesian(cx, cy, r + dotR * 2.4, majorityAngle)
  const majorityInner = polarToCartesian(cx, cy, r - dotR * 2.4, majorityAngle)

  // 执政联盟席位
  const coalitionSeats = data.filter((p) => p.inCoalition).reduce((s, p) => s + p.seats, 0)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      style={{ width: size, height: svgHeight + size * 0.18 }}
      onMouseMove={handleMouseMove}
    >
      <svg width={size} height={svgHeight + size * 0.18} viewBox={`0 0 ${size} ${svgHeight + size * 0.18}`}>
        {/* 外圈装饰弧 */}
        <path
          d={`M ${cx - r - dotR * 2} ${cy} A ${r + dotR * 2} ${r + dotR * 2} 0 0 1 ${cx + r + dotR * 2} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={0.5}
        />
        <path
          d={`M ${cx - r + dotR * 2} ${cy} A ${r - dotR * 2} ${r - dotR * 2} 0 0 1 ${cx + r - dotR * 2} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={0.5}
        />

        {/* 100 个席位点 */}
        {seats.map((seat, i) => {
          const pos = polarToCartesian(cx, cy, r, seat.angle)
          const isHovered = hovered === seat.party.id
          return (
            <motion.circle
              key={`${seat.party.id}-${i}`}
              cx={pos.x}
              cy={pos.y}
              r={dotR}
              initial={false}
              animate={{
                r: isHovered ? dotR * 1.4 : dotR,
                opacity: isHovered ? 1 : 0.9,
              }}
              transition={{ duration: 0.18 }}
              fill={seat.party.color}
              stroke={seat.isRuling ? '#e0c98a' : 'rgba(0,0,0,0.3)'}
              strokeWidth={seat.isRuling ? 1.2 : 0.4}
              style={{
                cursor: 'pointer',
                filter: seat.isRuling
                  ? 'drop-shadow(0 0 2px rgba(224,201,138,0.6))'
                  : 'none',
              }}
              onMouseEnter={() => setHovered(seat.party.id)}
              onMouseLeave={() => setHovered(null)}
            />
          )
        })}

        {/* 过半数线 */}
        {showMajorityLine && (
          <motion.line
            x1={majorityInner.x}
            y1={majorityInner.y}
            x2={majorityOuter.x}
            y2={majorityOuter.y}
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="2 1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          />
        )}

        {/* 中央席位信息（移到半圆下方） */}
        <text
          x={cx}
          y={cy + r * 0.35}
          textAnchor="middle"
          fontSize={size * 0.12}
          fontWeight="bold"
          fill="currentColor"
          className="text-gold-light"
        >
          {coalitionSeats}
        </text>
        <text
          x={cx}
          y={cy + r * 0.35 + size * 0.055}
          textAnchor="middle"
          fontSize={size * 0.038}
          fill="rgba(224,201,138,0.6)"
          fontFamily="'IBM Plex Mono', monospace"
        >
          / {TOTAL_SEATS} 席
        </text>
        <text
          x={cx}
          y={cy + r * 0.35 + size * 0.09}
          textAnchor="middle"
          fontSize={size * 0.03}
          fill="rgba(224,201,138,0.5)"
          fontFamily="'IBM Plex Mono', monospace"
          letterSpacing="0.1em"
        >
          {coalitionSeats >= 51 ? '过半执政' : '少数派'}
        </text>
      </svg>

      {/* 悬浮 Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute z-50"
            style={{
              left: Math.min(Math.max(mousePos.x + 12, 0), size - 130),
              top: Math.max(mousePos.y - 56, 0),
            }}
          >
            <div
              className="w-32 rounded-md border bg-ink-900/95 px-3 py-2 shadow-lg backdrop-blur-sm"
              style={{ borderColor: `${data.find((p) => p.id === hovered)?.color}80` }}
            >
              {data
                .filter((p) => p.id === hovered)
                .map((party) => (
                  <div key={party.id}>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                        style={{ backgroundColor: party.color }}
                      />
                      <span className="truncate font-serif text-xs font-semibold text-parchment-100">
                        {party.name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="font-mono text-base font-bold text-gold-light">
                        {party.seats}
                      </span>
                      <span className="font-mono text-[9px] text-parchment-200/50">席位</span>
                      {party.inCoalition && (
                        <span className="ml-auto text-[9px] font-bold text-gold">联盟</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className="font-mono text-[9px] text-parchment-200/50">好感</span>
                      <span className="font-mono text-[10px] font-semibold text-parchment-200">
                        {party.favorability}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
