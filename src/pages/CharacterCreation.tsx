import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { BACKGROUNDS, TRAITS, DEFAULT_PM_STATS, DEFAULT_PM_TRAITS, TRAIT_META } from '@/data/pmBackgrounds'
import { PLAYABLE_PARTIES } from '@/data/parties'
import type { PMBackground, PMTrait, PMStats, PMTraits } from '@/types/game'

interface CharacterCreationProps {
  onComplete: () => void
}

export default function CharacterCreation({ onComplete }: CharacterCreationProps) {
  const startNewGame = useGameStore((s) => s.startNewGame)
  const [step, setStep] = useState<'difficulty' | 'name' | 'background' | 'traits' | 'party' | 'confirm'>('difficulty')
  const [pmName, setPmName] = useState('')
  const [countryName, setCountryName] = useState('')
  const [background, setBackground] = useState<PMBackground | null>(null)
  const [traits, setTraits] = useState<PMTrait[]>([])
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null)
  const [finalStats, setFinalStats] = useState<PMStats>(DEFAULT_PM_STATS)
  const [difficulty, setDifficulty] = useState<'normal' | 'hard'>('normal')
  // 数值化性格特质（滑块）
  const [numericTraits, setNumericTraits] = useState<PMTraits>({ ...DEFAULT_PM_TRAITS })
  // 可分配点数：玩家有 20 点可自由分配到 5 项特质上
  const TOTAL_POINTS = 20
  const allocatedPoints = TRAIT_META.reduce(
    (sum, m) => sum + Math.max(0, numericTraits[m.key] - DEFAULT_PM_TRAITS[m.key]),
    0,
  )
  const remainingPoints = TOTAL_POINTS - allocatedPoints

  const handleBackgroundSelect = (bgId: PMBackground) => {
    setBackground(bgId)
    const bg = BACKGROUNDS.find((b) => b.id === bgId)
    if (bg) {
      setFinalStats({ ...DEFAULT_PM_STATS, ...bg.initialStats })
    }
  }

  const handleTraitToggle = (traitId: PMTrait) => {
    if (traits.includes(traitId)) {
      const newTraits = traits.filter((t) => t !== traitId)
      setTraits(newTraits)
      recalcStats(background, newTraits)
    } else if (traits.length < 2) {
      const newTraits = [...traits, traitId]
      setTraits(newTraits)
      recalcStats(background, newTraits)
    }
  }

  const recalcStats = (bgId: PMBackground | null, traitIds: PMTrait[]) => {
    let stats = { ...DEFAULT_PM_STATS }
    if (bgId) {
      const bg = BACKGROUNDS.find((b) => b.id === bgId)
      if (bg) stats = { ...stats, ...bg.initialStats }
    }
    traitIds.forEach((traitId) => {
      const trait = TRAITS.find((t) => t.id === traitId)
      if (trait) {
        stats = {
          politicalCapital: stats.politicalCapital + (trait.initialStats.politicalCapital || 0),
          partyPrestige: stats.partyPrestige + (trait.initialStats.partyPrestige || 0),
          rhetoric: stats.rhetoric + (trait.initialStats.rhetoric || 0),
          riskIndex: stats.riskIndex + (trait.initialStats.riskIndex || 0),
        }
      }
    })
    setFinalStats(stats)
  }

  /** 调整某项特质数值（受可分配点数约束） */
  const handleTraitSlider = (key: keyof PMTraits, value: number) => {
    const delta = value - numericTraits[key]
    if (delta > 0 && remainingPoints < delta) return // 加值时检查点数
    setNumericTraits((prev) => ({ ...prev, [key]: value }))
  }

  const handleConfirm = () => {
    if (!background || !selectedPartyId) return
    startNewGame(
      pmName || '总理',
      background,
      traits, // 保留老式特质（向后兼容）
      selectedPartyId,
      countryName || '埃尔瓦尼亚共和国',
      numericTraits,
      difficulty,
    )
    onComplete()
  }

  return (
    <div className="flex items-center justify-center h-full overflow-y-auto bg-ink-grid p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="modal-content max-w-4xl w-full p-8"
      >
        <h1 className="font-display text-3xl font-bold text-gold text-center mb-8">
          总理角色创建
        </h1>

        <AnimatePresence mode="wait">
          {step === 'difficulty' && (
            <motion.div
              key="difficulty"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-1">
                <div className="font-serif text-sm text-parchment-200/80">
                  选择执政难度
                </div>
                <div className="font-mono text-[10px] text-parchment-200/40">
                  困难模式下加成打 7 折、扣分放大 30%，且模糊选项不显示效果预览
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDifficulty('normal')}
                  className={`doc-card p-5 text-left transition-all ${
                    difficulty === 'normal'
                      ? 'border-gold/60 bg-gold/10'
                      : 'hover:border-gold/40'
                  }`}
                >
                  <div className="text-3xl mb-2">⚖️</div>
                  <div className="font-serif text-sm font-bold text-parchment-100 mb-1">
                    普通模式
                  </div>
                  <div className="font-serif text-xs text-parchment-200/60 leading-relaxed">
                    完整效果预览，加成与扣分按原值结算。适合初次游玩或体验剧情。
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="font-mono text-[10px] text-emerald-400/80">✓ 显示全部选项效果</div>
                    <div className="font-mono text-[10px] text-emerald-400/80">✓ 加成/扣分 1:1</div>
                  </div>
                </button>
                <button
                  onClick={() => setDifficulty('hard')}
                  className={`doc-card p-5 text-left transition-all ${
                    difficulty === 'hard'
                      ? 'border-red-500/60 bg-red-950/20'
                      : 'hover:border-gold/40'
                  }`}
                >
                  <div className="text-3xl mb-2">🔥</div>
                  <div className="font-serif text-sm font-bold text-parchment-100 mb-1">
                    困难模式
                  </div>
                  <div className="font-serif text-xs text-parchment-200/60 leading-relaxed">
                    加成打 7 折、扣分放大 30%。模糊选项（neutral）隐藏效果，需凭描述自行判断后果。
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="font-mono text-[10px] text-red-400/80">✗ 模糊选项盲选</div>
                    <div className="font-mono text-[10px] text-red-400/80">✗ 加成 ×0.7，扣分 ×1.3</div>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setStep('name')}
                className="btn-gold w-full"
              >
                下一步：命名国家与总理
              </button>
            </motion.div>
          )}

          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block font-serif text-sm text-parchment-200 mb-2">
                  请为您所治理的国家命名
                </label>
                <input
                  type="text"
                  value={countryName}
                  onChange={(e) => setCountryName(e.target.value)}
                  placeholder={'国家名称（留空使用「埃尔瓦尼亚共和国」）'}
                  maxLength={20}
                  className="w-full bg-ink-900/50 border border-gold/20 rounded px-4 py-3 font-serif text-parchment-100 focus:outline-none focus:border-gold/50"
                />
                <p className="mt-1 font-mono text-[10px] text-parchment-200/40">
                  此名称将出现在新闻、成就、结局等所有文本中
                </p>
              </div>
              <div>
                <label className="block font-serif text-sm text-parchment-200 mb-2">
                  请输入总理的名字
                </label>
                <input
                  type="text"
                  value={pmName}
                  onChange={(e) => setPmName(e.target.value)}
                  placeholder="总理姓名"
                  className="w-full bg-ink-900/50 border border-gold/20 rounded px-4 py-3 font-serif text-parchment-100 focus:outline-none focus:border-gold/50"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('difficulty')}
                  className="btn-gold flex-1"
                >
                  上一步
                </button>
                <button
                  onClick={() => setStep('background')}
                  className="btn-gold flex-1"
                >
                  下一步：选择背景身份
                </button>
              </div>
            </motion.div>
          )}

          {step === 'background' && (
            <motion.div
              key="background"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-3 gap-4">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => handleBackgroundSelect(bg.id)}
                    className={`doc-card p-4 text-left transition-all ${
                      background === bg.id
                        ? 'border-gold/60 bg-gold/10'
                        : 'hover:border-gold/40'
                    }`}
                  >
                    <div className="text-3xl mb-2">{bg.icon}</div>
                    <div className="font-serif text-sm font-bold text-parchment-100 mb-1">
                      {bg.name}
                    </div>
                    <div className="font-serif text-xs text-parchment-200/60 mb-3">
                      {bg.description}
                    </div>
                    <div className="space-y-1">
                      {bg.effects.map((effect, i) => (
                        <div key={i} className="font-mono text-[10px] text-gold/80">
                          {effect}
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('name')}
                  className="btn-gold flex-1"
                >
                  上一步
                </button>
                <button
                  onClick={() => setStep('traits')}
                  disabled={!background}
                  className="btn-gold flex-1"
                >
                  下一步：选择特质
                </button>
              </div>
            </motion.div>
          )}

          {step === 'traits' && (
            <motion.div
              key="traits"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-1">
                <div className="font-serif text-sm text-parchment-200/80">
                  分配性格特质点数
                </div>
                <div className="font-mono text-xs text-gold/80">
                  剩余可分配点数：<span className="font-bold text-gold">{remainingPoints}</span> / {TOTAL_POINTS}
                </div>
                <div className="font-mono text-[10px] text-parchment-200/40">
                  拖动滑块调整五项特质（每项默认 50，最高 80，最低 20）。这些数值会在游戏中被事件改变。
                </div>
              </div>

              <div className="space-y-4">
                {TRAIT_META.map((meta) => {
                  const value = numericTraits[meta.key]
                  const defaultValue = DEFAULT_PM_TRAITS[meta.key]
                  const delta = value - defaultValue
                  return (
                    <div key={meta.key} className="doc-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{meta.icon}</span>
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
                          <span className={`font-mono text-lg font-bold ${
                            value < (meta.lowWarn ?? 0) ? 'text-red-400'
                            : value > (meta.highWarn ?? 100) ? 'text-orange-400'
                            : 'text-gold'
                          }`}>
                            {value}
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={80}
                        step={1}
                        value={value}
                        onChange={(e) => handleTraitSlider(meta.key, parseInt(e.target.value, 10))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-ink-900 accent-gold"
                        style={{
                          background: `linear-gradient(to right, rgba(245,158,11,0.6) 0%, rgba(245,158,11,0.6) ${((value - 20) / 60) * 100}%, rgba(40,30,20,0.6) ${((value - 20) / 60) * 100}%, rgba(40,30,20,0.6) 100%)`,
                        }}
                      />
                      <div className="flex justify-between mt-1 font-mono text-[9px] text-parchment-200/30">
                        <span>20</span>
                        <span>50（默认）</span>
                        <span>80</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('background')}
                  className="btn-gold flex-1"
                >
                  上一步
                </button>
                <button
                  onClick={() => setStep('party')}
                  className="btn-gold flex-1"
                >
                  下一步：选择政党
                </button>
              </div>
            </motion.div>
          )}

          {step === 'party' && (
            <motion.div
              key="party"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="font-serif text-sm text-parchment-200/80 text-center">
                请选择您的执政党（所选政党将成为执政党）
              </div>
              <div className="grid grid-cols-2 gap-4">
                {PLAYABLE_PARTIES.map((party) => (
                  <button
                    key={party.id}
                    onClick={() => setSelectedPartyId(party.id)}
                    className={`doc-card p-4 text-left transition-all ${
                      selectedPartyId === party.id
                        ? 'border-gold/60 bg-gold/10'
                        : 'hover:border-gold/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{party.icon}</span>
                      <span className="font-serif text-sm font-bold text-parchment-100">
                        {party.name}
                      </span>
                    </div>
                    <div className="font-serif text-xs text-parchment-200/60 mb-2">
                      {party.description}
                    </div>
                    <div className="font-mono text-[10px] text-parchment-200/50 mb-2">
                      立场：{party.stance}
                    </div>
                    <div className="space-y-1">
                      <div className="font-serif text-[10px] text-parchment-200/70 mb-1">竞选承诺：</div>
                      {party.manifesto?.map((item, i) => (
                        <div key={i} className="font-mono text-[10px] text-gold/80">
                          • {item}
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('traits')}
                  className="btn-gold flex-1"
                >
                  上一步
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={!selectedPartyId}
                  className="btn-gold flex-1"
                >
                  下一步：确认
                </button>
              </div>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="doc-card p-6 space-y-4">
                <div>
                  <div className="font-serif text-xs text-parchment-200/60 mb-1">姓名</div>
                  <div className="font-serif text-lg font-bold text-parchment-100">
                    {pmName || '总理'}
                  </div>
                </div>
                <div>
                  <div className="font-serif text-xs text-parchment-200/60 mb-1">难度</div>
                  <div className={`font-serif text-sm font-bold ${
                    difficulty === 'hard' ? 'text-red-400' : 'text-gold'
                  }`}>
                    {difficulty === 'hard' ? '🔥 困难模式' : '⚖️ 普通模式'}
                  </div>
                </div>
                <div>
                  <div className="font-serif text-xs text-parchment-200/60 mb-1">背景身份</div>
                  <div className="font-serif text-sm text-parchment-100">
                    {BACKGROUNDS.find((b) => b.id === background)?.name}
                  </div>
                </div>
                <div>
                  <div className="font-serif text-xs text-parchment-200/60 mb-2">性格特质</div>
                  <div className="grid grid-cols-5 gap-2">
                    {TRAIT_META.map((meta) => (
                      <div key={meta.key} className="text-center rounded border border-gold/20 bg-ink-900/40 px-2 py-1.5">
                        <div className="text-base">{meta.icon}</div>
                        <div className="font-mono text-[9px] text-parchment-200/60 mt-0.5">{meta.label}</div>
                        <div className={`font-mono text-sm font-bold ${
                          numericTraits[meta.key] < (meta.lowWarn ?? 0) ? 'text-red-400' : 'text-gold'
                        }`}>
                          {numericTraits[meta.key]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-serif text-xs text-parchment-200/60 mb-1">执政党</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {PLAYABLE_PARTIES.find((p) => p.id === selectedPartyId)?.icon}
                    </span>
                    <span className="font-serif text-sm text-parchment-100">
                      {PLAYABLE_PARTIES.find((p) => p.id === selectedPartyId)?.name}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="font-serif text-xs text-parchment-200/60 mb-2">初始属性</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between">
                      <span className="font-serif text-xs text-parchment-200/80">政治资本</span>
                      <span className="font-mono text-sm font-bold text-gold">
                        {finalStats.politicalCapital}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-serif text-xs text-parchment-200/80">党内威望</span>
                      <span className="font-mono text-sm font-bold text-gold">
                        {finalStats.partyPrestige}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-serif text-xs text-parchment-200/80">辩论技巧</span>
                      <span className="font-mono text-sm font-bold text-gold">
                        {finalStats.rhetoric}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-serif text-xs text-parchment-200/80">风险指数</span>
                      <span className="font-mono text-sm font-bold text-gold">
                        {finalStats.riskIndex}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('party')}
                  className="btn-gold flex-1"
                >
                  上一步
                </button>
                <button
                  onClick={handleConfirm}
                  className="btn-gold flex-1"
                >
                  开始执政
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
