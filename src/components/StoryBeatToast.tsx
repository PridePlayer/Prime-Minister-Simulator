import { motion, AnimatePresence, type Variants } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import type { StoryBeat } from '@/types/game'

/**
 * 节令时序叙事卡片：屏幕左下角浮现的羊皮纸金边氛围卡
 *  - 当 store.currentStoryBeat 被设置时滑入浮现
 *  - 卡片自带呼吸动画（scale 1.0 ↔ 1.01）
 *  - 20 秒未操作自动消失；最后 3 秒轻微闪烁提示
 *  - 三个交互按钮：
 *      · 凝神片刻：默读后关闭，无效果
 *      · 提笔记下：韧性 +2，推送"总理在日记中写下今日见闻"
 *      · 召人商议：消耗 1 政治资本，全员忠诚 +1，推送"总理召见大臣商议国事"
 *        （政治资本不足时禁用）
 *  - 不同按钮触发不同的卡片消失动画
 *  - 沿用 store 读取节拍的现有模式（由外部组件控制显示）
 */

/** 卡片消失动画类型：对应不同按钮的反馈 */
type ExitVariant = 'silent' | 'note' | 'consult' | 'timeout'

/** 自动消失总时长（毫秒） */
const AUTO_DISMISS_MS = 20000
/** 自动消失前的闪烁提示时长（毫秒） */
const WARN_BEFORE_MS = 3000

/**
 * 节拍分类 → 左上角 emoji 图标映射
 *  - 节令时序：按标题关键字匹配春🌱/夏☀/秋🍂/冬❄
 *  - 朝堂风云：📜  国际视角：📱  民间百态：🏮
 */
function categoryEmoji(beat: StoryBeat): string {
  if (beat.category === '节令时序') {
    const t = beat.title || ''
    if (t.includes('春')) return '🌱'
    if (t.includes('夏')) return '☀'
    if (t.includes('秋')) return '🍂'
    if (t.includes('冬')) return '❄'
    return '🌙'
  }
  if (beat.category === '朝堂风云') return '📜'
  if (beat.category === '国际视角') return '📱'
  if (beat.category === '民间百态') return '🏮'
  return '📖'
}

/**
 * 卡片动画变体
 *  - 进入：从左侧滑入并淡入（弹簧曲线）
 *  - 退出：根据触发按钮不同，呈现差异化的小动画反馈
 *      · silent / timeout：向左滑出并淡出
 *      · note：向上飘起并轻微放大后淡出
 *      · consult：向下沉并轻微缩小后淡出
 */
const cardVariants: Variants = {
  initial: { opacity: 0, x: -52, scale: 0.94 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 26 },
  },
  exit: (variant: ExitVariant) => {
    switch (variant) {
      case 'note':
        return {
          opacity: 0,
          y: -32,
          scale: 1.05,
          transition: { duration: 0.35, ease: 'easeOut' },
        }
      case 'consult':
        return {
          opacity: 0,
          scale: 0.9,
          y: 14,
          transition: { duration: 0.3, ease: 'easeIn' },
        }
      case 'timeout':
        return {
          opacity: 0,
          x: -52,
          scale: 0.96,
          transition: { duration: 0.4, ease: 'easeIn' },
        }
      default:
        return {
          opacity: 0,
          x: -36,
          scale: 0.96,
          transition: { duration: 0.3, ease: 'easeIn' },
        }
    }
  },
}

export default function StoryBeatToast() {
  const currentStoryBeat = useGameStore((s) => s.currentStoryBeat)
  const dismissStoryBeat = useGameStore((s) => s.dismissStoryBeat)
  const politicalCapital = useGameStore((s) => s.pmStats.politicalCapital)

  /** 当前退出动画类型；与 dismissStoryBeat 同批提交，确保 AnimatePresence 读取到最新值 */
  const [exitVariant, setExitVariant] = useState<ExitVariant>('silent')
  /** 临近自动消失时为 true，触发卡片闪烁提示 */
  const [warning, setWarning] = useState(false)
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 节拍出现/切换时重置状态并启动自动消失计时
  useEffect(() => {
    if (!currentStoryBeat) return
    setExitVariant('silent')
    setWarning(false)
    warnTimer.current = setTimeout(
      () => setWarning(true),
      AUTO_DISMISS_MS - WARN_BEFORE_MS,
    )
    autoTimer.current = setTimeout(() => {
      // 超时自动消失：无效果，仅记录退出变体后关闭
      setExitVariant('timeout')
      dismissStoryBeat()
    }, AUTO_DISMISS_MS)
    return () => {
      if (warnTimer.current) clearTimeout(warnTimer.current)
      if (autoTimer.current) clearTimeout(autoTimer.current)
    }
  }, [currentStoryBeat, dismissStoryBeat])

  /**
   * 统一关闭流程：执行业务效果 → 设置退出变体 → 关闭
   * 三者在同一事件回调中执行，React 18 会批处理为一次提交，
   * 使 AnimatePresence 在移除子节点时读取到最新的 exitVariant。
   */
  const closeWith = (variant: ExitVariant, effect?: () => void) => {
    effect?.()
    setExitVariant(variant)
    dismissStoryBeat()
  }

  /** 凝神片刻：默读关闭，无效果 */
  const handleSilent = () => closeWith('silent')

  /** 提笔记下：韧性 +2，推送日记新闻 */
  const handleNote = () => {
    closeWith('note', () => {
      const s = useGameStore.getState()
      useGameStore.setState({
        pmTraitsNumeric: {
          ...s.pmTraitsNumeric,
          resilience: Math.min(100, s.pmTraitsNumeric.resilience + 2),
        },
        news: [
          {
            id: `news_story_note_${Date.now()}`,
            timestamp: `${s.year}年${s.month}月`,
            title: '总理在日记中写下今日见闻',
            summary: '夜深人静，总理于案前提笔，将今日所见所感落于日记之中。',
            category: '决策',
            tone: 'neutral',
          },
          ...s.news,
        ],
      })
    })
  }

  /** 召人商议：消耗 1 政治资本，全员忠诚 +1，推送商议新闻 */
  const handleConsult = () => {
    const s = useGameStore.getState()
    if (s.pmStats.politicalCapital < 1) return
    closeWith('consult', () => {
      const cur = useGameStore.getState()
      useGameStore.setState({
        pmStats: {
          ...cur.pmStats,
          politicalCapital: Math.max(0, cur.pmStats.politicalCapital - 1),
        },
        cabinet: cur.cabinet.map((c) => ({
          ...c,
          loyalty: Math.min(100, c.loyalty + 1),
        })),
        news: [
          {
            id: `news_story_consult_${Date.now()}`,
            timestamp: `${cur.year}年${cur.month}月`,
            title: '总理召见大臣商议国事',
            summary: '总理召集相关部长入府议事，阁员感念被重视，忠心略增。',
            category: '内阁',
            tone: 'neutral',
          },
          ...cur.news,
        ],
      })
    })
  }

  const consultDisabled = politicalCapital < 1

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-40" data-story-beat-toast>
      <AnimatePresence>
        {currentStoryBeat && (
          <motion.div
            key={currentStoryBeat.id}
            custom={exitVariant}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="pointer-events-auto relative"
            style={{ width: 380 }}
          >
            {/* 呼吸缩放 + 临近超时的闪烁提示（与外层进入/退出动画解耦，互不冲突） */}
            <motion.div
              animate={{
                scale: [1, 1.01, 1],
                opacity: warning ? [1, 0.55, 1] : 1,
              }}
              transition={{
                scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.85, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="relative"
            >
              <div
                className="relative overflow-hidden rounded-lg"
                style={{
                  minHeight: 200,
                  border: '1px solid rgba(245,158,11,0.55)',
                  boxShadow:
                    '0 12px 36px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,158,11,0.12), inset 0 1px 0 rgba(245,158,11,0.12)',
                  // 深色木纹质感 + 微弱纸纹纹理（CSS gradient 模拟）
                  background:
                    'linear-gradient(135deg, rgba(58,36,24,0.97) 0%, rgba(42,24,16,0.99) 100%),' +
                    'repeating-linear-gradient(90deg, rgba(120,80,40,0.05) 0px, rgba(120,80,40,0.05) 1px, transparent 1px, transparent 5px),' +
                    'repeating-linear-gradient(0deg, rgba(245,158,11,0.025) 0px, rgba(245,158,11,0.025) 1px, transparent 1px, transparent 7px)',
                }}
              >
                {/* 顶部金色光带 */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent" />

                {/* 左上角装饰性书签角（折叠缎带） */}
                <div
                  className="pointer-events-none absolute left-0 top-0"
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: '22px solid rgba(245,158,11,0.7)',
                    borderRight: '22px solid transparent',
                  }}
                />

                {/* 右上角关闭按钮 */}
                <button
                  onClick={handleSilent}
                  className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-parchment-200/60 transition-colors hover:bg-gold/20 hover:text-gold"
                  aria-label="关闭"
                >
                  <span className="text-xs leading-none">✕</span>
                </button>

                <div className="px-5 pb-4 pt-5">
                  {/* 顶部：节拍类型 emoji + 分类标签 */}
                  <div className="mb-2 flex items-center gap-2 pr-6">
                    <span className="text-lg leading-none" aria-hidden>
                      {categoryEmoji(currentStoryBeat)}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold/70">
                      · {currentStoryBeat.category} ·
                    </span>
                  </div>

                  {/* 标题（display 字体） */}
                  {currentStoryBeat.title && (
                    <div className="mb-2 font-display text-lg font-bold leading-tight text-gold">
                      {currentStoryBeat.title}
                    </div>
                  )}

                  {/* 中部：叙事正文（font-serif，14px，行高 1.8，最多 5 行） */}
                  <p className="mb-4 line-clamp-5 font-serif text-[14px] leading-[1.8] text-parchment-200/85">
                    {currentStoryBeat.text}
                  </p>

                  {/* 底部：3 个交互按钮 */}
                  <div className="flex items-stretch gap-2">
                    <button
                      onClick={handleSilent}
                      className="flex-1 rounded border border-parchment-200/15 bg-ink-700/40 px-2 py-2 font-serif text-[12px] text-parchment-200/75 transition-all hover:border-parchment-200/30 hover:bg-ink-700/60 hover:text-parchment-100"
                    >
                      凝神片刻
                    </button>
                    <button
                      onClick={handleNote}
                      className="flex-1 rounded border border-gold/35 bg-gold/10 px-2 py-2 font-serif text-[12px] text-gold/90 transition-all hover:border-gold/60 hover:bg-gold/20 hover:text-gold"
                    >
                      提笔记下
                    </button>
                    <button
                      onClick={handleConsult}
                      disabled={consultDisabled}
                      title={consultDisabled ? '政治资本不足，无法召人商议' : '消耗 1 政治资本，提升内阁忠诚'}
                      className="flex-1 rounded border border-crimson/35 bg-crimson/10 px-2 py-2 font-serif text-[12px] text-crimson/90 transition-all hover:border-crimson/60 hover:bg-crimson/20 hover:text-crimson disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-crimson/35 disabled:hover:bg-crimson/10"
                    >
                      召人商议
                    </button>
                  </div>
                </div>

                {/* 底部渐变金色装饰线 */}
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent opacity-80" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
