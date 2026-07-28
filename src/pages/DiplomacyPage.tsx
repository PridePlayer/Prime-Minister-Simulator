import { useState } from 'react'
import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import {
  DIPLOMATIC_ACTIONS,
  RELATION_COLORS,
} from '@/data/diplomacy'
import type { ForeignCountry, DiplomaticActionDef } from '@/types/game'

/**
 * 外交页面
 * - 左侧：外国列表（旗帜、关系等级、综合国力）
 * - 右侧：选中国家的详情面板 + 可用外交行动
 * - 战争进行中：禁用所有外交行动（由 WarEventDialog 接管）
 */
export default function DiplomacyPage() {
  const countries = useGameStore((s) => s.countries)
  const activeWar = useGameStore((s) => s.activeWar)
  const warHistory = useGameStore((s) => s.warHistory)
  const [selectedId, setSelectedId] = useState<string>(countries[0]?.id ?? '')

  const selected = countries.find((c) => c.id === selectedId) ?? countries[0]

  return (
    <div className="flex flex-col h-full">
      {/* 顶部标题 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          外 交 部
        </span>
        <span className="font-mono text-[11px] text-parchment-200/60">
          共 {countries.length} 个国家
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        {activeWar && (
          <span className="rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1 font-mono text-[10px] font-bold text-red-300">
            ⚔️ 战争进行中 · 对 {activeWar.enemyCountryName}
          </span>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-0">
        {/* 左侧国家列表 */}
        <div className="overflow-y-auto pr-1 space-y-1.5">
          {countries.map((c) => {
            const rel = c.relationLevel
            const color = RELATION_COLORS[rel]
            const isSelected = c.id === selectedId
            return (
              <motion.button
                key={c.id}
                whileHover={{ x: 2 }}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left rounded border p-2.5 transition-all ${
                  isSelected
                    ? 'border-gold/60 bg-gold/10'
                    : 'border-gold/15 bg-ink-900/40 hover:border-gold/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xl">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-sm font-bold text-parchment-100 truncate">
                      {c.name}
                    </div>
                    <div className="font-mono text-[9px] text-parchment-200/40">
                      {c.isNeighbor ? '邻国 · ' : ''}{c.government}政体
                    </div>
                  </div>
                  {c.nuclear && <span className="text-xs" title="核武国家">☢️</span>}
                </div>
                {/* 关系条 */}
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-ink-900/60 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${c.relation}%`, backgroundColor: color }}
                    />
                  </div>
                  <span
                    className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${color}25`, color }}
                  >
                    {rel}
                  </span>
                </div>
              </motion.button>
            )
          })}

          {/* 战争历史 */}
          {warHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gold/10">
              <div className="font-mono text-[9px] text-parchment-200/40 mb-1.5">战争档案</div>
              {warHistory.map((w, i) => (
                <div
                  key={i}
                  className="rounded bg-ink-900/40 px-2 py-1 mb-1 font-serif text-[10px] text-parchment-200/60"
                >
                  第 {w.turn} 月 · 对 {w.enemy} ·{' '}
                  <span className={
                    w.outcome === 'victory' ? 'text-emerald-400' :
                    w.outcome === 'defeat' ? 'text-red-400' :
                    w.outcome === 'pyrrhic' ? 'text-orange-400' : 'text-yellow-400'
                  }>
                    {w.outcome === 'victory' ? '胜利' :
                     w.outcome === 'defeat' ? '战败' :
                     w.outcome === 'pyrrhic' ? '惨胜' : '僵局'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧详情 */}
        {selected && (
          <CountryDetailPanel
            country={selected}
            atWar={!!activeWar}
          />
        )}
      </div>
    </div>
  )
}

/** 国家详情面板 */
function CountryDetailPanel({ country, atWar }: { country: ForeignCountry; atWar: boolean }) {
  const executeDiplomaticAction = useGameStore((s) => s.executeDiplomaticAction)
  const pmStats = useGameStore((s) => s.pmStats)
  const metrics = useGameStore((s) => s.metrics)
  const turn = useGameStore((s) => s.turn)
  const [confirming, setConfirming] = useState<string | null>(null)

  const color = RELATION_COLORS[country.relationLevel]

  /** 判断某项外交行动是否可用，并解释不可用原因 */
  const checkAction = (action: DiplomaticActionDef): { ok: boolean; reason?: string } => {
    if (atWar) return { ok: false, reason: '战争期间所有外交活动暂停' }
    if (action.minRelation !== undefined && country.relation < action.minRelation) {
      return { ok: false, reason: `关系不足（需 ≥ ${action.minRelation}）` }
    }
    if (action.maxRelation !== undefined && country.relation > action.maxRelation) {
      return { ok: false, reason: `关系过高（需 ≤ ${action.maxRelation}）` }
    }
    if (action.requiresNeighbor && !country.isNeighbor) {
      return { ok: false, reason: '仅适用于邻国' }
    }
    if (pmStats.politicalCapital < action.politicalCapitalCost) {
      return { ok: false, reason: `政治资本不足（需 ${action.politicalCapitalCost}）` }
    }
    if (action.treasuryCost && metrics.treasury < action.treasuryCost) {
      return { ok: false, reason: `国库不足（需 ${action.treasuryCost}）` }
    }
    // v1.5 修复：lastActionTurn === 0 表示从未使用过，不应触发冷却判定
    // 旧逻辑直接计算 cooldownLeft = cooldown - (turn - 0) = cooldown - turn，
    // 导致 cooldown=999 的"每国一次"行动在从未使用时也显示"本局已使用"
    if (country.lastActionTurn > 0) {
      const cooldownLeft = action.cooldown - (turn - country.lastActionTurn)
      if (cooldownLeft > 0) {
        // 冷却 ≥999 视为"每局限一次"行动（如宣战）
        if (action.cooldown >= 999) {
          return { ok: false, reason: '本局已使用（每国仅一次）' }
        }
        return { ok: false, reason: `冷却中（剩 ${cooldownLeft} 月）` }
      }
    }
    return { ok: true }
  }

  const handleExecute = (action: DiplomaticActionDef) => {
    const check = checkAction(action)
    if (!check.ok) return
    if (confirming !== action.id) {
      setConfirming(action.id)
      return
    }
    executeDiplomaticAction(country.id, action.id)
    setConfirming(null)
  }

  // 按类别分组
  const groups: { kind: DiplomaticActionDef['kind']; label: string; icon: string }[] = [
    { kind: 'diplomatic', label: '外交', icon: '🤝' },
    { kind: 'economic', label: '经济', icon: '💼' },
    { kind: 'covert', label: '秘密行动', icon: '🕵️' },
    { kind: 'military', label: '军事', icon: '⚔️' },
  ]

  return (
    <div className="overflow-y-auto pr-1">
      {/* 国家头部 */}
      <div className="doc-card p-4 mb-3">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">{country.flag}</span>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold text-parchment-50">
              {country.name}
            </h2>
            <div className="font-mono text-[10px] text-parchment-200/50">
              {country.government}政体 · {country.isNeighbor ? '邻国' : '远邦'}
              {country.nuclear && ' · ☢️ 拥核'}
            </div>
          </div>
          {/* 关系徽章 */}
          <div className="text-right">
            <div className="font-mono text-[9px] text-parchment-200/40">关系</div>
            <div
              className="font-display text-lg font-bold px-3 py-0.5 rounded"
              style={{ backgroundColor: `${color}25`, color }}
            >
              {country.relationLevel}
            </div>
            <div className="font-mono text-[10px] text-parchment-200/60 mt-0.5">
              {country.relation} / 100
            </div>
          </div>
        </div>

        {/* 国力统计 */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <StatBar label="综合国力" value={country.power} color="#c9a961" />
          <StatBar label="军事实力" value={country.military} color="#b34554" />
          <StatBar label="情报渗透" value={country.espionageLevel * 33} color="#6b5b95" suffix={`Lv${country.espionageLevel}`} />
        </div>

        {/* 条约与状态标签 */}
        <div className="flex flex-wrap gap-1.5">
          {country.tradeAgreement && (
            <span className="tag border-emerald-500/40 bg-emerald-500/10 text-emerald-300">💼 贸易协定</span>
          )}
          {country.sanctioned && (
            <span className="tag border-red-500/40 bg-red-500/10 text-red-300">🚫 已制裁</span>
          )}
          {country.treaties.map((t) => (
            <span key={t} className="tag border-blue-500/40 bg-blue-500/10 text-blue-300">📜 {t}</span>
          ))}
          {country.treaties.length === 0 && !country.tradeAgreement && !country.sanctioned && (
            <span className="font-mono text-[10px] text-parchment-200/30">无条约关系</span>
          )}
        </div>
      </div>

      {/* 外交行动 */}
      <div className="space-y-3">
        {groups.map((group) => {
          const actions = DIPLOMATIC_ACTIONS.filter((a) => a.kind === group.kind)
          if (actions.length === 0) return null
          return (
            <div key={group.kind}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">{group.icon}</span>
                <span className="font-display text-sm font-semibold tracking-widest text-gold">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {actions.map((action) => {
                  const check = checkAction(action)
                  const isConfirming = confirming === action.id
                  return (
                    <motion.div
                      key={action.id}
                      whileHover={check.ok ? { x: 2 } : {}}
                      className={`doc-card p-2.5 transition-all ${
                        check.ok
                          ? 'hover:border-gold/40 hover:bg-ink-800/60'
                          : 'opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{action.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-serif text-xs font-bold text-parchment-100">
                            {action.label}
                          </div>
                          <div className="font-mono text-[9px] text-parchment-200/40">
                            💼 {action.politicalCapitalCost}
                            {action.treasuryCost ? ` · 💰 ${action.treasuryCost}` : ''}
                            {action.cooldown >= 999 ? ' · 每国一次' : action.cooldown > 0 ? ` · 冷却 ${action.cooldown}月` : ''}
                          </div>
                        </div>
                        {check.ok ? (
                          <button
                            onClick={() => handleExecute(action)}
                            className={`rounded px-3 py-1 font-serif text-[11px] font-bold transition-colors ${
                              isConfirming
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25'
                            }`}
                          >
                            {isConfirming ? '确认?' : '执行'}
                          </button>
                        ) : (
                          <span className="font-mono text-[9px] text-red-400/70">
                            {check.reason}
                          </span>
                        )}
                      </div>
                      <p className="font-serif text-[10px] text-parchment-200/50 leading-relaxed mt-1">
                        {action.description}
                      </p>
                      {isConfirming && check.ok && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            onClick={() => handleExecute(action)}
                            className="rounded bg-red-600 px-2 py-0.5 font-serif text-[10px] font-bold text-white"
                          >
                            确认执行
                          </button>
                          <button
                            onClick={() => setConfirming(null)}
                            className="rounded bg-ink-700 px-2 py-0.5 font-serif text-[10px] text-parchment-200"
                          >
                            取消
                          </button>
                          {action.id === 'declare_war' && (
                            <span className="font-mono text-[9px] text-red-300">
                              ⚠ 将触发完整战争事件链
                            </span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 国力统计条 */
function StatBar({ label, value, color, suffix }: { label: string; value: number; color: string; suffix?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono text-[9px] text-parchment-200/50">{label}</span>
        <span className="font-mono text-[10px] font-bold" style={{ color }}>
          {suffix ?? value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-900/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
