import { useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { SaveData, GameState, SaveMeta } from '@/types/game'
import { GAME_VERSION } from '@/lib/version'

/** 检查当前是否在 Electron 环境中（window.api 是否可用） */
function isElectronEnv(): boolean {
  return typeof window !== 'undefined' && !!window.api
}

/** 从 zustand store state 中剥离函数字段，只保留可序列化的 GameState 数据
 *  Electron IPC 走结构化克隆算法，函数无法被克隆，会报 "An object could not be cloned"
 */
function serializeGameState(state: unknown): GameState {
  // 用 JSON 序列化剥离函数/Symbol/undefined；GameState 中无 Date 等特殊对象
  return JSON.parse(JSON.stringify(state)) as GameState
}

/** 将错误对象转为可读字符串 */
function formatError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  try {
    return JSON.stringify(e)
  } catch {
    return String(e)
  }
}

/** 存档迁移函数：补齐 v0.2.1+ 新增字段，确保旧存档可平滑加载
 *  - 性格特质（pmTraitsNumeric）：旧存档可能缺失，由 loadGame 的 ?? 兜底
 *  - 行动力/连续负面事件（actionsThisTurn / consecutiveNegativeEvents）：同上
 *  - 突击新闻发布会/密室游说 minigame 状态：强制关闭，防止读档后卡在 minigame
 *  - 病休状态（healthEventActive）：旧存档无此字段，默认 false
 *  - 改革树深度扩展（L0~L4+）：数据结构未变，仅 requiresInitiative 链路扩展，无需迁移
 *  - v1.5 新增字段（metricHistory / warCommand / pendingChains / lastNpcProactiveCheckDay）：
 *    由 loadGame 的 ?? 兜底（[] / null / [] / 0），旧存档可平滑加载，下月起开始记录历史曲线
 *  - v0.3 新增字段（proposedParameterizedBills / npcMemories / eventCooldowns / currentStoryBeat）：
 *    显式兜底为 [] / [] / [] / null，让旧存档读取 v0.3 引入的"议员提案 / NPC 记忆 / 主动行动冷却 / 节令时序"
 *    字段时不会出现 undefined，下月起开始正常生成数据
 *
 *  本函数仅处理"会导致卡死或运行时错误"的字段；纯数据缺失由 gameStore.loadGame 的 ?? 兜底。
 */
function migrateGameState(raw: unknown): GameState {
  const s = (raw ?? {}) as Record<string, unknown>
  // 强制关闭所有 minigame 状态（读档后不应处于 minigame 中）
  s.pressConferenceOpen = false
  s.backroomLobbyOpen = false
  // 清除可能卡住的全屏弹窗（与 loadGame 保持一致）
  s.actionDialog = null
  s.showEventBasket = false
  s.activePendingEventId = null
  s.breakingNews = null
  s.currentCountdown = null
  s.activeCardEvent = null
  // 病休状态：旧存档无此字段时为 false（后续由 checkPMTraitEvent 根据健康值重新触发）
  if (s.healthEventActive === undefined) s.healthEventActive = false
  // 清除大选触发标志和快照（读档后不应处于大选阶段）
  delete (s as any).__triggerElection
  s.electionSnapshot = undefined
  // v0.3 显式兜底：议员提案 / NPC 记忆 / 主动行动冷却 / 节令时序叙事
  if (!Array.isArray(s.proposedParameterizedBills)) s.proposedParameterizedBills = []
  if (!Array.isArray(s.npcMemories)) s.npcMemories = []
  if (!Array.isArray(s.eventCooldowns)) s.eventCooldowns = []
  if (s.currentStoryBeat === undefined) s.currentStoryBeat = null
  if (s.lastStoryDay === undefined) s.lastStoryDay = 0
  // 确保 gamePhase 为 playing（防止存档时处于 election/coalition 等特殊阶段）
  s.gamePhase = 'playing'
  // 时间强制暂停（读档后由玩家手动恢复）
  s.timeSpeed = 0
  return s as unknown as GameState
}

/** 存档读写 hook（支持多槽位存档）
 *  所有方法均会返回明确的成功/失败信息，并在失败时通过 console.error 输出详细原因
 */
export function useSaveGame() {
  const loadGame = useGameStore((s) => s.loadGame)
  const setHasSave = useGameStore((s) => s.setHasSave)
  const goTo = useGameStore((s) => s.goTo)
  const setLastManualSaveAt = useSettingsStore((s) => s.setLastManualSaveAt)

  /** 检查是否有任意存档 */
  const checkSave = useCallback(async (): Promise<{ exists: boolean; error?: string }> => {
    if (!isElectronEnv()) {
      const msg = 'window.api 不存在（非 Electron 环境），存档功能不可用'
      console.error('[save] ' + msg)
      setHasSave(false)
      return { exists: false, error: msg }
    }
    try {
      const exists = await window.api.hasSave()
      setHasSave(exists)
      return { exists }
    } catch (e) {
      const msg = formatError(e)
      console.error('[save] checkSave 失败：', msg)
      setHasSave(false)
      return { exists: false, error: msg }
    }
  }, [setHasSave])

  /** 加载最新存档 */
  const loadSave = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!isElectronEnv()) {
      return { ok: false, error: '非 Electron 环境' }
    }
    try {
      const data = await window.api.loadSave()
      if (data?.gameState) {
        const migrated = migrateGameState(data.gameState)
        loadGame(migrated)
        setHasSave(true)
        goTo('game')  // 加载成功后自动进入游戏
        return { ok: true }
      }
      return { ok: false, error: '存档数据为空或格式无效' }
    } catch (e) {
      const msg = formatError(e)
      console.error('[save] loadSave 失败：', msg)
      return { ok: false, error: msg }
    }
  }, [loadGame, setHasSave, goTo])

  /** 加载指定 ID 的存档 */
  const loadSaveById = useCallback(async (saveId: string): Promise<{ ok: boolean; error?: string }> => {
    if (!isElectronEnv()) {
      return { ok: false, error: '非 Electron 环境' }
    }
    try {
      const data = await window.api.loadSaveById(saveId)
      if (data?.gameState) {
        // 版本兼容性检查：若存档版本与当前版本不一致，给出提示但仍尝试加载
        const saveVer = (data as { version?: string }).version
        if (saveVer && saveVer !== GAME_VERSION) {
          console.warn(`[save] 版本不匹配：存档 ${saveVer} vs 当前 ${GAME_VERSION}，将尝试加载并执行迁移`)
        }
        // 显式迁移：补齐 v0.2.1+ 新增字段，确保旧存档可平滑加载
        // 字段级兜底由 gameStore.loadGame 中的 ?? 处理，此处仅做 minigame 状态强制清零，
        // 防止"存档时 minigame 开启 → 读档后卡在 minigame"的问题
        const migrated = migrateGameState(data.gameState)
        loadGame(migrated)
        setHasSave(true)
        goTo('game')  // 加载成功后自动进入游戏
        return { ok: true }
      }
      return { ok: false, error: '存档数据为空或格式无效' }
    } catch (e) {
      const msg = formatError(e)
      console.error('[save] loadSaveById 失败：', msg)
      return { ok: false, error: msg }
    }
  }, [loadGame, setHasSave, goTo])

  /** 写入新存档（带自定义名称），返回存档 ID
   * @param isAuto 是否为自动存档（前缀 auto_，自动清理旧档，仅保留最近 5 个）
   */
  const writeSave = useCallback(
    async (
      gameState: GameState,
      saveName?: string,
      isAuto = false,
    ): Promise<{ ok: boolean; saveId?: string; error?: string }> => {
      if (!isElectronEnv()) {
        return { ok: false, error: '非 Electron 环境' }
      }
      try {
        // 关键：剥离 store 方法字段，否则 IPC 结构化克隆会失败
        const cleanState = serializeGameState(gameState)
        const nowIso = new Date().toISOString()
        const data: SaveData & { saveName?: string } = {
          version: GAME_VERSION,
          savedAt: nowIso,
          gameState: cleanState,
        }
        if (saveName) {
          data.saveName = saveName
        } else {
          // 默认存档名：总理名 + 日期
          data.saveName = `${cleanState.pmName} - ${cleanState.year}年${cleanState.month}月`
        }
        const saveId = await window.api.writeSave(data, isAuto)
        setHasSave(true)
        // 仅手动存档更新 lastManualSaveAt（自动存档不更新，便于区分）
        if (!isAuto) {
          setLastManualSaveAt(nowIso)
        }
        console.info('[save] 写入成功，saveId =', saveId)
        return { ok: true, saveId: saveId as string }
      } catch (e) {
        const msg = formatError(e)
        console.error('[save] writeSave 失败：', msg)
        return { ok: false, error: msg }
      }
    },
    [setHasSave, setLastManualSaveAt],
  )

  /** 列出所有存档 */
  const listSaves = useCallback(async (): Promise<{ saves: SaveMeta[]; error?: string }> => {
    if (!isElectronEnv()) {
      return { saves: [], error: '非 Electron 环境' }
    }
    try {
      const saves = await window.api.listSaves()
      return { saves }
    } catch (e) {
      const msg = formatError(e)
      console.error('[save] listSaves 失败：', msg)
      return { saves: [], error: msg }
    }
  }, [])

  /** 删除指定存档 */
  const deleteSaveById = useCallback(
    async (saveId: string): Promise<{ ok: boolean; error?: string }> => {
      if (!isElectronEnv()) {
        return { ok: false, error: '非 Electron 环境' }
      }
      try {
        const ok = await window.api.deleteSaveById(saveId)
        return { ok }
      } catch (e) {
        const msg = formatError(e)
        console.error('[save] deleteSaveById 失败：', msg)
        return { ok: false, error: msg }
      }
    },
    [],
  )

  /** 重命名存档 */
  const renameSave = useCallback(
    async (saveId: string, newName: string): Promise<{ ok: boolean; error?: string }> => {
      if (!isElectronEnv()) {
        return { ok: false, error: '非 Electron 环境' }
      }
      try {
        const ok = await window.api.renameSave(saveId, newName)
        return { ok }
      } catch (e) {
        const msg = formatError(e)
        console.error('[save] renameSave 失败：', msg)
        return { ok: false, error: msg }
      }
    },
    [],
  )

  /** 兼容旧版：删除最新存档 */
  const deleteSave = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!isElectronEnv()) {
      return { ok: false, error: '非 Electron 环境' }
    }
    try {
      await window.api.deleteSave()
      setHasSave(false)
      return { ok: true }
    } catch (e) {
      const msg = formatError(e)
      console.error('[save] deleteSave 失败：', msg)
      return { ok: false, error: msg }
    }
  }, [setHasSave])

  return {
    checkSave,
    loadSave,
    loadSaveById,
    writeSave,
    listSaves,
    deleteSaveById,
    renameSave,
    deleteSave,
    isElectronEnv,
  }
}
