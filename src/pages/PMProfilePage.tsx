// 总理档案页：展示总理背景、性格特质（数值）、PMStats、NPC 记忆
import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { BACKGROUNDS, TRAIT_META, DEFAULT_PM_TRAITS } from '@/data/pmBackgrounds'
import { PLAYABLE_PARTIES } from '@/data/parties'
import type { PMTraits } from '@/types/game'

export default function PMProfilePage() {
  const pmName = useGameStore((s) => s.pmName)
  const countryName = useGameStore((s) => s.countryName)
  const pmBackground = useGameStore((s) => s.pmBackground)
  const pmStats = useGameStore((s) => s.pmStats)
  const pmTraitsNumeric = useGameStore((s) => s.pmTraitsNumeric)
  const playerPartyId = useGameStore((s) => s.playerPartyId)
  const term = useGameStore((s) => s.term)
  const turn = useGameStore((s) => s.turn)
  const npcMemories = useGameStore((s) => s.npcMemories)
  const cabinet = useGameStore((s) => s.cabinet)
  const parties = useGameStore((s) => s.parties)
  const startBackroomLobby = useGameStore((s) => s.startBackroomLobby)

  const bg = BACKGROUNDS.find((b) => b.id === pmBackground)
  const party = PLAYABLE_PARTIES.find((p) => p.id === playerPartyId)

  /** 根据 npcId 查找显示名称：先查内阁部长，再查党派，最后回退到 ID */
  const getNpcDisplayName = (npcId: string): string => {
    const minister = cabinet.find((m) => m.id === npcId)
    if (minister) return minister.name
    const partyObj = parties.find((p) => p.id === npcId)
    if (partyObj) return partyObj.name
    // 形如 "minister_xxx" / "party_xxx" 的回退显示
    return npcId.replace(/^(minister_|party_|npc_)/, '').replace(/_/g, ' ')
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          总 理 档 案
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        <button
          onClick={startBackroomLobby}
          className="flex items-center gap-1.5 rounded-md border border-purple-500/40 bg-purple-900/30 px-3 py-1.5 font-serif text-xs font-semibold text-purple-300 transition-colors hover:bg-purple-800/50 hover:border-purple-400/60"
          title="深夜召集利益集团代表，在棋盘上展开游说博弈"
        >
          🌙 密室游说
        </button>
      </div>

      {/* 基本信息 */}
      <div className="doc-card p-5 mb-4">
        <div className="flex items-center gap-4">
          {/* 总理徽章：SVG 替代 emoji 🪪，确保跨平台一致显示 */}
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-gold/60 bg-gradient-to-br from-ink-800 to-ink-950 shadow-gold">
            <svg
              viewBox="0 0 48 48"
              className="h-10 w-10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* 徽章外圈 */}
              <circle cx="24" cy="24" r="20" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6" />
              {/* 人像剪影：头 */}
              <circle cx="24" cy="18" r="6" fill="#fbbf24" opacity="0.85" />
              {/* 人像剪影：肩 */}
              <path
                d="M12 38 Q12 28 24 28 Q36 28 36 38 Z"
                fill="#fbbf24"
                opacity="0.85"
              />
              {/* 领章 */}
              <path d="M20 32 L24 35 L28 32" stroke="#1c1410" strokeWidth="1" fill="none" />
            </svg>
            {/* 总理名首字浮层 */}
            <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border border-gold/60 bg-ink-950 font-display text-[9px] font-bold text-gold">
              {pmName.slice(0, 1)}
            </span>
          </div>
          <div className="flex-1">
            <div className="font-display text-xl font-bold text-parchment-100">
              {pmName}
            </div>
            <div className="font-mono text-xs text-gold/80 mt-0.5">
              {countryName} · 第 {term} 届总理 · 执政第 {turn} 月
            </div>
            <div className="flex gap-2 mt-2">
              {bg && (
                <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 font-serif text-[10px] text-gold">
                  {bg.icon} {bg.name}
                </span>
              )}
              {party && (
                <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5 font-serif text-[10px] text-blue-300">
                  {party.icon} {party.name}
                </span>
              )}
            </div>
          </div>
        </div>
        {bg && (
          <div className="mt-3 font-serif text-xs text-parchment-200/60 leading-relaxed">
            {bg.description}
          </div>
        )}
      </div>

      {/* 性格特质（数值化） */}
      <div className="doc-card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-serif text-sm font-semibold text-parchment-200">
            性格特质
          </div>
          <div className="font-mono text-[10px] text-parchment-200/40">
            游戏中事件可改变这些数值
          </div>
        </div>
        <div className="space-y-3">
          {TRAIT_META.map((meta) => {
            const value = pmTraitsNumeric[meta.key]
            const defaultValue = DEFAULT_PM_TRAITS[meta.key]
            const delta = value - defaultValue
            const isLow = meta.lowWarn !== undefined && value < meta.lowWarn
            const isHigh = meta.highWarn !== undefined && value > meta.highWarn
            return (
              <div key={meta.key} className={`rounded-md border p-3 transition-colors ${
                isLow ? 'border-red-500/40 bg-red-950/20'
                : isHigh ? 'border-orange-500/40 bg-orange-950/20'
                : 'border-gold/20 bg-ink-900/40'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.icon}</span>
                    <div>
                      <div className="font-serif text-sm font-bold text-parchment-100">
                        {meta.label}
                      </div>
                      <div className="font-serif text-[10px] text-parchment-200/50 leading-tight">
                        {meta.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {delta !== 0 && (
                      <span className={`font-mono text-[10px] ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    )}
                    <span className={`font-mono text-xl font-bold ${
                      isLow ? 'text-red-400' : isHigh ? 'text-orange-400' : 'text-gold'
                    }`}>
                      {value}
                    </span>
                  </div>
                </div>
                {/* 进度条 */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-900/60">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: isLow ? '#ef4444' : isHigh ? '#fb923c' : '#fbbf24',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                {/* 警告提示 */}
                {isLow && (
                  <div className="mt-2 font-mono text-[10px] text-red-300/80">
                    ⚠ {meta.label}过低{meta.lowWarn !== undefined ? `（< ${meta.lowWarn}）` : ''}，可能触发负面事件
                  </div>
                )}
                {isHigh && (
                  <div className="mt-2 font-mono text-[10px] text-orange-300/80">
                    ⚠ {meta.label}过高{meta.highWarn !== undefined ? `（> ${meta.highWarn}）` : ''}，可能引发副作用
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* PMStats 资源 */}
      <div className="doc-card p-5 mb-4">
        <div className="font-serif text-sm font-semibold text-parchment-200 mb-3">
          执政资源
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'politicalCapital', label: '政治资本', icon: '💼', color: '#fbbf24' },
            { key: 'partyPrestige', label: '党内威望', icon: '🏛️', color: '#10b981' },
            { key: 'rhetoric', label: '辩论技巧', icon: '🗣️', color: '#3b82f6' },
            { key: 'riskIndex', label: '风险指数', icon: '⚠️', color: '#ef4444' },
          ].map((m) => {
            const value = pmStats[m.key as keyof typeof pmStats]
            return (
              <div key={m.key} className="rounded-md border border-gold/20 bg-ink-900/40 p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span>{m.icon}</span>
                    <span className="font-serif text-xs text-parchment-200/80">{m.label}</span>
                  </div>
                  <span className="font-mono text-lg font-bold" style={{ color: m.color }}>
                    {value}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/60">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: m.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* NPC 记忆（总理与他人的互动历史） */}
      {npcMemories.length > 0 && (
        <div className="doc-card p-5 mb-4">
          <div className="font-serif text-sm font-semibold text-parchment-200 mb-3">
            人际关系记录
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {npcMemories.map((mem) => (
              <div
                key={mem.npcId}
                className={`rounded-md border p-2.5 ${
                  mem.tone === 'hostile' ? 'border-red-500/30 bg-red-950/20'
                  : mem.tone === 'resentful' ? 'border-orange-500/30 bg-orange-950/20'
                  : mem.tone === 'friendly' ? 'border-emerald-500/30 bg-emerald-950/20'
                  : 'border-gold/20 bg-ink-900/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-serif text-xs font-bold text-parchment-100">
                    {getNpcDisplayName(mem.npcId)}
                  </span>
                  <span className={`font-mono text-[9px] ${
                    mem.tone === 'hostile' ? 'text-red-300'
                    : mem.tone === 'resentful' ? 'text-orange-300'
                    : mem.tone === 'friendly' ? 'text-emerald-300'
                    : 'text-parchment-200/60'
                  }`}>
                    {mem.tone === 'hostile' ? '敌对' : mem.tone === 'resentful' ? '怨恨' : mem.tone === 'friendly' ? '友好' : '中立'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {mem.events.slice(-3).map((ev, i) => (
                    <div key={i} className="font-serif text-[10px] text-parchment-200/60">
                      · {ev.description}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
