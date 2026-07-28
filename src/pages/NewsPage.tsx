import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import type { NewsItem } from '@/types/game'

/** 新闻页面（独立全屏）—— 报纸式排版 */
export default function NewsPage() {
  const news = useGameStore((s) => s.news)
  const year = useGameStore((s) => s.year)
  const month = useGameStore((s) => s.month)
  const day = useGameStore((s) => s.day)
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all')

  // 分类统计
  const counts = useMemo(() => ({
    all: news.length,
    positive: news.filter((n) => n.tone === 'positive').length,
    negative: news.filter((n) => n.tone === 'negative').length,
    neutral: news.filter((n) => n.tone === 'neutral').length,
  }), [news])

  // 过滤后的新闻
  const filteredNews = useMemo(() => {
    const list = filter === 'all' ? news : news.filter((n) => n.tone === filter)
    // 按时间倒序（最新在前）；原数组已是新到旧，保持稳定
    return list
  }, [news, filter])

  // 头条要闻：最新的正面或负面新闻（取最新一条非中性）
  const featured = useMemo(() => {
    const nonNeutral = news.filter((n) => n.tone !== 'neutral')
    return nonNeutral[0] ?? null
  }, [news])

  // 列表新闻：排除头条后的过滤结果
  const listNews = useMemo(() => {
    return filteredNews.filter((n) => n.id !== featured?.id)
  }, [filteredNews, featured])

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2">
      {/* ============ 报纸式头部 ============ */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-4 overflow-hidden rounded-lg"
        style={{
          background:
            'linear-gradient(135deg, rgba(58,36,24,0.95) 0%, rgba(42,24,16,0.95) 100%)',
          border: '1px solid transparent',
          backgroundImage:
            'linear-gradient(135deg, rgba(58,36,24,0.95) 0%, rgba(42,24,16,0.95) 100%), linear-gradient(135deg, rgba(245,158,11,0.55), rgba(190,18,60,0.35), rgba(245,158,11,0.55))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        }}
      >
        {/* 装饰角线 */}
        <div className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 border-l-2 border-t-2 border-gold/60" />
        <div className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 border-r-2 border-t-2 border-gold/60" />
        <div className="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3 border-b-2 border-l-2 border-gold/60" />
        <div className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 border-b-2 border-r-2 border-gold/60" />

        <div className="relative px-6 py-4 text-center">
          {/* 报头标题 */}
          <div className="flex items-center justify-center gap-3 mb-1">
            <span className="text-xl">📰</span>
            <h1 className="font-display text-2xl font-extrabold tracking-[0.3em] text-parchment-100">
              国 家 新 闻 中 心
            </h1>
            <span className="text-xl">📰</span>
          </div>
          {/* 副标题装饰线 */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-gold/50" />
            <span className="font-mono text-[10px] text-gold/70 tracking-widest">
              THE NATIONAL CHRONICLE
            </span>
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          {/* 日期与期号 */}
          <div className="flex items-center justify-center gap-4 font-mono text-[10px] text-parchment-200/60">
            <span>📅 {year} 年 {month} 月 {day} 日</span>
            <span className="text-gold/40">|</span>
            <span>第 {news.length} 期</span>
            <span className="text-gold/40">|</span>
            <span>总发布 {news.length} 条</span>
          </div>
          {/* 装饰分隔线 */}
          <div className="mt-3 flex items-center gap-2">
            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-gold/40 to-gold/60" />
            <span className="text-gold/60 text-xs">◆</span>
            <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent via-gold/40 to-gold/60" />
          </div>
        </div>
      </motion.div>

      {/* ============ 过滤标签 ============ */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {([
          { key: 'all', label: '全部', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
          { key: 'positive', label: '正面', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
          { key: 'negative', label: '负面', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
          { key: 'neutral', label: '中性', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
        ] as const).map((tab) => {
          const active = filter === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-serif text-xs font-semibold transition-all ${
                active
                  ? 'text-ink-900 shadow-md'
                  : 'bg-ink-800/60 text-parchment-200/60 hover:bg-ink-700/60'
              }`}
              style={active ? { backgroundColor: tab.color } : undefined}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 font-mono text-[9px] font-bold ${
                  active ? 'bg-ink-900/30 text-ink-900' : 'bg-ink-900/40'
                }`}
                style={!active ? { color: tab.color } : undefined}
              >
                {counts[tab.key]}
              </span>
            </button>
          )
        })}
      </div>

      {/* ============ 头条要闻 ============ */}
      {featured && filter === 'all' && (
        <FeaturedNewsCard item={featured} />
      )}

      {/* ============ 新闻列表 ============ */}
      <div className="flex-1 pb-4">
        {listNews.length === 0 && !featured && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3 opacity-30">📰</div>
            <div className="font-serif text-sm text-parchment-200/40">暂无新闻</div>
          </div>
        )}
        {listNews.length === 0 && featured && filter !== 'all' && (
          <div className="text-center py-8">
            <div className="font-serif text-xs text-parchment-200/40">
              当前筛选下无更多新闻
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {listNews.map((item, i) => (
            <NewsCard key={item.id} item={item} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** 头条要闻大卡片 */
function FeaturedNewsCard({ item }: { item: NewsItem }) {
  const toneColor = item.tone === 'positive' ? '#10b981' : item.tone === 'negative' ? '#ef4444' : '#9ca3af'
  const toneLabel = item.tone === 'positive' ? '正面' : item.tone === 'negative' ? '负面' : '中性'
  const catIcon = getCategoryIcon(item.category)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="doc-card relative mb-4 overflow-hidden"
      style={{
        borderLeft: `4px solid ${toneColor}`,
      }}
    >
      {/* 头条标识 */}
      <div className="absolute top-0 right-0 flex items-center gap-1 rounded-bl-lg bg-gold/20 px-2 py-1">
        <span className="text-[10px]">🔴</span>
        <span className="font-display text-[10px] font-bold tracking-widest text-gold">
          头 条 要 闻
        </span>
      </div>

      <div className="p-4 pt-6">
        {/* 分类 + 语气 */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold"
            style={{ color: toneColor, backgroundColor: `${toneColor}22` }}
          >
            {catIcon} {item.category}
          </span>
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold"
            style={{ color: toneColor, backgroundColor: `${toneColor}22` }}
          >
            {toneLabel}
          </span>
        </div>

        {/* 标题 */}
        <h2 className="font-display text-lg font-extrabold text-parchment-100 mb-1.5 leading-snug">
          {item.title}
        </h2>

        {/* 摘要 */}
        <p className="font-serif text-xs text-parchment-200/65 leading-relaxed mb-2">
          {item.summary}
        </p>

        {/* 时间戳 */}
        <div className="flex items-center justify-between">
          <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent mr-3" />
          <span className="font-mono text-[10px] text-parchment-200/40">
            {item.timestamp}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/** 单条新闻卡片 */
function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const toneColor = item.tone === 'positive' ? '#10b981' : item.tone === 'negative' ? '#ef4444' : '#9ca3af'
  const toneLabel = item.tone === 'positive' ? '正面' : item.tone === 'negative' ? '负面' : '中性'
  const catIcon = getCategoryIcon(item.category)
  const catColor = getCategoryColor(item.category)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
      whileHover={{ y: -2 }}
      className="doc-card relative overflow-hidden transition-all hover:border-gold/40 hover:shadow-gold cursor-default"
      style={{
        borderLeft: `3px solid ${toneColor}`,
      }}
    >
      <div className="p-3">
        {/* 顶部：分类 + 语气 + 时间 */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold shrink-0"
              style={{ color: catColor, backgroundColor: `${catColor}18` }}
            >
              {catIcon} {item.category}
            </span>
            <span
              className="rounded px-1 py-0.5 font-mono text-[8px] font-bold shrink-0"
              style={{ color: toneColor, backgroundColor: `${toneColor}18` }}
            >
              {toneLabel}
            </span>
          </div>
          <span className="font-mono text-[9px] text-parchment-200/40 shrink-0">
            {item.timestamp}
          </span>
        </div>

        {/* 标题（serif 加粗） */}
        <h3 className="font-display text-sm font-bold text-parchment-100 mb-1 leading-snug">
          {item.title}
        </h3>

        {/* 摘要（较浅字体） */}
        <p className="font-serif text-[11px] text-parchment-200/55 leading-relaxed">
          {item.summary}
        </p>
      </div>
    </motion.div>
  )
}

/** 分类图标 */
function getCategoryIcon(cat: string): string {
  const map: Record<string, string> = {
    '经济': '📈',
    '外交': '🤝',
    '社会': '👥',
    '军事': '⚔️',
    '环境': '🌱',
    '突发': '⚡',
    '政治体制': '🏛️',
    '决策': '📋',
    '改革': '🔧',
    '议会': '🏛️',
    '内阁': '👔',
    '紧急': '🚨',
  }
  return map[cat] ?? '📰'
}

/** 分类颜色 */
function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    '经济': '#fbbf24',
    '外交': '#3b82f6',
    '社会': '#a855f7',
    '军事': '#ef4444',
    '环境': '#22c55e',
    '突发': '#fb923c',
    '政治体制': '#6366f1',
    '决策': '#9ca3af',
    '改革': '#d97706',
    '议会': '#06b6d4',
    '内阁': '#ec4899',
    '紧急': '#dc2626',
  }
  return map[cat] ?? '#e8dcc4'
}
