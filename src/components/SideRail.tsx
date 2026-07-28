import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { SIDE_RAIL_GROUPS } from '@/components/GameNav'
import type { GamePage } from '@/types/game'

/** 右侧图标栏：平时仅图标，鼠标靠近展开为图标+文字菜单
 *  议会/民意/内阁 三组的子菜单均在此处，点击后以右侧弹出面板形式打开 */
export default function SideRail() {
  const sidePanelPage = useGameStore((s) => s.sidePanelPage)
  const setSidePanelPage = useGameStore((s) => s.setSidePanelPage)
  const cabinetChats = useGameStore((s) => s.cabinetChats)
  const pendingLetters = useGameStore((s) => s.pendingLetters)
  const pendingNotes = useGameStore((s) => s.pendingNotes)
  const [hoveredGroup, setHoveredGroup] = useState<number | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unreadChatCount = cabinetChats.reduce(
    (sum, t) => sum + t.messages.filter((m) => m.sender === 'minister' && m.options && !m.resolved).length,
    0,
  )
  const lettersAndNotesCount = pendingLetters.length + pendingNotes.length

  const handleEnter = (idx: number) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setHoveredGroup(idx)
  }
  const handleLeave = () => {
    closeTimer.current = setTimeout(() => setHoveredGroup(null), 200)
  }

  const handleClick = (page: GamePage) => {
    // 点击已打开的面板则关闭，否则切换
    setSidePanelPage(sidePanelPage === page ? null : page)
    setHoveredGroup(null)
  }

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5"
      data-side-rail="true"
      onMouseLeave={handleLeave}
    >
      {SIDE_RAIL_GROUPS.map((group, gIdx) => {
        const isHovered = hoveredGroup === gIdx
        // 该组是否有任一子页面正在面板中展示
        const hasActive = group.items.some((it) => it.page === sidePanelPage)
        // 该组未读数
        const groupUnread =
          group.label === '内阁' ? unreadChatCount :
          group.label === '民意' ? lettersAndNotesCount : 0

        return (
          <div
            key={group.label}
            className="relative"
            onMouseEnter={() => handleEnter(gIdx)}
          >
            {/* 组图标按钮：图标 + 横排文字标签 */}
            <button
              onClick={() => setHoveredGroup(isHovered ? null : gIdx)}
              className={`group relative flex flex-col items-center justify-center gap-0.5 rounded-l-lg border-r-0 border px-2 py-2.5 transition-all duration-200 min-w-[48px] ${
                hasActive
                  ? 'border-gold/60 bg-gradient-to-l from-ink-800/95 to-ink-900/95 text-gold shadow-lg shadow-gold/20'
                  : 'border-gold/25 bg-ink-900/90 text-parchment-200/70 hover:bg-gradient-to-l hover:from-ink-800/95 hover:to-ink-900/90 hover:text-gold hover:border-gold/50'
              }`}
              title={group.label}
            >
              <span className="text-base leading-none drop-shadow-sm">{group.icon}</span>
              <span className="font-serif text-[10px] font-semibold leading-none tracking-wider opacity-80 whitespace-nowrap">
                {group.label}
              </span>
              {/* 底部金色装饰点 */}
              <span
                className={`mt-0.5 h-1 w-1 rounded-full transition-colors ${
                  hasActive ? 'bg-gold' : 'bg-gold/20 group-hover:bg-gold/50'
                }`}
              />
              {groupUnread > 0 && (
                <span className="absolute -top-1 -left-1 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold text-white shadow-md ring-2 ring-ink-950">
                  {groupUnread}
                </span>
              )}
            </button>

            {/* 悬停展开的子菜单 */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-full top-0 mr-1 min-w-[150px] rounded border border-gold/20 bg-ink-900/95 p-1 shadow-seal backdrop-blur"
                >
                  <div className="mb-1 px-2 py-0.5 font-display text-[10px] font-semibold tracking-[0.2em] text-gold/60">
                    {group.label}
                  </div>
                  {group.items.map((sub) => {
                    const isActive = sidePanelPage === sub.page
                    const showBadge =
                      (sub.page === 'cabinet_chat' && unreadChatCount > 0) ||
                      (sub.page === 'letters' && lettersAndNotesCount > 0)
                    const badgeCount =
                      sub.page === 'cabinet_chat' ? unreadChatCount :
                      sub.page === 'letters' ? lettersAndNotesCount : 0
                    return (
                      <button
                        key={sub.page}
                        onClick={() => handleClick(sub.page)}
                        className={`w-full flex items-center gap-2 rounded px-2.5 py-1.5 text-left transition-colors ${
                          isActive
                            ? 'bg-gold/15 text-gold'
                            : 'text-parchment-200/70 hover:bg-ink-700/60 hover:text-parchment-100'
                        }`}
                      >
                        <span className="text-sm">{sub.icon}</span>
                        <span className="font-serif text-xs font-semibold tracking-wider whitespace-nowrap flex-1">
                          {sub.label}
                        </span>
                        {sub.hotkey && (
                          <span className="inline-flex min-w-[14px] h-[14px] items-center justify-center rounded bg-parchment-200/10 px-1 font-mono text-[9px] text-parchment-200/40">
                            {sub.hotkey}
                          </span>
                        )}
                        {showBadge && (
                          <span className="inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold text-white">
                            {badgeCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
