// 新手教程：逐步引导玩家熟悉核心操作
// v0.3.0 设计理念：将原 29 个单步合并为 10 个"页"，每页包含多个相关步骤
// 玩家在一个页面内点击"下一步"切换该页内的多个 step，看完一页后"下一页"跳转
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
  /** 该步骤跳转到的游戏页面（优先于 TutorialPage.page） */
  page?: GamePage
  /** 该页面下需要高亮的元素 CSS 选择器；不填则仅高亮整个页面区域 */
  highlightSelector?: string
  /** 高亮元素的提示文字（显示在元素上方） */
  highlightLabel?: string
}

interface TutorialPage {
  /** 页图标 */
  icon: string
  /** 页标题 */
  title: string
  /** 跳转到的游戏页面（进入此页时自动导航） */
  page?: GamePage
  /** 该页包含的多个步骤 */
  steps: TutorialStep[]
}

const TUTORIAL_PAGES: TutorialPage[] = [
  {
    icon: '👋',
    title: '欢迎与目标',
    steps: [
      {
        title: '欢迎来到宰执春秋',
        content: '你将扮演一国总理，在 48 个月（4 年）的任期内管理国家、应对议会、处理外交。本教程分 10 页，每页包含 2-4 个相关步骤，带你快速熟悉核心系统。',
        action: '点击「下一步」开始引导',
      },
      {
        title: '胜负条件',
        content: '任期结束（48 月）后根据民意、声望、稳定等指标结算功过。任一指标低于 20 会触发危机；民意 < 35 触发党内逼宫链；任期中途被倒阁则提前下台。目标：活到任期结束并留下好名声。',
        action: '记住：平衡优先，切勿让任一指标跌穿红线',
      },
      {
        title: '历史曲线',
        content: '仪表盘底部有"历史曲线"折叠面板：6 项一级指标 + 3 项宏观指标的月度折线图，带趋势徽章（绿↑/红↓），让你感知"正在变好还是变坏"，而非只看瞬时值。最多保留 60 个月。',
        action: '在仪表盘底部找到"历史曲线"面板，点击"展开 ▼"',
        highlightSelector: '[data-history-charts-panel]',
        highlightLabel: '历史曲线折叠面板',
      },
    ],
  },
  {
    icon: '📊',
    title: '仪表盘与时间',
    page: 'dashboard',
    steps: [
      {
        title: '仪表盘 · 首页',
        content: '顶部显示日期与总理致辞，下方是六项国家一级指标（民意/国库/经济/稳定/外交/声望）。任一指标低于 20 都会触发危机。中间是总理办公桌与每日行动入口，下方是内阁闲聊。所有重要跳转都可以从这里出发。',
        action: '试着点击任一指标卡片，展开查看其下的二级细分指标',
        highlightSelector: '.metric-card',
        highlightLabel: '点击指标卡片展开细分',
      },
      {
        title: '节令时序 · 左下角叙事弹窗',
        content: '左下角会周期性弹出"节令时序"叙事卡——以季节、节令、天气为引子，讲述总理的内心独白或府中琐事。可"凝神片刻"（无代价）、"提笔记下"（小幅提升声望）、或"召人商议"（消耗 1 政治资本换取幕僚见解）。',
        action: '弹窗出现时点击不同选项试试',
        highlightSelector: '[data-story-beat-toast]',
        highlightLabel: '左下角节令时序弹窗（出现时高亮）',
      },
      {
        title: '时间与暂停',
        content: '顶部状态栏有时间控制（5 档速度）。按空格键随时暂停/恢复。有事件待处理、倒计时事件触发时自动暂停。建议决策时暂停，观察时加速。每月进行一次月度结算。',
        action: '现在试试按空格键暂停时间',
      },
    ],
  },
  {
    icon: '🪪',
    title: '总理档案与人物谱',
    page: 'pm_profile',
    steps: [
      {
        title: '总理档案',
        content: '右侧"总理"图标下：性格特质（健康/魅力/果断/韧性/道德）与执政资源（政治资本/党内威望/辩论技巧/风险指数）。事件会改变这些数值。政治资本是发动行动的燃料。',
        action: '记住：政治资本 < 30 时无法执行多数行动',
        highlightSelector: '.doc-card',
        highlightLabel: '性格特质与执政资源',
      },
      {
        title: '人物谱',
        content: '全部 15 位关键人物按派系分组（政界/军方/商界/工会媒体/宗教/外国政要）。每位 NPC 有性格、当前态度与互动历史。他们的态度会影响议会表决、军费谈判、商界合作等具体场景。',
        action: '切换到"人物谱"子页，点击任一 NPC 卡片查看详情',
        page: 'npcs' as GamePage,
        highlightSelector: '.doc-card',
        highlightLabel: 'NPC 卡片网格',
      },
      {
        title: 'NPC 主动 AI（v0.3 新增）',
        content: '每 60 天检查一次，符合状态的 NPC 会主动发起来电、拜访或公开声明。如国防部长在军力低下时致电要求增加军费；首富在腐败值过高时"二次登门"提议；工会主席在抗议频发时登门施压。每次主动行动 14 天内必须决策。',
        action: 'NPC 主动行动会以"事件"形式弹窗',
      },
    ],
  },
  {
    icon: '📋',
    title: '施政工具：改革·政策·法律',
    steps: [
      {
        title: '改革树',
        content: '主动改革是施政的核心。每项改革有前置改革（必须先完成）和消耗（国库+政治资本+时间）。完成后可解锁新政策分支。建议优先启动"税制优化"等基础改革。',
        action: '点击一个可启动的改革节点试试',
        page: 'initiatives' as GamePage,
        highlightSelector: '.doc-card',
        highlightLabel: '改革树节点',
      },
      {
        title: '政策树',
        content: '政策按类别（经济/社会/外交/军事/环境/政治）分组，每类同时生效一项。切换政策需付出代价。政策有前置链，必须启用过某些政策才能解锁后续。',
        action: '查看各类别下当前生效的政策',
        page: 'policies' as GamePage,
      },
      {
        title: '法律议事厅',
        content: '7 个法律组 × 3 档。立法需消耗政治资本与议会席位，占用 2–6 个月审议期。法律效果跨系统传导。与政策树的方向性、改革的项目制定位不同——法律是制度性长期安排。',
        action: '查看当前生效的法律档位',
        page: 'laws' as GamePage,
        highlightSelector: '.doc-card',
        highlightLabel: '法律组卡片',
      },
      {
        title: '议员提案（参数化法案）',
        content: '每月由各派系议员随机提出 3 条参数化提案（议题 × 强度 × 受益派系）。派系契合度加成 +20%。玩家可推动立法或搁置；推动需消耗政治资本与议会席位，审议期 1-3 个月。',
        action: '在法律页底部"议员提案"区域查看本月提案',
        page: 'laws' as GamePage,
      },
    ],
  },
  {
    icon: '🏛️',
    title: '议会与密室政治',
    page: 'parliament',
    steps: [
      {
        title: '议会（右侧栏）',
        content: '右侧"议会"图标下有议会与质询。议会页可解散议会、发起信任表决；每 60 天会自动触发议会质询，也可手动发起（冷却 30 天）。',
        action: '鼠标悬停右侧🏛️图标展开子菜单',
        highlightSelector: '[data-side-rail]',
        highlightLabel: '右侧图标栏',
      },
      {
        title: '法案表决与密室政治',
        content: '议会页可"提交法案表决"。选择法案类型后进入密室政治环节：与各党派拉票、施压、妥协，争取赞成票过半通过。通过后法案立即生效，失败扣威望。',
        action: '在议会页点击"提交法案表决"试试',
        highlightSelector: '[data-bill-voting="true"]',
        highlightLabel: '提交法案表决按钮',
      },
      {
        title: '突击新闻发布会与密室游说棋盘',
        content: '大丑闻（严重度 ≥ 60）触发新闻发布会：5 轮记者提问，每题 3 秒倒计时。另一入口：深夜官邸密室游说——5×5 棋盘走位（WASD/方向键），按 E 与相邻代表谈判（承诺/威胁/利益交换）。健康过低时步数 -2。',
        action: '触发时游戏自动暂停，专注应对',
      },
      {
        title: '议会质询卡牌系统',
        content: '议会质询触发时，底部弹出卡牌手牌栏。将卡牌拖拽至中央槽位打出。卡牌包括强硬反击、转移话题、妥协让步、归咎前任。质询成功加威望，失败扣民意。',
        action: '记住：质询触发时时间会自动暂停',
        page: 'debate' as GamePage,
      },
    ],
  },
  {
    icon: '👥',
    title: '内阁与民意',
    page: 'cabinet',
    steps: [
      {
        title: '内阁',
        content: '右侧"内阁"图标下有内阁名单与内阁聊天。部长每回合贡献指标加成（受忠诚度缩放）。每 75 天部长会主动私信，附带选项需回应。低忠诚度部长可能背叛。',
        action: '点击内阁成员查看其加成与忠诚度',
        highlightSelector: '[data-side-rail]',
        highlightLabel: '右侧内阁图标栏',
      },
      {
        title: '民意：信件与照会',
        content: '右侧"民意"图标下有三个子页面：选区信件（民众请愿）、舆论（媒体评价）、大选。每 90 天收到信件，每 120 天收到外交照会，需选择回复选项。',
        action: '如有未读信件，右侧✉️图标会显示红点',
        page: 'letters' as GamePage,
        highlightSelector: '[data-side-rail]',
        highlightLabel: '右侧民意图标栏',
      },
    ],
  },
  {
    icon: '🗺️',
    title: '国情与归因报告',
    page: 'country',
    steps: [
      {
        title: '国情总览',
        content: '国情页面展示国家档案：立国史（4 段叙事：立宪之初 → 中兴年代 → 动荡岁月 → 当代格局）+ 实时现状速写（8 维度动态文本：政局/经济/财政/民心/外交/地方/内阁/威望）。文本依据当前指标实时生成，随局势演变。',
        action: '点击"立国史/现状速写"Tab 切换',
        highlightSelector: '.doc-card',
        highlightLabel: '国家档案',
      },
      {
        title: '月度归因报告',
        content: '每月结算后可在右侧"资讯"图标的"归因"子页面查看本月归因报告：每条指标变化来自哪个决策/事件/改革/法律，让你看清"变化来源"，而非只看到数字跳动。',
        action: '每月结算后前往归因页面查看',
        page: 'monthly_report' as GamePage,
      },
    ],
  },
  {
    icon: '🤝',
    title: '外交·军事·战争指挥',
    steps: [
      {
        title: '外交',
        content: '外交页展示与多国关系（0-100）。可执行外交行动：缔结条约、贸易协定、制裁、援助、破坏关系等。关系过低可能触发入侵事件。关系会自然恶化漂移，需主动维护。',
        action: '查看与各国的当前关系',
        page: 'diplomacy' as GamePage,
      },
      {
        title: '军事国防',
        content: '三军（海陆空军力/装备/战备/士气）+ 将领任免（能力/忠诚/性格）+ 军费预算面板（占 GDP 比例，直接影响国库）。战争胜负改用真实军力计算。提高军费消耗国库，但冷落军方会触发退役将领公开信。',
        action: '查看综合军力与三军状态',
        page: 'military' as GamePage,
        highlightSelector: '.doc-card',
        highlightLabel: '军力与预算面板',
      },
      {
        title: '战争指挥面板（v0.3 新增）',
        content: '战争期间军事页显示"战争指挥面板"：每个战区显示敌我兵力对比、战况状态、当前指挥将领。可调遣将领（技能加成战力），紧急增援消耗国库与政治资本。顶部有战争疲劳度与补给线完整度两项全局指标。',
        action: '战争期间前往军事页查看战争指挥面板',
        page: 'military' as GamePage,
        highlightSelector: '[data-war-command-panel]',
        highlightLabel: '战争指挥面板（战争期间显示）',
      },
    ],
  },
  {
    icon: '📈',
    title: '经济·社会·环境',
    steps: [
      {
        title: '宏观经济',
        content: '经济页：GDP 总量/月增长率/失业率/通胀指数构成真实传导链。税率不再是孤立滑块，而是 f(GDP × 税率)。失业率上升推高抗议频率，通胀过高拖累民意。每月由 simulation.ts 自动结算。',
        action: '观察四项宏观指标的趋势',
        page: 'economy' as GamePage,
        highlightSelector: '.doc-card',
        highlightLabel: '宏观经济仪表盘',
      },
      {
        title: '社会治理',
        content: '社会页：犯罪率/抗议频率/社会团结三维度 + 人口支持度分布（城市/农村/青年）+ 社会脉搏叙事。指标间有传导——失业率上升推高抗议，抗议高触发工会主席"登门施压"。',
        action: '查看社会三维度与人口分布',
        page: 'society' as GamePage,
      },
      {
        title: '生态文明',
        content: '环境页：生态综合得分 + 空气/森林/水体/碳排放四维度 + 污染源追踪 + 季节叙事。春季推进造林有额外加成，夏季是污染高发期，冬季是清洁能源转型改革的关键期。',
        action: '查看生态得分与季节叙事',
        page: 'environment' as GamePage,
      },
    ],
  },
  {
    icon: '📝',
    title: '事件系统与完成',
    steps: [
      {
        title: '事件决策与统一收件箱',
        content: '事件自动弹窗，需在选项中抉择。五类事件（普通/信件/照会/倒计时/内阁聊天）合并为统一收件箱，按优先级分层（critical 7 天 / high 14 天 / normal 21 天 / low 42 天）。右下角🗂️图标打开收件箱。21 天未决策自动选最差选项。',
        action: '关闭弹窗 ≠ 拒绝决策，事件会保留在收件箱',
      },
      {
        title: '事件链深化（v0.3 新增）',
        content: '跨系统事件不再孤立：3 条多阶段剧情链——"边境冲突升级链"（边境摩擦 → 军事冲突 → 外交危机 → 制裁或战争）、"经济危机链"（衰退信号 → 挤兑 → 紧缩 → 复苏或崩溃）、"政治丑闻链"（流言 → 媒体调查 → 议会调查 → 辞职或挺过）。前一阶段的决策影响后续是否触发。',
        action: '注意：相关事件触发后会自动延后进入下一阶段判定',
        page: 'news' as GamePage,
      },
      {
        title: '百科全书（弹窗）',
        content: '若忘记某项指标含义或某页面玩法，随时打开百科——百科是弹窗形式，在右上角菜单中点击"百科"即可弹出，支持分类筛选与关键词搜索，每条目可一键跳转对应页面。',
        action: '记住：百科在右上角菜单里，是弹窗不是页面',
      },
      {
        title: '教程完成',
        content: '所有核心页面与 v0.3 新系统已介绍完毕。宰执春秋是一款深度策略游戏，真正的乐趣在于平衡与抉择——没有完美答案，只有取舍。祝执政顺利，总理阁下！',
        action: '点击「开始游戏」正式游玩',
      },
    ],
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
  const [pageIndex, setPageIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
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
    // 立即打开教程（重置到第一页第一步），即使之前已完成也可重看
    setPageIndex(0)
    setStepIndex(0)
    setShow(true)
  }, [tutorialOpenSignal, gamePhase])

  // 教程关闭时恢复游戏时间
  useEffect(() => {
    if (!show && savedTimeSpeedRef.current > 0) {
      setTimeSpeed(savedTimeSpeedRef.current as 1 | 2 | 3 | 4 | 5)
      savedTimeSpeedRef.current = 0
    }
  }, [show])

  // 当前步骤的目标页面：right-rail 页面（总理/议会/民意/内阁系列）通过侧面板打开
  // v0.3：pm_profile / npcs / news / monthly_report 都在右侧栏
  const SIDE_RAIL_PAGES = new Set<GamePage>([
    'pm_profile', 'npcs',
    'parliament', 'debate', 'letters', 'media', 'election', 'cabinet', 'cabinet_chat',
    'news', 'monthly_report',
  ])

  /** 跳转到指定页面（GamePage） */
  const navigateToPage = (page: GamePage) => {
    if (SIDE_RAIL_PAGES.has(page)) {
      setSidePanelPage(page)
    } else {
      setSidePanelPage(null)
      setGamePage(page)
    }
  }

  /** 高亮当前步骤指定的元素：在页面切换后短暂延迟，等待 DOM 渲染完成 */
  const updateHighlight = (selector?: string) => {
    setHighlightRect(null)
    setHighlightVisible(false)
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)

    if (!selector) return
    // 多次尝试以应对页面切换动画
    const tryFind = (attempt: number) => {
      const el = document.querySelector(selector)
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

  // 当前页与当前步骤
  const currentPage = TUTORIAL_PAGES[pageIndex]
  const currentStep = currentPage.steps[stepIndex]
  const isLastPage = pageIndex === TUTORIAL_PAGES.length - 1
  const isLastStepInPage = stepIndex === currentPage.steps.length - 1
  const isLastStep = isLastPage && isLastStepInPage

  /** 步骤/页面变化时自动跳转 + 高亮 */
  useEffect(() => {
    if (!show) return
    // 优先用步骤自己的 page（如"改革树"步骤跳到 initiatives 页），否则用当前页的 page
    const targetPage = currentStep.page ?? currentPage.page
    if (targetPage) {
      navigateToPage(targetPage)
    }
    updateHighlight(currentStep.highlightSelector)
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, stepIndex, show, currentGamePage])

  if (!show) return null

  const handleNext = () => {
    if (isLastStep) {
      // 教程结束
      setTutorialCompleted(true)
      setShow(false)
      setHighlightVisible(false)
    } else if (isLastStepInPage) {
      // 当前页结束 → 下一页第一步
      setPageIndex((p) => Math.min(p + 1, TUTORIAL_PAGES.length - 1))
      setStepIndex(0)
    } else {
      // 当前页内下一步
      setStepIndex((s) => s + 1)
    }
  }

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex((s) => s - 1)
    } else if (pageIndex > 0) {
      // 回到上一页最后一步
      const prevPage = TUTORIAL_PAGES[pageIndex - 1]
      setPageIndex((p) => Math.max(p - 1, 0))
      setStepIndex(prevPage.steps.length - 1)
    }
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
            {currentStep.highlightLabel && (
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
                  👉 {currentStep.highlightLabel}
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
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] w-[680px] max-w-[94vw]"
          >
            <div className="rounded-lg border-2 border-gold/40 bg-gradient-to-b from-ink-900 to-ink-950 shadow-2xl overflow-hidden">
              {/* 顶部进度条：按页+步综合进度 */}
              <div className="h-1 w-full bg-ink-800">
                {(() => {
                  const totalSteps = TUTORIAL_PAGES.reduce((sum, p) => sum + p.steps.length, 0)
                  const doneSteps =
                    TUTORIAL_PAGES.slice(0, pageIndex).reduce((sum, p) => sum + p.steps.length, 0) +
                    stepIndex +
                    1
                  const progress = (doneSteps / totalSteps) * 100
                  return (
                    <motion.div
                      className="h-full bg-gold"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  )
                })()}
              </div>

              {/* 标题栏：页标题 + 当前步标题 */}
              <div className="flex items-center justify-between border-b border-gold/20 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">{currentPage.icon}</span>
                  <div className="min-w-0">
                    <div className="font-display text-sm font-bold text-parchment-100 truncate">
                      {currentPage.title}
                    </div>
                    <div className="font-mono text-[9px] tracking-wider text-parchment-200/50">
                      第 {pageIndex + 1} / {TUTORIAL_PAGES.length} 页 · 步骤 {stepIndex + 1} / {currentPage.steps.length}
                      {(currentStep.page ?? currentPage.page) && (
                        <span className="ml-2 text-gold/60">
                          · 已自动跳转：{currentStep.page ?? currentPage.page}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSkip}
                  className="rounded px-2 py-1 font-mono text-[10px] text-parchment-200/60 transition-colors hover:bg-red-900/40 hover:text-red-300 shrink-0"
                >
                  跳过教程
                </button>
              </div>

              {/* 内容区：步标题 + 内容 + 行动提示 */}
              <div className="px-4 py-3">
                <div className="font-display text-[13px] font-bold text-gold/90 mb-1.5">
                  {currentStep.title}
                </div>
                <p className="font-serif text-[13px] leading-relaxed text-parchment-200/90">
                  {currentStep.content}
                </p>
                {currentStep.action && (
                  <div className="mt-2 rounded-sm border border-gold/20 bg-gold/5 px-3 py-1.5">
                    <span className="font-mono text-[10px] text-gold/80">
                      💡 {currentStep.action}
                    </span>
                  </div>
                )}
              </div>

              {/* 底部导航 */}
              <div className="flex items-center justify-between border-t border-gold/10 px-4 py-2.5">
                <button
                  onClick={handlePrev}
                  disabled={pageIndex === 0 && stepIndex === 0}
                  className={`px-3 py-1.5 font-serif text-xs rounded transition-colors ${
                    pageIndex === 0 && stepIndex === 0
                      ? 'text-parchment-200/30 cursor-not-allowed'
                      : 'text-parchment-200/70 hover:bg-ink-800'
                  }`}
                >
                  ← 上一步
                </button>

                {/* 页码圆点：每页一个圆点，当前页高亮 */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {TUTORIAL_PAGES.map((p, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${
                          i === pageIndex
                            ? 'w-4 bg-gold'
                            : i < pageIndex
                            ? 'w-1.5 bg-gold/50'
                            : 'w-1.5 bg-ink-700'
                        }`}
                        title={p.title}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[10px] text-parchment-200/40 ml-1">
                    {pageIndex + 1}/{TUTORIAL_PAGES.length}
                  </span>
                </div>

                <button
                  onClick={handleNext}
                  className="px-4 py-1.5 font-serif text-xs font-bold rounded bg-gold text-ink-900 hover:bg-gold/80 transition-colors"
                >
                  {isLastStep
                    ? '开始游戏 →'
                    : isLastStepInPage
                    ? '下一页 →'
                    : '下一步 →'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
