// 环境页面：从通用模板升级为"生态仪表盘 + 污染源追踪 + 季节叙事 + 行动列表"
import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import DomainPageLayout from '@/components/DomainPageLayout'

export default function EnvironmentPage() {
  const metrics = useGameStore((s) => s.metrics)
  const secondary = useGameStore((s) => s.secondary)
  const turn = useGameStore((s) => s.turn)
  const year = useGameStore((s) => s.year)
  const month = useGameStore((s) => s.month)

  // 模拟生态四维度（基于声望与社会团结推导，未来可扩展为独立指标）
  const ecoScore = Math.round(
    Math.max(0, Math.min(100, (metrics.prestige + secondary.socialCohesion + (100 - secondary.crimeRate)) / 3)),
  )
  const ecoDims = [
    {
      label: '空气质量',
      icon: '💨',
      value: Math.max(0, Math.min(100, ecoScore + 10 - (secondary.protestFrequency / 4))),
      desc: '工业排放与机动车尾气综合评估',
      color: '#3b82f6',
    },
    {
      label: '森林覆盖',
      icon: '🌲',
      value: Math.max(0, Math.min(100, ecoScore - 5 + (secondary.socialCohesion / 6))),
      desc: '天然林保护与人工造林进度',
      color: '#10b981',
    },
    {
      label: '水体质量',
      icon: '💧',
      value: Math.max(0, Math.min(100, ecoScore + (metrics.stability - 50) / 4)),
      desc: '主要河流与湖泊监测断面达标率',
      color: '#06b6d4',
    },
    {
      label: '碳排放强度',
      icon: '🏭',
      value: Math.max(0, Math.min(100, 100 - ecoScore + (secondary.industrialOutput - 50) / 3)),
      desc: '单位 GDP 碳排放（值越低越好）',
      color: '#ef4444',
      inverted: true,
    },
  ]

  const season = getSeason(month)
  const pollutionSources = getPollutionSources(secondary, metrics.economy)

  return (
    <div className="flex flex-col pr-2">
      {/* 页面标题 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🌱</span>
        <span className="font-display text-lg font-semibold tracking-[0.25em]" style={{ color: '#7a9d55' }}>
          生 态 文 明
        </span>
        <div
          className="h-px flex-1"
          style={{ background: 'linear-gradient(to right, #7a9d5566, transparent)' }}
        />
        <span className="font-mono text-[10px] text-parchment-200/40">
          {year}年{month}月 · {season.icon} {season.label}
        </span>
      </div>

      {/* 顶部：生态综合得分 */}
      <div
        className="doc-card p-4 mb-3 flex items-center gap-4"
        style={{ borderColor: '#7a9d5555', background: 'linear-gradient(135deg, rgba(122,157,85,0.12), transparent)' }}
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: '#7a9d55' }}>
          <span className="font-display text-2xl font-bold" style={{ color: '#7a9d55' }}>
            {ecoScore}
          </span>
        </div>
        <div className="flex-1">
          <div className="font-serif text-sm font-semibold text-parchment-200 mb-0.5">
            生态综合得分
          </div>
          <div className="font-serif text-xs text-parchment-200/60 leading-relaxed">
            {ecoScore >= 75
              ? '绿水青山：国民享有清洁空气与饮用水，国际环保组织给予高度评价'
              : ecoScore >= 50
                ? '尚可：基本生态指标达标，但仍有改善空间'
                : ecoScore >= 30
                  ? '堪忧：污染问题开始影响民意与稳定'
                  : '危机：环境恶化已拖累声望，触发环保抗议'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-[9px] text-parchment-200/40">影响</span>
          <span className="font-serif text-[10px] text-parchment-200/60">
            声望 {Math.round(metrics.prestige)} · 团结 {Math.round(secondary.socialCohesion)}
          </span>
        </div>
      </div>

      {/* 中部：四维度仪表盘 */}
      <div className="doc-card p-4 mb-3" style={{ borderColor: '#7a9d5555' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-serif text-sm font-semibold text-parchment-200">
            🌍 生态四维度
          </span>
          <span className="font-mono text-[9px] text-parchment-200/40">
            综合得分由声望/团结/犯罪率推导
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ecoDims.map((d) => {
            const isDanger = d.inverted ? d.value > 65 : d.value < 30
            const isWarn = d.inverted ? d.value > 50 : d.value < 50
            return (
              <motion.div
                key={d.label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-md border p-3 ${
                  isDanger
                    ? 'border-red-500/40 bg-red-950/20'
                    : isWarn
                      ? 'border-orange-500/30 bg-orange-950/10'
                      : 'border-gold/20 bg-ink-900/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">{d.icon}</span>
                  <span className="font-mono text-base font-bold" style={{ color: d.color }}>
                    {Math.round(d.value)}
                  </span>
                </div>
                <div className="font-serif text-[11px] font-bold text-parchment-100 mb-1">
                  {d.label}
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/60 mb-1.5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: d.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${d.value}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <p className="font-serif text-[9px] text-parchment-200/50 leading-tight">
                  {d.desc}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* 污染源追踪 + 季节叙事 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 mb-3">
        {/* 污染源追踪 */}
        <div className="doc-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🏭</span>
            <span className="font-serif text-sm font-semibold text-parchment-200">
              污染源追踪
            </span>
          </div>
          <div className="space-y-2">
            {pollutionSources.map((p) => (
              <div key={p.label} className="flex items-center gap-3">
                <span className="text-sm w-6 text-center">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-serif text-xs text-parchment-200/80">{p.label}</span>
                    <span
                      className="font-mono text-[10px] font-bold"
                      style={{ color: p.level === 'high' ? '#ef4444' : p.level === 'mid' ? '#fb923c' : '#10b981' }}
                    >
                      {p.level === 'high' ? '高' : p.level === 'mid' ? '中' : '低'}
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-ink-900/60">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${p.value}%`,
                        backgroundColor: p.level === 'high' ? '#ef4444' : p.level === 'mid' ? '#fb923c' : '#10b981',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 季节叙事 */}
        <div className="doc-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{season.icon}</span>
            <span className="font-serif text-sm font-semibold text-parchment-200">
              {season.label}时序
            </span>
          </div>
          <div className="font-serif text-[11px] text-parchment-200/70 leading-relaxed space-y-2">
            <p>{season.narrative}</p>
            <div className="pt-2 border-t border-parchment-200/10">
              <div className="font-mono text-[9px] text-parchment-200/40 mb-1">本月建议</div>
              <p className="text-[10px]">{season.tip}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部：领域行动（保留通用模板） */}
      <div className="flex-1 min-h-0">
        <DomainPageLayout domain="environment" />
      </div>
    </div>
  )
}

/** 根据月份返回季节信息 */
function getSeason(month: number): {
  label: string
  icon: string
  narrative: string
  tip: string
} {
  if (month >= 3 && month <= 5) {
    return {
      label: '春',
      icon: '🌸',
      narrative: '万物复苏，农田备耕，城市绿化带进入花期。春季是环保宣传的黄金期，民众对生态议题敏感度上升。',
      tip: '推进植树造林与流域治理改革，可在此季节获得额外声望加成。',
    }
  }
  if (month >= 6 && month <= 8) {
    return {
      label: '夏',
      icon: '☀️',
      narrative: '高温加剧工业排放与空调用电，空气质量承压；河流进入丰水期，水体自净能力增强。',
      tip: '夏季是污染事件高发期，建议提前储备环保预算应对突发污染。',
    }
  }
  if (month >= 9 && month <= 11) {
    return {
      label: '秋',
      icon: '🍂',
      narrative: '收获季节，农业产出达到峰值；秋季常发生秸秆焚烧问题，影响空气质量。',
      tip: '推进秸秆综合利用改革，可同时提升农业产出与空气质量。',
    }
  }
  return {
    label: '冬',
    icon: '❄️',
    narrative: '供暖需求推高碳排放，北方城市群空气质量下降；冰雪覆盖有利于森林防火。',
    tip: '冬季是清洁能源转型改革的关键推进期，提前布局可减少次年污染。',
  }
}

/** 根据当前状态推导主要污染源 */
function getPollutionSources(
  secondary: { industrialOutput: number; agriculturalOutput: number; urbanSupport: number; crimeRate: number },
  economy: number,
): { label: string; icon: string; value: number; level: 'low' | 'mid' | 'high' }[] {
  const sources = [
    {
      label: '工业排放',
      icon: '🏭',
      value: Math.min(100, secondary.industrialOutput * 0.7 + (economy - 50) * 0.5),
      level: 'mid' as const,
    },
    {
      label: '农业面源',
      icon: '🌾',
      value: Math.min(100, secondary.agriculturalOutput * 0.5 + 20),
      level: 'mid' as const,
    },
    {
      label: '城市尾气',
      icon: '🚗',
      value: Math.min(100, secondary.urbanSupport * 0.4 + 30),
      level: 'mid' as const,
    },
    {
      label: '生活污水',
      icon: '🚰',
      value: Math.min(100, 50 - (secondary.crimeRate / 4)),
      level: 'mid' as const,
    },
  ]
  // 根据 value 自动判定等级
  return sources.map((s) => ({
    ...s,
    level: s.value > 60 ? ('high' as const) : s.value > 35 ? ('mid' as const) : ('low' as const),
  }))
}
