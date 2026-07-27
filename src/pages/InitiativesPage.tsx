import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { INITIATIVES, getInitiativeDepth } from '@/data/initiatives'
import { NATIONAL_POLICIES } from '@/data/nationalPolicies'
import { RELATION_COLORS } from '@/data/diplomacy'
import type { Initiative } from '@/types/game'
import { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react'

/** 改革页面（独立全屏）：以分层树形结构展示改革，前后链 + 政策解锁联动
 *  布局：上→下逐层加深，每层为一行（根改革在顶，深层改革在底）；
 *  同层节点横向排列，SVG 垂直贝塞尔曲线连接父改革底部与子改革顶部
 */
export default function InitiativesPage() {
  const metrics = useGameStore((s) => s.metrics)
  const treasury = useGameStore((s) => s.metrics.treasury)
  const countries = useGameStore((s) => s.countries)
  const completedInitiatives = useGameStore((s) => s.completedInitiatives)
  const activeInitiatives = useGameStore((s) => s.activeInitiatives)
  const startInitiative = useGameStore((s) => s.startInitiative)
  const [selectedCategory, setSelectedCategory] = useState<string>('全部')
  const [showConfirm, setShowConfirm] = useState<Initiative | null>(null)
  const [targetCountryId, setTargetCountryId] = useState<string | null>(null)
  const [activeCollapsed, setActiveCollapsed] = useState(false) // 进行中改革栏目收起/展开

  const categories = ['全部', '经济', '社会', '政治体制', '外交', '环境', '军事']

  // 筛选可见改革（含直接关联的父/子，避免树断线）
  const visibleInitiatives = useMemo(() => {
    if (selectedCategory === '全部') return INITIATIVES
    const inCat = INITIATIVES.filter((i) => i.category === selectedCategory)
    const ids = new Set(inCat.map((i) => i.id))
    // 加入直接前置与直接后继
    for (const ini of INITIATIVES) {
      if (ini.requiresInitiative?.some((pid) => ids.has(pid))) ids.add(ini.id)
      if (inCat.some((c) => c.requiresInitiative?.includes(ini.id))) ids.add(ini.id)
    }
    return INITIATIVES.filter((i) => ids.has(i.id))
  }, [selectedCategory])

  const canStart = (ini: Initiative) => {
    if (treasury < ini.cost) return false
    if (ini.prerequisites) {
      for (const [key, value] of Object.entries(ini.prerequisites)) {
        if (metrics[key as keyof typeof metrics] < (value ?? 0)) return false
      }
    }
    if (ini.requiresInitiative && ini.requiresInitiative.length > 0) {
      if (!ini.requiresInitiative.every((iid) => completedInitiatives.includes(iid))) return false
    }
    return true
  }

  const handleStart = (ini: Initiative) => {
    if (!canStart(ini)) return
    if (ini.requiresCountryTarget) {
      setTargetCountryId(countries[0]?.id ?? null)
    } else {
      setTargetCountryId(null)
    }
    setShowConfirm(ini)
  }

  const confirmStart = () => {
    if (showConfirm) {
      if (showConfirm.requiresCountryTarget && !targetCountryId) return
      startInitiative(showConfirm.id, targetCountryId ?? undefined)
      setShowConfirm(null)
      setTargetCountryId(null)
    }
  }

  // 改革状态映射：是否已完成、前置链是否满足、是否进行中（含进度）
  const iniStates = useMemo(() => {
    const map = new Map<
      string,
      { completed: boolean; chainMet: boolean; available: boolean; active: boolean; progress: number }
    >()
    for (const ini of INITIATIVES) {
      const completed = completedInitiatives.includes(ini.id)
      const chainMet =
        !ini.requiresInitiative || ini.requiresInitiative.length === 0
          ? true
          : ini.requiresInitiative.every((iid) => completedInitiatives.includes(iid))
      const activeAi = activeInitiatives.find((ai) => ai.initiativeId === ini.id)
      const active = !!activeAi && !completed
      const progress = activeAi ? (activeAi.elapsed / activeAi.duration) * 100 : 0
      const available = canStart(ini) && !completed && !active
      map.set(ini.id, { completed, chainMet, available, active, progress })
    }
    return map
  }, [completedInitiatives, activeInitiatives, metrics, treasury])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          改 革 树
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        <span className="font-mono text-[10px] text-parchment-200/40">
          改革有前后链，完成可解锁政策
        </span>
      </div>

      {/* 进行中改革（可收起/展开） */}
      {activeInitiatives.length > 0 && (
        <div className="doc-card mb-4 overflow-hidden">
          <button
            onClick={() => setActiveCollapsed((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-ink-800/40"
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs transition-transform ${activeCollapsed ? '' : 'rotate-90'}`}>▶</span>
              <span className="font-serif text-sm font-semibold text-parchment-200">
                进行中改革
              </span>
              <span className="font-mono text-[10px] text-gold/70">
                {activeInitiatives.length}
              </span>
            </div>
            <span className="font-mono text-[9px] text-parchment-200/40">
              {activeCollapsed ? '点击展开' : '点击收起'}
            </span>
          </button>
          <AnimatePresence>
            {!activeCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-3"
              >
                <div className="space-y-2">
                  {activeInitiatives.map((ai) => {
                    const progress = (ai.elapsed / ai.duration) * 100
                    const targetCountry = ai.targetCountryId
                      ? countries.find((c) => c.id === ai.targetCountryId)
                      : undefined
                    return (
                      <div key={ai.initiativeId}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-serif text-xs text-parchment-200 flex items-center gap-1.5">
                            {ai.name}
                            {targetCountry && (
                              <span className="font-mono text-[9px] text-amber-300/80">
                                {targetCountry.flag} {targetCountry.name}
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[10px] text-parchment-200/60">
                            {ai.elapsed}/{ai.duration}月
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/50">
                          <motion.div
                            className="h-full rounded-full bg-gold"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 已完成改革计数 + 国库信息 */}
      <div className="doc-card p-3 mb-4 flex items-center gap-4 flex-wrap">
        <span className="font-serif text-xs text-parchment-200/60">国库余额:</span>
        <span className="font-mono text-sm font-bold text-gold">{treasury}</span>
        <span className="font-serif text-xs text-parchment-200/40">|</span>
        <span className="font-serif text-xs text-parchment-200/60">已完成改革:</span>
        <span className="font-mono text-sm font-bold text-emerald-400">{completedInitiatives.length}</span>
        <span className="font-serif text-xs text-parchment-200/40">|</span>
        <span className="font-serif text-xs text-parchment-200/60">可用改革:</span>
        <span className="font-mono text-sm font-bold text-parchment-200">{INITIATIVES.length}</span>
      </div>

      {/* 分类筛选 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 font-serif text-xs rounded transition-all border whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-gold text-ink-900 border-gold font-bold shadow-lg'
                : 'bg-ink-700 text-parchment-100 border-gold/40 hover:bg-ink-600 hover:border-gold hover:text-gold'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 改革树画布（与任务树相同的列布局 + SVG 连线） */}
      <div className="flex-1 overflow-auto min-h-0 pb-4">
        <InitiativeTreeCanvas
          initiatives={visibleInitiatives}
          iniStates={iniStates}
          completedIds={completedInitiatives}
          metrics={metrics}
          treasury={treasury}
          onStart={handleStart}
          canStart={canStart}
        />
      </div>

      {/* 确认对话框 */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setShowConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-lg font-bold text-parchment-100 mb-3">
                确认启动改革
              </h3>
              <p className="font-serif text-sm text-parchment-200 mb-4">
                您即将启动「<span className="font-semibold text-gold">{showConfirm.name}</span>」改革。
              </p>
              <div className="space-y-2 text-xs text-parchment-200/70 mb-4">
                <div>
                  国库消耗: <span className="font-mono font-semibold text-red-400">-{showConfirm.cost}</span>
                </div>
                <div>
                  持续时间: <span className="font-mono font-semibold text-parchment-200">{showConfirm.duration}个月</span>
                </div>
                {showConfirm.radical && (
                  <div className="text-red-400 font-semibold">
                    ⚠ 警告: 这是一项激进改革，可能带来重大变化。
                  </div>
                )}
              </div>

              {/* 外交类改革：目标国选择器 */}
              {showConfirm.requiresCountryTarget && (
                <div className="mb-4 rounded border border-amber-400/30 bg-amber-50/5 p-3">
                  <div className="mb-2 font-serif text-xs font-bold text-amber-300">
                    🎯 选择目标国家
                  </div>
                  <div className="mb-2 font-mono text-[10px] text-parchment-200/50">
                    完成时将对该国关系额外加成（外交效果 ×1.5）
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {countries.map((c) => {
                      const selected = targetCountryId === c.id
                      return (
                        <button
                          key={c.id}
                          onClick={() => setTargetCountryId(c.id)}
                          className={`flex items-center gap-2 rounded border px-2 py-1.5 text-left transition-colors ${
                            selected
                              ? 'border-amber-500 bg-amber-500/20'
                              : 'border-parchment-200/20 hover:border-amber-400/50 hover:bg-amber-50/10'
                          }`}
                        >
                          <span className="text-base">{c.flag}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-serif text-[11px] font-semibold text-parchment-100 truncate">
                              {c.name}
                            </div>
                            <div className="flex items-center gap-1">
                              <span
                                className="font-mono text-[9px]"
                                style={{ color: RELATION_COLORS[c.relationLevel] }}
                              >
                                {c.relationLevel}
                              </span>
                              <span className="font-mono text-[9px] text-parchment-200/40">
                                · {c.relation}
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={confirmStart}
                  disabled={showConfirm.requiresCountryTarget && !targetCountryId}
                  className="flex-1 px-4 py-2 bg-gold text-ink-900 font-serif text-sm rounded hover:bg-gold/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  确认启动
                </button>
                <button
                  onClick={() => {
                    setShowConfirm(null)
                    setTargetCountryId(null)
                  }}
                  className="flex-1 px-4 py-2 bg-ink-900/50 text-parchment-200 font-serif text-sm rounded hover:bg-ink-900/70 transition-colors"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** 改革树画布：上→下分层行布局 + SVG 垂直连线 */
function InitiativeTreeCanvas({
  initiatives,
  iniStates,
  completedIds,
  metrics,
  treasury,
  onStart,
  canStart,
}: {
  initiatives: Initiative[]
  iniStates: Map<
    string,
    { completed: boolean; chainMet: boolean; available: boolean; active: boolean; progress: number }
  >
  completedIds: string[]
  metrics: import('@/types/game').Metrics
  treasury: number
  onStart: (ini: Initiative) => void
  canStart: (ini: Initiative) => boolean
}) {
  // 计算每个层级的改革
  const levels = useMemo(() => buildInitiativeLevels(initiatives), [initiatives])

  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [paths, setPaths] = useState<{
    d: string
    completed: boolean
    active: boolean
  }[]>([])

  const updatePaths = () => {
    if (!containerRef.current) return
    const cRect = containerRef.current.getBoundingClientRect()
    const newPaths: { d: string; completed: boolean; active: boolean }[] = []

    for (const ini of initiatives) {
      if (!ini.requiresInitiative) continue
      const childEl = cardRefs.current.get(ini.id)
      if (!childEl) continue
      const childRect = childEl.getBoundingClientRect()
      // 子节点顶部中心
      const cx = childRect.left + childRect.width / 2 - cRect.left
      const cy2 = childRect.top - cRect.top

      for (const parentId of ini.requiresInitiative) {
        const parentEl = cardRefs.current.get(parentId)
        if (!parentEl) continue
        const parentRect = parentEl.getBoundingClientRect()
        // 父节点底部中心
        const px = parentRect.left + parentRect.width / 2 - cRect.left
        const py1 = parentRect.bottom - cRect.top
        // 垂直贝塞尔曲线：从父底部 → 子顶部（控制点位于垂直中点）
        const my = (py1 + cy2) / 2
        const d = `M ${px} ${py1} C ${px} ${my}, ${cx} ${my}, ${cx} ${cy2}`
        const parentDone = completedIds.includes(parentId)
        const childActive = iniStates.get(ini.id)?.available ?? false
        newPaths.push({
          d,
          completed: parentDone,
          active: !!childActive,
        })
      }
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
  }, [initiatives, completedIds.length])

  useEffect(() => {
    const id = requestAnimationFrame(updatePaths)
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedIds])

  return (
    <div ref={containerRef} className="relative min-w-full p-4 pb-8 inline-block">
      {/* SVG 连线层：覆盖整个画布，垂直曲线连接父子 */}
      <svg
        className="pointer-events-none absolute inset-0"
        style={{ width: '100%', height: '100%', minWidth: '100%', minHeight: '100%' }}
      >
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            stroke={
              p.completed
                ? 'rgba(245, 158, 11, 0.85)'
                : p.active
                  ? 'rgba(245, 158, 11, 0.5)'
                  : 'rgba(245, 158, 11, 0.2)'
            }
            strokeWidth={p.completed ? 2.2 : 1.4}
            strokeDasharray={p.completed ? '0' : '5 4'}
            fill="none"
            strokeLinecap="round"
          />
        ))}
        {/* 节点端点圆 */}
        {paths.map((p, i) => {
          const m = p.d.match(/^M (\S+) (\S+)/)
          const matchEnd = p.d.match(/(\S+) (\S+)$/)
          if (!m || !matchEnd) return null
          const x1 = parseFloat(m[1])
          const y1 = parseFloat(m[2])
          const x2 = parseFloat(matchEnd[1])
          const y2 = parseFloat(matchEnd[2])
          return (
            <g key={`pt_${i}`}>
              <circle
                cx={x1}
                cy={y1}
                r={3}
                fill={p.completed ? 'rgba(245, 158, 11, 0.9)' : 'rgba(245, 158, 11, 0.35)'}
              />
              <circle
                cx={x2}
                cy={y2}
                r={3}
                fill={p.completed ? 'rgba(245, 158, 11, 0.9)' : 'rgba(245, 158, 11, 0.35)'}
              />
            </g>
          )
        })}
      </svg>

      {/* 行布局：每层为一行，从上到下逐层加深 */}
      <div className="relative flex flex-col gap-12">
        {levels.map((level, levelIdx) => (
          <div key={levelIdx} className="flex items-start gap-4">
            {/* 层级标签（左侧锚点） */}
            <div className="sticky left-2 top-2 z-10 shrink-0 w-[72px] flex flex-col items-center gap-1 rounded-md border border-gold/20 bg-ink-900/80 backdrop-blur px-1.5 py-2">
              <span className="font-mono text-[10px] tracking-widest text-gold/80">
                L{levelIdx}
              </span>
              <span className="font-display text-[10px] font-semibold tracking-[0.15em] text-gold/70 text-center leading-tight">
                {levelIdx === 0 ? '根改革' : `第 ${levelIdx} 阶`}
              </span>
            </div>
            {/* 该层卡片横向排列 */}
            <div className="flex gap-3 items-start">
              {level.map((ini, iniIdx) => {
                const st = iniStates.get(ini.id)
                const isDone = st?.completed ?? false
                const chainMet = st?.chainMet ?? true
                const available = st?.available ?? false
                const isActive = st?.active ?? false
                const progress = st?.progress ?? 0
                return (
                  <motion.div
                    key={ini.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(ini.id, el)
                    }}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: levelIdx * 0.08 + iniIdx * 0.04 }}
                    className="w-[260px] shrink-0"
                  >
                    <InitiativeCard
                      ini={ini}
                      completed={isDone}
                      chainMet={chainMet}
                      available={available}
                      active={isActive}
                      progress={progress}
                      metrics={metrics}
                      completedIds={completedIds}
                      onStart={onStart}
                    />
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 改革卡片：依据状态（已完成/进行中/可用/锁定/不可用）切换视觉样式 */
function InitiativeCard({
  ini,
  completed,
  chainMet,
  available,
  active,
  progress,
  metrics,
  completedIds,
  onStart,
}: {
  ini: Initiative
  completed: boolean
  chainMet: boolean
  available: boolean
  active: boolean
  progress: number
  metrics: import('@/types/game').Metrics
  completedIds: string[]
  onStart: (ini: Initiative) => void
}) {
  const unlockedPolicies = (ini.unlocksPolicies ?? [])
    .map((pid) => NATIONAL_POLICIES.find((p) => p.id === pid))
    .filter(Boolean)

  // 分类图标映射
  const categoryIcon: Record<string, string> = {
    '经济': '💰',
    '社会': '🏛️',
    '政治体制': '⚖️',
    '外交': '🤝',
    '环境': '🌿',
    '军事': '🛡️',
  }
  const icon = categoryIcon[ini.category] ?? '📜'

  return (
    <div
      className={`doc-card p-3 transition-all relative ${
        ini.radical ? 'critical' : ''
      } ${
        completed
          ? 'border-gold/80 bg-gold/5 shadow-lg shadow-gold/20'
          : active
          ? 'border-amber-400/60 bg-amber-900/10'
          : !chainMet
          ? 'opacity-50 border-parchment-200/10 bg-ink-900/40'
          : available
          ? 'hover:border-gold/40 hover:bg-ink-800/80'
          : 'opacity-70'
      }`}
    >
      {/* 标题行：图标 + 名称 + 状态标记 */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span className="text-base leading-none">{icon}</span>
        <span className="font-serif text-sm font-semibold text-parchment-100 flex-1 min-w-0">
          {ini.name}
        </span>
        {completed && <span className="text-gold text-xs">✓</span>}
        {!chainMet && !completed && !active && (
          <span className="text-parchment-200/40 text-xs" title="前置改革未完成">🔒</span>
        )}
        {ini.radical && (
          <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded">
            激进
          </span>
        )}
      </div>

      {/* 分类标签 */}
      <div className="mb-2">
        <span className="px-1.5 py-0.5 bg-ink-900/50 text-parchment-200/50 text-[9px] rounded">
          {ini.category}
        </span>
      </div>

      {/* 描述 */}
      <p className="font-serif text-[11px] text-parchment-200/70 mb-2 leading-relaxed line-clamp-3">
        {ini.description}
      </p>

      {/* 进行中进度条 */}
      {active && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[9px] text-amber-300/80">进行中</span>
            <span className="font-mono text-[9px] text-amber-300/80">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/50">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-gold"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* 资源消耗 */}
      <div className="flex flex-wrap gap-2 text-[10px] mb-2">
        <span className="text-parchment-200/60">
          耗时: <span className="font-mono font-semibold text-parchment-200">{ini.duration}月</span>
        </span>
        <span className="text-parchment-200/60">
          国库: <span className={`font-mono font-semibold ${metrics.treasury >= ini.cost ? 'text-red-400' : 'text-red-600'}`}>-{ini.cost}</span>
        </span>
        {ini.politicalCapitalCost && (
          <span className="text-parchment-200/60">
            政治资本: <span className="font-mono font-semibold text-purple-300">-{ini.politicalCapitalCost}</span>
          </span>
        )}
        {ini.once && (
          <span className="text-parchment-200/60">仅限一次</span>
        )}
      </div>

      {/* 前置改革链 */}
      {ini.requiresInitiative && ini.requiresInitiative.length > 0 && (
        <div className="mb-2 text-[10px]">
          <span className="text-parchment-200/60">前置: </span>
          {ini.requiresInitiative.map((iid) => {
            const parent = INITIATIVES.find((i) => i.id === iid)
            const done = completedIds.includes(iid)
            return (
              <span
                key={iid}
                className={`font-mono ml-1 ${done ? 'text-green-400' : 'text-red-400'}`}
              >
                {parent?.name ?? iid} {done ? '✓' : '✗'}
              </span>
            )
          })}
        </div>
      )}

      {/* 解锁政策提示 */}
      {unlockedPolicies.length > 0 && (
        <div className="mb-2 rounded border border-emerald-500/20 bg-emerald-900/10 p-1.5">
          <div className="font-mono text-[9px] text-emerald-300/80">
            🔓 解锁政策：
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {unlockedPolicies.map((p) => (
              <span
                key={p!.id}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold bg-emerald-500/15 text-emerald-300"
              >
                {p!.category}·{p!.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 前提条件 */}
      {ini.prerequisites && (
        <div className="mb-2 text-[10px] text-parchment-200/60">
          条件:{' '}
          {Object.entries(ini.prerequisites).map(([key, value]) => {
            const current = metrics[key as keyof typeof metrics]
            const met = current >= (value ?? 0)
            const labelMap: Record<string, string> = {
              economy: '经济', treasury: '国库', stability: '稳定',
              diplomacy: '外交', prestige: '声望', approval: '民意',
            }
            return (
              <span
                key={key}
                className={`font-mono ${met ? 'text-green-400' : 'text-red-400'}`}
              >
                {labelMap[key] ?? key}≥{value}
              </span>
            )
          })}
        </div>
      )}

      {/* 启动按钮 */}
      <button
        onClick={() => onStart(ini)}
        disabled={!available}
        className={`w-full px-3 py-1.5 font-serif text-xs rounded transition-colors ${
          completed
            ? 'bg-gold/20 text-gold/80 cursor-default border border-gold/40'
            : active
            ? 'bg-amber-900/30 text-amber-300/70 cursor-default'
            : available
            ? 'bg-gold text-ink-900 hover:bg-gold/80'
            : 'bg-ink-900/50 text-parchment-200/30 cursor-not-allowed'
        }`}
      >
        {completed ? '已完成' : active ? '进行中…' : !chainMet ? '🔒 锁定' : '启动'}
      </button>
    </div>
  )
}

/** 计算改革层级：根改革=0，依赖根改革的改革=1，依此类推 */
function buildInitiativeLevels(initiatives: Initiative[]): Initiative[][] {
  const iniMap = new Map(initiatives.map((i) => [i.id, i]))
  const depthMemo = new Map<string, number>()

  const getDepth = (id: string, visiting: Set<string>): number => {
    if (depthMemo.has(id)) return depthMemo.get(id)!
    const ini = iniMap.get(id)
    if (!ini) return 0
    if (!ini.requiresInitiative || ini.requiresInitiative.length === 0) {
      depthMemo.set(id, 0)
      return 0
    }
    if (visiting.has(id)) return 0 // 防止循环
    visiting.add(id)
    const parentDepths = ini.requiresInitiative.map((pid) => getDepth(pid, visiting))
    const depth = Math.max(...parentDepths) + 1
    depthMemo.set(id, depth)
    return depth
  }

  const levelMap = new Map<number, Initiative[]>()
  for (const ini of initiatives) {
    const depth = getDepth(ini.id, new Set())
    if (!levelMap.has(depth)) levelMap.set(depth, [])
    levelMap.get(depth)!.push(ini)
  }

  const levels: Initiative[][] = []
  const maxDepth = Math.max(...Array.from(levelMap.keys()), 0)
  for (let i = 0; i <= maxDepth; i++) {
    levels.push(levelMap.get(i) ?? [])
  }
  return levels
}
