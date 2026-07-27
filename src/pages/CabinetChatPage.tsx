import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import MetricEffectBadge from '@/components/MetricEffectBadge'
import type { CabinetChatOption, CabinetMember } from '@/types/game'

/** 内阁聊天页面（手机聊天软件风格）
 *  左侧：部长会话列表
 *  右侧：当前选中部长的聊天界面
 *  部长发来消息附带选项，总理点击选项回应，可选择开除
 */
export default function CabinetChatPage() {
  const cabinet = useGameStore((s) => s.cabinet)
  const cabinetChats = useGameStore((s) => s.cabinetChats)
  const totalDays = useGameStore((s) => s.totalDays)
  const [selectedMinisterId, setSelectedMinisterId] = useState<string | null>(
    (() => {
      // 优先从 sessionStorage 读取内阁名单页传来的"待打开"部长 id
      try {
        const pending = sessionStorage.getItem('cabinet_chat_pending_id')
        if (pending) {
          sessionStorage.removeItem('cabinet_chat_pending_id')
          return pending
        }
      } catch { /* 忽略 */ }
      return cabinet[0]?.id ?? null
    })(),
  )

  // 自动选中第一位有未读消息的部长
  useEffect(() => {
    if (!selectedMinisterId && cabinet.length > 0) {
      setSelectedMinisterId(cabinet[0].id)
    }
  }, [cabinet, selectedMinisterId])

  const selectedMember = cabinet.find((c) => c.id === selectedMinisterId) ?? null
  const selectedThread = cabinetChats.find((t) => t.ministerId === selectedMinisterId) ?? null

  // 计算每个部长的未读消息数（带未回应选项的 minister 消息视为未读）
  const unreadCount = (ministerId: string): number => {
    const thread = cabinetChats.find((t) => t.ministerId === ministerId)
    if (!thread) return 0
    return thread.messages.filter((m) => m.sender === 'minister' && m.options && !m.resolved).length
  }

  const totalUnread = cabinet.reduce((sum, c) => sum + unreadCount(c.id), 0)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          内 阁 聊 天
        </span>
        {totalUnread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="rounded-full bg-red-500 px-2 py-0.5 font-mono text-[10px] font-bold text-white"
          >
            {totalUnread} 未读
          </motion.span>
        )}
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        <span className="font-mono text-[10px] text-parchment-200/40">
          💬 部长会定期发来请求与汇报
        </span>
      </div>

      {/* 手机聊天软件风格：左侧会话列表 + 右侧聊天窗口 */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* 左侧：会话列表 */}
        <div className="w-64 shrink-0 doc-card p-2 overflow-y-auto">
          <div className="font-serif text-xs text-parchment-200/60 px-2 py-1 mb-1">
            会话列表
          </div>
          {cabinet.map((member) => {
            const unread = unreadCount(member.id)
            const isSelected = member.id === selectedMinisterId
            return (
              <button
                key={member.id}
                onClick={() => setSelectedMinisterId(member.id)}
                className={`w-full text-left p-2 rounded transition-colors mb-1 ${
                  isSelected
                    ? 'bg-gold/15 border border-gold/30'
                    : 'hover:bg-ink-700/40 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center font-serif text-xs font-bold text-white">
                      {member.name.charAt(0)}
                    </div>
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 flex items-center justify-center font-mono text-[9px] font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-serif text-xs font-semibold text-parchment-100 truncate">
                        {member.name}
                      </span>
                      {member.loyalty < 45 && (
                        <span className="text-[10px]">⚠️</span>
                      )}
                    </div>
                    <div className="font-mono text-[9px] text-parchment-200/50 truncate">
                      {member.role}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* 右侧：聊天窗口 */}
        <div className="flex-1 doc-card flex flex-col overflow-hidden">
          {selectedMember ? (
            <ChatWindow
              member={selectedMember}
              messages={selectedThread?.messages ?? []}
              totalDays={totalDays}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-parchment-200/40 font-serif text-sm">
              请从左侧选择一位部长开始对话
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** 聊天窗口 */
function ChatWindow({
  member,
  messages,
  totalDays,
}: {
  member: CabinetMember
  messages: import('@/types/game').CabinetChatMessage[]
  totalDays: number
}) {
  const resolveCabinetChat = useGameStore((s) => s.resolveCabinetChat)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const handleResolve = async (messageId: string, option: CabinetChatOption) => {
    resolveCabinetChat(member.id, messageId, option.id)
    // 不再每次决策都自动存档，依赖 15 分钟周期自动存档 + 手动存档
  }

  return (
    <>
      {/* 顶部：部长信息 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gold/15 bg-ink-900/40">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center font-serif text-sm font-bold text-white">
          {member.name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="font-serif text-sm font-semibold text-parchment-100">
            {member.name}
          </div>
          <div className="font-mono text-[10px] text-parchment-200/60">
            {member.role} · 忠诚度 {member.loyalty}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[9px] text-parchment-200/40">当前天数</div>
          <div className="font-mono text-xs text-gold">{totalDays}</div>
        </div>
      </div>

      {/* 消息列表（手机聊天风格：左/右气泡） */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-ink-grid/30">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <div className="text-4xl opacity-30">💭</div>
            <div className="font-serif text-xs text-parchment-200/50">
              暂无消息
            </div>
            <div className="font-mono text-[10px] text-parchment-200/30">
              该部长会在游戏中定期发来汇报与请求
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isPM = msg.sender === 'pm'
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${isPM ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                    isPM
                      ? 'bg-gradient-to-br from-amber-700/80 to-amber-900/80 text-parchment-100 rounded-br-sm'
                      : 'bg-ink-800/80 text-parchment-200 rounded-bl-sm border border-gold/15'
                  }`}
                >
                  {/* 消息文本 */}
                  <p className="font-serif text-[13px] leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </p>

                  {/* 时间戳 */}
                  <div
                    className={`mt-1 font-mono text-[9px] ${
                      isPM ? 'text-parchment-200/50' : 'text-parchment-200/40'
                    }`}
                  >
                    第 {msg.day} 天
                  </div>

                  {/* 选项列表（仅 minister 消息附带） */}
                  {!isPM && msg.options && msg.options.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {msg.resolved ? (
                        <div className="text-[10px] text-parchment-200/40 italic">
                          {msg.selectedOptionId
                            ? `已选择：${msg.options.find((o) => o.id === msg.selectedOptionId)?.label}`
                            : '已回应'}
                        </div>
                      ) : (
                        msg.options.map((opt) => (
                          <OptionButton
                            key={opt.id}
                            option={opt}
                            disabled={msg.resolved}
                            onClick={() => handleResolve(msg.id, opt)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-2 border-t border-gold/15 bg-ink-900/40">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-parchment-200/50">
            💡 部长每月可能发来消息，回复会影响指标与忠诚度
          </span>
          <span className="font-mono text-[10px] text-parchment-200/40">
            可在选项中选择「开除」直接换人
          </span>
        </div>
      </div>
    </>
  )
}

/** 选项按钮（带效果预览） */
function OptionButton({
  option,
  disabled,
  onClick,
}: {
  option: CabinetChatOption
  disabled: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const isDismiss = option.dismiss
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        disabled={disabled}
        onClick={onClick}
        className={`w-full text-left p-2 rounded-lg border transition-all ${
          isDismiss
            ? 'border-red-600/40 bg-red-900/20 hover:bg-red-800/40 text-red-200'
            : 'border-gold/30 bg-ink-900/50 hover:bg-gold/15 hover:border-gold/50 text-parchment-100'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-1 mb-0.5">
          {isDismiss && <span className="text-[10px]">🔥</span>}
          <span className="font-serif text-xs font-semibold">
            {option.label}
          </span>
        </div>
        {option.description && (
          <div className="font-serif text-[10px] text-parchment-200/50 mb-1">
            {option.description}
          </div>
        )}
        {/* 效果预览（内阁聊天选项始终显示效果，不受困难模式影响） */}
        {option.effects && Object.keys(option.effects).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(option.effects).map(([key, val]) => (
              <MetricEffectBadge
                key={key}
                metricKey={key}
                value={val ?? 0}
                variant="dark"
              />
            ))}
          </div>
        )}
        {/* 忠诚度变化 */}
        {option.loyaltyChange !== undefined && option.loyaltyChange !== 0 && (
          <div className="mt-1">
            <span
              className={`font-mono text-[10px] ${
                option.loyaltyChange > 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              ❤️ 忠诚 {option.loyaltyChange > 0 ? '+' : ''}{option.loyaltyChange}
            </span>
          </div>
        )}
      </button>
    </div>
  )
}
