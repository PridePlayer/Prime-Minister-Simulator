// 新手教程：逐步引导玩家熟悉核心操作
// 设计理念：每点"下一步"自动跳转到对应页面 + 高亮关键元素 + 教程框始终保留
// 教程框定位在屏幕底部居中，避免遮挡页面主要内容
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { GamePage } from '@/types/game'

interface TutorialStep {
  title: string
  content: string
  /** 操作指引：告诉用户该做什么 */
  action?: string
  icon: string
  /** 跳转到的游戏页面（点"下一步"会自动导航过去） */
  page?: GamePage
  /** 该页面下需要高亮的元素 CSS 选择器；不填则仅高亮整个页面区域 */
  highlightSelector?: string
  /** 高亮元素的提示文字（显示在元素上方） */
  highlightLabel?: string
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: '👋',
    title: '欢迎来到宰执春秋',
    content: '你将扮演一国总理，在 48 个月的任期内管理国家、应对议会、处理外交。本教程会带你逐步熟悉每个页面，每点"下一步"会自动跳到对应页面并高亮关键区域。',
    action: '点击「下一步」开始引导',
  },
  {
    icon: '📊',
    title: '仪表盘 · 首页',
    content: '进入游戏后首先看到的就是仪表盘（而非百科全书）。顶部显示日期与总理致辞，下方是六项国家一级指标（民意/国库/经济/稳定/外交/声望）。任一指标低于 20 都会触发危机。中间是总理办公桌与每日行动入口，下方是内阁闲聊。所有重要跳转都可以从这里出发。',
    action: '试着点击任一指标卡片，展开查看其下的二级细分指标',
    page: 'dashboard',
    highlightSelector: '.metric-card',
    highlightLabel: '点击指标卡片展开细分',
  },
  {
    icon: '🍂',
    title: '节令时序 · 左下角叙事弹窗',
    content: '左下角会周期性弹出"节令时序"叙事卡——以季节、节令、天气为引子，讲述一段总理的内心独白或府中琐事。这不是普通提示，而是可互动的叙事：你可以"凝神片刻"（无代价）、"提笔记下"（小幅提升声望）、或"召人商议"（消耗 1 政治资本换取幕僚见解）。每个选项都会微调相关数值或触发后续剧情。',
    action: '弹窗出现时点击不同选项试试，会带来不同的小幅影响',
    page: 'dashboard',
    highlightSelector: '[data-story-beat-toast]',
    highlightLabel: '左下角节令时序弹窗（出现时高亮）',
  },
  {
    icon: '🪪',
    title: '总理档案',
    content: '这里展示总理的性格特质（健康/魅力/果断/韧性/道德）与执政资源（政治资本/党内威望/辩论技巧/风险指数）。事件会改变这些数值。政治资本是发动行动的燃料。',
    action: '记住：政治资本 < 30 时无法执行多数行动',
    page: 'pm_profile',
    highlightSelector: '.doc-card',
    highlightLabel: '性格特质与执政资源',
  },
  {
    icon: '📋',
    title: '改革树',
    content: '主动改革是你施政的核心。每项改革有前置改革（必须先完成）和消耗（国库+政治资本+时间）。完成后可解锁新政策分支。建议优先启动"税制优化"等基础改革。',
    action: '点击一个可启动的改革节点试试',
    page: 'initiatives',
    highlightSelector: '.doc-card',
    highlightLabel: '改革树节点',
  },
  {
    icon: '🌐',
    title: '政策树',
    content: '政策按类别（经济/社会/外交/军事/环境/政治）分组，每类同时生效一项。切换政策需付出代价。政策有前置链，必须启用过某些政策才能解锁后续。',
    action: '查看各类别下当前生效的政策',
    page: 'policies',
  },
  {
    icon: '🎯',
    title: '任务树',
    content: '任务按类别（经济/社会/外交/军事/政治/终极）组织，完成条件多为指标阈值。达成后奖励成就与效果。任务有前置链，可作为长期执政目标参考。',
    action: '查看一个待完成任务的达成条件',
    page: 'tasks',
  },
  {
    icon: '🏛️',
    title: '议会（右侧栏）',
    content: '右侧图标栏的"议会"包含议会与质询两个子页面。议会页可解散议会、发起信任表决；每 60 天会自动触发议会质询，也可手动发起（冷却 30 天）。',
    action: '鼠标悬停右侧🏛️图标展开子菜单',
    page: 'parliament',
    highlightSelector: '[data-side-rail]',
    highlightLabel: '右侧图标栏',
  },
  {
    icon: '📜',
    title: '法案表决（密室政治）',
    content: '议会页可"提交法案表决"。选择法案类型后进入密室政治环节：与各党派拉票、施压、妥协，争取赞成票过半通过。通过后法案立即生效（影响指标），失败扣威望。每届议会可多次提请。',
    action: '在议会页点击"提交法案表决"试试',
    page: 'parliament',
    highlightSelector: '[data-bill-voting="true"]',
    highlightLabel: '提交法案表决按钮',
  },
  {
    icon: '🎙️',
    title: '突击新闻发布会（丑闻响应）',
    content: '当你陷入大丑闻（严重度 ≥ 60）时，不再走普通公关卡——而是直接切入新闻发布会现场！记者连续抛出 5 轮犀利提问，每题 3 秒倒计时，可选"避重就轻"、"眼神锁定友好记者"、"怒斥记者"或"离席摔门而去"。每个反应都被镜头捕捉，产生不同的舆论与民调波动。魅力高则友好记者更易配合，果断高则怒斥更具威慑力，但道德过低时记者更咄咄逼人。',
    action: '触发时游戏自动暂停，专注应对 5 轮提问',
    page: 'parliament',
  },
  {
    icon: '♟️',
    title: '深夜官邸密室游说棋盘',
    content: '另一条专用入口：在官邸深夜召集利益集团代表（军火商、工会领袖、媒体大鳄等），在一个 5×5 棋盘上用有限步数（默认 8 步）走位接近代表并谈判。每靠近一位代表可发起一次游说（承诺/威胁/利益交换），成功率受魅力与辩论技巧影响。达成足够影响力可大幅推进议程，但威胁失败会引爆丑闻，承诺过多则消耗国库与政治资本。健康过低时本月步数 -2。',
    action: '用 WASD/方向键走位，按 E 与相邻代表谈判',
    page: 'parliament',
  },
  {
    icon: '🎤',
    title: '议会质询卡牌系统',
    content: '议会质询触发时，底部弹出卡牌手牌栏。将卡牌拖拽至中央槽位打出。卡牌包括强硬反击、转移话题、妥协让步、归咎前任。质询成功加威望，失败扣民意。',
    action: '记住：质询触发时时间会自动暂停',
    page: 'debate',
  },
  {
    icon: '✉️',
    title: '民意：信件与照会',
    content: '右侧"民意"图标下有三个子页面：选区信件（民众请愿）、舆论（媒体评价）、大选。每 90 天收到信件，每 120 天收到外交照会，需选择回复选项。',
    action: '如有未读信件，右侧✉️图标会显示红点',
    page: 'letters',
    highlightSelector: '[data-side-rail]',
    highlightLabel: '右侧民意图标栏',
  },
  {
    icon: '👥',
    title: '内阁',
    content: '右侧"内阁"图标下有内阁名单与内阁聊天。部长每回合贡献指标加成（受忠诚度缩放）。每 75 天部长会主动私信，附带选项需回应。低忠诚度部长可能背叛。',
    action: '点击内阁成员查看其加成与忠诚度',
    page: 'cabinet',
    highlightSelector: '[data-side-rail]',
    highlightLabel: '右侧内阁图标栏',
  },
  {
    icon: '🤝',
    title: '外交',
    content: '外交页展示与多国关系（0-100）。可执行外交行动：缔结条约、贸易协定、制裁、援助等。关系过低可能触发入侵事件。每项行动有冷却。',
    action: '查看与各国的当前关系',
    page: 'diplomacy',
  },
  {
    icon: '⏱️',
    title: '时间与暂停',
    content: '顶部状态栏有时间控制。按空格键随时暂停/恢复。有事件待处理、倒计时事件触发时自动暂停。建议决策时暂停，观察时加速。每月进行一次月度结算。',
    action: '现在试试按空格键暂停时间',
  },
  {
    icon: '📝',
    title: '事件决策',
    content: '事件自动弹窗，需在选项中抉择。可暂时关闭稍后从"事件收纳篮"处理（7 天内必须决策）。倒计时事件必须当场决断。紧急事件在指标跌破阈值时触发。',
    action: '关闭弹窗 ≠ 拒绝决策，事件会保留在收纳篮',
  },
  {
    icon: '📚',
    title: '百科全书（弹窗）',
    content: '若忘记某项指标含义或某页面玩法，随时打开百科——注意：百科不再是一个独立页面，而是弹窗形式。在右上角菜单中点击"百科"即可弹出，覆盖在当前页面之上，关闭后回到原页面。支持分类筛选与关键词搜索，每条目可一键跳转对应页面。',
    action: '记住：百科在右上角菜单里，是弹窗不是页面',
  },
  {
    icon: '🎓',
    title: '教程完成',
    content: '所有核心页面已介绍完毕。宰执春秋是一款深度策略游戏，真正的乐趣在于平衡与抉择——没有完美答案，只有取舍。祝执政顺利，总理阁下！',
    action: '点击「开始游戏」正式游玩',
  },
]

export default function Tutorial() {
  const gamePhase = useGameStore((s) => s.gamePhase)
  const tutorialCompleted = useSettingsStore((s) => s.tutorialCompleted)
  const setTutorialCompleted = useSettingsStore((s) => s.setTutorialCompleted)
  /** 手动触发信号：每次 triggerTutorial() 自增都会让本 effect 重新执行并打开教程 */
  const tutorialOpenSignal = useSettingsStore((s) => s.tutorialOpenSignal)
  const setGamePage = useGameStore((s) => s.setGamePage)
  const setSidePanelPage = useGameStore((s) => s.setSidePanelPage)
  const currentGamePage = useGameStore((s) => s.gamePage)
  const timeSpeed = useGameStore((s) => s.timeSpeed)
  const setTimeSpeed = useGameStore((s) => s.setTimeSpeed)
  const previousTimeSpeed = useGameStore((s) => s.previousTimeSpeed)
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const [highlightRect, setHighlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [highlightVisible, setHighlightVisible] = useState(false)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 记录上次处理过的信号值，避免重复触发
  const lastHandledSignalRef = useRef<number>(0)
  // 记录教程开始前的时间速度，用于教程结束后恢复
  const savedTimeSpeedRef = useRef<number>(0)

  // 触发条件 1：进入 playing 阶段且未完成教程时自动弹出（首次进入游戏）
  useEffect(() => {
    if (gamePhase === 'playing' && !tutorialCompleted) {
      const timer = setTimeout(() => {
        // 保存当前时间速度并暂停游戏
        savedTimeSpeedRef.current = timeSpeed > 0 ? timeSpeed : previousTimeSpeed
        setTimeSpeed(0)
        setShow(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [gamePhase, tutorialCompleted])

  // 触发条件 2：监听手动触发信号（来自开发者选项 / 设置面板的"立即重看新手教程"按钮）
  useEffect(() => {
    if (tutorialOpenSignal === 0) return
    if (tutorialOpenSignal === lastHandledSignalRef.current) return
    lastHandledSignalRef.current = tutorialOpenSignal
    if (gamePhase !== 'playing') return
    // 保存当前时间速度并暂停游戏
    savedTimeSpeedRef.current = timeSpeed > 0 ? timeSpeed : previousTimeSpeed
    setTimeSpeed(0)
    // 立即打开教程（重置到第一步），即使之前已完成也可重看
    setStep(0)
    setShow(true)
  }, [tutorialOpenSignal, gamePhase])

  // 教程关闭时恢复游戏时间
  useEffect(() => {
    if (!show && savedTimeSpeedRef.current > 0) {
      setTimeSpeed(savedTimeSpeedRef.current as 1 | 2 | 3 | 4 | 5)
      savedTimeSpeedRef.current = 0
    }
  }, [show])

  // 当前步骤的目标页面：right-rail 页面（议会/民意/内阁系列）通过侧面板打开
  const SIDE_RAIL_PAGES = new Set<GamePage>([
    'parliament', 'debate', 'letters', 'media', 'election', 'cabinet', 'cabinet_chat',
  ])

  /** 跳转到当前步骤对应的页面 */
  const navigateToStepPage = (s: TutorialStep) => {
    if (!s.page) return
    if (SIDE_RAIL_PAGES.has(s.page)) {
      setSidePanelPage(s.page)
    } else {
      setSidePanelPage(null)
      setGamePage(s.page)
    }
  }

  /** 高亮当前步骤指定的元素：在页面切换后短暂延迟，等待 DOM 渲染完成 */
  const updateHighlight = (s: TutorialStep) => {
    setHighlightRect(null)
    setHighlightVisible(false)
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)

    if (!s.highlightSelector) return
    // 多次尝试以应对页面切换动画
    const tryFind = (attempt: number) => {
      const el = document.querySelector(s.highlightSelector!)
      if (el) {
        const rect = el.getBoundingClientRect()
        setHighlightRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
        setHighlightVisible(true)
        return
      }
      if (attempt < 10) {
        highlightTimerRef.current = setTimeout(() => tryFind(attempt + 1), 100)
      }
    }
    highlightTimerRef.current = setTimeout(() => tryFind(0), 250)
  }

  /** 步骤变化时自动跳转 + 高亮 */
  useEffect(() => {
    if (!show) return
    const current = TUTORIAL_STEPS[step]
    if (current.page) {
      navigateToStepPage(current)
    }
    updateHighlight(current)
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, show, currentGamePage])

  if (!show) return null

  const current = TUTORIAL_STEPS[step]
  const isLast = step === TUTORIAL_STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      setTutorialCompleted(true)
      setShow(false)
      setHighlightVisible(false)
    } else {
      setStep((s) => s + 1)
    }
  }

  const handlePrev = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  const handleSkip = () => {
    setTutorialCompleted(true)
    setShow(false)
    setHighlightVisible(false)
  }

  // 遮罩方案：用 4 块独立的模糊遮罩围绕高亮区域，高亮区域本身完全不覆盖任何元素
  // 这样高亮区域既不被模糊，也不被遮挡，可以正常点击
  const maskStyle: React.CSSProperties = {
    position: 'fixed',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 70,
    pointerEvents: 'auto',
  }

  const hasRect = highlightVisible && highlightRect
  // 高亮区域的边界
  const r = highlightRect
  const rTop = r?.top ?? 0
  const rLeft = r?.left ?? 0
  const rRight = r ? r.left + r.width : 0
  const rBottom = r ? r.top + r.height : 0
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080

  return (
    <>
      {/* 4 块独立模糊遮罩：围绕高亮区域，高亮区域本身无遮罩 */}
      {/* 上方遮罩 */}
      {hasRect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ ...maskStyle, top: 0, left: 0, width: '100%', height: rTop }}
        />
      )}
      {/* 左侧遮罩 */}
      {hasRect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ ...maskStyle, top: rTop, left: 0, width: rLeft, height: r?.height ?? 0 }}
        />
      )}
      {/* 右侧遮罩 */}
      {hasRect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ ...maskStyle, top: rTop, left: rRight, width: Math.max(0, vw - rRight), height: r?.height ?? 0 }}
        />
      )}
      {/* 下方遮罩 */}
      {hasRect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ ...maskStyle, top: rBottom, left: 0, width: '100%', height: Math.max(0, vh - rBottom) }}
        />
      )}
      {/* 无高亮时：整屏模糊遮罩 */}
      {!hasRect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ ...maskStyle, top: 0, left: 0, width: '100%', height: '100%' }}
        />
      )}

      {/* 高亮呼吸边框与提示标签（pointer-events: none，不拦截点击） */}
      <AnimatePresence>
        {highlightVisible && highlightRect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[75] pointer-events-none"
          >
            {/* 高亮元素的呼吸边框 */}
            <motion.div
              className="absolute rounded-md border-2 border-gold pointer-events-none"
              style={{
                top: highlightRect.top - 2,
                left: highlightRect.left - 2,
                width: highlightRect.width + 4,
                height: highlightRect.height + 4,
                boxShadow: '0 0 16px rgba(251,191,36,0.6)',
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            {/* 高亮提示标签 */}
            {current.highlightLabel && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute rounded-md border border-gold/60 bg-ink-950/95 px-2 py-1 shadow-lg pointer-events-none"
                style={{
                  top: Math.max(8, highlightRect.top - 28),
                  left: highlightRect.left,
                }}
              >
                <span className="font-serif text-[10px] font-bold text-gold">
                  👉 {current.highlightLabel}
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 教程框：屏幕底部居中，不遮挡页面主内容 */}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 240 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] w-[640px] max-w-[94vw]"
          >
            <div className="rounded-lg border-2 border-gold/40 bg-gradient-to-b from-ink-900 to-ink-950 shadow-2xl overflow-hidden">
              {/* 顶部进度条 */}
              <div className="h-1 w-full bg-ink-800">
                <motion.div
                  className="h-full bg-gold"
                  animate={{ width: `${((step + 1) / TUTORIAL_STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* 标题栏 */}
              <div className="flex items-center justify-between border-b border-gold/20 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{current.icon}</span>
                  <div>
                    <div className="font-display text-sm font-bold text-parchment-100">
                      {current.title}
                    </div>
                    <div className="font-mono text-[9px] tracking-wider text-parchment-200/50">
                      步骤 {step + 1} / {TUTORIAL_STEPS.length}
                      {current.page && (
                        <span className="ml-2 text-gold/60">
                          · 已自动跳转：{current.page}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSkip}
                  className="rounded px-2 py-1 font-mono text-[10px] text-parchment-200/60 transition-colors hover:bg-red-900/40 hover:text-red-300"
                >
                  跳过教程
                </button>
              </div>

              {/* 内容区 */}
              <div className="px-4 py-3">
                <p className="font-serif text-[13px] leading-relaxed text-parchment-200/90">
                  {current.content}
                </p>
                {current.action && (
                  <div className="mt-2 rounded-sm border border-gold/20 bg-gold/5 px-3 py-1.5">
                    <span className="font-mono text-[10px] text-gold/80">
                      💡 {current.action}
                    </span>
                  </div>
                )}
              </div>

              {/* 底部导航 */}
              <div className="flex items-center justify-between border-t border-gold/10 px-4 py-2.5">
                <button
                  onClick={handlePrev}
                  disabled={step === 0}
                  className={`px-3 py-1.5 font-serif text-xs rounded transition-colors ${
                    step === 0
                      ? 'text-parchment-200/30 cursor-not-allowed'
                      : 'text-parchment-200/70 hover:bg-ink-800'
                  }`}
                >
                  ← 上一步
                </button>

                <div className="flex items-center gap-1">
                  <span className="font-mono text-[10px] text-parchment-200/40">
                    {step + 1} / {TUTORIAL_STEPS.length}
                  </span>
                  <div className="flex gap-0.5 ml-2">
                    {TUTORIAL_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-all ${
                          i === step
                            ? 'w-3 bg-gold'
                            : i < step
                            ? 'w-1 bg-gold/50'
                            : 'w-1 bg-ink-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className="px-4 py-1.5 font-serif text-xs font-bold rounded bg-gold text-ink-900 hover:bg-gold/80 transition-colors"
                >
                  {isLast ? '开始游戏 →' : '下一步 →'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
