import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import ParliamentPage from '@/pages/ParliamentPage'
import DebatePage from '@/pages/DebatePage'
import LettersPage from '@/pages/LettersPage'
import MediaPage from '@/pages/MediaPage'
import ElectionPage from '@/pages/ElectionPage'
import CabinetPage from '@/pages/CabinetPage'
import CabinetChatPage from '@/pages/CabinetChatPage'
import type { GamePage } from '@/types/game'

/** 右侧弹出面板页面标题 */
const PANEL_TITLES: Partial<Record<GamePage, string>> = {
  parliament: '议会',
  debate: '质询',
  letters: '信件',
  media: '舆论',
  election: '大选',
  cabinet: '内阁名单',
  cabinet_chat: '内阁聊天',
}

/** 右侧弹出式面板：议会/民意/内阁页面以侧栏抽屉形式展示，不再占用全屏 */
export default function SidePanel() {
  const sidePanelPage = useGameStore((s) => s.sidePanelPage)
  const setSidePanelPage = useGameStore((s) => s.setSidePanelPage)

  const renderPanelContent = () => {
    switch (sidePanelPage) {
      case 'parliament': return <ParliamentPage />
      case 'debate': return <DebatePage />
      case 'letters': return <LettersPage />
      case 'media': return <MediaPage />
      case 'election': return <ElectionPage />
      case 'cabinet': return <CabinetPage />
      case 'cabinet_chat': return <CabinetChatPage />
      default: return null
    }
  }

  return (
    <AnimatePresence>
      {sidePanelPage && (
        <>
          {/* 半透明遮罩（点击关闭） */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidePanelPage(null)}
            className="fixed inset-0 z-40 bg-black/40"
          />

          {/* 右侧抽屉面板 */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-[640px] flex-col border-l border-gold/30 bg-ink-900 shadow-2xl"
          >
            {/* 面板头部 */}
            <div className="flex items-center justify-between border-b border-gold/20 px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-semibold tracking-[0.25em] text-gold">
                  {PANEL_TITLES[sidePanelPage] ?? ''}
                </span>
                <div className="h-px w-12 bg-gradient-to-r from-gold/40 to-transparent" />
              </div>
              <button
                onClick={() => setSidePanelPage(null)}
                className="rounded p-1 text-parchment-200/40 transition-colors hover:bg-gold/10 hover:text-gold"
                title="关闭面板"
              >
                <X size={16} />
              </button>
            </div>

            {/* 面板内容（可滚动） */}
            <div className="flex-1 overflow-y-auto p-4">
              {renderPanelContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
