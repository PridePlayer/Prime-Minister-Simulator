import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { DAILY_ACTIONS } from '@/data/parliament'
import { getMaxActionsPerTurn } from '@/engine/eventEngine'

/** 总理日常行动面板 */
export default function DailyActionsPanel() {
  const turn = useGameStore((s) => s.turn)
  const pmActions = useGameStore((s) => s.pmActions)
  const executeDailyAction = useGameStore((s) => s.executeDailyAction)
  const currentEvent = useGameStore((s) => s.currentEvent)
  const currentEmergency = useGameStore((s) => s.currentEmergency)
  const actionsThisTurn = useGameStore((s) => s.actionsThisTurn)
  const pmTraitsNumeric = useGameStore((s) => s.pmTraitsNumeric)

  const maxActions = getMaxActionsPerTurn(useGameStore.getState())
  const healthLow = pmTraitsNumeric.health < 30
  // 有事件未处理 或 本月行动次数耗尽时禁用日常行动
  const disabled = !!(currentEvent || currentEmergency) || actionsThisTurn <= 0

  return (
    <div className="doc-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <span className="font-display text-sm font-semibold tracking-[0.25em] text-gold">
          总 理 行 动
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        {/* 行动次数显示 */}
        <span className={`font-mono text-[11px] px-2 py-0.5 rounded ${
          actionsThisTurn <= 0
            ? 'bg-red-900/20 text-red-800'
            : 'bg-gold/15 text-gold'
        }`}>
          {actionsThisTurn}/{maxActions}
        </span>
      </div>

      {/* 健康欠佳警告：行动次数受限 */}
      {healthLow && (
        <div className="card-seal rounded-sm bg-red-900/10 border border-red-900/20 p-2 text-center">
          <span className="font-serif text-[11px] text-red-800 italic">
            ⚠️ 总理健康欠佳，本月行动次数受限（{maxActions} 次）
          </span>
        </div>
      )}

      {/* 行动力耗尽提示 */}
      {actionsThisTurn <= 0 && (
        <div className="card-seal rounded-sm bg-parchment-texture p-2 text-center">
          <span className="font-serif text-[11px] text-ink-700 italic">
            本月行动次数已耗尽，下月重置
          </span>
        </div>
      )}

      {/* 事件未处理提示（仅在尚有行动次数时显示，避免与耗尽提示重复） */}
      {actionsThisTurn > 0 && (currentEvent || currentEmergency) && (
        <div className="card-seal rounded-sm bg-parchment-texture p-2 text-center">
          <span className="font-serif text-[11px] text-ink-700 italic">
            请先处理当前事件
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {DAILY_ACTIONS.map((action) => {
          const pmAction = pmActions.find((a) => a.id === action.id)
          const lastUsedTurn = pmAction?.lastUsedTurn ?? 0
          const cooldownRemaining = Math.max(0, action.cooldown - (turn - lastUsedTurn))
          const available = !disabled && action.available(useGameStore.getState(), { [action.id]: lastUsedTurn })

          return (
            <motion.button
              key={action.id}
              whileHover={available ? { scale: 1.02 } : {}}
              whileTap={available ? { scale: 0.98 } : {}}
              onClick={() => available && executeDailyAction(action.id)}
              disabled={!available}
              className={`card-seal rounded-sm bg-parchment-texture p-3 text-left transition-colors relative overflow-hidden ${
                available ? 'hover:bg-gold/10' : 'opacity-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{action.icon}</span>
                <span className="font-serif text-xs font-semibold text-ink-900">
                  {action.label}
                </span>
              </div>
              <p className="font-serif text-[10px] text-ink-700 leading-relaxed">
                {action.description}
              </p>
              {cooldownRemaining > 0 && (
                <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-ink-900/10 rounded">
                  <span className="font-mono text-[9px] text-ink-700">
                    {cooldownRemaining}月
                  </span>
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
