import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import {
  REGIONS,
  GOVERNORS,
  REGION_ACTIONS,
  GOVERNOR_INTERACTIONS,
  FACTION_LABELS,
  GOVERNOR_TRAIT_META,
  RegionActionDef,
  GovernorInteractionDef,
} from '@/data/regions'
import { INITIAL_COUNTRIES } from '@/data/diplomacy'
import { metricGrade, metricColor } from '@/data/metrics'
import type { Region, LocalGovernor, RegionId, GameState, Metrics } from '@/types/game'

/**
 * 国家档案：立国史（多段落叙事）+ 实时现状速写（基于游戏状态动态生成）
 *
 * 立国史为静态文本，描述共和国从立宪到当代的脉络；
 * 现状速写为函数生成，依据当前 metrics / regions / countries / 议会 / 内阁
 * 等要素，让玩家每次打开页面都能读到贴合当前局势的文字。
 */

interface HistoryParagraph {
  era: string
  title: string
  icon: string
  body: string
}

/** 立国史：分四个时期，每段约 100–160 字 */
const COUNTRY_HISTORY: HistoryParagraph[] = [
  {
    era: '立宪之初',
    title: '旧王朝落幕与新宪诞生',
    icon: '📜',
    body: '约莫六十年前，旧王朝因连年征役、税赋苛重而丧失民心。地方实力派与新兴商贾在首都议会大厦签署《共和宪章》，宣告废除君主制，建立责任内阁制共和国。首任总理由议会推举产生，象征行政权正式归于人民代议机构。宪法保留总统作为虚位元首，主理礼仪与军队统帅，实权则归总理与内阁。这场不流血的政权更迭被后世称为「大厦之变」，奠定了共和国此后数十年的政治格局。',
  },
  {
    era: '中兴年代',
    title: '工业勃兴与海外扩张',
    icon: '🏭',
    body: '立宪后第二个十年，共和国迎来工业起飞期。东海工业带的港口与钢铁厂拔地而起，南方商埠成为远洋贸易枢纽，国库岁入翻番。这一时期内阁推动大规模铁路建设与基础教育普及，识字率由两成跃升至六成。海外领地也在此时纳入版图，成为共和国远洋航运的中继站。然而，飞速工业化也埋下隐忧：劳资矛盾尖锐、东西部发展失衡、乡村凋敝，社会运动的火种悄然埋下。',
  },
  {
    era: '动荡岁月',
    title: '三届悬浮议会与军人干政',
    icon: '⚔️',
    body: '约莫二十年前，共和国经历了连续三届悬浮议会——无一政党能独立组阁，联合政府频繁更迭，政令难出总理府。期间军方一度以"维持秩序"为名介入政局，引发宪政危机。最终在各派妥协下通过《国防中立宪章》，明确军队不得干政。这段动荡让人民对议会民主产生短暂动摇，也让后世内阁深知：稳定不是理所当然，需要持续的经营与权衡。',
  },
  {
    era: '当代格局',
    title: '新政府上台与待解之局',
    icon: '🏛️',
    body: '本次大选后，新总理带领执政党走马上任。当前共和国面临内外多重考验：经济增长乏力、地区发展不均、邻邦关系紧绷、地方实力派盘根错节。议会内反对党虎视眈眈，总统府亦在静观新政府的成色。国际舆论普遍认为，本届内阁的任期将决定共和国未来二十年的国运走向——是重现中兴，还是重陷动荡，皆取决于总理的每一次抉择。',
  },
]

/** 现状速写：依据当前游戏状态生成多维度叙述 */
function generateCurrentSituation(state: GameState): { title: string; body: string; tone: 'positive' | 'warning' | 'danger' | 'neutral' }[] {
  const m = state.metrics
  const sec = state.secondary
  const regions = state.regions ?? REGIONS
  const governors = state.governors ?? GOVERNORS
  const countries = state.countries ?? INITIAL_COUNTRIES
  const paragraphs: { title: string; body: string; tone: 'positive' | 'warning' | 'danger' | 'neutral' }[] = []

  // 1. 政局稳定性
  {
    let tone: 'positive' | 'warning' | 'danger' | 'neutral' = 'neutral'
    if (m.stability >= 65) tone = 'positive'
    else if (m.stability >= 40) tone = 'warning'
    else tone = 'danger'
    const grade = metricGrade(m.stability)
    paragraphs.push({
      title: '政局稳定度',
      body: `当前政局评估为「${grade}」（${m.stability.toFixed(0)}分）。${
        m.stability >= 65
          ? '内阁施政顺畅，议会反对声浪稀薄，街头未见大规模抗议。地方对中央政令执行率高，社会秩序井然。'
          : m.stability >= 40
          ? '反对党在议会内不时发难，部分地区出现零星示威。政令虽能下达，但执行效率因派系博弈而打折。'
          : '政局动荡显著：多地爆发抗议，议会内不信任动议频繁提出，部分地方长官对中央政令阳奉阴违。'
      }${sec ? `犯罪率指数 ${sec.crimeRate.toFixed(0)}、抗议频率指数 ${sec.protestFrequency.toFixed(0)}、社会团结度 ${sec.socialCohesion.toFixed(0)}。` : ''}`,
      tone,
    })
  }

  // 2. 经济形势
  {
    let tone: 'positive' | 'warning' | 'danger' | 'neutral' = 'neutral'
    if (m.economy >= 65) tone = 'positive'
    else if (m.economy >= 40) tone = 'warning'
    else tone = 'danger'
    const grade = metricGrade(m.economy)
    paragraphs.push({
      title: '经济形势',
      body: `经济运行评估为「${grade}」（${m.economy.toFixed(0)}分）。${
        m.economy >= 65
          ? '工业产出与就业率双高位运行，外贸订单充裕，财政收入稳健。市场对本届内阁经济政策持乐观态度。'
          : m.economy >= 40
          ? '经济增长乏力，部分行业出现萎缩迹象，失业率攀升。国库承压，需要新的增长引擎或财政节流。'
          : '经济陷入衰退区间：工厂裁员、税收锐减、通胀抬头。若不及时扭转，将引发连锁性社会危机。'
      }${sec ? `工业产出 ${sec.industrialOutput.toFixed(0)}、就业率 ${sec.employmentRate.toFixed(0)}、通胀率 ${sec.inflationRate.toFixed(0)}。` : ''}`,
      tone,
    })
  }

  // 3. 财政状况
  {
    let tone: 'positive' | 'warning' | 'danger' | 'neutral' = 'neutral'
    if (m.treasury >= 60) tone = 'positive'
    else if (m.treasury >= 35) tone = 'warning'
    else tone = 'danger'
    const grade = metricGrade(m.treasury)
    paragraphs.push({
      title: '财政状况',
      body: `国库充盈度评估为「${grade}」（${m.treasury.toFixed(0)}分）。${
        m.treasury >= 60
          ? '财政宽裕，足以支撑大型基建、改革与外交斡旋。可考虑减税让利或加大民生投入以巩固民意。'
          : m.treasury >= 35
          ? '财政尚可维持日常运转，但应对突发支出的缓冲有限。重大改革需精打细算，避免赤字失控。'
          : '财政紧张：债务攀升、外汇储备下滑，部分地方政府已欠薪数月。亟需开源节流，否则将被迫削减公共服务。'
      }${sec ? `财政盈余 ${sec.fiscalSurplus.toFixed(0)}、债务水平 ${sec.debtLevel.toFixed(0)}、外汇储备 ${sec.forexReserves.toFixed(0)}。` : ''}`,
      tone,
    })
  }

  // 4. 民心向背
  {
    let tone: 'positive' | 'warning' | 'danger' | 'neutral' = 'neutral'
    if (m.approval >= 55) tone = 'positive'
    else if (m.approval >= 35) tone = 'warning'
    else tone = 'danger'
    const grade = metricGrade(m.approval)
    paragraphs.push({
      title: '民心向背',
      body: `总理民意支持率评估为「${grade}」（${m.approval.toFixed(0)}分）。${
        m.approval >= 55
          ? '城市与乡村、青年与长者各群体普遍认可本届内阁施政方向。媒体评论积极，下届大选胜算可观。'
          : m.approval >= 35
          ? '民意出现分化：核心支持者仍稳固，但中间选民开始动摇。需要新的政策亮点或外交成就重聚人心。'
          : '民怨明显累积：街头流行讥讽总理的顺口溜，网络舆论风向不利。若任其发展，党内可能出现逼宫声音。'
      }${sec ? `城市支持 ${sec.urbanSupport.toFixed(0)}、农村支持 ${sec.ruralSupport.toFixed(0)}、青年支持 ${sec.youthSupport.toFixed(0)}。` : ''}`,
      tone,
    })
  }

  // 5. 外交态势
  {
    let tone: 'positive' | 'warning' | 'danger' | 'neutral' = 'neutral'
    if (m.diplomacy >= 60) tone = 'positive'
    else if (m.diplomacy >= 40) tone = 'warning'
    else tone = 'danger'
    const neighbors = countries.filter((c) => c.isNeighbor)
    const hostileCount = countries.filter((c) => c.relation < 35).length
    const allyCount = countries.filter((c) => c.relation >= 70).length
    const grade = metricGrade(m.diplomacy)
    paragraphs.push({
      title: '外交态势',
      body: `共和国国际地位评估为「${grade}」（${m.diplomacy.toFixed(0)}分）。共有 ${neighbors.length} 个邻邦，其中关系紧密者 ${allyCount} 国、关系紧张者 ${hostileCount} 国。${
        m.diplomacy >= 60
          ? '主要大国关系稳定，国际组织影响力上升，可推动新的贸易协定或多边倡议。'
          : m.diplomacy >= 40
          ? '部分邻邦关系平稳，但大国博弈中共和国尚处被动。需要在外交上更主动布局。'
          : '外交处境艰难：邻邦戒备、大国施压、国际组织批评。任何激进举动都可能引发连锁反应。'
      }`,
      tone,
    })
  }

  // 6. 地方动态
  {
    const risky = regions.filter((r) => r.loyalty < 40 || r.stability < 35)
    const strong = regions.filter((r) => r.loyalty > 65 && r.stability > 60)
    const corruptedGov = governors.filter((g) => g.corruption > 60).length
    let tone: 'positive' | 'warning' | 'danger' | 'neutral' = 'neutral'
    if (risky.length === 0 && corruptedGov === 0) tone = 'positive'
    else if (risky.length <= 2 && corruptedGov <= 1) tone = 'warning'
    else tone = 'danger'
    paragraphs.push({
      title: '地方动态',
      body: `八区之中，治理稳健者 ${strong.length} 区，动荡不安者 ${risky.length} 区，腐败问题显著的长官 ${corruptedGov} 位。${
        risky.length === 0
          ? '各区对中央政令执行到位，地方忠诚度整体向好，无显著隐患。'
          : risky.length <= 2
          ? `部分区域出现忠诚度或稳定度偏低：${risky.map((r) => r.name).join('、')}。建议优先派员视察或拨款扶持。`
          : `多地同时告急：${risky.map((r) => r.name).join('、')}。若任其恶化，可能引发连锁性动荡甚至自治诉求。`
      }${corruptedGov > 0 ? `另有 ${corruptedGov} 位长官腐败指数偏高，长期放任将引爆丑闻。` : ''}`,
      tone,
    })
  }

  // 7. 内阁气象
  {
    const cabinet = state.cabinet ?? []
    const npcMemoriesCount = state.npcMemories?.length ?? 0
    const avgLoyalty = cabinet.length > 0 ? cabinet.reduce((s, c) => s + c.loyalty, 0) / cabinet.length : 0
    const parliamentConfidence = state.parliament?.confidence ?? 50
    let tone: 'positive' | 'warning' | 'danger' | 'neutral' = 'neutral'
    if (avgLoyalty >= 60 && parliamentConfidence >= 55) tone = 'positive'
    else if (avgLoyalty >= 40 && parliamentConfidence >= 35) tone = 'warning'
    else tone = 'danger'
    paragraphs.push({
      title: '内阁与议会气象',
      body: `内阁部长 ${cabinet.length} 位，平均忠诚度 ${avgLoyalty.toFixed(0)}。${
        avgLoyalty >= 60
          ? '部长对总理高度忠诚，内阁施政协同顺畅，无人公开唱反调。'
          : avgLoyalty >= 40
          ? '部分部长立场暧昧，私下与反对党有所往来。需要警惕内部泄密与消极怠工。'
          : '内阁出现明显裂痕，已有部长公开质疑总理决策，随时可能出走或倒戈。'
      }议会方面，执政党席位 ${state.parliament?.rulingPartySeats ?? 0} 席、信任度 ${parliamentConfidence.toFixed(0)}，${
        parliamentConfidence >= 55
          ? '议会总体支持本届内阁，关键法案通过率高。'
          : parliamentConfidence >= 35
          ? '议会信任度摇摆，部分法案需依赖跨党派谈判才能通过。'
          : '议会信任度濒临红线，不信任动议随时可能提出。'
      }政坛人物记忆 ${npcMemoriesCount} 条，各自盘算，构成总理施政的外部生态。`,
      tone,
    })
  }

  // 8. 总理威望
  {
    const prestige = m.prestige
    let tone: 'positive' | 'warning' | 'danger' | 'neutral' = 'neutral'
    if (prestige >= 60) tone = 'positive'
    else if (prestige >= 35) tone = 'warning'
    else tone = 'danger'
    const grade = metricGrade(prestige)
    paragraphs.push({
      title: '总理威望',
      body: `总理历史声望评估为「${grade}」（${prestige.toFixed(0)}分）。${
        prestige >= 60
          ? '政坛威望稳固，媒体评价积极，史家已开始为本届内阁撰写正面章节。'
          : prestige >= 35
          ? '威望尚在积累期，尚未形成鲜明的历史印记。重大决断将成为加分项或扣分项。'
          : '威望受损：媒体讥评、政坛轻视，若不尽快扭转，恐难在下届大选胜出。'
      }${sec ? `政坛威望 ${sec.politicalPrestige.toFixed(0)}、媒体评价 ${sec.mediaRating.toFixed(0)}、历史声望 ${sec.historicalLegacy.toFixed(0)}。` : ''}`,
      tone,
    })
  }

  return paragraphs
}

const TONE_COLOR: Record<'positive' | 'warning' | 'danger' | 'neutral', string> = {
  positive: '#5a7d3a',
  warning: '#c9a961',
  danger: '#8b2635',
  neutral: '#6b7280',
}

/**
 * v1.5 国情页面：地方行政区划 + 地方长官
 *
 * 布局：
 *  - 顶部：国别总览（八区汇总：总人口/总经济权重/平均忠诚/平均稳定）
 *  - 左侧：八区网格（点击选中展开详情）
 *  - 右侧：选中区详情面板（区情 + 长官卡 + 行动菜单 + 互动菜单 + 冷却提示）
 *
 * 玩家可对每个区：
 *  - 执行行动（拨款/视察/换人/反贪/下放/戒严）
 *  - 与地方长官互动（晚宴/许诺/施压/打点）
 */
export default function CountryPage() {
  const regions = useGameStore((s) => s.regions) ?? REGIONS
  const governors = useGameStore((s) => s.governors) ?? GOVERNORS
  const pmStats = useGameStore((s) => s.pmStats)
  const totalDays = useGameStore((s) => s.totalDays)
  const turn = useGameStore((s) => s.turn)
  const year = useGameStore((s) => s.year)
  const month = useGameStore((s) => s.month)
  const regionActionCooldowns = useGameStore((s) => s.regionActionCooldowns) ?? {}
  const executeRegionAction = useGameStore((s) => s.executeRegionAction)
  const interactWithGovernor = useGameStore((s) => s.interactWithGovernor)

  const [selectedRegionId, setSelectedRegionId] = useState<RegionId | null>(regions[0]?.id ?? null)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [confirmInteract, setConfirmInteract] = useState<string | null>(null)
  const [archiveTab, setArchiveTab] = useState<'history' | 'current'>('current')

  // 实时现状速写：仅订阅所需切片，避免全 state 重建
  const metrics = useGameStore((s) => s.metrics)
  const secondary = useGameStore((s) => s.secondary)
  const countries = useGameStore((s) => s.countries) ?? INITIAL_COUNTRIES
  const cabinet = useGameStore((s) => s.cabinet) ?? []
  const npcMemories = useGameStore((s) => s.npcMemories) ?? []
  const parliament = useGameStore((s) => s.parliament)
  const currentParagraphs = useMemo(
    () =>
      generateCurrentSituation({
        metrics,
        secondary,
        regions,
        governors,
        countries,
        cabinet,
        npcMemories,
        parliament,
      } as unknown as GameState),
    [metrics, secondary, regions, governors, countries, cabinet, npcMemories, parliament],
  )

  // 国别总览
  const overview = useMemo(() => {
    const totalPop = regions.reduce((s, r) => s + r.population, 0)
    const totalEcon = regions.reduce((s, r) => s + r.economyWeight, 0)
    const avgLoyalty = regions.length > 0 ? regions.reduce((s, r) => s + r.loyalty, 0) / regions.length : 0
    const avgStability = regions.length > 0 ? regions.reduce((s, r) => s + r.stability, 0) / regions.length : 0
    const risky = regions.filter((r) => r.loyalty < 40 || r.stability < 35).length
    const corruptedGov = governors.filter((g) => g.corruption > 50).length
    return { totalPop, totalEcon, avgLoyalty, avgStability, risky, corruptedGov }
  }, [regions, governors])

  const selectedRegion = regions.find((r) => r.id === selectedRegionId) ?? null
  const selectedGovernor = selectedRegion
    ? governors.find((g) => g.id === selectedRegion.governorId) ?? null
    : null

  /** 检查行动可用性 */
  const checkAction = (action: RegionActionDef): { ok: boolean; reason?: string } => {
    if (pmStats.politicalCapital < action.cost) {
      return { ok: false, reason: `政治资本不足（需 ${action.cost}）` }
    }
    if (selectedRegion) {
      const key = `${selectedRegion.id}:${action.id}`
      const last = regionActionCooldowns[key] ?? -999
      const left = action.cooldownDays - (totalDays - last)
      if (left > 0) return { ok: false, reason: `冷却中（剩 ${left} 天）` }
    }
    return { ok: true }
  }

  /** 检查互动可用性 */
  const checkInteraction = (it: GovernorInteractionDef): { ok: boolean; reason?: string } => {
    if (pmStats.politicalCapital < it.cost) {
      return { ok: false, reason: `政治资本不足（需 ${it.cost}）` }
    }
    return { ok: true }
  }

  const handleAction = (action: RegionActionDef) => {
    const check = checkAction(action)
    if (!check.ok) return
    if (confirmAction !== action.id) {
      setConfirmAction(action.id)
      return
    }
    if (selectedRegion) {
      executeRegionAction(selectedRegion.id, action.id)
    }
    setConfirmAction(null)
  }

  const handleInteract = (it: GovernorInteractionDef) => {
    const check = checkInteraction(it)
    if (!check.ok) return
    if (confirmInteract !== it.id) {
      setConfirmInteract(it.id)
      return
    }
    if (selectedGovernor) {
      interactWithGovernor(selectedGovernor.id, it.id)
    }
    setConfirmInteract(null)
  }

  return (
    <div className="flex flex-col">
      {/* 顶部标题 */}
      <div className="flex items-center gap-3 mb-3 sticky top-0 z-10 bg-ink-900/80 backdrop-blur-sm py-2 -mx-1 px-1 rounded">
        <span className="text-2xl">🗺️</span>
        <span className="font-display text-lg font-bold tracking-[0.25em] text-gold">国 情 总 览</span>
        <span className="font-mono text-[11px] text-parchment-200/60 hidden sm:inline">
          地方行政区划与长官治理
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        <span className="font-mono text-[10px] text-parchment-200/40 whitespace-nowrap">
          第 {turn} 月 · {year}年{month}月
        </span>
      </div>

      {/* 国家档案 Tab 容器（立国史 + 实时现状速写） */}
      <div className="mb-3 rounded-lg overflow-hidden border border-gold/20 bg-gradient-to-br from-ink-900/60 to-ink-950/80">
          <div className="flex items-center border-b border-gold/20 bg-ink-900/40">
            <button
              onClick={() => setArchiveTab('current')}
              className={`flex-1 px-4 py-2 font-display text-xs font-bold tracking-widest transition-colors ${
                archiveTab === 'current'
                  ? 'text-gold bg-gradient-to-b from-gold/15 to-transparent border-b-2 border-gold'
                  : 'text-parchment-200/50 hover:text-parchment-100'
              }`}
            >
              📑 现 状 速 写
            </button>
            <div className="w-px h-6 bg-gold/20" />
            <button
              onClick={() => setArchiveTab('history')}
              className={`flex-1 px-4 py-2 font-display text-xs font-bold tracking-widest transition-colors ${
                archiveTab === 'history'
                  ? 'text-gold bg-gradient-to-b from-gold/15 to-transparent border-b-2 border-gold'
                  : 'text-parchment-200/50 hover:text-parchment-100'
              }`}
            >
              📜 立 国 史
            </button>
          </div>

          <div className="p-4">
            <AnimatePresence mode="wait">
              {archiveTab === 'current' ? (
                <motion.div
                  key="current"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-parchment-200/40 font-mono">
                      ⏱ {year}年{month}月 · 第 {turn} 月 · 执政第 {totalDays} 天
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
                    <span className="text-[10px] text-parchment-200/40 font-mono">
                      本节内容随局势实时更新
                    </span>
                  </div>
                  {currentParagraphs.map((p, idx) => (
                    <motion.div
                      key={p.title}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.2 }}
                      className="flex gap-3"
                    >
                      <div
                        className="w-1 rounded-full shrink-0"
                        style={{ backgroundColor: TONE_COLOR[p.tone] }}
                      />
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span
                            className="font-display text-xs font-bold tracking-wider"
                            style={{ color: TONE_COLOR[p.tone] }}
                          >
                            {p.title}
                          </span>
                        </div>
                        <p className="font-serif text-[11px] leading-relaxed text-parchment-200/70">
                          {p.body}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-parchment-200/40 font-mono">
                      共和国六十年 · 立宪—中兴—动荡—当代
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
                    <span className="text-[10px] text-parchment-200/40 font-mono">
                      静态背景叙事
                    </span>
                  </div>
                  {COUNTRY_HISTORY.map((p, idx) => (
                    <motion.div
                      key={p.era}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08, duration: 0.25 }}
                      className="flex gap-3"
                    >
                      <div className="flex flex-col items-center pt-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-amber-700/40 border border-gold/40 text-sm">
                          {p.icon}
                        </div>
                        {idx < COUNTRY_HISTORY.length - 1 && (
                          <div className="w-px flex-1 bg-gradient-to-b from-gold/30 to-transparent mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-[10px] text-gold/60 tracking-widest">
                            {p.era}
                          </span>
                          <span className="font-display text-sm font-bold tracking-wider text-parchment-100">
                            {p.title}
                          </span>
                        </div>
                        <p className="font-serif text-[11px] leading-relaxed text-parchment-200/70">
                          {p.body}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      {/* 国别汇总卡片 */}
      <div className="doc-card p-3 mb-3" style={{ borderColor: '#fbbf2444' }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatBlock label="行政区总数" value={regions.length} icon="🗺️" color="#fbbf24" />
          <StatBlock label="总人口(百万)" value={overview.totalPop} icon="👥" color="#06b6d4" />
          <StatBlock label="经济权重合计" value={`${overview.totalEcon}%`} icon="📈" color="#22c55e" />
          <StatBlock
            label="平均忠诚度"
            value={overview.avgLoyalty.toFixed(1)}
            icon="🛡️"
            color={overview.avgLoyalty > 55 ? '#22c55e' : overview.avgLoyalty > 40 ? '#f59e0b' : '#ef4444'}
          />
          <StatBlock
            label="平均稳定度"
            value={overview.avgStability.toFixed(1)}
            icon="⚖️"
            color={overview.avgStability > 55 ? '#22c55e' : overview.avgStability > 40 ? '#f59e0b' : '#ef4444'}
          />
          <StatBlock
            label="动荡区/腐败长官"
            value={`${overview.risky}/${overview.corruptedGov}`}
            icon="⚠️"
            color={overview.risky > 0 || overview.corruptedGov > 0 ? '#ef4444' : '#22c55e'}
          />
        </div>
        <div className="mt-2 pt-2 border-t border-gold/10 flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] text-parchment-200/40">可用政治资本</span>
          <span className="font-display text-sm font-bold text-gold">
            💼 {Math.round(pmStats.politicalCapital)}
          </span>
          <span className="font-serif text-[10px] text-parchment-200/40 italic">
            提示：忠诚度过低的区可能触发自治/脱离事件；腐败长官长期放任会引爆丑闻。
          </span>
        </div>
      </div>

      {/* 主体：左区域网格 + 右选中详情 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* 左：区域网格 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-display text-xs font-bold tracking-widest text-gold/80">
              八 区 形 势
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
            <span className="font-mono text-[9px] text-parchment-200/40">点击选中查看详情</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {regions.map((r) => {
              const gov = governors.find((g) => g.id === r.governorId)
              const isSelected = selectedRegionId === r.id
              const loyaltyColor = r.loyalty > 55 ? '#22c55e' : r.loyalty > 40 ? '#f59e0b' : '#ef4444'
              const stabilityColor = r.stability > 55 ? '#22c55e' : r.stability > 40 ? '#f59e0b' : '#ef4444'
              return (
                <motion.button
                  key={r.id}
                  whileHover={{ y: -2 }}
                  onClick={() => {
                    setSelectedRegionId(r.id)
                    setConfirmAction(null)
                    setConfirmInteract(null)
                  }}
                  className={`doc-card p-3 text-left transition-all ${
                    isSelected
                      ? 'border-gold/60 bg-ink-800/70 shadow-lg shadow-gold/10'
                      : 'hover:border-gold/30 hover:bg-ink-800/40'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl shrink-0">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-serif text-sm font-bold text-parchment-100 truncate">
                          {r.name}
                        </span>
                        <span className="font-mono text-[9px] text-parchment-200/40 shrink-0">
                          人口 {r.population}M
                        </span>
                      </div>
                      <div className="font-mono text-[9px] text-parchment-200/40 mt-0.5">
                        {r.geography} · 经济权重 {r.economyWeight}%
                      </div>
                      {/* 双指标条 */}
                      <div className="mt-1.5 space-y-1">
                        <MiniBar label="忠诚" value={r.loyalty} color={loyaltyColor} />
                        <MiniBar label="稳定" value={r.stability} color={stabilityColor} />
                      </div>
                      {/* 长官标签 */}
                      {gov && (
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-serif text-[10px] text-parchment-200/60">
                            👤 {gov.name}
                          </span>
                          {gov.faction && FACTION_LABELS[gov.faction] && (
                            <span
                              className="rounded px-1 py-0.5 font-mono text-[8px] font-bold"
                              style={{
                                color: FACTION_LABELS[gov.faction].color,
                                backgroundColor: `${FACTION_LABELS[gov.faction].color}20`,
                              }}
                            >
                              {FACTION_LABELS[gov.faction].label}
                            </span>
                          )}
                          {gov.corruption > 50 && (
                            <span className="rounded px-1 py-0.5 font-mono text-[8px] font-bold bg-red-500/15 text-red-300">
                              腐败 {gov.corruption}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* 右：选中区详情 */}
        <div className="lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto space-y-3">
          <AnimatePresence mode="wait">
            {selectedRegion && (
              <motion.div
                key={selectedRegion.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* 区情卡 */}
                <div className="doc-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{selectedRegion.icon}</span>
                    <span className="font-display text-sm font-bold tracking-wider text-gold">
                      {selectedRegion.name}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
                  </div>
                  <p className="font-serif text-[11px] text-parchment-200/60 leading-relaxed mb-2">
                    {selectedRegion.description}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="rounded bg-ink-900/40 px-2 py-1">
                      <div className="font-mono text-parchment-200/40">人口</div>
                      <div className="font-serif text-parchment-100 font-bold">
                        {selectedRegion.population} 百万
                      </div>
                    </div>
                    <div className="rounded bg-ink-900/40 px-2 py-1">
                      <div className="font-mono text-parchment-200/40">经济权重</div>
                      <div className="font-serif text-parchment-100 font-bold">
                        {selectedRegion.economyWeight}%
                      </div>
                    </div>
                    <div className="rounded bg-ink-900/40 px-2 py-1">
                      <div className="font-mono text-parchment-200/40">行政成本/月</div>
                      <div className="font-serif text-parchment-100 font-bold">
                        💰 {selectedRegion.adminCost}
                      </div>
                    </div>
                    <div className="rounded bg-ink-900/40 px-2 py-1">
                      <div className="font-mono text-parchment-200/40">地理</div>
                      <div className="font-serif text-parchment-100 font-bold">
                        {selectedRegion.geography}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <MiniBar label="对中央忠诚度" value={selectedRegion.loyalty} color={selectedRegion.loyalty > 55 ? '#22c55e' : selectedRegion.loyalty > 40 ? '#f59e0b' : '#ef4444'} />
                    <MiniBar label="本地稳定度" value={selectedRegion.stability} color={selectedRegion.stability > 55 ? '#22c55e' : selectedRegion.stability > 40 ? '#f59e0b' : '#ef4444'} />
                  </div>
                </div>

                {/* 长官卡 */}
                {selectedGovernor && (
                  <div className="doc-card p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">👤</span>
                      <span className="font-display text-sm font-bold tracking-wider text-gold">
                        地方长官
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="font-serif text-base font-bold text-parchment-100">
                          {selectedGovernor.name}
                        </div>
                        <div className="font-mono text-[10px] text-parchment-200/50 mt-0.5">
                          {selectedGovernor.age} 岁 · {selectedGovernor.biography}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {selectedGovernor.faction && FACTION_LABELS[selectedGovernor.faction] && (
                            <span
                              className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
                              style={{
                                color: FACTION_LABELS[selectedGovernor.faction].color,
                                backgroundColor: `${FACTION_LABELS[selectedGovernor.faction].color}20`,
                              }}
                            >
                              {FACTION_LABELS[selectedGovernor.faction].label}
                            </span>
                          )}
                          {selectedGovernor.traits.map((t) => {
                            const meta = GOVERNOR_TRAIT_META[t]
                            if (!meta) return null
                            return (
                              <span
                                key={t}
                                className="rounded bg-parchment-200/10 px-1.5 py-0.5 font-mono text-[9px] text-parchment-200/60"
                              >
                                {meta.icon} {meta.label}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <MiniBar label="忠诚度" value={selectedGovernor.loyalty} color={selectedGovernor.loyalty > 55 ? '#22c55e' : selectedGovernor.loyalty > 40 ? '#f59e0b' : '#ef4444'} />
                      <MiniBar label="行政能力" value={selectedGovernor.competence} color="#06b6d4" />
                      <MiniBar label="腐败值" value={selectedGovernor.corruption} color={selectedGovernor.corruption < 30 ? '#22c55e' : selectedGovernor.corruption < 50 ? '#f59e0b' : '#ef4444'} />
                    </div>
                  </div>
                )}

                {/* 行动菜单 */}
                <div className="doc-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">⚔️</span>
                    <span className="font-display text-sm font-bold tracking-wider text-gold">
                      地方行动
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
                  </div>
                  <div className="space-y-1.5">
                    {REGION_ACTIONS.map((action) => {
                      const check = checkAction(action)
                      const isConfirming = confirmAction === action.id
                      return (
                        <div
                          key={action.id}
                          className={`rounded border border-gold/15 bg-ink-900/40 p-2 transition-all ${
                            check.ok ? 'hover:border-gold/40 hover:bg-ink-800/60' : 'opacity-55'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{action.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-serif text-xs font-bold text-parchment-100">
                                {action.label}
                              </div>
                              <div className="font-mono text-[9px] text-parchment-200/40">
                                💼 {action.cost} · 冷却 {action.cooldownDays}天
                              </div>
                            </div>
                            {check.ok ? (
                              <button
                                onClick={() => handleAction(action)}
                                className={`rounded px-2.5 py-1 font-serif text-[11px] font-bold transition-colors ${
                                  isConfirming
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25'
                                }`}
                              >
                                {isConfirming ? '确认?' : '执行'}
                              </button>
                            ) : (
                              <span className="font-mono text-[9px] text-red-400/70 whitespace-nowrap">
                                {check.reason}
                              </span>
                            )}
                          </div>
                          <p className="font-serif text-[10px] text-parchment-200/50 leading-relaxed mt-1">
                            {action.description}
                          </p>
                          {isConfirming && check.ok && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <button
                                onClick={() => handleAction(action)}
                                className="rounded bg-red-600 px-2 py-0.5 font-serif text-[10px] font-bold text-white"
                              >
                                确认执行
                              </button>
                              <button
                                onClick={() => setConfirmAction(null)}
                                className="rounded bg-ink-700 px-2 py-0.5 font-serif text-[10px] text-parchment-200"
                              >
                                取消
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 长官互动菜单 */}
                {selectedGovernor && (
                  <div className="doc-card p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🤝</span>
                      <span className="font-display text-sm font-bold tracking-wider text-gold">
                        长官互动
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-r from-gold/30 to-transparent" />
                    </div>
                    <div className="space-y-1.5">
                      {GOVERNOR_INTERACTIONS.map((it) => {
                        const check = checkInteraction(it)
                        const isConfirming = confirmInteract === it.id
                        return (
                          <div
                            key={it.id}
                            className={`rounded border border-gold/15 bg-ink-900/40 p-2 transition-all ${
                              check.ok ? 'hover:border-gold/40 hover:bg-ink-800/60' : 'opacity-55'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-base">{it.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-serif text-xs font-bold text-parchment-100">
                                  {it.label}
                                </div>
                                <div className="font-mono text-[9px] text-parchment-200/40">
                                  💼 {it.cost}
                                </div>
                              </div>
                              {check.ok ? (
                                <button
                                  onClick={() => handleInteract(it)}
                                  className={`rounded px-2.5 py-1 font-serif text-[11px] font-bold transition-colors ${
                                    isConfirming
                                      ? 'bg-red-600 text-white hover:bg-red-700'
                                      : 'bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25'
                                  }`}
                                >
                                  {isConfirming ? '确认?' : '互动'}
                                </button>
                              ) : (
                                <span className="font-mono text-[9px] text-red-400/70 whitespace-nowrap">
                                  {check.reason}
                                </span>
                              )}
                            </div>
                            <p className="font-serif text-[10px] text-parchment-200/50 leading-relaxed mt-1">
                              {it.description}
                            </p>
                            {isConfirming && check.ok && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <button
                                  onClick={() => handleInteract(it)}
                                  className="rounded bg-red-600 px-2 py-0.5 font-serif text-[10px] font-bold text-white"
                                >
                                  确认互动
                                </button>
                                <button
                                  onClick={() => setConfirmInteract(null)}
                                  className="rounded bg-ink-700 px-2 py-0.5 font-serif text-[10px] text-parchment-200"
                                >
                                  取消
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/** 小指标块 */
function StatBlock({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="rounded-md border border-gold/15 bg-ink-900/40 p-2 text-center">
      <div className="font-mono text-[9px] text-parchment-200/50">{icon} {label}</div>
      <div className="font-display text-lg font-bold mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

/** 迷你进度条 */
function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-serif text-[10px] text-parchment-200/60">{label}</span>
        <span className="font-mono text-[10px] font-bold" style={{ color }}>
          {Math.round(value)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-900/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
