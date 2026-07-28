import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import type { PendingEvent } from '@/types/game'

/**
 * v1.5：事件篮改为右侧常驻 siderail + 统一收件箱 + 优先级分层
 *
 * 设计：
 *  - 平时为右侧固定窄栏（图标+未读数），不阻挡游戏主视图
 *  - 点击展开为侧边抽屉，按优先级 P0/P1/P2/P3 分层显示所有待办
 *  - 统一收件箱：合并 pendingEvents（待决策事件）、pendingLetters（信件）、
 *    pendingNotes（外部照会）、cabinetChats 未读消息，归一为统一列表
 *  - 优先级分层：
 *      P0 紧急：紧急事件、倒计时事件、≤3 天截止
 *      P1 紧迫：≤7 天截止、内阁最后通牒
 *      P2 待办：≤21 天截止
 *      P3 长期：信件/照会（无严格截止）
 */
type Priority = 'P0' | 'P1' | 'P2' | 'P3'

interface InboxItem {
  instanceId: string
  source: 'event' | 'letter' | 'note' | 'chat'
  title: string
  description: string
  category: string
  deadlineDay?: number
  triggeredDay?: number
  isEmergency: boolean
  priority: Priority
  raw: PendingEvent | { id: string; subject: string; from: string; content: string } | { id: string }
}

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string; icon: string }> = {
  P0: { label: '紧急', color: '#dc2626', bg: 'rgba(220,38,38,0.2)', icon: '🔴' },
  P1: { label: '紧迫', color: '#ea580c', bg: 'rgba(234,88,12,0.15)', icon: '🟠' },
  P2: { label: '待办', color: '#ca8a04', bg: 'rgba(202,138,4,0.15)', icon: '🟡' },
  P3: { label: '长期', color: '#2563eb', bg: 'rgba(37,99,235,0.12)', icon: '🔵' },
}

const SOURCE_LABEL: Record<string, string> = {
  event: '事件',
  letter: '信件',
  note: '照会',
  chat: '内阁',
}

/** 计算单项优先级 */
function calcPriority(
  source: InboxItem['source'],
  deadlineDay: number | undefined,
  isEmergency: boolean,
  totalDays: number,
): Priority {
  if (isEmergency) return 'P0'
  if (source === 'event' && deadlineDay !== undefined) {
    const daysLeft = deadlineDay - totalDays
    if (daysLeft <= 3) return 'P0'
    if (daysLeft <= 7) return 'P1'
    if (daysLeft <= 21) return 'P2'
    return 'P3'
  }
  // 信件/照会/聊天：无严格截止，归 P3
  return 'P3'
}

export default function EventBasket() {
  const showEventBasket = useGameStore((s) => s.showEventBasket)
  const setShowEventBasket = useGameStore((s) => s.setShowEventBasket)
  const pendingEvents = useGameStore((s) => s.pendingEvents)
  const pendingLetters = useGameStore((s) => s.pendingLetters)
  const pendingNotes = useGameStore((s) => s.pendingNotes)
  const cabinetChats = useGameStore((s) => s.cabinetChats)
  const totalDays = useGameStore((s) => s.totalDays)
  const openPendingEvent = useGameStore((s) => s.openPendingEvent)
  const setSidePanelPage = useGameStore((s) => s.setSidePanelPage)
  const [expanded, setExpanded] = useState(false)

  // 合并五类事件容器为统一收件箱
  const inboxItems = useMemo<InboxItem[]>(() => {
    const items: InboxItem[] = []

    // 1. 待决策事件（pendingEvents）
    for (const ev of pendingEvents) {
      items.push({
        instanceId: ev.instanceId,
        source: 'event',
        title: ev.title,
        description: ev.description,
        category: ev.category,
        deadlineDay: ev.deadlineDay,
        triggeredDay: ev.triggeredDay,
        isEmergency: ev.isEmergency,
        priority: calcPriority('event', ev.deadlineDay, ev.isEmergency, totalDays),
        raw: ev,
      })
    }

    // 2. 选区信件
    for (const letter of pendingLetters) {
      items.push({
        instanceId: `letter_${letter.id}`,
        source: 'letter',
        title: letter.id,
        description: '选区来信',
        category: '信件',
        isEmergency: false,
        priority: 'P3' as Priority,
        raw: letter,
      })
    }

    // 3. 外交照会
    for (const note of pendingNotes) {
      items.push({
        instanceId: `note_${note.id}`,
        source: 'note',
        title: note.subject,
        description: note.content,
        category: '外交',
        isEmergency: false,
        priority: 'P3' as Priority,
        raw: note,
      })
    }

    // 4. 内阁聊天未读
    let unreadChatCount = 0
    for (const thread of cabinetChats) {
      for (const msg of thread.messages) {
        if (msg.sender === 'minister' && msg.options && !msg.resolved) {
          unreadChatCount++
        }
      }
    }
    if (unreadChatCount > 0) {
      items.push({
        instanceId: 'cabinet_chat_unread',
        source: 'chat',
        title: `${unreadChatCount} 条未读内阁消息`,
        description: '部长们正在等待您的回复',
        category: '内阁',
        isEmergency: false,
        priority: 'P2' as Priority,
        raw: { id: 'cabinet_chat_unread' },
      })
    }

    return items
  }, [pendingEvents, pendingLetters, pendingNotes, cabinetChats, totalDays])

  // 按优先级分组
  const grouped = useMemo(() => {
    const g: Record<Priority, InboxItem[]> = { P0: [], P1: [], P2: [], P3: [] }
    for (const item of inboxItems) {
      g[item.priority].push(item)
    }
    // 每组内按截止时间升序
    for (const p of ['P0', 'P1', 'P2', 'P3'] as Priority[]) {
      g[p].sort((a, b) => (a.deadlineDay ?? 9999) - (b.deadlineDay ?? 9999))
    }
    return g
  }, [inboxItems])

  const totalCount = inboxItems.length
  const p0Count = grouped.P0.length
  const hasItems = totalCount > 0

  const handleItemClick = (item: InboxItem) => {
    if (item.source === 'event') {
      openPendingEvent(item.instanceId)
      setExpanded(false)
    } else if (item.source === 'letter') {
      setSidePanelPage('letters')
      setExpanded(false)
    } else if (item.source === 'note') {
      setSidePanelPage('letters')
      setExpanded(false)
    } else if (item.source === 'chat') {
      setSidePanelPage('cabinet_chat')
      setExpanded(false)
    }
  }

  // 右侧常驻窄栏：平时仅显示图标 + 未读数（位于右下角，避开中央 SideRail）
  return (
    <>
      {/* 右侧常驻窄栏（always-on siderail widget） */}
      <div
        className="fixed right-0 bottom-20 z-30"
        data-event-basket-rail="true"
      >
        <button
          onClick={() => {
            const next = !expanded
            setExpanded(next)
            setShowEventBasket(next)
          }}
          className={`flex flex-col items-center justify-center gap-1 rounded-l-lg border-r-0 border px-2.5 py-3 transition-all min-w-[48px] ${
            p0Count > 0
              ? 'border-red-500/60 bg-red-950/95 text-red-300 shadow-lg shadow-red-500/30 animate-pulse'
              : hasItems
                ? 'border-gold/60 bg-gradient-to-l from-ink-800/95 to-ink-900/95 text-gold shadow-lg shadow-gold/20'
                : 'border-gold/15 bg-ink-900/70 text-parchment-200/40'
          }`}
          title={`事件篮 · 共 ${totalCount} 项待办`}
        >
          <span className="text-base leading-none">🗂️</span>
          <span
            className="font-serif text-[9px] font-semibold leading-none tracking-[0.15em] opacity-80"
            style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
          >
            收件箱
          </span>
          {totalCount > 0 && (
            <span
              className={`mt-0.5 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold shadow-md ring-2 ring-ink-950 ${
                p0Count > 0 ? 'bg-red-500 text-white' : 'bg-gold text-ink-900'
              }`}
            >
              {totalCount}
            </span>
          )}
        </button>
      </div>

      {/* 展开的侧边抽屉 */}
      <AnimatePresence>
        {expanded && showEventBasket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setExpanded(false)
                setShowEventBasket(false)
              }}
              className="fixed inset-0 z-40 bg-black/30"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-[420px] flex-col border-l border-gold/30 bg-ink-900 shadow-2xl"
            >
              {/* 头部 */}
              <div className="flex items-center justify-between border-b border-gold/20 px-4 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🗂️</span>
                  <div>
                    <div className="font-display text-sm font-semibold tracking-[0.25em] text-gold">
                      统一收件箱
                    </div>
                    <div className="font-mono text-[10px] text-parchment-200/40">
                      共 {totalCount} 项 · P0 {p0Count} 项
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setExpanded(false)
                    setShowEventBasket(false)
                  }}
                  className="rounded p-1 text-parchment-200/40 transition-colors hover:bg-gold/10 hover:text-gold"
                  title="关闭"
                >
                  ✕
                </button>
              </div>

              {/* 列表（按优先级分层） */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {totalCount === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <div className="text-5xl opacity-30">📭</div>
                    <p className="font-serif text-sm text-parchment-200/40">收件箱已清空</p>
                    <p className="font-mono text-[10px] text-parchment-200/30">政务清平，国泰民安</p>
                  </div>
                ) : (
                  (['P0', 'P1', 'P2', 'P3'] as Priority[]).map((p) =>
                    grouped[p].length === 0 ? null : (
                      <div key={p}>
                        <div
                          className="mb-1.5 flex items-center gap-1.5 px-1 font-mono text-[10px] font-bold tracking-wider"
                          style={{ color: PRIORITY_META[p].color }}
                        >
                          <span>{PRIORITY_META[p].icon}</span>
                          <span>{PRIORITY_META[p].label}</span>
                          <span className="text-parchment-200/30">· {grouped[p].length}</span>
                          <div
                            className="ml-2 h-px flex-1"
                            style={{ background: `linear-gradient(to right, ${PRIORITY_META[p].color}40, transparent)` }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          {grouped[p].map((item) => (
                            <InboxItemCard
                              key={item.instanceId}
                              item={item}
                              totalDays={totalDays}
                              onClick={() => handleItemClick(item)}
                            />
                          ))}
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>

              {/* 底部提示 */}
              {totalCount > 0 && (
                <div className="border-t border-gold/15 px-4 py-2 shrink-0">
                  <p className="font-mono text-[10px] text-parchment-200/40">
                    超时未决的事件将自动按"最差选项"结算 · 不同类型事件等待 7–42 天不等
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

interface InboxItemCardProps {
  item: InboxItem
  totalDays: number
  onClick: () => void
}

function InboxItemCard({ item, totalDays, onClick }: InboxItemCardProps) {
  const meta = PRIORITY_META[item.priority]
  const daysLeft = item.deadlineDay !== undefined ? item.deadlineDay - totalDays : null

  return (
    <motion.button
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: -2 }}
      onClick={onClick}
      className="w-full text-left rounded-md border p-2.5 transition-all hover:shadow-md"
      style={{
        borderColor: `${meta.color}40`,
        backgroundColor: meta.bg,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold whitespace-nowrap"
            style={{ color: meta.color, backgroundColor: `${meta.color}30` }}
          >
            {SOURCE_LABEL[item.source]}
          </span>
          {item.isEmergency && (
            <span className="rounded bg-red-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
              紧急
            </span>
          )}
        </div>
        {daysLeft !== null && (
          <span
            className={`font-mono text-[9px] font-bold whitespace-nowrap ${
              daysLeft <= 3 ? 'text-red-400' : daysLeft <= 7 ? 'text-orange-400' : 'text-parchment-200/50'
            }`}
          >
            {daysLeft <= 0 ? '已逾期' : `剩 ${daysLeft} 天`}
          </span>
        )}
      </div>
      <h4 className="mt-1 font-serif text-xs font-semibold text-parchment-100 line-clamp-1">
        {item.title}
      </h4>
      <p className="mt-0.5 font-serif text-[10px] text-parchment-200/50 line-clamp-1">
        {item.description}
      </p>
    </motion.button>
  )
}
