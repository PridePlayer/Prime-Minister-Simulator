import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { useMemo, useState, useEffect } from 'react'
import type { MetricKey } from '@/types/game'

/**
 * NPC 闲聊组件：根据当前局势让内阁成员或总统发表一两句"人情味"对白
 * - 每隔一段时间（约 45 秒）随机换人
 * - 内容依据最弱指标、内阁忠诚度、近期新闻等动态生成
 * - 点击对白可"回应"，回应会小幅影响相关数值
 */

interface ChatterLine {
  speaker: string
  role: string
  avatar: string
  /** 对白文本 */
  text: string
  /** 语气 */
  tone: 'friendly' | 'neutral' | 'concerned' | 'jesting'
  /** 可选的简短回应 */
  replies?: { label: string; effect?: Partial<Record<MetricKey, number>>; news?: string }[]
}

/** 根据 state 生成对白池 */
function buildChatterPool(state: ReturnType<typeof useGameStore.getState>): ChatterLine[] {
  const pool: ChatterLine[] = []
  const m = state.metrics

  // 找最弱指标
  const weakest = (Object.entries(m) as [MetricKey, number][]).reduce(
    (min, cur) => (cur[1] < min[1] ? cur : min),
    ['approval', 100] as [MetricKey, number],
  )
  const weakestLabel: Record<MetricKey, string> = {
    approval: '民意',
    treasury: '国库',
    economy: '经济',
    stability: '稳定',
    diplomacy: '外交',
    prestige: '声望',
  }

  // 内阁成员发言
  const cabinet = state.cabinet
  if (cabinet.length > 0) {
    // 财长谈国库
    const financeMin = cabinet.find((c) => c.role.includes('财') || c.specialty === 'treasury')
    if (financeMin && m.treasury < 35) {
      pool.push({
        speaker: financeMin.name,
        role: financeMin.role,
        avatar: '💼',
        text: `总理，国库只够撑两个月了，要不咱们先把那几项非紧急开支缓一缓？`,
        tone: 'concerned',
        replies: [
          { label: '采纳，压缩开支', effect: { treasury: 8, approval: -3 }, news: '财政部宣布压缩非紧急开支' },
          { label: '再想想办法', effect: { treasury: -2, prestige: 2 } },
        ],
      })
    } else if (financeMin) {
      pool.push({
        speaker: financeMin.name,
        role: financeMin.role,
        avatar: '💼',
        text: `这个月的财政报表我看过了，整体还算健康，您放心推进改革。`,
        tone: 'friendly',
      })
    }

    // 内政部长谈稳定
    const interiorMin = cabinet.find((c) => c.role.includes('内政') || c.specialty === 'stability')
    if (interiorMin && m.stability < 40) {
      pool.push({
        speaker: interiorMin.name,
        role: interiorMin.role,
        avatar: '🛡️',
        text: `几个城市的治安最近不太乐观，我已经安排加强巡逻，但也需要您在公开场合安抚一下民心。`,
        tone: 'concerned',
        replies: [
          { label: '我会发表讲话', effect: { stability: 4, approval: 2 } },
          { label: '你看着办', effect: { stability: -2, prestige: -1 } },
        ],
      })
    } else if (interiorMin) {
      pool.push({
        speaker: interiorMin.name,
        role: interiorMin.role,
        avatar: '🛡️',
        text: `街面上还算太平，没什么大事需要您操心。`,
        tone: 'neutral',
      })
    }

    // 外长谈外交
    const foreignMin = cabinet.find((c) => c.role.includes('外交') || c.specialty === 'diplomacy')
    if (foreignMin && m.diplomacy < 40) {
      pool.push({
        speaker: foreignMin.name,
        role: foreignMin.role,
        avatar: '🌐',
        text: `邻国最近态度有点冷淡，我建议安排一次非正式会晤，先缓和一下气氛。`,
        tone: 'concerned',
        replies: [
          { label: '安排会晤', effect: { diplomacy: 6, treasury: -2 } },
          { label: '暂不接待', effect: { diplomacy: -3, prestige: 3 } },
        ],
      })
    } else if (foreignMin) {
      pool.push({
        speaker: foreignMin.name,
        role: foreignMin.role,
        avatar: '🌐',
        text: `国际舆论对咱们还算友好，趁这机会多推进几个合作项目吧。`,
        tone: 'friendly',
      })
    }

    // 随机闲聊
    const anyMin = cabinet[Math.floor(Math.random() * Math.min(cabinet.length, 3))]
    if (anyMin) {
      pool.push({
        speaker: anyMin.name,
        role: anyMin.role,
        avatar: '☕',
        text: `总理，今天的咖啡我让秘书多加了一份糖，您辛苦了。`,
        tone: 'friendly',
      })
    }
  }

  // 总统发言
  const pres = state.president
  if (pres.relation >= 60) {
    pool.push({
      speaker: pres.name,
      role: '总统',
      avatar: '🎖️',
      text: `最近的工作做得不错，国会那边我也帮您打了几声招呼。`,
      tone: 'friendly',
    })
  } else if (pres.relation < 35) {
    pool.push({
      speaker: pres.name,
      role: '总统',
      avatar: '🎖️',
      text: `总理，最近的民意数字我得提醒您一下，再这样下去我也难以替您说话。`,
      tone: 'concerned',
      replies: [
        { label: '我会调整方向', effect: { prestige: 2, approval: 1 } },
        { label: '我有我的考虑', effect: { prestige: -2, stability: -1 } },
      ],
    })
  }

  // 最弱指标兜底提醒
  if (weakest[1] < 30 && pool.length === 0) {
    pool.push({
      speaker: '幕僚长',
      role: '总理府秘书',
      avatar: '📋',
      text: `总理，${weakestLabel[weakest[0]]}一项已跌至 ${weakest[1]}，是否需要立即召开内阁会议？`,
      tone: 'concerned',
      replies: [
        { label: '召集会议', effect: { prestige: 1 } },
      ],
    })
  }

  // 默认对白
  if (pool.length === 0) {
    pool.push({
      speaker: '幕僚长',
      role: '总理府秘书',
      avatar: '📋',
      text: `今天没什么特别紧急的事，总理可以抽空看看新闻简报。`,
      tone: 'neutral',
    })
  }

  return pool
}

/** 语气对应颜色 */
const TONE_STYLE: Record<ChatterLine['tone'], { border: string; bg: string; text: string }> = {
  friendly: { border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)', text: '#86efac' },
  neutral: { border: 'rgba(201,169,97,0.3)', bg: 'rgba(201,169,97,0.06)', text: '#e8dcc0' },
  concerned: { border: 'rgba(251,146,60,0.4)', bg: 'rgba(251,146,60,0.08)', text: '#fdba74' },
  jesting: { border: 'rgba(236,72,153,0.4)', bg: 'rgba(236,72,153,0.08)', text: '#f9a8d4' },
}

export default function NPCChatter() {
  const metrics = useGameStore((s) => s.metrics)
  const cabinet = useGameStore((s) => s.cabinet)
  const president = useGameStore((s) => s.president)
  const totalDays = useGameStore((s) => s.totalDays)
  const [currentLine, setCurrentLine] = useState<ChatterLine | null>(null)
  const [showReplies, setShowReplies] = useState(false)
  const [replied, setReplied] = useState(false)

  // 每隔约 45 秒换一条对白，或随天数变化刷新
  const pool = useMemo(
    () => buildChatterPool({ ...useGameStore.getState(), metrics, cabinet, president } as any),
    [metrics, cabinet, president, totalDays],
  )

  useEffect(() => {
    if (pool.length === 0) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setCurrentLine(pick)
    setShowReplies(false)
    setReplied(false)

    const timer = setInterval(() => {
      const next = pool[Math.floor(Math.random() * pool.length)]
      setCurrentLine(next)
      setShowReplies(false)
      setReplied(false)
    }, 45000)

    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length, totalDays > 0 && Math.floor(totalDays / 3)])

  const handleReply = (effect?: Partial<Record<MetricKey, number>>) => {
    if (effect) {
      // 直接通过 store 修改指标
      const state = useGameStore.getState()
      const newMetrics = { ...state.metrics }
      ;(Object.entries(effect) as [MetricKey, number][]).forEach(([k, v]) => {
        newMetrics[k] = Math.max(0, Math.min(100, newMetrics[k] + v))
      })
      useGameStore.setState({ metrics: newMetrics })
    }
    setReplied(true)
    setShowReplies(false)
  }

  if (!currentLine) return null

  const style = TONE_STYLE[currentLine.tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="doc-card p-3"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="font-display text-xs font-semibold tracking-[0.2em] text-gold">
          闲 聊 一 句
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
        <button
          onClick={() => useGameStore.getState().setSidePanelPage('cabinet_chat')}
          className="font-mono text-[9px] text-gold/60 hover:text-gold transition-colors shrink-0"
          title="打开内阁聊天面板，查看所有部长的私信与请示"
        >
          全部部长私信 →
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentLine.text}
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -6 }}
          transition={{ duration: 0.25 }}
          className="rounded-md p-3"
          style={{ background: style.bg, border: `1px solid ${style.border}` }}
        >
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900/60 text-lg">
              {currentLine.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-xs font-semibold text-parchment-100">
                  {currentLine.speaker}
                </span>
                <span className="font-mono text-[9px] text-parchment-200/40">
                  {currentLine.role}
                </span>
              </div>
              <p className="mt-0.5 font-serif text-[11px] leading-relaxed" style={{ color: style.text }}>
                {currentLine.text}
              </p>

              {/* 回应按钮 */}
              {currentLine.replies && !replied && (
                <div className="mt-2">
                  {!showReplies ? (
                    <button
                      onClick={() => setShowReplies(true)}
                      className="font-mono text-[10px] text-gold/70 hover:text-gold transition-colors"
                    >
                      回应 →
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {currentLine.replies.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => handleReply(r.effect)}
                          className="rounded border border-gold/20 bg-ink-900/40 px-2 py-1 font-serif text-[10px] text-parchment-200 hover:bg-ink-900/60 hover:border-gold/40 transition-colors"
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {replied && (
                <span className="mt-1 inline-block font-mono text-[9px] text-gold/50">
                  已回应
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
