import type { Metrics, MetricKey } from '@/types/game'

/** 将指标钳制在 0-100 */
export function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

/**
 * 判断某选项的效果预览是否应当显示。
 *  - 任何难度下：option.hideEffects === true 时永远隐藏（纯盲选，如道德困境、未知后果的冒险）
 *  - 普通难度：默认显示，除非显式 hideEffects
 *  - 困难难度：默认隐藏模糊选项（tone 为 undefined 或 'neutral'），
 *              仅当 alwaysShowEffects 为 true 或 tone 为明确的 positive/negative 时显示
 */
export function shouldShowOptionEffects(
  option: { hideEffects?: boolean; alwaysShowEffects?: boolean; tone?: string },
  difficulty: 'normal' | 'hard',
): boolean {
  if (option.hideEffects === true) return false
  if (difficulty === 'normal') return true
  // 困难模式
  if (option.alwaysShowEffects === true) return true
  // 困难模式仅对明确倾向（positive/negative）的选项显示效果，模糊选项盲选
  return option.tone === 'positive' || option.tone === 'negative'
}

/** 难度对单项数值的缩放：
 *  - normal：原值不变
 *  - hard：正值（加成）打 7 折且向下取整，负值（扣分）放大 30% 且向下取整（更负）
 *  0 值不受影响。这样困难模式下玩家「赚得少、亏得多」。
 */
export function scaleEffectValue(value: number, difficulty: 'normal' | 'hard'): number {
  if (difficulty === 'normal' || value === 0) return value
  if (value > 0) return Math.floor(value * 0.7)
  return Math.floor(value * 1.3)
}

/** 返回难度缩放后的效果对象（不应用到指标，仅用于结果展示） */
export function getScaledEffects(
  effects: Partial<Metrics>,
  difficulty: 'normal' | 'hard',
): Partial<Metrics> {
  if (difficulty === 'normal') return { ...effects }
  const result: Partial<Metrics> = {}
  for (const key of Object.keys(effects) as MetricKey[]) {
    result[key] = scaleEffectValue(effects[key] ?? 0, difficulty)
  }
  return result
}

/** 应用一组效果到指标上（可选难度缩放） */
export function applyEffects(
  metrics: Metrics,
  effects: Partial<Metrics>,
  difficulty?: 'normal' | 'hard',
): Metrics {
  const next: Metrics = { ...metrics }
  for (const key of Object.keys(effects) as MetricKey[]) {
    const raw = effects[key] ?? 0
    const scaled = difficulty ? scaleEffectValue(raw, difficulty) : raw
    next[key] = clamp(next[key] + scaled)
  }
  return next
}

/** 每回合自然衰减：国库 -1，其余向 50 缓慢回归（±1） */
export function naturalDecay(metrics: Metrics): Metrics {
  const next: Metrics = { ...metrics }
  next.treasury = clamp(next.treasury - 1)
  const keys: MetricKey[] = ['approval', 'economy', 'stability', 'diplomacy', 'prestige']
  for (const k of keys) {
    if (next[k] > 50) next[k] = clamp(next[k] - 1)
    else if (next[k] < 50) next[k] = clamp(next[k] + 1)
  }
  return next
}

/** 综合指标均值 */
export function average(metrics: Metrics): number {
  const vals = Object.values(metrics)
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

/** 是否所有指标 ≥ 阈值 */
export function allAbove(metrics: Metrics, threshold: number): boolean {
  return (Object.values(metrics) as number[]).every((v) => v >= threshold)
}
