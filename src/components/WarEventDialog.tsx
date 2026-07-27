import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { WAR_STAGES } from '@/data/diplomacy'

/**
 * 战争事件链弹窗
 * - 进行中：显示当前阶段叙事与决策选项
 * - 已结束：显示战后结算叙事，玩家确认后关闭
 * 战争进行期间自动锁定时间流速，强制玩家完成决策
 */
export default function WarEventDialog() {
  const activeWar = useGameStore((s) => s.activeWar)
  const resolveWarStage = useGameStore((s) => s.resolveWarStage)
  const dismissWarEpilogue = useGameStore((s) => s.dismissWarEpilogue)

  return (
    <AnimatePresence>
      {activeWar && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[80] flex items-center justify-center bg-ink-900/85 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            className="corner-frame relative w-[760px] max-w-[94vw] max-h-[88vh] overflow-hidden rounded-sm bg-ink-800 shadow-seal"
          >
            {/* 战旗式顶部 */}
            <div className="border-b border-red-500/40 bg-gradient-to-r from-red-900/60 to-ink-900 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚔️</span>
                <div className="flex-1">
                  <h2 className="font-display text-xl font-bold tracking-widest text-red-300">
                    {activeWar.ended ? '战 争 结 算' : '战 时 决 策'}
                  </h2>
                  <p className="font-mono text-[10px] tracking-wider text-parchment-200/60">
                    对 {activeWar.enemyCountryName} · 敌军实力 {activeWar.enemyMilitary}
                  </p>
                </div>
                {/* 战争进度条 */}
                {!activeWar.ended && (
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-[9px] text-parchment-200/50">阶段进度</span>
                    <div className="flex gap-1">
                      {WAR_STAGES.map((s, i) => (
                        <div
                          key={s.id}
                          className={`h-1.5 w-8 rounded-full ${
                            activeWar.completedStages.includes(s.id)
                              ? 'bg-gold'
                              : i === activeWar.currentOrder
                                ? 'bg-red-400 animate-pulse'
                                : 'bg-ink-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 内容区 */}
            <div className="max-h-[70vh] overflow-y-auto p-6">
              {activeWar.ended ? (
                <WarEpilogueView war={activeWar} onDismiss={dismissWarEpilogue} />
              ) : (
                <WarStageView war={activeWar} onChoose={resolveWarStage} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** 战争进行中：显示当前阶段选项 */
function WarStageView({
  war,
  onChoose,
}: {
  war: NonNullable<ReturnType<typeof useGameStore.getState>['activeWar']>
  onChoose: (optionId: string) => void
}) {
  const stage = WAR_STAGES.find((s) => s.id === war.currentStageId)
  if (!stage) return null

  return (
    <div>
      {/* 阶段标题与叙事 */}
      <div className="mb-5">
        <div className="font-mono text-[10px] tracking-[0.3em] text-red-300/70 mb-1">
          阶 段 {stage.order + 1} / {WAR_STAGES.length} · {stage.title}
        </div>
        <div className="corner-frame rounded-sm border border-red-500/30 bg-ink-900/60 p-4">
          <p className="font-serif text-[13px] italic leading-relaxed text-parchment-200/85">
            {stage.narrative}
          </p>
        </div>
        {/* 当前累计军事优势 */}
        <div className="mt-2 flex items-center justify-between font-mono text-[10px]">
          <span className="text-parchment-200/50">累计军事优势</span>
          <span className={war.warScore >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {war.warScore >= 0 ? '+' : ''}{war.warScore}
          </span>
        </div>
      </div>

      {/* 决策选项 */}
      <div className="font-display text-sm font-semibold tracking-widest text-gold mb-2">
        总 理 决 策
      </div>
      <div className="grid grid-cols-1 gap-2">
        {stage.options.map((opt) => (
          <motion.button
            key={opt.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onChoose(opt.id)}
            className="doc-card p-3 text-left transition-colors hover:border-red-500/40 hover:bg-ink-700/40"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{opt.icon}</span>
              <span className="font-serif text-sm font-bold text-parchment-100">
                {opt.label}
              </span>
              <span className="ml-auto rounded-full bg-ink-900/60 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
                军事 +{opt.militaryModifier}
              </span>
            </div>
            <p className="font-serif text-[11px] text-parchment-200/60 leading-relaxed mb-1.5">
              {opt.description}
            </p>
            {/* 代价摘要 */}
            <div className="flex flex-wrap gap-1 font-mono text-[9px]">
              {opt.economyCost ? (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">💰 -{opt.economyCost}</span>
              ) : null}
              {opt.approvalChange ? (
                <span className={`rounded px-1.5 py-0.5 ${opt.approvalChange > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                  👥 {opt.approvalChange > 0 ? '+' : ''}{opt.approvalChange}
                </span>
              ) : null}
              {opt.stabilityChange ? (
                <span className={`rounded px-1.5 py-0.5 ${opt.stabilityChange > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                  🛡️ {opt.stabilityChange > 0 ? '+' : ''}{opt.stabilityChange}
                </span>
              ) : null}
              {opt.prestigeChange ? (
                <span className={`rounded px-1.5 py-0.5 ${opt.prestigeChange > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                  ⭐ {opt.prestigeChange > 0 ? '+' : ''}{opt.prestigeChange}
                </span>
              ) : null}
              {opt.diplomacyChange ? (
                <span className={`rounded px-1.5 py-0.5 ${opt.diplomacyChange > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                  🌐 {opt.diplomacyChange > 0 ? '+' : ''}{opt.diplomacyChange}
                </span>
              ) : null}
            </div>
          </motion.button>
        ))}
      </div>

      {/* 已选路径回顾 */}
      {war.chosenOptions.length > 0 && (
        <div className="mt-5 border-t border-gold/10 pt-3">
          <div className="font-mono text-[9px] text-parchment-200/40 mb-1.5">已做出的决策</div>
          <div className="flex flex-wrap gap-1.5">
            {war.chosenOptions.map((c, i) => (
              <span
                key={i}
                className="rounded bg-ink-900/60 px-2 py-0.5 font-serif text-[10px] text-parchment-200/60"
              >
                {i + 1}. {c.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** 战争结算：显示战后叙事与结果 */
function WarEpilogueView({
  war,
  onDismiss,
}: {
  war: NonNullable<ReturnType<typeof useGameStore.getState>['activeWar']>
  onDismiss: () => void
}) {
  const outcomeLabel: Record<string, { text: string; color: string }> = {
    victory: { text: '决 定 性 胜 利', color: '#4ade80' },
    pyrrhic: { text: '惨 胜', color: '#fb923c' },
    stalemate: { text: '僵 局 收 场', color: '#eab308' },
    defeat: { text: '战 败', color: '#ef4444' },
  }
  const oc = war.outcome ? outcomeLabel[war.outcome] : null

  return (
    <div>
      {/* 结算大字 */}
      <div className="text-center mb-5">
        <div className="font-mono text-[10px] tracking-[0.5em] text-parchment-200/40 mb-2">
          战 争 已 结 束
        </div>
        <div
          className="font-display text-4xl font-bold tracking-widest"
          style={{ color: oc?.color, textShadow: `0 0 30px ${oc?.color}66` }}
        >
          {oc?.text}
        </div>
      </div>

      {/* 战后叙事 */}
      <div className="corner-frame rounded-sm border border-gold/30 bg-ink-900/60 p-4 mb-4">
        <p className="font-serif text-[13px] leading-relaxed text-parchment-200/90">
          {war.epilogue}
        </p>
      </div>

      {/* 战争统计 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded border border-gold/15 bg-ink-900/40 p-2 text-center">
          <div className="font-mono text-[9px] text-parchment-200/40">敌国</div>
          <div className="font-serif text-xs font-bold text-parchment-100">{war.enemyCountryName}</div>
        </div>
        <div className="rounded border border-gold/15 bg-ink-900/40 p-2 text-center">
          <div className="font-mono text-[9px] text-parchment-200/40">最终军事优势</div>
          <div className={`font-mono text-sm font-bold ${war.warScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {war.warScore >= 0 ? '+' : ''}{war.warScore}
          </div>
        </div>
        <div className="rounded border border-gold/15 bg-ink-900/40 p-2 text-center">
          <div className="font-mono text-[9px] text-parchment-200/40">持续回合</div>
          <div className="font-mono text-sm font-bold text-parchment-100">
            {war.chosenOptions.length}
          </div>
        </div>
      </div>

      {/* 决策回顾 */}
      <div className="mb-5">
        <div className="font-mono text-[9px] text-parchment-200/40 mb-1.5">战争期间的决策路径</div>
        <div className="flex flex-col gap-1">
          {war.chosenOptions.map((c, i) => (
            <div
              key={i}
              className="rounded bg-ink-900/40 px-2 py-1 font-serif text-[11px] text-parchment-200/70"
            >
              <span className="font-mono text-[9px] text-gold/60 mr-1.5">阶段 {i + 1}</span>
              {c.label}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onDismiss}
          className="btn-gold px-5 py-2 text-sm"
        >
          返回治理
        </button>
      </div>
    </div>
  )
}
