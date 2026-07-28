// 社会页面：从通用模板升级为"社会仪表盘 + 人口分布 + 文化叙事 + 行动列表"
// 不再单纯复用 DomainPageLayout，而是用三段式布局突出社会系统特有维度
import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import DomainPageLayout from '@/components/DomainPageLayout'

export default function SocietyPage() {
  const metrics = useGameStore((s) => s.metrics)
  const secondary = useGameStore((s) => s.secondary)
  const turn = useGameStore((s) => s.turn)

  // 社会专属二级指标
  const socialDims = [
    {
      key: 'crimeRate' as const,
      label: '犯罪率',
      icon: '🚨',
      value: secondary.crimeRate,
      positive: false,
      desc: '治安恶化将拖累稳定，并触发警务事件',
      color: '#ef4444',
    },
    {
      key: 'protestFrequency' as const,
      label: '抗议频率',
      icon: '📣',
      value: secondary.protestFrequency,
      positive: false,
      desc: '失业率与民意下滑会推高抗议；高抗议触发工会施压事件',
      color: '#fb923c',
    },
    {
      key: 'socialCohesion' as const,
      label: '社会团结',
      icon: '🤝',
      value: secondary.socialCohesion,
      positive: true,
      desc: '宗教、民族、阶层凝聚度；过低会引发宗教界质询',
      color: '#10b981',
    },
  ]

  // 人口支持度分布
  const supportBreakdown = [
    { label: '城市支持', icon: '🏙️', value: secondary.urbanSupport, color: '#3b82f6' },
    { label: '农村支持', icon: '🌾', value: secondary.ruralSupport, color: '#10b981' },
    { label: '青年支持', icon: '🎓', value: secondary.youthSupport, color: '#a855f7' },
  ]

  return (
    <div className="flex flex-col pr-2">
      {/* 页面标题 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">👥</span>
        <span className="font-display text-lg font-semibold tracking-[0.25em]" style={{ color: '#e0c98a' }}>
          社 会 治 理
        </span>
        <div
          className="h-px flex-1"
          style={{ background: 'linear-gradient(to right, #e0c98a66, transparent)' }}
        />
        <span className="font-mono text-[10px] text-parchment-200/40">
          第 {turn} 月
        </span>
      </div>

      {/* 顶部：社会三维度仪表盘 */}
      <div className="doc-card p-4 mb-3" style={{ borderColor: '#e0c98a55' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-serif text-sm font-semibold text-parchment-200">
            📊 社会三维度
          </span>
          <span className="font-mono text-[9px] text-parchment-200/40">
            核心：民意 {Math.round(metrics.approval)} · 稳定 {Math.round(metrics.stability)}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {socialDims.map((d) => {
            const isDanger = d.positive ? d.value < 25 : d.value > 60
            const isWarn = d.positive ? d.value < 45 : d.value > 40
            return (
              <motion.div
                key={d.key}
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
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{d.icon}</span>
                    <span className="font-serif text-xs font-bold text-parchment-100">
                      {d.label}
                    </span>
                  </div>
                  <span
                    className="font-mono text-xl font-bold"
                    style={{ color: d.color }}
                  >
                    {Math.round(d.value)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-900/60">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: d.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${d.value}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <p className="mt-1.5 font-serif text-[10px] text-parchment-200/50 leading-relaxed">
                  {d.desc}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* 中部：人口支持度分布 + 文化叙事 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        {/* 人口支持度分布 */}
        <div className="doc-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🗺️</span>
            <span className="font-serif text-sm font-semibold text-parchment-200">
              人口支持度分布
            </span>
          </div>
          <div className="space-y-3">
            {supportBreakdown.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-serif text-xs text-parchment-200/80">
                    {s.icon} {s.label}
                  </span>
                  <span className="font-mono text-sm font-bold" style={{ color: s.color }}>
                    {Math.round(s.value)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-900/60">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: s.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.value}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-parchment-200/10">
            <div className="font-mono text-[9px] text-parchment-200/40 mb-1">综合民意</div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold text-gold">
                {Math.round(metrics.approval)}
              </span>
              <span className="font-serif text-[10px] text-parchment-200/40">
                = 城市×0.4 + 农村×0.4 + 青年×0.2
              </span>
            </div>
          </div>
        </div>

        {/* 文化叙事卡 */}
        <div className="doc-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📜</span>
            <span className="font-serif text-sm font-semibold text-parchment-200">
              社会脉搏
            </span>
          </div>
          <div className="space-y-2">
            {getSocialNarrative(metrics.approval, secondary).map((line, i) => (
              <div
                key={i}
                className="rounded-md border border-parchment-200/10 bg-ink-900/40 p-2"
              >
                <div className="font-serif text-[11px] text-parchment-200/80 leading-relaxed">
                  {line}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部：领域行动（保留通用模板） */}
      <div className="flex-1 min-h-0">
        <DomainPageLayout domain="society" />
      </div>
    </div>
  )
}

/** 根据当前社会状态生成叙事文案 */
function getSocialNarrative(
  approval: number,
  secondary: { crimeRate: number; protestFrequency: number; socialCohesion: number; urbanSupport: number; ruralSupport: number; youthSupport: number },
): string[] {
  const lines: string[] = []

  // 犯罪率叙事
  if (secondary.crimeRate > 60) {
    lines.push('🚨 治安恶化：东南数省入室盗窃与街头抢劫上升三成，警方疲于奔命，民众夜间出行意愿骤降。')
  } else if (secondary.crimeRate > 40) {
    lines.push('🚨 治安平稳：偶有零星案件，但整体可控；社区联防机制运转良好。')
  } else {
    lines.push('🚨 治安良好：夜不闭户的传说在乡间流传，城市监控网络覆盖率达历史高位。')
  }

  // 抗议叙事
  if (secondary.protestFrequency > 60) {
    lines.push('📣 抗议频发：工会与学生会开始串联，市政府门口周周有请愿；反对党借机在媒体发声。')
  } else if (secondary.protestFrequency > 40) {
    lines.push('📣 偶有抗议：零星请愿多为民生议题，未形成规模。')
  } else {
    lines.push('📣 社会安静：街头未见标语，议会才是表达诉求的舞台。')
  }

  // 团结叙事
  if (secondary.socialCohesion < 35) {
    lines.push('🤝 凝聚力危机：地区与阶层之间互不信任，宗教领袖开始表达"国家精神失锚"的忧虑。')
  } else if (secondary.socialCohesion > 65) {
    lines.push('🤝 团结稳固：国民对国家方向有共识，灾后互助、节庆共度成为常态。')
  } else {
    lines.push('🤝 凝聚力尚可：分歧存在但未撕裂社会，需要持续经营。')
  }

  // 代际叙事
  const youthGap = Math.abs(secondary.youthSupport - secondary.urbanSupport)
  if (youthGap > 25) {
    lines.push('🎓 代际裂痕：青年与中年的政治偏好显著分化，社交媒体成为新的舆论战场。')
  }

  return lines.slice(0, 4)
}
