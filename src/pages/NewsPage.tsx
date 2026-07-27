import { motion } from 'motion/react'
import { useGameStore } from '@/store/gameStore'

/** 新闻页面（独立全屏） */
export default function NewsPage() {
  const news = useGameStore((s) => s.news)

  const toneStyle = (tone: string) => {
    switch (tone) {
      case 'positive': return 'border-green-600/30 bg-green-900/10'
      case 'negative': return 'border-red-600/30 bg-red-900/10'
      default: return 'border-gold/15 bg-ink-800/60'
    }
  }

  const toneDot = (tone: string) => {
    switch (tone) {
      case 'positive': return 'bg-green-500'
      case 'negative': return 'bg-red-500'
      default: return 'bg-parchment-200/40'
    }
  }

  const categoryLabel = (cat: string) => {
    const colors: Record<string, string> = {
      '经济': 'text-yellow-400',
      '外交': 'text-blue-400',
      '社会': 'text-purple-400',
      '军事': 'text-red-400',
      '环境': 'text-green-400',
      '突发': 'text-orange-400',
      '政治体制': 'text-indigo-400',
      '决策': 'text-parchment-200/60',
      '改革': 'text-gold',
      '议会': 'text-cyan-400',
      '内阁': 'text-pink-400',
      '紧急': 'text-red-500',
    }
    return colors[cat] ?? 'text-parchment-200/60'
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          新 闻 中 心
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
      </div>

      {/* 统计 */}
      <div className="doc-card p-3 mb-4 flex items-center gap-6">
        <div>
          <span className="font-serif text-[10px] text-parchment-200/50">总新闻数</span>
          <div className="font-mono text-lg font-bold text-parchment-100">{news.length}</div>
        </div>
        <div>
          <span className="font-serif text-[10px] text-parchment-200/50">正面</span>
          <div className="font-mono text-lg font-bold text-green-400">
            {news.filter((n) => n.tone === 'positive').length}
          </div>
        </div>
        <div>
          <span className="font-serif text-[10px] text-parchment-200/50">负面</span>
          <div className="font-mono text-lg font-bold text-red-400">
            {news.filter((n) => n.tone === 'negative').length}
          </div>
        </div>
        <div>
          <span className="font-serif text-[10px] text-parchment-200/50">中性</span>
          <div className="font-mono text-lg font-bold text-parchment-200/60">
            {news.filter((n) => n.tone === 'neutral').length}
          </div>
        </div>
      </div>

      {/* 新闻列表 */}
      <div className="flex-1 space-y-2 pb-4">
        {news.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3 opacity-30">📰</div>
            <div className="font-serif text-sm text-parchment-200/40">暂无新闻</div>
          </div>
        )}
        {news.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`doc-card p-3 ${toneStyle(item.tone)}`}
          >
            <div className="flex items-start gap-2">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${toneDot(item.tone)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`font-serif text-[10px] ${categoryLabel(item.category)}`}>
                    {item.category}
                  </span>
                  <span className="font-mono text-[9px] text-parchment-200/30">
                    {item.timestamp}
                  </span>
                </div>
                <div className="font-serif text-xs font-semibold text-parchment-100 mb-1">
                  {item.title}
                </div>
                <div className="font-serif text-[11px] text-parchment-200/60 leading-relaxed">
                  {item.summary}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
