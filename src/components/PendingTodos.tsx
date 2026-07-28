import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { shouldTriggerPmqs } from '@/engine/cardEngine'
import { useState, useMemo, useEffect } from 'react'
import type { GamePage } from '@/types/game'

/** 待办项定义 */
interface PendingItem {
  id: string
  /** 简短标签（图标栏显示） */
  short: string
  /** 完整描述（悬停展开） */
  detail: string
  /** 跳转目标页面 */
  page: GamePage
  /** 是否为侧面板页面 */
  isSidePanel: boolean
  /** 严重等级：danger(红) / warning(橙) / info(蓝) */
  level: 'danger' | 'warning' | 'info'
  /** 是否为鼓励性建议（非强制） */
  encouraging?: boolean
}

/** 页面 → 图标映射（与 GameNav 的 NAV_ITEMS / SIDE_RAIL_GROUPS 保持一致） */
const PAGE_ICON: Record<GamePage, string> = {
  dashboard: '📊',
  pm_profile: '🪪',
  tasks: '🎯',
  policies: '🌐',
  initiatives: '📋',
  laws: '⚖️',
  npcs: '👥',
  diplomacy: '🤝',
  military: '⚔️',
  economy: '📈',
  society: '🏘️',
  environment: '🌱',
  news: '📰',
  parliament: '🏛️',
  debate: '🎤',
  letters: '✉️',
  media: '📢',
  election: '🗳️',
  cabinet: '👥',
  cabinet_chat: '💬',
  encyclopedia: '📖',
  country: '🗺️',
  monthly_report: '📑',
}

/** 顶部待办提示条：嵌入顶部导航栏，横向排列未完成项目
 *  - 收纳态：左侧三色圆点徽章 + "N 待办" + 展开箭头
 *  - 展开态：横向排列每项 圆点 + 图标 + 简短标签（悬停显示详情）
 *  - 左键点击跳转到对应页面
 *  - 右键点击忽略该待办（本回合不再显示）
 *  - 左侧收纳按钮 */
export default function PendingTodos() {
  const setSidePanelPage = useGameStore((s) => s.setSidePanelPage)
  const setGamePage = useGameStore((s) => s.setGamePage)
  const [hovered, setHovered] = useState<string | null>(null)
  // 收纳状态：true=只显示徽章汇总，false=完整列表
  const [collapsed, setCollapsed] = useState(false)
  // 已忽略的待办 id 集合（按回合分桶，回合变化时自动清空）
  const turn = useGameStore((s) => s.turn)
  const [ignored, setIgnored] = useState<Set<string>>(new Set())
  const [ignoredTurn, setIgnoredTurn] = useState(turn)

  // 回合变化时清空忽略列表（新回合重新评估）
  useEffect(() => {
    if (turn !== ignoredTurn) {
      setIgnored(new Set())
      setIgnoredTurn(turn)
    }
  }, [turn, ignoredTurn])

  const allItems = usePendingItems()
  // 过滤掉已忽略的项
  const items = useMemo(() => allItems.filter((it) => !ignored.has(it.id)), [allItems, ignored])

  /** 左键：跳转 */
  const handleClick = (item: PendingItem) => {
    if (item.isSidePanel) {
      setSidePanelPage(item.page)
    } else {
      setSidePanelPage(null)
      setGamePage(item.page)
    }
  }

  /** 右键：忽略该待办（本回合） */
  const handleContextMenu = (e: React.MouseEvent, item: PendingItem) => {
    e.preventDefault()
    e.stopPropagation()
    setIgnored((prev) => {
      const next = new Set(prev)
      next.add(item.id)
      return next
    })
    setHovered(null)
  }

  const levelColor: Record<PendingItem['level'], string> = {
    danger: '#ef4444',
    warning: '#fb923c',
    info: '#3b82f6',
  }
  const levelBg: Record<PendingItem['level'], string> = {
    danger: 'bg-red-500/15 border-red-500/40',
    warning: 'bg-orange-500/15 border-orange-500/40',
    info: 'bg-blue-500/15 border-blue-500/40',
  }

  // 危险等级计数
  const dangerCount = items.filter((i) => i.level === 'danger').length
  const warningCount = items.filter((i) => i.level === 'warning').length
  const infoCount = items.filter((i) => i.level === 'info').length
  const totalCount = items.length

  // 无待办时不显示浮动面板
  if (totalCount === 0) return null

  return (
    // 固定浮动面板：位于右侧，在 SideRail 左侧，不随 nav 高度变化
    <div className="fixed top-24 right-20 z-30 flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
      <AnimatePresence mode="wait">
        {collapsed ? (
          // 收纳态：横向小徽章（三色圆点横排 + 计数 + 展开箭头）
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            onClick={() => setCollapsed(false)}
            className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-ink-900/95 px-2.5 py-1.5 shadow-lg backdrop-blur-sm hover:border-gold/60 hover:bg-ink-800/95 transition-colors whitespace-nowrap"
            title={`${totalCount} 项待办（${dangerCount}紧急 / ${warningCount}警告 / ${infoCount}建议）· 点击展开`}
          >
            {/* 多色圆点横排表示分级 */}
            <div className="flex items-center gap-0.5">
              {dangerCount > 0 && (
                <motion.span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: '#ef4444' }}
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              {warningCount > 0 && (
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#fb923c' }} />
              )}
              {infoCount > 0 && (
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
              )}
            </div>
            <span className="font-mono text-[10px] font-bold text-gold/80">{totalCount}</span>
            <span className="font-serif text-[10px] text-parchment-200/60">待办</span>
            <span className="font-mono text-[9px] text-gold/60">▸</span>
          </motion.button>
        ) : (
          // 展开态：竖排待办列表
          <motion.div
            key="expanded"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-1 w-52"
            onMouseLeave={() => setHovered(null)}
          >
            {/* 顶部收纳按钮 */}
            <button
              onClick={() => setCollapsed(true)}
              className="flex h-6 items-center justify-center gap-1 rounded-md border border-gold/20 bg-ink-900/90 px-2 text-parchment-200/50 hover:text-gold/80 hover:border-gold/40 transition-colors w-full shrink-0"
              title="收纳待办列表"
            >
              <span className="font-mono text-[9px]">{totalCount} 待办</span>
              <span className="font-mono text-[10px]">▾</span>
            </button>

            {/* 竖排待办列表 */}
            <div className="flex flex-col gap-1 overflow-y-auto">
              <AnimatePresence>
                {items.map((item) => {
                  const isHovered = hovered === item.id
                  const color = levelColor[item.level]
                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => handleClick(item)}
                      onContextMenu={(e) => handleContextMenu(e, item)}
                      onMouseEnter={() => setHovered(item.id)}
                      className={`group flex items-center gap-2 rounded-md border px-2 py-1.5 transition-all duration-200 cursor-pointer w-full text-left ${
                        isHovered
                          ? `${levelBg[item.level]} text-parchment-100`
                          : 'border-gold/20 bg-ink-900/90 text-parchment-200/60 hover:bg-ink-800/95'
                      }`}
                      style={isHovered ? { borderColor: `${color}66` } : undefined}
                      title={`${PAGE_ICON[item.page]} ${item.short} · ${item.detail} | 左键跳转 · 右键忽略（本月）`}
                    >
                      {/* 颜色圆点（脉冲，鼓励性项用空心圈） */}
                      {item.encouraging ? (
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0 border"
                          style={{ borderColor: color, backgroundColor: 'transparent' }}
                        />
                      ) : (
                        <motion.span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                      {/* 跳转目标页面图标（与 GameNav 保持一致） */}
                      <span className="text-[11px] leading-none">{PAGE_ICON[item.page]}</span>
                      {/* 简短标签（始终显示） */}
                      <span className="font-serif text-[10px] font-semibold whitespace-nowrap flex-1">
                        {item.short}
                      </span>
                      {/* 跳转箭头 + 忽略提示（悬停时显示） */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1 shrink-0"
                          >
                            <span className="font-mono text-[9px] text-parchment-200/30">右键✕</span>
                            <span className="font-mono text-[10px] text-gold/80">→</span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** 从游戏状态收集所有待办项 */
function usePendingItems(): PendingItem[] {
  const pendingLetters = useGameStore((s) => s.pendingLetters)
  const pendingNotes = useGameStore((s) => s.pendingNotes)
  const cabinetChats = useGameStore((s) => s.cabinetChats)
  const currentEvent = useGameStore((s) => s.currentEvent)
  const currentEmergency = useGameStore((s) => s.currentEmergency)
  const currentCountdown = useGameStore((s) => s.currentCountdown)
  const activeCardEvent = useGameStore((s) => s.activeCardEvent)
  const activeInitiatives = useGameStore((s) => s.activeInitiatives)
  const metrics = useGameStore((s) => s.metrics)
  const turn = useGameStore((s) => s.turn)
  const term = useGameStore((s) => s.term)
  const parliament = useGameStore((s) => s.parliament)
  const pmActions = useGameStore((s) => s.pmActions)
  const countries = useGameStore((s) => s.countries)
  const activePolicies = useGameStore((s) => s.activePolicies)
  // 用于 shouldTriggerPmqs 与低忠诚度统计的"完整快照"
  const fullState = useGameStore((s) => s)

  return useMemo(() => {
    const items: PendingItem[] = []
    const gameState = fullState

    // ============ 紧急类（必须处理，红色）============
    // 1. 紧急事件
    if (currentEmergency) {
      items.push({
        id: 'emergency',
        short: '紧急事件',
        detail: `${currentEmergency.title} · 立即处理`,
        page: 'dashboard',
        isSidePanel: false,
        level: 'danger',
      })
    }

    // 2. 倒计时事件
    if (currentCountdown) {
      items.push({
        id: 'countdown',
        short: '倒计时',
        detail: `${currentCountdown.title} · 限时抉择`,
        page: 'dashboard',
        isSidePanel: false,
        level: 'danger',
      })
    }

    // 3. 关键指标危急 — 民意/稳定 < 25
    if (metrics.approval < 25) {
      items.push({
        id: 'low_approval',
        short: '民意危急',
        detail: `民意 ${metrics.approval} · 险遭不信任`,
        page: 'society',
        isSidePanel: false,
        level: 'danger',
      })
    }
    if (metrics.stability < 25) {
      items.push({
        id: 'low_stability',
        short: '稳定危急',
        detail: `稳定 ${metrics.stability} · 动乱风险`,
        page: 'society',
        isSidePanel: false,
        level: 'danger',
      })
    }

    // ============ 警告类（应尽快处理，橙色）============
    // 4. 待决策事件
    if (currentEvent) {
      items.push({
        id: 'event',
        short: '待决策',
        detail: `${currentEvent.title} · 7天内必决`,
        page: 'dashboard',
        isSidePanel: false,
        level: 'warning',
      })
    }

    // 5. 议会质询待应对
    if (activeCardEvent) {
      items.push({
        id: 'pmqs',
        short: '质询应对',
        detail: `议会质询 · 拖卡应对`,
        page: 'debate',
        isSidePanel: true,
        level: 'warning',
      })
    } else if (shouldTriggerPmqs(gameState)) {
      items.push({
        id: 'pmqs_due',
        short: '质询到期',
        detail: '议会质询周期已到 · 可手动触发',
        page: 'parliament',
        isSidePanel: true,
        level: 'warning',
      })
    }

    // 6. 未回复选区信件
    if (pendingLetters.length > 0) {
      items.push({
        id: 'letters',
        short: `${pendingLetters.length} 封信件`,
        detail: `选区信件待回复 · 拖久扣民意`,
        page: 'letters',
        isSidePanel: true,
        level: 'warning',
      })
    }

    // 7. 未回复外交照会
    if (pendingNotes.length > 0) {
      items.push({
        id: 'notes',
        short: `${pendingNotes.length} 件照会`,
        detail: `外交照会待回应 · 影响关系`,
        page: 'letters',
        isSidePanel: true,
        level: 'warning',
      })
    }

    // 8. 内阁存在低忠诚度部长
    const disloyalCount = gameState.cabinet.filter((m: { loyalty: number }) => m.loyalty < 45).length
    if (disloyalCount > 0) {
      items.push({
        id: 'disloyal_cabinet',
        short: `${disloyalCount} 部长不稳`,
        detail: '内阁存在低忠诚度部长 · 或生异心',
        page: 'cabinet',
        isSidePanel: true,
        level: 'warning',
      })
    }

    // 9. 内阁部长未读私信
    const unreadChats = cabinetChats.reduce(
      (sum, t) => sum + t.messages.filter((m) => m.sender === 'minister' && m.options && !m.resolved).length,
      0,
    )
    if (unreadChats > 0) {
      items.push({
        id: 'cabinet_chat',
        short: `${unreadChats} 条部长私信`,
        detail: '内阁部长建言待回应 · 影响忠诚',
        page: 'cabinet_chat',
        isSidePanel: true,
        level: 'warning',
      })
    }

    // ============ 鼓励类（建议处理，蓝色，encouraging=true）============
    // 10. 长期未启动改革 — 执政满 3 个月且无进行中改革
    if (turn >= 3 && activeInitiatives.length === 0) {
      items.push({
        id: 'no_initiative',
        short: '未启动改革',
        detail: '执政已 3 月无主动改革 · 建议启动',
        page: 'initiatives',
        isSidePanel: false,
        level: 'info',
        encouraging: true,
      })
    }

    // 11. 可提请法案表决 — 议会未解散且执政满 2 个月
    if (turn >= 2 && !parliament?.dissolved) {
      items.push({
        id: 'can_propose_bill',
        short: '可提请法案',
        detail: '议会本届可提请法案表决 · 密室政治拉票',
        page: 'parliament',
        isSidePanel: true,
        level: 'info',
        encouraging: true,
      })
    }

    // 12. 长期未发表演说 — 执政满 4 月且本回合未演说
    const speechAction = pmActions.find((a) => a.id === 'speech')
    if (speechAction && turn >= 4 && turn - speechAction.lastUsedTurn >= 6) {
      items.push({
        id: 'no_speech',
        short: '未发表演说',
        detail: `已 ${turn - speechAction.lastUsedTurn} 月未演说 · 可提振民意`,
        page: 'pm_profile',
        isSidePanel: false,
        level: 'info',
        encouraging: true,
      })
    }

    // 13. 长期未视察地方 — 执政满 5 月且本回合未视察
    const inspectAction = pmActions.find((a) => a.id === 'inspect')
    if (inspectAction && turn >= 5 && turn - inspectAction.lastUsedTurn >= 8) {
      items.push({
        id: 'no_inspect',
        short: '未视察地方',
        detail: `已 ${turn - inspectAction.lastUsedTurn} 月未下基层 · 可稳固稳定`,
        page: 'pm_profile',
        isSidePanel: false,
        level: 'info',
        encouraging: true,
      })
    }

    // 14. 长期未进行外交互动 — 执政满 4 月且所有国家 lastActionTurn 距今 ≥ 4 月
    if (turn >= 4 && countries && countries.length > 0) {
      const allDormant = countries.every((c) => turn - c.lastActionTurn >= 4)
      if (allDormant) {
        const maxDormant = Math.max(...countries.map((c) => turn - c.lastActionTurn))
        items.push({
          id: 'no_diplomacy',
          short: '未外交互动',
          detail: `已 ${maxDormant} 月无外交行动 · 关系或冷`,
          page: 'diplomacy',
          isSidePanel: false,
          level: 'info',
          encouraging: true,
        })
      }
    }

    // 15. 长期未进行内阁会议/调整 — 执政满 6 月且本回合未调整内阁
    const cabinetAction = pmActions.find((a) => a.id === 'cabinet')
    if (cabinetAction && turn >= 6 && turn - cabinetAction.lastUsedTurn >= 6) {
      items.push({
        id: 'no_cabinet_review',
        short: '未调整内阁',
        detail: `已 ${turn - cabinetAction.lastUsedTurn} 月未调整内阁 · 可优化加成`,
        page: 'cabinet',
        isSidePanel: true,
        level: 'info',
        encouraging: true,
      })
    }

    // 16. 长期未与议会互动 — 执政满 5 月且本回合未议会互动
    const parliamentAction = pmActions.find((a) => a.id === 'parliament')
    if (parliamentAction && turn >= 5 && turn - parliamentAction.lastUsedTurn >= 5 && !parliament?.dissolved) {
      items.push({
        id: 'no_parliament_action',
        short: '未与议会互动',
        detail: `已 ${turn - parliamentAction.lastUsedTurn} 月未与议会互动 · 可提升信任`,
        page: 'parliament',
        isSidePanel: true,
        level: 'info',
        encouraging: true,
      })
    }

    // 17. 任期将满 — 执政满 44 个月
    if (turn >= 44) {
      items.push({
        id: 'term_ending',
        short: '任期将满',
        detail: `第 ${term} 届任期即将结束 · 准备大选`,
        page: 'election',
        isSidePanel: true,
        level: 'info',
        encouraging: true,
      })
    }

    // 18. 政策长期未调整 — 执政满 8 月且 activePolicies 自开局未变（粗略：所有类别仍是默认）
    // 简化：执政满 8 月提示一次检查政策
    if (turn === 8) {
      items.push({
        id: 'policy_check',
        short: '可调整政策',
        detail: '执政已 8 月 · 可检查各类政策是否仍贴合当前局势',
        page: 'policies',
        isSidePanel: false,
        level: 'info',
        encouraging: true,
      })
    }

    // 19. 任务有新进展可领 — 粗略鼓励：执政满 10 月提示查看任务树
    if (turn === 10) {
      items.push({
        id: 'task_check',
        short: '可查看任务',
        detail: '执政已 10 月 · 任务树或有新进展可领',
        page: 'tasks',
        isSidePanel: false,
        level: 'info',
        encouraging: true,
      })
    }

    return items
  }, [
    fullState,
    pendingLetters, pendingNotes, cabinetChats,
    currentEvent, currentEmergency, currentCountdown, activeCardEvent,
    activeInitiatives, metrics, turn, term, parliament,
    pmActions, countries, activePolicies,
  ])
}
