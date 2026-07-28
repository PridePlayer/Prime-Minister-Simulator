import { motion } from 'motion/react'
import type { GamePage } from '@/types/game'

interface GameNavProps {
  currentPage: GamePage
  onNavigate: (page: GamePage) => void
}

/** 单项导航 */
interface NavLeaf {
  page: GamePage
  label: string
  icon: string
  hotkey?: string
}

/** 导航项：按轻重缓急排序
 *  顺序原则：紧急待办（仪表盘/任务）→ 施政工具（政策/改革/法律）→ 国政各领域 → 新闻回溯
 *  议会/民意/内阁/总理 四组已移至右侧图标栏（SideRail），百科移至右上角"菜单"
 *  v1.5：总理档案与人物谱从主导航移至右侧栏（与议会同模式）
 *  v1.5：新增"国情"（地方行政区划）与"月度归因"导航 */
const NAV_ITEMS: NavLeaf[] = [
  { page: 'dashboard', label: '仪表盘', icon: '📊', hotkey: 'D' },
  { page: 'tasks', label: '任务树', icon: '🎯', hotkey: 'T' },
  { page: 'country', label: '国情', icon: '🗺️', hotkey: 'Y' },
  { page: 'policies', label: '政策树', icon: '🌐', hotkey: 'P' },
  { page: 'initiatives', label: '改革', icon: '📋', hotkey: 'I' },
  { page: 'laws', label: '法律', icon: '⚖️', hotkey: 'G' },
  { page: 'diplomacy', label: '外交', icon: '🤝', hotkey: 'O' },
  { page: 'military', label: '军事', icon: '⚔️', hotkey: 'M' },
  { page: 'economy', label: '经济', icon: '📈', hotkey: 'E' },
  { page: 'society', label: '社会', icon: '🏘️', hotkey: 'S' },
  { page: 'environment', label: '环境', icon: '🌱', hotkey: 'N' },
]

/** 右侧图标栏分组：总理 / 议会 / 民意 / 内阁 / 资讯（平时仅图标，悬停展开文字）
 *  v1.5 新增"总理"组：总理档案 + 人物谱
 *  v1.5.1 归因、新闻移至右侧栏 */
export const SIDE_RAIL_GROUPS: { label: string; icon: string; items: NavLeaf[] }[] = [
  {
    label: '总理',
    icon: '🪪',
    items: [
      { page: 'pm_profile', label: '总理档案', icon: '🪪', hotkey: 'F' },
      { page: 'npcs', label: '人物谱', icon: '👥', hotkey: 'K' },
    ],
  },
  {
    label: '议会',
    icon: '🏛️',
    items: [
      { page: 'parliament', label: '议会', icon: '🏛️', hotkey: 'L' },
      { page: 'debate', label: '质询', icon: '🎤', hotkey: 'B' },
    ],
  },
  {
    label: '民意',
    icon: '✉️',
    items: [
      { page: 'letters', label: '信件', icon: '✉️', hotkey: 'R' },
      { page: 'media', label: '舆论', icon: '📢', hotkey: 'A' },
      { page: 'election', label: '大选', icon: '🗳️', hotkey: 'X' },
    ],
  },
  {
    label: '内阁',
    icon: '👥',
    items: [
      { page: 'cabinet', label: '内阁名单', icon: '👥', hotkey: 'V' },
      { page: 'cabinet_chat', label: '内阁聊天', icon: '💬', hotkey: 'C' },
    ],
  },
  {
    label: '资讯',
    icon: '📰',
    items: [
      { page: 'news', label: '新闻', icon: '📰', hotkey: 'W' },
      { page: 'monthly_report', label: '归因', icon: '📑', hotkey: 'H' },
    ],
  },
]

/** 快捷键 → 页面映射（用于全局监听，含右侧栏页面） */
export const NAV_HOTKEYS: Record<string, GamePage> = (() => {
  const acc: Record<string, GamePage> = {}
  for (const item of NAV_ITEMS) {
    if (item.hotkey) acc[item.hotkey.toLowerCase()] = item.page
  }
  for (const group of SIDE_RAIL_GROUPS) {
    for (const sub of group.items) {
      if (sub.hotkey) acc[sub.hotkey.toLowerCase()] = sub.page
    }
  }
  return acc
})()

/** 右侧栏包含的所有页面集合（用于区分主导航与侧面板路由） */
export const SIDE_RAIL_PAGES: Set<GamePage> = new Set(
  SIDE_RAIL_GROUPS.flatMap((g) => g.items.map((it) => it.page)),
)

/** 游戏导航（顶部横向布局） */
export default function GameNav({ currentPage, onNavigate }: GameNavProps) {
  return (
    <nav className="flex items-center gap-0.5 flex-wrap">
      {NAV_ITEMS.map((item) => {
        const isActive = currentPage === item.page
        return (
          <motion.button
            key={item.page}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate(item.page)}
            className={`nav-item relative flex items-center gap-1.5 rounded px-3 py-1.5 text-left ${
              isActive ? 'active text-gold' : 'text-parchment-200/60'
            }`}
            title={item.hotkey ? `${item.label}（快捷键 ${item.hotkey}）` : item.label}
          >
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-gold"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <span className="text-sm">{item.icon}</span>
            <span className="font-serif text-xs font-semibold tracking-wider whitespace-nowrap">
              {item.label}
            </span>
            {item.hotkey && (
              <span className="hidden lg:inline-flex ml-0.5 min-w-[14px] h-[14px] items-center justify-center rounded bg-parchment-200/10 px-1 font-mono text-[9px] text-parchment-200/40">
                {item.hotkey}
              </span>
            )}
          </motion.button>
        )
      })}
    </nav>
  )
}
