import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import StatusBar from '@/components/StatusBar'
import GameNav, { NAV_HOTKEYS, SIDE_RAIL_PAGES } from '@/components/GameNav'
import SideRail from '@/components/SideRail'
import SidePanel from '@/components/SidePanel'
import PendingTodos from '@/components/PendingTodos'
import ActionDialog from '@/components/ActionDialog'
import BreakingNews from '@/components/BreakingNews'
import NotificationAlerts from '@/components/NotificationAlerts'
import CountdownTimer from '@/components/CountdownTimer'
import EventBasket from '@/components/EventBasket'
import EventPopup from '@/components/EventPopup'
import WarEventDialog from '@/components/WarEventDialog'
import AchievementToast from '@/components/AchievementToast'
import StoryBeatToast from '@/components/StoryBeatToast'
import HandBar from '@/components/HandBar'
import CardEventDialog from '@/components/CardEventDialog'
import PressConferenceMinigame from '@/components/PressConferenceMinigame'
import Tutorial from '@/components/Tutorial'
import DeveloperConsole from '@/components/DeveloperConsole'
import BackroomLobbyMinigame from '@/components/BackroomLobbyMinigame'
import DashboardPage from '@/pages/DashboardPage'
import PMProfilePage from '@/pages/PMProfilePage'
import InitiativesPage from '@/pages/InitiativesPage'
import TaskTreePage from '@/pages/TaskTreePage'
import PoliciesPage from '@/pages/PoliciesPage'
import NewsPage from '@/pages/NewsPage'
import DiplomacyPage from '@/pages/DiplomacyPage'
import MilitaryPage from '@/pages/MilitaryPage'
import SocietyPage from '@/pages/SocietyPage'
import EconomyPage from '@/pages/EconomyPage'
import EnvironmentPage from '@/pages/EnvironmentPage'
import EncyclopediaModal from '@/components/EncyclopediaModal'
import CoalitionNegotiation from '@/pages/CoalitionNegotiation'
import InitialCabinetSetup from '@/pages/InitialCabinetSetup'
import GeneralElectionPage from '@/pages/GeneralElectionPage'
import { shouldTriggerPmqs } from '@/engine/cardEngine'

/** 游戏主界面（页面路由容器） */
export default function Game() {
  const gamePage = useGameStore((s) => s.gamePage)
  const setGamePage = useGameStore((s) => s.setGamePage)
  const setSidePanelPage = useGameStore((s) => s.setSidePanelPage)
  const currentCountdown = useGameStore((s) => s.currentCountdown)
  const gamePhase = useGameStore((s) => s.gamePhase)
  const totalDays = useGameStore((s) => s.totalDays)
  const activeCardEvent = useGameStore((s) => s.activeCardEvent)
  const triggerPmqsEvent = useGameStore((s) => s.triggerPmqsEvent)
  const checkCardEventTimeout = useGameStore((s) => s.checkCardEventTimeout)
  const togglePause = useGameStore((s) => s.togglePause)
  const timeSpeed = useGameStore((s) => s.timeSpeed)
  /** 开发者控制台开关：由右上角菜单"开发者选项"二次确认后置位 */
  const devConsoleOpen = useGameStore((s) => s.devConsoleOpen)
  const setDevConsoleOpen = useGameStore((s) => s.setDevConsoleOpen)

  const renderPage = () => {
    switch (gamePage) {
      case 'dashboard': return <DashboardPage />
      case 'pm_profile': return <PMProfilePage />
      case 'tasks': return <TaskTreePage />
      case 'policies': return <PoliciesPage />
      case 'initiatives': return <InitiativesPage />
      case 'news': return <NewsPage />
      case 'diplomacy': return <DiplomacyPage />
      case 'military': return <MilitaryPage />
      case 'society': return <SocietyPage />
      case 'economy': return <EconomyPage />
      case 'environment': return <EnvironmentPage />
      default: return <DashboardPage />
    }
  }

  // 全局快捷键：每个页面都有对应字母键跳转（见 NAV_HOTKEYS）
  useEffect(() => {
    if (gamePhase !== 'playing') return
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }
      // Ctrl/Meta/Alt 组合键不拦截，留给浏览器/系统
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key.toLowerCase()

      // 空格键：暂停/恢复时间
      if (e.key === ' ') {
        e.preventDefault()
        // 若有激活卡牌事件，已自动暂停，空格不切换
        if (!useGameStore.getState().activeCardEvent) {
          togglePause()
        }
        return
      }

      const page = NAV_HOTKEYS[key]
      if (page) {
        e.preventDefault()
        // 右侧栏页面（议会/民意/内阁）以侧面板形式打开
        if (SIDE_RAIL_PAGES.has(page)) {
          const current = useGameStore.getState().sidePanelPage
          setSidePanelPage(current === page ? null : page)
        } else {
          setGamePage(page)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [gamePhase, setGamePage, setSidePanelPage, togglePause])

  // 卡牌事件触发：每 21 天检查 PMQs
  useEffect(() => {
    if (gamePhase !== 'playing') return
    if (activeCardEvent) return // 已有卡牌事件，不重复触发
    const state = useGameStore.getState()
    if (shouldTriggerPmqs(state)) {
      triggerPmqsEvent()
    }
  }, [totalDays, gamePhase, activeCardEvent, triggerPmqsEvent])

  // 卡牌事件超时检查
  useEffect(() => {
    if (!activeCardEvent) return
    if (totalDays > activeCardEvent.deadlineDay) {
      checkCardEventTimeout()
    }
  }, [totalDays, activeCardEvent, checkCardEventTimeout])

  return (
    <div className="bg-ink-grid flex h-full w-full flex-col">
      <StatusBar />

      {gamePhase === 'coalition' ? (
        // 组阁谈判阶段：全屏显示，隐藏导航与底部时间控制
        <div className="flex-1 min-h-0 overflow-y-auto">
          <CoalitionNegotiation />
        </div>
      ) : gamePhase === 'cabinet_setup' ? (
        // 内阁组建阶段：全屏显示，隐藏导航与底部时间控制
        <div className="flex-1 min-h-0 overflow-y-auto">
          <InitialCabinetSetup />
        </div>
      ) : gamePhase === 'election' ? (
        // 任期届满大选阶段：全屏显示，隐藏导航与底部时间控制
        // top-11 让出 TitleBar 高度（h-11=44px），避免 topbar 遮挡内容
        <div className="fixed top-11 inset-x-0 bottom-0 z-40">
          <GeneralElectionPage />
        </div>
      ) : (
        <>
          {/* 顶部导航栏（仅主导航，待办已移至右侧浮动面板） */}
          <nav className="side-bar flex items-center px-4 py-2 gap-2">
            <GameNav currentPage={gamePage} onNavigate={setGamePage} />
          </nav>

          {/* 内容区 */}
          <main className="flex-1 overflow-y-auto p-4 min-h-0 pr-16">
            {renderPage()}
          </main>

          {/* 右侧图标栏（议会/民意/内阁） */}
          <SideRail />

          {/* 待办浮动面板：独立于 nav，竖排可折叠，展开时不撑高 nav */}
          <PendingTodos />
        </>
      )}

      {/* 右侧弹出面板（议会/民意/内阁页面） */}
      <SidePanel />

      {/* 右上角未读提醒（fixed 定位） */}
      <NotificationAlerts />

      {/* 全屏遮罩弹窗 */}
      <ActionDialog />
      <BreakingNews />
      {currentCountdown && <CountdownTimer />}

      {/* 战争事件链弹窗（最优先级，覆盖其他弹窗） */}
      <WarEventDialog />

      {/* 事件弹窗 + 事件收纳篮 */}
      <EventPopup />
      <EventBasket />

      {/* 百科全书弹窗（从右上角菜单触发） */}
      <EncyclopediaModal />

      {/* 卡牌事件弹窗（中央 Drop Zone） */}
      <CardEventDialog />

      {/* 突击新闻发布会 minigame（全屏，丑闻类事件触发时切入） */}
      <PressConferenceMinigame />

      {/* 深夜官邸密室游说 minigame（全屏，内阁页主动触发） */}
      <BackroomLobbyMinigame />

      {/* 手牌栏（仅在卡牌事件激活时显示，z-index 高于弹窗背景） */}
      <HandBar />

      {/* 成就解锁弹窗（右上角，自动消失） */}
      <AchievementToast />

      {/* 叙事节拍弹窗（左下角，国家氛围短文） */}
      <StoryBeatToast />

      {/* 新手教程（首次进入游戏时自动弹出，可跳过） */}
      <Tutorial />

      {/* 开发者控制台（从右上角菜单"开发者选项"二次确认进入，仅游戏中可用） */}
      {gamePhase === 'playing' && (
        <DeveloperConsole open={devConsoleOpen} onClose={() => setDevConsoleOpen(false)} />
      )}

      {/* 暂停指示器（卡牌事件激活时显示） */}
      {activeCardEvent && timeSpeed === 0 && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 rounded-full border border-amber-500/50 bg-amber-950/90 px-3 py-1 shadow-lg backdrop-blur-sm">
          <span className="font-mono text-[10px] font-bold tracking-wider text-amber-200">
            ⏸ 已暂停 · 卡牌事件待处理
          </span>
        </div>
      )}
    </div>
  )
}
