import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { LAW_GROUPS } from '@/data/laws'
import {
  getTopicMeta,
  getIntensityMeta,
  getBillFactionMeta,
  type BillTopic,
  type BillIntensity,
  type BillFaction,
} from '@/data/parameterizedBills'
import type { LawGroup, Law, ParameterizedBill, Metrics, SecondaryMetrics } from '@/types/game'

/**
 * 法律议事厅（维多利亚3风格）
 * 7 个法律组 × 3 档法律；同组互斥；立法需要 政治资本 + 议会席位 + 数个月审议期。
 * 当前生效档位高亮显示；进行中的立法展示进度条与剩余月数。
 */
export default function LawsPage() {
  const activeLaws = useGameStore((s) => s.activeLaws)
  const enactingLaw = useGameStore((s) => s.enactingLaw)
  const pmStats = useGameStore((s) => s.pmStats)
  const treasury = useGameStore((s) => s.metrics.treasury)
  const rulingPartySeats = useGameStore((s) => s.parliament.rulingPartySeats)
  const enactLaw = useGameStore((s) => s.enactLaw)
  const proposedBills = useGameStore((s) => s.proposedParameterizedBills) ?? []
  const enactParameterizedBill = useGameStore((s) => s.enactParameterizedBill)
  const dismissParameterizedBill = useGameStore((s) => s.dismissParameterizedBill)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [confirmingBill, setConfirmingBill] = useState<string | null>(null)

  // 已立法统计：非默认档生效的法律数量
  const enactedCount = LAW_GROUPS.filter((g) => {
    const activeId = activeLaws[g.id]
    const activeLaw = g.laws.find((l) => l.id === activeId)
    return activeLaw && !activeLaw.isDefault
  }).length

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2">
      {/* ============ Hero 头部 ============ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-5 overflow-hidden rounded-lg"
        style={{
          background:
            'linear-gradient(135deg, rgba(58,36,24,0.95) 0%, rgba(42,24,16,0.95) 100%)',
          border: '1px solid transparent',
          backgroundImage:
            'linear-gradient(135deg, rgba(58,36,24,0.95) 0%, rgba(42,24,16,0.95) 100%), linear-gradient(135deg, rgba(245,158,11,0.6), rgba(190,18,60,0.4), rgba(245,158,11,0.6))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        }}
      >
        {/* 装饰角线 */}
        <div className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-gold/60" />
        <div className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-gold/60" />
        <div className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-gold/60" />
        <div className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-gold/60" />

        <div className="relative px-6 py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* 标题区 */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold/60 bg-gradient-to-br from-ink-800 to-ink-950 shadow-gold">
                <span className="text-2xl">⚖️</span>
              </div>
              <div>
                <h1 className="font-display text-2xl font-extrabold tracking-[0.2em] text-parchment-100">
                  法 律 议 事 厅
                </h1>
                <p className="font-serif text-[11px] text-parchment-200/50 mt-0.5 tracking-wider">
                  国家的制度性长期安排 · 跨系统传导
                </p>
              </div>
            </div>

            {/* 资源指示器 */}
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-parchment-200/40 tracking-widest">已立法</span>
                <span className="text-lg font-bold text-gold">
                  {enactedCount}<span className="text-[10px] text-parchment-200/40"> / {LAW_GROUPS.length}</span>
                </span>
              </div>
              <div className="h-8 w-px bg-gold/20" />
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-parchment-200/40 tracking-widest">执政席位</span>
                <span className="text-lg font-bold text-gold">{rulingPartySeats}<span className="text-[10px] text-parchment-200/40"> / 100</span></span>
              </div>
              <div className="h-8 w-px bg-gold/20" />
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-parchment-200/40 tracking-widest">政治资本</span>
                <span className="text-lg font-bold text-amber-300">{pmStats.politicalCapital}</span>
              </div>
              <div className="h-8 w-px bg-gold/20" />
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-parchment-200/40 tracking-widest">国库</span>
                <span className="text-lg font-bold text-emerald-300">{Math.round(treasury)}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 进行中立法横幅 */}
      {enactingLaw && <EnactingBanner key={enactingLaw.lawId} />}

      {/* ============ 法律组卡片网格 ============ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {LAW_GROUPS.map((group, idx) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.4 }}
          >
            <LawGroupCard
              group={group}
              activeLawId={activeLaws[group.id] ?? ''}
              enactingLaw={enactingLaw}
              confirming={confirming}
              setConfirming={setConfirming}
              onEnact={enactLaw}
              pmStats={pmStats}
              treasury={treasury}
              rulingPartySeats={rulingPartySeats}
            />
          </motion.div>
        ))}
      </div>

      {/* ============ v1.5 议员提案（参数化法案） ============ */}
      <div className="mt-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📜</span>
          <span className="font-display text-sm font-bold tracking-[0.25em] text-gold">
            议 员 提 案
          </span>
          <span className="font-mono text-[10px] text-parchment-200/40">
            议题 × 强度 × 受益派系 · 每月刷新
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
          <span className="font-mono text-[10px] text-parchment-200/40">
            本月 {proposedBills.length} 条
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {proposedBills.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-full doc-card p-4 text-center"
              >
                <div className="text-3xl opacity-40 mb-2">📭</div>
                <div className="font-serif text-xs text-parchment-200/50">
                  本月议会无新提案。下月结算后将刷新议员提案。
                </div>
              </motion.div>
            ) : (
              proposedBills.map((bill) => (
                <BillProposalCard
                  key={bill.id}
                  bill={bill}
                  pmStats={pmStats}
                  treasury={treasury}
                  rulingPartySeats={rulingPartySeats}
                  enactingLaw={enactingLaw}
                  confirming={confirmingBill}
                  setConfirming={setConfirmingBill}
                  onEnact={enactParameterizedBill}
                  onDismiss={dismissParameterizedBill}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 立法机制说明 */}
      <div className="mt-5 doc-card p-4">
        <div className="font-serif text-sm font-semibold text-gold mb-2 flex items-center gap-2">
          <span>📜</span>
          <span>立法机制</span>
        </div>
        <div className="font-serif text-xs text-parchment-200/60 leading-relaxed space-y-1">
          <p>· 法律分为 7 个组，每组 3 档；同组同时仅一档生效，新法生效将取代旧法。</p>
          <p>· 立法需消耗<strong className="text-amber-300">政治资本</strong>（部分还需国库），并占用议会审议期（2–6 个月）。</p>
          <p>· 部分重要法律设有<strong className="text-amber-300">席位门槛</strong>，执政席位不足时无法推动。</p>
          <p>· 同时仅能推动一项立法；立法完成后效果跨系统传导（经济、军事、民意、稳定等）。</p>
          <p>· 与「政策树」的方向性、「改革」的项目制定位不同——法律是制度性长期安排。</p>
        </div>
      </div>
    </div>
  )
}

/** 档位颜色映射：0=灰，1=铜，2=银，3=金
 *  v1.5.1：L0/L2 改用暗色调，避免深色背景下呈现"白边" */
const TIER_META: { label: string; color: string; bg: string; border: string; glow: string }[] = [
  { label: 'L0', color: '#8b95a5', bg: 'rgba(120,130,145,0.12)', border: 'rgba(120,130,145,0.35)', glow: 'rgba(120,130,145,0.2)' },
  { label: 'L1', color: '#d97706', bg: 'rgba(180,83,9,0.18)', border: 'rgba(217,119,6,0.6)', glow: 'rgba(217,119,6,0.4)' },
  { label: 'L2', color: '#a8b4c8', bg: 'rgba(130,145,170,0.14)', border: 'rgba(130,145,170,0.4)', glow: 'rgba(130,145,170,0.25)' },
  { label: 'L3', color: '#fbbf24', bg: 'rgba(251,191,36,0.18)', border: 'rgba(251,191,36,0.7)', glow: 'rgba(251,191,36,0.5)' },
]

/** 进行中立法横幅：展示进度条与剩余月数 */
function EnactingBanner() {
  const enactingLaw = useGameStore((s) => s.enactingLaw)!
  const group = LAW_GROUPS.find((g) => g.id === enactingLaw.groupId)
  const law = group?.laws.find((l) => l.id === enactingLaw.lawId)
  // v1.5：参数化法案不在 LAW_GROUPS 中，需从 proposedParameterizedBills 查
  const pbill = !group
    ? useGameStore.getState().proposedParameterizedBills?.find((b) => b.id === enactingLaw.lawId)
    : undefined
  if (!group && !pbill) return null
  if (group && !law) return null

  const displayName = law?.name ?? pbill?.name ?? '未知法案'
  const displayDesc = law?.description ?? pbill?.description ?? ''
  const elapsed = useGameStore.getState().turn - enactingLaw.startTurn
  const remaining = Math.max(0, enactingLaw.duration - elapsed)
  const progress = Math.min(100, (elapsed / enactingLaw.duration) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="doc-card p-4 mb-4 border-l-4"
      style={{ borderLeftColor: '#fbbf24' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{group?.icon ?? '📜'}</span>
          <span className="font-display text-sm font-bold text-gold">
            议会审议中：《{displayName}》
          </span>
        </div>
        <span className="font-mono text-[10px] text-amber-300/80">
          剩余 {remaining} 个月
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/60">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-gold"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <p className="font-serif text-[10px] text-parchment-200/50 mt-2 leading-relaxed">
        {law?.enactNarrative ?? pbill?.enactNarrative ?? '议会正在审议法案，期间可能引发辩论与游说事件。'}
      </p>
    </motion.div>
  )
}

/** 单个法律组卡片 */
function LawGroupCard({
  group,
  activeLawId,
  enactingLaw,
  confirming,
  setConfirming,
  onEnact,
  pmStats,
  treasury,
  rulingPartySeats,
}: {
  group: LawGroup
  activeLawId: string
  enactingLaw: { groupId: string; lawId: string; startTurn: number; duration: number } | null
  confirming: string | null
  setConfirming: (v: string | null) => void
  onEnact: (groupId: string, lawId: string) => void
  pmStats: { politicalCapital: number }
  treasury: number
  rulingPartySeats: number
}) {
  const activeIndex = group.laws.findIndex((l) => l.id === activeLawId)
  const activeLaw = group.laws[activeIndex]
  const activeTier = TIER_META[activeIndex] ?? TIER_META[0]
  const isThisGroupEnacting = enactingLaw?.groupId === group.id

  return (
    <div className="doc-card p-4 h-full flex flex-col">
      {/* 组标题 */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-md border"
          style={{
            borderColor: activeTier.border,
            background: activeTier.bg,
            boxShadow: `0 0 12px ${activeTier.glow}`,
          }}
        >
          <span className="text-lg">{group.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-bold tracking-wider text-parchment-100">
              {group.name}
            </span>
            {/* 当前档位徽章 */}
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold"
              style={{
                color: activeTier.color,
                backgroundColor: activeTier.bg,
                border: `1px solid ${activeTier.border}`,
              }}
            >
              {activeTier.label} · 生效中
            </span>
          </div>
          <p className="font-serif text-[10px] text-parchment-200/50 mt-0.5 truncate">
            {group.description}
          </p>
        </div>
      </div>

      {/* 档位进度指示器 L0→L1→L2→L3 */}
      <div className="mb-3">
        <div className="flex items-center gap-1">
          {group.laws.map((law, i) => {
            const tier = TIER_META[i] ?? TIER_META[0]
            const isActive = i === activeIndex
            const isEnacting = enactingLaw?.lawId === law.id
            const isPassed = i < activeIndex
            return (
              <div key={law.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full font-mono text-[9px] font-bold transition-all"
                    style={{
                      color: isActive || isEnacting || isPassed ? tier.color : 'rgba(232,220,192,0.35)',
                      backgroundColor: isActive ? tier.bg : isEnacting ? 'rgba(245,158,11,0.15)' : isPassed ? 'rgba(74,48,32,0.6)' : 'rgba(42,24,16,0.6)',
                      border: `1.5px solid ${isActive ? tier.border : isEnacting ? 'rgba(245,158,11,0.5)' : isPassed ? 'rgba(156,163,175,0.3)' : 'rgba(232,220,192,0.15)'}`,
                      boxShadow: isActive ? `0 0 8px ${tier.glow}` : 'none',
                    }}
                  >
                    {isActive ? '●' : isEnacting ? '◐' : isPassed ? '✓' : tier.label}
                  </div>
                </div>
                {i < group.laws.length - 1 && (
                  <div
                    className="h-0.5 flex-1 mx-1 rounded-full transition-all"
                    style={{
                      background: i < activeIndex
                        ? 'linear-gradient(90deg, rgba(217,119,6,0.6), rgba(229,231,235,0.5))'
                        : 'rgba(232,220,192,0.12)',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1 px-0.5">
          {group.laws.map((law) => (
            <span key={law.id} className="font-mono text-[8px] text-parchment-200/40 truncate max-w-[80px] text-center">
              {law.name}
            </span>
          ))}
        </div>
      </div>

      {/* 当前生效法律效果预览 */}
      {activeLaw && (
        <div
          className="rounded-md p-2.5 mb-3 border"
          style={{
            borderColor: activeTier.border,
            background: `linear-gradient(135deg, ${activeTier.bg} 0%, rgba(42,24,16,0.4) 100%)`,
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-serif text-xs font-bold text-parchment-100">
              {activeLaw.name}
            </span>
            <span className="font-mono text-[9px] text-parchment-200/50">
              当前生效
            </span>
          </div>
          <p className="font-serif text-[10px] text-parchment-200/60 leading-relaxed mb-2">
            {activeLaw.description}
          </p>
          {/* 跨系统影响标签 */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(activeLaw.perTurnEffects).map(([k, v]) => (
              <EffectChip key={k} k={k} v={v as number} />
            ))}
            {activeLaw.secondaryEffects &&
              Object.entries(activeLaw.secondaryEffects).map(([k, v]) => (
                <EffectChip key={k} k={k} v={v as number} secondary />
              ))}
            {Object.keys(activeLaw.perTurnEffects).length === 0 &&
              (!activeLaw.secondaryEffects || Object.keys(activeLaw.secondaryEffects).length === 0) && (
                <span className="font-mono text-[9px] text-parchment-200/30">无每月效果</span>
              )}
          </div>
        </div>
      )}

      {/* 可推进的法律档位列表 */}
      <div className="space-y-2 flex-1">
        {group.laws.map((law) => {
          const isActive = activeLawId === law.id
          const isEnacting = enactingLaw?.lawId === law.id
          const confirmKey = `${group.id}:${law.id}`
          const isConfirming = confirming === confirmKey
          const lawIndex = group.laws.findIndex((l) => l.id === law.id)
          const tier = TIER_META[lawIndex] ?? TIER_META[0]

          if (isActive) return null // 已生效的不显示推进按钮

          // 启动立法的可行性校验
          const isLocked = !!enactingLaw // 同时只能推进一项
          const seatsOk = !law.minSeats || rulingPartySeats >= law.minSeats
          const capitalOk = pmStats.politicalCapital >= law.enactCost.politicalCapital
          const treasuryOk = !law.enactCost.treasury || treasury >= law.enactCost.treasury
          const canEnact = !isLocked && !isActive && seatsOk && capitalOk && treasuryOk

          return (
            <LawEnactRow
              key={law.id}
              law={law}
              tier={tier}
              isEnacting={isEnacting}
              isConfirming={isConfirming}
              canEnact={canEnact}
              isLocked={isLocked}
              seatsOk={seatsOk}
              capitalOk={capitalOk}
              treasuryOk={treasuryOk}
              onConfirm={() => setConfirming(confirmKey)}
              onCancel={() => setConfirming(null)}
              onEnact={() => {
                onEnact(group.id, law.id)
                setConfirming(null)
              }}
              hasEnacting={!!enactingLaw}
            />
          )
        })}
      </div>

      {isThisGroupEnacting && (
        <div className="mt-2 rounded bg-amber-500/10 px-2 py-1 text-center font-mono text-[9px] text-amber-300/80">
          ◐ 本组法律正在审议中
        </div>
      )}
    </div>
  )
}

/** 单条可推进法律行 */
function LawEnactRow({
  law,
  tier,
  isEnacting,
  isConfirming,
  canEnact,
  isLocked,
  seatsOk,
  capitalOk,
  treasuryOk,
  onConfirm,
  onCancel,
  onEnact,
  hasEnacting,
}: {
  law: Law
  tier: { label: string; color: string; bg: string; border: string; glow: string }
  isEnacting: boolean
  isConfirming: boolean
  canEnact: boolean
  isLocked: boolean
  seatsOk: boolean
  capitalOk: boolean
  treasuryOk: boolean
  onConfirm: () => void
  onCancel: () => void
  onEnact: () => void
  hasEnacting: boolean
}) {
  // 下一档效果预览
  const effectEntries = [
    ...Object.entries(law.perTurnEffects),
    ...(law.secondaryEffects ? Object.entries(law.secondaryEffects) : []),
  ]

  return (
    <div
      className={`relative rounded-md border p-2.5 transition-all ${
        isEnacting
          ? 'border-amber-500/50 bg-amber-950/20'
          : 'border-gold/15 bg-ink-900/40 hover:border-gold/30'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="flex h-5 w-5 items-center justify-center rounded font-mono text-[9px] font-bold shrink-0"
            style={{ color: tier.color, backgroundColor: tier.bg, border: `1px solid ${tier.border}` }}
          >
            {tier.label}
          </span>
          <span className="font-serif text-xs font-bold text-parchment-100 truncate">
            {law.name}
          </span>
          {law.isDefault && (
            <span className="rounded-full bg-parchment-200/8 px-1.5 py-0.5 font-mono text-[8px] text-parchment-200/40 shrink-0">
              默认
            </span>
          )}
        </div>
        {isEnacting && (
          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 font-mono text-[8px] font-bold text-amber-300 shrink-0">
            审议中
          </span>
        )}
      </div>

      {/* 简短描述 */}
      <p className="font-serif text-[10px] text-parchment-200/55 leading-relaxed mb-2 line-clamp-2">
        {law.description}
      </p>

      {/* 效果预览（紧凑） */}
      {effectEntries.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {effectEntries.slice(0, 4).map(([k, v]) => (
            <EffectChip key={k} k={k} v={v as number} />
          ))}
          {effectEntries.length > 4 && (
            <span className="font-mono text-[9px] text-parchment-200/40 self-center">
              +{effectEntries.length - 4}
            </span>
          )}
        </div>
      )}

      {/* 立法成本 + 按钮 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 font-mono text-[9px]">
          <span className={`px-1.5 py-0.5 rounded ${capitalOk ? 'bg-amber-500/10 text-amber-300/80' : 'bg-red-950/40 text-red-400'}`}>
            💼 {law.enactCost.politicalCapital}
          </span>
          {law.enactCost.treasury ? (
            <span className={`px-1.5 py-0.5 rounded ${treasuryOk ? 'bg-emerald-500/10 text-emerald-300/80' : 'bg-red-950/40 text-red-400'}`}>
              💰 {law.enactCost.treasury}
            </span>
          ) : null}
          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300/80">
            📅 {law.enactMonths}月
          </span>
          {law.minSeats ? (
            <span className={`px-1.5 py-0.5 rounded ${seatsOk ? 'bg-purple-500/10 text-purple-300/80' : 'bg-red-950/40 text-red-400'}`}>
              🪑 ≥{law.minSeats}
            </span>
          ) : null}
        </div>

        <div className="flex-1 min-w-[100px]">
          {isConfirming ? (
            <div className="flex gap-1">
              <button
                onClick={onEnact}
                disabled={!canEnact}
                className={`flex-1 rounded px-2 py-1 font-serif text-[10px] font-bold transition-all ${
                  canEnact
                    ? 'bg-red-700/60 text-white hover:bg-red-700'
                    : 'bg-ink-900/40 text-parchment-200/30 cursor-not-allowed'
                }`}
              >
                确认提交
              </button>
              <button
                onClick={onCancel}
                className="flex-1 rounded px-2 py-1 font-serif text-[10px] bg-ink-800/60 text-parchment-200/60 hover:bg-ink-700/60"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={onConfirm}
              disabled={!canEnact}
              className={`w-full rounded px-2 py-1 font-serif text-[10px] font-bold transition-all ${
                canEnact
                  ? 'bg-amber-700/30 text-amber-200 hover:bg-amber-700/50 border border-amber-500/40'
                  : 'bg-ink-900/40 text-parchment-200/30 cursor-not-allowed border border-gold/10'
              }`}
            >
              {!hasEnacting
                ? !seatsOk
                  ? '席位不足'
                  : !capitalOk
                  ? '政治资本不足'
                  : !treasuryOk
                  ? '国库不足'
                  : '⚖️ 推进立法'
                : '已有立法进行中'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** 效果标签 */
function EffectChip({ k, v, secondary }: { k: string; v: number; secondary?: boolean }) {
  const labels: Record<string, string> = {
    approval: '❤️民意',
    treasury: '💰国库',
    economy: '📈经济',
    stability: '🛡️稳定',
    diplomacy: '🌐外交',
    prestige: '👑声望',
    urbanSupport: '🏙️城市',
    ruralSupport: '🌾农村',
    youthSupport: '🎓青年',
    fiscalSurplus: '💰盈余',
    debtLevel: '📉债务',
    forexReserves: '🏦外汇',
    industrialOutput: '🏭工业',
    agriculturalOutput: '🌱农业',
    employmentRate: '💼就业',
    inflationRate: '🔥通胀',
    crimeRate: '🚨犯罪',
    protestFrequency: '📣抗议',
    socialCohesion: '🤝团结',
    majorPowerRelations: '🌐大国',
    neighborRelations: '🗺️邻国',
    orgInfluence: '🏛️国际组织',
    politicalPrestige: '👑政坛',
    mediaRating: '📰媒体',
    historicalLegacy: '📜历史',
    pollutionIndex: '☣️污染',
  }
  const label = labels[k] ?? k
  const positive = v > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-mono text-[9px] font-bold ${
        secondary ? 'opacity-70' : ''
      }`}
      style={{
        color: positive ? '#7a9d55' : '#b34554',
        backgroundColor: positive ? 'rgba(122,157,85,0.12)' : 'rgba(179,69,84,0.12)',
      }}
    >
      {label} {positive ? '+' : ''}{v}
    </span>
  )
}

/** 参数化法案提案卡片 */
function BillProposalCard({
  bill,
  pmStats,
  treasury,
  rulingPartySeats,
  enactingLaw,
  confirming,
  setConfirming,
  onEnact,
  onDismiss,
}: {
  bill: ParameterizedBill
  pmStats: { politicalCapital: number }
  treasury: number
  rulingPartySeats: number
  enactingLaw: { groupId: string; lawId: string; startTurn: number; duration: number } | null
  confirming: string | null
  setConfirming: (v: string | null) => void
  onEnact: (billId: string) => void
  onDismiss: (billId: string) => void
}) {
  const topicMeta = getTopicMeta(bill.topic as BillTopic)
  const intensityMeta = getIntensityMeta(bill.intensity as BillIntensity)
  const factionMeta = getBillFactionMeta(bill.faction as BillFaction)
  const hasEnacting = enactingLaw !== null
  const seatsOk = rulingPartySeats >= (bill.minSeats ?? 0)
  const capitalOk = pmStats.politicalCapital >= bill.enactCost.politicalCapital
  const treasuryOk = !bill.enactCost.treasury || treasury >= bill.enactCost.treasury
  const canEnact = !hasEnacting && seatsOk && capitalOk && treasuryOk
  const isConfirming = confirming === bill.id

  // 强度配色
  const intensityColor =
    bill.intensity === 'radical' ? '#dc2626' : bill.intensity === 'moderate' ? '#d97706' : '#7a9d55'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="doc-card p-3 flex flex-col gap-2"
      style={{ borderLeft: `3px solid ${intensityColor}` }}
    >
      {/* 顶部：议题 + 强度 + 派系 */}
      <div className="flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink-900/60 border border-gold/30">
          <span className="text-lg">{topicMeta.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-xs font-bold text-parchment-100 leading-snug">
            {bill.name}
          </div>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            <span
              className="px-1.5 py-0.5 rounded-sm font-mono text-[9px] font-bold"
              style={{ color: intensityColor, backgroundColor: `${intensityColor}22` }}
            >
              {intensityMeta.label}
            </span>
            <span className="px-1.5 py-0.5 rounded-sm font-mono text-[9px] text-parchment-200/60 bg-ink-900/40">
              {factionMeta.icon} {factionMeta.label}
            </span>
            {bill.hasSynergy && (
              <span className="px-1.5 py-0.5 rounded-sm font-mono text-[9px] text-emerald-300 bg-emerald-900/20">
                ★ 派系契合 +20%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 描述 */}
      <p className="font-serif text-[10px] text-parchment-200/60 leading-relaxed line-clamp-2">
        {bill.description}
      </p>

      {/* 效果预览 */}
      <div className="flex flex-wrap gap-1">
        {Object.entries(bill.perTurnEffects).map(([k, v]) => (
          <EffectChip key={k} k={k} v={v ?? 0} />
        ))}
        {bill.secondaryEffects &&
          Object.entries(bill.secondaryEffects).map(([k, v]) => (
            <EffectChip key={k} k={k} v={v ?? 0} secondary />
          ))}
      </div>

      {/* 成本 */}
      <div className="grid grid-cols-3 gap-2 font-mono text-[10px] py-1 border-y border-gold/10">
        <div className="flex flex-col">
          <span className="text-parchment-200/40 text-[9px]">审议</span>
          <span className="text-gold font-bold">{bill.enactMonths}月</span>
        </div>
        <div className="flex flex-col">
          <span className="text-parchment-200/40 text-[9px]">资本</span>
          <span className={capitalOk ? 'text-amber-300 font-bold' : 'text-red-400 font-bold'}>
            {bill.enactCost.politicalCapital}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-parchment-200/40 text-[9px]">门槛</span>
          <span className={seatsOk ? 'text-parchment-100 font-bold' : 'text-red-400 font-bold'}>
            {bill.minSeats}席
          </span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mt-auto">
        {!isConfirming ? (
          <>
            <button
              disabled={!canEnact}
              onClick={() => setConfirming(bill.id)}
              className="flex-1 px-2 py-1.5 rounded-md text-[11px] font-display font-bold tracking-wider transition-colors
                bg-gradient-to-r from-amber-600/80 to-gold/80 hover:from-amber-500 hover:to-gold text-ink-950
                disabled:from-ink-700/60 disabled:to-ink-800/60 disabled:text-parchment-200/30 disabled:cursor-not-allowed"
            >
              {hasEnacting
                ? '审议中'
                : !seatsOk
                ? '席位不足'
                : !capitalOk
                ? '资本不足'
                : !treasuryOk
                ? '国库不足'
                : '⚖️ 推动立法'}
            </button>
            <button
              onClick={() => onDismiss(bill.id)}
              className="px-2 py-1.5 rounded-md text-[11px] font-serif text-parchment-200/50
                hover:text-red-300 hover:bg-red-900/20 transition-colors"
            >
              ✕ 搁置
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                onEnact(bill.id)
                setConfirming(null)
              }}
              className="flex-1 px-2 py-1.5 rounded-md text-[11px] font-display font-bold tracking-wider
                bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-parchment-100"
            >
              ✓ 确认推动
            </button>
            <button
              onClick={() => setConfirming(null)}
              className="px-2 py-1.5 rounded-md text-[11px] font-serif text-parchment-200/60
                hover:text-parchment-100 bg-ink-900/40 hover:bg-ink-800/60"
            >
              取消
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}
