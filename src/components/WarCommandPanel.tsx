import { useState } from 'react'
import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import type { FrontDeployment } from '@/types/game'

/**
 * 战争指挥面板：当存在进行中的战争时显示
 *
 * 功能：
 * 1. 三大战区（北线/南线/海岸线）实时态势：我军强度 vs 敌军强度，战况标签
 * 2. 将调遣：从可调遣将领池指派到具体战区，将领技能（×0.25）加成该战区我军强度
 * 3. 战区增援：消耗国库 + 政治资本，紧急提升某战区我军强度
 * 4. 战争疲劳度 / 补给线完整度：两项全局指标，影响战争走向
 *
 * 仅在 activeWar 存在且未结束时渲染（由父组件控制）。
 */
export default function WarCommandPanel() {
  const activeWar = useGameStore((s) => s.activeWar)
  const warCommand = useGameStore((s) => s.warCommand)

  if (!activeWar || activeWar.ended || !warCommand) return null

  return (
    <div className="doc-card p-4 mb-3 border-red-500/30" data-war-command-panel>
      {/* 面板标题 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">⚔️</span>
        <span className="font-serif text-sm font-bold tracking-wider text-red-300">
          作战指挥中枢
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-red-500/30 to-transparent" />
        <span className="font-mono text-[9px] text-red-300/60">
          对 {activeWar.enemyCountryName} 作战 · 第 {activeWar.currentOrder + 1} 阶段
        </span>
      </div>

      {/* 全局战争指标：疲劳度 + 补给线 */}
      <WarGlobalMeters />

      {/* 三大战区态势 */}
      <div className="mb-3">
        <div className="font-serif text-[10px] text-parchment-200/50 mb-1.5 flex items-center gap-1.5">
          <span>🗺️</span>
          <span>前线态势</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {warCommand.deployments.map((d) => (
            <SectorCard key={d.sector} deployment={d} />
          ))}
        </div>
      </div>

      {/* 可调遣将领池 */}
      <GeneralPool />
    </div>
  )
}

/** 全局战争指标：战争疲劳度 + 补给线完整度 */
function WarGlobalMeters() {
  const warCommand = useGameStore((s) => s.warCommand)
  if (!warCommand) return null

  return (
    <div className="grid grid-cols-2 gap-3 mb-3">
      {/* 战争疲劳度 */}
      <div className="rounded-md border border-orange-500/20 bg-ink-900/40 p-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-serif text-[10px] text-parchment-200/60 flex items-center gap-1">
            <span>😣</span>
            <span>战争疲劳度</span>
          </span>
          <span className={`font-mono text-[10px] font-bold ${
            warCommand.warExhaustion > 60 ? 'text-red-400' :
            warCommand.warExhaustion > 40 ? 'text-orange-400' : 'text-emerald-400'
          }`}>
            {Math.round(warCommand.warExhaustion)}/100
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/60">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-orange-500 to-red-600"
            initial={{ width: 0 }}
            animate={{ width: `${warCommand.warExhaustion}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        <p className="mt-1 font-serif text-[9px] text-parchment-200/40 leading-tight">
          持续作战推高疲劳，过高将削弱军心与民意。
        </p>
      </div>

      {/* 补给线完整度 */}
      <div className="rounded-md border border-blue-500/20 bg-ink-900/40 p-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-serif text-[10px] text-parchment-200/60 flex items-center gap-1">
            <span>🚚</span>
            <span>补给线完整度</span>
          </span>
          <span className={`font-mono text-[10px] font-bold ${
            warCommand.supplyLines < 30 ? 'text-red-400' :
            warCommand.supplyLines < 60 ? 'text-orange-400' : 'text-emerald-400'
          }`}>
            {Math.round(warCommand.supplyLines)}/100
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/60">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${warCommand.supplyLines}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        <p className="mt-1 font-serif text-[9px] text-parchment-200/40 leading-tight">
          补给越完整，前线战力越能持续；过低则各线战况恶化。
        </p>
      </div>
    </div>
  )
}

/** 单个战区卡片 */
function SectorCard({ deployment }: { deployment: FrontDeployment }) {
  const warCommand = useGameStore((s) => s.warCommand)
  const reinforceSector = useGameStore((s) => s.reinforceSector)
  const treasury = useGameStore((s) => s.metrics.treasury)
  const politicalCapital = useGameStore((s) => s.pmStats.politicalCapital)
  const [confirmingReinforce, setConfirmingReinforce] = useState(false)

  // 该战区当前指挥将领
  const assignedGeneral = warCommand?.availableGenerals.find(
    (g) => g.assignedSector === deployment.sector,
  )

  const statusMeta = getStatusMeta(deployment.status)
  const advantage = deployment.ourStrength - deployment.enemyStrength

  const canReinforce = treasury >= 6 && politicalCapital >= 3

  return (
    <div className="rounded-md border border-parchment-200/15 bg-ink-900/50 p-2.5">
      {/* 战区名称 + 状态 */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-serif text-xs font-bold text-parchment-100">
          {deployment.sector}
        </span>
        <span
          className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
          style={{
            color: statusMeta.color,
            backgroundColor: statusMeta.color + '20',
          }}
        >
          {statusMeta.label}
        </span>
      </div>

      {/* 我军 vs 敌军 */}
      <div className="space-y-1.5 mb-2">
        <StrengthBar
          label="我军"
          value={deployment.ourStrength}
          color="#10b981"
          highlight={!!assignedGeneral}
        />
        <StrengthBar
          label="敌军"
          value={deployment.enemyStrength}
          color="#ef4444"
        />
      </div>

      {/* 优势指示 */}
      <div className="font-mono text-[9px] mb-2 flex items-center justify-between">
        <span className="text-parchment-200/40">兵力差</span>
        <span className={`font-bold ${advantage > 0 ? 'text-emerald-400' : advantage < 0 ? 'text-red-400' : 'text-parchment-200/60'}`}>
          {advantage > 0 ? '+' : ''}{advantage}
        </span>
      </div>

      {/* 当前指挥将领 */}
      {assignedGeneral && (
        <div className="mb-2 rounded bg-gold/10 border border-gold/20 px-1.5 py-1">
          <div className="font-mono text-[9px] text-gold/80 flex items-center gap-1">
            <span>🎖️</span>
            <span>{assignedGeneral.name}</span>
            <span className="text-parchment-200/40">· 指挥 {assignedGeneral.skill}</span>
          </div>
        </div>
      )}

      {/* 增援按钮 */}
      {confirmingReinforce ? (
        <div className="flex gap-1">
          <button
            onClick={() => {
              reinforceSector(deployment.sector)
              setConfirmingReinforce(false)
            }}
            disabled={!canReinforce}
            className={`flex-1 rounded px-1.5 py-1 font-serif text-[9px] font-bold ${
              canReinforce
                ? 'bg-amber-700/60 text-white hover:bg-amber-700'
                : 'bg-ink-900/40 text-parchment-200/30 cursor-not-allowed'
            }`}
          >
            确认增援
          </button>
          <button
            onClick={() => setConfirmingReinforce(false)}
            className="flex-1 rounded px-1.5 py-1 font-serif text-[9px] bg-ink-800/60 text-parchment-200/60 hover:bg-ink-700/60"
          >
            取消
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingReinforce(true)}
          disabled={!canReinforce}
          className={`w-full rounded px-1.5 py-1 font-serif text-[9px] font-bold transition-all ${
            canReinforce
              ? 'bg-amber-700/30 text-amber-200 hover:bg-amber-700/50 border border-amber-500/40'
              : 'bg-ink-900/40 text-parchment-200/30 cursor-not-allowed border border-parchment-200/10'
          }`}
          title="消耗国库 6 + 政治资本 3，该战区我军强度 +10"
        >
          紧急增援 (💰6 · 💼3)
        </button>
      )}
    </div>
  )
}

/** 我军/敌军强度条 */
function StrengthBar({
  label,
  value,
  color,
  highlight,
}: {
  label: string
  value: number
  color: string
  highlight?: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[9px] mb-0.5">
        <span className="text-parchment-200/50">
          {label}
          {highlight && <span className="ml-1 text-gold/60">★</span>}
        </span>
        <span style={{ color }} className="font-bold">
          {Math.round(value)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-900/60">
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

/** 可调遣将领池：显示所有可调遣将领，可指派到战区或撤回 */
function GeneralPool() {
  const warCommand = useGameStore((s) => s.warCommand)
  const assignGeneralToSector = useGameStore((s) => s.assignGeneralToSector)
  const unassignGeneralFromSector = useGameStore((s) => s.unassignGeneralFromSector)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  if (!warCommand || warCommand.availableGenerals.length === 0) {
    return (
      <div>
        <div className="font-serif text-[10px] text-parchment-200/50 mb-1.5 flex items-center gap-1.5">
          <span>🎖️</span>
          <span>可调遣将领</span>
        </div>
        <div className="font-serif text-[10px] text-parchment-200/30 italic">
          （暂无可调遣将领，请在上方将领任免面板任命现役将领后再次开战）
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="font-serif text-[10px] text-parchment-200/50 mb-1.5 flex items-center gap-1.5">
        <span>🎖️</span>
        <span>可调遣将领</span>
        <span className="font-mono text-[9px] text-parchment-200/30">
          （点击将领指派到战区，技能 ×0.25 加成该战区我军强度）
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {warCommand.availableGenerals.map((g) => {
          const isAssigning = assigningId === g.id
          const assignedSector = g.assignedSector
          return (
            <div
              key={g.id}
              className={`rounded-md border p-2 transition-all ${
                assignedSector
                  ? 'border-gold/30 bg-gold/5'
                  : 'border-parchment-200/15 bg-ink-900/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-[11px] font-bold text-parchment-100">
                    {g.name}
                  </span>
                  <span className="font-mono text-[9px] text-gold/70">
                    指挥 {g.skill}
                  </span>
                </div>
                {assignedSector && (
                  <span className="font-mono text-[9px] text-gold/80">
                    → {assignedSector}
                  </span>
                )}
              </div>

              {isAssigning ? (
                <div className="space-y-1">
                  <div className="font-serif text-[9px] text-parchment-200/50">
                    选择目标战区：
                  </div>
                  <div className="flex gap-1">
                    {warCommand.deployments.map((d) => (
                      <button
                        key={d.sector}
                        onClick={() => {
                          assignGeneralToSector(g.id, d.sector)
                          setAssigningId(null)
                        }}
                        className="flex-1 rounded px-1 py-0.5 font-serif text-[9px] bg-ink-700/60 text-parchment-200/80 hover:bg-gold/20 hover:text-gold border border-parchment-200/10"
                      >
                        {d.sector}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setAssigningId(null)}
                    className="w-full rounded px-1 py-0.5 font-serif text-[9px] bg-ink-800/60 text-parchment-200/50 hover:bg-ink-700/60"
                  >
                    取消
                  </button>
                </div>
              ) : assignedSector ? (
                <button
                  onClick={() => unassignGeneralFromSector(g.id)}
                  className="w-full rounded px-1 py-0.5 font-serif text-[9px] bg-red-700/20 text-red-300/80 hover:bg-red-700/40 border border-red-500/30"
                >
                  撤回指挥
                </button>
              ) : (
                <button
                  onClick={() => setAssigningId(g.id)}
                  className="w-full rounded px-1 py-0.5 font-serif text-[9px] bg-emerald-700/20 text-emerald-200/80 hover:bg-emerald-700/40 border border-emerald-500/30"
                >
                  指派到战区
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 战况标签元信息 */
function getStatusMeta(status: FrontDeployment['status']): {
  label: string
  color: string
} {
  switch (status) {
    case 'advancing':
      return { label: '推进中', color: '#10b981' }
    case 'holding':
      return { label: '固守', color: '#3b82f6' }
    case 'retreating':
      return { label: '后撤', color: '#ef4444' }
    case 'stalemate':
    default:
      return { label: '僵持', color: '#fbbf24' }
  }
}
