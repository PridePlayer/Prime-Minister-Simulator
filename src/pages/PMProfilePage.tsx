// 总理档案页：展示总理背景、性格特质（数值）、PMStats、个人生活、NPC 记忆
// 适配 SidePanel 最大宽度 640px，采用紧凑布局
import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { BACKGROUNDS, TRAIT_META, DEFAULT_PM_TRAITS } from '@/data/pmBackgrounds'
import { PLAYABLE_PARTIES } from '@/data/parties'
import type { PersonalLife } from '@/types/game'

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
  const personalLife = useGameStore((s) => s.personalLife)

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
      {/* ============ Hero 紧凑头部 ============ */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-4 overflow-hidden rounded-lg"
        style={{
          background:
            'linear-gradient(135deg, rgba(58,36,24,0.95) 0%, rgba(42,24,16,0.95) 100%)',
          border: '1px solid transparent',
          backgroundImage:
            'linear-gradient(135deg, rgba(58,36,24,0.95) 0%, rgba(42,24,16,0.95) 100%), linear-gradient(135deg, rgba(245,158,11,0.55), rgba(190,18,60,0.35), rgba(245,158,11,0.55))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        }}
      >
        {/* 装饰角线 */}
        <div className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 border-l-2 border-t-2 border-gold/60" />
        <div className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 border-r-2 border-t-2 border-gold/60" />
        <div className="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3 border-b-2 border-l-2 border-gold/60" />
        <div className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 border-b-2 border-r-2 border-gold/60" />

        <div className="relative px-4 py-3.5">
          <div className="flex items-center gap-3">
            {/* 总理徽章：SVG 剪影 */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-gold/60 bg-gradient-to-br from-ink-800 to-ink-950 shadow-gold">
              <svg
                viewBox="0 0 48 48"
                className="h-9 w-9"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="24" cy="24" r="20" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6" />
                <circle cx="24" cy="18" r="6" fill="#fbbf24" opacity="0.85" />
                <path d="M12 38 Q12 28 24 28 Q36 28 36 38 Z" fill="#fbbf24" opacity="0.85" />
                <path d="M20 32 L24 35 L28 32" stroke="#1c1410" strokeWidth="1" fill="none" />
              </svg>
              <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border border-gold/60 bg-ink-950 font-display text-[8px] font-bold text-gold">
                {pmName.slice(0, 1)}
              </span>
            </div>
            {/* 姓名 + 头衔 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-lg font-extrabold tracking-wider text-parchment-100 truncate">
                  {pmName}
                </h1>
                <span className="rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[9px] font-bold text-gold shrink-0">
                  第 {term} 届总理
                </span>
              </div>
              <div className="font-mono text-[10px] text-gold/80 mt-0.5">
                {countryName} · 执政第 {turn} 月
              </div>
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {bg && (
                  <span className="rounded-full border border-gold/30 bg-gold/10 px-1.5 py-0.5 font-serif text-[9px] text-gold">
                    {bg.icon} {bg.name}
                  </span>
                )}
                {party && (
                  <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-1.5 py-0.5 font-serif text-[9px] text-blue-300">
                    {party.icon} {party.name}
                  </span>
                )}
              </div>
            </div>
            {/* 密室游说按钮 */}
            <button
              onClick={startBackroomLobby}
              className="shrink-0 flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-900/30 px-2 py-1.5 font-serif text-[10px] font-semibold text-purple-300 transition-colors hover:bg-purple-800/50 hover:border-purple-400/60"
              title="深夜召集利益集团代表，在棋盘上展开游说博弈"
            >
              🌙 密室
            </button>
          </div>
        </div>
      </motion.div>

      {/* ============ 性格特质滑块 ============ */}
      <div className="doc-card p-3 mb-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">🧬</span>
            <span className="font-display text-sm font-bold tracking-wider text-parchment-100">
              性格特质
            </span>
          </div>
          <span className="font-mono text-[9px] text-parchment-200/40">
            事件可改变数值
          </span>
        </div>
        <div className="space-y-2">
          {TRAIT_META.map((meta) => {
            const value = pmTraitsNumeric[meta.key]
            const defaultValue = DEFAULT_PM_TRAITS[meta.key]
            const delta = value - defaultValue
            const isLow = meta.lowWarn !== undefined && value < meta.lowWarn
            const isHigh = meta.highWarn !== undefined && value > meta.highWarn
            // 颜色档位：<30 红，30-70 黄，>70 绿
            const rangeColor = value < 30 ? '#ef4444' : value <= 70 ? '#fbbf24' : '#10b981'
            const rangeBg = value < 30 ? 'rgba(239,68,68,0.1)' : value <= 70 ? 'rgba(251,191,36,0.1)' : 'rgba(16,185,129,0.1)'
            const rangeLabel = value < 30 ? '偏低' : value <= 70 ? '正常' : '优良'
            return (
              <div
                key={meta.key}
                className={`rounded-md border p-2 transition-colors ${
                  isLow ? 'border-red-500/40 bg-red-950/20'
                  : isHigh ? 'border-orange-500/40 bg-orange-950/20'
                  : 'border-gold/15 bg-ink-900/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm shrink-0">{meta.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif text-xs font-bold text-parchment-100">
                          {meta.label}
                        </span>
                        <span
                          className="rounded px-1 py-0.5 font-mono text-[8px] font-bold"
                          style={{ color: rangeColor, backgroundColor: rangeBg }}
                        >
                          {rangeLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {delta !== 0 && (
                      <span className={`font-mono text-[9px] ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    )}
                    <span className={`font-mono text-base font-bold ${
                      isLow ? 'text-red-400' : isHigh ? 'text-orange-400' : 'text-gold'
                    }`}>
                      {value}
                    </span>
                  </div>
                </div>
                {/* 滑块条 */}
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-ink-900/60">
                  {/* 30 与 70 刻度线 */}
                  <div className="absolute top-0 bottom-0 w-px bg-parchment-200/15" style={{ left: '30%' }} />
                  <div className="absolute top-0 bottom-0 w-px bg-parchment-200/15" style={{ left: '70%' }} />
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: rangeColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                {/* 描述 + 警告 */}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="font-serif text-[9px] text-parchment-200/45 truncate">
                    {meta.description}
                  </span>
                  {isLow && (
                    <span className="font-mono text-[9px] text-red-300/80 shrink-0">
                      ⚠ 偏低
                    </span>
                  )}
                  {isHigh && (
                    <span className="font-mono text-[9px] text-orange-300/80 shrink-0">
                      ⚠ 偏高
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ============ 执政资源（4 个紧凑卡片） ============ */}
      <div className="doc-card p-3 mb-3">
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-xs">💼</span>
          <span className="font-display text-sm font-bold tracking-wider text-parchment-100">
            执政资源
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'politicalCapital', label: '政治资本', icon: '💼', color: '#fbbf24', desc: '核心消耗资源' },
            { key: 'partyPrestige', label: '党内威望', icon: '🏛️', color: '#10b981', desc: '低于临界触发挑战' },
            { key: 'rhetoric', label: '辩论技巧', icon: '🗣️', color: '#3b82f6', desc: '影响质询成功率' },
            { key: 'riskIndex', label: '风险指数', icon: '⚠️', color: '#ef4444', desc: '负面事件积累度' },
          ].map((m) => {
            const value = pmStats[m.key as keyof typeof pmStats]
            return (
              <div
                key={m.key}
                className="rounded-md border border-gold/15 bg-ink-900/40 p-2 hover:border-gold/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-xs shrink-0">{m.icon}</span>
                    <span className="font-serif text-[10px] text-parchment-200/70 truncate">{m.label}</span>
                  </div>
                  <span className="font-mono text-base font-bold" style={{ color: m.color }}>
                    {value}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-ink-900/60">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: m.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, value)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <div className="font-serif text-[8px] text-parchment-200/35 mt-0.5 truncate">
                  {m.desc}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ============ 个人生活：3 个迷你仪表 ============ */}
      <PersonalLifePanel personalLife={personalLife} />

      {/* ============ 背景故事卡 ============ */}
      {bg && (
        <div className="doc-card p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs">📜</span>
            <span className="font-display text-sm font-bold tracking-wider text-parchment-100">
              背景故事
            </span>
          </div>
          <p className="font-serif text-[11px] text-parchment-200/65 leading-relaxed">
            {bg.description}
          </p>
          {bg.effects.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {bg.effects.map((eff, i) => (
                <span
                  key={i}
                  className="rounded bg-gold/10 px-1.5 py-0.5 font-mono text-[9px] text-gold/80 border border-gold/20"
                >
                  {eff}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ NPC 记忆（总理与他人的互动历史） ============ */}
      {npcMemories.length > 0 && (
        <div className="doc-card p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs">🤝</span>
            <span className="font-display text-sm font-bold tracking-wider text-parchment-100">
              人际关系记录
            </span>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {npcMemories.map((mem) => (
              <div
                key={mem.npcId}
                className={`rounded-md border p-2 ${
                  mem.tone === 'hostile' ? 'border-red-500/30 bg-red-950/20'
                  : mem.tone === 'resentful' ? 'border-orange-500/30 bg-orange-950/20'
                  : mem.tone === 'friendly' ? 'border-emerald-500/30 bg-emerald-950/20'
                  : 'border-gold/15 bg-ink-900/40'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-serif text-[11px] font-bold text-parchment-100">
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
                    <div key={i} className="font-serif text-[9px] text-parchment-200/55">
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

/** 个人生活面板：家庭关系 / 黑金腐败 / 心理压力三个维度 */
function PersonalLifePanel({ personalLife }: { personalLife: PersonalLife }) {
  // 三个维度的元信息（颜色、阈值、警告文案）
  const dims: {
    key: keyof Pick<PersonalLife, 'familyRelation' | 'corruption' | 'stress'>
    label: string
    icon: string
    desc: string
    positive: boolean // true=越高越好（家庭），false=越高越糟（腐败/压力）
    warnHigh: number
    warnLow: number
    dangerText: string
    warningText: string
    healthyText: string
    color: string
  }[] = [
    {
      key: 'familyRelation',
      label: '家庭关系',
      icon: '💍',
      desc: '与配偶子女的亲密程度。长期冷落家人会触发家庭危机。',
      positive: true,
      warnHigh: 100,
      warnLow: 30,
      dangerText: '婚姻濒临破裂，子女疏远',
      warningText: '家人对你颇有怨言',
      healthyText: '家庭和睦，避风港',
      color: '#10b981', // 翡翠
    },
    {
      key: 'corruption',
      label: '黑金腐败',
      icon: '🕶️',
      desc: '私下利益输送与海外资产积累。高腐败会引爆丑闻。',
      positive: false,
      warnHigh: 55,
      warnLow: 0,
      dangerText: '调查记者已嗅到风声',
      warningText: '黑金网络越滚越大',
      healthyText: '清白可昭，无破绽',
      color: '#a855f7', // 紫
    },
    {
      key: 'stress',
      label: '心理压力',
      icon: '🌀',
      desc: '长期高压会损害健康、削弱决策果断性。',
      positive: false,
      warnHigh: 70,
      warnLow: 0,
      dangerText: '濒临崩溃，需强制休假',
      warningText: '弦绷得太紧，需宣泄',
      healthyText: '精力充沛，应对自如',
      color: '#fb923c', // 橙
    },
  ]

  return (
    <div className="doc-card p-3 mb-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">🏠</span>
          <span className="font-display text-sm font-bold tracking-wider text-parchment-100">
            个人生活
          </span>
        </div>
        <div className="font-mono text-[9px] text-parchment-200/40">
          配偶：{personalLife.spouseName}
        </div>
      </div>

      <div className="space-y-2">
        {dims.map((d) => {
          const v = personalLife[d.key]
          const isDanger = d.positive ? v < d.warnLow : v >= d.warnHigh
          const isWarn = d.positive
            ? v < 50
            : v >= 40 && v < d.warnHigh
          const statusText = isDanger
            ? d.dangerText
            : isWarn
              ? d.warningText
              : d.healthyText
          return (
            <div
              key={d.key}
              className={`rounded-md border p-2 transition-colors ${
                isDanger
                  ? 'border-red-500/40 bg-red-950/20'
                  : isWarn
                    ? 'border-orange-500/30 bg-orange-950/10'
                    : 'border-gold/15 bg-ink-900/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">{d.icon}</span>
                  <span className="font-serif text-[11px] font-bold text-parchment-100">
                    {d.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`font-mono text-sm font-bold ${
                      isDanger ? 'text-red-400' : isWarn ? 'text-orange-400' : 'text-gold'
                    }`}
                  >
                    {Math.round(v)}
                  </span>
                  <span
                    className={`rounded px-1 py-0.5 font-mono text-[8px] font-bold ${
                      isDanger
                        ? 'bg-red-500/20 text-red-300'
                        : isWarn
                          ? 'bg-orange-500/15 text-orange-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    {isDanger ? '危险' : isWarn ? '警戒' : '健康'}
                  </span>
                </div>
              </div>
              {/* 仪表条 */}
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-ink-900/60">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: d.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${v}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span
                  className={`font-mono text-[8px] ${
                    isDanger ? 'text-red-300/80' : isWarn ? 'text-orange-300/70' : 'text-parchment-200/40'
                  }`}
                >
                  {isDanger ? '⚠ ' : isWarn ? '● ' : '✓ '}
                </span>
                <span className="font-serif text-[9px] text-parchment-200/55 truncate">
                  {statusText}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
