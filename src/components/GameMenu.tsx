import { motion, AnimatePresence } from 'motion/react'
import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useSaveGame } from '@/hooks/useSaveGame'
import { useSettingsStore } from '@/store/settingsStore'
import { GAME_VERSION } from '@/lib/version'
import type { SaveMeta } from '@/types/game'

interface GameMenuProps {
  open: boolean
  onClose: () => void
  onSave: () => Promise<void> | void
  onEndGame: () => void
}

type MenuTab = 'main' | 'save' | 'load' | 'settings' | 'about'

/** 游戏菜单：存档、读档、结算、返回主菜单、关于 */
export default function GameMenu({ open, onClose, onSave, onEndGame }: GameMenuProps) {
  const [tab, setTab] = useState<MenuTab>('main')
  const [saves, setSaves] = useState<SaveMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  // 自定义确认对话框状态（替代 window.confirm，Electron 中可能不工作）
  const [confirm, setConfirm] = useState<{
    message: string
    onConfirm: () => void
  } | null>(null)
  // 返回主菜单前的保存提示
  const [returnPrompt, setReturnPrompt] = useState(false)
  const [returnSaving, setReturnSaving] = useState(false)
  // 退出游戏前的保存提示
  const [exitPrompt, setExitPrompt] = useState(false)
  const [exitSaving, setExitSaving] = useState(false)
  const { listSaves, writeSave, loadSaveById, deleteSaveById, renameSave } = useSaveGame()
  const goTo = useGameStore((s) => s.goTo)
  const setEncyclopediaOpen = useGameStore((s) => s.setEncyclopediaOpen)
  const setDevConsoleOpen = useGameStore((s) => s.setDevConsoleOpen)
  const autoSaveIntervalMinutes = useSettingsStore((s) => s.autoSaveIntervalMinutes)
  const setAutoSaveInterval = useSettingsStore((s) => s.setAutoSaveInterval)
  const fullscreen = useSettingsStore((s) => s.fullscreen)
  const setFullscreen = useSettingsStore((s) => s.setFullscreen)
  const resetSettings = useSettingsStore((s) => s.resetSettings)
  const triggerTutorial = useSettingsStore((s) => s.triggerTutorial)
  const lastManualSaveAt = useSettingsStore((s) => s.lastManualSaveAt)
  // 开发者选项二次确认弹窗
  const [devConfirm, setDevConfirm] = useState(false)

  /** 刷新存档列表 */
  const refreshSaves = useCallback(async () => {
    setLoading(true)
    const result = await listSaves()
    setSaves(result.saves)
    if (result.error && result.saves.length === 0) {
      showToast('✗ 读取存档列表失败：' + result.error)
    }
    setLoading(false)
  }, [listSaves])

  useEffect(() => {
    if (open && (tab === 'load' || tab === 'save')) {
      refreshSaves()
    }
  }, [open, tab, refreshSaves])

  /** 显示提示 */
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  /** 手动存档 */
  const handleSave = async () => {
    const state = useGameStore.getState() as any
    const name = saveName.trim() || `${state.pmName} - ${state.year}年${state.month}月${state.day}日`
    const result = await writeSave(state, name)
    if (result.ok) {
      showToast('✓ 存档成功')
      setSaveName('')
      await refreshSaves()
    } else {
      showToast('✗ 存档失败：' + (result.error || '未知错误'))
    }
  }

  /** 读档 */
  const handleLoad = async (saveId: string) => {
    const result = await loadSaveById(saveId)
    if (result.ok) {
      showToast('✓ 读档成功')
      setTimeout(() => {
        onClose()
      }, 600)
    } else {
      showToast('✗ 读档失败：' + (result.error || '未知错误'))
    }
  }

  /** 删除存档 */
  const handleDelete = async (saveId: string) => {
    setConfirm({
      message: '确定要删除这个存档吗？',
      onConfirm: async () => {
        const result = await deleteSaveById(saveId)
        if (result.ok) {
          showToast('✓ 已删除')
          await refreshSaves()
        } else {
          showToast('✗ 删除失败：' + (result.error || '未知错误'))
        }
      },
    })
  }

  /** 重命名存档 */
  const handleRename = async (saveId: string) => {
    const newName = renameValue.trim()
    if (!newName) return
    const result = await renameSave(saveId, newName)
    if (result.ok) {
      showToast('✓ 已重命名')
      setRenamingId(null)
      setRenameValue('')
      await refreshSaves()
    } else {
      showToast('✗ 重命名失败：' + (result.error || '未知错误'))
    }
  }

  /** 返回主菜单：先提示保存 */
  const handleReturnMenu = () => {
    setReturnPrompt(true)
  }

  /** 退出游戏：先提示保存，再关闭窗口 */
  const handleExitGame = () => {
    setExitPrompt(true)
  }

  /** 保存并返回主菜单 */
  const handleSaveAndReturn = async () => {
    setReturnSaving(true)
    const state = useGameStore.getState() as any
    const result = await writeSave(state)
    setReturnSaving(false)
    if (!result.ok) {
      showToast('✗ 存档失败：' + (result.error || '未知错误'))
      return
    }
    showToast('✓ 已保存，返回主菜单')
    setReturnPrompt(false)
    setTimeout(() => {
      goTo('menu')
      onClose()
    }, 500)
  }

  /** 不保存直接返回主菜单 */
  const handleReturnWithoutSave = () => {
    setReturnPrompt(false)
    goTo('menu')
    onClose()
  }

  /** 保存并退出游戏 */
  const handleSaveAndExit = async () => {
    setExitSaving(true)
    const state = useGameStore.getState() as any
    const result = await writeSave(state)
    setExitSaving(false)
    if (!result.ok) {
      showToast('✗ 存档失败：' + (result.error || '未知错误'))
      return
    }
    showToast('✓ 已保存，正在退出...')
    setExitPrompt(false)
    setTimeout(() => {
      onClose()
      window.api?.windowClose()
    }, 400)
  }

  /** 不保存直接退出游戏 */
  const handleExitWithoutSave = () => {
    setExitPrompt(false)
    onClose()
    window.api?.windowClose()
  }

  /** 结束游戏（结算） */
  const handleEndGame = () => {
    setConfirm({
      message: '确定要提前结束游戏并查看结算吗？此操作不可撤销。',
      onConfirm: () => {
        onEndGame()
        onClose()
      },
    })
  }

  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[640px] max-w-[92vw] max-h-[85vh] overflow-hidden rounded-xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-50 to-orange-100 shadow-2xl"
          >
            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between border-b-2 border-amber-400/40 bg-gradient-to-r from-amber-200/80 to-orange-200/80 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">☰</span>
                <div>
                  <h2 className="font-serif text-xl font-bold text-amber-900">游戏菜单</h2>
                  <p className="font-mono text-[10px] text-amber-700/70">Game Menu</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-amber-700/20 px-3 py-1.5 font-mono text-xs font-bold text-amber-900 transition-colors hover:bg-amber-700/40"
              >
                ✕ 关闭
              </button>
            </div>

            {/* 标签栏 */}
            <div className="flex border-b border-amber-300/40 bg-amber-100/50">
              {([
                { id: 'main', label: '主菜单' },
                { id: 'save', label: '存档' },
                { id: 'load', label: '读档' },
                { id: 'settings', label: '设置' },
                { id: 'about', label: '关于' },
              ] as { id: MenuTab; label: string }[]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 px-4 py-2.5 font-serif text-sm font-semibold transition-colors ${
                    tab === t.id
                      ? 'bg-amber-200/60 text-amber-900 border-b-2 border-amber-600'
                      : 'text-amber-700/70 hover:bg-amber-200/40'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 内容区 */}
            <div className="max-h-[55vh] overflow-y-auto p-5">
              {/* 主菜单 */}
              {tab === 'main' && (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setEncyclopediaOpen(true)
                      onClose()
                    }}
                    className="w-full rounded-lg border-2 border-amber-400/50 bg-white/60 px-4 py-3 text-left font-serif text-sm font-bold text-amber-900 transition-colors hover:bg-amber-200/50"
                  >
                    📚 百科 →
                  </button>
                  <button
                    onClick={() => setTab('save')}
                    className="w-full rounded-lg border-2 border-amber-400/50 bg-white/60 px-4 py-3 text-left font-serif text-sm font-bold text-amber-900 transition-colors hover:bg-amber-200/50"
                  >
                    💾 存档管理 →
                  </button>
                  <button
                    onClick={() => setTab('load')}
                    className="w-full rounded-lg border-2 border-amber-400/50 bg-white/60 px-4 py-3 text-left font-serif text-sm font-bold text-amber-900 transition-colors hover:bg-amber-200/50"
                  >
                    📂 读档管理 →
                  </button>
                  <button
                    onClick={() => setTab('settings')}
                    className="w-full rounded-lg border-2 border-amber-400/50 bg-white/60 px-4 py-3 text-left font-serif text-sm font-bold text-amber-900 transition-colors hover:bg-amber-200/50"
                  >
                    ⚙️ 设置 →
                  </button>
                  <button
                    onClick={() => setDevConfirm(true)}
                    className="w-full rounded-lg border-2 border-zinc-500/40 bg-zinc-50/60 px-4 py-3 text-left font-serif text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-200/50"
                  >
                    🛠️ 开发者选项 →
                  </button>
                  <button
                    onClick={handleEndGame}
                    className="w-full rounded-lg border-2 border-rose-400/50 bg-rose-50/60 px-4 py-3 text-left font-serif text-sm font-bold text-rose-700 transition-colors hover:bg-rose-200/50"
                  >
                    🏁 结束游戏并结算 →
                  </button>
                  <button
                    onClick={handleReturnMenu}
                    className="w-full rounded-lg border-2 border-gray-400/50 bg-gray-50/60 px-4 py-3 text-left font-serif text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200/50"
                  >
                    🏠 返回主菜单 →
                  </button>
                  <button
                    onClick={handleExitGame}
                    className="w-full rounded-lg border-2 border-red-500/50 bg-red-50/60 px-4 py-3 text-left font-serif text-sm font-bold text-red-700 transition-colors hover:bg-red-200/50"
                  >
                    ⏻ 退出游戏 →
                  </button>
                </div>
              )}

              {/* 存档 */}
              {tab === 'save' && (
                <div className="space-y-4">
                  {/* 新建存档 */}
                  <div className="rounded-lg border-2 border-amber-400/40 bg-white/60 p-4">
                    <div className="mb-2 font-serif text-sm font-bold text-amber-900">
                      新建存档
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="存档名称（留空使用默认）"
                        className="flex-1 rounded border border-amber-400/40 bg-white/80 px-3 py-2 font-serif text-sm text-amber-900 placeholder:text-amber-700/40 focus:border-amber-600 focus:outline-none"
                      />
                      <button
                        onClick={handleSave}
                        className="rounded bg-amber-600 px-4 py-2 font-serif text-sm font-bold text-white transition-colors hover:bg-amber-700"
                      >
                        保存
                      </button>
                    </div>
                  </div>

                  {/* 快速存档 */}
                  <button
                    onClick={async () => {
                      const state = useGameStore.getState() as any
                      const result = await writeSave(
                        state,
                        `${state.pmName} - ${state.year}年${state.month}月${state.day}日 (快速)`,
                      )
                      if (result.ok) {
                        showToast('✓ 已快速存档')
                        await refreshSaves()
                      } else {
                        showToast('✗ 快速存档失败：' + (result.error || '未知错误'))
                      }
                    }}
                    className="w-full rounded-lg border-2 border-emerald-400/50 bg-emerald-50/60 px-4 py-2.5 font-serif text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-200/50"
                  >
                    ⚡ 快速存档
                  </button>

                  {/* 已有存档列表 */}
                  <div>
                    <div className="mb-2 font-serif text-sm font-bold text-amber-900">
                      已有存档（点击可覆盖保存）
                    </div>
                    {loading ? (
                      <div className="py-8 text-center font-serif text-sm text-amber-700/50">
                        加载中...
                      </div>
                    ) : saves.length === 0 ? (
                      <div className="py-8 text-center font-serif text-sm text-amber-700/40">
                        暂无存档
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {saves.map((save) => (
                          <SaveRow
                            key={save.saveId}
                            save={save}
                            mode="save"
                            onAction={async () => {
                              const state = useGameStore.getState() as any
                              const result = await writeSave(state, save.saveName)
                              if (result.ok) {
                                showToast('✓ 已覆盖保存')
                                await refreshSaves()
                              } else {
                                showToast('✗ 覆盖保存失败：' + (result.error || '未知错误'))
                              }
                            }}
                            onDelete={() => handleDelete(save.saveId)}
                            onRename={() => {
                              setRenamingId(save.saveId)
                              setRenameValue(save.saveName)
                            }}
                            renamingId={renamingId}
                            renameValue={renameValue}
                            setRenameValue={setRenameValue}
                            onConfirmRename={() => handleRename(save.saveId)}
                            onCancelRename={() => {
                              setRenamingId(null)
                              setRenameValue('')
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 读档 */}
              {tab === 'load' && (
                <div className="space-y-2">
                  <div className="mb-2 font-serif text-sm font-bold text-amber-900">
                    选择存档读取
                  </div>
                  {loading ? (
                    <div className="py-8 text-center font-serif text-sm text-amber-700/50">
                      加载中...
                    </div>
                  ) : saves.length === 0 ? (
                    <div className="py-8 text-center font-serif text-sm text-amber-700/40">
                      暂无存档
                    </div>
                  ) : (
                    saves.map((save) => (
                      <SaveRow
                        key={save.saveId}
                        save={save}
                        mode="load"
                        onAction={() => handleLoad(save.saveId)}
                        onDelete={() => handleDelete(save.saveId)}
                        onRename={() => {
                          setRenamingId(save.saveId)
                          setRenameValue(save.saveName)
                        }}
                        renamingId={renamingId}
                        renameValue={renameValue}
                        setRenameValue={setRenameValue}
                        onConfirmRename={() => handleRename(save.saveId)}
                        onCancelRename={() => {
                          setRenamingId(null)
                          setRenameValue('')
                        }}
                      />
                    ))
                  )}
                </div>
              )}

              {/* 设置 */}
              {tab === 'settings' && (
                <div className="space-y-4 font-serif text-sm text-amber-900">
                  {/* 自动保存周期 */}
                  <div className="rounded-lg border-2 border-amber-400/40 bg-white/60 p-4">
                    <div className="mb-1 font-bold text-base">自动保存周期</div>
                    <p className="mb-3 text-xs leading-relaxed text-amber-800/70">
                      游戏运行时按此周期自动存档（与手动存档同目录，前缀 auto_，仅保留最近 5 个）。范围 1–60 分钟。
                    </p>
                    <div className="mb-3 flex items-center gap-3">
                      <input
                        type="range"
                        min={1}
                        max={60}
                        step={1}
                        value={autoSaveIntervalMinutes}
                        onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                        className="flex-1 accent-amber-600"
                      />
                      <div className="flex items-center gap-1 rounded border border-amber-400/40 bg-white/80 px-2 py-1">
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={autoSaveIntervalMinutes}
                          onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                          className="w-12 bg-transparent text-center font-mono text-sm font-bold text-amber-900 focus:outline-none"
                        />
                        <span className="font-mono text-xs text-amber-700/70">分钟</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[5, 10, 15, 20, 30].map((m) => (
                        <button
                          key={m}
                          onClick={() => setAutoSaveInterval(m)}
                          className={`rounded px-2.5 py-1 font-mono text-[11px] font-bold transition-colors ${
                            autoSaveIntervalMinutes === m
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                        >
                          {m} 分钟
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 显示模式：全屏 / 窗口 */}
                  <div className="rounded-lg border-2 border-amber-400/40 bg-white/60 p-4">
                    <div className="mb-1 font-bold text-base">显示模式</div>
                    <p className="mb-3 text-xs leading-relaxed text-amber-800/70">
                      切换全屏 / 窗口模式。全屏模式下右上角窗口控制按钮自动隐藏。下次启动将沿用此设置。
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFullscreen(true)}
                        className={`flex-1 rounded border-2 px-3 py-2 font-serif text-xs font-bold transition-colors ${
                          fullscreen
                            ? 'border-amber-600 bg-amber-600 text-white'
                            : 'border-amber-400/40 bg-white/60 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        ⛶ 全屏模式
                      </button>
                      <button
                        onClick={() => setFullscreen(false)}
                        className={`flex-1 rounded border-2 px-3 py-2 font-serif text-xs font-bold transition-colors ${
                          !fullscreen
                            ? 'border-amber-600 bg-amber-600 text-white'
                            : 'border-amber-400/40 bg-white/60 text-amber-800 hover:bg-amber-100'
                        }`}
                      >
                        ▢ 窗口模式
                      </button>
                    </div>
                  </div>

                  {/* 重置设置 / 立即重看新手教程 */}
                  <div className="rounded-lg border-2 border-amber-400/40 bg-white/60 p-4">
                    <div className="mb-2 font-bold">恢复默认 / 新手教程</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          resetSettings()
                          showToast('✓ 已恢复默认设置')
                        }}
                        className="rounded bg-amber-200 px-3 py-1.5 font-serif text-xs font-bold text-amber-800 transition-colors hover:bg-amber-300"
                      >
                        恢复默认设置
                      </button>
                      <button
                        onClick={() => {
                          // 立即触发教程：tutorialOpenSignal 自增后 Tutorial 组件立即弹出
                          // 无需修改 tutorialCompleted，重看结束后会再次标记完成
                          triggerTutorial()
                          showToast('✓ 已立即开启新手教程')
                          onClose()
                        }}
                        className="rounded bg-blue-200 px-3 py-1.5 font-serif text-xs font-bold text-blue-800 transition-colors hover:bg-blue-300"
                      >
                        ▶ 立即重看新手教程
                      </button>
                    </div>
                  </div>

                  {/* 上次存档时间 */}
                  {lastManualSaveAt && (
                    <div className="rounded-lg border-2 border-emerald-400/30 bg-emerald-50/40 p-3 text-xs text-emerald-800/80">
                      <span className="font-bold">⏱ 上次手动存档：</span>
                      <span className="font-mono">
                        {new Date(lastManualSaveAt).toLocaleString('zh-CN', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 关于 */}
              {tab === 'about' && (
                <AboutContent variant="light" />
              )}
            </div>

            {/* Toast 提示 */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-amber-900 px-4 py-2 font-serif text-xs font-bold text-amber-50 shadow-lg"
                >
                  {toast}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* 自定义确认对话框（替代 window.confirm，Electron 兼容） */}
    <AnimatePresence>
      {confirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setConfirm(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[400px] max-w-[90vw] rounded-xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-50 to-orange-100 p-6 shadow-2xl"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <h3 className="font-serif text-base font-bold text-amber-900">确认</h3>
            </div>
            <p className="mb-5 font-serif text-sm leading-relaxed text-amber-800">
              {confirm.message}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const fn = confirm.onConfirm
                  setConfirm(null)
                  fn()
                }}
                className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 font-serif text-sm font-bold text-white transition-colors hover:bg-amber-700"
              >
                确认
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-lg bg-amber-200/60 px-4 py-2.5 font-serif text-sm font-bold text-amber-900 transition-colors hover:bg-amber-300/60"
              >
                取消
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* 开发者选项二次确认弹窗 */}
    <AnimatePresence>
      {devConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setDevConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[440px] max-w-[90vw] rounded-xl border-2 border-zinc-600/60 bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 shadow-2xl"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">🛠️</span>
              <h3 className="font-serif text-base font-bold text-zinc-100">开发者选项</h3>
            </div>
            <p className="mb-3 font-serif text-sm leading-relaxed text-zinc-300">
              开发者选项用于调试与测试，可能直接影响游戏进度与存档兼容性。
            </p>
            <ul className="mb-4 list-disc pl-5 font-mono text-[11px] leading-relaxed text-amber-300/80">
              <li>调整 turn（已就任月份数）会改变游戏时间</li>
              <li>可能影响成就判定与结局触发</li>
              <li>建议仅在测试或排查问题时使用</li>
            </ul>
            <p className="mb-5 font-serif text-xs leading-relaxed text-zinc-400">
              确认要进入开发者选项吗？
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDevConfirm(false)
                  onClose()
                  setDevConsoleOpen(true)
                }}
                className="flex-1 rounded-lg bg-zinc-700 px-4 py-2.5 font-serif text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-600"
              >
                确认进入
              </button>
              <button
                onClick={() => setDevConfirm(false)}
                className="flex-1 rounded-lg bg-zinc-200/60 px-4 py-2.5 font-serif text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-300/60"
              >
                取消
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* 返回主菜单前的保存提示（三选一） */}
    <AnimatePresence>
      {returnPrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => !returnSaving && setReturnPrompt(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[420px] max-w-[90vw] rounded-xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-50 to-orange-100 p-6 shadow-2xl"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl">💾</span>
              <h3 className="font-serif text-base font-bold text-amber-900">保存进度？</h3>
            </div>
            <p className="mb-5 font-serif text-sm leading-relaxed text-amber-800">
              返回主菜单后未保存的进度将丢失。是否在返回前保存当前游戏？
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveAndReturn}
                disabled={returnSaving}
                className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-serif text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
              >
                {returnSaving ? '保存中...' : '💾 保存并返回主菜单'}
              </button>
              <button
                onClick={handleReturnWithoutSave}
                disabled={returnSaving}
                className="w-full rounded-lg bg-rose-100 px-4 py-2.5 font-serif text-sm font-bold text-rose-700 transition-colors hover:bg-rose-200 disabled:opacity-50"
              >
                不保存直接返回
              </button>
              <button
                onClick={() => setReturnPrompt(false)}
                disabled={returnSaving}
                className="w-full rounded-lg bg-amber-200/60 px-4 py-2.5 font-serif text-sm font-bold text-amber-900 transition-colors hover:bg-amber-300/60 disabled:opacity-50"
              >
                取消
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* 退出游戏前的保存提示（三选一） */}
    <AnimatePresence>
      {exitPrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => !exitSaving && setExitPrompt(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[420px] max-w-[90vw] rounded-xl border-2 border-red-500/50 bg-gradient-to-br from-rose-50 to-red-100 p-6 shadow-2xl"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl">⏻</span>
              <h3 className="font-serif text-base font-bold text-red-700">退出游戏前保存？</h3>
            </div>
            <p className="mb-5 font-serif text-sm leading-relaxed text-rose-800">
              即将退出游戏，未保存的进度将丢失。是否在退出前保存当前游戏？
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveAndExit}
                disabled={exitSaving}
                className="w-full rounded-lg bg-red-600 px-4 py-2.5 font-serif text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {exitSaving ? '保存中...' : '💾 保存并退出'}
              </button>
              <button
                onClick={handleExitWithoutSave}
                disabled={exitSaving}
                className="w-full rounded-lg bg-rose-100 px-4 py-2.5 font-serif text-sm font-bold text-rose-700 transition-colors hover:bg-rose-200 disabled:opacity-50"
              >
                不保存直接退出
              </button>
              <button
                onClick={() => setExitPrompt(false)}
                disabled={exitSaving}
                className="w-full rounded-lg bg-amber-200/60 px-4 py-2.5 font-serif text-sm font-bold text-amber-900 transition-colors hover:bg-amber-300/60 disabled:opacity-50"
              >
                取消
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}

/** 存档系统诊断面板：显示存档目录路径、文件数量，可打开目录 */
export function SaveDiagnostics() {
  const [info, setInfo] = useState<{
    ok: boolean
    savesDir: string
    exists: boolean
    totalFiles: number
    saveFiles: number
    files: string[]
    error?: string
  } | null>(null)

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined' || !window.api?.diagnose) {
      setInfo({
        ok: false,
        savesDir: '(未知)',
        exists: false,
        totalFiles: 0,
        saveFiles: 0,
        files: [],
        error: 'window.api 不可用（可能在浏览器中运行，需在 Electron 中启动）',
      })
      return
    }
    try {
      const result = await window.api.diagnose()
      setInfo(result)
    } catch (e) {
      setInfo({
        ok: false,
        savesDir: '(未知)',
        exists: false,
        totalFiles: 0,
        saveFiles: 0,
        files: [],
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleOpenDir = async () => {
    if (window.api?.openSaveDir) {
      await window.api.openSaveDir()
    }
  }

  return (
    <div className="rounded-lg border-2 border-amber-400/40 bg-white/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-bold">存档系统诊断</div>
        <div className="flex gap-1">
          <button
            onClick={refresh}
            className="rounded bg-amber-200 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800 hover:bg-amber-300"
          >
            刷新
          </button>
          <button
            onClick={handleOpenDir}
            disabled={!info?.ok}
            className="rounded bg-emerald-200 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800 hover:bg-emerald-300 disabled:opacity-40"
          >
            打开目录
          </button>
        </div>
      </div>
      {!info ? (
        <div className="py-3 text-center font-mono text-xs text-amber-700/50">诊断中...</div>
      ) : (
        <div className="space-y-1 text-xs text-amber-800/80">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${info.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="font-bold">{info.ok ? '正常' : '异常'}</span>
            {info.error && <span className="text-red-600">：{info.error}</span>}
          </div>
          <div className="break-all font-mono text-[10px] text-amber-700/70">
            存档目录：{info.savesDir}
          </div>
          <div>目录存在：{info.exists ? '✓' : '✗'}</div>
          <div>存档文件数：{info.saveFiles}（总文件 {info.totalFiles}）</div>
          {info.files.length > 0 && (
            <div className="mt-1 max-h-24 overflow-y-auto rounded bg-amber-50/50 p-1.5">
              {info.files.slice(0, 10).map((f) => (
                <div key={f} className="font-mono text-[10px] text-amber-700/80 truncate">
                  {f}
                </div>
              ))}
              {info.files.length > 10 && (
                <div className="font-mono text-[10px] text-amber-700/50">
                  ... 及另外 {info.files.length - 10} 个
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** 关于页面内容（游戏内菜单与主菜单共用，保证内容一致）
 *  variant="light" 用于游戏内菜单（浅色琥珀主题），variant="dark" 用于主菜单（深色墨色主题）
 */
export function AboutContent({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const dark = variant === 'dark'
  const card = dark
    ? 'border-gold/30 bg-ink-800/80'
    : 'border-amber-400/40 bg-white/60'
  const title = dark ? 'text-gold' : 'text-amber-900'
  const sub = dark ? 'text-parchment-200/80' : 'text-amber-800/80'
  const label = dark ? 'text-parchment-200/60' : 'text-amber-700/70'
  const body = dark ? 'text-parchment-200/75' : 'text-amber-800/80'
  const section = dark ? 'text-gold/80' : 'text-amber-900'
  const bullet = dark ? 'text-gold/60' : 'text-amber-600'

  return (
    <div className="space-y-3 font-serif text-sm">
      {/* 标题块 */}
      <div className={`rounded-lg border-2 p-4 ${card}`}>
        <div className={`mb-2 font-bold text-base ${title}`}>宰执春秋</div>
        <div className={`space-y-1 text-xs ${sub}`}>
          <div>版本：{GAME_VERSION}</div>
          <div>开发者：prideplayer</div>
          <div>类型：政治决策模拟 / 即时策略</div>
          <div>引擎：Electron + React + TypeScript</div>
        </div>
      </div>

      {/* 游戏简介 */}
      <div className={`rounded-lg border-2 p-4 ${card}`}>
        <div className={`mb-2 font-bold ${section}`}>游戏简介</div>
        <p className={`text-xs leading-relaxed ${body}`}>
          《宰执春秋》是一款即时策略决策模拟游戏。您将化身为共和国的总理，自定义国名、角色背景、执政党派与内阁班底，逐日处理国家大事，在民意、国库、经济、稳定、外交、声望六大指标间寻求平衡，应对随机事件与紧急危机，争取连任，最终书写属于您的执政传奇。
        </p>
      </div>

      {/* 核心玩法 */}
      <div className={`rounded-lg border-2 p-4 ${card}`}>
        <div className={`mb-2 font-bold ${section}`}>核心玩法</div>
        <ul className={`space-y-1.5 text-xs leading-relaxed ${body}`}>
          <li><span className={bullet}>▸</span> <b>六大指标</b>：民意、国库、经济、稳定、外交、声望，任一指标过低都可能引发危机或提前下台。</li>
          <li><span className={bullet}>▸</span> <b>即时制时间</b>：五档速度推进日历，空格键暂停／恢复；暂停后再按空格回到原速度。</li>
          <li><span className={bullet}>▸</span> <b>事件决策</b>：随机事件、紧急倒计时、选区信件、外交照会、议会质询纷纷而至，每个选择都有代价。</li>
          <li><span className={bullet}>▸</span> <b>事件收纳篮</b>：未处理的事件会暂存，超时将按默认选项自动决策。</li>
        </ul>
      </div>

      {/* 主要系统 */}
      <div className={`rounded-lg border-2 p-4 ${card}`}>
        <div className={`mb-2 font-bold ${section}`}>主要系统</div>
        <ul className={`space-y-1.5 text-xs leading-relaxed ${body}`}>
          <li><span className={bullet}>▸</span> <b>内阁系统</b>：任命部长、接收部长建言与私信，忠诚度影响指标加成。</li>
          <li><span className={bullet}>▸</span> <b>议会与政党</b>：执政联盟席位、不信任投票、解散议会、组阁谈判。</li>
          <li><span className={bullet}>▸</span> <b>改革系统</b>：启动国策改革，消耗国库与政治资本，长期改变国家走向。</li>
          <li><span className={bullet}>▸</span> <b>外交与战争</b>：与多国互动、缔结条约、应对入侵、经历战争事件链。</li>
          <li><span className={bullet}>▸</span> <b>领域行动</b>：军事、社会、经济、环境四大领域的专项决策。</li>
          <li><span className={bullet}>▸</span> <b>选举连任</b>：任期届满参选，政绩决定是否连任；连任次数影响成就。</li>
        </ul>
      </div>

      {/* 操作说明 */}
      <div className={`rounded-lg border-2 p-4 ${card}`}>
        <div className={`mb-2 font-bold ${section}`}>操作说明</div>
        <ul className={`space-y-1.5 text-xs leading-relaxed ${body}`}>
          <li><span className={bullet}>▸</span> <b>空格</b>：暂停／恢复时间（恢复到原速度）</li>
          <li><span className={bullet}>▸</span> <b>T</b>：打开任务树　<b>P</b>：打开政策树　<b>C</b>：打开内阁聊天</li>
          <li><span className={bullet}>▸</span> <b>速度档位</b>：⏸ 暂停 ｜ Ⅰ–Ⅴ 五档倍速</li>
          <li><span className={bullet}>▸</span> <b>自动存档</b>：按设置周期自动保存，仅保留最近 5 个自动档。</li>
        </ul>
      </div>

      {/* 存档诊断 */}
      <SaveDiagnostics />

      <div className={`px-1 pt-1 text-center font-mono text-[10px] ${label}`}>
        宰执春秋 · v{GAME_VERSION} · © prideplayer
      </div>
    </div>
  )
}

/** 存档行 */
interface SaveRowProps {
  save: SaveMeta
  mode: 'save' | 'load'
  onAction: () => void
  onDelete: () => void
  onRename: () => void
  renamingId: string | null
  renameValue: string
  setRenameValue: (v: string) => void
  onConfirmRename: () => void
  onCancelRename: () => void
}

function SaveRow({
  save,
  mode,
  onAction,
  onDelete,
  onRename,
  renamingId,
  renameValue,
  setRenameValue,
  onConfirmRename,
  onCancelRename,
}: SaveRowProps) {
  const isRenaming = renamingId === save.saveId
  const savedDate = new Date(save.savedAt)
  const formattedDate = `${savedDate.getFullYear()}-${String(savedDate.getMonth() + 1).padStart(2, '0')}-${String(savedDate.getDate()).padStart(2, '0')} ${String(savedDate.getHours()).padStart(2, '0')}:${String(savedDate.getMinutes()).padStart(2, '0')}`

  return (
    <div className="rounded-lg border border-amber-300/50 bg-white/70 p-3 transition-colors hover:border-amber-500/60">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <div className="flex gap-1">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="flex-1 rounded border border-amber-400/60 bg-white px-2 py-1 font-serif text-xs text-amber-900 focus:border-amber-600 focus:outline-none"
                autoFocus
              />
              <button
                onClick={onConfirmRename}
                className="rounded bg-amber-600 px-2 py-1 font-mono text-[10px] font-bold text-white hover:bg-amber-700"
              >
                ✓
              </button>
              <button
                onClick={onCancelRename}
                className="rounded bg-gray-400 px-2 py-1 font-mono text-[10px] font-bold text-white hover:bg-gray-500"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <div className="font-serif text-sm font-bold text-amber-900 truncate">
                  {save.saveName}
                </div>
                {save.isAuto && (
                  <span className="shrink-0 rounded-full bg-blue-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-blue-700">
                    自动
                  </span>
                )}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-amber-700/60">
                {save.countryName ? `${save.countryName} · ` : ''}{save.pmName} · 第{save.term}届 · {save.year}年{save.month}月{save.day}日 · 执政{save.turn}月
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-amber-700/50">
                保存于 {formattedDate}
              </div>
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            onClick={onAction}
            className={`rounded px-2.5 py-1 font-serif text-[11px] font-bold text-white transition-colors ${
              mode === 'load'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {mode === 'load' ? '读取' : '覆盖'}
          </button>
          <div className="flex gap-1">
            <button
              onClick={onRename}
              disabled={isRenaming}
              className="flex-1 rounded bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800 transition-colors hover:bg-amber-200 disabled:opacity-40"
            >
              改名
            </button>
            <button
              onClick={onDelete}
              className="flex-1 rounded bg-rose-100 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-700 transition-colors hover:bg-rose-200"
            >
              删除
            </button>
          </div>
        </div>
      </div>

      {/* 指标缩略 */}
      {save.metrics && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-amber-300/30 pt-2">
          {(Object.entries(save.metrics) as [string, number][]).map(([key, value]) => {
            const labels: Record<string, string> = {
              approval: '民意', treasury: '国库', economy: '经济',
              stability: '稳定', diplomacy: '外交', prestige: '声望',
            }
            const color =
              value >= 60 ? 'text-emerald-600' :
              value >= 35 ? 'text-amber-600' :
              'text-rose-600'
            return (
              <span key={key} className={`font-mono text-[10px] font-bold ${color}`}>
                {labels[key] ?? key} {value}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
