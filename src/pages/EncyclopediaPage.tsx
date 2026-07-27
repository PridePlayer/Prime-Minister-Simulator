import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import {
  ENCYCLOPEDIA_ENTRIES,
  ENCYCLOPEDIA_CATEGORIES,
  type EncyclopediaEntry,
} from '@/data/encyclopedia'
import type { GamePage } from '@/types/game'

/** 类别筛选 chip 选项 */
type CategoryFilter = '全部' | EncyclopediaEntry['category']

/** 类别对应的主题色（用于 chip 与标题点缀） */
const CATEGORY_COLOR: Record<EncyclopediaEntry['category'], string> = {
  指标: '#f59e0b',
  页面: '#60a5fa',
  机制: '#a78bfa',
  资源: '#34d399',
}

/** 百科全书页面：检索游戏所有指标、页面、机制、资源的说明 */
export default function EncyclopediaPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('全部')
  const [selectedId, setSelectedId] = useState<string | null>(
    ENCYCLOPEDIA_ENTRIES[0]?.id ?? null,
  )

  // 按搜索词与类别过滤条目
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ENCYCLOPEDIA_ENTRIES.filter((e) => {
      if (activeCategory !== '全部' && e.category !== activeCategory) return false
      if (!q) return true
      // 命中标题、摘要、关键词、ID 任一即可
      const haystack = [
        e.title,
        e.summary,
        e.id,
        ...(e.keywords ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [search, activeCategory])

  // 当前选中的条目
  const selected = useMemo(
    () => ENCYCLOPEDIA_ENTRIES.find((e) => e.id === selectedId) ?? null,
    [selectedId],
  )

  // 各类别条目计数（用于 chip 显示）
  const countByCategory = useMemo(() => {
    const map: Record<string, number> = { 全部: ENCYCLOPEDIA_ENTRIES.length }
    for (const cat of ENCYCLOPEDIA_CATEGORIES) {
      map[cat] = ENCYCLOPEDIA_ENTRIES.filter((e) => e.category === cat).length
    }
    return map
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* 顶部标题 + 搜索框 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">📚</span>
        <span className="font-display text-lg font-bold tracking-[0.25em] text-gold">
          百 科 全 书
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        <span className="font-mono text-[10px] text-parchment-200/40">
          快捷键 H 呼出 · 共 {ENCYCLOPEDIA_ENTRIES.length} 条
        </span>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-2">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-parchment-200/40 text-sm pointer-events-none">
          🔍
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索条目标题、关键词或 ID……"
          className="w-full rounded border border-gold/20 bg-ink-900/60 py-2 pl-9 pr-3 font-serif text-xs text-parchment-100 placeholder:text-parchment-200/30 outline-none focus:border-gold/50 focus:bg-ink-900/80 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 font-mono text-[10px] text-parchment-200/40 hover:text-parchment-100"
          >
            ✕
          </button>
        )}
      </div>

      {/* 类别筛选 chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {(['全部', ...ENCYCLOPEDIA_CATEGORIES] as CategoryFilter[]).map((cat) => {
          const active = activeCategory === cat
          const color = cat === '全部' ? '#f59e0b' : CATEGORY_COLOR[cat]
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-serif text-xs font-semibold transition-all ${
                active
                  ? 'bg-gold text-ink-900 shadow-md'
                  : 'bg-ink-800/60 text-parchment-200/60 hover:bg-ink-700/60'
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${active ? 'bg-ink-900/70' : ''}`}
                style={!active ? { backgroundColor: color } : undefined}
              />
              <span>{cat}</span>
              <span
                className={`font-mono text-[9px] ${active ? 'text-ink-900/60' : 'text-parchment-200/30'}`}
              >
                {countByCategory[cat] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* 两栏布局：左侧列表 + 右侧详情 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 min-h-0">
        {/* 左侧：条目列表 */}
        <div className="overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="doc-card p-4 text-center">
              <div className="font-serif text-xs text-parchment-200/50">
                未找到匹配条目
              </div>
              <button
                onClick={() => {
                  setSearch('')
                  setActiveCategory('全部')
                }}
                className="mt-2 rounded bg-ink-700 px-2 py-1 font-serif text-[11px] text-parchment-200 hover:bg-ink-600"
              >
                重置筛选
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {filtered.map((entry) => (
                  <EntryListItem
                    key={entry.id}
                    entry={entry}
                    isActive={entry.id === selectedId}
                    onSelect={() => setSelectedId(entry.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* 右侧：条目详情 */}
        <div className="overflow-y-auto pl-1">
          {selected ? (
            <EntryDetail
              key={selected.id}
              entry={selected}
              onSelectRelated={(id) => setSelectedId(id)}
            />
          ) : (
            <div className="doc-card p-6 text-center">
              <div className="font-serif text-sm text-parchment-200/50">
                请从左侧选择条目查看详情
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** 列表中的单条条目 */
function EntryListItem({
  entry,
  isActive,
  onSelect,
}: {
  entry: EncyclopediaEntry
  isActive: boolean
  onSelect: () => void
}) {
  const color = CATEGORY_COLOR[entry.category]
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      whileHover={{ x: 2 }}
      onClick={onSelect}
      className={`doc-card w-full p-2.5 text-left transition-all ${
        isActive
          ? 'border-gold/60 bg-gradient-to-br from-gold/10 to-transparent shadow-seal'
          : 'hover:border-gold/30 hover:bg-ink-800/60'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{entry.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="font-serif text-xs font-bold text-parchment-100 truncate">
              {entry.title}
            </span>
          </div>
          <div className="font-mono text-[9px] text-parchment-200/40 truncate mt-0.5">
            {entry.summary}
          </div>
        </div>
        <span
          className="rounded px-1 py-0.5 font-mono text-[8px] font-bold shrink-0"
          style={{
            color,
            backgroundColor: `${color}22`,
          }}
        >
          {entry.category}
        </span>
      </div>
    </motion.button>
  )
}

/** 右侧详情面板 */
function EntryDetail({
  entry,
  onSelectRelated,
}: {
  entry: EncyclopediaEntry
  onSelectRelated: (id: string) => void
}) {
  const setGamePage = useGameStore((s) => s.setGamePage)
  const color = CATEGORY_COLOR[entry.category]
  const relatedEntries = useMemo(
    () =>
      (entry.related ?? [])
        .map((id) => ENCYCLOPEDIA_ENTRIES.find((e) => e.id === id))
        .filter((e): e is EncyclopediaEntry => !!e),
    [entry.related],
  )

  const handleJump = () => {
    if (entry.pageJump) setGamePage(entry.pageJump as GamePage)
  }

  return (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="doc-card p-4"
      style={{ borderColor: `${color}44` }}
    >
      {/* 标题区 */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl shrink-0">{entry.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
              style={{ color, backgroundColor: `${color}22` }}
            >
              {entry.category}
            </span>
            <span className="font-mono text-[9px] text-parchment-200/40">
              {entry.id}
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-parchment-100">
            {entry.title}
          </h2>
          <p className="font-serif text-xs text-parchment-200/70 mt-1 leading-relaxed">
            {entry.summary}
          </p>
        </div>
      </div>

      {/* 前往该页面按钮 */}
      {entry.pageJump && (
        <div className="mb-3">
          <button
            onClick={handleJump}
            className="w-full rounded border border-gold/40 bg-gold/15 px-3 py-1.5 font-serif text-xs font-bold text-gold transition-all hover:bg-gold/25 hover:border-gold/60"
          >
            前往该页面 →
          </button>
        </div>
      )}

      <div className="h-px bg-gradient-to-r from-gold/30 to-transparent mb-3" />

      {/* 详细说明 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-display text-xs font-bold tracking-widest text-gold">
            详细说明
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
        </div>
        <div className="space-y-2">
          {entry.details.map((para, i) => (
            <p
              key={i}
              className="font-serif text-[12px] text-parchment-200/80 leading-relaxed"
            >
              {para}
            </p>
          ))}
        </div>
      </div>

      {/* 关键词 */}
      {entry.keywords && entry.keywords.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-display text-xs font-bold tracking-widest text-gold">
              关键词
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {entry.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded bg-ink-900/60 px-1.5 py-0.5 font-mono text-[10px] text-parchment-200/60"
              >
                #{kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 参见：相关条目 */}
      {relatedEntries.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-display text-xs font-bold tracking-widest text-gold">
              参见
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {relatedEntries.map((rel) => (
              <button
                key={rel.id}
                onClick={() => onSelectRelated(rel.id)}
                className="flex items-center gap-2 rounded border border-parchment-200/10 bg-ink-900/40 px-2 py-1.5 text-left transition-all hover:border-gold/30 hover:bg-ink-800/60"
              >
                <span className="text-sm shrink-0">{rel.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-[11px] font-bold text-parchment-100 truncate">
                    {rel.title}
                  </div>
                  <div className="font-mono text-[9px] text-parchment-200/40 truncate">
                    {rel.summary}
                  </div>
                </div>
                <span
                  className="rounded px-1 py-0.5 font-mono text-[8px] font-bold shrink-0"
                  style={{
                    color: CATEGORY_COLOR[rel.category],
                    backgroundColor: `${CATEGORY_COLOR[rel.category]}22`,
                  }}
                >
                  {rel.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
