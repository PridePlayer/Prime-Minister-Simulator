import { useState } from 'react'
import { motion } from 'motion/react'
import DomainPageLayout from '@/components/DomainPageLayout'
import WarCommandPanel from '@/components/WarCommandPanel'
import { useGameStore } from '@/store/gameStore'
import {
  BRANCH_META,
  GENERAL_CANDIDATES,
  DEFENSE_BUDGET_OPTIONS,
  computeMilitaryStrength,
  budgetLabel,
} from '@/data/military'
import { getPlayerMilitaryStrength } from '@/engine/simulation'
import type { General, MilitaryBranch } from '@/types/game'

/**
 * 军事页面：三军状态 + 将领任免 + 军费预算 + 综合军力
 * 战争胜负以真实军力判定（替代旧硬编码 60），军事页操作直接影响战争结果
 */
export default function MilitaryPage() {
  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2">
      {/* 页面标题 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          国 防 大 力
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        <span className="font-mono text-[10px] text-parchment-200/40">快捷键 M 呼出</span>
      </div>

      {/* 综合军力 + 军费预算 */}
      <StrengthAndBudgetPanel />

      {/* 战时作战指挥面板（仅战争进行中显示） */}
      <WarCommandPanel />

      {/* 三军状态 */}
      <BranchesPanel />

      {/* 将领任免 */}
      <GeneralsPanel />

      {/* 通用领域行动 */}
      <div className="mt-4 flex-1 min-h-0">
        <DomainPageLayout domain="military" />
      </div>
    </div>
  )
}

/** 综合军力 + 军费预算面板 */
function StrengthAndBudgetPanel() {
  const military = useGameStore((s) => s.military)
  const macro = useGameStore((s) => s.macro)
  const totalDays = useGameStore((s) => s.totalDays)
  const setDefenseBudget = useGameStore((s) => s.setDefenseBudget)
  const activeWar = useGameStore((s) => s.activeWar)

  const strength = computeMilitaryStrength(military)
  const realStrength = getPlayerMilitaryStrength(useGameStore.getState())
  // 30 天冷却
  const daysSince = totalDays - military.lastBudgetChangeDay
  const cooldownLeft = Math.max(0, 30 - daysSince)
  const canChange = military.lastBudgetChangeDay === 0 || daysSince >= 30

  // 军力等级描述
  const strengthLabel =
    strength >= 90 ? '世界一流' :
    strength >= 75 ? '区域强权' :
    strength >= 60 ? '中等水平' :
    strength >= 45 ? '防御可用' :
    strength >= 30 ? '兵力单薄' : '不堪一击'

  return (
    <div className="doc-card p-4 mb-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 综合军力 */}
        <div className="md:col-span-1">
          <div className="font-serif text-xs font-semibold text-parchment-200/60 mb-2 flex items-center gap-1.5">
            <span>⚔️</span>
            <span>综合军事实力</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-gold">
              {Math.round(strength)}
            </span>
            <span className="font-serif text-xs text-parchment-200/50">{strengthLabel}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-900/60 mt-2">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-red-700 via-amber-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, strength)}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <div className="font-mono text-[9px] text-parchment-200/40 mt-1.5">
            战时计入将领加成：{Math.round(realStrength)}
          </div>
          {activeWar && !activeWar.ended && (
            <div className="mt-2 rounded border border-red-500/40 bg-red-950/30 p-2">
              <div className="font-mono text-[10px] text-red-300/80 flex items-center justify-between">
                <span>战时军力</span>
                <span className="font-bold">vs {activeWar.enemyMilitary}</span>
              </div>
              <div className="font-mono text-[9px] text-parchment-200/50 mt-0.5">
                优势：{realStrength - activeWar.enemyMilitary > 0 ? '+' : ''}
                {Math.round(realStrength - activeWar.enemyMilitary)}
              </div>
            </div>
          )}
        </div>

        {/* 军费预算 */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div className="font-serif text-xs font-semibold text-parchment-200/60 flex items-center gap-1.5">
              <span>💰</span>
              <span>国防预算</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="text-parchment-200/40">占 GDP</span>
              <span className="font-bold text-gold">{military.defenseBudget.toFixed(1)}%</span>
              <span className="text-parchment-200/40">·</span>
              <span className="text-parchment-200/40">月支出</span>
              <span className="font-bold text-red-400">{macro.lastMilitarySpending.toFixed(1)}B</span>
              <span className="text-parchment-200/40">·</span>
              <span className="text-amber-300/80">{budgetLabel(military.defenseBudget)}</span>
            </div>
          </div>

          {/* 预算档位滑块 */}
          <div className="grid grid-cols-5 gap-1.5">
            {DEFENSE_BUDGET_OPTIONS.map((opt) => {
              const isActive = Math.abs(military.defenseBudget - opt.value) < 0.05
              const isLocked = !canChange && !isActive
              return (
                <button
                  key={opt.value}
                  disabled={isLocked || isActive}
                  onClick={() => setDefenseBudget(opt.value)}
                  className={`rounded border p-2 text-left transition-all ${
                    isActive
                      ? 'bg-ink-700/70 border-gold/60 shadow-md'
                      : isLocked
                      ? 'opacity-40 cursor-not-allowed bg-ink-900/30 border-parchment-200/10'
                      : 'bg-ink-800/40 hover:bg-ink-700/50 border-parchment-200/15 cursor-pointer'
                  }`}
                  title={opt.desc}
                >
                  <div className="font-mono text-[10px] font-bold text-gold mb-0.5">
                    {opt.value.toFixed(1)}%
                  </div>
                  <div className="font-serif text-[9px] text-parchment-200/70 leading-tight">
                    {opt.label}
                  </div>
                </button>
              )
            })}
          </div>
          {!canChange && (
            <div className="mt-2 flex items-center gap-1.5 font-mono text-[9px] text-orange-400/80">
              <span className="animate-pulse">⏳</span>
              <span>军费调整冷却中：还需 {cooldownLeft} 天</span>
            </div>
          )}
          <p className="mt-2 font-serif text-[10px] text-parchment-200/40 leading-relaxed">
            军费占 GDP 比例直接影响<strong className="text-amber-300/80">战备、装备更新与军队士气</strong>，
            同时每月从国库扣除相应支出。过低则军队萎缩、士气低落；过高将拖垮财政。
          </p>
        </div>
      </div>
    </div>
  )
}

/** 三军状态面板 */
function BranchesPanel() {
  const military = useGameStore((s) => s.military)
  const branches = Object.keys(military.branches) as MilitaryBranch[]

  return (
    <div className="doc-card p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-serif text-sm font-bold tracking-wider text-parchment-100">
          三军战备
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
        <span className="font-mono text-[9px] text-parchment-200/40">
          装备 35% + 战备 35% + 士气 30% = 战力
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {branches.map((b) => {
          const meta = BRANCH_META[b]
          const state = military.branches[b]
          return (
            <div key={b} className="rounded-md border border-parchment-200/15 bg-ink-900/40 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{meta.icon}</span>
                <div>
                  <div className="font-serif text-xs font-bold text-parchment-100">
                    {meta.label}
                  </div>
                  <div className="font-mono text-[9px] text-parchment-200/40">
                    兵力 {state.personnel}万
                  </div>
                </div>
              </div>

              {/* 三项指标条 */}
              <BranchMetric label="装备" value={state.equipment} color="#60a5fa" />
              <BranchMetric label="战备" value={state.readiness} color="#fbbf24" />
              <BranchMetric label="士气" value={state.morale} color="#ef4444" />

              <p className="mt-2 font-serif text-[9px] text-parchment-200/40 leading-relaxed">
                {meta.desc}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 单军种单项指标条 */
function BranchMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between font-mono text-[9px]">
        <span className="text-parchment-200/50">{label}</span>
        <span style={{ color }} className="font-bold">
          {Math.round(value)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/60 mt-0.5">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  )
}

/** 将领任免面板 */
function GeneralsPanel() {
  const military = useGameStore((s) => s.military)
  const pmStats = useGameStore((s) => s.pmStats)
  const appointGeneral = useGameStore((s) => s.appointGeneral)
  const dismissGeneral = useGameStore((s) => s.dismissGeneral)
  const [confirming, setConfirming] = useState<string | null>(null)

  // 现役将领 + 后备池
  const active = military.generals.filter((g) => g.active)
  const inactive = military.generals.filter((g) => !g.active)
  const candidates = GENERAL_CANDIDATES.filter(
    (c) => !military.generals.some((g) => g.id === c.id && g.active),
  )

  return (
    <div className="doc-card p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-serif text-sm font-bold tracking-wider text-parchment-100">
          将领任免
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
        <span className="font-mono text-[9px] text-parchment-200/40">
          任命 -8 💼 · 解职 -10 💼 · 当前 {pmStats.politicalCapital}
        </span>
      </div>

      {/* 现役将领 */}
      <div className="mb-3">
        <div className="font-serif text-[10px] text-parchment-200/50 mb-1.5">现役将领</div>
        {active.length === 0 ? (
          <div className="font-serif text-[10px] text-parchment-200/30 italic">
            （暂无现役将领）
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {active.map((g) => (
              <GeneralCard
                key={g.id}
                general={g}
                isConfirming={confirming === `dismiss:${g.id}`}
                onDismiss={() => dismissGeneral(g.id)}
                onToggleConfirm={() =>
                  setConfirming(confirming === `dismiss:${g.id}` ? null : `dismiss:${g.id}`)
                }
                canDismiss={pmStats.politicalCapital >= 10}
              />
            ))}
          </div>
        )}
      </div>

      {/* 后备池 */}
      {(inactive.length > 0 || candidates.length > 0) && (
        <div>
          <div className="font-serif text-[10px] text-parchment-200/50 mb-1.5">后备将领池</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[...inactive, ...candidates].map((g) => (
              <GeneralCard
                key={g.id}
                general={g}
                inactive
                isConfirming={confirming === `appoint:${g.id}`}
                onAppoint={() => appointGeneral(g.id)}
                onToggleConfirm={() =>
                  setConfirming(confirming === `appoint:${g.id}` ? null : `appoint:${g.id}`)
                }
                canAppoint={pmStats.politicalCapital >= 8}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** 单张将领卡片 */
function GeneralCard({
  general,
  inactive,
  isConfirming,
  onAppoint,
  onDismiss,
  onToggleConfirm,
  canAppoint,
  canDismiss,
}: {
  general: General
  inactive?: boolean
  isConfirming: boolean
  onAppoint?: () => void
  onDismiss?: () => void
  onToggleConfirm: () => void
  canAppoint?: boolean
  canDismiss?: boolean
}) {
  const branchLabel =
    general.branch === 'army' ? '🪖陆军' :
    general.branch === 'navy' ? '⚓海军' :
    general.branch === 'airForce' ? '✈️空军' :
    '🎖️联合参谋'

  return (
    <div
      className={`rounded-md border p-2.5 transition-all ${
        inactive
          ? 'border-parchment-200/10 bg-ink-900/30 opacity-70'
          : 'border-gold/20 bg-ink-900/50'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-serif text-xs font-bold text-parchment-100">
            {general.name}
          </span>
          <span className="font-mono text-[9px] text-parchment-200/40">
            {branchLabel} · {general.age}岁
          </span>
        </div>
        {inactive && (
          <span className="font-mono text-[8px] text-parchment-200/40">未任用</span>
        )}
      </div>

      <div className="font-serif text-[10px] text-parchment-200/50 italic mb-1.5 leading-relaxed">
        「{general.trait}」
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <GeneralStat label="指挥" value={general.skill} color="#fbbf24" />
        <GeneralStat label="忠诚" value={general.loyalty} color="#10b981" />
      </div>

      {/* 操作按钮 */}
      {inactive ? (
        isConfirming ? (
          <div className="flex gap-1.5">
            <button
              onClick={onAppoint}
              disabled={!canAppoint}
              className={`flex-1 rounded px-2 py-1 font-serif text-[10px] font-bold ${
                canAppoint
                  ? 'bg-emerald-700/60 text-white hover:bg-emerald-700'
                  : 'bg-ink-900/40 text-parchment-200/30 cursor-not-allowed'
              }`}
            >
              确认任命 (-8 💼)
            </button>
            <button
              onClick={onToggleConfirm}
              className="flex-1 rounded px-2 py-1 font-serif text-[10px] bg-ink-800/60 text-parchment-200/60 hover:bg-ink-700/60"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={onToggleConfirm}
            disabled={!canAppoint}
            className={`w-full rounded px-2 py-1 font-serif text-[10px] font-bold transition-all ${
              canAppoint
                ? 'bg-emerald-700/30 text-emerald-200 hover:bg-emerald-700/50 border border-emerald-500/40'
                : 'bg-ink-900/40 text-parchment-200/30 cursor-not-allowed border border-parchment-200/10'
            }`}
          >
            任命要职
          </button>
        )
      ) : (
        isConfirming ? (
          <div className="flex gap-1.5">
            <button
              onClick={onDismiss}
              disabled={!canDismiss}
              className={`flex-1 rounded px-2 py-1 font-serif text-[10px] font-bold ${
                canDismiss
                  ? 'bg-red-700/60 text-white hover:bg-red-700'
                  : 'bg-ink-900/40 text-parchment-200/30 cursor-not-allowed'
              }`}
            >
              确认解职 (-10 💼)
            </button>
            <button
              onClick={onToggleConfirm}
              className="flex-1 rounded px-2 py-1 font-serif text-[10px] bg-ink-800/60 text-parchment-200/60 hover:bg-ink-700/60"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={onToggleConfirm}
            disabled={!canDismiss}
            className={`w-full rounded px-2 py-1 font-serif text-[10px] font-bold transition-all ${
              canDismiss
                ? 'bg-red-700/30 text-red-200 hover:bg-red-700/50 border border-red-500/40'
                : 'bg-ink-900/40 text-parchment-200/30 cursor-not-allowed border border-parchment-200/10'
            }`}
          >
            解职
          </button>
        )
      )}
    </div>
  )
}

/** 将领单项数值条 */
function GeneralStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[9px] mb-0.5">
        <span className="text-parchment-200/50">{label}</span>
        <span style={{ color }} className="font-bold">
          {Math.round(value)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/60">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  )
}
