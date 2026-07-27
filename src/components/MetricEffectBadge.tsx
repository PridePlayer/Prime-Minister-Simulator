import { useGameStore } from '@/store/gameStore'
import { METRIC_META, SECONDARY_META } from '@/data/metrics'
import MetricTooltip, { METRIC_DESCRIPTIONS } from '@/components/MetricTooltip'
import type { MetricKey, SecondaryMetricKey } from '@/types/game'

interface MetricEffectBadgeProps {
  /** 指标 key（一级或二级） */
  metricKey: string
  /** 变化值 */
  value: number
  /** 显示风格：dark=深色背景（事件卡），light=浅色背景（弹窗） */
  variant?: 'dark' | 'light'
}

/** 指标效果徽章：显示 emoji + 增减值，鼠标悬停显示该指标的定义与当前剩余值
 *  用于事件选项的影响预览、改革加成展示等所有需要展示指标变化的地方
 */
export default function MetricEffectBadge({
  metricKey,
  value,
  variant = 'dark',
}: MetricEffectBadgeProps) {
  const metrics = useGameStore((s) => s.metrics)
  const secondary = useGameStore((s) => s.secondary)
  const pmStats = useGameStore((s) => s.pmStats)

  // 优先匹配一级指标
  const primaryMeta = METRIC_META.find((m) => m.key === metricKey)
  if (primaryMeta) {
    const currentValue = metrics[metricKey as MetricKey] ?? 0
    return (
      <MetricTooltip
        label={primaryMeta.label}
        description={primaryMeta.desc}
        value={currentValue}
      >
        <BadgeContent
          icon={primaryMeta.icon}
          value={value}
          variant={variant}
        />
      </MetricTooltip>
    )
  }

  // 二级指标
  const secondaryMeta = SECONDARY_META.find((m) => m.key === metricKey)
  if (secondaryMeta) {
    const currentValue = secondary[metricKey as SecondaryMetricKey] ?? 0
    const parentMeta = METRIC_META.find((m) => m.key === secondaryMeta.parent)
    return (
      <MetricTooltip
        label={secondaryMeta.label}
        description={`归属：${parentMeta?.label ?? '—'}（${secondaryMeta.positive ? '越高越好' : '越低越好'}）`}
        value={currentValue}
      >
        <BadgeContent
          icon={parentMeta?.icon ?? '📊'}
          value={value}
          variant={variant}
        />
      </MetricTooltip>
    )
  }

  // PMStats（politicalCapital/partyPrestige/rhetoric/riskIndex）
  if (metricKey in pmStats) {
    const pmLabels: Record<string, { label: string; icon: string }> = {
      politicalCapital: { label: '政治资本', icon: '💼' },
      partyPrestige: { label: '党内威望', icon: '🏛️' },
      rhetoric: { label: '辩论技巧', icon: '🗣️' },
      riskIndex: { label: '风险指数', icon: '⚠️' },
    }
    const meta = pmLabels[metricKey]
    if (meta) {
      const currentValue = (pmStats as unknown as Record<string, number>)[metricKey] ?? 0
      return (
        <MetricTooltip
          label={meta.label}
          description={METRIC_DESCRIPTIONS[metricKey] ?? ''}
          value={currentValue}
        >
          <BadgeContent icon={meta.icon} value={value} variant={variant} />
        </MetricTooltip>
      )
    }
  }

  // 兜底：纯文本显示
  return <BadgeContent icon="📊" value={value} variant={variant} />
}

/** 徽章内容（无 tooltip 包装时的纯展示） */
function BadgeContent({
  icon,
  value,
  variant,
}: {
  icon: string
  value: number
  variant: 'dark' | 'light'
}) {
  const positive = value > 0
  const isLight = variant === 'light'
  return (
    <span
      className="inline-flex cursor-help items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
      style={{
        color: positive
          ? isLight ? '#15803d' : '#7a9d55'
          : isLight ? '#b91c1c' : '#b34554',
        backgroundColor: positive
          ? isLight ? 'rgba(34,197,94,0.15)' : 'rgba(122,157,85,0.12)'
          : isLight ? 'rgba(239,68,68,0.15)' : 'rgba(179,69,84,0.12)',
      }}
    >
      {icon} {positive ? '+' : ''}{value}
    </span>
  )
}
