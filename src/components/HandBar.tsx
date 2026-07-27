// 底部手牌栏：仅在卡牌事件激活时显示
// z-index 高于卡牌弹窗背景，确保可拖拽
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { getCardById } from '@/data/cards'
import GameCard from './GameCard'

export default function HandBar() {
  const cardHand = useGameStore((s) => s.cardHand)
  const dossierCards = useGameStore((s) => s.dossierCards)
  const activeCardEvent = useGameStore((s) => s.activeCardEvent)

  return (
    <AnimatePresence>
      {/* 仅在有激活卡牌事件时显示手牌栏 */}
      {activeCardEvent && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center"
        >
          {/* 黑料卡数量指示器 */}
          {dossierCards.length > 0 && (
            <div className="pointer-events-auto mb-1 flex items-center gap-1 rounded-full border border-gray-600/60 bg-ink-900/90 px-2.5 py-0.5 shadow-lg backdrop-blur-sm">
              <span className="text-xs">📁</span>
              <span className="font-mono text-[10px] font-bold text-gray-200">
                黑料 × {dossierCards.length}
              </span>
            </div>
          )}

          {/* 手牌区 */}
          <div className="pointer-events-auto w-full overflow-x-auto overflow-y-hidden bg-gradient-to-t from-ink-950 via-ink-900/95 to-transparent px-4 pb-2 pt-3">
            <div className="flex items-end gap-2 min-w-min mx-auto" style={{ width: 'fit-content', margin: '0 auto' }}>
              <AnimatePresence mode="popLayout">
                {cardHand.length === 0 ? (
                  <div key="empty" className="px-4 py-6 text-center">
                    <span className="font-serif text-xs text-parchment-200/40">手牌已空</span>
                  </div>
                ) : (
                  cardHand.map((handItem) => {
                    const card = getCardById(handItem.cardId)
                    if (!card) return null
                    return (
                      <GameCard
                        key={handItem.instanceId}
                        card={card}
                        handItem={handItem}
                        draggable
                        width={140}
                      />
                    )
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
