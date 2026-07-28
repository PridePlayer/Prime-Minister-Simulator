import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import {
  NATIONAL_POLICIES,
  POLICY_CATEGORIES,
  getPoliciesByCategory,
  getDefaultPolicy,
  getPolicyDepth,
} from '@/data/nationalPolicies'
import { getInitiativesUnlockingPolicy } from '@/data/initiatives'
import MetricEffectBadge from '@/components/MetricEffectBadge'
import type { NationalPolicy } from '@/types/game'

/** 国家政策树页面：以"主干—分支"的树形结构展示每类政策
 *  根节点为默认政策，分支为可切换的替代政策；SVG 曲线连接根与分支
 */
export default function PoliciesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>(POLICY_CATEGORIES[0])
  const activePolicies = useGameStore((s) => s.activePolicies)
  const clearAlerts = useGameStore((s) => s.clearAlerts)

  // 进入政策页时清除 policy 红点提醒（已查看新解锁的政策）
  useEffect(() => {
    clearAlerts('policy')
  }, [clearAlerts])

  return (
    <div className="flex flex-col h-full">
      {/* 顶部标题 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          国 家 政 策 树
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        <span className="font-mono text-[10px] text-parchment-200/40">
          快捷键 P 呼出
        </span>
      </div>

      {/* 类别标签 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {POLICY_CATEGORIES.map((cat) => {
          const def = getDefaultPolicy(cat)
          const active = selectedCategory === cat
          // 当前类别下的生效政策
          const curId = activePolicies
            .map((pid) => NATIONAL_POLICIES.find((np) => np.id === pid))
            .find((p) => p?.category === cat)?.id
          const isDefault = curId === def.id
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-serif text-xs font-semibold transition-all ${
                active
                  ? 'bg-gold text-ink-900 shadow-md'
                  : 'bg-ink-800/60 text-parchment-200/60 hover:bg-ink-700/60'
              }`}
            >
              <span>{getCategoryIcon(cat)}</span>
              <span>{cat}</span>
              {curId && !isDefault && (
                <span className="rounded-full bg-amber-500/40 px-1 font-mono text-[9px] text-white">
                  已改
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 政策树画布 */}
      <div className="flex-1 overflow-auto">
        <PolicyTree category={selectedCategory} key={selectedCategory} />
      </div>
    </div>
  )
}

/** 单类政策的树形展示：按深度分层，父子用 SVG 曲线连接 */
function PolicyTree({ category }: { category: string }) {
  const activePolicies = useGameStore((s) => s.activePolicies)
  const policies = getPoliciesByCategory(category)

  // 当前生效政策 id
  const currentPolicyId = activePolicies.find((pid) => {
    const p = NATIONAL_POLICIES.find((np) => np.id === pid)
    return p?.category === category
  })

  // 按深度分列：tier 0 = root, tier 1, tier 2 ...
  const maxDepth = Math.max(0, ...policies.map((p) => getPolicyDepth(p)))
  const tiers: NationalPolicy[][] = []
  for (let d = 0; d <= maxDepth; d++) {
    tiers.push(policies.filter((p) => getPolicyDepth(p) === d))
  }

  // SVG 连线计算：每个非根节点连到其父节点
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [paths, setPaths] = useState<{ d: string; active: boolean }[]>([])

  const updatePaths = () => {
    if (!containerRef.current) return
    const cRect = containerRef.current.getBoundingClientRect()
    const newPaths: { d: string; active: boolean }[] = []
    for (const p of policies) {
      if (!p.requiresPolicy || p.requiresPolicy.length === 0) continue
      const parentId = p.requiresPolicy[0]
      const parentEl = nodeRefs.current.get(parentId)
      const childEl = nodeRefs.current.get(p.id)
      if (!parentEl || !childEl) continue
      const pr = parentEl.getBoundingClientRect()
      const cr = childEl.getBoundingClientRect()
      const x1 = pr.right - cRect.left
      const y1 = pr.top + pr.height / 2 - cRect.top
      const x2 = cr.left - cRect.left
      const y2 = cr.top + cr.height / 2 - cRect.top
      const cx = (x1 + x2) / 2
      newPaths.push({
        d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`,
        active: p.id === currentPolicyId,
      })
    }
    setPaths(newPaths)
  }

  useLayoutEffect(() => {
    const id = requestAnimationFrame(updatePaths)
    const ro = new ResizeObserver(updatePaths)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', updatePaths)
    return () => {
      cancelAnimationFrame(id)
      ro.disconnect()
      window.removeEventListener('resize', updatePaths)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policies.length, currentPolicyId])

  useEffect(() => {
    const id = requestAnimationFrame(updatePaths)
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPolicyId])

  return (
    <div ref={containerRef} className="relative min-h-full p-4 pb-8">
      {/* SVG 连线层 */}
      <svg
        className="pointer-events-none absolute inset-0"
        style={{ width: '100%', height: '100%' }}
      >
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            stroke={p.active ? 'rgba(245, 158, 11, 0.85)' : 'rgba(245, 158, 11, 0.25)'}
            strokeWidth={p.active ? 2.2 : 1.4}
            strokeDasharray={p.active ? '0' : '5 4'}
            fill="none"
            strokeLinecap="round"
          />
        ))}
        {paths.map((p, i) => {
          const match = p.d.match(/^M (\S+) (\S+)/)
          if (!match) return null
          return (
            <circle
              key={`d_${i}`}
              cx={parseFloat(match[1])}
              cy={parseFloat(match[2])}
              r={3}
              fill={p.active ? 'rgba(245, 158, 11, 0.9)' : 'rgba(245, 158, 11, 0.35)'}
            />
          )
        })}
      </svg>

      {/* 树主体：按深度分列 */}
      <div className="relative flex gap-8 items-start overflow-x-auto pb-4">
        {tiers.map((tierPolicies, depth) => (
          <div key={depth} className="flex flex-col gap-3 shrink-0 relative">
            {/* 列标题 */}
            <div className="mb-1 flex items-center gap-2 sticky top-0">
              <span className="font-mono text-[9px] tracking-widest text-parchment-200/40">
                {depth === 0 ? 'ROOT' : `TIER ${depth}`}
              </span>
              <span className="font-display text-xs font-semibold tracking-[0.2em] text-gold/80">
                {depth === 0 ? `${category} · 主干` : `第 ${depth} 层分支`}
              </span>
              {depth > 0 && <div className="h-px w-8 bg-gradient-to-r from-gold/30 to-transparent" />}
            </div>

            {tierPolicies.map((p, i) => (
              <motion.div
                key={p.id}
                ref={(el) => {
                  if (el) nodeRefs.current.set(p.id, el)
                }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="w-[300px]"
              >
                <PolicyCard
                  policy={p}
                  isActive={p.id === currentPolicyId}
                  isRoot={depth === 0}
                  parentName={
                    p.requiresPolicy?.[0]
                      ? NATIONAL_POLICIES.find((np) => np.id === p.requiresPolicy![0])?.name
                      : undefined
                  }
                />
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** 单个政策卡片 */
function PolicyCard({
  policy,
  isActive,
  isRoot,
  parentName,
}: {
  policy: NationalPolicy
  isActive: boolean
  isRoot?: boolean
  parentName?: string
}) {
  const metrics = useGameStore((s) => s.metrics)
  const pmStats = useGameStore((s) => s.pmStats)
  const adoptedPolicies = useGameStore((s) => s.adoptedPolicies)
  const completedInitiatives = useGameStore((s) => s.completedInitiatives)
  const switchPolicy = useGameStore((s) => s.switchPolicy)
  const [confirming, setConfirming] = useState(false)

  const prereqMet = !policy.prerequisites
    ? true
    : Object.entries(policy.prerequisites).every(([key, value]) => {
        return (metrics[key as keyof typeof metrics] ?? 0) >= (value ?? 0)
      })

  // 政策树前后链：前置政策必须曾启用过
  const policyChainMet =
    !policy.requiresPolicy || policy.requiresPolicy.length === 0
      ? true
      : policy.requiresPolicy.every((pid) => adoptedPolicies.includes(pid))

  // 改革↔政策树联动：被改革锁定的政策需对应改革已完成
  const unlockInitiatives = policy.unlockedByInitiative
    ? getInitiativesUnlockingPolicy(policy.id)
    : []
  const reformUnlocked =
    !policy.unlockedByInitiative || policy.unlockedByInitiative.length === 0
      ? true
      : policy.unlockedByInitiative.some((iid) => completedInitiatives.includes(iid))

  const cost = policy.switchCost
  const treasuryEnough = !cost.treasury || metrics.treasury >= cost.treasury
  const pcEnough = !cost.politicalCapital || pmStats.politicalCapital >= cost.politicalCapital
  const canSwitch =
    !isActive && prereqMet && policyChainMet && reformUnlocked && treasuryEnough && pcEnough

  const handleSwitch = () => {
    if (!canSwitch) return
    if (!confirming) {
      setConfirming(true)
      return
    }
    switchPolicy(policy.id)
    setConfirming(false)
  }

  // 锁定原因
  const lockReason = !reformUnlocked
    ? `需先完成改革：${unlockInitiatives.map((i) => i.name).join(' / ')}`
    : !policyChainMet
      ? `需先启用前置政策：${parentName ?? '未知'}`
      : !prereqMet
        ? '指标前置条件未满足'
        : !treasuryEnough
          ? '国库不足'
          : !pcEnough
            ? '政治资本不足'
            : null

  return (
    <motion.div
      layout
      className={`doc-card relative overflow-hidden p-3 transition-all ${
        isActive
          ? 'border-gold/60 bg-gradient-to-br from-gold/10 to-transparent shadow-seal'
          : isRoot
            ? 'border-gold/30 bg-gradient-to-br from-ink-700/40 to-transparent'
            : !reformUnlocked || !policyChainMet
              ? 'opacity-50 border-red-500/20'
              : !prereqMet
                ? 'opacity-70'
                : ''
      }`}
    >
      {/* 顶部状态 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold bg-ink-900/60 text-parchment-200/60">
            {getCategoryIcon(policy.category)} {policy.category}
          </span>
          {policy.isDefault && (
            <span className="rounded-full bg-parchment-200/10 px-1.5 py-0.5 font-mono text-[9px] text-parchment-200/40">
              默认
            </span>
          )}
          {isRoot && (
            <span className="rounded-full bg-gold/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-gold">
              ◆ 主干
            </span>
          )}
          {!reformUnlocked && (
            <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red-300">
              🔒 改革锁定
            </span>
          )}
        </div>
        {isActive ? (
          <span className="rounded-full bg-gold/20 px-2 py-0.5 font-mono text-[9px] font-bold text-gold">
            ● 生效中
          </span>
        ) : (
          <span className="rounded-full bg-parchment-200/10 px-2 py-0.5 font-mono text-[9px] text-parchment-200/40">
            未启用
          </span>
        )}
      </div>

      {/* 政策名与说明 */}
      <h3 className="font-display text-base font-semibold text-parchment-100 mb-1">
        {policy.name}
      </h3>
      <p className="font-serif text-[12px] text-parchment-200/70 mb-2 leading-relaxed">
        {policy.description}
      </p>

      {/* 前置政策链 */}
      {parentName && (
        <div className="mb-2">
          <div className="font-mono text-[9px] text-parchment-200/40 mb-1">前置政策</div>
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
              policyChainMet
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-red-500/15 text-red-300'
            }`}
          >
            ↳ {parentName}
            {policyChainMet ? ' ✓' : ' ✗'}
          </span>
        </div>
      )}

      {/* 改革解锁提示 */}
      {!reformUnlocked && unlockInitiatives.length > 0 && (
        <div className="mb-2 rounded border border-red-500/20 bg-red-900/10 p-1.5">
          <div className="font-mono text-[9px] text-red-300/80">
            🔒 需完成改革解锁：
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {unlockInitiatives.map((ini) => {
              const done = completedInitiatives.includes(ini.id)
              return (
                <span
                  key={ini.id}
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    done ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
                  }`}
                >
                  {ini.name} {done ? '✓' : '✗'}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* 每月效果 */}
      <div className="mb-2">
        <div className="font-mono text-[9px] text-parchment-200/40 mb-1">每月效果</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(policy.perTurnEffects).map(([key, val]) => (
            <MetricEffectBadge
              key={key}
              metricKey={key}
              value={val ?? 0}
              variant="dark"
            />
          ))}
        </div>
      </div>

      {/* 前置条件 */}
      {policy.prerequisites && (
        <div className="mb-2">
          <div className="font-mono text-[9px] text-parchment-200/40 mb-1">前置条件</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(policy.prerequisites).map(([key, val]) => {
              const labels: Record<string, string> = {
                approval: '民意', treasury: '国库', economy: '经济',
                stability: '稳定', diplomacy: '外交', prestige: '声望',
              }
              const current = metrics[key as keyof typeof metrics] ?? 0
              const met = current >= (val ?? 0)
              return (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    met
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-red-500/15 text-red-300'
                  }`}
                >
                  {labels[key] ?? key} ≥ {val}
                  <span className="opacity-60">({current})</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* 切换代价 */}
      {!isActive && (
        <div className="mb-2">
          <div className="font-mono text-[9px] text-parchment-200/40 mb-1">切换代价（一次性）</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {cost.treasury ? (
              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                treasuryEnough ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300'
              }`}>
                💰 国库 -{cost.treasury}
                <span className="opacity-60">(剩 {metrics.treasury})</span>
              </span>
            ) : null}
            {cost.politicalCapital ? (
              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                pcEnough ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300'
              }`}>
                💼 政治资本 -{cost.politicalCapital}
                <span className="opacity-60">(剩 {pmStats.politicalCapital})</span>
              </span>
            ) : null}
            {cost.stability ? (
              <MetricEffectBadge metricKey="stability" value={cost.stability} variant="dark" />
            ) : null}
            {cost.approval ? (
              <MetricEffectBadge metricKey="approval" value={cost.approval} variant="dark" />
            ) : null}
            {Object.keys(cost).length === 0 && (
              <span className="font-mono text-[10px] text-emerald-300">无代价（默认政策）</span>
            )}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {!isActive && (
        <AnimatePresence mode="wait">
          {confirming ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 pt-2 border-t border-gold/10"
            >
              <span className="font-serif text-[11px] text-amber-300 flex-1">
                确认切换？代价将立即扣除
              </span>
              <button
                onClick={handleSwitch}
                disabled={!canSwitch}
                className="rounded bg-gold px-3 py-1 font-serif text-[11px] font-bold text-ink-900 hover:bg-gold/80 disabled:opacity-40"
              >
                确认切换
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded bg-ink-700 px-3 py-1 font-serif text-[11px] text-parchment-200 hover:bg-ink-600"
              >
                取消
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="action"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-2 border-t border-gold/10"
            >
              <button
                onClick={handleSwitch}
                disabled={!canSwitch}
                className={`w-full rounded px-3 py-1.5 font-serif text-xs font-bold transition-all ${
                  canSwitch
                    ? 'bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25'
                    : 'bg-ink-900/40 text-parchment-200/30 border border-parchment-200/10 cursor-not-allowed'
                }`}
              >
                {lockReason ? `🔒 ${lockReason}` : '✋ 切换到该政策'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
}

/** 类别图标 */
function getCategoryIcon(category: string): string {
  const map: Record<string, string> = {
    '经济': '📈',
    '社会': '👥',
    '外交': '🤝',
    '军事': '⚔️',
    '环境': '🌱',
    '政治': '🏛️',
  }
  return map[category] ?? '📋'
}
