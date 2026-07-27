import { useState } from 'react'
import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { REPLACEMENT_CANDIDATES } from '@/data/cabinet'
import type { CabinetBonus, CabinetMember, MetricKey } from '@/types/game'

/** 指标标签映射 */
const METRIC_LABELS: Record<string, string> = {
  approval: '民意',
  treasury: '国库',
  economy: '经济',
  stability: '稳定',
  diplomacy: '外交',
  prestige: '声望',
}

/** 专长标签映射（作为派系/专长展示） */
const SPECIALTY_LABELS: Record<MetricKey, string> = {
  approval: '民意专长',
  treasury: '财政专长',
  economy: '经济专长',
  stability: '稳定专长',
  diplomacy: '外交专长',
  prestige: '声望专长',
}

/** 总理背景标签映射 */
const BACKGROUND_LABELS: Record<string, string> = {
  legal_expert: '资深律政专家',
  union_representative: '基层工会代表',
  political_dynasty: '政治世家成员',
}

/** 加成预览组件 */
function BonusPreview({ bonuses }: { bonuses: CabinetBonus }) {
  const entries = Object.entries(bonuses).filter(([, v]) => v !== 0)
  if (entries.length === 0) {
    return <span className="text-[10px] text-parchment-200/30">无加成</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className={`font-mono text-[10px] ${value > 0 ? 'text-green-400' : 'text-red-400'}`}
        >
          {METRIC_LABELS[key] ?? key} {value > 0 ? '+' : ''}
          {value}
        </span>
      ))}
    </div>
  )
}

/** 初始内阁组建界面 */
export default function InitialCabinetSetup() {
  const cabinet = useGameStore((s) => s.cabinet)
  const pmName = useGameStore((s) => s.pmName)
  const pmBackground = useGameStore((s) => s.pmBackground)

  // 各职位选中的候选人索引（未选则保留默认）
  const [selections, setSelections] = useState<Record<string, number>>({})

  /** 选择/取消选择候选人 */
  const handleSelect = (role: string, idx: number) => {
    setSelections((prev) => {
      const next = { ...prev }
      if (next[role] === idx) {
        delete next[role] // 再次点击取消选择，保留默认
      } else {
        next[role] = idx
      }
      return next
    })
  }

  /** 确认组阁：写入新内阁并进入游戏阶段 */
  const handleConfirm = () => {
    const newCabinet: CabinetMember[] = cabinet.map((member) => {
      const selIdx = selections[member.role]
      if (selIdx === undefined) return member // 保留默认
      const candidate = REPLACEMENT_CANDIDATES[member.role]?.[selIdx]
      if (!candidate) return member
      return {
        ...member,
        name: candidate.name,
        loyalty: candidate.loyalty,
        advice: candidate.advice,
        bonuses: { ...candidate.bonuses },
      }
    })
    useGameStore.setState({
      cabinet: newCabinet,
      gamePhase: 'playing',
      timeSpeed: 0,
    })
  }

  const replacedCount = Object.keys(selections).length
  const backgroundLabel = pmBackground ? BACKGROUND_LABELS[pmBackground] ?? '' : ''

  return (
    <div className="flex min-h-full flex-col items-center bg-ink-grid px-4 pb-32 pt-6">
      <div className="w-full max-w-5xl">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <h1 className="font-display text-3xl font-bold tracking-[0.25em] text-gold">
            组建您的内阁
          </h1>
          <div className="mt-1 font-mono text-[11px] tracking-[0.4em] text-gold/50">
            FORM YOUR CABINET
          </div>
        </motion.div>

        {/* 总理信息 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="doc-card mb-6 flex items-center gap-4 p-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-2xl">
            🏛️
          </div>
          <div className="flex-1">
            <div className="font-display text-lg font-bold text-parchment-100">{pmName}</div>
            <div className="font-serif text-xs text-parchment-200/60">
              总理 · {backgroundLabel}
            </div>
          </div>
          <div className="font-mono text-[11px] text-gold/60">请挑选各部部长</div>
        </motion.div>

        {/* 职位列表 */}
        <div className="space-y-5">
          {cabinet.map((member, i) => {
            const candidates = REPLACEMENT_CANDIDATES[member.role] ?? []
            const selectedIdx = selections[member.role]
            const hasSelection = selectedIdx !== undefined
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="doc-card p-4"
              >
                {/* 职位标题与默认人选 */}
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-base font-bold tracking-wider text-gold">
                      {member.role}
                    </div>
                    <div className="font-serif text-xs text-parchment-200/60">
                      默认人选：{member.name} · 忠诚度 {member.loyalty}
                    </div>
                  </div>
                  <div className="signature-area px-3 py-1.5">
                    <div className="mb-1 font-serif text-[10px] text-parchment-200/50">
                      默认加成
                    </div>
                    <BonusPreview bonuses={member.bonuses} />
                  </div>
                </div>

                {/* 候选人卡片 */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {candidates.map((candidate, idx) => {
                    const isSelected = selectedIdx === idx
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelect(member.role, idx)}
                        className={`rounded border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(201,169,97,0.4)]'
                            : 'border-gold/20 bg-ink-900/40 hover:border-gold/40'
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <div className="font-serif text-sm font-semibold text-parchment-100">
                              {candidate.name}
                            </div>
                            <div className="font-mono text-[10px] text-gold/60">
                              {SPECIALTY_LABELS[candidate.specialty] ?? candidate.specialty}
                            </div>
                          </div>
                          {isSelected && <span className="text-sm text-gold">✓</span>}
                        </div>

                        {/* 忠诚度 */}
                        <div className="mb-2 flex items-center gap-3 text-[10px]">
                          <span className="font-mono text-parchment-200/70">
                            忠诚{' '}
                            <span
                              className={`font-bold ${
                                candidate.loyalty >= 70
                                  ? 'text-green-400'
                                  : candidate.loyalty >= 45
                                    ? 'text-orange-400'
                                    : 'text-red-400'
                              }`}
                            >
                              {candidate.loyalty}
                            </span>
                          </span>
                        </div>

                        {/* 名言/性格 */}
                        <p className="mb-2 line-clamp-1 font-serif text-[10px] italic text-parchment-200/50">
                          &ldquo;{candidate.advice}&rdquo;
                        </p>

                        {/* 加成预览 */}
                        <BonusPreview bonuses={candidate.bonuses} />
                      </button>
                    )
                  })}
                </div>

                {/* 选择状态提示 */}
                <div className="mt-2 text-right font-serif text-[10px]">
                  {hasSelection ? (
                    <span className="text-gold/70">
                      已选择：{candidates[selectedIdx]?.name}（替换 {member.name}）
                    </span>
                  ) : (
                    <span className="text-parchment-200/40">保留默认人选</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* 底部固定确认栏 */}
      <div className="bottom-bar fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
        <div className="font-serif text-xs text-parchment-200/60">
          共 {cabinet.length} 个职位 · 已替换 {replacedCount} 人
        </div>
        <button onClick={handleConfirm} className="btn-gold px-12 py-3">
          确认组阁
        </button>
      </div>
    </div>
  )
}
