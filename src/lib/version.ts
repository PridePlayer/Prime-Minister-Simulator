/**
 * 游戏版本号集中管理
 *
 * 通过 Vite 的 ?json 导入能力读取 package.json 的 version 字段，
 * 避免在多处硬编码版本号导致不一致。
 *
 * 用法：import { GAME_VERSION } from '@/lib/version'
 */
import pkg from '../../package.json'

/** 当前游戏版本号，与 package.json 保持一致 */
export const GAME_VERSION: string = pkg.version

/** 版本号元信息（用于"关于"页面展示） */
export const VERSION_META: { version: string; codename: string; releasedAt: string } = {
  version: GAME_VERSION,
  /** 版本代号（可选，便于口头传播） */
  codename: '大选之年',
  /** 本版本发布日期（ISO） */
  releasedAt: '2026-07-27',
}
