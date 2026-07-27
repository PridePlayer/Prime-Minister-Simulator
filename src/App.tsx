import { useGameStore } from '@/store/gameStore'
import MainMenu from '@/pages/MainMenu'
import Game from '@/pages/Game'
import Ending from '@/pages/Ending'
import TitleBar from '@/components/TitleBar'

export default function App() {
  const screen = useGameStore((s) => s.screen)

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink-900">
      {/* 自绘标题栏：替代 Windows 系统栏，常驻顶部
          菜单按钮 + 窗口控制按钮均位于标题栏右侧 */}
      <TitleBar />
      {/* 主内容区：占据剩余高度 */}
      <div className="flex-1 min-h-0">
        {screen === 'menu' && <MainMenu />}
        {screen === 'game' && <Game />}
        {screen === 'ending' && <Ending />}
      </div>
    </div>
  )
}
