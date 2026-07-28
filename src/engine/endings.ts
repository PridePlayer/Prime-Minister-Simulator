import type { GameState, EndingGrade, Metrics } from '@/types/game'
import { average } from './metrics'

/** 每任期 48 个月 */
export const TERM_LENGTH = 48

export interface EndingCheck {
  ended: boolean
  reason?: string
  reelected?: boolean
}

/**
 * v1.5 重做失败线：从"直接闷到 15 下台"改为"滑坡式逼宫链"。
 *  - approval < 35：触发"党内元老最后通牒"紧急事件（emergencies.ts，可恢复）
 *  - approval < 25：触发"议会不信任投票"紧急事件（可恢复）
 *  - approval < 20：触发"百万人走上街头"紧急事件（可恢复）
 *  - approval < 10：硬失败，强制下台（最终底线）
 *  - treasury < 5 且 economy < 20：硬失败，财政崩溃
 *  - stability < 10：硬失败，社会崩溃
 * 玩家在中段（35→10）有多次机会挽回，而非直接判死。
 */
export function checkEarlyEnd(state: GameState): EndingCheck {
  const m = state.metrics
  if (m.approval < 10) {
    return { ended: true, reason: '民意支持率跌破 10%，议会通过不信任投票，军方拒绝支持您的政府，您被迫下台。' }
  }
  if (m.treasury < 5 && m.economy < 20) {
    return { ended: true, reason: '国库枯竭、经济崩溃，国家陷入主权债务危机，您的政府随之倒台。' }
  }
  if (m.stability < 10) {
    return { ended: true, reason: '社会动荡失控，大规模骚乱迫使您宣布辞职。' }
  }
  return { ended: false }
}

/** 检查任期届满大选 */
export function checkElection(state: GameState): EndingCheck {
  if (state.turn % TERM_LENGTH !== 0) return { ended: false }
  const m = state.metrics
  const avg = average(m)
  if (avg >= 50 && m.approval >= 40) {
    return { ended: false, reelected: true }
  }
  return {
    ended: true,
    reason: `任期届满，大选中您因民意不足（支持率 ${m.approval}）落败，让位于反对党领袖。`,
  }
}

/** 计算结局评级 */
export function calcGrade(metrics: Metrics): EndingGrade {
  const avg = average(metrics)
  if (avg >= 85) return 'S'
  if (avg >= 70) return 'A'
  if (avg >= 55) return 'B'
  if (avg >= 40) return 'C'
  return 'D'
}

/** 评级对应的叙事文本 */
export function gradeNarrative(grade: EndingGrade, term: number, countryName?: string): string {
  const country = countryName || '共和国'
  const narratives: Record<EndingGrade, string> = {
    S: `您以卓越的治国才能，将${country}推向鼎盛。历史学家将您的${term}届任期誉为「黄金时代」，您的名字被镌刻在国家纪念馆最显眼的位置，后世领袖皆以您为楷模。`,
    A: `您是一位令人铭记的优秀总理。${term}届任期内，${country}蒸蒸日上，人民安居乐业。您的改革遗产影响深远，离任时仍享有崇高威望。`,
    B: `您是一位称职的总理。${term}届任期内，${country}平稳前行，虽有波折但总体向好。民众对您评价中肯，认为您尽到了职责。`,
    C: `您的执政表现平平。${term}届任期内，${country}在起伏中艰难前行，留下的政绩褒贬不一。历史对您的评价将是「平庸但尚可」。`,
    D: `您未能担起总理重任。${term}届任期内${country}每况愈下，民众失望透顶。您的名字逐渐被遗忘在历史的尘埃里，成为后人警示的反例。`,
  }
  return narratives[grade]
}
