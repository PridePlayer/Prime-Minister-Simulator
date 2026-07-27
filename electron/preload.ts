import { contextBridge, ipcRenderer } from 'electron'

/** 存档元信息 */
export interface SaveMeta {
  saveId: string
  fileName: string
  savedAt: string
  saveName: string
  pmName: string
  countryName?: string
  term: number
  turn: number
  year: number
  month: number
  day: number
  metrics: unknown | null
  fileSize: number
  /** 是否为自动存档 */
  isAuto: boolean
}

const api = {
  // 兼容旧版 API
  hasSave: () => ipcRenderer.invoke('save:has'),
  loadSave: () => ipcRenderer.invoke('save:load'),
  writeSave: (data: unknown, isAuto?: boolean) => ipcRenderer.invoke('save:write', data, isAuto),
  deleteSave: () => ipcRenderer.invoke('save:delete'),

  // 新增多存档 API
  listSaves: () => ipcRenderer.invoke('save:list') as Promise<SaveMeta[]>,
  loadSaveById: (saveId: string) => ipcRenderer.invoke('save:loadById', saveId),
  deleteSaveById: (saveId: string) => ipcRenderer.invoke('save:deleteById', saveId),
  renameSave: (saveId: string, newName: string) => ipcRenderer.invoke('save:rename', saveId, newName),

  // 诊断 API
  getSaveDir: () => ipcRenderer.invoke('save:getDir') as Promise<string>,
  openSaveDir: () => ipcRenderer.invoke('save:openDir') as Promise<boolean>,
  diagnose: () => ipcRenderer.invoke('save:diagnose') as Promise<{
    ok: boolean
    savesDir: string
    exists: boolean
    totalFiles: number
    saveFiles: number
    files: string[]
    error?: string
  }>,

  // 对话框 API
  confirmDialog: (message: string, title: string = '确认') =>
    ipcRenderer.invoke('dialog:confirm', message, title) as Promise<boolean>,

  // ============ 窗口控制 API（自绘标题栏使用） ============
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximizeToggle: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:isMaximized') as Promise<boolean>,
  /** 设置全屏模式（同时持久化偏好到 userData/settings.json） */
  windowSetFullScreen: (fullscreen: boolean) =>
    ipcRenderer.invoke('window:setFullScreen', fullscreen) as Promise<boolean>,
  /** 查询当前是否全屏 */
  windowIsFullScreen: () => ipcRenderer.invoke('window:isFullScreen') as Promise<boolean>,
  /** 订阅最大化状态变化（用于切换按钮图标） */
  onMaximizeChange: (cb: (maximized: boolean) => void) => {
    const handler = (_e: unknown, maximized: boolean) => cb(maximized)
    ipcRenderer.on('window:maximizeChanged', handler)
    return () => ipcRenderer.removeListener('window:maximizeChanged', handler)
  },
  /** 订阅全屏状态变化 */
  onFullScreenChange: (cb: (fullscreen: boolean) => void) => {
    const handler = (_e: unknown, fullscreen: boolean) => cb(fullscreen)
    ipcRenderer.on('window:fullScreenChanged', handler)
    return () => ipcRenderer.removeListener('window:fullScreenChanged', handler)
  },

  getVersion: () => '1.0.0',
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
