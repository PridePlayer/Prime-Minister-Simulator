import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'

/** 过半数席位红线（100席议会的过半数为51） */
const MAJORITY_THRESHOLD = 51

/** 极坐标转笛卡尔坐标 */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/** 描述半圆环形切片路径（顶半圆，角度从 180° → 360°） */
function describeArc(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
) {
  const outerStart = polarToCartesian(cx, cy, rOuter, startAngle)
  const outerEnd = polarToCartesian(cx, cy, rOuter, endAngle)
  const innerEnd = polarToCartesian(cx, cy, rInner, endAngle)
  const innerStart = polarToCartesian(cx, cy, rInner, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  // 外弧逆时针（视觉上从左经顶部到右），内弧顺时针返回
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

/** 组阁谈判界面 */
export default function CoalitionNegotiation() {
  const parties = useGameStore((s) => s.parties)
  const pmStats = useGameStore((s) => s.pmStats)
  const handleCoalitionNegotiation = useGameStore((s) => s.handleCoalitionNegotiation)

  // 执政联盟当前总席位
  const coalitionSeats = parties
    .filter((p) => p.inCoalition)
    .reduce((sum, p) => sum + p.seats, 0)
  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0)
  const hasMajority = coalitionSeats >= MAJORITY_THRESHOLD

  // 非盟友小党（不含执政党本身）
  const smallParties = parties.filter((p) => !p.inCoalition && p.id !== 'party_ruling')

  // 谈判失败判定：所有小党好感度过低 / 没有小党可谈 / 政治资本耗尽
  const allRejected =
    smallParties.length > 0 && smallParties.every((p) => p.favorability < 20)
  const noCapital = pmStats.politicalCapital < 5
  const negotiationFailed =
    !hasMajority && (smallParties.length === 0 || allRejected || noCapital)

  // 半圆席位图参数
  const cx = 100
  const cy = 100
  const rOuter = 90
  const rInner = 60

  // 按席位比例分配半圆角度区间
  let currentAngle = 180
  const slices = parties.map((p) => {
    const angleSpan = (p.seats / totalSeats) * 180
    const startAngle = currentAngle
    const endAngle = currentAngle + angleSpan
    currentAngle = endAngle
    return { party: p, startAngle, endAngle }
  })

  // 51 席红线角度位置
  const thresholdAngle = 180 + (MAJORITY_THRESHOLD / totalSeats) * 180
  const thresholdInner = polarToCartesian(cx, cy, rInner, thresholdAngle)
  const thresholdOuter = polarToCartesian(cx, cy, rOuter, thresholdAngle)

  // 执政联盟席位进度标记
  const coalitionAngle = 180 + (coalitionSeats / totalSeats) * 180
  const coalitionMarker = polarToCartesian(cx, cy, (rInner + rOuter) / 2, coalitionAngle)

  /** 进入内阁组建阶段 */
  const handleConfirm = () => {
    useGameStore.setState({ gamePhase: 'cabinet_setup' })
  }

  /** 重新大选（简化处理：直接进入游戏阶段） */
  const handleReelection = () => {
    useGameStore.setState({ gamePhase: 'playing', timeSpeed: 0 })
  }

  return (
    <div className="flex min-h-full flex-col items-center bg-ink-grid px-4 py-6">
      <div className="w-full max-w-5xl">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <h1 className="font-display text-3xl font-bold tracking-[0.25em] text-gold">
            组阁谈判
          </h1>
          <div className="mt-1 font-mono text-[11px] tracking-[0.4em] text-gold/50">
            COALITION NEGOTIATION
          </div>
        </motion.div>

        {/* 半圆席位图 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="doc-card mb-6 flex flex-col items-center p-5"
        >
          <svg width="200" height="120" viewBox="0 0 200 120" aria-label="议会席位分布">
            {/* 各党派席位扇形 */}
            {slices.map(({ party, startAngle, endAngle }) => (
              <path
                key={party.id}
                d={describeArc(cx, cy, rOuter, rInner, startAngle, endAngle)}
                fill={party.color}
                opacity={party.inCoalition ? 1 : 0.35}
                stroke="#0d1b2a"
                strokeWidth="0.5"
              />
            ))}
            {/* 51 席过半数红线 */}
            <line
              x1={thresholdInner.x}
              y1={thresholdInner.y}
              x2={thresholdOuter.x}
              y2={thresholdOuter.y}
              stroke="#dc2626"
              strokeWidth="2"
              strokeDasharray="3 2"
            />
            {/* 执政联盟席位进度标记 */}
            <circle
              cx={coalitionMarker.x}
              cy={coalitionMarker.y}
              r="4"
              fill="#c9a961"
              stroke="#0d1b2a"
              strokeWidth="1"
            />
          </svg>

          {/* 数据汇总 */}
          <div className="mt-3 flex items-center gap-8">
            <div className="text-center">
              <div className="font-serif text-[10px] text-parchment-200/50">执政联盟席位</div>
              <div
                className={`font-mono text-2xl font-bold ${
                  hasMajority ? 'text-gold' : 'text-orange-400'
                }`}
              >
                {coalitionSeats}
              </div>
            </div>
            <div className="text-center">
              <div className="font-serif text-[10px] text-parchment-200/50">过半数红线</div>
              <div className="font-mono text-2xl font-bold text-red-500">
                {MAJORITY_THRESHOLD}
              </div>
            </div>
            <div className="text-center">
              <div className="font-serif text-[10px] text-parchment-200/50">政治资本</div>
              <div className="font-mono text-2xl font-bold text-parchment-100">
                {pmStats.politicalCapital}
              </div>
            </div>
          </div>

          {/* 党派图例 */}
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {parties.map((p) => (
              <div key={p.id} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: p.color, opacity: p.inCoalition ? 1 : 0.4 }}
                />
                <span
                  className={`font-serif text-[10px] ${
                    p.inCoalition ? 'text-parchment-100' : 'text-parchment-200/50'
                  }`}
                >
                  {p.name} {p.seats}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 已过半数：可以组建政府 */}
        {hasMajority ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="doc-card p-8 text-center"
          >
            <div className="mb-3 text-4xl">🏛️</div>
            <div className="mb-2 font-display text-xl font-bold text-gold">
              已过半数，可以组建政府
            </div>
            <p className="mb-6 font-serif text-sm text-parchment-200/70">
              执政联盟目前掌握 {coalitionSeats} 席，超过 {MAJORITY_THRESHOLD} 席红线，您可以正式组建内阁。
            </p>
            <button onClick={handleConfirm} className="btn-gold px-10 py-3">
              进入内阁组建
            </button>
          </motion.div>
        ) : (
          <>
            {/* 未过半提示 */}
            <div className="signature-area mb-4 text-center">
              <p className="font-serif text-xs text-parchment-200/70">
                当前执政联盟席位{' '}
                <span className="font-mono font-bold text-gold">{coalitionSeats}</span> / {totalSeats}
                ，距过半数还差{' '}
                <span className="font-mono font-bold text-red-400">
                  {MAJORITY_THRESHOLD - coalitionSeats}
                </span>{' '}
                席。请与下列小党进行谈判以争取支持，每次谈判将消耗政治资本。
              </p>
            </div>

            {/* 小党列表 */}
            <div className="mb-6 space-y-3">
              {smallParties.map((party, i) => (
                <motion.div
                  key={party.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="doc-card p-4"
                >
                  <div className="flex items-start gap-3">
                    {/* 党派颜色块 */}
                    <div
                      className="h-12 w-2 shrink-0 rounded-sm"
                      style={{ background: party.color }}
                    />

                    <div className="flex-1">
                      {/* 党派基本信息 */}
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <div className="font-serif text-sm font-bold text-parchment-100">
                            {party.name}
                          </div>
                          <div className="font-mono text-xs text-parchment-200/60">
                            席位 {party.seats} · 好感度 {party.favorability}
                          </div>
                        </div>
                      </div>

                      {/* 组阁要求 */}
                      <div className="signature-area mb-3">
                        <div className="mb-1 font-serif text-[10px] text-parchment-200/50">
                          组阁要求
                        </div>
                        <ul className="space-y-0.5">
                          {(party.coalitionDemands ?? [
                            '要求出让部长职位',
                            '要求政策承诺',
                            '要求专项拨款',
                          ]).map((d, idx) => (
                            <li key={idx} className="font-serif text-xs text-parchment-200/80">
                              · {d}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 谈判行动按钮 */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleCoalitionNegotiation(party.id, 'accept')}
                          disabled={pmStats.politicalCapital < 15}
                          className="rounded border border-gold/40 bg-gold/10 px-3 py-2 font-serif text-xs text-gold transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          接受条件
                          <br />
                          <span className="font-mono text-[9px] opacity-70">-15 政治资本</span>
                        </button>
                        <button
                          onClick={() => handleCoalitionNegotiation(party.id, 'partial')}
                          disabled={pmStats.politicalCapital < 5}
                          className="rounded border border-orange-500/40 bg-orange-500/10 px-3 py-2 font-serif text-xs text-orange-300 transition-colors hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          部分接受
                          <br />
                          <span className="font-mono text-[9px] opacity-70">-5 政治资本</span>
                        </button>
                        <button
                          onClick={() => handleCoalitionNegotiation(party.id, 'reject')}
                          className="rounded border border-red-600/40 bg-red-600/10 px-3 py-2 font-serif text-xs text-red-300 transition-colors hover:bg-red-600/20"
                        >
                          拒绝
                          <br />
                          <span className="font-mono text-[9px] opacity-70">无消耗</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* 谈判失败：重新大选 */}
            {negotiationFailed && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="doc-card border-red-600/40 p-6 text-center"
              >
                <div className="mb-2 text-3xl">⚠️</div>
                <div className="mb-2 font-display text-lg font-bold text-red-400">谈判破裂</div>
                <p className="mb-4 font-serif text-xs text-parchment-200/70">
                  {noCapital
                    ? '政治资本已耗尽，无法继续谈判。'
                    : smallParties.length === 0
                      ? '已无可谈判的小党，但仍未达到过半数席位。'
                      : '所有小党均已拒绝合作，无法组建有效政府。'}
                  <br />
                  建议解散议会，重新举行大选。
                </p>
                <button
                  onClick={handleReelection}
                  className="rounded border border-red-600/50 bg-red-600/15 px-8 py-2.5 font-serif text-sm text-red-300 transition-colors hover:bg-red-600/25"
                >
                  重新大选
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
