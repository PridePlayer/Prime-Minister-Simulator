import { create } from 'zustand'

/** 用户设置（独立于存档，localStorage 持久化；fullscreen 由 Electron 主进程在 userData/settings.json 持久化） */
export interface GameSettings {
  /** 自动保存周期（分钟），默认 15 */
  autoSaveIntervalMinutes: number
  /** 是否全屏模式（默认 true，仅 Electron 环境生效） */
  fullscreen: boolean
  /** 是否已完成新手教程（完成后再开新游戏不再自动弹出） */
  tutorialCompleted: boolean
  /** 最近一次手动存档的时间戳（ISO），用于在 UI 上显示"上次存档"提示 */
  lastManualSaveAt: string | null
}

/** 教程手动触发信号（非持久化，仅在会话内有效）
 *  通过递增计数器通知 Tutorial 组件立即打开教程。
 *  使用计数器而非布尔值，便于反复触发（每次自增都会让 useEffect 捕获到变化）。
 */
interface TutorialTriggerState {
  /** 触发计数：每次调用 triggerTutorial() 自增，Tutorial 监听此值变化即重新打开 */
  tutorialOpenSignal: number
}

const STORAGE_KEY = 'zzcq_settings'

const DEFAULT_SETTINGS: GameSettings = {
  autoSaveIntervalMinutes: 15,
  fullscreen: true,
  tutorialCompleted: false,
  lastManualSaveAt: null,
}

function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return {
      autoSaveIntervalMinutes:
        typeof parsed.autoSaveIntervalMinutes === 'number'
          ? Math.max(1, Math.min(60, parsed.autoSaveIntervalMinutes))
          : DEFAULT_SETTINGS.autoSaveIntervalMinutes,
      fullscreen:
        typeof parsed.fullscreen === 'boolean' ? parsed.fullscreen : DEFAULT_SETTINGS.fullscreen,
      tutorialCompleted:
        typeof parsed.tutorialCompleted === 'boolean' ? parsed.tutorialCompleted : DEFAULT_SETTINGS.tutorialCompleted,
      lastManualSaveAt:
        typeof parsed.lastManualSaveAt === 'string' ? parsed.lastManualSaveAt : DEFAULT_SETTINGS.lastManualSaveAt,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function persistSettings(settings: GameSettings) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('[settings] 保存设置失败：', e)
  }
}

interface SettingsStore extends GameSettings, TutorialTriggerState {
  /** 设置自动保存周期（分钟），范围 1-60 */
  setAutoSaveInterval: (minutes: number) => void
  /** 切换全屏模式（同步调用 Electron API 并持久化偏好） */
  setFullscreen: (fullscreen: boolean) => void
  /** 从 Electron 主进程同步当前全屏状态（用于订阅窗口状态变化） */
  syncFullscreenFromWindow: () => void
  /** 标记新手教程已完成 */
  setTutorialCompleted: (done: boolean) => void
  /** 立即触发新手教程（无论是否已完成）。
   *  通过自增 tutorialOpenSignal 计数器通知 Tutorial 组件重新打开 */
  triggerTutorial: () => void
  /** 记录最近一次手动存档时间（由 useSaveGame.writeSave 调用） */
  setLastManualSaveAt: (iso: string) => void
  /** 恢复默认设置 */
  resetSettings: () => void
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...loadSettings(),
  // 非持久化字段：每次刷新页面后从 0 开始
  tutorialOpenSignal: 0,
  setAutoSaveInterval: (minutes) => {
    const clamped = Math.max(1, Math.min(60, Math.round(minutes)))
    set({ autoSaveIntervalMinutes: clamped })
    persistSettings({ ...get(), autoSaveIntervalMinutes: clamped })
  },
  setFullscreen: (fullscreen) => {
    // 调用 Electron API 立即生效并持久化到 userData/settings.json
    if (typeof window !== 'undefined' && window.api?.windowSetFullScreen) {
      window.api.windowSetFullScreen(fullscreen).catch((e) =>
        console.error('[settings] 切换全屏失败：', e),
      )
    }
    set({ fullscreen })
    persistSettings({ ...get(), fullscreen })
  },
  syncFullscreenFromWindow: () => {
    if (typeof window === 'undefined' || !window.api?.windowIsFullScreen) return
    window.api.windowIsFullScreen().then((fs) => {
      set({ fullscreen: fs })
      persistSettings({ ...get(), fullscreen: fs })
    }).catch(() => {})
  },
  setTutorialCompleted: (done) => {
    set({ tutorialCompleted: done })
    persistSettings({ ...get(), tutorialCompleted: done })
  },
  triggerTutorial: () => {
    // 自增信号量；不修改 tutorialCompleted，让用户在重看后再次标记完成
    set((s) => ({ tutorialOpenSignal: s.tutorialOpenSignal + 1 }))
  },
  setLastManualSaveAt: (iso) => {
    set({ lastManualSaveAt: iso })
    persistSettings({ ...get(), lastManualSaveAt: iso })
  },
  resetSettings: () => {
    const next = { ...DEFAULT_SETTINGS }
    set(next)
    persistSettings(next)
    // 同时把全屏偏好同步到主进程
    if (typeof window !== 'undefined' && window.api?.windowSetFullScreen) {
      window.api.windowSetFullScreen(next.fullscreen).catch(() => {})
    }
  },
}))
