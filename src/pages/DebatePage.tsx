import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { useState } from 'react'
import type { DebateCard } from '@/types/game'

/** 质询页面 */
export default function DebatePage() {
  const currentDebate = useGameStore((s) => s.currentDebate)
  const pmStats = useGameStore((s) => s.pmStats)
  const handleDebate = useGameStore((s) => s.handleDebate)
  const setGamePage = useGameStore((s) => s.setGamePage)
  const [selectedCard, setSelectedCard] = useState<DebateCard | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [resultSuccess, setResultSuccess] = useState(false)

  if (!currentDebate) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="text-parchment-200/50 font-serif text-lg mb-4">
          当前无质询事件
        </div>
        <button
          onClick={() => setGamePage('dashboard')}
          className="btn-gold px-6 py-2"
        >
          返回总览
        </button>
      </div>
    )
  }

  const handleCardSelect = (card: DebateCard) => {
    setSelectedCard(card)
  }

  const handlePlayCard = () => {
    if (!selectedCard) return

    // 计算成功率
    const statValue = pmStats[selectedCard.dependsOn] ?? 50
    const successRate = Math.min(95, selectedCard.baseSuccessRate + statValue * 0.3)
    const success = Math.random() * 100 < successRate

    // 消耗政治资本
    if (selectedCard.cost > 0) {
      useGameStore.setState({
        pmStats: {
          ...pmStats,
          politicalCapital: Math.max(0, pmStats.politicalCapital - selectedCard.cost),
        },
      })
    }

    setResultSuccess(success)
    setShowResult(true)

    // 延迟应用效果
    setTimeout(() => {
      handleDebate(selectedCard.id, success)
    }, 2000)
  }

  const handleClose = () => {
    setShowResult(false)
    setSelectedCard(null)
    setGamePage('dashboard')
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          议 会 质 询
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
      </div>

      {/* 质询问题 */}
      <div className="doc-card p-6 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🎤</span>
          <h3 className="font-display text-lg font-bold text-gold">反对党领袖质问</h3>
        </div>
        <p className="font-serif text-sm text-parchment-200 leading-relaxed">
          {currentDebate.question}
        </p>
      </div>

      {/* 总理属性 */}
      <div className="doc-card p-4 mb-4">
        <div className="font-serif text-xs text-parchment-200/50 mb-2">总理属性</div>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="font-serif text-[10px] text-parchment-200/50">政治资本</div>
            <div className="font-mono text-lg font-bold text-blue-400">
              {pmStats.politicalCapital}
            </div>
          </div>
          <div>
            <div className="font-serif text-[10px] text-parchment-200/50">党内威望</div>
            <div className="font-mono text-lg font-bold text-purple-400">
              {pmStats.partyPrestige}
            </div>
          </div>
          <div>
            <div className="font-serif text-[10px] text-parchment-200/50">辩论技巧</div>
            <div className="font-mono text-lg font-bold text-green-400">
              {pmStats.rhetoric}
            </div>
          </div>
          <div>
            <div className="font-serif text-[10px] text-parchment-200/50">风险指数</div>
            <div className="font-mono text-lg font-bold text-red-400">
              {pmStats.riskIndex}
            </div>
          </div>
        </div>
      </div>

      {/* 手牌 */}
      <div className="font-serif text-sm font-semibold text-parchment-200 mb-3">
        选择应战策略
      </div>
      <div className="grid grid-cols-1 gap-3 mb-4">
        <AnimatePresence mode="popLayout">
          {currentDebate.cards.map((card, i) => {
            const isSelected = selectedCard?.id === card.id
            const statValue = pmStats[card.dependsOn] ?? 50
            const successRate = Math.min(95, card.baseSuccessRate + statValue * 0.3)

            return (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => handleCardSelect(card)}
                className={`text-left p-4 rounded border transition-all ${
                  isSelected
                    ? 'border-gold bg-gold/10 shadow-lg'
                    : 'border-gold/20 bg-ink-900/40 hover:border-gold/40 hover:bg-ink-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {card.dependsOn === 'rhetoric' ? '🗣️' : card.dependsOn === 'politicalCapital' ? '💰' : '🏛️'}
                    </span>
                    <span className="font-serif text-sm font-semibold text-parchment-100">
                      {card.name}
                    </span>
                  </div>
                  {isSelected && <span className="text-gold text-xs">✓ 已选</span>}
                </div>
                <p className="font-serif text-xs text-parchment-200/60 mb-2">
                  {card.description}
                </p>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono text-parchment-200/50">
                    依赖: {card.dependsOn === 'rhetoric' ? '辩论技巧' : card.dependsOn === 'politicalCapital' ? '政治资本' : '党内威望'}
                  </span>
                  <span className="font-mono text-green-400">
                    成功率: {Math.round(successRate)}%
                  </span>
                  {card.cost > 0 && (
                    <span className="font-mono text-orange-400">
                      消耗: {card.cost} 政治资本
                    </span>
                  )}
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {/* 出牌按钮 */}
      {selectedCard && !showResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <button
            onClick={handlePlayCard}
            className="flex-1 px-6 py-3 bg-gold text-ink-900 font-serif text-sm font-semibold rounded hover:bg-gold/80 transition-colors"
          >
            使用「{selectedCard.name}」
          </button>
          <button
            onClick={() => setSelectedCard(null)}
            className="px-6 py-3 bg-ink-900/50 text-parchment-200 font-serif text-sm rounded hover:bg-ink-900/70 transition-colors"
          >
            重新选择
          </button>
        </motion.div>
      )}

      {/* 结果展示 */}
      <AnimatePresence>
        {showResult && selectedCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/90 backdrop-blur-sm"
            onClick={handleClose}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="doc-card p-8 max-w-lg w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className="text-6xl mb-3">{resultSuccess ? '✨' : '💥'}</div>
                <h3 className={`font-display text-2xl font-bold ${resultSuccess ? 'text-green-400' : 'text-red-400'}`}>
                  {resultSuccess ? '质询成功' : '质询失败'}
                </h3>
              </div>
              <div className="font-serif text-sm text-parchment-200 leading-relaxed mb-4">
                {resultSuccess ? selectedCard.successNews.summary : selectedCard.failNews.summary}
              </div>
              <div className="signature-area">
                <div className="font-serif text-xs text-parchment-200/50 mb-2">效果</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(resultSuccess ? selectedCard.successEffects : selectedCard.failEffects).map(([key, value]) => {
                    const v = value ?? 0
                    if (v === 0) return null
                    return (
                      <span
                        key={key}
                        className={`font-mono text-xs ${v > 0 ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {key === 'approval' ? '民意' : key === 'prestige' ? '声望' : key === 'stability' ? '稳定' : key} {v > 0 ? '+' : ''}{v}
                      </span>
                    )
                  })}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="mt-6 w-full px-6 py-2 bg-gold text-ink-900 font-serif text-sm font-semibold rounded hover:bg-gold/80 transition-colors"
              >
                继续
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
