import { useMemo, useState, useRef, useLayoutEffect, useEffect } from 'react'
import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import {
  TASK_TREE,
  TASK_CATEGORY_META,
  isTaskCompleted,
  isTaskUnlocked,
} from '@/data/taskTree'
import MetricEffectBadge from '@/components/MetricEffectBadge'
import type { TaskNode } from '@/types/game'

/** 任务树页面：以分层树形结构展示任务依赖关系
 *  左→右逐层加深，每层为一列；SVG 曲线连接父任务与子任务
 */
export default function TaskTreePage() {
  const metrics = useGameStore((s) => s.metrics)
  const term = useGameStore((s) => s.term)
  const turn = useGameStore((s) => s.turn)
  const achievements = useGameStore((s) => s.achievements)
  // 从 store 读取已持久化的完成任务（gameStore 会在 advanceOneDay 末尾更新此列表）
  const persistedCompletedIds = useGameStore((s) => s.completedTaskIds)
  const clearAlerts = useGameStore((s) => s.clearAlerts)
  const [filterCategory, setFilterCategory] = useState<string>('全部')

  // 进入任务页时清除 task 红点提醒
  useEffect(() => {
    clearAlerts('task')
  }, [clearAlerts])

  // 实时计算每个任务的完成状态：
  //  - 已持久化完成（store.completedTaskIds）：直接标记为已完成
  //  - 未持久化但当前满足条件：标记为已完成（视觉一致），但奖励未发放（会在下次 advanceOneDay 时落地）
  const taskStates = useMemo(() => {
    const persistedSet = new Set(persistedCompletedIds)
    const completedIds: string[] = [...persistedCompletedIds]
    const map = new Map<string, { completed: boolean; unlocked: boolean; progress: number }>()
    for (const task of TASK_TREE) {
      if (!persistedSet.has(task.id) && isTaskCompleted(task, { metrics, term, turn })) {
        completedIds.push(task.id)
      }
    }
    for (const task of TASK_TREE) {
      const completed = completedIds.includes(task.id)
      const unlocked = isTaskUnlocked(task, completedIds)
      const reqEntries = Object.entries(task.requirements)
      const satisfied = reqEntries.filter(([key, value]) => {
        if (key === 'term') return term >= (value ?? 0)
        if (key === 'turn') return turn >= (value ?? 0)
        return (metrics[key as keyof typeof metrics] ?? 0) >= (value ?? 0)
      }).length
      const progress = reqEntries.length > 0 ? satisfied / reqEntries.length : 0
      map.set(task.id, { completed, unlocked, progress })
    }
    return { map, completedIds }
  }, [metrics, term, turn, persistedCompletedIds])

  // 筛选：返回应当显示的任务（含直接关联的父/子任务，避免树断线）
  const visibleTasks = useMemo(() => {
    if (filterCategory === '全部') return TASK_TREE
    const inCat = TASK_TREE.filter((t) => t.category === filterCategory)
    const ids = new Set(inCat.map((t) => t.id))
    // 加入直接前置与直接后继
    for (const t of TASK_TREE) {
      if (t.prerequisiteTasks?.some((pid) => ids.has(pid))) ids.add(t.id)
      if (inCat.some((c) => c.prerequisiteTasks?.includes(t.id))) ids.add(t.id)
    }
    return TASK_TREE.filter((t) => ids.has(t.id))
  }, [filterCategory])

  const totalCompleted = taskStates.completedIds.length
  const totalTasks = TASK_TREE.length

  return (
    <div className="flex flex-col h-full">
      {/* 顶部标题与统计 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          任 务 树
        </span>
        <span className="font-mono text-[11px] text-parchment-200/60">
          已完成 {totalCompleted} / {totalTasks}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        <span className="font-mono text-[10px] text-parchment-200/40">
          快捷键 T 呼出
        </span>
      </div>

      {/* 类别筛选 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <CategoryChip
          label="全部"
          icon="🌟"
          active={filterCategory === '全部'}
          onClick={() => setFilterCategory('全部')}
        />
        {TASK_CATEGORY_META.map((cat) => (
          <CategoryChip
            key={cat.category}
            label={cat.label}
            icon={cat.icon}
            color={cat.color}
            active={filterCategory === cat.category}
            onClick={() => setFilterCategory(cat.category)}
          />
        ))}
      </div>

      {/* 任务树画布 */}
      <div className="flex-1 overflow-auto">
        <TaskTreeCanvas
          tasks={visibleTasks}
          taskStates={taskStates}
          achievements={achievements}
        />
      </div>
    </div>
  )
}

/** 任务树画布：分层列布局 + SVG 连线 */
function TaskTreeCanvas({
  tasks,
  taskStates,
  achievements,
}: {
  tasks: TaskNode[]
  taskStates: {
    map: Map<string, { completed: boolean; unlocked: boolean; progress: number }>
    completedIds: string[]
  }
  achievements: { id: string; name: string; unlocked: boolean }[]
}) {
  // 计算每个任务的层级深度
  const levels = useMemo(() => buildTaskLevels(tasks), [tasks])

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

    for (const task of tasks) {
      if (!task.prerequisiteTasks) continue
      const childEl = cardRefs.current.get(task.id)
      if (!childEl) continue
      const childRect = childEl.getBoundingClientRect()
      const x2 = childRect.left - cRect.left
      const cy2 = childRect.top + childRect.height / 2 - cRect.top

      for (const parentId of task.prerequisiteTasks) {
        const parentEl = cardRefs.current.get(parentId)
        if (!parentEl) continue
        const parentRect = parentEl.getBoundingClientRect()
        const x1 = parentRect.right - cRect.left
        const cy1 = parentRect.top + parentRect.height / 2 - cRect.top
        const cx = (x1 + x2) / 2
        const d = `M ${x1} ${cy1} C ${cx} ${cy1}, ${cx} ${cy2}, ${x2} ${cy2}`
        const parentDone = taskStates.completedIds.includes(parentId)
        const childActive =
          !taskStates.completedIds.includes(task.id) &&
          taskStates.map.get(task.id)?.unlocked
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
  }, [tasks, taskStates.completedIds.length])

  useEffect(() => {
    const id = requestAnimationFrame(updatePaths)
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskStates.completedIds])

  return (
    <div ref={containerRef} className="relative min-w-full p-4 pb-8 inline-block">
      {/* SVG 连线层 */}
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

      {/* 列布局 */}
      <div className="relative flex gap-10 items-stretch">
        {levels.map((level, levelIdx) => (
          <div key={levelIdx} className="flex flex-col gap-3 shrink-0">
            {/* 层级标签 */}
            <div className="mb-1 flex items-center gap-2">
              <span className="font-mono text-[9px] tracking-widest text-parchment-200/40">
                L{levelIdx}
              </span>
              <span className="font-display text-xs font-semibold tracking-[0.2em] text-gold/70">
                {getLevelLabel(levelIdx, levels.length)}
              </span>
            </div>
            {level.map((task, taskIdx) => {
              const st = taskStates.map.get(task.id)
              const isDone = st?.completed ?? false
              const isUnlocked = st?.unlocked ?? true
              const progress = st?.progress ?? 0
              return (
                <motion.div
                  key={task.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(task.id, el)
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: levelIdx * 0.1 + taskIdx * 0.05 }}
                  className="w-[260px]"
                >
                  <TaskCard
                    task={task}
                    completed={isDone}
                    unlocked={isUnlocked}
                    progress={progress}
                    completedIds={taskStates.completedIds}
                    achievements={achievements}
                  />
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/** 计算任务层级：根任务=0，依赖根任务的任务=1，依此类推 */
function buildTaskLevels(tasks: TaskNode[]): TaskNode[][] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]))
  const depthMemo = new Map<string, number>()

  const getDepth = (id: string, visiting: Set<string>): number => {
    if (depthMemo.has(id)) return depthMemo.get(id)!
    const task = taskMap.get(id)
    if (!task) return 0
    if (!task.prerequisiteTasks || task.prerequisiteTasks.length === 0) {
      depthMemo.set(id, 0)
      return 0
    }
    if (visiting.has(id)) {
      // 环路保护
      return 0
    }
    visiting.add(id)
    const parentDepths = task.prerequisiteTasks
      .map((pid) => getDepth(pid, visiting))
      .filter((d) => d >= 0)
    const depth = parentDepths.length > 0 ? 1 + Math.max(...parentDepths) : 0
    depthMemo.set(id, depth)
    visiting.delete(id)
    return depth
  }

  for (const t of tasks) getDepth(t.id, new Set())

  const maxDepth = tasks.reduce((max, t) => Math.max(max, depthMemo.get(t.id) ?? 0), 0)
  const levels: TaskNode[][] = Array.from({ length: maxDepth + 1 }, () => [])

  // 类别排序：让相关任务在同一层内聚拢
  const categoryOrder = ['经济', '社会', '外交', '军事', '政治', '终极']
  for (const t of tasks) {
    const d = depthMemo.get(t.id) ?? 0
    levels[d].push(t)
  }
  for (const level of levels) {
    level.sort((a, b) => {
      const ca = categoryOrder.indexOf(a.category)
      const cb = categoryOrder.indexOf(b.category)
      if (ca !== cb) return ca - cb
      return a.id.localeCompare(b.id)
    })
  }
  return levels
}

/** 层级标签：根据层数返回有治国感的名称 */
function getLevelLabel(idx: number, total: number): string {
  if (idx === 0) return '肇 始'
  if (idx === total - 1) return '终 极'
  if (idx === 1) return '进 阶'
  if (idx === 2) return '深 耕'
  return `第 ${idx + 1} 层`
}

/** 类别筛选 chip */
function CategoryChip({
  label,
  icon,
  color,
  active,
  onClick,
}: {
  label: string
  icon: string
  color?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-3 py-1 font-serif text-xs font-semibold transition-all ${
        active
          ? 'bg-gold text-ink-900 shadow-md'
          : 'bg-ink-800/60 text-parchment-200/60 hover:bg-ink-700/60'
      }`}
      style={active && color ? { backgroundColor: color, color: '#1a1a1a' } : undefined}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

/** 单个任务卡片 */
function TaskCard({
  task,
  completed,
  unlocked,
  progress,
  completedIds,
  achievements,
}: {
  task: TaskNode
  completed: boolean
  unlocked: boolean
  progress: number
  completedIds: string[]
  achievements: { id: string; name: string; unlocked: boolean }[]
}) {
  const catMeta = TASK_CATEGORY_META.find((c) => c.category === task.category)
  const locked = !unlocked && !completed
  const ach = task.achievementId
    ? achievements.find((a) => a.id === task.achievementId)
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`doc-card relative overflow-hidden p-3 transition-all ${
        completed
          ? 'border-gold/50 bg-gradient-to-br from-gold/5 to-transparent'
          : task.category === '终极'
            ? 'border-purple-400/40 bg-gradient-to-br from-purple-500/5 to-transparent'
            : locked
              ? 'opacity-50 grayscale'
              : ''
      }`}
      style={catMeta && !completed ? { borderColor: `${catMeta.color}40` } : undefined}
    >
      {/* 顶部状态条 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
            style={{
              backgroundColor: `${catMeta?.color ?? '#888'}30`,
              color: catMeta?.color ?? '#888',
            }}
          >
            {catMeta?.icon} {task.category}
          </span>
          {completed && (
            <span className="rounded-full bg-gold/20 px-2 py-0.5 font-mono text-[9px] font-bold text-gold">
              ✓ 已完成
            </span>
          )}
          {locked && (
            <span className="rounded-full bg-parchment-200/10 px-2 py-0.5 font-mono text-[9px] text-parchment-200/40">
              🔒 未解锁
            </span>
          )}
          {!completed && !locked && (
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 font-mono text-[9px] text-blue-300">
              进行中
            </span>
          )}
        </div>
        {!completed && !locked && (
          <span className="font-mono text-[10px] text-parchment-200/40">
            {Math.round(progress * 100)}%
          </span>
        )}
      </div>

      {/* 标题 */}
      <h3 className="font-display text-base font-semibold text-parchment-100 mb-1">
        {task.title}
      </h3>
      <p className="font-serif text-[12px] text-parchment-200/70 mb-2 leading-relaxed">
        {task.description}
      </p>

      {/* 进度条 */}
      {!completed && !locked && (
        <div className="mb-2 h-1.5 w-full rounded-full bg-ink-900/60 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: catMeta?.color ?? '#c9a961' }}
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      {/* 完成要求 */}
      <div className="mb-2">
        <div className="font-mono text-[9px] text-parchment-200/40 mb-1">完成要求</div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(task.requirements).map(([key, value]) => (
            <RequirementChip key={key} reqKey={key} value={value ?? 0} />
          ))}
        </div>
      </div>

      {/* 奖励 */}
      {task.rewards && (
        <div className="mb-1">
          <div className="font-mono text-[9px] text-parchment-200/40 mb-1">完成奖励</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {task.rewards.effects &&
              Object.entries(task.rewards.effects).map(([key, val]) => (
                <MetricEffectBadge
                  key={`eff_${key}`}
                  metricKey={key}
                  value={val ?? 0}
                  variant="dark"
                />
              ))}
            {task.rewards.pmStatEffects &&
              Object.entries(task.rewards.pmStatEffects).map(([key, val]) => (
                <MetricEffectBadge
                  key={`pm_${key}`}
                  metricKey={key}
                  value={val ?? 0}
                  variant="dark"
                />
              ))}
            {task.rewards.achievements &&
              task.rewards.achievements.map((aid) => {
                const a = achievements.find((ac) => ac.id === aid)
                return (
                  <span
                    key={aid}
                    className="rounded bg-purple-500/15 px-1.5 py-0.5 font-serif text-[10px] text-purple-300"
                  >
                    🏆 {a?.name ?? aid}
                  </span>
                )
              })}
          </div>
        </div>
      )}

      {/* 关联成就 */}
      {ach && (
        <div className="mt-2 pt-2 border-t border-parchment-200/10">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">🏆</span>
            <span className="font-serif text-[11px] text-purple-300/80">{ach.name}</span>
            {ach.unlocked && (
              <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 font-mono text-[9px] text-purple-300">
                已解锁
              </span>
            )}
          </div>
        </div>
      )}

      {/* 前置任务（小标签提示，详情靠 SVG 连线） */}
      {task.prerequisiteTasks && task.prerequisiteTasks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-parchment-200/10">
          <div className="font-mono text-[9px] text-parchment-200/40 mb-1">
            前置（{task.prerequisiteTasks.length}）
          </div>
          <div className="flex flex-wrap gap-1">
            {task.prerequisiteTasks.map((pid) => {
              const preTask = TASK_TREE.find((t) => t.id === pid)
              const preDone = completedIds.includes(pid)
              return (
                <span
                  key={pid}
                  className={`rounded px-1.5 py-0.5 font-serif text-[10px] ${
                    preDone
                      ? 'bg-gold/15 text-gold'
                      : 'bg-ink-900/50 text-parchment-200/40'
                  }`}
                >
                  {preDone ? '✓ ' : '🔒 '}{preTask?.title ?? pid}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}

/** 需求 chip：显示指标名 / 阈值，并标示当前是否已满足 */
function RequirementChip({ reqKey, value }: { reqKey: string; value: number }) {
  const metrics = useGameStore((s) => s.metrics)
  const term = useGameStore((s) => s.term)
  const turn = useGameStore((s) => s.turn)

  let label = reqKey
  let current = 0
  let satisfied = false
  if (reqKey === 'term') {
    label = '届数'
    current = term
    satisfied = term >= value
  } else if (reqKey === 'turn') {
    label = '执政月数'
    current = turn
    satisfied = turn >= value
  } else {
    const labels: Record<string, string> = {
      approval: '民意', treasury: '国库', economy: '经济',
      stability: '稳定', diplomacy: '外交', prestige: '声望',
    }
    label = labels[reqKey] ?? reqKey
    current = metrics[reqKey as keyof typeof metrics] ?? 0
    satisfied = current >= value
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
        satisfied
          ? 'bg-emerald-500/15 text-emerald-300'
          : 'bg-red-500/15 text-red-300'
      }`}
    >
      {label} ≥ {value}
      <span className="opacity-60">({current})</span>
      {satisfied ? '✓' : '✗'}
    </span>
  )
}
