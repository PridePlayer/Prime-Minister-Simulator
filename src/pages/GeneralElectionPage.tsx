import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { clamp } from '@/engine/metrics'

/** 大选阶段类型 */
type ElectionStage = 1 | 2 | 3 | 4

/** 巡回演讲地区 */
interface CampaignRegion {
  id: string
  name: string
  icon: string
  description: string
  options: {
    id: string
    label: string
    description: string
    approvalDelta: number
    scandalRisk: number
  }[]
}

/** 媒体攻势选项 */
interface MediaOption {
  id: string
  label: string
  icon: string
  description: string
  approvalDelta: number
  scandalRisk: number
}

/** 收买议员选项 */
interface BribeOption {
  id: string
  label: string
  description: string
  treasuryCost: number
  seatsGain: number
  scandalRisk: number
}

/** 电视辩论问题 */
interface DebateQuestion {
  id: string
  topic: string
  icon: string
  question: string
}

/** 辩论卡牌 */
interface DebateCard {
  id: string
  name: string
  icon: string
  description: string
  /** 不同问题类别的胜率修正（基于 pmStats.rhetoric 基础） */
  modifiers: Record<string, number>
}

const REGIONS: CampaignRegion[] = [
  {
    id: 'north_industrial',
    name: '北部工业带',
    icon: '🏭',
    description: '失业率居高不下的传统工业区，蓝领选民聚集。',
    options: [
      { id: 'factory_visit', label: '深入工厂车间', description: '与工人面对面，承诺就业', approvalDelta: 6, scandalRisk: 5 },
      { id: 'rally_speech', label: '大型集会演讲', description: '动员群众，激发情绪', approvalDelta: 8, scandalRisk: 15 },
      { id: 'factory_visit2', label: '低调走访', description: '避免张扬，稳扎稳打', approvalDelta: 4, scandalRisk: 0 },
    ],
  },
  {
    id: 'central_agriculture',
    name: '中部农业省',
    icon: '🌾',
    description: '农业大省，农民关心补贴与水利。',
    options: [
      { id: 'subsidy_pledge', label: '承诺提高补贴', description: '直接给农民承诺福利', approvalDelta: 7, scandalRisk: 5 },
      { id: 'town_meeting', label: '乡镇座谈', description: '深入田间地头', approvalDelta: 5, scandalRisk: 0 },
      { id: 'media_stunt', label: '作秀收割', description: '媒体跟拍摆拍', approvalDelta: 3, scandalRisk: 20 },
    ],
  },
  {
    id: 'southern_coastal',
    name: '南部沿海',
    icon: '🌊',
    description: '经济发达，中产阶级与商界精英聚集。',
    options: [
      { id: 'business_forum', label: '商界论坛演讲', description: '展示经济能力', approvalDelta: 6, scandalRisk: 5 },
      { id: 'tv_interview', label: '电视专访', description: '面向全国展示形象', approvalDelta: 7, scandalRisk: 10 },
      { id: 'elite_dinner', label: '精英晚宴', description: '私下筹款拉票', approvalDelta: 4, scandalRisk: 25 },
    ],
  },
]

const MEDIA_OPTIONS: MediaOption[] = [
  { id: 'tv_debate', label: '电视辩论', icon: '📺', description: '与对手正面交锋，胜则大涨', approvalDelta: 10, scandalRisk: 20 },
  { id: 'internet_campaign', label: '网络宣传', icon: '💻', description: '社交媒体轰炸，吸引年轻选民', approvalDelta: 6, scandalRisk: 10 },
  { id: 'newspaper_interview', label: '报纸专访', icon: '📰', description: '深度阐述政策，稳中求胜', approvalDelta: 4, scandalRisk: 0 },
]

const BRIBE_OPTIONS: BribeOption[] = [
  { id: 'bribe_small', label: '小规模收买', description: '私下接触几名摇摆议员', treasuryCost: 5, seatsGain: 2, scandalRisk: 30 },
  { id: 'bribe_medium', label: '中等规模收买', description: '动用专项资金笼络议员', treasuryCost: 10, seatsGain: 3, scandalRisk: 30 },
  { id: 'bribe_large', label: '大规模收买', description: '不惜代价换取席位', treasuryCost: 15, seatsGain: 5, scandalRisk: 30 },
]

const DEBATE_QUESTIONS: DebateQuestion[] = [
  { id: 'economy', topic: '经济', icon: '💰', question: '通胀高企、失业率攀升，您如何回应？' },
  { id: 'approval', topic: '民意', icon: '📊', question: '民调持续下滑，您是否已失去民心？' },
  { id: 'diplomacy', topic: '外交', icon: '🌐', question: '近期外交挫败，您的外交政策是否失败？' },
]

const DEBATE_CARDS: DebateCard[] = [
  {
    id: 'hard_counter',
    name: '强硬反击',
    icon: '⚔️',
    description: '正面回击对手，气势压人',
    modifiers: { economy: 10, approval: -10, diplomacy: 5 },
  },
  {
    id: 'data_refute',
    name: '数据反驳',
    icon: '📈',
    description: '用详实数据驳斥对方论点',
    modifiers: { economy: 25, approval: 15, diplomacy: 10 },
  },
  {
    id: 'emotional_appeal',
    name: '情感诉求',
    icon: '🎭',
    description: '诉诸选民情感与共同记忆',
    modifiers: { economy: -5, approval: 25, diplomacy: 5 },
  },
  {
    id: 'deflect_topic',
    name: '转移话题',
    icon: '🔄',
    description: '将议题转向对手的弱点',
    modifiers: { economy: 5, approval: 5, diplomacy: -10 },
  },
]

/** 行动日志条目 */
interface ActionLog {
  id: string
  text: string
  tone: 'positive' | 'negative' | 'neutral'
}

export default function GeneralElectionPage() {
  const metrics = useGameStore((s) => s.metrics)
  const pmStats = useGameStore((s) => s.pmStats)
  const parliament = useGameStore((s) => s.parliament)
  const electionSnapshot = useGameStore((s) => s.electionSnapshot)
  const treasury = useGameStore((s) => s.metrics.treasury)
  const resolveGeneralElection = useGameStore((s) => s.resolveGeneralElection)

  const [stage, setStage] = useState<ElectionStage>(1)
  const [actionPoints, setActionPoints] = useState(3)
  const [campaignBonus, setCampaignBonus] = useState(0)
  const [debateBonus, setDebateBonus] = useState(0)
  const [seatsBonus, setSeatsBonus] = useState(0)
  const [scandalPenalty, setScandalPenalty] = useState(0)
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [treasurySpent, setTreasurySpent] = useState(0)

  // 阶段 3 辩论状态
  const [debateRound, setDebateRound] = useState(0)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [debateLog, setDebateLog] = useState<{ question: string; result: 'win' | 'lose'; delta: number }[]>([])

  // 阶段 4 结果
  const [finalScore, setFinalScore] = useState(0)
  const [finalSeats, setFinalSeats] = useState(0)
  const [won, setWon] = useState<boolean | null>(null)

  const initialApproval = electionSnapshot?.approval ?? metrics.approval
  const initialSeats = electionSnapshot?.seats ?? parliament.rulingPartySeats
  const term = electionSnapshot?.term ?? 1

  const addLog = (text: string, tone: ActionLog['tone']) => {
    setLogs((prev) => [{ id: `log_${Date.now()}_${Math.random()}`, text, tone }, ...prev].slice(0, 20))
  }

  /** 触发丑闻检查：30% 概率被曝光扣 approval（转化为 campaignBonus 减少） */
  const triggerScandalCheck = (risk: number) => {
    if (Math.random() * 100 < risk) {
      const penalty = 4 + Math.floor(Math.random() * 4) // 4-7
      setScandalPenalty((p) => p + penalty)
      addLog(`🚨 丑闻曝光！民意损失 ${penalty} 点`, 'negative')
      return true
    }
    return false
  }

  /** 阶段 2：执行巡回演讲选项 */
  const handleRegionOption = (region: CampaignRegion, optionId: string) => {
    const option = region.options.find((o) => o.id === optionId)
    if (!option) return
    setCampaignBonus((b) => b + option.approvalDelta)
    addLog(`${region.icon} ${region.name} · ${option.label}：民意 +${option.approvalDelta}`, 'positive')
    triggerScandalCheck(option.scandalRisk)
    setActionPoints((p) => p - 1)
  }

  /** 阶段 2：执行媒体攻势 */
  const handleMediaOption = (option: MediaOption) => {
    setCampaignBonus((b) => b + option.approvalDelta)
    addLog(`${option.icon} ${option.label}：民意 +${option.approvalDelta}`, 'positive')
    triggerScandalCheck(option.scandalRisk)
    setActionPoints((p) => p - 1)
  }

  /** 阶段 2：执行收买议员 */
  const handleBribeOption = (option: BribeOption) => {
    if (treasury - treasurySpent < option.treasuryCost) {
      addLog(`❌ 国库不足，无法收买议员`, 'negative')
      return
    }
    setTreasurySpent((t) => t + option.treasuryCost)
    setSeatsBonus((s) => s + option.seatsGain)
    addLog(`💰 ${option.label}：席位 +${option.seatsGain}，国库 -${option.treasuryCost}`, 'positive')
    triggerScandalCheck(option.scandalRisk)
    setActionPoints((p) => p - 1)
  }

  /** 阶段 3：执行辩论出牌 */
  const handleDebateCard = (card: DebateCard) => {
    const question = DEBATE_QUESTIONS[currentQuestionIdx]
    // 基础胜率：pmStats.rhetoric + 卡牌修正
    const baseRate = Math.max(5, Math.min(95, pmStats.rhetoric + (card.modifiers[question.id] ?? 0)))
    const success = Math.random() * 100 < baseRate
    const delta = success
      ? 5 + Math.floor(Math.random() * 6) // 5-10
      : -(5 + Math.floor(Math.random() * 6)) // -5 to -10

    setDebateBonus((b) => b + delta)
    setDebateLog((prev) => [...prev, { question: question.question, result: success ? 'win' : 'lose', delta }])
    addLog(
      `${card.icon} ${card.name} 应对「${question.topic}」${success ? '✓ 胜' : '✗ 败'}：民意 ${delta > 0 ? '+' : ''}${delta}`,
      success ? 'positive' : 'negative',
    )

    const nextRound = debateRound + 1
    setDebateRound(nextRound)
    if (nextRound >= 3) {
      // 进入阶段 4
      setTimeout(() => {
        computeResult()
        setStage(4)
      }, 800)
    } else {
      setCurrentQuestionIdx((i) => i + 1)
    }
  }

  /** 阶段 4：计算最终结果 */
  const computeResult = () => {
    const score = Math.round(
      initialApproval * 0.4 +
        metrics.economy * 0.25 +
        metrics.stability * 0.2 +
        metrics.prestige * 0.15 +
        campaignBonus +
        debateBonus -
        scandalPenalty,
    )
    const randomShift = Math.floor(Math.random() * 21) - 10 // ±10
    const seats = clamp(score + randomShift)
    const win = score >= 50 && seats >= 50
    setFinalScore(score)
    setFinalSeats(seats)
    setWon(win)
  }

  /** 阶段 4：继续按钮 */
  const handleContinue = () => {
    if (won === null) return
    const seats = finalSeats
    const narrative = won
      ? `任期届满大选结束，您以 ${finalScore} 分综合评分赢得 ${seats} 个席位，成功连任第 ${term + 1} 届总理。选民用手中的选票延续了对您的信任。`
      : `任期届满大选结束，您仅获得 ${finalScore} 分综合评分与 ${seats} 个席位，未达连任门槛。反对党领袖在欢呼中登上总理宝座，您的政治生涯就此落幕。`
    resolveGeneralElection({ won, seats, narrative })
  }

  /** 进入下一阶段 */
  const goNextStage = () => {
    setStage((s) => (s + 1) as ElectionStage)
  }

  return (
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-ink-900 via-ink-950 to-black">
      {/* 装饰金色顶栏 */}
      <div className="sticky top-0 z-10 border-b border-gold/30 bg-ink-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <div className="font-display text-lg font-bold tracking-[0.2em] text-gold">
                第 {term} 届全国大选
              </div>
              <div className="font-mono text-[10px] tracking-wider text-parchment-200/60">
                GENERAL ELECTION · 任期届满
              </div>
            </div>
          </div>
          {/* 阶段进度指示 */}
          <div className="flex items-center gap-2">
            {[
              { n: 1, label: '形势评估' },
              { n: 2, label: '竞选活动' },
              { n: 3, label: '电视辩论' },
              { n: 4, label: '投票结果' },
            ].map((s) => (
              <div
                key={s.n}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] tracking-wider transition-colors ${
                  stage === s.n
                    ? 'bg-gold text-ink-900'
                    : stage > s.n
                    ? 'bg-gold/20 text-gold'
                    : 'bg-ink-900/60 text-parchment-200/40'
                }`}
              >
                <span>{stage > s.n ? '✓' : s.n}</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <AnimatePresence mode="wait">
          {/* ============ 阶段 1：形势评估 ============ */}
          {stage === 1 && (
            <motion.div
              key="stage1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl mb-2"
                >
                  📋
                </motion.div>
                <h2 className="font-display text-2xl font-bold text-gold mb-1">形势评估</h2>
                <p className="font-serif text-sm text-parchment-200/60">
                  在开战之前，先看清战场全貌
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricCard icon="📊" label="当前民意" value={initialApproval} color="#3b82f6" />
                <MetricCard icon="💰" label="经济" value={metrics.economy} color="#10b981" />
                <MetricCard icon="🛡️" label="稳定" value={metrics.stability} color="#f59e0b" />
                <MetricCard icon="🎖️" label="声望" value={metrics.prestige} color="#a855f7" />
              </div>

              <div className="rounded-xl border border-gold/30 bg-ink-900/60 p-6">
                <div className="font-serif text-sm font-semibold text-parchment-200 mb-4">
                  📈 综合评分预估
                </div>
                <div className="flex items-end gap-4">
                  <div className="font-mono text-5xl font-bold text-gold">
                    {Math.round(
                      initialApproval * 0.4 +
                        metrics.economy * 0.25 +
                        metrics.stability * 0.2 +
                        metrics.prestige * 0.15,
                    )}
                  </div>
                  <div className="pb-2 font-serif text-xs text-parchment-200/60">
                    / 100 · 民意×0.4 + 经济×0.25 + 稳定×0.2 + 声望×0.15
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-700">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${clamp(
                        initialApproval * 0.4 +
                          metrics.economy * 0.25 +
                          metrics.stability * 0.2 +
                          metrics.prestige * 0.15,
                      )}%`,
                    }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-4">
                  <div className="font-serif text-xs text-parchment-200/60 mb-1">当前席位</div>
                  <div className="font-mono text-3xl font-bold text-blue-400">{initialSeats}</div>
                  <div className="font-mono text-[10px] text-parchment-200/40">/ 100 · 过半需 ≥ 50</div>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4">
                  <div className="font-serif text-xs text-parchment-200/60 mb-1">国库余额</div>
                  <div className="font-mono text-3xl font-bold text-amber-400">{treasury}</div>
                  <div className="font-mono text-[10px] text-parchment-200/40">可用于收买议员</div>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={goNextStage}
                  className="rounded-full bg-gradient-to-r from-amber-500 to-gold px-10 py-3 font-display text-lg font-bold text-ink-900 shadow-lg shadow-gold/30"
                >
                  🚀 开始竞选
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ============ 阶段 2：竞选活动 ============ */}
          {stage === 2 && (
            <motion.div
              key="stage2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-gold mb-1">🎯 竞选活动</h2>
                  <p className="font-serif text-sm text-parchment-200/60">
                    每项行动消耗 1 行动点 · 丑闻风险实时累积
                  </p>
                </div>
                <div className="rounded-xl border border-gold/30 bg-ink-900/60 px-5 py-3 text-right">
                  <div className="font-mono text-[10px] tracking-wider text-parchment-200/60">
                    剩余行动点
                  </div>
                  <div className="font-mono text-3xl font-bold text-gold">{actionPoints}</div>
                </div>
              </div>

              {/* 实时加分面板 */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <BonusCard icon="📣" label="竞选加分" value={campaignBonus} color="#3b82f6" />
                <BonusCard icon="💰" label="收买席位" value={seatsBonus} color="#f59e0b" />
                <BonusCard icon="🚨" label="丑闻扣分" value={-scandalPenalty} color="#ef4444" />
                <BonusCard icon="🏦" label="国库已用" value={treasurySpent} color="#a855f7" />
              </div>

              {/* 行动区 */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* 巡回演讲 */}
                <div className="rounded-xl border border-gold/20 bg-ink-900/40 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xl">📍</span>
                    <h3 className="font-serif text-sm font-semibold text-gold">巡回演讲</h3>
                  </div>
                  <div className="space-y-3">
                    {REGIONS.map((region) => (
                      <details key={region.id} className="group rounded-lg border border-ink-600/40 bg-ink-950/40">
                        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 font-serif text-xs text-parchment-100 hover:bg-ink-800/40">
                          <span>{region.icon}</span>
                          <span className="flex-1">{region.name}</span>
                          <span className="font-mono text-[10px] text-parchment-200/40">▾</span>
                        </summary>
                        <div className="space-y-1.5 px-3 pb-2">
                          {region.options.map((opt) => (
                            <button
                              key={opt.id}
                              disabled={actionPoints <= 0}
                              onClick={() => handleRegionOption(region, opt.id)}
                              className="w-full rounded border border-ink-600/40 bg-ink-900/60 px-2 py-1.5 text-left font-serif text-[11px] text-parchment-200 transition-colors hover:border-gold/40 hover:bg-ink-800/60 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <div className="font-semibold text-parchment-100">{opt.label}</div>
                              <div className="text-[10px] text-parchment-200/50">{opt.description}</div>
                              <div className="mt-0.5 flex gap-2 font-mono text-[10px]">
                                <span className="text-green-400">民意 +{opt.approvalDelta}</span>
                                {opt.scandalRisk > 0 && (
                                  <span className="text-red-400">丑闻 {opt.scandalRisk}%</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>

                {/* 媒体攻势 */}
                <div className="rounded-xl border border-gold/20 bg-ink-900/40 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xl">📺</span>
                    <h3 className="font-serif text-sm font-semibold text-gold">媒体攻势</h3>
                  </div>
                  <div className="space-y-2">
                    {MEDIA_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        disabled={actionPoints <= 0}
                        onClick={() => handleMediaOption(opt)}
                        className="w-full rounded-lg border border-ink-600/40 bg-ink-950/40 px-3 py-2 text-left transition-colors hover:border-gold/40 hover:bg-ink-800/60 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{opt.icon}</span>
                          <span className="flex-1 font-serif text-xs font-semibold text-parchment-100">
                            {opt.label}
                          </span>
                        </div>
                        <div className="mt-1 font-serif text-[10px] text-parchment-200/60">
                          {opt.description}
                        </div>
                        <div className="mt-0.5 flex gap-2 font-mono text-[10px]">
                          <span className="text-green-400">民意 +{opt.approvalDelta}</span>
                          {opt.scandalRisk > 0 && (
                            <span className="text-red-400">丑闻 {opt.scandalRisk}%</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 收买议员 */}
                <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    <h3 className="font-serif text-sm font-semibold text-red-300">收买议员</h3>
                  </div>
                  <div className="space-y-2">
                    {BRIBE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        disabled={actionPoints <= 0 || treasury - treasurySpent < opt.treasuryCost}
                        onClick={() => handleBribeOption(opt)}
                        className="w-full rounded-lg border border-red-500/30 bg-ink-950/40 px-3 py-2 text-left transition-colors hover:border-red-400/60 hover:bg-ink-800/60 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <div className="font-serif text-xs font-semibold text-parchment-100">
                          {opt.label}
                        </div>
                        <div className="mt-0.5 font-serif text-[10px] text-parchment-200/60">
                          {opt.description}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-2 font-mono text-[10px]">
                          <span className="text-amber-400">国库 -{opt.treasuryCost}</span>
                          <span className="text-green-400">席位 +{opt.seatsGain}</span>
                          <span className="text-red-400">丑闻 {opt.scandalRisk}%</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 行动日志 */}
              {logs.length > 0 && (
                <div className="rounded-xl border border-ink-600/40 bg-ink-950/60 p-4">
                  <div className="mb-2 font-serif text-xs font-semibold text-parchment-200/70">
                    📜 行动日志
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className={`font-mono text-[11px] ${
                          log.tone === 'positive'
                            ? 'text-green-400'
                            : log.tone === 'negative'
                            ? 'text-red-400'
                            : 'text-parchment-200/70'
                        }`}
                      >
                        {log.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 进入阶段 3 */}
              {actionPoints <= 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center pt-2"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={goNextStage}
                    className="rounded-full bg-gradient-to-r from-amber-500 to-gold px-10 py-3 font-display text-lg font-bold text-ink-900 shadow-lg shadow-gold/30"
                  >
                    🎤 进入电视辩论
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ============ 阶段 3：电视辩论 ============ */}
          {stage === 3 && (
            <motion.div
              key="stage3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-5xl mb-2"
                >
                  🎤
                </motion.div>
                <h2 className="font-display text-2xl font-bold text-gold mb-1">电视辩论</h2>
                <p className="font-serif text-sm text-parchment-200/60">
                  反对党领袖连发 3 个质询 · 从手牌中选 1 张应对
                </p>
              </div>

              {/* 辩论进度 */}
              <div className="flex items-center justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`h-2 w-12 rounded-full transition-colors ${
                      i < debateRound ? 'bg-gold' : i === debateRound ? 'bg-amber-400' : 'bg-ink-700'
                    }`}
                  />
                ))}
              </div>

              {/* 当前问题 */}
              <AnimatePresence mode="wait">
                {debateRound < 3 && (
                  <motion.div
                    key={currentQuestionIdx}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="rounded-xl border border-red-500/40 bg-red-950/30 p-6 text-center"
                  >
                    <div className="mb-2 text-3xl">{DEBATE_QUESTIONS[currentQuestionIdx].icon}</div>
                    <div className="font-serif text-xs tracking-wider text-red-300 mb-2">
                      反对党领袖质询 · 第 {currentQuestionIdx + 1} 题 · 主题：
                      {DEBATE_QUESTIONS[currentQuestionIdx].topic}
                    </div>
                    <p className="font-display text-lg text-parchment-100">
                      「{DEBATE_QUESTIONS[currentQuestionIdx].question}」
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 手牌区 */}
              {debateRound < 3 && (
                <div>
                  <div className="mb-3 text-center font-serif text-xs text-parchment-200/60">
                    选择一张卡牌应对 · 胜率基于辩论技巧（当前 {pmStats.rhetoric}）
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {DEBATE_CARDS.map((card) => {
                      const qid = DEBATE_QUESTIONS[currentQuestionIdx].id
                      const winRate = Math.max(5, Math.min(95, pmStats.rhetoric + (card.modifiers[qid] ?? 0)))
                      return (
                        <motion.button
                          key={card.id}
                          whileHover={{ scale: 1.04, y: -4 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleDebateCard(card)}
                          className="rounded-xl border border-gold/40 bg-gradient-to-b from-ink-800 to-ink-950 p-4 text-center shadow-lg"
                        >
                          <div className="mb-2 text-3xl">{card.icon}</div>
                          <div className="mb-1 font-display text-sm font-bold text-gold">
                            {card.name}
                          </div>
                          <div className="mb-2 font-serif text-[10px] text-parchment-200/60">
                            {card.description}
                          </div>
                          <div className="rounded-full bg-ink-900/80 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                            胜率 {winRate}%
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 辩论日志 */}
              {debateLog.length > 0 && (
                <div className="rounded-xl border border-ink-600/40 bg-ink-950/60 p-4">
                  <div className="mb-2 font-serif text-xs font-semibold text-parchment-200/70">
                    📜 辩论实录
                  </div>
                  <div className="space-y-1.5">
                    {debateLog.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 font-serif text-[11px]"
                      >
                        <span className={d.result === 'win' ? 'text-green-400' : 'text-red-400'}>
                          {d.result === 'win' ? '✓' : '✗'}
                        </span>
                        <span className="flex-1 text-parchment-200/70">{d.question}</span>
                        <span
                          className={`font-mono ${
                            d.delta > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {d.delta > 0 ? '+' : ''}
                          {d.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ============ 阶段 4：投票结果 ============ */}
          {stage === 4 && won !== null && (
            <motion.div
              key="stage4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-center"
              >
                <div className="text-7xl mb-3">{won ? '🎉' : '😞'}</div>
                <h2
                  className={`font-display text-3xl font-bold mb-2 ${
                    won ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {won ? '成功连任' : '落败下台'}
                </h2>
                <p className="font-serif text-sm text-parchment-200/70">
                  {won
                    ? `恭喜您赢得第 ${term + 1} 届总理任期`
                    : '您的政治生涯就此落幕'}
                </p>
              </motion.div>

              {/* 综合评分拆解 */}
              <div className="rounded-xl border border-gold/30 bg-ink-900/60 p-6">
                <div className="mb-4 font-serif text-sm font-semibold text-parchment-200">
                  📊 综合评分拆解
                </div>
                <div className="space-y-2 font-mono text-xs">
                  <ScoreLine label="初始民意 (×0.4)" value={Math.round(initialApproval * 0.4)} />
                  <ScoreLine label="经济 (×0.25)" value={Math.round(metrics.economy * 0.25)} />
                  <ScoreLine label="稳定 (×0.2)" value={Math.round(metrics.stability * 0.2)} />
                  <ScoreLine label="声望 (×0.15)" value={Math.round(metrics.prestige * 0.15)} />
                  <ScoreLine label="📣 竞选加分" value={campaignBonus} />
                  <ScoreLine label="🎤 辩论加分" value={debateBonus} />
                  <ScoreLine label="🚨 丑闻扣分" value={-scandalPenalty} />
                  <div className="my-2 border-t border-gold/20" />
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-serif text-sm font-bold text-gold">最终评分</span>
                    <span className="text-2xl font-bold text-gold">{finalScore}</span>
                  </div>
                </div>
              </div>

              {/* 席位变化条形图 */}
              <div className="rounded-xl border border-gold/30 bg-ink-900/60 p-6">
                <div className="mb-4 font-serif text-sm font-semibold text-parchment-200">
                  🪑 席位变化
                </div>
                <div className="space-y-4">
                  <SeatBar label="大选前" seats={initialSeats} color="#64748b" />
                  <SeatBar label="收买所得" seats={seatsBonus} color="#f59e0b" />
                  <SeatBar label="最终席位" seats={finalSeats} color={won ? '#10b981' : '#ef4444'} highlight />
                  <div className="border-t border-gold/20 pt-3 font-mono text-xs text-parchment-200/60">
                    过半数线：50 席 · {finalSeats >= 50 ? '✓ 达标' : '✗ 未达标'}
                  </div>
                </div>
              </div>

              {/* 结果判定 */}
              <div
                className={`rounded-xl border p-4 text-center ${
                  won
                    ? 'border-green-500/40 bg-green-950/30'
                    : 'border-red-500/40 bg-red-950/30'
                }`}
              >
                <div className="font-serif text-sm text-parchment-200/70">
                  {won
                    ? `综合评分 ${finalScore} ≥ 50 且席位 ${finalSeats} ≥ 50 · 连任成功`
                    : finalScore < 50 && finalSeats < 50
                    ? `综合评分 ${finalScore} < 50 且席位 ${finalSeats} < 50 · 双重未达标`
                    : finalScore < 50
                    ? `综合评分 ${finalScore} < 50 · 评分未达标`
                    : `席位 ${finalSeats} < 50 · 席位未过半`}
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleContinue}
                  className={`rounded-full px-12 py-3 font-display text-lg font-bold shadow-lg ${
                    won
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/30'
                      : 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/30'
                  }`}
                >
                  {won ? '➡ 继续执政' : '➡ 查看结局'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** 指标卡片 */
function MetricCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-gold/20 bg-ink-900/40 p-4 text-center">
      <div className="mb-1 text-2xl">{icon}</div>
      <div className="font-mono text-[10px] tracking-wider text-parchment-200/60">{label}</div>
      <div className="font-mono text-2xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

/** 加分卡片 */
function BonusCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-ink-600/40 bg-ink-950/40 p-3 text-center">
      <div className="mb-1 text-lg">{icon}</div>
      <div className="font-mono text-[9px] tracking-wider text-parchment-200/50">{label}</div>
      <div className="font-mono text-xl font-bold" style={{ color }}>
        {value > 0 ? '+' : ''}
        {value}
      </div>
    </div>
  )
}

/** 评分行 */
function ScoreLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-parchment-200/70">{label}</span>
      <span className={value >= 0 ? 'text-green-400' : 'text-red-400'}>
        {value > 0 ? '+' : ''}
        {value}
      </span>
    </div>
  )
}

/** 席位条形图 */
function SeatBar({
  label,
  seats,
  color,
  highlight,
}: {
  label: string
  seats: number
  color: string
  highlight?: boolean
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-xs">
        <span className="text-parchment-200/70">{label}</span>
        <span className="font-bold" style={{ color }}>
          {seats} 席
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-ink-800">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, seats)}%` }}
          transition={{ duration: 0.8 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: highlight ? `0 0 12px ${color}` : undefined }}
        />
      </div>
    </div>
  )
}
