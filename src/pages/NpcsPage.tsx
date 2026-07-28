// 人物谱页面：展示全部 15 位 NPC 的身份、性格、当前态度与互动历史
// 按派系分组（政界/军方/商界/工会媒体/宗教/外国政要），与总理的互动记录一目了然
import { motion } from 'motion/react'
import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { ALL_NPCS, findNpcById } from '@/data/npcs'
import type { NPCBase, NPCMemory } from '@/types/game'

/** 派系分组定义 */
const FACTIONS: {
  id: string
  label: string
  icon: string
  color: string
  npcIds: string[]
}[] = [
  {
    id: 'political',
    label: '政界',
    icon: '🏛️',
    color: '#fbbf24',
    npcIds: ['npc_opposition', 'npc_center', 'npc_left', 'npc_right', 'npc_rival'],
  },
  {
    id: 'military',
    label: '军方',
    icon: '⚔️',
    color: '#ef4444',
    npcIds: ['npc_cdf', 'npc_navy_cmd'],
  },
  {
    id: 'business',
    label: '商界',
    icon: '💼',
    color: '#10b981',
    npcIds: ['npc_tycoon', 'npc_industry'],
  },
  {
    id: 'civic',
    label: '工会与媒体',
    icon: '📣',
    color: '#3b82f6',
    npcIds: ['npc_union', 'npc_media'],
  },
  {
    id: 'religion',
    label: '宗教',
    icon: '📿',
    color: '#a855f7',
    npcIds: ['npc_religion'],
  },
  {
    id: 'foreign',
    label: '外国政要',
    icon: '🌐',
    color: '#06b6d4',
    npcIds: ['npc_amb_neighbor', 'npc_envoy_gp', 'npc_intl_org'],
  },
]

/** 性格中文标签 */
const TRAIT_LABELS: Record<string, string> = {
  idealist: '理想主义者',
  pragmatist: '实用主义者',
  hardliner: '强硬派',
  moderate: '温和派',
  opportunist: '机会主义者',
}

/** 语气元信息 */
const TONE_META: Record<NPCMemory['tone'], { label: string; color: string; icon: string }> = {
  friendly: { label: '友好', color: '#10b981', icon: '🤝' },
  neutral: { label: '中立', color: '#fbbf24', icon: '😐' },
  resentful: { label: '怨恨', color: '#fb923c', icon: '😤' },
  hostile: { label: '敌对', color: '#ef4444', icon: '⚔️' },
}

export default function NpcsPage() {
  const npcMemories = useGameStore((s) => s.npcMemories)
  const [activeFaction, setActiveFaction] = useState<string>('political')
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null)

  const getMemory = (npcId: string): NPCMemory | undefined =>
    npcMemories.find((m) => m.npcId === npcId)

  const selectedNpc = selectedNpcId ? findNpcById(selectedNpcId) : null
  const selectedMemory = selectedNpcId ? getMemory(selectedNpcId) : undefined

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 页面标题 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          人 物 谱
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        <span className="font-mono text-[10px] text-parchment-200/40">
          共 {ALL_NPCS.length} 位关键人物 · 快捷键 K
        </span>
      </div>

      {/* 派系选择条 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {FACTIONS.map((f) => {
          const active = activeFaction === f.id
          const count = f.npcIds.length
          return (
            <button
              key={f.id}
              onClick={() => {
                setActiveFaction(f.id)
                setSelectedNpcId(null)
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-serif text-xs font-semibold transition-all ${
                active
                  ? 'text-ink-900 shadow-md'
                  : 'bg-ink-800/60 text-parchment-200/60 hover:bg-ink-700/60'
              }`}
              style={active ? { backgroundColor: f.color } : undefined}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
              <span
                className={`rounded-full px-1 font-mono text-[9px] ${
                  active ? 'bg-ink-900/30 text-ink-900' : 'bg-parchment-200/10 text-parchment-200/40'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 min-h-0">
        {/* 左侧：当前派系 NPC 卡片网格 */}
        <div className="overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {FACTIONS.find((f) => f.id === activeFaction)?.npcIds.map((id) => {
              const npc = findNpcById(id)
              if (!npc) return null
              const mem = getMemory(id)
              return (
                <NpcCard
                  key={id}
                  npc={npc}
                  memory={mem}
                  isSelected={selectedNpcId === id}
                  onSelect={() => setSelectedNpcId(id)}
                />
              )
            })}
          </div>

          {/* 派系说明 */}
          <div className="mt-3 doc-card p-3">
            <div className="font-serif text-xs text-parchment-200/60 leading-relaxed">
              {getFactionDescription(activeFaction)}
            </div>
          </div>
        </div>

        {/* 右侧：选中 NPC 详情面板 */}
        <div className="overflow-y-auto">
          {selectedNpc ? (
            <NpcDetailPanel npc={selectedNpc} memory={selectedMemory} />
          ) : (
            <div className="doc-card p-6 text-center">
              <div className="text-3xl mb-2">👈</div>
              <div className="font-serif text-xs text-parchment-200/50">
                点击左侧任意人物卡片查看详情
              </div>
              <div className="mt-2 font-mono text-[9px] text-parchment-200/30">
                与人物的互动记录会在此显示
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** 单张 NPC 卡片 */
function NpcCard({
  npc,
  memory,
  isSelected,
  onSelect,
}: {
  npc: NPCBase
  memory?: NPCMemory
  isSelected: boolean
  onSelect: () => void
}) {
  const tone = memory?.tone ?? 'neutral'
  const toneMeta = TONE_META[tone]
  const attitudeColor =
    npc.attitude >= 65 ? '#10b981' : npc.attitude >= 45 ? '#fbbf24' : npc.attitude >= 25 ? '#fb923c' : '#ef4444'

  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className={`doc-card p-3 text-left transition-all ${
        isSelected ? 'border-gold/60 bg-gold/8 shadow-seal' : 'hover:border-gold/40 hover:bg-ink-800/60'
      }`}
    >
      {/* 顶部：姓名 + 态度徽章 */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-display text-sm font-bold text-parchment-100">
            {npc.name}
          </div>
          <div className="font-serif text-[10px] text-parchment-200/50 mt-0.5">
            {npc.role}
          </div>
        </div>
        <span
          className="rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold"
          style={{ backgroundColor: `${attitudeColor}22`, color: attitudeColor }}
        >
          {npc.attitude}
        </span>
      </div>

      {/* 性格标签 */}
      <div className="flex flex-wrap gap-1 mb-2">
        {npc.traits.map((t) => (
          <span
            key={t}
            className="rounded bg-ink-900/60 px-1.5 py-0.5 font-mono text-[9px] text-parchment-200/60"
          >
            {TRAIT_LABELS[t] ?? t}
          </span>
        ))}
      </div>

      {/* 态度进度条 */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] text-parchment-200/40">态度</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-900/60">
          <div
            className="h-full rounded-full"
            style={{ width: `${npc.attitude}%`, backgroundColor: attitudeColor }}
          />
        </div>
        <span className="font-mono text-[9px]" style={{ color: toneMeta.color }}>
          {toneMeta.icon}
        </span>
      </div>

      {/* 互动次数提示 */}
      {memory && memory.events.length > 0 && (
        <div className="mt-1.5 font-mono text-[9px] text-parchment-200/40">
          📜 已记录 {memory.events.length} 次互动
        </div>
      )}
    </motion.button>
  )
}

/** NPC 详情面板 */
function NpcDetailPanel({ npc, memory }: { npc: NPCBase; memory?: NPCMemory }) {
  const tone = memory?.tone ?? 'neutral'
  const toneMeta = TONE_META[tone]

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="doc-card p-4"
    >
      {/* 头像区域：用首字 + 派系色环 */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-parchment-200/10">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 font-display text-2xl font-bold"
          style={{
            borderColor: toneMeta.color,
            color: toneMeta.color,
            backgroundColor: `${toneMeta.color}15`,
          }}
        >
          {npc.name.slice(0, 1)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg font-bold text-parchment-100">
            {npc.name}
          </div>
          <div className="font-serif text-xs text-gold/80">{npc.role}</div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold"
              style={{ backgroundColor: `${toneMeta.color}22`, color: toneMeta.color }}
            >
              {toneMeta.icon} {toneMeta.label}
            </span>
            <span className="font-mono text-[10px] text-parchment-200/40">
              初始态度 {npc.attitude}
            </span>
          </div>
        </div>
      </div>

      {/* 性格详情 */}
      <div className="mb-3">
        <div className="font-mono text-[9px] text-parchment-200/40 mb-1.5">性格特质</div>
        <div className="flex flex-wrap gap-1.5">
          {npc.traits.map((t) => (
            <span
              key={t}
              className="rounded-md border border-gold/30 bg-gold/10 px-2 py-1 font-serif text-[10px] font-semibold text-gold"
            >
              {TRAIT_LABELS[t] ?? t}
            </span>
          ))}
        </div>
      </div>

      {/* 态度进度条 */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[9px] text-parchment-200/40">当前态度</span>
          <span className="font-mono text-xs font-bold" style={{ color: toneMeta.color }}>
            {npc.attitude}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-900/60">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: toneMeta.color }}
            initial={{ width: 0 }}
            animate={{ width: `${npc.attitude}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      </div>

      {/* 互动历史 */}
      <div>
        <div className="font-mono text-[9px] text-parchment-200/40 mb-1.5">
          互动记录 {memory?.events.length ? `（${memory.events.length}）` : ''}
        </div>
        {memory && memory.events.length > 0 ? (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {memory.events.slice().reverse().map((ev, i) => (
              <div
                key={i}
                className="rounded-md border border-parchment-200/10 bg-ink-900/40 p-2"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[9px] font-bold text-gold/70">
                    第 {ev.day} 天
                  </span>
                  <span className="font-mono text-[9px] text-parchment-200/40">
                    {getActionTypeLabel(ev.type)}
                  </span>
                </div>
                <div className="font-serif text-[10px] text-parchment-200/70 leading-relaxed">
                  {ev.description}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-parchment-200/15 p-4 text-center">
            <div className="font-serif text-[10px] text-parchment-200/40">
              尚无互动记录
            </div>
            <div className="mt-1 font-mono text-[9px] text-parchment-200/30">
              通过事件、改革、外交等行为与此人物产生交集
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/** 行为类型中文标签 */
function getActionTypeLabel(type: NPCMemory['events'][number]['type']): string {
  const map: Record<NPCMemory['events'][number]['type'], string> = {
    promoted: '晋升',
    betrayed: '背叛',
    dismissed: '解职',
    helped: '帮助',
    insulted: '侮辱',
  }
  return map[type] ?? type
}

/** 派系说明文案 */
function getFactionDescription(factionId: string): string {
  const map: Record<string, string> = {
    political:
      '政界五人：四位党魁（反对党、中间派、左翼、右翼）与一位党内竞争对手。他们的态度直接影响议会法案表决的票数走向，是日常施政绕不开的对手。',
    military:
      '军方两人：总参谋长周振国与海军司令林远征。军费预算、战争决策、边境冲突等议题上他们的态度举足轻重；冷落军方会触发退役将领公开信等连锁反应。',
    business:
      '商界两人：首富钱万通与工业协会会长赵世昌。前者代表资本与（潜在的）黑金通道，后者关注税率与制造业就业；劳动法、税制改革会直接牵动他们的利益。',
    civic:
      '工会与媒体两人：全国总工会主席孙铁柱与国家通讯社社长吴文华。前者在失业率攀升时会登门施压，后者掌握舆论走向——专访邀约可救回下滑的民调。',
    religion:
      '宗教界一人：慧明法师。当社会团结下滑或道德焦虑蔓延时，他会以"精神告白"邀约形式出现，接受可提振民意与稳定，拒绝则失去道德高地。',
    foreign:
      '外国政要三人：邻国大使伊万诺夫、大国特使塞缪尔·哈里森、国际组织代表安吉拉·诺沃。前者关系恶化会触发边境冲突，中者掌握贸易协议筹码，后者关乎制裁与降级审查。',
  }
  return map[factionId] ?? ''
}
