import { useState } from 'react'
import { Menu as MenuIcon } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { useSaveGame } from '@/hooks/useSaveGame'
import WindowControls from '@/components/WindowControls'
import GameMenu from '@/components/GameMenu'
import TimeControl from '@/components/TimeControl'

/**
 * 自绘标题栏（替代 Windows 系统栏）
 * - 整条栏作为可拖拽区域（-webkit-app-region: drag）
 * - 左侧：游戏标识
 * - 中间（仅游戏内）：时间控制（日期 + 速度 + 事件篮）
 * - 右侧：菜单按钮（仅游戏内）+ 窗口控制按钮
 * - "返回主菜单"已收纳到"菜单"弹窗内
 */
export default function TitleBar() {
  const screen = useGameStore((s) => s.screen)
  const gamePhase = useGameStore((s) => s.gamePhase)
  const [showGameMenu, setShowGameMenu] = useState(false)
  // 大选/组阁/内阁组建阶段隐藏时间控制（不允许调节速度）
  const hideTimeControl = gamePhase === 'election' || gamePhase === 'coalition' || gamePhase === 'cabinet_setup'

  return (
    <>
      <div
        data-tauri-drag-region
        className="title-bar relative z-50 flex h-11 items-center justify-between border-b border-gold/15 bg-ink-900 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* 左：游戏标识 */}
        <div className="flex items-center gap-2 pl-3 shrink-0">
          <span className="text-sm">🏛️</span>
          <span className="font-display text-xs font-semibold tracking-[0.3em] text-gold/80">
            宰 执 春 秋
          </span>
        </div>

        {/* 中：时间控制（仅游戏内显示）
            整条标题栏为拖拽区，仅 TimeControl 本身设为 no-drag，
            这样左右两侧空白仍可拖动窗口 */}
        {screen === 'game' && !hideTimeControl && (
          <div className="flex-1 flex justify-center">
            <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <TimeControl />
            </div>
          </div>
        )}

        {/* 右：菜单按钮（仅游戏内）+ 窗口控制按钮 */}
        <div
          className="flex h-full items-center shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {screen === 'game' && (
            <button
              onClick={() => setShowGameMenu(true)}
              className="flex h-full items-center gap-1 px-3 text-parchment-200/70 transition-colors hover:bg-gold/10 hover:text-gold"
              title="游戏菜单"
            >
              <MenuIcon size={13} />
              <span className="font-serif text-[11px] font-semibold tracking-widest">
                菜单
              </span>
            </button>
          )}
          <WindowControls variant="bar" />
        </div>
      </div>

      {/* 游戏菜单弹窗（仅游戏内可用） */}
      {screen === 'game' && (
        <GameMenuConnector open={showGameMenu} onClose={() => setShowGameMenu(false)} />
      )}
    </>
  )
}

/** 把 GameMenu 与 store 的 endGameEarly 连接起来 */
function GameMenuConnector({ open, onClose }: { open: boolean; onClose: () => void }) {
  const endGameEarly = useGameStore((s) => s.endGameEarly)
  const { writeSave } = useSaveGame()

  const handleSave = async () => {
    const result = await writeSave(useGameStore.getState() as any)
    if (!result.ok) {
      console.error('[manual-save] 手动存档失败：', result.error)
    }
  }

  return (
    <GameMenu
      open={open}
      onClose={onClose}
      onSave={handleSave}
      onEndGame={endGameEarly}
    />
  )
}
