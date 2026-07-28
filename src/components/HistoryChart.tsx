import { useMemo, useId } from 'react'

/**
 * 历史曲线图（纯 SVG 折线图，无外部图表库）
 *
 * v1.5 新增：用于展示指标月度趋势，让玩家看到走势而非瞬时值。
 *
 * Props：
 *  - data      : 数据点数组（按时间先后顺序，最新值在末尾）
 *  - label     : 图表标题（如"民意支持"）
 *  - color     : 基础颜色（HEX）
 *  - height    : SVG 高度（默认 100）
 *  - unit      : 数值单位后缀（如 "%"、"亿"）
 *  - positive  : true=正向指标（趋势上行=绿，下行=红）；false=负向指标（趋势下行=绿，上行=红）
 *               默认 true
 *
 * 数据点 < 2 时显示"数据积累中..."占位。
 */
interface HistoryChartProps {
  data: number[]
  label: string
  color: string
  height?: number
  unit?: string
  positive?: boolean
}

const PADDING_LEFT = 32   // 左侧留白用于 Y 轴标签
const PADDING_RIGHT = 8
const PADDING_TOP = 14
const PADDING_BOTTOM = 18 // 底部留白用于 X 轴标签
const VIEW_W = 240        // SVG 视图宽度（响应式按高度缩放）

export default function HistoryChart({
  data,
  label,
  color,
  height = 100,
  unit = '',
  positive = true,
}: HistoryChartProps) {
  // useId 用于生成唯一的渐变 ID（同一组件多实例不冲突）
  const rawGradId = useId()
  const gradId = `hist-grad-${rawGradId.replace(/[:]/g, '')}`

  const { points, areaPath, minVal, maxVal, trendColor } = useMemo(() => {
    const validData = data.filter((v) => typeof v === 'number' && !Number.isNaN(v))
    if (validData.length < 2) {
      return {
        points: [] as { x: number; y: number; v: number }[],
        areaPath: '',
        minVal: 0,
        maxVal: 0,
        trendColor: color,
      }
    }
    const min = Math.min(...validData)
    const max = Math.max(...validData)
    // 给 Y 轴留出 8% 的边距，避免折线贴边
    const span = max - min
    const pad = span === 0 ? Math.max(1, max * 0.08) : span * 0.08
    const yMin = min - pad
    const yMax = max + pad
    const yRange = yMax - yMin || 1

    const innerW = VIEW_W - PADDING_LEFT - PADDING_RIGHT
    const innerH = height - PADDING_TOP - PADDING_BOTTOM

    const pts = validData.map((v, i) => {
      const x = PADDING_LEFT + (i / (validData.length - 1)) * innerW
      const y = PADDING_TOP + (1 - (v - yMin) / yRange) * innerH
      return { x, y, v }
    })

    // 平滑路径：用相邻点的中点作为控制点做"伪贝塞尔"，让折线更柔和
    const linePath = pts
      .map((p, i) => {
        if (i === 0) return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
        const prev = pts[i - 1]
        const cx = (prev.x + p.x) / 2
        return `Q ${prev.x.toFixed(2)} ${prev.y.toFixed(2)} ${cx.toFixed(2)} ${((prev.y + p.y) / 2).toFixed(2)} T ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
      })
      .join(' ')

    // 填充区域：折线 + 底部回环
    const baseY = PADDING_TOP + innerH
    const firstX = pts[0].x
    const lastX = pts[pts.length - 1].x
    const areaPathStr = `${linePath} L ${lastX.toFixed(2)} ${baseY} L ${firstX.toFixed(2)} ${baseY} Z`

    // 趋势色：对比首尾值
    const firstV = validData[0]
    const lastV = validData[validData.length - 1]
    const delta = lastV - firstV
    let tc = color
    // 仅当差值 > 0.5% 视为有趋势，否则保持原色
    const threshold = Math.max(0.5, Math.abs(firstV) * 0.005)
    if (Math.abs(delta) > threshold) {
      const isUp = delta > 0
      // 正向指标上行=绿 / 下行=红；负向指标相反
      const goodGreen = positive ? isUp : !isUp
      tc = goodGreen ? '#5a9e3a' : '#c0432f'
    }

    return {
      points: pts,
      areaPath: areaPathStr,
      minVal: min,
      maxVal: max,
      trendColor: tc,
    }
  }, [data, height, color, positive])

  // 数据不足：占位
  if (points.length < 2) {
    return (
      <div className="rounded border border-gold/10 bg-ink-900/30 p-3 flex flex-col">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-serif text-[11px] font-semibold text-parchment-200/80">
            {label}
          </span>
        </div>
        <div
          className="flex items-center justify-center w-full text-parchment-200/30 italic font-serif text-[10px]"
          style={{ height }}
        >
          数据积累中...
        </div>
      </div>
    )
  }

  const lastPoint = points[points.length - 1]
  const firstPoint = points[0]
  const lastVal = lastPoint.v
  const minLabel = Number.isInteger(minVal) ? minVal : minVal.toFixed(1)
  const maxLabel = Number.isInteger(maxVal) ? maxVal : maxVal.toFixed(1)
  const valLabel = Number.isInteger(lastVal)
    ? `${lastVal}${unit}`
    : `${lastVal.toFixed(1)}${unit}`

  // X 轴端点标签：起止
  const startTurnLabel = '月初'
  const endTurnLabel = '本月'

  return (
    <div className="rounded border border-gold/10 bg-ink-900/30 p-3 flex flex-col">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-serif text-[11px] font-semibold text-parchment-200/80">
          {label}
        </span>
        {/* 当前值徽章 */}
        <span
          className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded"
          style={{
            color: trendColor,
            backgroundColor: `${trendColor}22`,
            border: `1px solid ${trendColor}55`,
          }}
        >
          {valLabel}
        </span>
      </div>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VIEW_W} ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={trendColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* 横向网格线（顶部/中部/底部） */}
        {[PADDING_TOP, PADDING_TOP + (height - PADDING_TOP - PADDING_BOTTOM) / 2, height - PADDING_BOTTOM].map(
          (y, i) => (
            <line
              key={i}
              x1={PADDING_LEFT}
              y1={y}
              x2={VIEW_W - PADDING_RIGHT}
              y2={y}
              stroke="rgba(245,158,11,0.08)"
              strokeWidth={0.5}
              strokeDasharray={i === 1 ? '2,3' : '0'}
            />
          ),
        )}

        {/* Y 轴标签（最大/最小） */}
        <text
          x={PADDING_LEFT - 4}
          y={PADDING_TOP + 4}
          textAnchor="end"
          fontSize={8}
          fill="rgba(245,235,210,0.45)"
          fontFamily="monospace"
        >
          {maxLabel}
        </text>
        <text
          x={PADDING_LEFT - 4}
          y={height - PADDING_BOTTOM + 4}
          textAnchor="end"
          fontSize={8}
          fill="rgba(245,235,210,0.45)"
          fontFamily="monospace"
        >
          {minLabel}
        </text>

        {/* 填充区域 */}
        <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />

        {/* 折线 */}
        <path
          d={points
            .map((p, i) => {
              if (i === 0) return `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
              const prev = points[i - 1]
              const cx = (prev.x + p.x) / 2
              return `Q ${prev.x.toFixed(2)} ${prev.y.toFixed(2)} ${cx.toFixed(2)} ${((prev.y + p.y) / 2).toFixed(2)} T ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
            })
            .join(' ')}
          fill="none"
          stroke={trendColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 末端圆点（强调当前值） */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2.8}
          fill={trendColor}
          stroke="rgba(20,12,8,0.8)"
          strokeWidth={0.8}
        />

        {/* 起点小圆点 */}
        <circle
          cx={firstPoint.x}
          cy={firstPoint.y}
          r={1.5}
          fill={trendColor}
          opacity={0.5}
        />

        {/* X 轴端点标签 */}
        <text
          x={firstPoint.x}
          y={height - 4}
          textAnchor="start"
          fontSize={8}
          fill="rgba(245,235,210,0.4)"
          fontFamily="serif"
        >
          {startTurnLabel}
        </text>
        <text
          x={lastPoint.x}
          y={height - 4}
          textAnchor="end"
          fontSize={8}
          fill="rgba(245,235,210,0.4)"
          fontFamily="serif"
        >
          {endTurnLabel}
        </text>
      </svg>
    </div>
  )
}
