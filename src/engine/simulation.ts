import type { GameState, MacroEconomy, Metrics, NewsItem, PersonalLife, SecondaryMetrics, AttributionEntry, Region, LocalGovernor } from '@/types/game'
import { clamp } from '@/engine/metrics'
import { computeMilitaryStrength } from '@/data/military'

/**
 * 宏观模拟引擎 —— 系统间传导链的核心
 *
 * 每月结算一次，让各系统真正"咬合"：
 *   税率 → GDP 增长 → 税收 → 国库
 *   GDP 增长 ↔ 失业率 → 抗议频率 → 社会稳定 → 民意
 *   贸易协定/制裁/战争 → GDP 与通胀
 *   军费占GDP% → 国库支出 → 军队战备/装备/士气 → 真实军力 → 战争胜负
 *   兵役法律 → 陆军兵员
 *   个人生活：压力→健康，家庭关系→民意，黑金腐败→丑闻爆发
 */

export const INITIAL_MACRO: MacroEconomy = {
  gdp: 1000, // 十亿
  gdpGrowth: 2.0,
  unemployment: 6.5,
  lastTaxIncome: 0,
  lastMilitarySpending: 0,
}

export const INITIAL_PERSONAL_LIFE: PersonalLife = {
  familyRelation: 70,
  corruption: 5,
  stress: 30,
  spouseName: '苏婉',
}

/** 税率档位的宏观参数 */
const TAX_PARAMS: Record<GameState['taxRate'], { growthDrag: number; revenueShare: number }> = {
  low: { growthDrag: 0.8, revenueShare: 0.18 },
  medium: { growthDrag: 0, revenueShare: 0.25 },
  high: { growthDrag: -0.6, revenueShare: 0.33 },
  very_high: { growthDrag: -1.5, revenueShare: 0.42 },
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

/**
 * 月度宏观模拟：输入当前状态，返回更新了 macro/metrics/secondary/military/personalLife 的新状态片段
 * 在 advanceMonth 的末尾调用（此时改革/政策/内阁等效果已应用完毕）
 */
export function runMonthlySimulation(state: GameState): {
  macro: MacroEconomy
  metrics: Metrics
  secondary: SecondaryMetrics
  military: GameState['military']
  personalLife: PersonalLife
  extraNews: NewsItem[]
} {
  const metrics = { ...state.metrics }
  const secondary = { ...state.secondary }
  const macro = { ...state.macro }
  const military = {
    ...state.military,
    branches: {
      army: { ...state.military.branches.army },
      navy: { ...state.military.branches.navy },
      airForce: { ...state.military.branches.airForce },
    },
    generals: state.military.generals.map((g) => ({ ...g })),
  }
  const personalLife = { ...state.personalLife }
  const extraNews: NewsItem[] = []

  const atWar = !!state.activeWar && !state.activeWar.ended
  const tradeDeals = state.countries.filter((c) => c.tradeAgreement).length
  const sanctionsByUs = state.countries.filter((c) => c.sanctioned).length
  const tax = TAX_PARAMS[state.taxRate]

  // ---------- 1. GDP 增长 ----------
  let growth =
    (metrics.economy - 50) * 0.12 + // 经济指数主驱动
    tradeDeals * 0.4 - // 每个贸易协定 +0.4%
    sanctionsByUs * 0.25 + // 制裁别国也伤自己
    (metrics.stability - 50) * 0.04 + // 稳定护航
    (secondary.industrialOutput - 50) * 0.03 +
    tax.growthDrag -
    (atWar ? 3.5 : 0)
  growth = Math.max(-8, Math.min(8, round1(growth)))
  macro.gdpGrowth = growth
  macro.gdp = Math.max(400, round1(macro.gdp * (1 + growth / 100 / 12)))

  // ---------- 2. 失业率 ----------
  const conscription = state.activeLaws['military_service'] === 'conscription'
  const totalMob = state.activeLaws['military_service'] === 'total_mobilization'
  let uTarget =
    6.5 -
    growth * 0.9 + // 增长降失业
    Math.max(0, 50 - secondary.industrialOutput) * 0.06 -
    (atWar ? 1.2 : 0) -
    (conscription ? 0.8 : 0) -
    (totalMob ? 1.5 : 0)
  uTarget = Math.max(2.5, Math.min(30, uTarget))
  macro.unemployment = round1(macro.unemployment + (uTarget - macro.unemployment) * 0.25)

  // ---------- 3. 通胀（写入二级指标 inflationRate，0-100 标尺，50 ≈ 温和） ----------
  let infTarget =
    50 -
    growth * 1.5 + // 负增长→通缩，过热→通胀
    (state.taxRate === 'very_high' ? 4 : 0) +
    (atWar ? 8 : 0) +
    (metrics.treasury > 80 ? 3 : 0) +
    (totalMob ? 5 : 0)
  const newInflation = clamp(secondary.inflationRate + (clamp(infTarget) - secondary.inflationRate) * 0.15)
  secondary.inflationRate = Math.round(newInflation)

  // ---------- 4. 税收（GDP 驱动，替换展示值；指标点增量在 advanceMonth 已有，这里做 GDP 加成） ----------
  const monthlyRevenueAbs = (macro.gdp * tax.revenueShare) / 12 // 十亿/月，用于展示
  macro.lastTaxIncome = round1(monthlyRevenueAbs * 10) / 10
  // GDP 相对基准 1000 的增减转化为国库指标点的微调
  const gdpTreasuryBonus = Math.max(-3, Math.min(4, (macro.gdp - 1000) / 250))
  metrics.treasury = clamp(metrics.treasury + gdpTreasuryBonus)

  // ---------- 5. 军费开支与军队维持 ----------
  const milSpendingAbs = (macro.gdp * military.defenseBudget) / 100 / 12
  macro.lastMilitarySpending = round1(milSpendingAbs * 10) / 10
  // 军费的指标点成本（0.8%→约0.5点，6%→约3.6点/月）
  const milCost = military.defenseBudget * 0.6
  metrics.treasury = clamp(metrics.treasury - milCost)

  // 军费 → 战备/装备/士气 目标值
  const budget = military.defenseBudget
  const readinessTarget = clamp(30 + budget * 9)
  const equipDrift = budget >= 3 ? 0.4 : budget >= 2 ? 0.1 : budget < 1.5 ? -0.5 : -0.2
  const warScoreBonus = state.activeWar ? (state.activeWar.warScore > 10 ? 12 : state.activeWar.warScore < -10 ? -15 : 0) : 0
  const moraleTarget = clamp(metrics.stability * 0.55 + metrics.approval * 0.25 + warScoreBonus + (atWar ? 5 : 15))
  for (const key of ['army', 'navy', 'airForce'] as const) {
    const br = military.branches[key]
    br.readiness = clamp(br.readiness + (readinessTarget - br.readiness) * 0.2)
    br.equipment = clamp(br.equipment + equipDrift)
    br.morale = clamp(br.morale + (moraleTarget - br.morale) * 0.15)
  }
  // 兵役法律 → 陆军兵员
  if (conscription) {
    military.branches.army.personnel = Math.min(80, round1(military.branches.army.personnel + 1.5))
  } else if (totalMob) {
    military.branches.army.personnel = Math.min(120, round1(military.branches.army.personnel + 3))
  } else if (budget < 1.5) {
    military.branches.army.personnel = Math.max(20, round1(military.branches.army.personnel - 0.5))
  }
  // 将领忠诚度漂移：向稳定值缓慢回归；战争失败加深不满
  for (const g of military.generals) {
    if (!g.active) continue
    const driftTarget = 55 + metrics.stability * 0.2 + (atWar ? (warScoreBonus > 0 ? 15 : warScoreBonus < 0 ? -15 : 0) : 5)
    g.loyalty = clamp(g.loyalty + (clamp(driftTarget) - g.loyalty) * 0.05)
  }

  // ---------- 6. 跨系统传导（宏观 → 指标） ----------
  // 高失业 → 抗议与犯罪 → 稳定与民意
  if (macro.unemployment > 14) {
    metrics.stability = clamp(metrics.stability - 2)
    metrics.approval = clamp(metrics.approval - 1)
    secondary.protestFrequency = clamp(secondary.protestFrequency + 2)
    secondary.crimeRate = clamp(secondary.crimeRate + 1)
  } else if (macro.unemployment > 10) {
    metrics.stability = clamp(metrics.stability - 1)
    secondary.protestFrequency = clamp(secondary.protestFrequency + 1)
  } else if (macro.unemployment < 5) {
    secondary.employmentRate = clamp(secondary.employmentRate + 1)
  }
  // 同步就业率二级指标（与失业率互为镜像）
  secondary.employmentRate = clamp(Math.round(100 - macro.unemployment * 2.2))
  // 高通胀 → 民怨
  if (secondary.inflationRate > 72) {
    metrics.approval = clamp(metrics.approval - 2)
    metrics.economy = clamp(metrics.economy - 1)
  } else if (secondary.inflationRate > 60) {
    metrics.approval = clamp(metrics.approval - 1)
  }
  // 增长奇迹/衰退 → 民意
  if (growth >= 4) metrics.approval = clamp(metrics.approval + 1)
  if (growth <= -2) {
    metrics.approval = clamp(metrics.approval - 1)
    metrics.prestige = clamp(metrics.prestige - 1)
  }
  // 战争持续放血
  if (atWar) {
    metrics.treasury = clamp(metrics.treasury - 2)
    if (state.activeWar && state.activeWar.warScore < -5) {
      metrics.stability = clamp(metrics.stability - 1)
      metrics.approval = clamp(metrics.approval - 1)
    }
  }

  // ---------- 7. 总理个人生活 ----------
  // 压力：战争/动乱/低民意推高，太平年月回落
  const stressPush =
    (atWar ? 4 : 0) +
    (metrics.stability < 35 ? 3 : 0) +
    (metrics.approval < 30 ? 2 : 0) -
    (metrics.approval > 60 && metrics.stability > 60 ? 2 : 0.5)
  personalLife.stress = clamp(personalLife.stress + stressPush)
  // 压力过大损害健康
  const traits = { ...state.pmTraitsNumeric }
  if (personalLife.stress > 75) {
    traits.health = clamp(traits.health - 1)
  }
  // 家庭关系：长期不回家自然疏远（事件可修复）
  personalLife.familyRelation = clamp(personalLife.familyRelation - 0.4)
  if (personalLife.familyRelation < 25) {
    // 家庭危机小报满天飞
    metrics.prestige = clamp(metrics.prestige - 1)
  }
  // 黑金腐败：高风险引爆丑闻
  if (personalLife.corruption >= 55 && Math.random() < 0.12 + personalLife.corruption * 0.002) {
    const severity = personalLife.corruption >= 80 ? '惊天黑幕' : '贪腐丑闻'
    extraNews.push({
      id: `corruption_scandal_${state.totalDays}`,
      timestamp: `${state.year}年${state.month}月`,
      title: `${severity}：总理黑金网络遭曝光`,
      summary: '调查记者公布海外账户与利益输送证据链，全国哗然。反对党要求立即启动弹劾程序。',
      category: '政治体制',
      tone: 'negative',
    })
    metrics.approval = clamp(metrics.approval - (personalLife.corruption >= 80 ? 12 : 7))
    metrics.prestige = clamp(metrics.prestige - 10)
    metrics.stability = clamp(metrics.stability - 3)
    personalLife.corruption = clamp(personalLife.corruption - 35) // 曝光后收敛
    personalLife.stress = clamp(personalLife.stress + 15)
  } else if (personalLife.corruption > 0) {
    // 无丑闻时缓慢衰减（风头过去）
    personalLife.corruption = clamp(personalLife.corruption - 0.3)
  }

  return { macro, metrics, secondary, military, personalLife, extraNews }
}

/** 供 UI 与战争系统查询的实时军力 */
export function getPlayerMilitaryStrength(state: GameState): number {
  return computeMilitaryStrength(state.military)
}

/**
 * v1.5 中央运算引擎 —— 集中统一运算与分析
 *
 * 月度结算末尾调用，把"地方行政区/长官/外交/军事/经济"等所有要素汇总运算：
 *
 * 1. 地方 → 中央传导
 *    - 八区忠诚度加权平均（按经济权重）→ 影响全国稳定度
 *    - 八区稳定度加权平均 → 影响全国民意与抗议频率
 *    - 八区经济贡献（governor.competence × economyWeight）→ 影响全国经济指数
 *    - 高腐败长官累积 → 触发"地方贪腐网络"丑闻概率
 *
 * 2. 跨区联动
 *    - 极低稳定区（<30）→ 拖累邻接区稳定（-2）
 *    - 极低忠诚区（<30）→ 触发自治/脱离倾向新闻，并波及中央 prestige
 *
 * 3. 长官动态
 *    - 长官忠诚度自然漂移（向 50 回归 ±2）
 *    - 腐败长官忠诚度下降更快，且更可能"出事"
 *
 * 4. 自动事件触发
 *    - 极端区状态生成"地方警报"新闻，提示玩家该区需要干预
 *
 * 返回：更新后的 regions/governors/metrics/secondary，以及 extraNews 和 attribution 条目
 */
export function runCentralAnalysis(state: GameState): {
  regions: Region[]
  governors: LocalGovernor[]
  metricsDelta: Partial<Metrics>
  secondaryDelta: Partial<SecondaryMetrics>
  extraNews: NewsItem[]
  attributionEntries: AttributionEntry[]
} {
  const regions = (state.regions ?? []).map((r) => ({ ...r }))
  const governors = (state.governors ?? []).map((g) => ({ ...g }))
  const metricsDelta: Partial<Metrics> = {}
  const secondaryDelta: Partial<SecondaryMetrics> = {}
  const extraNews: NewsItem[] = []
  const attributionEntries: AttributionEntry[] = []

  if (regions.length === 0) {
    return { regions, governors, metricsDelta, secondaryDelta, extraNews, attributionEntries }
  }

  // ---------- 1. 加权汇总（按经济权重） ----------
  const totalEconWeight = regions.reduce((s, r) => s + r.economyWeight, 0)
  const weightedLoyalty = regions.reduce((s, r) => s + r.loyalty * r.economyWeight, 0) / totalEconWeight
  const weightedStability = regions.reduce((s, r) => s + r.stability * r.economyWeight, 0) / totalEconWeight

  // 地方忠诚 → 全国稳定度
  // 当加权忠诚 < 50 时，每月扣稳定度（最高 -3）；> 65 时 +1
  if (weightedLoyalty < 30) {
    metricsDelta.stability = (metricsDelta.stability ?? 0) - 3
    metricsDelta.prestige = (metricsDelta.prestige ?? 0) - 1
  } else if (weightedLoyalty < 50) {
    metricsDelta.stability = (metricsDelta.stability ?? 0) - 1
  } else if (weightedLoyalty > 65) {
    metricsDelta.stability = (metricsDelta.stability ?? 0) + 1
  }

  // 地方稳定 → 全国民意
  if (weightedStability < 35) {
    metricsDelta.approval = (metricsDelta.approval ?? 0) - 2
    secondaryDelta.protestFrequency = (secondaryDelta.protestFrequency ?? 0) + 3
  } else if (weightedStability < 50) {
    metricsDelta.approval = (metricsDelta.approval ?? 0) - 1
    secondaryDelta.protestFrequency = (secondaryDelta.protestFrequency ?? 0) + 1
  } else if (weightedStability > 70) {
    metricsDelta.approval = (metricsDelta.approval ?? 0) + 1
  }

  // ---------- 2. 长官能力 → 经济贡献 ----------
  let econContribution = 0
  for (const r of regions) {
    const gov = governors.find((g) => g.id === r.governorId)
    if (!gov) continue
    // 能力 60 = 中性；70+ 每点 +0.02；< 50 每点 -0.03
    const compFactor = (gov.competence - 60) / 100
    // 腐败扣经济效率
    const corruptionDrag = gov.corruption > 50 ? (gov.corruption - 50) / 50 * 0.5 : 0
    const regionContribution = (compFactor - corruptionDrag) * r.economyWeight
    econContribution += regionContribution
  }
  // 把经济贡献转化为 economy 指标点变化（缩放避免过强）
  const econMetricDelta = Math.max(-2, Math.min(2, Math.round(econContribution / 10)))
  if (econMetricDelta !== 0) {
    metricsDelta.economy = (metricsDelta.economy ?? 0) + econMetricDelta
  }

  // ---------- 3. 长官忠诚度漂移 ----------
  for (const g of governors) {
    // 向 50 回归 ±2
    if (g.loyalty > 50) {
      g.loyalty = clamp(g.loyalty - 1)
    } else if (g.loyalty < 50) {
      g.loyalty = clamp(g.loyalty + 1)
    }
    // 腐败长官忠诚度自然下降（黑金关系不可靠）
    if (g.corruption > 60) {
      g.loyalty = clamp(g.loyalty - 1)
    }
    // 腐败值自然累积（没被反贪就慢慢变严重）
    if (g.corruption > 30 && g.corruption < 90) {
      g.corruption = clamp(g.corruption + (Math.random() < 0.3 ? 1 : 0))
    }
  }

  // ---------- 4. 跨区联动：动荡扩散 ----------
  // 简化版"邻接"：按 region 顺序的前后两个区视为相邻（避免引入额外邻接表）
  const regionCount = regions.length
  for (let i = 0; i < regionCount; i++) {
    const r = regions[i]
    if (r.stability < 30) {
      // 该区动荡，扩散到"邻接区"
      const neighbors = [regions[(i - 1 + regionCount) % regionCount], regions[(i + 1) % regionCount]]
      for (const nb of neighbors) {
        if (nb.id === r.id) continue
        const before = nb.stability
        nb.stability = clamp(nb.stability - 1)
        if (before !== nb.stability) {
          // 记录跨区联动
          extraNews.push({
            id: `region_spread_${state.totalDays}_${r.id}_${nb.id}`,
            timestamp: `${state.year}年${state.month}月`,
            title: `${r.name}动荡波及${nb.name}`,
            summary: `${r.name}的抗议与治安事件外溢，邻接${nb.name}稳定度下降。`,
            category: '社会',
            tone: 'negative',
          })
        }
      }
    }
  }

  // ---------- 5. 极端区警报 ----------
  for (const r of regions) {
    const gov = governors.find((g) => g.id === r.governorId)
    // 忠诚 < 25：自治/脱离风险
    if (r.loyalty < 25 && Math.random() < 0.4) {
      extraNews.push({
        id: `region_defy_${state.totalDays}_${r.id}`,
        timestamp: `${state.year}年${state.month}月`,
        title: `${r.name}出现自治声明`,
        summary: `${r.name}地方议会通过《自治宣言》草案，拒绝执行中央政令。${gov ? `长官${gov.name}` : '地方'}态度暧昧。`,
        category: '政治体制',
        tone: 'negative',
      })
      metricsDelta.prestige = (metricsDelta.prestige ?? 0) - 2
      metricsDelta.stability = (metricsDelta.stability ?? 0) - 1
    }
    // 稳定 < 20：暴动风险
    if (r.stability < 20 && Math.random() < 0.35) {
      extraNews.push({
        id: `region_riot_${state.totalDays}_${r.id}`,
        timestamp: `${state.year}年${state.month}月`,
        title: `${r.name}爆发大规模抗议`,
        summary: `${r.name}数千人上街与治安部队冲突，伤亡报告不一。中央紧急召开应对会议。`,
        category: '社会',
        tone: 'negative',
      })
      metricsDelta.approval = (metricsDelta.approval ?? 0) - 3
      metricsDelta.stability = (metricsDelta.stability ?? 0) - 2
    }
    // 长官腐败 ≥ 75 且本月触发丑闻
    if (gov && gov.corruption >= 75 && Math.random() < 0.18) {
      extraNews.push({
        id: `gov_scandal_${state.totalDays}_${gov.id}`,
        timestamp: `${state.year}年${state.month}月`,
        title: `${r.name}长官${gov.name}涉贪被曝光`,
        summary: `调查记者披露${gov.name}家族在${r.name}的资产来源不明，呼吁中央彻查。`,
        category: '政治体制',
        tone: 'negative',
      })
      metricsDelta.approval = (metricsDelta.approval ?? 0) - 2
      metricsDelta.prestige = (metricsDelta.prestige ?? 0) - 1
      // 中央介入调查 → 腐败小幅下降
      gov.corruption = clamp(gov.corruption - 8)
      gov.loyalty = clamp(gov.loyalty - 5) // 被曝光后对中央不满
    }
  }

  // ---------- 6. 归因条目 ----------
  if (Object.keys(metricsDelta).length > 0 || Object.keys(secondaryDelta).length > 0) {
    attributionEntries.push({
      source: 'cross_system',
      label: '中央运算引擎：地方→中央传导（忠诚/稳定/腐败/能力）',
      effects: metricsDelta,
      day: state.totalDays,
    })
  }
  if (extraNews.length > 0) {
    attributionEntries.push({
      source: 'event',
      label: `地方警报与跨区联动（${extraNews.length} 条）`,
      effects: {},
      day: state.totalDays,
    })
  }

  return {
    regions,
    governors,
    metricsDelta,
    secondaryDelta,
    extraNews,
    attributionEntries,
  }
}

/** GDP 增速等级描述（经济页展示） */
export function growthLabel(g: number): string {
  if (g >= 5) return '过热繁荣'
  if (g >= 2.5) return '稳健增长'
  if (g >= 0.5) return '温和扩张'
  if (g > -1) return '停滞'
  if (g > -3) return '衰退'
  return '深度萧条'
}

/** 失业率等级描述 */
export function unemploymentLabel(u: number): string {
  if (u < 4) return '充分就业'
  if (u < 7) return '正常水平'
  if (u < 11) return '失业偏高'
  if (u < 16) return '失业危机'
  return '大规模失业'
}
