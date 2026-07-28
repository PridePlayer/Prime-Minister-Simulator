import type { MetricMeta, SecondaryMetricMeta, SecondaryMetrics, Metrics } from '@/types/game'

export const METRIC_META: MetricMeta[] = [
  { key: 'approval', label: '民意支持', icon: '🏛️', desc: '民众对您的信任与拥护程度' },
  { key: 'treasury', label: '国库储备', icon: '💰', desc: '国家财政的健康状况' },
  { key: 'economy', label: '经济指数', icon: '📈', desc: '宏观经济活力与增长' },
  { key: 'stability', label: '社会稳定', icon: '⚖️', desc: '社会秩序与治安水平' },
  { key: 'diplomacy', label: '外交关系', icon: '🤝', desc: '国际地位与盟友关系' },
  { key: 'prestige', label: '个人声望', icon: '🎖️', desc: '您在政坛的威望与影响力' },
]

export const SECONDARY_META: SecondaryMetricMeta[] = [
  // 民意
  { key: 'urbanSupport', parent: 'approval', label: '城市支持率', positive: true },
  { key: 'ruralSupport', parent: 'approval', label: '农村支持率', positive: true },
  { key: 'youthSupport', parent: 'approval', label: '青年支持率', positive: true },
  // 国库
  { key: 'fiscalSurplus', parent: 'treasury', label: '财政盈余', positive: true },
  { key: 'debtLevel', parent: 'treasury', label: '债务水平', positive: false },
  { key: 'forexReserves', parent: 'treasury', label: '外汇储备', positive: true },
  // 经济
  { key: 'industrialOutput', parent: 'economy', label: '工业产值', positive: true },
  { key: 'agriculturalOutput', parent: 'economy', label: '农业产值', positive: true },
  { key: 'employmentRate', parent: 'economy', label: '就业率', positive: true },
  { key: 'inflationRate', parent: 'economy', label: '通胀率', positive: false },
  // 稳定
  { key: 'crimeRate', parent: 'stability', label: '犯罪率', positive: false },
  { key: 'protestFrequency', parent: 'stability', label: '抗议频率', positive: false },
  { key: 'socialCohesion', parent: 'stability', label: '民族团结', positive: true },
  // 外交
  { key: 'majorPowerRelations', parent: 'diplomacy', label: '大国关系', positive: true },
  { key: 'neighborRelations', parent: 'diplomacy', label: '邻国关系', positive: true },
  { key: 'orgInfluence', parent: 'diplomacy', label: '国际组织影响力', positive: true },
  // 声望
  { key: 'politicalPrestige', parent: 'prestige', label: '政坛威望', positive: true },
  { key: 'mediaRating', parent: 'prestige', label: '媒体评价', positive: true },
  { key: 'historicalLegacy', parent: 'prestige', label: '历史定位', positive: true },
]

export const INITIAL_METRICS: Metrics = {
  approval: 60,
  treasury: 65,
  economy: 55,
  stability: 70,
  diplomacy: 50,
  prestige: 45,
}

/** 根据一级指标推导二级指标初始值 */
export function deriveSecondary(metrics: Metrics): SecondaryMetrics {
  return {
    urbanSupport: clamp2(metrics.approval + 5),
    ruralSupport: clamp2(metrics.approval - 5),
    youthSupport: clamp2(metrics.approval - 10),
    fiscalSurplus: clamp2(metrics.treasury - 20),
    debtLevel: clamp2(100 - metrics.treasury + 10),
    forexReserves: clamp2(metrics.treasury + 10),
    industrialOutput: clamp2(metrics.economy),
    agriculturalOutput: clamp2(metrics.economy - 5),
    employmentRate: clamp2(metrics.economy + 10),
    inflationRate: clamp2(110 - metrics.economy),
    crimeRate: clamp2(110 - metrics.stability),
    protestFrequency: clamp2(105 - metrics.stability),
    socialCohesion: clamp2(metrics.stability - 5),
    majorPowerRelations: clamp2(metrics.diplomacy),
    neighborRelations: clamp2(metrics.diplomacy + 5),
    orgInfluence: clamp2(metrics.diplomacy - 10),
    politicalPrestige: clamp2(metrics.prestige),
    mediaRating: clamp2(metrics.prestige - 5),
    historicalLegacy: clamp2(metrics.prestige - 15),
    // 环境污染：经济越发达污染越重，依赖对外环境治理对冲
    pollutionIndex: clamp2(80 - metrics.economy + (100 - metrics.stability) / 2),
  }
}

function clamp2(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)))
}

export function metricColor(value: number): string {
  if (value >= 70) return '#5a7d3a'
  if (value >= 40) return '#c9a961'
  if (value >= 20) return '#b5722a'
  return '#8b2635'
}

export function metricGrade(value: number): string {
  if (value >= 85) return '极佳'
  if (value >= 70) return '良好'
  if (value >= 50) return '平稳'
  if (value >= 30) return '堪忧'
  if (value >= 15) return '危险'
  return '崩溃'
}