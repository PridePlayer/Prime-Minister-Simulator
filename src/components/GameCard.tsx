// 单张卡牌组件：HTML5 拖拽 + 古朴政坛风格框体
import type { Card, CardHandItem } from '@/types/game'
import { useGameStore } from '@/store/gameStore'
import { calcSuccessRate, checkResources, checkConditions, checkSlotAccepts } from '@/engine/cardEngine'

const COLOR_STYLES: Record<Card['color'], {
  border: string
  bg: string
  glow: string
  text: string
  label: string
}> = {
  red:    { border: 'border-red-500/60',    bg: 'from-red-900/40 to-ink-900',     glow: 'shadow-red-500/30',    text: 'text-red-200',    label: 'bg-red-500/20' },
  yellow: { border: 'border-yellow-500/60', bg: 'from-yellow-900/40 to-ink-900',  glow: 'shadow-yellow-500/30', text: 'text-yellow-200', label: 'bg-yellow-500/20' },
  blue:   { border: 'border-blue-500/60',   bg: 'from-blue-900/40 to-ink-900',    glow: 'shadow-blue-500/30',   text: 'text-blue-200',   label: 'bg-blue-500/20' },
  purple: { border: 'border-purple-500/60', bg: 'from-purple-900/40 to-ink-900',  glow: 'shadow-purple-500/30', text: 'text-purple-200', label: 'bg-purple-500/20' },
  green:  { border: 'border-emerald-500/60',bg: 'from-emerald-900/40 to-ink-900', glow: 'shadow-emerald-500/30',text: 'text-emerald-200',label: 'bg-emerald-500/20' },
  black:  { border: 'border-gray-700/80',   bg: 'from-gray-900/60 to-ink-900',    glow: 'shadow-gray-700/40',   text: 'text-gray-200',   label: 'bg-gray-700/40' },
  gray:   { border: 'border-slate-600/60',  bg: 'from-slate-900/40 to-ink-900',   glow: 'shadow-slate-600/30',  text: 'text-slate-200',  label: 'bg-slate-600/30' },
}

const CATEGORY_LABEL: Record<Card['category'], string> = {
  PMQs: '议会质询',
  BACKROOM: '密室政治',
  LEAK: '黑料爆料',
  SPIN: '舆论洗白',
  WHIP: '党鞭调度',
  DOSSIER: '黑料卡',
}

interface GameCardProps {
  card: Card
  handItem?: CardHandItem
  /** 是否处于可拖拽状态（手牌栏中为 true，槽位中预览为 false） */
  draggable?: boolean
  /** 是否高亮（鼠标悬停槽位时） */
  highlighted?: boolean
  /** 是否处于不可用状态（资源/条件不足） */
  disabled?: boolean
  /** 卡牌宽度像素 */
  width?: number
}

export default function GameCard({
  card,
  handItem,
  draggable = false,
  highlighted = false,
  disabled = false,
  width = 150,
}: GameCardProps) {
  const state = useGameStore()
  const slot = state.activeCardEvent
  const style = COLOR_STYLES[card.color]

  // 计算该卡牌在当前状态下的可用性
  const accepted = slot ? checkSlotAccepts(card, slot) : true
  const resourcesOk = checkResources(card, state)
  const condCheck = checkConditions(card, state, handItem)
  const usable = accepted && resourcesOk && condCheck.ok && !disabled

  // 成功率
  const successRate = Math.round(calcSuccessRate(card, state, slot))

  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable || !usable || !handItem) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData('text/plain', JSON.stringify({
      handItemId: handItem.instanceId,
      cardId: card.id,
    }))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable={draggable && usable}
      onDragStart={handleDragStart}
      style={{ width }}
      className={`
        relative shrink-0 cursor-grab select-none rounded-md border-2 bg-gradient-to-b ${style.bg}
        ${style.border} ${usable ? style.glow : ''} shadow-lg
        ${highlighted ? 'ring-2 ring-gold ring-offset-2 ring-offset-ink-900' : ''}
        ${usable ? '' : 'opacity-50 grayscale'}
        transition-all duration-200
        ${draggable && usable ? 'hover:-translate-y-2 hover:scale-105 active:scale-98' : ''}
      `}
    >
      {/* 卡牌顶部：图标 + 类别标签 */}
      <div className="flex items-center justify-between px-2 pt-2">
        <span className="text-xl drop-shadow">{card.icon}</span>
        <span className={`rounded-sm px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider text-parchment-100 ${style.label}`}>
          {CATEGORY_LABEL[card.category]}
        </span>
      </div>

      {/* 卡牌名称 */}
      <div className="px-2 pt-1">
        <div className={`font-serif text-sm font-bold leading-tight ${style.text}`}>
          {card.name}
        </div>
      </div>

      {/* 装饰分隔线 */}
      <div className="mx-2 my-1 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {/* 卡牌描述 */}
      <div className="px-2 pb-1">
        <p className="font-serif text-[10px] leading-tight text-parchment-200/70 line-clamp-4">
          {card.description}
        </p>
      </div>

      {/* 卡牌消耗 */}
      <div className="px-2 py-1 space-y-0.5 border-t border-gold/10 bg-ink-900/40">
        {card.cost.politicalCapital ? (
          <div className="flex items-center gap-1 font-mono text-[9px] text-parchment-200/80">
            <span>💼</span>
            <span>{card.cost.politicalCapital}</span>
            <span className="text-parchment-200/40">政治资本</span>
          </div>
        ) : null}
        {card.cost.treasury ? (
          <div className="flex items-center gap-1 font-mono text-[9px] text-parchment-200/80">
            <span>💰</span>
            <span>{card.cost.treasury}</span>
            <span className="text-parchment-200/40">亿</span>
          </div>
        ) : null}
        {card.cost.riskIndex ? (
          <div className="flex items-center gap-1 font-mono text-[9px] text-red-300/80">
            <span>⚠️</span>
            <span>+{card.cost.riskIndex}</span>
            <span className="text-parchment-200/40">风险</span>
          </div>
        ) : null}
        {card.cost.dossierCardId ? (
          <div className="flex items-center gap-1 font-mono text-[9px] text-gray-300/80">
            <span>📁</span>
            <span>1 张黑料</span>
          </div>
        ) : null}
        {card.cost.dismissMinisterLoyaltyBelow !== undefined ? (
          <div className="flex items-center gap-1 font-mono text-[9px] text-amber-300/80">
            <span>👥</span>
            <span>解职大臣</span>
          </div>
        ) : null}
      </div>

      {/* 成功率 */}
      <div className="px-2 py-1 border-t border-gold/10">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[8px] tracking-wider text-parchment-200/50">成功率</span>
          <span
            className={`font-mono text-[10px] font-bold ${
              successRate >= 80 ? 'text-emerald-300'
              : successRate >= 50 ? 'text-yellow-300'
              : successRate > 0 ? 'text-orange-300'
              : 'text-red-300'
            }`}
          >
            {successRate}%
          </span>
        </div>
        <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-ink-700">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${successRate}%`,
              backgroundColor: successRate >= 80 ? '#10b981' : successRate >= 50 ? '#fbbf24' : successRate > 0 ? '#fb923c' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* 不可用原因 */}
      {!usable && draggable && (
        <div className="absolute inset-x-0 bottom-0 rounded-b-md bg-red-950/80 px-2 py-1 text-center">
          <span className="font-mono text-[8px] text-red-200">
            {!accepted ? '此事件不接受该卡牌'
              : !resourcesOk ? '资源不足'
              : condCheck.reason || '不可用'}
          </span>
        </div>
      )}
    </div>
  )
}
