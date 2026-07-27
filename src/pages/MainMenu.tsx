import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { useSaveGame } from '@/hooks/useSaveGame'
import { useSettingsStore } from '@/store/settingsStore'
import { AboutContent } from '@/components/GameMenu'
import { GAME_VERSION } from '@/lib/version'
import CharacterCreation from './CharacterCreation'
import type { SaveMeta } from '@/types/game'
import logoIcon from '@/icon/icon.png'

const TITLE = '宰执春秋'
const SUBTITLE = 'ZAI ZHI CHUN QIU'

export default function MainMenu() {
  const goTo = useGameStore((s) => s.goTo)
  const hasSave = useGameStore((s) => s.hasSave)
  const { checkSave, loadSave, listSaves, loadSaveById, deleteSaveById } = useSaveGame()
  const [showCharacterCreation, setShowCharacterCreation] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    checkSave().then((result) => {
      if (result.error) {
        showToast('存档系统异常：' + result.error)
      }
    })
  }, [checkSave])

  const handleContinue = async () => {
    const result = await loadSave()
    if (result.ok) {
      // loadSave 内部已经调用 goTo('game')
      showToast('✓ 读档成功，进入游戏')
    } else {
      showToast('✗ 无法读取存档：' + (result.error || '未知错误'))
    }
  }

  return (
    <div className="bg-ink-grid relative flex h-full w-full items-center justify-center overflow-hidden">
      {/* 暗角晕影 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(13,27,42,0.85) 90%)',
        }}
      />
      {/* 国徽水印 */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[40rem] leading-none opacity-[0.04]">
        🏛️
      </div>

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-8">
        {/* Logo 图标 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-gold/60 shadow-gold overflow-hidden bg-ink-900"
        >
          <img
            src={logoIcon}
            alt="宰执春秋"
            className="h-full w-full object-cover"
            style={{ filter: 'saturate(0.9)' }}
          />
        </motion.div>

        {/* 装饰上线 */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-3 h-px w-64 bg-gradient-to-r from-transparent via-gold to-transparent"
        />

        {/* 标题逐字 */}
        <h1 className="flex font-display text-6xl font-bold tracking-[0.1em] text-parchment-50">
          {TITLE.split('').map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
              className="inline-block"
              style={{ textShadow: '0 0 30px rgba(201,169,97,0.4)' }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="mt-2 font-mono text-[11px] tracking-[0.6em] text-gold/70"
        >
          {SUBTITLE}
        </motion.p>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mt-3 h-px w-48 bg-gradient-to-r from-transparent via-gold/60 to-transparent"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="mt-4 font-serif text-sm italic text-parchment-200/50"
        >
          宰制万机，执掌春秋——书写您的执政传奇
        </motion.p>

        {/* 操作按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.6 }}
          className="mt-10 flex w-full max-w-xs flex-col gap-3"
        >
          <button onClick={() => setShowCharacterCreation(true)} className="btn-gold w-full">
            <span className="font-display text-lg font-semibold">新 游 戏</span>
          </button>
          <button
            onClick={handleContinue}
            disabled={!hasSave}
            className={`btn-gold w-full ${hasSave ? 'animate-pulse-gold' : ''}`}
          >
            <span className="font-display text-lg font-semibold">继 续 游 戏</span>
            {!hasSave && (
              <span className="font-mono text-[9px] text-parchment-200/40">
                （无存档）
              </span>
            )}
          </button>
          {/* 新增：读取存档按钮 — 打开存档列表选择具体存档 */}
          <button
            onClick={() => setShowLoadDialog(true)}
            disabled={!hasSave}
            className={`btn-gold w-full ${hasSave ? '' : 'opacity-40 cursor-not-allowed'}`}
          >
            <span className="font-display text-lg font-semibold">读 取 存 档</span>
            {!hasSave && (
              <span className="font-mono text-[9px] text-parchment-200/40">
                （无存档）
              </span>
            )}
          </button>
          <button onClick={() => setShowAbout(true)} className="btn-gold w-full">
            <span className="font-display text-lg font-semibold">关 于</span>
          </button>
          <button onClick={() => setShowSettings(true)} className="btn-gold w-full">
            <span className="font-display text-lg font-semibold">设 置</span>
          </button>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="btn-gold w-full"
          >
            <span className="font-display text-lg font-semibold">退 出 游 戏</span>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.6 }}
          className="mt-8 font-mono text-[10px] tracking-wider text-parchment-200/30"
        >
          宰执春秋 · v{GAME_VERSION}
        </motion.div>
      </div>

      {/* 角色创建弹层 */}
      <AnimatePresence>
        {showCharacterCreation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-ink-900/90 backdrop-blur-sm"
            onClick={() => setShowCharacterCreation(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <CharacterCreation onComplete={() => setShowCharacterCreation(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 读取存档弹层 */}
      <AnimatePresence>
        {showLoadDialog && (
          <LoadSaveDialog
            onClose={() => setShowLoadDialog(false)}
            onLoad={async (saveId) => {
              const result = await loadSaveById(saveId)
              if (result.ok) {
                setShowLoadDialog(false)
                // loadSaveById 内部已经调用 goTo('game')
              } else {
                showToast('✗ 读档失败：' + (result.error || '未知错误'))
              }
            }}
            listSaves={async () => (await listSaves()).saves}
            deleteSaveById={async (id) => (await deleteSaveById(id)).ok}
          />
        )}
      </AnimatePresence>

      {/* Toast 提示 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-ink-900/95 px-6 py-3 font-serif text-sm font-bold text-gold shadow-2xl border border-gold/40"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 关于弹层（与游戏内菜单"关于"内容一致） */}
      <AnimatePresence>
        {showAbout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-ink-900/85 backdrop-blur-sm"
            onClick={() => setShowAbout(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="corner-frame card-seal relative w-[560px] max-w-[92vw] max-h-[88vh] overflow-y-auto rounded-sm bg-ink-800 p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-xl font-semibold text-gold">
                  关于本游戏
                </h3>
                <button
                  onClick={() => setShowAbout(false)}
                  className="rounded-full bg-gold/10 px-3 py-1.5 font-mono text-xs font-bold text-gold transition-colors hover:bg-gold/20"
                >
                  ✕ 关闭
                </button>
              </div>
              <AboutContent variant="dark" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 设置弹层 */}
      <AnimatePresence>
        {showSettings && (
          <SettingsDialog onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      {/* 退出游戏确认弹层 */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-ink-900/85 backdrop-blur-sm"
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="corner-frame card-seal relative w-80 rounded-sm bg-ink-800 p-6 text-center"
            >
              <div className="mb-2 text-2xl">⏻</div>
              <h3 className="mb-2 font-display text-lg font-semibold text-gold">
                退出游戏？
              </h3>
              <p className="mb-5 font-serif text-xs leading-relaxed text-parchment-200/70">
                确定要退出《宰执春秋》吗？
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => window.api?.windowClose()}
                  className="w-full rounded bg-red-700 px-4 py-2 font-serif text-sm font-bold text-white transition-colors hover:bg-red-800"
                >
                  退出游戏
                </button>
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full rounded bg-gold/10 px-4 py-2 font-serif text-sm font-bold text-gold transition-colors hover:bg-gold/20"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** 设置弹层：自动保存周期等用户设置（与游戏内菜单"设置"一致） */
function SettingsDialog({ onClose }: { onClose: () => void }) {
  const autoSaveIntervalMinutes = useSettingsStore((s) => s.autoSaveIntervalMinutes)
  const setAutoSaveInterval = useSettingsStore((s) => s.setAutoSaveInterval)
  const fullscreen = useSettingsStore((s) => s.fullscreen)
  const setFullscreen = useSettingsStore((s) => s.setFullscreen)
  const resetSettings = useSettingsStore((s) => s.resetSettings)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-ink-900/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="corner-frame card-seal relative w-[460px] max-w-[92vw] rounded-sm bg-ink-800 p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-gold">设置</h3>
          <button
            onClick={onClose}
            className="rounded-full bg-gold/10 px-3 py-1.5 font-mono text-xs font-bold text-gold transition-colors hover:bg-gold/20"
          >
            ✕ 关闭
          </button>
        </div>

        <div className="space-y-4 font-serif text-sm">
          {/* 自动保存周期 */}
          <div className="rounded-lg border-2 border-gold/30 bg-ink-900/50 p-4">
            <div className="mb-1 font-bold text-base text-gold">自动保存周期</div>
            <p className="mb-3 text-xs leading-relaxed text-parchment-200/60">
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
                className="flex-1 accent-gold"
              />
              <div className="flex items-center gap-1 rounded border border-gold/30 bg-ink-900/60 px-2 py-1">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={autoSaveIntervalMinutes}
                  onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                  className="w-12 bg-transparent text-center font-mono text-sm font-bold text-gold focus:outline-none"
                />
                <span className="font-mono text-xs text-parchment-200/60">分钟</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[5, 10, 15, 20, 30].map((m) => (
                <button
                  key={m}
                  onClick={() => setAutoSaveInterval(m)}
                  className={`rounded px-2.5 py-1 font-mono text-[11px] font-bold transition-colors ${
                    autoSaveIntervalMinutes === m
                      ? 'bg-gold text-ink-900'
                      : 'bg-gold/10 text-gold hover:bg-gold/20'
                  }`}
                >
                  {m} 分钟
                </button>
              ))}
            </div>
          </div>

          {/* 显示模式：全屏 / 窗口 */}
          <div className="rounded-lg border-2 border-gold/30 bg-ink-900/50 p-4">
            <div className="mb-1 font-bold text-base text-gold">显示模式</div>
            <p className="mb-3 text-xs leading-relaxed text-parchment-200/60">
              切换全屏 / 窗口模式。全屏模式下右上角窗口控制按钮自动隐藏。下次启动将沿用此设置。
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFullscreen(true)}
                className={`flex-1 rounded border-2 px-3 py-2 font-serif text-xs font-bold transition-colors ${
                  fullscreen
                    ? 'border-gold bg-gold text-ink-900'
                    : 'border-gold/30 bg-ink-900/50 text-gold hover:bg-gold/10'
                }`}
              >
                ⛶ 全屏模式
              </button>
              <button
                onClick={() => setFullscreen(false)}
                className={`flex-1 rounded border-2 px-3 py-2 font-serif text-xs font-bold transition-colors ${
                  !fullscreen
                    ? 'border-gold bg-gold text-ink-900'
                    : 'border-gold/30 bg-ink-900/50 text-gold hover:bg-gold/10'
                }`}
              >
                ▢ 窗口模式
              </button>
            </div>
          </div>

          {/* 恢复默认 */}
          <div className="rounded-lg border-2 border-gold/30 bg-ink-900/50 p-4">
            <div className="mb-2 font-bold text-gold">恢复默认</div>
            <button
              onClick={resetSettings}
              className="rounded bg-gold/10 px-3 py-1.5 font-serif text-xs font-bold text-gold transition-colors hover:bg-gold/20"
            >
              恢复默认设置
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="btn-gold px-4 py-1.5 text-sm">
            完成
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/** 读取存档弹窗 */
interface LoadSaveDialogProps {
  onClose: () => void
  onLoad: (saveId: string) => void
  listSaves: () => Promise<SaveMeta[]>
  deleteSaveById: (saveId: string) => Promise<boolean>
}

function LoadSaveDialog({ onClose, onLoad, listSaves, deleteSaveById }: LoadSaveDialogProps) {
  const [saves, setSaves] = useState<SaveMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const list = await listSaves()
    setSaves(list)
    setLoading(false)
  }, [listSaves])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-ink-900/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="corner-frame relative w-[640px] max-w-[92vw] max-h-[80vh] overflow-hidden rounded-sm bg-ink-800 shadow-seal"
      >
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between border-b border-gold/30 bg-gradient-to-r from-ink-900 to-ink-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📂</span>
            <div>
              <h2 className="font-display text-xl font-semibold text-gold">读取存档</h2>
              <p className="font-mono text-[10px] text-parchment-200/60">Load Save · 共 {saves.length} 个存档</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-gold/10 px-3 py-1.5 font-mono text-xs font-bold text-gold transition-colors hover:bg-gold/20"
          >
            ✕ 关闭
          </button>
        </div>

        {/* 存档列表 */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center font-serif text-sm text-parchment-200/50">
              加载中...
            </div>
          ) : saves.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="text-6xl opacity-30">📭</div>
              <p className="font-serif text-lg text-parchment-200/60">暂无存档</p>
              <p className="font-mono text-xs text-parchment-200/40">开始新游戏后将自动创建存档</p>
            </div>
          ) : (
            <div className="space-y-2">
              {saves.map((save) => {
                const savedDate = new Date(save.savedAt)
                const formattedDate = `${savedDate.getFullYear()}-${String(savedDate.getMonth() + 1).padStart(2, '0')}-${String(savedDate.getDate()).padStart(2, '0')} ${String(savedDate.getHours()).padStart(2, '0')}:${String(savedDate.getMinutes()).padStart(2, '0')}`
                return (
                  <div
                    key={save.saveId}
                    className="rounded border border-gold/20 bg-ink-900/50 p-3 transition-colors hover:border-gold/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="font-serif text-sm font-bold text-parchment-100 truncate">
                            {save.saveName}
                          </div>
                          {save.isAuto && (
                            <span className="shrink-0 rounded-full bg-blue-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-blue-400">
                              自动
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-parchment-200/60">
                          {save.countryName ? `${save.countryName} · ` : ''}{save.pmName} · 第{save.term}届 · {save.year}年{save.month}月{save.day}日 · 执政{save.turn}月
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-parchment-200/50">
                          保存于 {formattedDate}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          onClick={() => onLoad(save.saveId)}
                          className="rounded bg-gold px-3 py-1 font-serif text-[11px] font-bold text-ink-900 transition-colors hover:bg-gold/80"
                        >
                          读取
                        </button>
                        {confirmDelete === save.saveId ? (
                          <div className="flex gap-1">
                            <button
                              onClick={async () => {
                                await deleteSaveById(save.saveId)
                                setConfirmDelete(null)
                                await refresh()
                              }}
                              className="flex-1 rounded bg-red-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white hover:bg-red-700"
                            >
                              确认
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="flex-1 rounded bg-ink-700 px-1.5 py-0.5 font-mono text-[9px] font-bold text-parchment-200 hover:bg-ink-600"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(save.saveId)}
                            className="rounded bg-red-900/40 px-3 py-0.5 font-mono text-[10px] font-bold text-red-400 transition-colors hover:bg-red-900/60"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 指标缩略 */}
                    {save.metrics && (
                      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-gold/10 pt-2">
                        {(Object.entries(save.metrics) as [string, number][]).map(([key, value]) => {
                          const labels: Record<string, string> = {
                            approval: '民意', treasury: '国库', economy: '经济',
                            stability: '稳定', diplomacy: '外交', prestige: '声望',
                          }
                          const color =
                            value >= 60 ? 'text-emerald-400' :
                            value >= 35 ? 'text-amber-400' :
                            'text-red-400'
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
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
