import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync, mkdirSync, renameSync, statSync } from 'fs'
import net from 'net'

/** 检查 dev server 是否在运行 */
function isPortActive(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(800)
    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => resolve(false))
    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.connect(port, 'localhost')
  })
}

async function createWindow() {
  // 窗口/任务栏图标：Windows 用 .ico（原生格式，任务栏最可靠），其他平台用 .png
  // 开发环境从 src/icon/ 读取，打包后从 resources/icon/ 读取
  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'icon', iconFile)
    : join(__dirname, '../src/icon', iconFile)

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#2a1810',
    title: '宰执春秋',
    icon: existsSync(iconPath) ? iconPath : undefined,
    frame: false, // 自绘标题栏：去掉 Windows 系统栏
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.once('ready-to-show', () => {
    // 默认全屏启动（用户可在设置中切换为窗口模式）
    // 从 userData/settings.json 读取 fullscreen 偏好（默认 true）
    try {
      const settingsPath = join(app.getPath('userData'), 'settings.json')
      const raw = existsSync(settingsPath) ? readFileSync(settingsPath, 'utf-8') : '{}'
      const parsed = JSON.parse(raw || '{}')
      const wantFullscreen = parsed.fullscreen !== false // 默认 true
      if (wantFullscreen) win.setFullScreen(true)
    } catch {
      // 读取失败时默认全屏
      win.setFullScreen(true)
    }
    win.show()
  })

  // 检查 Vite dev server 是否在运行
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  const devActive = rendererUrl ? true : await isPortActive(5173)

  if (devActive) {
    win.loadURL(rendererUrl || 'http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }
}

// ============ 存档系统 ============
// 存档目录统一使用 userData/saves（开发与生产环境一致）
// 这样可避免打包后因 ASAR 文件系统只读导致写入失败
const savesDir = join(app.getPath('userData'), 'saves')

// 确保存档目录存在
function ensureSavesDir() {
  try {
    if (!existsSync(savesDir)) {
      mkdirSync(savesDir, { recursive: true })
      console.log('[save] 创建存档目录：', savesDir)
    }
  } catch (e) {
    console.error('[save] 创建存档目录失败：', e)
  }
}

// 应用启动时立即确保目录存在
ensureSavesDir()

// 兼容旧版单存档路径
const legacySavePath = join(app.getPath('userData'), 'save.json')

/** 自动存档最大保留数量 */
const MAX_AUTO_SAVES = 5

/** 生成存档文件名（基于时间戳）
 * @param isAuto 是否为自动存档（前缀区分）
 */
function generateSaveFileName(isAuto = false): string {
  const now = new Date()
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  return `${isAuto ? 'auto_' : 'save_'}${ts}.json`
}

/** 检查是否有任意存档（兼容旧版） */
ipcMain.handle('save:has', () => {
  ensureSavesDir()
  // 检查新版多槽位存档（含手动 save_ 和自动 auto_）
  const files = readdirSync(savesDir).filter((f) =>
    (f.startsWith('save_') || f.startsWith('auto_')) && f.endsWith('.json'))
  if (files.length > 0) return true
  // 检查旧版单存档
  return existsSync(legacySavePath)
})

/** 读取最新的存档（兼容旧版，优先手动存档） */
ipcMain.handle('save:load', () => {
  ensureSavesDir()
  try {
    const allFiles = readdirSync(savesDir).filter((f) =>
      (f.startsWith('save_') || f.startsWith('auto_')) && f.endsWith('.json'))
    if (allFiles.length > 0) {
      // 按修改时间排序，取最新（手动存档优先于自动存档）
      const sorted = allFiles
        .map((f) => ({
          name: f,
          path: join(savesDir, f),
          mtime: existsSync(join(savesDir, f)) ? statSync(join(savesDir, f)).mtime : new Date(0),
          isAuto: f.startsWith('auto_'),
        }))
        .sort((a, b) => {
          // 同一秒内手动存档优先
          const diff = b.mtime.getTime() - a.mtime.getTime()
          if (Math.abs(diff) < 5000) return a.isAuto ? 1 : -1
          return diff
        })
      if (sorted.length > 0) {
        return JSON.parse(readFileSync(sorted[0].path, 'utf-8'))
      }
    }
    // 兼容旧版
    if (existsSync(legacySavePath)) {
      return JSON.parse(readFileSync(legacySavePath, 'utf-8'))
    }
    return null
  } catch {
    return null
  }
})

/** 写入新存档（多槽位），返回存档 ID
 * @param data 存档数据
 * @param isAuto 是否为自动存档（前缀 auto_，保留最近 N 个）
 */
ipcMain.handle('save:write', (_e, data, isAuto = false) => {
  ensureSavesDir()
  const fileName = generateSaveFileName(!!isAuto)
  const filePath = join(savesDir, fileName)
  // 注入存档元信息
  const saveData = {
    ...data,
    saveId: fileName.replace('.json', ''),
    savedAt: new Date().toISOString(),
    isAuto: !!isAuto,
  }
  writeFileSync(filePath, JSON.stringify(saveData, null, 2))

  // 自动存档：清理旧的，仅保留最近 MAX_AUTO_SAVES 个
  if (isAuto) {
    try {
      const autoFiles = readdirSync(savesDir)
        .filter((f) => f.startsWith('auto_') && f.endsWith('.json'))
        .map((f) => ({ name: f, path: join(savesDir, f), mtime: statSync(join(savesDir, f)).mtime }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      // 删除超出上限的旧自动存档
      for (const old of autoFiles.slice(MAX_AUTO_SAVES)) {
        try { unlinkSync(old.path) } catch { /* 忽略 */ }
      }
    } catch { /* 忽略清理错误 */ }
  }

  return saveData.saveId
})

/** 删除最新存档（兼容旧版，仅删手动存档） */
ipcMain.handle('save:delete', () => {
  ensureSavesDir()
  const files = readdirSync(savesDir).filter((f) => f.startsWith('save_') && f.endsWith('.json'))
  if (files.length > 0) {
    // 按修改时间排序，删除最新
    const sorted = files
      .map((f) => ({ name: f, path: join(savesDir, f), mtime: statSync(join(savesDir, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
    if (sorted.length > 0) {
      unlinkSync(sorted[0].path)
    }
  }
  // 兼容旧版
  if (existsSync(legacySavePath)) {
    unlinkSync(legacySavePath)
  }
})

// ============ 新增多存档 API ============

/** 列出所有存档（含自动存档） */
ipcMain.handle('save:list', () => {
  ensureSavesDir()
  try {
    const files = readdirSync(savesDir).filter((f) =>
      (f.startsWith('save_') || f.startsWith('auto_')) && f.endsWith('.json'))
    const saves = files.map((f) => {
      const filePath = join(savesDir, f)
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'))
        const stat = statSync(filePath)
        const isAuto = f.startsWith('auto_')
        // 自动存档名称加前缀标识
        const baseName = data.saveName ||
          (data.gameState?.pmName
            ? `${data.gameState.pmName} - ${data.savedAt?.slice(0, 10) || '未知'}`
            : '未命名存档')
        return {
          saveId: f.replace('.json', ''),
          fileName: f,
          savedAt: data.savedAt || stat.mtime.toISOString(),
          saveName: isAuto ? `[自动] ${baseName}` : baseName,
          pmName: data.gameState?.pmName || '总理',
          countryName: data.gameState?.countryName || '埃尔瓦尼亚共和国',
          term: data.gameState?.term || 1,
          turn: data.gameState?.turn || 1,
          year: data.gameState?.year || 2026,
          month: data.gameState?.month || 1,
          day: data.gameState?.day || 1,
          metrics: data.gameState?.metrics || null,
          fileSize: stat.size,
          isAuto,
        }
      } catch {
        return null
      }
    }).filter(Boolean)
    // 按时间倒序
    saves.sort((a: any, b: any) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    return saves
  } catch {
    return []
  }
})

/** 读取指定 ID 的存档 */
ipcMain.handle('save:loadById', (_e, saveId: string) => {
  ensureSavesDir()
  try {
    const filePath = join(savesDir, `${saveId}.json`)
    if (!existsSync(filePath)) return null
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
})

/** 删除指定 ID 的存档 */
ipcMain.handle('save:deleteById', (_e, saveId: string) => {
  ensureSavesDir()
  try {
    const filePath = join(savesDir, `${saveId}.json`)
    if (existsSync(filePath)) {
      unlinkSync(filePath)
      return true
    }
    return false
  } catch {
    return false
  }
})

/** 重命名存档 */
ipcMain.handle('save:rename', (_e, saveId: string, newName: string) => {
  ensureSavesDir()
  try {
    const filePath = join(savesDir, `${saveId}.json`)
    if (!existsSync(filePath)) return false
    const data = JSON.parse(readFileSync(filePath, 'utf-8'))
    data.saveName = newName
    writeFileSync(filePath, JSON.stringify(data, null, 2))
    return true
  } catch {
    return false
  }
})

/** 显示确认对话框 */
ipcMain.handle('dialog:confirm', (_e, message: string, title: string) => {
  const result = dialog.showMessageBoxSync({
    type: 'question',
    buttons: ['确认', '取消'],
    defaultId: 1,
    title,
    message,
  })
  return result === 0
})

/** 显示输入对话框 */
ipcMain.handle('dialog:prompt', async (_e, message: string, defaultValue: string, title: string) => {
  const result = await dialog.showMessageBox({
    type: 'question',
    buttons: ['确定', '取消'],
    defaultId: 0,
    title,
    message,
  })
  // Electron 没有原生输入框，这里返回默认值（前端会用自定义 UI 实现）
  return result.response === 0 ? defaultValue : null
})

/** 获取存档目录路径（前端可显示，方便用户定位存档文件） */
ipcMain.handle('save:getDir', () => {
  ensureSavesDir()
  return savesDir
})

/** 在系统资源管理器中打开存档目录 */
ipcMain.handle('save:openDir', () => {
  ensureSavesDir()
  const { shell } = require('electron')
  shell.openPath(savesDir)
  return true
})

/** 诊断存档系统：返回目录路径、是否存在、文件数量 */
ipcMain.handle('save:diagnose', () => {
  try {
    ensureSavesDir()
    const exists = existsSync(savesDir)
    const files = exists ? readdirSync(savesDir) : []
    const saveFiles = files.filter((f) =>
      (f.startsWith('save_') || f.startsWith('auto_')) && f.endsWith('.json'))
    return {
      ok: true,
      savesDir,
      exists,
      totalFiles: files.length,
      saveFiles: saveFiles.length,
      files: saveFiles,
    }
  } catch (e) {
    return { ok: false, savesDir, error: e instanceof Error ? e.message : String(e) }
  }
})

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// ============ 窗口控制 IPC（自绘标题栏使用） ============
// 通过 sender 反查窗口实例，支持多窗口；handler 只注册一次。
ipcMain.handle('window:minimize', (e) => {
  BrowserWindow.fromWebContents(e.sender)?.minimize()
})
ipcMain.handle('window:maximize', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender)
  if (!w) return
  if (w.isMaximized()) w.unmaximize()
  else w.maximize()
})
ipcMain.handle('window:close', (e) => {
  BrowserWindow.fromWebContents(e.sender)?.close()
})
ipcMain.handle('window:isMaximized', (e) => {
  return BrowserWindow.fromWebContents(e.sender)?.isMaximized() ?? false
})
// 全屏模式：切换并持久化到 userData/settings.json
ipcMain.handle('window:setFullScreen', (e, fullscreen: boolean) => {
  const w = BrowserWindow.fromWebContents(e.sender)
  if (!w) return false
  w.setFullScreen(!!fullscreen)
  // 持久化偏好
  try {
    const settingsPath = join(app.getPath('userData'), 'settings.json')
    const raw = existsSync(settingsPath) ? readFileSync(settingsPath, 'utf-8') : '{}'
    const parsed = JSON.parse(raw || '{}')
    parsed.fullscreen = !!fullscreen
    writeFileSync(settingsPath, JSON.stringify(parsed, null, 2))
  } catch (err) {
    console.error('[settings] 持久化 fullscreen 失败：', err)
  }
  return true
})
ipcMain.handle('window:isFullScreen', (e) => {
  return BrowserWindow.fromWebContents(e.sender)?.isFullScreen() ?? false
})
// 窗口状态变化通知（用于前端按钮图标切换）
app.on('browser-window-created', (_e, win) => {
  win.on('maximize', () => win.webContents.send('window:maximizeChanged', true))
  win.on('unmaximize', () => win.webContents.send('window:maximizeChanged', false))
  win.on('enter-full-screen', () => win.webContents.send('window:fullScreenChanged', true))
  win.on('leave-full-screen', () => win.webContents.send('window:fullScreenChanged', false))
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
