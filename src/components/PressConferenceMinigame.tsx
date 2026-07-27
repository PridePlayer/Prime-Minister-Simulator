// 突击新闻发布会 minigame：陷入大丑闻时切入，面对记者提问
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'

/** 记者提问池：媒体单位 + 提问文本 */
const PRESS_QUESTIONS: { media: string; text: string }[] = [
  { media: '国家通讯社', text: '总理阁下，关于您家族企业涉嫌逃税的传闻，您如何回应？' },
  { media: '商业财经日报', text: '近期多名阁员被曝腐败，这是否说明您的反腐承诺已经失败？' },
  { media: '独立调查记者', text: '有指控称您私下干预司法调查，请问是否属实？' },
  { media: '外国媒体', text: '您的外交政策被国际社会批评为软弱，对此有何评论？' },
  { media: '国家通讯社', text: '近期股市大幅波动，民众储蓄缩水，您是否应当承担责任？' },
  { media: '商业财经日报', text: '有消息称政府财政赤字远超公开数据，您是否在向国民隐瞒真相？' },
  { media: '独立调查记者', text: '一段流出录音显示您曾在内部会议上辱骂抗议民众，请问作何解释？' },
  { media: '外国媒体', text: '国际观察组织质疑近期选举的公正性，您是否愿意接受独立调查？' },
]

/** 选项定义：标签 + 预期效果提示 + 描述 + 配色 */
interface OptionDef {
  id: string
  label: string
  hint: string
  desc: string
  border: string
}

const OPTIONS: OptionDef[] = [
  { id: 'evasive', label: '避重就轻', hint: '↓民意 ↓声望 ↓丑闻', desc: '温和回应，含糊其辞', border: 'border-slate-500/40 hover:bg-slate-700/30' },
  { id: 'friendly', label: '眼神锁定友好记者', hint: '↑民意 ↑声望 ↓丑闻', desc: '转移话题到友好媒体', border: 'border-emerald-500/40 hover:bg-emerald-700/30' },
  { id: 'rebuke', label: '直接怒斥记者', hint: '↓民意 ↑声望 ↑丑闻', desc: '强硬反击', border: 'border-red-500/40 hover:bg-red-700/30' },
  { id: 'walkout', label: '离席摔门而去', hint: '↓↓民意 ↓↓声望 ↑↑丑闻', desc: '立即结束发布会', border: 'border-amber-500/40 hover:bg-amber-700/30' },
]

/** 单轮反馈结果 */
interface RoundResult {
  optionId: string
  aDelta: number
  pDelta: number
  sDelta: number
  feedback: string
}

/** 钳制到 0-100 */
const clamp = (v: number) => Math.max(0, Math.min(100, v))

/** 计算选项效果（受总理性格特质 charisma / decisiveness 影响） */
function computeEffects(
  optionId: string,
  traits: { charisma: number; decisiveness: number },
): { aDelta: number; pDelta: number; sDelta: number; feedback: string } {
  if (optionId === 'evasive') {
    return { aDelta: -2, pDelta: -1, sDelta: -3, feedback: '您避重就轻，含糊其辞地回应了提问。' }
  }
  if (optionId === 'friendly') {
    if (traits.charisma < 30) {
      return { aDelta: -1, pDelta: -2, sDelta: 1, feedback: '您试图锁定友好记者，但魅力不足，反而弄巧成拙，被对方追问。' }
    }
    return { aDelta: 1, pDelta: 2, sDelta: -1, feedback: '您眼神锁定友好记者，巧妙地将话题引向有利方向。' }
  }
  if (optionId === 'rebuke') {
    if (traits.decisiveness > 60) {
      return { aDelta: 3, pDelta: 4, sDelta: 5, feedback: '您果断怒斥记者，强硬的姿态反而赢得部分民众喝彩。' }
    }
    return { aDelta: -5, pDelta: 4, sDelta: 5, feedback: '您怒斥记者，强硬姿态虽显威风，却引发民众对新闻自由的不安。' }
  }
  // walkout
  return { aDelta: -10, pDelta: -8, sDelta: 15, feedback: '您摔门而去，闪光灯疯狂闪烁，丑闻彻底失控。' }
}

type Phase = 'intro' | 'questions' | 'summary'

/** 突击新闻发布会 minigame 全屏组件 */
export default function PressConferenceMinigame() {
  const open = useGameStore((s) => s.pressConferenceOpen)
  const initialSeverity = useGameStore((s) => s.pressConferenceSeverity)
  const pmName = useGameStore((s) => s.pmName)
  const endPressConference = useGameStore((s) => s.endPressConference)

  const [phase, setPhase] = useState<Phase>('intro')
  const [round, setRound] = useState(0)
  const [severity, setSeverity] = useState(0)
  const [approvalDelta, setApprovalDelta] = useState(0)
  const [prestigeDelta, setPrestigeDelta] = useState(0)
  const [questionIdx, setQuestionIdx] = useState(0)
  const [lastQuestionIdx, setLastQuestionIdx] = useState(-1)
  const [countdown, setCountdown] = useState(3)
  const [lastResult, setLastResult] = useState<RoundResult | null>(null)
  const [walkedOut, setWalkedOut] = useState(false)

  // 选择锁：防止倒计时与手动点击同时触发导致重复结算
  const lockRef = useRef(false)

  // 开启时重置内部状态
  useEffect(() => {
    if (open) {
      setPhase('intro')
      setRound(0)
      setSeverity(initialSeverity)
      setApprovalDelta(0)
      setPrestigeDelta(0)
      const firstIdx = Math.floor(Math.random() * PRESS_QUESTIONS.length)
      setQuestionIdx(firstIdx)
      setLastQuestionIdx(firstIdx)
      setCountdown(3)
      setLastResult(null)
      setWalkedOut(false)
      lockRef.current = false
    }
  }, [open, initialSeverity])

  // 选取下一题（避免与上一题重复）
  const pickQuestion = () => {
    if (PRESS_QUESTIONS.length <= 1) {
      setQuestionIdx(0)
      return
    }
    let idx = Math.floor(Math.random() * PRESS_QUESTIONS.length)
    while (idx === lastQuestionIdx) {
      idx = Math.floor(Math.random() * PRESS_QUESTIONS.length)
    }
    setQuestionIdx(idx)
    setLastQuestionIdx(idx)
  }

  // 处理选项选择
  const handleChoose = (optionId: string) => {
    if (lockRef.current) return
    lockRef.current = true

    const traits = useGameStore.getState().pmTraitsNumeric
    const { aDelta, pDelta, sDelta, feedback } = computeEffects(optionId, traits)

    setLastResult({ optionId, aDelta, pDelta, sDelta, feedback })
    setApprovalDelta((prev) => prev + aDelta)
    setPrestigeDelta((prev) => prev + pDelta)
    setSeverity((prev) => clamp(prev + sDelta))

    // 离席：立即结束，跳转总结
    if (optionId === 'walkout') {
      setWalkedOut(true)
      window.setTimeout(() => {
        setLastResult(null)
        setPhase('summary')
      }, 1800)
      return
    }

    // 反馈展示后进入下一轮或总结
    window.setTimeout(() => {
      setLastResult(null)
      const nextRound = round + 1
      if (nextRound >= 5) {
        setPhase('summary')
      } else {
        setRound(nextRound)
        pickQuestion()
        setCountdown(3)
      }
      lockRef.current = false
    }, 1800)
  }

  // 3 秒倒计时：超时自动选"避重就轻"
  useEffect(() => {
    if (phase !== 'questions' || lastResult) return
    setCountdown(3)
    let c = 3
    const timer = window.setInterval(() => {
      c -= 1
      if (c < 0) {
        window.clearInterval(timer)
        handleChoose('evasive')
      } else {
        setCountdown(c)
      }
    }, 1000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, lastResult])

  // 结束：将最终结果交还 store
  const handleFinish = () => {
    endPressConference({
      finalSeverity: severity,
      approvalDelta,
      prestigeDelta,
    })
  }

  const question = PRESS_QUESTIONS[questionIdx]
  const countdownPct = (countdown / 3) * 100
  const isUrgent = countdown <= 1

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, #1c1c2e 0%, #0c0c14 55%, #050508 100%)',
          }}
        >
          {/* 相机闪光灯：白色不规则闪烁 */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-white"
            animate={{ opacity: [0, 0, 0.55, 0, 0, 0.25, 0, 0, 0.4, 0] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.3, 0.32, 0.34, 0.55, 0.57, 0.6, 0.8, 0.82, 1] }}
          />
          {/* 聚光灯锥形光晕 */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
            style={{
              background: 'radial-gradient(ellipse at 50% -10%, rgba(245,158,11,0.12) 0%, transparent 60%)',
            }}
          />

          {/* 内容容器 */}
          <div className="relative z-10 flex h-full flex-col">
            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between border-b border-red-500/30 bg-black/40 px-6 py-4">
              <div className="flex items-center gap-3">
                <motion.span
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="text-2xl"
                >🚨</motion.span>
                <div>
                  <h2 className="font-display text-lg font-bold tracking-widest text-red-200">
                    突 击 新 闻 发 布 会
                  </h2>
                  <p className="font-mono text-[10px] tracking-wider text-parchment-200/50">
                    {pmName}总理 · 闪光灯如林
                  </p>
                </div>
              </div>
              {/* 丑闻严重度条 */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-parchment-200/50">丑闻严重度</span>
                <div className="h-2 w-32 overflow-hidden rounded-full bg-ink-900/80">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: severity > 60 ? '#ef4444' : severity > 30 ? '#f59e0b' : '#10b981' }}
                    animate={{ width: `${severity}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-red-300">{Math.round(severity)}</span>
              </div>
            </div>

            {/* 主体 */}
            <div className="flex-1 overflow-y-auto">
              {phase === 'intro' && (
                <IntroView severity={initialSeverity} onStart={() => setPhase('questions')} />
              )}
              {phase === 'questions' && (
                <QuestionsView
                  question={question}
                  round={round}
                  countdown={countdown}
                  countdownPct={countdownPct}
                  isUrgent={isUrgent}
                  lastResult={lastResult}
                  onChoose={handleChoose}
                />
              )}
              {phase === 'summary' && (
                <SummaryView
                  severity={severity}
                  initialSeverity={initialSeverity}
                  approvalDelta={approvalDelta}
                  prestigeDelta={prestigeDelta}
                  walkedOut={walkedOut}
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

/** 阶段 1：开场 */
function IntroView({ severity, onStart }: { severity: number; onStart: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl"
      >
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mb-4 text-5xl"
        >📸</motion.div>
        <h3 className="font-display text-2xl font-bold tracking-wider text-parchment-100 mb-3">
          记者们已经就位
        </h3>
        <p className="font-serif text-sm leading-relaxed text-parchment-200/70 mb-6">
          长枪短炮对准了你。闪光灯此起彼伏，记者们手持录音笔跃跃欲试。
          <br />一场关乎政治生命的危机公关即将开始。
        </p>
        <div className="mb-6 inline-flex items-center gap-3 rounded border border-red-500/30 bg-black/40 px-4 py-2">
          <span className="font-mono text-[10px] text-parchment-200/50">当前丑闻严重度</span>
          <span className="font-display text-2xl font-bold text-red-300">{Math.round(severity)}</span>
          <span className="font-mono text-[10px] text-parchment-200/40">/ 100</span>
        </div>
        <div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            className="rounded border border-red-500/50 bg-red-900/40 px-8 py-2.5 font-display text-sm font-bold tracking-widest text-red-100 hover:bg-red-800/50"
          >
            开 始 发 布 会
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

/** 阶段 2：记者提问核心循环 */
function QuestionsView({
  question,
  round,
  countdown,
  countdownPct,
  isUrgent,
  lastResult,
  onChoose,
}: {
  question: { media: string; text: string }
  round: number
  countdown: number
  countdownPct: number
  isUrgent: boolean
  lastResult: RoundResult | null
  onChoose: (id: string) => void
}) {
  return (
    <div className="flex h-full flex-col">
      {/* 提问区 */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="font-mono text-[10px] tracking-[0.3em] text-red-300/60 mb-2">
          第 {round + 1} / 5 轮 · {question.media}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="max-w-2xl"
          >
            <p className="font-display text-xl font-semibold leading-relaxed text-parchment-100">
              “{question.text}”
            </p>
          </motion.div>
        </AnimatePresence>

        {/* 反馈区 */}
        <AnimatePresence>
          {lastResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-6 max-w-lg rounded border border-gold/30 bg-black/50 px-4 py-3"
            >
              <p className="font-serif text-sm leading-relaxed text-parchment-200/90">
                {lastResult.feedback}
              </p>
              <div className="mt-2 flex justify-center gap-3 font-mono text-[11px]">
                <span className={lastResult.aDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  民意 {lastResult.aDelta >= 0 ? '+' : ''}{lastResult.aDelta}
                </span>
                <span className={lastResult.pDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  声望 {lastResult.pDelta >= 0 ? '+' : ''}{lastResult.pDelta}
                </span>
                <span className={lastResult.sDelta >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                  丑闻 {lastResult.sDelta >= 0 ? '+' : ''}{lastResult.sDelta}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 倒计时进度条 */}
      {!lastResult && (
        <div className="px-6">
          <div className={`mx-auto h-1.5 max-w-2xl overflow-hidden rounded-full bg-ink-900/80 ${isUrgent ? 'animate-pulse' : ''}`}>
            <motion.div
              className="h-full rounded-full bg-red-500"
              animate={{ width: `${countdownPct}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
          <div className="mt-1 text-center font-mono text-[10px] text-red-300/70">
            剩余 {countdown} 秒 · 超时将自动避重就轻
          </div>
        </div>
      )}

      {/* 选项按钮 */}
      <div className="grid grid-cols-2 gap-2 p-4">
        {OPTIONS.map((opt) => (
          <motion.button
            key={opt.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={!!lastResult}
            onClick={() => onChoose(opt.id)}
            className={`rounded border ${opt.border} bg-black/40 p-3 text-left transition-colors disabled:opacity-40`}
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-sm font-bold text-parchment-100">{opt.label}</span>
              <span className="font-mono text-[9px] text-parchment-200/50">{opt.hint}</span>
            </div>
            <p className="mt-0.5 font-serif text-[11px] text-parchment-200/50">{opt.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

/** 阶段 3：结束总结 */
function SummaryView({
  severity,
  initialSeverity,
  approvalDelta,
  prestigeDelta,
  walkedOut,
  onFinish,
}: {
  severity: number
  initialSeverity: number
  approvalDelta: number
  prestigeDelta: number
  walkedOut: boolean
  onFinish: () => void
}) {
  const severityChange = severity - initialSeverity
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl"
      >
        <div className="mb-4 text-4xl">{walkedOut ? '🚪' : '📰'}</div>
        <h3 className="font-display text-2xl font-bold tracking-wider text-parchment-100 mb-2">
          {walkedOut ? '发布会草草收场' : '发布会结束'}
        </h3>
        <p className="font-serif text-sm text-parchment-200/60 mb-6">
          {walkedOut
            ? '总理中途离席，留给媒体一个失控的背影。'
            : '五轮提问结束，总理整理衣襟离开发言台。'}
        </p>

        {/* 总结数据 */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded border border-gold/20 bg-black/40 p-3">
            <div className="font-mono text-[9px] text-parchment-200/40">丑闻严重度</div>
            <div className="font-display text-xl font-bold text-red-300">{Math.round(severity)}</div>
            <div className={`font-mono text-[10px] ${severityChange >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {severityChange >= 0 ? '+' : ''}{Math.round(severityChange)}
            </div>
          </div>
          <div className="rounded border border-gold/20 bg-black/40 p-3">
            <div className="font-mono text-[9px] text-parchment-200/40">民调变化</div>
            <div className={`font-display text-xl font-bold ${approvalDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {approvalDelta >= 0 ? '+' : ''}{approvalDelta}
            </div>
          </div>
          <div className="rounded border border-gold/20 bg-black/40 p-3">
            <div className="font-mono text-[9px] text-parchment-200/40">声望变化</div>
            <div className={`font-display text-xl font-bold ${prestigeDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {prestigeDelta >= 0 ? '+' : ''}{prestigeDelta}
            </div>
          </div>
        </div>

        <div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onFinish}
            className="rounded border border-gold/50 bg-gold/20 px-8 py-2.5 font-display text-sm font-bold tracking-widest text-gold-light hover:bg-gold/30"
          >
            继 续
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
