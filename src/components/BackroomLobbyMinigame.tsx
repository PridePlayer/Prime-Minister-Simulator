// 深夜官邸·密室游说 minigame：在棋盘上收买利益集团代表
// 玩家在 5x5 棋盘上移动，靠近代表后可选择三种游说方式：
//   - 利益交换：消耗国库，成功率较高
//   - 政治承诺：消耗政治资本，成功率中等
//   - 威逼利诱：提升风险指数，成功率低但收益高
// 累计已收买代表的总影响力 ≥ 80 即视为游说成功
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { clamp } from '@/engine/metrics'

// 棋盘尺寸（5x5）
const BOARD_COLS = 5
const BOARD_ROWS = 5
// 玩家行动点
const MAX_STEPS = 8
// 游说成功阈值：已收买代表总影响力 ≥ 80
const SUCCESS_THRESHOLD = 80
// 棋格尺寸（px），用于玩家棋子的平滑移动动画
const CELL_SIZE = 64
const CELL_GAP = 6 // gap-1.5 = 6px
const CELL_STRIDE = CELL_SIZE + CELL_GAP

type Phase = 'entry' | 'board' | 'result'
type NegotiationOptionId = 'interest' | 'promise' | 'threaten'

/** 利益集团代表 */
interface Representative {
  id: string
  name: string
  emoji: string
  pos: { x: number; y: number }
  influence: number
  bribed: boolean
  talked: boolean
  locked: boolean
  /** v1.5：派系（决定诉求类型与风格） */
  faction: RepresentativeFaction
  /** v1.5：派系诉求（玩家若收买则需在后续兑现） */
  demand: RepresentativeDemand
}

/** v1.5：派系类型（决定代表风格与诉求池） */
type RepresentativeFaction =
  | 'financier'
  | 'labor'
  | 'media'
  | 'clergy'
  | 'military'
  | 'industry'
  | 'aristocrat'
  | 'reformist'

/** v1.5：派系元信息（名称/图标/诉求池/影响力范围） */
const FACTION_META: Record<RepresentativeFaction, {
  name: string
  emoji: string
  influenceRange: [number, number]
  demands: { text: string; effectLabel: string }[]
}> = {
  financier: {
    name: '银行家公会',
    emoji: '💰',
    influenceRange: [10, 18],
    demands: [
      { text: '要求放松金融监管', effectLabel: '经济 +3 / 稳定 -2' },
      { text: '要求降低资本利得税', effectLabel: '经济 +2 / 国库 -3' },
      { text: '要求央行独立', effectLabel: '经济 +2 / 声望 -2' },
    ],
  },
  labor: {
    name: '工会联盟',
    emoji: '⚒️',
    influenceRange: [14, 22],
    demands: [
      { text: '要求提高最低工资', effectLabel: '民意 +3 / 经济 -2' },
      { text: '要求立法保护罢工权', effectLabel: '民意 +2 / 经济 -3' },
      { text: '要求扩大工会集体谈判权', effectLabel: '稳定 +2 / 经济 -2' },
    ],
  },
  media: {
    name: '媒体大亨',
    emoji: '📰',
    influenceRange: [8, 16],
    demands: [
      { text: '要求放宽媒体所有权限制', effectLabel: '声望 +3 / 民意 -2' },
      { text: '要求政府广告投放倾斜', effectLabel: '声望 +2 / 国库 -2' },
      { text: '要求采访独家权限', effectLabel: '声望 +2 / 风险 +3' },
    ],
  },
  clergy: {
    name: '宗教领袖',
    emoji: '🕯️',
    influenceRange: [10, 18],
    demands: [
      { text: '要求宗教节日法定化', effectLabel: '民意 +2 / 稳定 +1' },
      { text: '要求宗教团体免税', effectLabel: '民意 +1 / 国库 -3' },
      { text: '要求教育课程加入宗教内容', effectLabel: '稳定 +2 / 民意 -2' },
    ],
  },
  military: {
    name: '退役将领',
    emoji: '🎖️',
    influenceRange: [12, 22],
    demands: [
      { text: '要求提高军费预算', effectLabel: '稳定 +3 / 国库 -4' },
      { text: '要求退役军人安置法案', effectLabel: '稳定 +2 / 国库 -2' },
      { text: '要求军方在国安会议有席位', effectLabel: '稳定 +2 / 声望 -2' },
    ],
  },
  industry: {
    name: '工业财阀',
    emoji: '🏭',
    influenceRange: [14, 24],
    demands: [
      { text: '要求放松环保管制', effectLabel: '经济 +4 / 稳定 -2' },
      { text: '要求国企私有化', effectLabel: '经济 +3 / 国库 +2 / 稳定 -3' },
      { text: '要求政府采购倾斜', effectLabel: '经济 +2 / 国库 -3' },
    ],
  },
  aristocrat: {
    name: '旧贵族',
    emoji: '👑',
    influenceRange: [8, 16],
    demands: [
      { text: '要求恢复部分世袭特权', effectLabel: '声望 +2 / 民意 -3' },
      { text: '要求土地继承免税', effectLabel: '声望 +1 / 国库 -3' },
      { text: '要求文化保护法案', effectLabel: '声望 +2 / 稳定 +1' },
    ],
  },
  reformist: {
    name: '改革派学人',
    emoji: '📚',
    influenceRange: [10, 18],
    demands: [
      { text: '要求推动选举制度改革', effectLabel: '民意 +3 / 稳定 -2' },
      { text: '要求公开官员财产', effectLabel: '民意 +2 / 声望 -2' },
      { text: '要求司法独立修宪', effectLabel: '民意 +2 / 稳定 -3' },
    ],
  },
}

/** v1.5：派系诉求（被收买时绑定到玩家承诺） */
interface RepresentativeDemand {
  text: string
  effectLabel: string
}

/** 谈判反馈结果 */
interface NegotiationFeedback {
  repId: string
  optionId: NegotiationOptionId
  success: boolean
  influence: number
  message: string
}

/** 玩家起始位置（左上角） */
const PLAYER_START = { x: 0, y: 0 }

/** v1.5：随机生成密室代表
 *  - 人数：4 ~ 7（随机）
 *  - 位置：5x5 棋盘随机分布，避开起点 (0,0) 与已占用格
 *  - 影响力：按派系 influenceRange 随机
 *  - 派系诉求：从该派系 demands 池中随机选一条
 *  - 派系：从全部 8 类派系中无重复抽取（保证多样性） */
function createInitialReps(): Representative[] {
  const allFactions: RepresentativeFaction[] = [
    'financier', 'labor', 'media', 'clergy',
    'military', 'industry', 'aristocrat', 'reformist',
  ]
  // 洗牌派系
  const shuffledFactions = [...allFactions].sort(() => Math.random() - 0.5)
  // 随机人数 4~7
  const count = 4 + Math.floor(Math.random() * 4)
  const chosenFactions = shuffledFactions.slice(0, count)

  // 生成所有非起点的棋盘坐标并洗牌
  const allCells: { x: number; y: number }[] = []
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < BOARD_COLS; x++) {
      if (x === PLAYER_START.x && y === PLAYER_START.y) continue
      allCells.push({ x, y })
    }
  }
  const shuffledCells = allCells.sort(() => Math.random() - 0.5)

  const reps: Representative[] = []
  for (let i = 0; i < chosenFactions.length; i++) {
    const faction = chosenFactions[i]
    const meta = FACTION_META[faction]
    const cell = shuffledCells[i]
    const influence = meta.influenceRange[0] + Math.floor(
      Math.random() * (meta.influenceRange[1] - meta.influenceRange[0] + 1),
    )
    const demand = meta.demands[Math.floor(Math.random() * meta.demands.length)]
    reps.push({
      id: `rep_${faction}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      name: meta.name,
      emoji: meta.emoji,
      pos: cell,
      influence,
      bribed: false,
      talked: false,
      locked: false,
      faction,
      demand,
    })
  }
  return reps
}

/** 谈判选项定义 */
const NEGOTIATION_OPTIONS: {
  id: NegotiationOptionId
  label: string
  icon: string
  desc: string
  costLabel: (treasury: number, capital: number, risk: number) => string
  canAfford: (treasury: number, capital: number, risk: number) => boolean
  /** 基础成功率（应用前） */
  baseSuccess: number
  border: string
}[] = [
  {
    id: 'interest',
    label: '利益交换',
    icon: '💼',
    desc: '以国库资金换取支持，最为稳妥',
    costLabel: (t) => `消耗 💰 国库 15`,
    canAfford: (t) => t >= 15,
    baseSuccess: 0.75,
    border: 'border-emerald-500/50 hover:bg-emerald-700/30',
  },
  {
    id: 'promise',
    label: '政治承诺',
    icon: '🤝',
    desc: '许下未来政策倾斜的承诺，依赖个人威望',
    costLabel: (_t, c) => `消耗 🎯 政治资本 20`,
    canAfford: (_t, c) => c >= 20,
    baseSuccess: 0.55,
    border: 'border-blue-500/50 hover:bg-blue-700/30',
  },
  {
    id: 'threaten',
    label: '威逼利诱',
    icon: '⚔️',
    desc: '以黑料要挟，成功率低但收益翻倍',
    costLabel: (_t, _c, r) => `增加 ⚠️ 风险指数 8`,
    canAfford: (_t, _c, r) => r <= 92,
    baseSuccess: 0.35,
    border: 'border-red-500/50 hover:bg-red-700/30',
  },
]

/** 计算某选项的实际成功率（受总理特质影响） */
function calcSuccessRate(
  optionId: NegotiationOptionId,
  charisma: number,
  rhetoric: number,
): number {
  const opt = NEGOTIATION_OPTIONS.find((o) => o.id === optionId)!
  let rate = opt.baseSuccess
  // 魅力提升承诺类游说
  if (optionId === 'promise') rate += (charisma - 50) * 0.004
  // 辩论技巧提升威逼类游说
  if (optionId === 'threaten') rate += (rhetoric - 50) * 0.003
  // 利益交换略受魅力影响
  if (optionId === 'interest') rate += (charisma - 50) * 0.001
  return clamp(Math.round(rate * 100)) / 100
}

/** 深夜官邸密室游说 minigame 全屏组件 */
export default function BackroomLobbyMinigame() {
  const open = useGameStore((s) => s.backroomLobbyOpen)
  const endBackroomLobby = useGameStore((s) => s.endBackroomLobby)
  const treasury = useGameStore((s) => s.metrics.treasury)
  const politicalCapital = useGameStore((s) => s.pmStats.politicalCapital)
  const riskIndex = useGameStore((s) => s.pmStats.riskIndex)

  const [phase, setPhase] = useState<Phase>('entry')
  const [reps, setReps] = useState<Representative[]>(createInitialReps)
  const [playerPos, setPlayerPos] = useState(PLAYER_START)
  const [stepsLeft, setStepsLeft] = useState(MAX_STEPS)
  const [negotiatingRepId, setNegotiatingRepId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<NegotiationFeedback | null>(null)
  const [finalResult, setFinalResult] = useState<{ success: boolean; totalInfluence: number } | null>(null)

  // 开启时重置内部状态
  useEffect(() => {
    if (open) {
      setPhase('entry')
      setReps(createInitialReps())
      setPlayerPos(PLAYER_START)
      setStepsLeft(MAX_STEPS)
      setNegotiatingRepId(null)
      setFeedback(null)
      setFinalResult(null)
    }
  }, [open])

  /** 当前可游说的代表（与玩家位置相邻且未被收买/锁定） */
  const adjacentRep = reps.find(
    (r) =>
      !r.bribed &&
      !r.locked &&
      Math.abs(r.pos.x - playerPos.x) + Math.abs(r.pos.y - playerPos.y) === 1,
  )

  /** 已收买代表总影响力 */
  const totalInfluence = reps.filter((r) => r.bribed).reduce((s, r) => s + r.influence, 0)

  /** 移动玩家 */
  const movePlayer = useCallback(
    (dx: number, dy: number) => {
      if (phase !== 'board') return
      if (negotiatingRepId) return
      if (feedback) return
      if (stepsLeft <= 0) return

      const newX = playerPos.x + dx
      const newY = playerPos.y + dy
      if (newX < 0 || newX >= BOARD_COLS || newY < 0 || newY >= BOARD_ROWS) return
      // 不能移动到代表所在格
      if (reps.some((r) => r.pos.x === newX && r.pos.y === newY && !r.bribed)) return

      setPlayerPos({ x: newX, y: newY })
      setStepsLeft((s) => s - 1)
    },
    [phase, negotiatingRepId, feedback, stepsLeft, playerPos, reps],
  )

  /** 键盘控制：方向键 / WASD 移动，E 开始游说，数字键选择选项 */
  useEffect(() => {
    if (!open || phase !== 'board') return
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const key = e.key.toLowerCase()
      if (key === 'arrowup' || key === 'w') { e.preventDefault(); movePlayer(0, -1) }
      else if (key === 'arrowdown' || key === 's') { e.preventDefault(); movePlayer(0, 1) }
      else if (key === 'arrowleft' || key === 'a') { e.preventDefault(); movePlayer(-1, 0) }
      else if (key === 'arrowright' || key === 'd') { e.preventDefault(); movePlayer(1, 0) }
      else if (key === 'e' && adjacentRep) { e.preventDefault(); startNegotiation(adjacentRep.id) }
      else if (negotiatingRepId) {
        if (key === '1') { e.preventDefault(); handleNegotiate('interest') }
        else if (key === '2') { e.preventDefault(); handleNegotiate('promise') }
        else if (key === '3') { e.preventDefault(); handleNegotiate('threaten') }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase, movePlayer, adjacentRep, negotiatingRepId])

  /** 开始与代表谈判 */
  const startNegotiation = (repId: string) => {
    if (feedback) return
    setNegotiatingRepId(repId)
  }

  /** 执行某项游说 */
  const handleNegotiate = (optionId: NegotiationOptionId) => {
    if (!negotiatingRepId) return
    const rep = reps.find((r) => r.id === negotiatingRepId)
    if (!rep) return

    const traits = useGameStore.getState().pmTraitsNumeric
    const rhetoric = useGameStore.getState().pmStats.rhetoric
    const successRate = calcSuccessRate(optionId, traits.charisma, rhetoric)
    const success = Math.random() < successRate

    // 威逼类无论成败都增加风险指数（在 endBackroomLobby 中统一结算）
    // 此处仅在反馈中提示
    let message = ''
    let influenceGained = 0
    if (success) {
      influenceGained = optionId === 'threaten' ? rep.influence * 2 : rep.influence
      message = `${rep.name}接受了您的游说，影响力 +${influenceGained}。`
    } else {
      if (optionId === 'threaten') {
        message = `${rep.name}对您的要挟嗤之以鼻，谈判破裂，并放出风声。该代表已锁定。`
      } else if (optionId === 'promise') {
        message = `${rep.name}对您的空头承诺冷笑，认为您缺乏诚意。该代表已锁定。`
      } else {
        message = `${rep.name}婉拒了您的资金，表示"价码不够"。该代表已锁定。`
      }
    }

    setFeedback({
      repId: rep.id,
      optionId,
      success,
      influence: influenceGained,
      message,
    })

    // 更新代表状态
    setReps((prev) =>
      prev.map((r) => {
        if (r.id !== rep.id) return r
        if (success) return { ...r, bribed: true, talked: true }
        return { ...r, locked: true, talked: true }
      }),
    )

    // 反馈展示 1.6 秒后关闭谈判面板
    window.setTimeout(() => {
      setNegotiatingRepId(null)
      setFeedback(null)
    }, 1600)
  }

  /** 检查胜负条件并进入结算 */
  useEffect(() => {
    if (phase !== 'board') return
    if (finalResult) return

    const bribedInfluence = reps.filter((r) => r.bribed).reduce((s, r) => s + r.influence, 0)
    const allResolved = reps.every((r) => r.bribed || r.locked)

    let resolved: { success: boolean; totalInfluence: number } | null = null
    if (bribedInfluence >= SUCCESS_THRESHOLD) {
      resolved = { success: true, totalInfluence: bribedInfluence }
    } else if (allResolved || (stepsLeft <= 0 && !adjacentRep && !negotiatingRepId)) {
      resolved = { success: false, totalInfluence: bribedInfluence }
    }

    if (resolved) {
      setFinalResult(resolved)
      // 稍作延迟再切到结算页，让玩家看到最后的反馈
      window.setTimeout(() => setPhase('result'), 800)
    }
  }, [reps, stepsLeft, phase, finalResult, adjacentRep, negotiatingRepId])

  /** 结束 minigame，将结果交还 store */
  const handleFinish = () => {
    if (!finalResult) return
    // 计算消耗：根据本轮谈判中实际成功/失败的代表统计
    const threatenedAny = reps.some((r) => r.talked && r.bribed && r.influence >= 16)
    endBackroomLobby({
      success: finalResult.success,
      totalInfluence: finalResult.totalInfluence,
      // 传递已收买的代表信息，便于 store 精确扣费
      bribedReps: reps.filter((r) => r.bribed).map((r) => ({
        id: r.id,
        influence: r.influence,
      })),
      // 是否使用过威逼（用于增加风险指数）
      usedThreaten: threatenedAny,
    })
  }

  const pmName = useGameStore((s) => s.pmName)
  const countryName = useGameStore((s) => s.countryName)
  const charisma = useGameStore((s) => s.pmTraitsNumeric.charisma)
  const rhetoric = useGameStore((s) => s.pmStats.rhetoric)
  const integrity = useGameStore((s) => s.pmTraitsNumeric.integrity)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] overflow-hidden"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, #2a1838 0%, #15091e 55%, #08040c 100%)',
          }}
        >
          {/* 烛光氛围 */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 30%, rgba(245,158,11,0.10) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(190,18,60,0.08) 0%, transparent 45%)',
            }}
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          {/* 烟雾粒子 */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 70%, rgba(200,200,200,0.04) 0%, transparent 8%), radial-gradient(circle at 70% 40%, rgba(200,200,200,0.03) 0%, transparent 6%)',
            }}
          />

          {/* 内容容器 */}
          <div className="relative z-10 flex h-full flex-col">
            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between border-b border-gold/30 bg-black/40 px-6 py-4">
              <div className="flex items-center gap-3">
                <motion.span
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="text-2xl"
                >🌙</motion.span>
                <div>
                  <h2 className="font-display text-lg font-bold tracking-widest text-gold">
                    深 夜 官 邸 · 密 室 游 说
                  </h2>
                  <p className="font-mono text-[10px] tracking-wider text-parchment-200/50">
                    {pmName}总理 · {countryName} · 灯火摇曳
                  </p>
                </div>
              </div>

              {/* 资源面板 */}
              {phase === 'board' && (
                <div className="flex items-center gap-4">
                  <ResourceChip icon="💰" label="国库" value={treasury} color="text-emerald-300" />
                  <ResourceChip icon="🎯" label="政治资本" value={politicalCapital} color="text-blue-300" />
                  <ResourceChip icon="⚠️" label="风险指数" value={riskIndex} color="text-red-300" />
                  <div className="h-6 w-px bg-gold/20" />
                  <ResourceChip icon="👣" label="剩余步数" value={stepsLeft} color="text-amber-300" />
                  <div className="h-6 w-px bg-gold/20" />
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-[10px] text-parchment-200/50">已收买影响力</span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-ink-900/80">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor:
                              totalInfluence >= SUCCESS_THRESHOLD ? '#10b981' : '#f59e0b',
                          }}
                          animate={{ width: `${Math.min(100, (totalInfluence / SUCCESS_THRESHOLD) * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-gold">
                        {totalInfluence}/{SUCCESS_THRESHOLD}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 主体 */}
            <div className="flex-1 overflow-y-auto">
              {phase === 'entry' && (
                <EntryView
                  pmName={pmName}
                  onStart={() => setPhase('board')}
                />
              )}
              {phase === 'board' && (
                <BoardView
                  reps={reps}
                  playerPos={playerPos}
                  stepsLeft={stepsLeft}
                  adjacentRep={adjacentRep ?? null}
                  negotiatingRepId={negotiatingRepId}
                  feedback={feedback}
                  treasury={treasury}
                  politicalCapital={politicalCapital}
                  riskIndex={riskIndex}
                  charisma={charisma}
                  rhetoric={rhetoric}
                  integrity={integrity}
                  onMove={movePlayer}
                  onNegotiate={handleNegotiate}
                  onStartNegotiation={startNegotiation}
                />
              )}
              {phase === 'result' && finalResult && (
                <ResultView
                  success={finalResult.success}
                  totalInfluence={finalResult.totalInfluence}
                  threshold={SUCCESS_THRESHOLD}
                  bribedCount={reps.filter((r) => r.bribed).length}
                  totalReps={reps.length}
                  onFinish={handleFinish}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ============= 子组件 ============= */

/** 资源数值芯片 */
function ResourceChip({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="font-mono text-[10px] text-parchment-200/50">{label}</span>
      <span className={`font-mono text-sm font-bold ${color}`}>
        {icon} {value}
      </span>
    </div>
  )
}

/** 入场介绍页 */
function EntryView({ pmName, onStart }: { pmName: string; onStart: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl text-center"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="mb-6 text-5xl"
        >🕯️</motion.div>
        <h3 className="font-display text-2xl font-bold tracking-widest text-gold mb-4">
          夜 深 了 ， 灯 火 通 明
        </h3>
        <p className="font-serif text-sm text-parchment-200/80 leading-relaxed mb-6">
          {pmName}总理，各方利益集团代表已齐聚官邸密室。他们手中握有左右国政的影响力，
          却也各怀心思。您有 <span className="text-gold font-bold">{MAX_STEPS} 步</span> 行动机会，
          可在棋盘上移动并靠近代表，与之进行游说。
          累计收买影响力达到 <span className="text-gold font-bold">{SUCCESS_THRESHOLD}</span>，
          即可在朝野间形成稳固利益同盟。
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8 text-left">
          <NegotiationCard
            icon="💼"
            label="利益交换"
            cost="💰 国库 -15"
            rate="75%"
            desc="消耗国库，最稳妥"
            border="border-emerald-500/40"
          />
          <NegotiationCard
            icon="🤝"
            label="政治承诺"
            cost="🎯 政治资本 -20"
            rate="55%"
            desc="依赖个人威望"
            border="border-blue-500/40"
          />
          <NegotiationCard
            icon="⚔️"
            label="威逼利诱"
            cost="⚠️ 风险 +8"
            rate="35%"
            desc="高风险，影响力翻倍"
            border="border-red-500/40"
          />
        </div>

        <div className="font-mono text-[11px] text-parchment-200/40 mb-6">
          操作：方向键 / WASD 移动 · E 键游说 · 数字键 1/2/3 选择方式
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="btn-gold px-10 py-3 font-display text-base tracking-widest"
        >
          步 入 密 室
        </motion.button>
      </motion.div>
    </div>
  )
}

/** 谈判方式介绍小卡 */
function NegotiationCard({
  icon, label, cost, rate, desc, border,
}: { icon: string; label: string; cost: string; rate: string; desc: string; border: string }) {
  return (
    <div className={`rounded border ${border} bg-ink-900/50 p-3`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg">{icon}</span>
        <span className="font-serif text-sm font-bold text-parchment-100">{label}</span>
      </div>
      <div className="font-mono text-[10px] text-parchment-200/60 mb-1">{cost}</div>
      <div className="font-mono text-[10px] text-gold/80 mb-1">成功率 {rate}</div>
      <div className="font-serif text-[10px] text-parchment-200/50">{desc}</div>
    </div>
  )
}

/** 棋盘博弈视图 */
function BoardView({
  reps, playerPos, stepsLeft, adjacentRep, negotiatingRepId, feedback,
  treasury, politicalCapital, riskIndex, charisma, rhetoric, integrity,
  onMove, onNegotiate, onStartNegotiation,
}: {
  reps: Representative[]
  playerPos: { x: number; y: number }
  stepsLeft: number
  adjacentRep: Representative | null
  negotiatingRepId: string | null
  feedback: NegotiationFeedback | null
  treasury: number
  politicalCapital: number
  riskIndex: number
  charisma: number
  rhetoric: number
  integrity: number
  onMove: (dx: number, dy: number) => void
  onNegotiate: (optionId: NegotiationOptionId) => void
  onStartNegotiation: (repId: string) => void
}) {
  const negotiatingRep = reps.find((r) => r.id === negotiatingRepId) ?? null

  return (
    <div className="flex h-full">
      {/* 左侧：棋盘 */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative">
          {/* 棋盘 */}
          <div
            className="relative grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${BOARD_COLS}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${BOARD_ROWS}, ${CELL_SIZE}px)`,
              padding: '12px',
              background:
                'linear-gradient(135deg, rgba(74,48,32,0.6) 0%, rgba(42,24,16,0.7) 100%)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '8px',
              boxShadow: '0 0 30px rgba(245,158,11,0.15), inset 0 1px 0 rgba(245,158,11,0.08)',
            }}
          >
            {/* 棋格 */}
            {Array.from({ length: BOARD_ROWS }).map((_, y) =>
              Array.from({ length: BOARD_COLS }).map((_, x) => {
                const rep = reps.find((r) => r.pos.x === x && r.pos.y === y)
                const isAdjacent = adjacentRep?.pos.x === x && adjacentRep?.pos.y === y
                return (
                  <div
                    key={`${x}-${y}`}
                    className={`relative flex items-center justify-center rounded transition-all ${
                      isAdjacent
                        ? 'bg-gold/15 border border-gold/60 animate-pulse-gold'
                        : 'bg-ink-900/40 border border-gold/10'
                    }`}
                    style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  >
                    {/* 代表图标 */}
                    {rep && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`flex flex-col items-center justify-center ${
                          rep.bribed ? 'opacity-100' : rep.locked ? 'opacity-30 grayscale' : 'opacity-90'
                        }`}
                        title={rep.name}
                      >
                        <span className="text-2xl leading-none">{rep.emoji}</span>
                        <span className={`font-mono text-[9px] font-bold mt-0.5 ${
                          rep.bribed ? 'text-emerald-400' : rep.locked ? 'text-red-400' : 'text-gold'
                        }`}>
                          {rep.bribed ? '✓' : rep.locked ? '✗' : rep.influence}
                        </span>
                      </motion.div>
                    )}
                  </div>
                )
              }),
            )}

            {/* 玩家棋子（绝对定位，用于平滑移动动画） */}
            <PlayerToken
              playerPos={playerPos}
              stepsLeft={stepsLeft}
            />
          </div>

          {/* 方向控制按钮（移动端友好） */}
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <div className="flex gap-1.5">
              <MoveBtn label="↑" onClick={() => onMove(0, -1)} disabled={stepsLeft <= 0} />
            </div>
            <div className="flex gap-1.5">
              <MoveBtn label="←" onClick={() => onMove(-1, 0)} disabled={stepsLeft <= 0} />
              <MoveBtn label="↓" onClick={() => onMove(0, 1)} disabled={stepsLeft <= 0} />
              <MoveBtn label="→" onClick={() => onMove(1, 0)} disabled={stepsLeft <= 0} />
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：行动面板 */}
      <div className="w-[340px] border-l border-gold/20 bg-black/30 p-4 flex flex-col">
        {/* 邻近代表提示 */}
        <div className="mb-4">
          <div className="font-mono text-[10px] text-parchment-200/50 mb-2">当前邻近代表</div>
          {adjacentRep && !negotiatingRepId ? (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded border border-gold/40 bg-gold/10 p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{adjacentRep.emoji}</span>
                <div className="flex-1">
                  <div className="font-serif text-sm font-bold text-parchment-100">
                    {adjacentRep.name}
                  </div>
                  <div className="font-mono text-[10px] text-gold/80">
                    影响力 {adjacentRep.influence}
                  </div>
                </div>
              </div>
              {/* v1.5：派系诉求展示（让玩家在游说前就知道"代价"） */}
              <div className="mt-2 rounded border border-purple-500/30 bg-purple-500/5 p-2">
                <div className="font-mono text-[9px] text-purple-300/80 mb-0.5">
                  ⚖️ 派系诉求（收买后需兑现）
                </div>
                <div className="font-serif text-[11px] text-parchment-100 leading-relaxed">
                  {adjacentRep.demand.text}
                </div>
                <div className="font-mono text-[9px] text-parchment-200/50 mt-0.5">
                  后续效果：{adjacentRep.demand.effectLabel}
                </div>
              </div>
              <button
                onClick={() => onStartNegotiation(adjacentRep.id)}
                className="mt-2 w-full rounded bg-gold/20 hover:bg-gold/30 border border-gold/50 px-3 py-1.5 font-serif text-xs font-bold text-gold transition-colors"
              >
                开始游说（E 键）
              </button>
            </motion.div>
          ) : (
            <div className="rounded border border-gold/10 bg-ink-900/30 p-3 text-center">
              <span className="font-serif text-xs text-parchment-200/40">
                {negotiatingRepId ? '正在游说中...' : '靠近代表以开始游说'}
              </span>
            </div>
          )}
        </div>

        {/* 谈判选项面板 */}
        <AnimatePresence mode="wait">
          {negotiatingRep && !feedback && (
            <motion.div
              key="negotiate"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex-1"
            >
              <div className="font-mono text-[10px] text-parchment-200/50 mb-2">
                游说方式 — {negotiatingRep.name}
              </div>
              <div className="space-y-2">
                {NEGOTIATION_OPTIONS.map((opt, idx) => {
                  const canAfford = opt.canAfford(treasury, politicalCapital, riskIndex)
                  const successRate = calcSuccessRate(opt.id, charisma, rhetoric)
                  return (
                    <button
                      key={opt.id}
                      onClick={() => canAfford && onNegotiate(opt.id)}
                      disabled={!canAfford}
                      className={`w-full text-left rounded border ${opt.border} ${
                        canAfford ? 'bg-ink-900/40' : 'bg-ink-900/20 opacity-40 cursor-not-allowed'
                      } p-2.5 transition-all`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{opt.icon}</span>
                        <span className="font-serif text-xs font-bold text-parchment-100">
                          {idx + 1}. {opt.label}
                        </span>
                        <span className="ml-auto font-mono text-[10px] text-gold/80">
                          {Math.round(successRate * 100)}%
                        </span>
                      </div>
                      <div className="font-mono text-[9px] text-parchment-200/60 mb-1">
                        {opt.costLabel(treasury, politicalCapital, riskIndex)}
                      </div>
                      <div className="font-serif text-[10px] text-parchment-200/50">
                        {opt.desc}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 w-full text-center font-mono text-[10px] text-parchment-200/40">
                ↑ 一旦开始，必须选择
              </div>
            </motion.div>
          )}

          {/* 谈判反馈 */}
          {feedback && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`rounded border p-4 ${
                feedback.success
                  ? 'border-emerald-500/50 bg-emerald-900/30'
                  : 'border-red-500/50 bg-red-900/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">
                  {feedback.success ? '✅' : '❌'}
                </span>
                <span className={`font-display text-sm font-bold ${
                  feedback.success ? 'text-emerald-300' : 'text-red-300'
                }`}>
                  {feedback.success ? '游说成功' : '游说失败'}
                </span>
              </div>
              <p className="font-serif text-xs text-parchment-200/80 leading-relaxed">
                {feedback.message}
              </p>
              {feedback.success && (
                <div className="mt-2 font-mono text-xs font-bold text-emerald-400">
                  +{feedback.influence} 影响力
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 总理特质信息 */}
        <div className="mt-auto pt-4 border-t border-gold/10">
          <div className="font-mono text-[10px] text-parchment-200/40 mb-2">总理特质（影响成功率）</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <TraitBadge label="魅力" value={charisma} />
            <TraitBadge label="辩论" value={rhetoric} />
            <TraitBadge label="道德" value={integrity} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** 玩家棋子（绝对定位，平滑移动） */
function PlayerToken({ playerPos, stepsLeft }: { playerPos: { x: number; y: number }; stepsLeft: number }) {
  // 棋盘内边距 12px
  const PAD = 12
  return (
    <motion.div
      className="absolute pointer-events-none"
      animate={{
        x: PAD + playerPos.x * CELL_STRIDE,
        y: PAD + playerPos.y * CELL_STRIDE,
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <div className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 ${
        stepsLeft > 0
          ? 'border-gold bg-gradient-to-br from-ink-700 to-ink-900 shadow-gold/40'
          : 'border-red-500/60 bg-gradient-to-br from-red-900/50 to-ink-900'
      }`}>
        <span className="font-display text-xl font-bold text-gold">总</span>
        {stepsLeft <= 0 && (
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] text-red-400">
            行动力耗尽
          </span>
        )}
      </div>
    </motion.div>
  )
}

/** 移动按钮 */
function MoveBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-10 w-10 items-center justify-center rounded border font-mono text-sm font-bold transition-colors ${
        disabled
          ? 'border-gold/10 bg-ink-900/30 text-parchment-200/20 cursor-not-allowed'
          : 'border-gold/30 bg-ink-800/60 text-gold hover:bg-gold/20'
      }`}
    >
      {label}
    </button>
  )
}

/** 特质徽章 */
function TraitBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-ink-900/50 px-2 py-1">
      <div className="font-mono text-[9px] text-parchment-200/50">{label}</div>
      <div className={`font-mono text-xs font-bold ${
        value >= 70 ? 'text-emerald-400' : value >= 45 ? 'text-orange-400' : 'text-red-400'
      }`}>{value}</div>
    </div>
  )
}

/** 结算视图 */
function ResultView({
  success, totalInfluence, threshold, bribedCount, totalReps, onFinish,
}: {
  success: boolean
  totalInfluence: number
  threshold: number
  bribedCount: number
  totalReps: number
  onFinish: () => void
}) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-xl text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          className="mb-6 text-6xl"
        >{success ? '🤝' : '🕯️'}</motion.div>

        <h3 className={`font-display text-2xl font-bold tracking-widest mb-3 ${
          success ? 'text-emerald-300' : 'text-red-300'
        }`}>
          {success ? '利 益 同 盟 达 成' : '密 室 之 夜 终 焉'}
        </h3>

        <p className="font-serif text-sm text-parchment-200/80 leading-relaxed mb-6">
          {success
            ? '您成功收买了足够的利益集团代表，在朝野间织就了一张稳固的利益网络。'
            : '夜色渐深，代表们陆续散去。您的游说未能达成预期目标，但今夜的密谋仍将在政坛激起涟漪。'}
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded border border-gold/20 bg-ink-900/50 p-3">
            <div className="font-mono text-[10px] text-parchment-200/50 mb-1">收买影响力</div>
            <div className={`font-display text-xl font-bold ${
              success ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {totalInfluence}/{threshold}
            </div>
          </div>
          <div className="rounded border border-gold/20 bg-ink-900/50 p-3">
            <div className="font-mono text-[10px] text-parchment-200/50 mb-1">收买代表</div>
            <div className="font-display text-xl font-bold text-gold">
              {bribedCount}/{totalReps}
            </div>
          </div>
          <div className="rounded border border-gold/20 bg-ink-900/50 p-3">
            <div className="font-mono text-[10px] text-parchment-200/50 mb-1">最终结果</div>
            <div className={`font-display text-xl font-bold ${
              success ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {success ? '成功' : '失败'}
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onFinish}
          className="btn-gold px-10 py-3 font-display text-base tracking-widest"
        >
          离 开 密 室
        </motion.button>
      </motion.div>
    </div>
  )
}
