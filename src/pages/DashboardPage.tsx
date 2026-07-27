import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { METRIC_META, SECONDARY_META, metricColor, metricGrade } from '@/data/metrics'
import type { MetricKey, SecondaryMetricKey, Metrics, SecondaryMetrics, GamePage } from '@/types/game'
import { useState, useMemo, useEffect } from 'react'
import DailyActionsPanel from '@/components/DailyActionsPanel'
import NPCChatter from '@/components/NPCChatter'

/**
 * 仪表盘页面：总理每日简报（重写版）
 *
 * 设计目标：
 *  1. 顶部"每日简报"占满整行，内部三栏（日期信息 / 总理致辞 / 国名徽章），文本不截断
 *  2. 新增"国家各领域现状"5 列网格（外交🤝 / 军事⚔️ / 经济📈 / 社会🏘️ / 环境🌱），
 *     每张卡片含图标+名称、核心指标、mini 进度条、最近 1 条相关新闻、进入按钮，整体可点击跳转
 *  3. 一级指标条带保留 6 项，每个指标新增 SVG mini 折线图（最近 6 个月走势），
 *     颜色按 metricColor 区分；保留二级细分展开功能
 *  4. 三栏简化为"今日要务 + 内阁快览 + 媒体摘要"，每栏加宽避免拥挤
 *  5. 底部：进行中改革进度 + NPC 闲聊
 *
 * 历史数据说明：store 未提供指标历史字段，组件内自维护 metricHistory 数组，
 * 每次 turn 变化时记录当前一级指标快照，最多保留 6 个数据点。
 */

// ===== 领域卡片配置 =====
interface DomainCardDef {
  key: string
  icon: string
  name: string
  page: GamePage
  newsCat: string
  desc: string
  /** 由一级指标派生该领域核心数值 */
  getValue: (m: Metrics, s: SecondaryMetrics) => number
}

const DOMAIN_CARDS: DomainCardDef[] = [
  { key: 'diplomacy', icon: '🤝', name: '外交', page: 'diplomacy', newsCat: '外交',
    desc: '国际地位与盟友关系', getValue: (m) => m.diplomacy },
  { key: 'military', icon: '⚔️', name: '军事', page: 'military', newsCat: '军事',
    desc: '稳定与声望综合', getValue: (m) => Math.round((m.stability + m.prestige) / 2) },
  { key: 'economy', icon: '📈', name: '经济', page: 'economy', newsCat: '经济',
    desc: '宏观经济活力', getValue: (m) => m.economy },
  { key: 'society', icon: '🏘️', name: '社会', page: 'society', newsCat: '社会',
    desc: '民意支持度', getValue: (m) => m.approval },
  { key: 'environment', icon: '🌱', name: '环境', page: 'environment', newsCat: '环境',
    desc: '资源健康度参考', getValue: (m) => Math.round(m.treasury / 2) },
]

// ===== Mini SVG 折线图 =====
function Sparkline({
  data,
  color,
  w = 60,
  h = 16,
}: {
  data: number[]
  color: string
  w?: number
  h?: number
}) {
  // 无数据：虚线占位
  if (!data || data.length === 0) {
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <line
          x1={0}
          y1={h / 2}
          x2={w}
          y2={h / 2}
          stroke={color}
          strokeWidth={0.6}
          strokeDasharray="2,2"
          opacity={0.4}
        />
      </svg>
    )
  }
  // 单点：水平线 + 圆点
  if (data.length === 1) {
    const y = h - (data[0] / 100) * h
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <line x1={0} y1={y} x2={w} y2={y} stroke={color} strokeWidth={1} opacity={0.5} />
        <circle cx={w / 2} cy={y} r={1.6} fill={color} />
      </svg>
    )
  }
  // 多点：折线 + 末端圆点
  const stepX = w / (data.length - 1)
  const pts = data
    .map((v, i) => `${(i * stepX).toFixed(2)},${(h - (v / 100) * h).toFixed(2)}`)
    .join(' ')
  const lastX = (data.length - 1) * stepX
  const lastY = h - (data[data.length - 1] / 100) * h
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={1.6} fill={color} />
    </svg>
  )
}

export default function DashboardPage() {
  const metrics = useGameStore((s) => s.metrics)
  const secondary = useGameStore((s) => s.secondary)
  const cabinet = useGameStore((s) => s.cabinet)
  const activeInitiatives = useGameStore((s) => s.activeInitiatives)
  const news = useGameStore((s) => s.news)
  const pmName = useGameStore((s) => s.pmName)
  const countryName = useGameStore((s) => s.countryName)
  const year = useGameStore((s) => s.year)
  const month = useGameStore((s) => s.month)
  const day = useGameStore((s) => s.day)
  const term = useGameStore((s) => s.term)
  const turn = useGameStore((s) => s.turn)
  const pendingLetters = useGameStore((s) => s.pendingLetters)
  const pendingNotes = useGameStore((s) => s.pendingNotes)
  const cabinetChats = useGameStore((s) => s.cabinetChats)
  const setSidePanelPage = useGameStore((s) => s.setSidePanelPage)
  const setGamePage = useGameStore((s) => s.setGamePage)

  const [expandedMetric, setExpandedMetric] = useState<MetricKey | null>(null)

  // ===== 一级指标历史（最近 6 个月） =====
  // store 无 history 字段，组件内自维护：每次 turn 变化记录一次快照
  const [metricHistory, setMetricHistory] = useState<Record<MetricKey, number[]>>({
    approval: [],
    treasury: [],
    economy: [],
    stability: [],
    diplomacy: [],
    prestige: [],
  })

  useEffect(() => {
    setMetricHistory((prev) => {
      const next: Record<MetricKey, number[]> = { ...prev }
      METRIC_META.forEach((meta) => {
        const k = meta.key as MetricKey
        next[k] = [...prev[k], metrics[k]].slice(-6)
      })
      return next
    })
    // 仅依赖 turn：每月（回合）记录一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn])

  // 获取最弱指标
  const weakestMetric = (Object.entries(metrics) as [MetricKey, number][]).reduce(
    (min, cur) => (cur[1] < min[1] ? cur : min),
    ['approval', 100] as [MetricKey, number],
  )

  // 取最新 3 条新闻作为媒体摘要
  const mediaDigest = news.slice(0, 3)

  // 内阁低忠诚度警告
  const disloyalMembers = cabinet.filter((m) => m.loyalty < 45)
  // 内阁未读消息
  const unreadChatCount = cabinetChats.reduce(
    (sum, t) =>
      sum + t.messages.filter((m) => m.sender === 'minister' && m.options && !m.resolved).length,
    0,
  )

  // 简报致辞：根据当前局势生成
  const briefing = useMemo(() => {
    if (weakestMetric[1] < 20) {
      return {
        title: '局势危急',
        text: `${countryName}正面临严峻考验。${METRIC_META.find((m) => m.key === weakestMetric[0])?.label}已跌至危险线（${weakestMetric[1]}），亟待处置。请总理阁下今日务必就此召集内阁。`,
        tone: 'critical' as const,
      }
    }
    if (disloyalMembers.length >= 2) {
      return {
        title: '内阁不稳',
        text: `${disloyalMembers.length}位部长忠诚度偏低，内有${disloyalMembers[0].name}等或生异心。建议今日与相关部长单独面谈，稳固内阁团结。`,
        tone: 'warning' as const,
      }
    }
    if (pendingLetters.length + pendingNotes.length > 0) {
      return {
        title: '公文待批',
        text: `今日待处理：选区信件 ${pendingLetters.length} 封、外交照会 ${pendingNotes.length} 件。请总理阁下抽空批阅，以免民怨积累。`,
        tone: 'normal' as const,
      }
    }
    if (metrics.approval >= 60) {
      return {
        title: '民望尚可',
        text: `总理阁下，${countryName}运转平稳，民意支持率 ${metrics.approval}，可趁势推进改革。任重道远，请继续勉力。`,
        tone: 'positive' as const,
      }
    }
    return {
      title: '例行简报',
      text: `${countryName}第 ${term} 届政府执政第 ${turn} 月。各项指标基本平稳，请总理阁下按计划推进施政。`,
      tone: 'normal' as const,
    }
  }, [
    weakestMetric,
    disloyalMembers,
    pendingLetters.length,
    pendingNotes.length,
    metrics.approval,
    countryName,
    term,
    turn,
  ])

  const briefingColor =
    briefing.tone === 'critical'
      ? '#ef4444'
      : briefing.tone === 'warning'
        ? '#fb923c'
        : briefing.tone === 'positive'
          ? '#10b981'
          : '#fbbf24'

  // 按领域取最近 1 条新闻
  const latestNewsByCat = (cat: string) => news.find((n) => n.category === cat)

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-2">
      {/* ============ 1. 顶部：每日简报头（占满整行，三栏布局） ============ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="doc-card relative overflow-hidden p-5 min-h-[150px]"
        style={{
          background:
            'linear-gradient(135deg, rgba(42,24,16,0.85) 0%, rgba(28,16,10,0.95) 100%),' +
            'radial-gradient(ellipse at top right, rgba(245,158,11,0.12) 0%, transparent 60%)',
        }}
      >
        {/* 顶部装饰光带 */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          {/* 左：日期与任期（占 3 列） */}
          <div className="md:col-span-3 shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <motion.span
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-gold text-sm"
              >
                ◆
              </motion.span>
              <span className="font-display text-xs font-bold tracking-[0.3em] text-gold/80">
                每 日 简 报
              </span>
            </div>
            <div className="font-mono text-2xl font-bold text-parchment-100">
              {year}
              <span className="text-gold/60 mx-1">·</span>
              {String(month).padStart(2, '0')}
              <span className="text-gold/60 mx-1">·</span>
              {String(day).padStart(2, '0')}
            </div>
            <div className="font-serif text-[11px] text-parchment-200/60 mt-1">
              第 {term} 届政府 · 执政第 {turn} 月
            </div>
            {/* 最弱指标提示 */}
            <div className="mt-2 inline-flex items-center gap-1 rounded border border-gold/15 bg-ink-900/40 px-2 py-0.5">
              <span className="text-[9px] text-parchment-200/50">最弱:</span>
              <span
                className="font-mono text-[10px] font-bold"
                style={{ color: metricColor(weakestMetric[1]) }}
              >
                {METRIC_META.find((m) => m.key === weakestMetric[0])?.label} {weakestMetric[1]}
              </span>
            </div>
          </div>

          {/* 中：总理致辞（占 7 列，加宽确保文本不截断） */}
          <div className="md:col-span-7 min-w-0 md:border-l md:border-gold/20 md:pl-4">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: briefingColor }}
              />
              <span
                className="font-display text-sm font-bold tracking-wider"
                style={{ color: briefingColor }}
              >
                {briefing.title}
              </span>
              <span className="font-serif text-[10px] italic text-parchment-200/50">
                — 致 {pmName} 总理阁下
              </span>
            </div>
            <p className="font-serif text-[14px] text-parchment-200/90 leading-[1.65] break-words whitespace-pre-wrap">
              {briefing.text}
            </p>
          </div>

          {/* 右：国名徽章（占 2 列） */}
          <div className="md:col-span-2 shrink-0 flex md:flex-col items-center justify-center gap-2 md:gap-1.5 md:px-2">
            <div
              className="flex h-14 w-14 items-center justify-center rounded border-2 border-gold/40 bg-ink-900/60"
              style={{ boxShadow: '0 0 12px rgba(245,158,11,0.2)' }}
            >
              <span className="font-display text-xl font-bold text-gold">
                {countryName.slice(0, 1)}
              </span>
            </div>
            <div className="font-mono text-[10px] tracking-wider text-parchment-200/50 text-center break-all">
              {countryName}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ============ 2. 国家各领域现状（5 列网格，新增） ============ */}
      <div className="doc-card p-4">
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="font-display text-sm font-semibold tracking-[0.25em] text-gold">
            国 家 各 领 域 现 状
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          <span className="font-serif text-[9px] italic text-parchment-200/40">
            点击卡片进入对应页面
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {DOMAIN_CARDS.map((card) => {
            const value = card.getValue(metrics, secondary)
            const color = metricColor(value)
            const latest = latestNewsByCat(card.newsCat)
            const toneColor =
              latest?.tone === 'positive'
                ? '#10b981'
                : latest?.tone === 'negative'
                  ? '#e11d48'
                  : '#f59e0b'
            return (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -2 }}
                onClick={() => setGamePage(card.page)}
                className="group relative cursor-pointer rounded border border-gold/15 bg-ink-900/40 p-3 transition-colors hover:border-gold/40 hover:bg-ink-900/60 flex flex-col gap-2"
              >
                {/* 头部：图标 + 名称 + 进入箭头 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base shrink-0">{card.icon}</span>
                    <span className="font-display text-sm font-bold tracking-wider text-parchment-100 truncate">
                      {card.name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-gold/50 group-hover:text-gold transition-colors shrink-0">
                    进入 →
                  </span>
                </div>

                {/* 描述 */}
                <div className="font-serif text-[10px] text-parchment-200/50 truncate">
                  {card.desc}
                </div>

                {/* 数值 */}
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-bold" style={{ color }}>
                    {value}
                  </span>
                  <span className="font-mono text-[10px] text-parchment-200/40">/100</span>
                  <span className="ml-auto font-mono text-[10px] font-semibold" style={{ color }}>
                    {metricGrade(value)}
                  </span>
                </div>

                {/* mini 进度条 */}
                <div className="progress-track h-1.5 w-full">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>

                {/* 最近 1 条相关新闻 */}
                <div className="mt-1 pt-2 border-t border-gold/10 min-h-[40px]">
                  {latest ? (
                    <div
                      className="rounded-sm border-l-2 bg-ink-900/50 px-1.5 py-1"
                      style={{ borderColor: toneColor }}
                    >
                      <div className="font-serif text-[10px] font-semibold text-parchment-200 leading-tight line-clamp-2">
                        {latest.title}
                      </div>
                      <div className="font-serif text-[9px] text-parchment-200/40 mt-0.5 leading-tight truncate">
                        {latest.summary}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[40px]">
                      <span className="font-serif text-[9px] italic text-parchment-200/25">
                        暂无相关报道
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ============ 3. 国家指标条带（6 项，含 SVG mini 折线图） ============ */}
      <div className="doc-card p-3">
        <div className="flex items-center gap-2 mb-2.5 px-1">
          <span className="font-display text-sm font-semibold tracking-[0.25em] text-gold">
            国 家 指 标
          </span>
          {weakestMetric[1] < 30 && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="font-serif text-[10px] text-red-400 font-bold"
            >
              ⚠ {METRIC_META.find((m) => m.key === weakestMetric[0])?.label} 危急（{weakestMetric[1]}）
            </motion.span>
          )}
          <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          <span className="font-serif text-[9px] italic text-parchment-200/40">点击展开细分</span>
        </div>
        {/* 六项一级指标横向排列 */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {METRIC_META.map((meta) => {
            const value = metrics[meta.key as MetricKey]
            const color = metricColor(value)
            const isExpanded = expandedMetric === meta.key
            const isCritical = value < 20
            const isWarning = value >= 20 && value < 35
            const childCount = SECONDARY_META.filter((s) => s.parent === meta.key).length
            const history = metricHistory[meta.key as MetricKey]

            return (
              <div
                key={meta.key}
                className={`metric-card p-2.5 cursor-pointer ${
                  isCritical ? 'critical' : isWarning ? 'warning' : ''
                }`}
                onClick={() => setExpandedMetric(isExpanded ? null : meta.key)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm">{meta.icon}</span>
                  {childCount > 0 && (
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 font-mono text-[8px] transition-colors ${
                        isExpanded
                          ? 'bg-gold/30 text-gold'
                          : 'bg-parchment-200/10 text-parchment-200/50'
                      }`}
                      title={`展开查看 ${childCount} 项细分指标`}
                    >
                      {childCount}
                      <span className={`inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        ▸
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-serif text-[10px] font-semibold text-parchment-200/70">
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-lg font-bold" style={{ color }}>
                    {value}
                  </span>
                  <span className="font-mono text-[9px] text-parchment-200/40">/100</span>
                </div>
                <div className="progress-track h-1 w-full mt-1">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                {/* mini 折线图：最近 6 个月走势 */}
                <div className="mt-1.5 h-4 w-full">
                  <Sparkline data={history} color={color} />
                </div>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="font-mono text-[8px] font-semibold" style={{ color }}>
                    {metricGrade(value)}
                  </span>
                  {isCritical && <span className="text-[8px] text-red-400 font-bold">危急</span>}
                  {isWarning && (
                    <span className="text-[8px] text-orange-400 font-semibold">警告</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 二级指标详情 */}
        <AnimatePresence>
          {expandedMetric && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-gold/10"
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span className="font-mono text-[10px] text-parchment-200/40">▼</span>
                <span className="font-display text-xs font-semibold tracking-wider text-parchment-200/70">
                  {METRIC_META.find((m) => m.key === expandedMetric)?.label} · 细分指标
                </span>
                <span className="font-serif text-[9px] italic text-parchment-200/40">
                  （由一级指标每月自动推导）
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SECONDARY_META.filter((s) => s.parent === expandedMetric).map((sec) => {
                  const secValue = secondary[sec.key as SecondaryMetricKey]
                  const secColor = metricColor(secValue)
                  const parentValue = metrics[expandedMetric as MetricKey]
                  const delta = secValue - parentValue
                  return (
                    <div
                      key={sec.key}
                      className="rounded border border-gold/10 bg-ink-900/30 p-2"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono text-[10px] text-gold/40">└─</span>
                        <span className="font-serif text-[10px] text-parchment-200/70 flex-1 truncate">
                          {sec.label}
                        </span>
                        {delta !== 0 && (
                          <span
                            className={`font-mono text-[9px] ${
                              delta > 0 ? 'text-emerald-400/70' : 'text-red-400/70'
                            }`}
                            title={`相对一级指标 ${delta > 0 ? '+' : ''}${delta}`}
                          >
                            {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold" style={{ color: secColor }}>
                          {secValue}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3" />
                        <div className="progress-track h-1 flex-1">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: secColor }}
                            initial={{ width: 0 }}
                            animate={{ width: `${secValue}%` }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                          />
                        </div>
                        <span
                          className={`font-mono text-[8px] ${
                            sec.positive ? 'text-emerald-400/50' : 'text-red-400/50'
                          }`}
                          title={sec.positive ? '越高越好' : '越低越好'}
                        >
                          {sec.positive ? '↑' : '↓'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============ 4. 三栏：今日要务 / 内阁快览 / 媒体摘要（加宽） ============ */}
      <div className="grid grid-cols-12 gap-4">
        {/* 左：今日要务（总理行动）— 占 5 列 */}
        <div className="col-span-12 lg:col-span-5 [&>div]:h-full">
          <DailyActionsPanel />
        </div>

        {/* 中：内阁快览 — 占 3 列 */}
        <div className="col-span-12 lg:col-span-3 doc-card p-4 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-display text-xs font-semibold tracking-[0.2em] text-gold">
              内 阁 快 览
            </span>
            {unreadChatCount > 0 && (
              <span className="inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold text-white">
                {unreadChatCount}
              </span>
            )}
            <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
            <button
              onClick={() => setSidePanelPage('cabinet')}
              className="font-mono text-[9px] text-gold/60 hover:text-gold"
            >
              详情 →
            </button>
          </div>
          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[320px]">
            {cabinet.map((member) => {
              const loyaltyColor =
                member.loyalty >= 70
                  ? 'text-green-400'
                  : member.loyalty >= 45
                    ? 'text-orange-400'
                    : 'text-red-400'
              return (
                <div
                  key={member.id}
                  className="rounded border border-gold/10 bg-ink-900/40 p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-[11px] font-semibold text-parchment-200 truncate flex-1">
                      {member.name}
                    </span>
                    <span className={`font-mono text-xs font-bold ${loyaltyColor} shrink-0`}>
                      {member.loyalty}
                    </span>
                  </div>
                  <div className="font-serif text-[9px] text-parchment-200/50 truncate">
                    {member.role}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 右：媒体摘要 — 占 4 列（加宽） */}
        <div className="col-span-12 lg:col-span-4 doc-card p-4 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-display text-xs font-semibold tracking-[0.2em] text-gold">
              媒 体 摘 要
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
            <button
              onClick={() => setGamePage('news')}
              className="font-mono text-[9px] text-gold/60 hover:text-gold"
            >
              全部 →
            </button>
          </div>
          {mediaDigest.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <span className="font-serif text-[10px] italic text-parchment-200/30">
                今日尚无报道
              </span>
            </div>
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[320px]">
              {mediaDigest.map((n) => (
                <div
                  key={n.id}
                  className="rounded-sm border-l-2 bg-ink-900/40 px-2.5 py-2"
                  style={{
                    borderColor:
                      n.tone === 'positive'
                        ? '#10b981'
                        : n.tone === 'negative'
                          ? '#e11d48'
                          : '#f59e0b',
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="font-mono text-[8px] px-1 rounded shrink-0"
                      style={{
                        backgroundColor: 'rgba(245,158,11,0.15)',
                        color: '#fbbf24',
                      }}
                    >
                      {n.category}
                    </span>
                    <span className="font-serif text-[10px] font-semibold text-parchment-200 leading-tight flex-1">
                      {n.title}
                    </span>
                  </div>
                  <div className="font-serif text-[9px] text-parchment-200/50 leading-tight line-clamp-2">
                    {n.summary}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============ 5. 底部：进行中改革 + NPC 闲聊 ============ */}
      <div className="grid grid-cols-12 gap-4">
        {/* 进行中改革 */}
        {activeInitiatives.length > 0 && (
          <div className="col-span-12 lg:col-span-8 doc-card p-4 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-display text-sm font-semibold tracking-[0.25em] text-gold">
                进 行 中 改 革
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
              <button
                onClick={() => setGamePage('initiatives')}
                className="font-mono text-[9px] text-gold/60 hover:text-gold"
              >
                改革树 →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeInitiatives.map((ai) => {
                const progress = (ai.elapsed / ai.duration) * 100
                return (
                  <div
                    key={ai.initiativeId}
                    className="rounded border border-gold/15 bg-ink-900/40 p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-serif text-xs text-parchment-200">{ai.name}</span>
                      <span className="font-mono text-[10px] text-parchment-200/60">
                        {ai.elapsed}/{ai.duration}月
                      </span>
                    </div>
                    <div className="progress-track h-1.5 w-full">
                      <motion.div
                        className="h-full rounded-full bg-gold"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* NPC 闲聊 */}
        <div className={activeInitiatives.length > 0 ? 'col-span-12 lg:col-span-4 [&>div]:h-full' : 'col-span-12 [&>div]:h-full'}>
          <NPCChatter />
        </div>
      </div>
    </div>
  )
}
