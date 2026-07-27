import { motion } from 'motion/react'
import { RotateCcw, Home } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { useSaveGame } from '@/hooks/useSaveGame'
import { METRIC_META, metricColor } from '@/data/metrics'
import { average } from '@/engine/metrics'
import { gradeNarrative } from '@/engine/endings'
import { generateLegacy } from '@/engine/legacySystem'
import type { EndingGrade, MetricKey } from '@/types/game'

const GRADE_COLOR: Record<EndingGrade, string> = {
  S: '#e0c98a',
  A: '#c9a961',
  B: '#7a9d55',
  C: '#b5722a',
  D: '#8b2635',
}

export default function Ending() {
  const state = useGameStore()
  const { pmName, countryName, term, turn, metrics, achievements, endingReason, endingGrade } = state
  const goTo = useGameStore((s) => s.goTo)
  const { deleteSave } = useSaveGame()

  // 防御性检查：如果关键数据缺失，显示错误信息而非崩溃
  if (!metrics || !achievements) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink-900 text-parchment-200">
        <div className="text-center">
          <p className="font-serif text-lg">结算数据加载失败</p>
          <button
            onClick={() => goTo('menu')}
            className="mt-4 rounded bg-amber-600 px-6 py-2 font-serif text-sm text-white hover:bg-amber-700"
          >
            返回主菜单
          </button>
        </div>
      </div>
    )
  }

  const avg = average(metrics)
  const grade = endingGrade ?? 'C'
  const legacy = generateLegacy(state)
  const unlocked = achievements.filter((a) => a.unlocked)

  const handleRestart = async () => {
    await deleteSave()
    goTo('menu')
  }

  const handleMenu = async () => {
    await deleteSave()
    goTo('menu')
  }

  return (
    <div className="bg-ink-grid relative flex h-full w-full justify-center overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${GRADE_COLOR[grade]}22 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10 w-full max-w-3xl px-6 py-10 my-auto" style={{ animation: 'fade-up 0.6s ease-out both' }}>
        {/* 评级字母 */}
        <motion.div
          initial={{ opacity: 0, scale: 2.5, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          <div className="font-mono text-[10px] tracking-[0.5em] text-parchment-200/50">
            执 政 评 级
          </div>
          <div
            className="font-display text-[10rem] font-bold leading-none"
            style={{
              color: GRADE_COLOR[grade],
              textShadow: `0 0 60px ${GRADE_COLOR[grade]}66`,
            }}
          >
            {grade}
          </div>
        </motion.div>

        {/* 结局标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center"
        >
          <h2 className="font-display text-3xl font-semibold text-parchment-50">
            {pmName} 总理 · 第 {term} 届任期终结
          </h2>
          <div className="mt-2 font-mono text-xs tracking-wider text-gold/70">
            执政 {turn} 个月 · 处理事件 {state.eventsHandled} 起
          </div>
        </motion.div>

        {/* 结局原因 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="corner-frame mt-6 rounded-sm border border-gold/20 bg-ink-800/60 p-5"
        >
          <p className="font-serif text-[14px] italic leading-relaxed text-parchment-200/80">
            {endingReason}
          </p>
          <p className="mt-3 font-serif text-[14px] leading-relaxed text-parchment-100/90">
            {gradeNarrative(grade, term, countryName)}
          </p>
        </motion.div>

        {/* 历史教科书评估 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="mt-6"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="font-display text-sm font-semibold tracking-[0.2em] text-gold">
              20 年 后 的 历 史 定 论
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          </div>
          <div className="corner-frame relative rounded-sm border border-gold/25 bg-ink-800/60 p-5">
            <h3 className="text-center font-display text-2xl font-bold text-gold-light">
              「{legacy.historicalTitle}」
            </h3>
            <div className="mt-4 border-l-2 border-gold/70 pl-4">
              <p className="font-serif text-[13px] italic leading-relaxed text-parchment-200/85">
                {legacy.textbookEvaluation}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {legacy.historicalTags.map((tag) => (
                <span
                  key={tag}
                  className="tag border-gold/40 bg-gold/10 text-gold-light"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* 退任头条新闻 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
          className="mt-6"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="font-display text-sm font-semibold tracking-[0.2em] text-gold">
              退 任 头 条
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          </div>
          <div className="bg-parchment-texture rounded-sm border border-gold/30 p-5 shadow-seal">
            <div className="border-b-2 border-ink-900/30 pb-2 text-center">
              <span className="font-display text-xs font-bold tracking-[0.3em] text-ink-900/70">
                国 家 早 报
              </span>
            </div>
            <h3 className="mt-3 text-center font-display text-2xl font-bold text-ink-900">
              {legacy.retirementHeadline}
            </h3>
            <p className="mt-2 text-center font-serif text-sm text-ink-900/80">
              {legacy.headlineSubtitle}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-ink-900/20 pt-2 font-mono text-[10px] text-ink-900/60">
              <span>
                {state.year} 年 {state.month} 月 {state.day} 日
              </span>
              <span>· 头版头条 ·</span>
            </div>
          </div>
        </motion.div>

        {/* 回忆录畅销度 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="mt-6"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="font-display text-sm font-semibold tracking-[0.2em] text-gold">
              总 理 回 忆 录
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          </div>
          <div className="rounded-sm border border-gold/20 bg-ink-800/60 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-xl font-semibold text-parchment-50">
                {legacy.memoirTitle}
              </h3>
              <span className="shrink-0 font-mono text-sm font-semibold text-gold">
                {legacy.memoirPopularity}%
              </span>
            </div>
            <div className="progress-track mt-3 h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${legacy.memoirPopularity}%` }}
                transition={{ delay: 1.7, duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light"
              />
            </div>
            <p className="mt-3 font-serif text-[13px] italic text-parchment-200/75">
              {legacy.memoirPopularity >= 80
                ? '现象级畅销书，多次加印，成为政治学院的必读书目。'
                : legacy.memoirPopularity >= 50
                  ? '登上畅销榜，获得一定关注，评论界反响尚可。'
                  : legacy.memoirPopularity >= 30
                    ? '销量平平，仅在小圈子流传，很快被遗忘。'
                    : '无人问津，很快下架，成为打折堆里的滞销货。'}
            </p>
          </div>
        </motion.div>

        {/* 肖像画描述 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, duration: 0.6 }}
          className="mt-6"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="font-display text-sm font-semibold tracking-[0.2em] text-gold">
              历 史 肖 像
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
          </div>
          <div className="rounded-sm border-4 border-gold/60 bg-ink-900 p-5 shadow-gold">
            <div className="flex flex-col items-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-gold/40 bg-ink-800 text-6xl">
                👤
              </div>
              <p className="mt-4 text-center font-serif text-[13px] italic leading-relaxed text-parchment-200/80">
                {legacy.portraitDescription}
              </p>
            </div>
          </div>
        </motion.div>

        {/* 最终指标 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9, duration: 0.6 }}
          className="mt-6"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="font-display text-sm font-semibold tracking-[0.2em] text-gold">
              最 终 国 力
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
            <span className="font-mono text-sm font-semibold text-gold">综合 {avg}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {METRIC_META.map((meta, i) => {
              const value = metrics[meta.key as MetricKey]
              return (
                <motion.div
                  key={meta.key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 + i * 0.05, duration: 0.4 }}
                  className="rounded-sm border border-gold/15 bg-ink-800/50 p-2.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{meta.icon}</span>
                    <span className="font-serif text-xs text-parchment-200/70">
                      {meta.label}
                    </span>
                  </div>
                  <div
                    className="mt-1 font-mono text-2xl font-semibold"
                    style={{ color: metricColor(value) }}
                  >
                    {value}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* 成就墙 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="mt-6"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="font-display text-sm font-semibold tracking-[0.2em] text-gold">
              执 政 勋 章
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
            <span className="font-mono text-xs text-parchment-200/60">
              {unlocked.length} / {achievements.length}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {achievements.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5 + i * 0.06, duration: 0.4 }}
                className={`flex flex-col items-center rounded-sm border p-2.5 text-center ${
                  a.unlocked
                    ? 'border-gold/50 bg-gold/10 shadow-gold'
                    : 'border-ink-600 bg-ink-800/30 opacity-40'
                }`}
              >
                <span className={`text-2xl ${a.unlocked ? '' : 'grayscale'}`}>
                  {a.unlocked ? a.icon : '🔒'}
                </span>
                <span className="mt-1 font-serif text-[11px] font-semibold text-parchment-100">
                  {a.name}
                </span>
                <span className="mt-0.5 font-serif text-[9px] leading-tight text-parchment-200/50">
                  {a.desc}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 操作按钮 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6, duration: 0.6 }}
          className="mt-8 flex justify-center gap-4"
        >
          <button onClick={handleRestart} className="btn-gold animate-pulse-gold px-8 py-3">
            <RotateCcw size={16} className="text-gold" />
            <span className="font-display text-base font-semibold">再 度 出 山</span>
          </button>
          <button onClick={handleMenu} className="btn-gold px-8 py-3">
            <Home size={16} className="text-gold" />
            <span className="font-display text-base font-semibold">返 回 主 菜 单</span>
          </button>
        </motion.div>
      </div>
    </div>
  )
}
