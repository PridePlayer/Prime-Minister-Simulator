import { motion } from 'motion/react'
import { useState, useMemo } from 'react'
import { X, Clock, Handshake, AlertTriangle, Gavel, CheckCircle, XCircle } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { clamp } from '@/engine/metrics'
import { BACKGROUNDS, TRAITS } from '@/data/pmBackgrounds'
import type { Metrics, PoliticalParty, PMStats, NewsItem, PMBackground, PMTrait } from '@/types/game'

/** 法案类型定义 */
interface BillType {
  id: string
  name: string
  icon: string
  description: string
  /** 通过后对一级指标的影响 */
  effects: Partial<Metrics>
  /** 通过后对二级指标的影响 */
  secondaryEffects?: Record<string, number>
  /** 法案难度修正（越高越难拉票） */
  difficultyMod: number
}

/** 法案库 */
const BILL_TYPES: BillType[] = [
  {
    id: 'bill_economy',
    name: '经济刺激法案',
    icon: '📊',
    description: '大规模基建投资与减税组合，提振经济但消耗国库。',
    effects: { economy: 8, treasury: -10, approval: 3 },
    difficultyMod: 0,
  },
  {
    id: 'bill_welfare',
    name: '社会福利扩展法案',
    icon: '🤲',
    description: '扩大医保与失业保障覆盖面，民意大幅提升但财政承压。',
    effects: { approval: 10, treasury: -6, stability: 3 },
    difficultyMod: 1,
  },
  {
    id: 'bill_tax',
    name: '财政改革法案',
    icon: '💰',
    description: '调整税制结构、打击逃税，充实国库但触怒既得利益者。',
    effects: { treasury: 12, approval: -4, economy: 2 },
    difficultyMod: 2,
  },
  {
    id: 'bill_security',
    name: '国家安全强化法案',
    icon: '🛡️',
    description: '扩大情报与执法机构权力，提升稳定但侵蚀公民自由。',
    effects: { stability: 8, approval: -3, prestige: 2 },
    difficultyMod: 1,
  },
  {
    id: 'bill_diplomacy',
    name: '外交授权法案',
    icon: '🕊️',
    description: '授予政府贸易谈判与条约签署特权，提升外交空间。',
    effects: { diplomacy: 7, prestige: 3, treasury: -2 },
    difficultyMod: 0,
  },
]

/** 密室行动类型 */
type BackroomAction = 'bribe' | 'threaten' | 'persuade'

/** 行动结果 */
interface ActionResult {
  success: boolean
  votesGained: number
  message: string
  newsTone: 'positive' | 'negative' | 'neutral'
}

/** 弹窗阶段 */
type Phase = 'select' | 'vote_calc' | 'backroom' | 'result'

/** 表决结果 */
interface VoteResult {
  passed: boolean
  yesVotes: number
  noVotes: number
  abstain: number
  chickenCollapse: boolean
}

/** 密室行动记录 */
interface ActionLog {
  partyName: string
  action: BackroomAction
  result: ActionResult
}

const MAX_BACKROOM_ACTIONS = 3
const PASS_THRESHOLD = 50

/** 计算初始支持票数
 *  PM 背景与特质的 billVoteBonus 会加成初始票数：
 *    legal_expert +10%、political_dynasty +5%
 *  PMTraits（hardliner 等）目前只在密室行动中生效，不影响初始票数
 */
function calcInitialVotes(
  parties: PoliticalParty[],
  bill: BillType | undefined,
  pmBackground: PMBackground | null,
  pmTraits: PMTrait[],
): { yes: number; opposition: PoliticalParty[] } {
  let yes = 0
  const opposition: PoliticalParty[] = []
  for (const p of parties) {
    if (p.inCoalition) {
      yes += p.seats
    } else {
      // 好感度高的反对党可能部分支持
      if (p.favorability >= 70) {
        yes += Math.floor(p.seats * 0.5)
      } else if (p.favorability >= 50) {
        yes += Math.floor(p.seats * 0.2)
      }
      opposition.push(p)
    }
  }
  // PM 背景法案通过率加成（legal_expert +10%、political_dynasty +5%）
  const bgInfo = pmBackground ? BACKGROUNDS.find((b) => b.id === pmBackground) : null
  const bgBonus = bgInfo?.billVoteBonus ?? 0
  if (bgBonus > 0) {
    yes = Math.round(yes * (1 + bgBonus))
  }
  // 高难度法案（difficultyMod >= 2）会遭遇强烈抵制，初始票数大幅降低
  // 这确保即使执政联盟席位过半，也可能无法直接通过，必须进入密室政治
  if (bill && bill.difficultyMod >= 2) {
    const penalty = bill.difficultyMod * 8 // 每点难度扣除 8% 支持
    yes = Math.max(0, yes - penalty)
  }
  return { yes, opposition }
}

/** 执行密室行动
 *  PM 特质会影响特定行动的成功率：
 *    hardliner：威胁 +15%
 *    coordinator：利益勾兑 +15%
 *    pragmatist / idealist：游说 +10%
 *  PM 背景 union_representative 也会加成利益勾兑 +10%
 */
function executeBackroomAction(
  action: BackroomAction,
  party: PoliticalParty,
  pmStats: PMStats,
  difficultyMod: number,
  pmBackground: PMBackground | null,
  pmTraits: PMTrait[],
): ActionResult {
  const rand = Math.random()

  // 计算特质/背景对当前行动的加成
  let bonus = 0
  const bgInfo = pmBackground ? BACKGROUNDS.find((b) => b.id === pmBackground) : null
  for (const tid of pmTraits) {
    const tinfo = TRAITS.find((t) => t.id === tid)
    if (!tinfo) continue
    if (action === 'bribe') bonus += tinfo.bribeBonus ?? 0
    if (action === 'threaten') bonus += tinfo.threatenBonus ?? 0
    if (action === 'persuade') bonus += tinfo.persuadeBonus ?? 0
  }
  if (action === 'bribe' && bgInfo?.bribeBonus) bonus += bgInfo.bribeBonus

  switch (action) {
    case 'bribe': {
      // 利益勾兑：成功率基于好感度，好感越高越容易被说服
      const successRate = Math.max(0.2, Math.min(0.85 + bonus, (party.favorability / 100) * 0.9 - difficultyMod * 0.05 + bonus))
      if (rand < successRate) {
        return {
          success: true,
          votesGained: party.seats,
          message: `成功拉拢${party.name}：承诺在下一期预算中为其选区拨款，党魁点头同意。`,
          newsTone: 'positive',
        }
      }
      return {
        success: false,
        votesGained: 0,
        message: `${party.name}党魁当面拒绝："这种交易太露骨了，我不想被抓把柄。"`,
        newsTone: 'negative',
      }
    }
    case 'threaten': {
      // 政治威胁：成功率基于风险指数，但失败后果严重
      const successRate = Math.max(0.15, Math.min(0.75 + bonus, (pmStats.riskIndex / 100) * 0.8 + bonus))
      if (rand < successRate) {
        return {
          success: true,
          votesGained: Math.ceil(party.seats * 0.7),
          message: `安全局提供的材料让${party.name}党魁脸色铁青，最终同意"表决当天请假缺席"。`,
          newsTone: 'neutral',
        }
      }
      return {
        success: false,
        votesGained: 0,
        message: `${party.name}党魁拍桌而起："你想恐吓我？明天头条见！"威胁反被曝光。`,
        newsTone: 'negative',
      }
    }
    case 'persuade': {
      // 游说中立议员：成功率基于辩论技巧
      const successRate = Math.max(0.25, Math.min(0.8 + bonus, (pmStats.rhetoric / 100) * 0.85 + bonus))
      if (rand < successRate) {
        const gained = 3 + Math.floor(Math.random() * 4)
        return {
          success: true,
          votesGained: gained,
          message: `一番唇枪舌剑后，几名中立议员被说服投出赞成票（+${gained}票）。`,
          newsTone: 'positive',
        }
      }
      return {
        success: false,
        votesGained: 0,
        message: `游说未果，中立议员们表示"需要再考虑考虑"。`,
        newsTone: 'neutral',
      }
    }
  }
}

export default function BillVotingDialog({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('select')
  const [selectedBill, setSelectedBill] = useState<BillType | null>(null)
  const [yesVotes, setYesVotes] = useState(0)
  const [actionsLeft, setActionsLeft] = useState(MAX_BACKROOM_ACTIONS)
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [result, setResult] = useState<VoteResult | null>(null)
  const [targetPartyId, setTargetPartyId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<BackroomAction | null>(null)

  const parties = useGameStore((s) => s.parties)
  const pmStats = useGameStore((s) => s.pmStats)
  const pmBackground = useGameStore((s) => s.pmBackground)
  const pmTraits = useGameStore((s) => s.pmTraits)
  const startBackroomLobby = useGameStore((s) => s.startBackroomLobby)

  const opposition = useMemo(() => {
    return parties.filter((p) => !p.inCoalition).sort((a, b) => b.seats - a.seats)
  }, [parties])

  /** 选择法案后进入投票计算 */
  const handleSelectBill = (bill: BillType) => {
    setSelectedBill(bill)
    const { yes } = calcInitialVotes(parties, bill, pmBackground, pmTraits)
    setYesVotes(yes)
    if (yes >= PASS_THRESHOLD) {
      // 直接通过
      setPhase('result')
      setResult({
        passed: true,
        yesVotes: yes,
        noVotes: 100 - yes,
        abstain: 0,
        chickenCollapse: false,
      })
      applyResult(bill, true, yes, false)
    } else {
      setPhase('backroom')
    }
  }

  /** 执行密室行动 */
  const handleBackroomAction = (action: BackroomAction, party?: PoliticalParty) => {
    if (actionsLeft <= 0) return
    const target = party ?? opposition[0]
    if (!target) return

    const actionResult = executeBackroomAction(action, target, pmStats, selectedBill?.difficultyMod ?? 0, pmBackground, pmTraits)

    // 应用代价
    const state = useGameStore.getState()
    const newMetrics = { ...state.metrics }
    const newPmStats = { ...state.pmStats }
    const newParties = [...state.parties]

    switch (action) {
      case 'bribe':
        newMetrics.treasury = clamp(newMetrics.treasury - 8)
        newPmStats.politicalCapital = clamp(newPmStats.politicalCapital - 5)
        break
      case 'threaten':
        newPmStats.riskIndex = clamp(newPmStats.riskIndex + 6)
        newMetrics.prestige = clamp(newMetrics.prestige - 4)
        // 威胁失败时该党好感度大跌
        if (!actionResult.success) {
          const idx = newParties.findIndex((p) => p.id === target.id)
          if (idx >= 0) {
            newParties[idx] = {
              ...newParties[idx],
              favorability: clamp(newParties[idx].favorability - 15),
            }
          }
        }
        break
      case 'persuade':
        newPmStats.politicalCapital = clamp(newPmStats.politicalCapital - 3)
        break
    }

    useGameStore.setState({
      metrics: newMetrics,
      pmStats: newPmStats,
      parties: newParties,
    })

    if (actionResult.success) {
      setYesVotes((v) => v + actionResult.votesGained)
    }
    setLogs((prev) => [...prev, { partyName: target.name, action, result: actionResult }])
    setActionsLeft((n) => n - 1)
    setTargetPartyId(null)
    setPendingAction(null)
  }

  /** 强制表决（悬崖战术） */
  const handleForceVote = () => {
    if (!selectedBill) return
    const chickenCollapse = yesVotes < 35
    const passed = yesVotes >= PASS_THRESHOLD
    setResult({
      passed,
      yesVotes,
      noVotes: 100 - yesVotes,
      abstain: 0,
      chickenCollapse,
    })
    setPhase('result')
    applyResult(selectedBill, passed, yesVotes, chickenCollapse)
  }

  /** 应用表决结果到游戏状态 */
  const applyResult = (bill: BillType, passed: boolean, votes: number, chickenCollapse: boolean) => {
    const state = useGameStore.getState()
    const newMetrics = { ...state.metrics }
    const newParliament = { ...state.parliament }
    const newsItems: NewsItem[] = []

    if (passed) {
      // 法案通过：应用正面效果
      for (const [key, value] of Object.entries(bill.effects)) {
        const k = key as keyof Metrics
        newMetrics[k] = clamp(newMetrics[k] + (value ?? 0))
      }
      newParliament.confidence = clamp(newParliament.confidence + 5)
      newsItems.push({
        id: `news_bill_pass_${Date.now()}`,
        timestamp: `${state.year}年${state.month}月`,
        title: `《${bill.name}》获议会通过`,
        summary: `议会以 ${votes} 票赞成、${100 - votes} 票反对通过法案。${bill.description}`,
        category: '议会',
        tone: 'positive',
      })
    } else {
      // 法案未通过
      newMetrics.prestige = clamp(newMetrics.prestige - 5)
      newParliament.confidence = clamp(newParliament.confidence - 8)

      if (chickenCollapse) {
        // 悬崖崩塌：政府面临解散危机
        newParliament.confidence = clamp(newParliament.confidence - 15)
        newMetrics.stability = clamp(newMetrics.stability - 8)
        newMetrics.approval = clamp(newMetrics.approval - 6)
        newsItems.push({
          id: `news_bill_collapse_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: `《${bill.name}》惨遭否决，政府陷入宪政危机`,
          summary: `仅获 ${votes} 票支持的法案在悬崖表决中崩盘。反对党联合发起不信任动议，要求总理辞职或解散议会。政治豪赌失败，执政根基动摇。`,
          category: '议会',
          tone: 'negative',
        })
      } else {
        newsItems.push({
          id: `news_bill_fail_${Date.now()}`,
          timestamp: `${state.year}年${state.month}月`,
          title: `《${bill.name}》未获议会通过`,
          summary: `法案仅获 ${votes} 票支持，未达半数门槛。总理立法议程受挫，反对党士气大振。`,
          category: '议会',
          tone: 'negative',
        })
      }
    }

    useGameStore.setState({
      metrics: newMetrics,
      parliament: newParliament,
      news: [...newsItems, ...state.news],
    })
  }

  const actionLabel: Record<BackroomAction, string> = {
    bribe: '利益勾兑',
    threaten: '政治威胁',
    persuade: '游说中立',
  }

  const actionIcon: Record<BackroomAction, string> = {
    bribe: '🤝',
    threaten: '⚠️',
    persuade: '🗣️',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        className="modal-content max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-gold/30 pb-3 mb-4 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h3 className="font-display text-lg font-bold text-gold">议会法案表决</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose()
                startBackroomLobby()
              }}
              className="flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-900/30 px-2.5 py-1 font-serif text-xs font-semibold text-purple-300 transition-colors hover:bg-purple-800/50 hover:border-purple-400/60"
              title="关闭表决，进入深夜官邸密室游说棋盘"
            >
              🌙 密室游说棋盘
            </button>
            <button
              onClick={onClose}
              className="rounded-full bg-gold/10 px-2.5 py-1 font-mono text-xs text-gold hover:bg-gold/20"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* 阶段1：选择法案 */}
        {phase === 'select' && (
          <div>
            <p className="font-serif text-sm text-parchment-200/70 mb-4 leading-relaxed">
              选择一项法案提交议会表决。根据当前政党席位分布，法案可能直接通过、需要密室斡旋，或在悬崖表决中崩盘。
            </p>
            <div className="grid grid-cols-1 gap-2">
              {BILL_TYPES.map((bill) => (
                <motion.button
                  key={bill.id}
                  whileHover={{ x: 2 }}
                  onClick={() => handleSelectBill(bill)}
                  className="doc-card p-3 text-left transition-colors hover:border-gold/40 hover:bg-ink-800/60"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{bill.icon}</span>
                    <span className="font-serif text-sm font-bold text-parchment-100">{bill.name}</span>
                  </div>
                  <p className="font-serif text-xs text-parchment-200/50 leading-relaxed">{bill.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Object.entries(bill.effects).map(([key, value]) => {
                      const labels: Record<string, string> = {
                        economy: '经济', treasury: '国库', approval: '民意',
                        stability: '稳定', diplomacy: '外交', prestige: '声望',
                      }
                      const v = value ?? 0
                      return (
                        <span
                          key={key}
                          className={`font-mono text-[10px] ${v > 0 ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {labels[key] ?? key} {v > 0 ? '+' : ''}{v}
                        </span>
                      )
                    })}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* 阶段2：密室会谈 */}
        {phase === 'backroom' && selectedBill && (
          <div>
            {/* 法案信息 */}
            <div className="rounded-lg border border-gold/30 bg-ink-900/50 p-3 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{selectedBill.icon}</span>
                <span className="font-display text-base font-bold text-gold">{selectedBill.name}</span>
              </div>
              <p className="font-serif text-xs text-parchment-200/60">{selectedBill.description}</p>
            </div>

            {/* 票数显示 */}
            <div className="flex items-center justify-between mb-4 rounded-lg border border-amber-500/30 bg-amber-950/30 p-3">
              <div>
                <div className="font-mono text-[9px] tracking-widest text-amber-400/70">当前赞成票</div>
                <div className="font-display text-3xl font-bold text-amber-300">
                  {yesVotes}
                  <span className="font-mono text-sm text-amber-400/50"> / {PASS_THRESHOLD}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[9px] tracking-widest text-red-400/70">剩余密室行动</div>
                <div className="flex items-center gap-1 mt-0.5">
                  {Array.from({ length: MAX_BACKROOM_ACTIONS }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-2.5 w-2.5 rounded-full ${
                        i < actionsLeft ? 'bg-amber-400' : 'bg-ink-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 密室行动记录 */}
            {logs.length > 0 && (
              <div className="mb-3 space-y-1.5 max-h-32 overflow-y-auto">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={`rounded px-2.5 py-1.5 font-serif text-xs leading-relaxed border-l-2 ${
                      log.result.success
                        ? 'border-green-500/60 bg-green-950/20 text-parchment-200/80'
                        : 'border-red-500/60 bg-red-950/20 text-parchment-200/80'
                    }`}
                  >
                    <span className="font-mono text-[9px] text-parchment-200/40">
                      {actionIcon[log.action]} {actionLabel[log.action]} · {log.partyName}
                    </span>
                    <p className="mt-0.5">{log.result.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 行动选择 */}
            {actionsLeft > 0 && yesVotes < PASS_THRESHOLD && (
              <div>
                <div className="font-serif text-xs font-semibold text-parchment-200/60 mb-2">
                  选择密室行动 {targetPartyId && '· 目标：' + (opposition.find((p) => p.id === targetPartyId)?.name ?? '')}
                </div>

                {/* 目标选择（仅 bribe/threaten 需要选目标） */}
                {pendingAction && pendingAction !== 'persuade' && !targetPartyId && (
                  <div className="mb-3 space-y-1">
                    <div className="font-mono text-[9px] text-parchment-200/40">选择目标党派：</div>
                    {opposition.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setTargetPartyId(p.id)}
                        className="w-full flex items-center justify-between rounded border border-gold/20 bg-ink-900/40 px-3 py-1.5 hover:border-gold/40 transition-colors"
                      >
                        <span className="font-serif text-xs text-parchment-100">
                          {p.icon} {p.name}
                        </span>
                        <span className="font-mono text-[10px] text-parchment-200/50">
                          {p.seats}席 · 好感{p.favorability}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* 确认按钮 */}
                {pendingAction && (pendingAction === 'persuade' || targetPartyId) && (
                  <div className="mb-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        const target = opposition.find((p) => p.id === targetPartyId)
                        handleBackroomAction(pendingAction, target)
                      }}
                      className="rounded bg-gold/20 px-3 py-1.5 font-serif text-xs font-bold text-gold border border-gold/40 hover:bg-gold/30"
                    >
                      确认执行
                    </button>
                    <button
                      onClick={() => { setPendingAction(null); setTargetPartyId(null) }}
                      className="rounded bg-ink-700 px-3 py-1.5 font-serif text-xs text-parchment-200 hover:bg-ink-600"
                    >
                      取消
                    </button>
                  </div>
                )}

                {/* 行动按钮 */}
                {!pendingAction && (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPendingAction('bribe')}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-left hover:border-emerald-500/50 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Handshake size={14} className="text-emerald-400" />
                        <span className="font-serif text-xs font-bold text-emerald-300">利益勾兑</span>
                      </div>
                      <div className="font-mono text-[9px] text-parchment-200/40">
                        💰-8 · ⭐-5
                      </div>
                      <p className="font-serif text-[10px] text-parchment-200/50 mt-1 leading-snug">
                        承诺拨款/职位，成功率随好感度提升
                      </p>
                    </button>
                    <button
                      onClick={() => setPendingAction('threaten')}
                      className="rounded-lg border border-red-500/30 bg-red-950/30 p-2.5 text-left hover:border-red-500/50 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle size={14} className="text-red-400" />
                        <span className="font-serif text-xs font-bold text-red-300">政治威胁</span>
                      </div>
                      <div className="font-mono text-[9px] text-parchment-200/40">
                        🏅-4 · ⚠风险+6
                      </div>
                      <p className="font-serif text-[10px] text-parchment-200/50 mt-1 leading-snug">
                        用黑料施压，成功率随风险指数提升
                      </p>
                    </button>
                    <button
                      onClick={() => handleBackroomAction('persuade')}
                      className="rounded-lg border border-blue-500/30 bg-blue-950/30 p-2.5 text-left hover:border-blue-500/50 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Gavel size={14} className="text-blue-400" />
                        <span className="font-serif text-xs font-bold text-blue-300">游说中立</span>
                      </div>
                      <div className="font-mono text-[9px] text-parchment-200/40">
                        ⭐-3
                      </div>
                      <p className="font-serif text-[10px] text-parchment-200/50 mt-1 leading-snug">
                        游说中立议员，成功率随辩论技巧
                      </p>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 悬崖表决按钮 */}
            <div className="mt-4 pt-3 border-t border-gold/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-parchment-200/50">
                  <Clock size={12} />
                  {actionsLeft > 0
                    ? `剩余 ${actionsLeft} 次密室行动，或直接强制表决`
                    : '密室行动已用完，必须表决'}
                </div>
                <button
                  onClick={handleForceVote}
                  className={`rounded px-4 py-2 font-serif text-xs font-bold transition-colors ${
                    yesVotes < 35
                      ? 'bg-red-700 text-white hover:bg-red-800 animate-pulse'
                      : yesVotes < PASS_THRESHOLD
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-gold text-ink-900 hover:bg-gold/80'
                  }`}
                >
                  {yesVotes < 35 ? '⚠ 悬崖表决' : '强制表决'}
                </button>
              </div>
              {yesVotes < 35 && (
                <p className="mt-1.5 font-mono text-[10px] text-red-400/70 leading-relaxed">
                  ⚠ 当前票数过低（{yesVotes}/50），悬崖表决失败将引发宪政危机，可能导致政府解散。
                </p>
              )}
            </div>
          </div>
        )}

        {/* 阶段3：表决结果 */}
        {phase === 'result' && result && selectedBill && (
          <div className="text-center py-2 px-1">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 ${
                result.passed
                  ? 'border-green-500/60 bg-green-950/40'
                  : 'border-red-500/60 bg-red-950/40'
              }`}
            >
              {result.passed ? (
                <CheckCircle size={40} className="text-green-400" />
              ) : (
                <XCircle size={40} className="text-red-400" />
              )}
            </motion.div>

            <h3 className={`font-display text-2xl font-bold mb-1 ${
              result.passed ? 'text-green-400' : 'text-red-400'
            }`}>
              {result.passed ? '法案通过' : '法案未通过'}
            </h3>
            <p className="font-serif text-sm text-parchment-200/60 mb-4">
              《{selectedBill.name}》
            </p>

            {/* 票数统计 */}
            <div className="flex justify-center gap-6 mb-4">
              <div className="rounded-lg border border-green-500/30 bg-green-950/20 px-4 py-2">
                <div className="font-mono text-[9px] text-green-400/60">赞成</div>
                <div className="font-display text-2xl font-bold text-green-400">{result.yesVotes}</div>
              </div>
              <div className="rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-2">
                <div className="font-mono text-[9px] text-red-400/60">反对</div>
                <div className="font-display text-2xl font-bold text-red-400">{result.noVotes}</div>
              </div>
            </div>

            {/* 悬崖崩塌警告 */}
            {result.chickenCollapse && (
              <div className="mb-4 rounded-lg border border-red-500/50 bg-red-950/40 p-3">
                <div className="font-display text-sm font-bold text-red-300 mb-1">
                  ⚡ 悬崖崩塌 · 宪政危机
                </div>
                <p className="font-serif text-xs text-red-200/70 leading-relaxed">
                  悬崖表决惨败，议会信任度大幅下跌，反对党发起不信任动议。执政根基严重动摇。
                </p>
              </div>
            )}

            {/* 效果摘要 */}
            <div className="rounded-lg border border-gold/20 bg-ink-900/40 p-3 mb-4">
              <div className="font-mono text-[9px] text-parchment-200/40 mb-1.5">效果</div>
              <div className="flex flex-wrap justify-center gap-2">
                {result.passed ? (
                  Object.entries(selectedBill.effects).map(([key, value]) => {
                    const labels: Record<string, string> = {
                      economy: '经济', treasury: '国库', approval: '民意',
                      stability: '稳定', diplomacy: '外交', prestige: '声望',
                    }
                    const v = value ?? 0
                    return (
                      <span key={key} className={`font-mono text-xs font-bold ${v > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {labels[key] ?? key} {v > 0 ? '+' : ''}{v}
                      </span>
                    )
                  })
                ) : (
                  <>
                    <span className="font-mono text-xs font-bold text-red-400">声望 -5</span>
                    <span className="font-mono text-xs font-bold text-red-400">议会信任 -8</span>
                    {result.chickenCollapse && (
                      <>
                        <span className="font-mono text-xs font-bold text-red-400">稳定 -8</span>
                        <span className="font-mono text-xs font-bold text-red-400">民意 -6</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="btn-gold px-6 py-2"
            >
              确认
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
