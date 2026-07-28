import { motion, AnimatePresence } from 'motion/react'
import { useGameStore } from '@/store/gameStore'
import { useState } from 'react'
import type { CabinetMember, CabinetBonus, Metrics, SecondaryMetrics, NPCMemory } from '@/types/game'
import { REPLACEMENT_CANDIDATES, NEW_DEPARTMENT_CANDIDATES, PRESET_DEPARTMENT_NAMES } from '@/data/cabinet'
import { getNPCTone, getBetrayedNPCs } from '@/data/npcTones'
import { clamp, applyEffects, shouldShowOptionEffects } from '@/engine/metrics'

/** 指标标签映射 */
const METRIC_LABELS: Record<string, string> = {
  approval: '民意', treasury: '国库', economy: '经济',
  stability: '稳定', diplomacy: '外交', prestige: '声望',
}

/** 内阁会议事件 */
interface CabinetMeetingEvent {
  id: string
  title: string
  description: string
  options: {
    id: string
    label: string
    description: string
    effects: Partial<Metrics>
    secondaryEffects?: Partial<SecondaryMetrics>
    newsTitle: string
    newsSummary: string
    tone: 'positive' | 'negative' | 'neutral'
  }[]
}

/** 加成显示组件 */
function BonusDisplay({ bonuses, loyalty, compact }: { bonuses: CabinetBonus; loyalty?: number; compact?: boolean }) {
  const factor = loyalty !== undefined ? loyalty / 100 : 1
  const entries = Object.entries(bonuses).filter(([, v]) => v !== 0)
  if (entries.length === 0) return <span className="text-parchment-200/30 text-[10px]">无加成</span>
  return (
    <div className={`flex flex-wrap ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {entries.map(([key, value]) => {
        const effective = Math.round(value * factor)
        return (
          <span
            key={key}
            className={`font-mono text-[10px] ${effective > 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {METRIC_LABELS[key] ?? key} {effective > 0 ? '+' : ''}{effective}
            {loyalty !== undefined && factor < 1 && (
              <span className="text-parchment-200/30">/{value > 0 ? '+' : ''}{value}</span>
            )}
          </span>
        )
      })}
    </div>
  )
}

/** 生成内阁会议事件 */
function generateMeetingEvent(cabinet: CabinetMember[], npcMemories: NPCMemory[]): CabinetMeetingEvent {
  const lowLoyaltyMember = cabinet.find((c) => c.loyalty < 45)
  const highLoyaltyCount = cabinet.filter((c) => c.loyalty >= 70).length

  if (lowLoyaltyMember) {
    // 根据该大臣的 NPC 记忆语气调整描述文本
    const tone = getNPCTone(npcMemories, lowLoyaltyMember.id)
    let description: string
    if (tone === 'resentful') {
      description = `${lowLoyaltyMember.name}（${lowLoyaltyMember.role}）冷笑着质疑您的政策："呵，又是这套说辞？"与其他部长发生激烈争论，内阁团结面临考验。`
    } else if (tone === 'hostile') {
      description = `${lowLoyaltyMember.name}（${lowLoyaltyMember.role}）公开挑衅："这种政策简直荒谬至极！"言辞激烈，内阁会议一度陷入僵局。`
    } else if (tone === 'friendly') {
      description = `${lowLoyaltyMember.name}（${lowLoyaltyMember.role}）委婉地提出不同意见，虽然支持您的方向，但对部分细节表示担忧。`
    } else {
      description = `${lowLoyaltyMember.name}（${lowLoyaltyMember.role}）在会议上公开质疑您的政策方向，与其他部长发生激烈争论。内阁团结面临考验。`
    }
    return {
      id: 'cab_conflict',
      title: '内阁分歧',
      description,
      options: [
        {
          id: 'support',
          label: '坚定支持政策',
          description: '当众驳回质疑，维护政策权威',
          effects: { prestige: 4, stability: -2 },
          newsTitle: '总理强硬回应内阁质疑',
          newsSummary: `总理在内阁会议上力排众议，${lowLoyaltyMember.name}的质疑被压下，但内部裂痕加深。`,
          tone: 'neutral',
        },
        {
          id: 'compromise',
          label: '妥协调整方案',
          description: '听取意见，对政策做适度调整',
          effects: { approval: 3, prestige: -3, stability: 2 },
          newsTitle: '内阁会议达成妥协方案',
          newsSummary: '总理展现灵活姿态，对争议政策做出调整，内阁重归和谐。',
          tone: 'positive',
        },
        {
          id: 'dismiss_threat',
          label: '暗示人事调整',
          description: '暗示可能对内阁进行改组',
          effects: { prestige: 2, stability: -4 },
          secondaryEffects: { politicalPrestige: 5 },
          newsTitle: '总理暗示内阁将改组',
          newsSummary: '总理在内阁会议上发出警告信号，各部长噤若寒蝉。',
          tone: 'negative',
        },
      ],
    }
  }

  if (highLoyaltyCount >= 4) {
    return {
      id: 'cab_proposal',
      title: '内阁联名建议',
      description: '多位内阁部长联名向您提交了一份政策建议书，内容涉及当前施政重点。',
      options: [
        {
          id: 'adopt',
          label: '全盘采纳',
          description: '接受全部建议，展现团队信任',
          effects: { approval: 4, prestige: 3, economy: 2 },
          newsTitle: '总理采纳内阁联名建议',
          newsSummary: '内阁团队齐心协力，新政策即将落地。',
          tone: 'positive',
        },
        {
          id: 'partial',
          label: '部分采纳',
          description: '选择性地采纳部分内容',
          effects: { prestige: 2, economy: 1 },
          newsTitle: '总理部分采纳内阁建议',
          newsSummary: '总理对内阁建议进行了筛选，保留核心内容。',
          tone: 'neutral',
        },
        {
          id: 'defer',
          label: '暂缓研究',
          description: '表示需要更多时间评估',
          effects: { prestige: -2 },
          newsTitle: '内阁建议被搁置',
          newsSummary: '总理表示需要更多论证，内阁建议暂时搁置。',
          tone: 'neutral',
        },
      ],
    }
  }

  const events: CabinetMeetingEvent[] = [
    {
      id: 'cab_budget',
      title: '预算分配讨论',
      description: '内阁会议上，各部长就下阶段预算分配展开讨论，各方诉求不一。',
      options: [
        {
          id: 'economy_first',
          label: '优先经济发展',
          description: '将更多预算投向经济部门',
          effects: { economy: 5, treasury: -4, approval: 2 },
          newsTitle: '总理定调：经济优先',
          newsSummary: '内阁预算向经济领域倾斜，发展势头可期。',
          tone: 'positive',
        },
        {
          id: 'social_first',
          label: '优先民生保障',
          description: '增加社会福利和民生支出',
          effects: { approval: 5, treasury: -4, stability: 2 },
          newsTitle: '总理强调民生为本',
          newsSummary: '内阁决定加大民生投入，民众福祉有望改善。',
          tone: 'positive',
        },
        {
          id: 'balanced',
          label: '均衡分配',
          description: '各部门预算维持现状',
          effects: { treasury: -2, stability: 1 },
          newsTitle: '内阁预算维持均衡',
          newsSummary: '总理采取稳健策略，各部门预算基本不变。',
          tone: 'neutral',
        },
      ],
    },
    {
      id: 'cab_crisis',
      title: '突发舆情应对',
      description: '内阁紧急会议：媒体曝光了一起涉及政府部门的负面事件，舆论持续发酵。',
      options: [
        {
          id: 'transparent',
          label: '公开透明回应',
          description: '主动召开发布会，坦诚回应',
          effects: { approval: 3, prestige: 4, stability: -1 },
          newsTitle: '总理坦诚回应舆情',
          newsSummary: '政府主动公开信息，舆论逐渐平息。',
          tone: 'positive',
        },
        {
          id: 'suppress',
          label: '控制舆论',
          description: '通过官方渠道压制负面报道',
          effects: { prestige: -3, stability: 2, approval: -2 },
          newsTitle: '政府压制负面报道',
          newsSummary: '官方低调处理舆情，但民间议论未息。',
          tone: 'negative',
        },
        {
          id: 'investigate',
          label: '成立调查组',
          description: '宣布成立独立调查组',
          effects: { prestige: 2, approval: 2, treasury: -2 },
          newsTitle: '总理下令成立调查组',
          newsSummary: '政府宣布对事件展开独立调查，展现负责任态度。',
          tone: 'positive',
        },
      ],
    },
  ]

  return events[Math.floor(Math.random() * events.length)]
}

/** 内阁改组模式 */
type ReshuffleMode = 'menu' | 'replace' | 'create' | null

/** 内阁页面 */
export default function CabinetPage() {
  const cabinet = useGameStore((s) => s.cabinet)
  const metrics = useGameStore((s) => s.metrics)
  const difficulty = useGameStore((s) => s.difficulty)
  const cabinetChats = useGameStore((s) => s.cabinetChats)
  const setGamePage = useGameStore((s) => s.setGamePage)
  const setSidePanelPage = useGameStore((s) => s.setSidePanelPage)
  const startBackroomLobby = useGameStore((s) => s.startBackroomLobby)
  const [selectedMember, setSelectedMember] = useState<CabinetMember | null>(null)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [meetingEvent, setMeetingEvent] = useState<CabinetMeetingEvent | null>(null)
  const [reshuffleTarget, setReshuffleTarget] = useState<CabinetMember | null>(null)
  const [reshuffleMode, setReshuffleMode] = useState<ReshuffleMode>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null)
  // 新部门表单状态
  const [newDeptName, setNewDeptName] = useState('')
  const [newDeptCandidate, setNewDeptCandidate] = useState<number | null>(null)

  /** 跳转到与指定部长的聊天页
   *  CabinetChatPage 默认选中 cabinet[0]，我们通过在 store 上记录一个"待打开"部长 id，
   *  让 CabinetChatPage 首次渲染时优先选中它。这里直接利用 setGamePage 跳转，
   *  并在 localStorage 留一个一次性提示 id。 */
  const goToChatWith = (member: CabinetMember) => {
    try {
      sessionStorage.setItem('cabinet_chat_pending_id', member.id)
    } catch { /* 忽略 */ }
    setSidePanelPage('cabinet_chat')
  }

  /** 计算某部长未读消息数（带未回应选项的 minister 消息视为未读） */
  const unreadCount = (ministerId: string): number => {
    const thread = cabinetChats.find((t) => t.ministerId === ministerId)
    if (!thread) return 0
    return thread.messages.filter((m) => m.sender === 'minister' && m.options && !m.resolved).length
  }

  const handleMeeting = () => {
    const event = generateMeetingEvent(cabinet, useGameStore.getState().npcMemories)
    setMeetingEvent(event)
  }

  /** 启动深夜官邸密室游说 minigame（暂停时间，全屏博弈） */
  const handleBackroomLobby = () => {
    startBackroomLobby()
  }

  const handleMeetingOption = (optionId: string) => {
    if (!meetingEvent) return
    const option = meetingEvent.options.find((o) => o.id === optionId)
    if (!option) return

    const newMetrics = applyEffects(metrics, option.effects, useGameStore.getState().difficulty)

    const loyaltyBoost = option.tone === 'positive' ? 3 : option.tone === 'negative' ? -2 : 1
    const newCabinet = cabinet.map((c) => ({
      ...c,
      loyalty: clamp(c.loyalty + loyaltyBoost),
    }))

    useGameStore.setState({
      metrics: newMetrics,
      cabinet: newCabinet,
      news: [
        {
          id: `news_cab_${Date.now()}`,
          timestamp: `${useGameStore.getState().year}年${useGameStore.getState().month}月`,
          title: option.newsTitle,
          summary: option.newsSummary,
          category: '内阁',
          tone: option.tone,
        },
        ...useGameStore.getState().news,
      ],
    })

    setMeetingEvent(null)
  }

  const handleReshuffle = () => {
    // 打开改组菜单：选择是更换现有成员还是设立新部门
    setReshuffleMode('menu')
    setSelectedCandidate(null)
    setReshuffleTarget(null)
    setNewDeptName('')
    setNewDeptCandidate(null)
  }

  const handleReshuffleMember = (member: CabinetMember) => {
    setReshuffleTarget(member)
    setReshuffleMode('replace')
    setSelectedCandidate(null)
  }

  const confirmReshuffle = () => {
    if (!reshuffleTarget || selectedCandidate === null) return
    const candidates = REPLACEMENT_CANDIDATES[reshuffleTarget.role]
    if (!candidates || candidates.length === 0) return

    const candidate = candidates[selectedCandidate]

    // NPC 记忆影响任命：若该职位的前任是被出卖/解职的（tone 为 hostile/resentful），
    // 继任者忠诚度初始 -15（听闻前任结局后心存芥蒂）
    const betrayedIds = getBetrayedNPCs(useGameStore.getState().npcMemories)
    const wasBetrayed = betrayedIds.includes(reshuffleTarget.id)
    const effectiveLoyalty = wasBetrayed
      ? Math.max(20, candidate.loyalty - 15)
      : candidate.loyalty

    const newCabinet = cabinet.map((c) =>
      c.id === reshuffleTarget.id
        ? {
            ...c,
            name: candidate.name,
            loyalty: effectiveLoyalty,
            advice: candidate.advice,
            bonuses: { ...candidate.bonuses },
          }
        : c,
    )

    useGameStore.setState({
      cabinet: newCabinet,
      metrics: {
        ...metrics,
        stability: clamp(metrics.stability - 2),
        prestige: clamp(metrics.prestige + 2),
      },
      news: [
        {
          id: `news_reshuffle_${Date.now()}`,
          timestamp: `${useGameStore.getState().year}年${useGameStore.getState().month}月`,
          title: `${reshuffleTarget.role}换人`,
          summary: wasBetrayed
            ? `${candidate.name}接替${reshuffleTarget.name}出任${reshuffleTarget.role}。听闻前任结局，新部长神情戒备，初始忠诚度较低。`
            : `${candidate.name}接替${reshuffleTarget.name}出任${reshuffleTarget.role}。`,
          category: '内阁',
          tone: wasBetrayed ? 'negative' : 'neutral',
        },
        ...useGameStore.getState().news,
      ],
    })

    // 记录被替换大臣的解职行为（写入 NPC 记忆系统）
    useGameStore.getState().recordNPCAction(
      reshuffleTarget.id,
      'dismissed',
      `被替换出 ${reshuffleTarget.role} 职位`,
    )

    setReshuffleTarget(null)
    setReshuffleMode(null)
    setSelectedCandidate(null)
  }

  /** 确认设立新部门 */
  const confirmCreateDepartment = () => {
    const trimmedName = newDeptName.trim()
    if (!trimmedName || newDeptCandidate === null) return
    const candidate = NEW_DEPARTMENT_CANDIDATES[newDeptCandidate]
    if (!candidate) return

    // 检查部门名是否已存在
    if (cabinet.some((c) => c.role === trimmedName)) {
      return
    }

    const newMember: CabinetMember = {
      id: `cab_custom_${Date.now()}`,
      name: candidate.name,
      role: trimmedName,
      loyalty: candidate.loyalty,
      specialty: candidate.specialty,
      advice: candidate.advice,
      dismissible: true,
      bonuses: { ...candidate.bonuses },
    }

    useGameStore.setState({
      cabinet: [...cabinet, newMember],
      metrics: {
        ...metrics,
        stability: clamp(metrics.stability - 1),
        prestige: clamp(metrics.prestige + 3),
        approval: clamp(metrics.approval + 1),
      },
      news: [
        {
          id: `news_newdept_${Date.now()}`,
          timestamp: `${useGameStore.getState().year}年${useGameStore.getState().month}月`,
          title: `新设${trimmedName}职位`,
          summary: `${candidate.name}获任命为首任${trimmedName}，内阁扩容以应对新形势。`,
          category: '内阁',
          tone: 'positive',
        },
        ...useGameStore.getState().news,
      ],
    })

    setReshuffleMode(null)
    setNewDeptName('')
    setNewDeptCandidate(null)
  }

  const handleDismiss = (member: CabinetMember) => {
    // 打开改组弹窗，预选该成员
    setReshuffleTarget(member)
    setReshuffleMode('replace')
    setSelectedCandidate(null)
    setShowActionMenu(false)
    setSelectedMember(null)
  }

  const avgLoyalty = cabinet.length > 0
    ? Math.round(cabinet.reduce((sum, c) => sum + c.loyalty, 0) / cabinet.length)
    : 0

  // 计算内阁总加成
  const totalBonuses: CabinetBonus = { approval: 0, treasury: 0, economy: 0, stability: 0, diplomacy: 0, prestige: 0 }
  for (const member of cabinet) {
    const factor = member.loyalty / 100
    for (const [key, value] of Object.entries(member.bonuses)) {
      totalBonuses[key as keyof CabinetBonus] += Math.round(value * factor)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-display text-lg font-semibold tracking-[0.25em] text-gold">
          内 阁 管 理
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
      </div>

      {/* 内阁概览 */}
      <div className="doc-card p-4 mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="font-serif text-[10px] text-parchment-200/50 mb-1">成员数量</div>
            <div className="font-mono text-xl font-bold text-parchment-100">{cabinet.length}</div>
          </div>
          <div>
            <div className="font-serif text-[10px] text-parchment-200/50 mb-1">平均忠诚度</div>
            <div className={`font-mono text-xl font-bold ${
              avgLoyalty >= 70 ? 'text-green-400' : avgLoyalty >= 45 ? 'text-orange-400' : 'text-red-400'
            }`}>{avgLoyalty}</div>
          </div>
          <div>
            <div className="font-serif text-[10px] text-parchment-200/50 mb-1">需关注成员</div>
            <div className="font-mono text-xl font-bold text-red-400">
              {cabinet.filter((c) => c.loyalty < 45).length}
            </div>
          </div>
          <div>
            <div className="font-serif text-[10px] text-parchment-200/50 mb-1">内阁总加成</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(totalBonuses).filter(([, v]) => v !== 0).map(([key, value]) => (
                <span
                  key={key}
                  className={`font-mono text-[10px] ${value > 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {METRIC_LABELS[key]} {value > 0 ? '+' : ''}{value}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 内阁行动按钮 */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={handleMeeting}
          className="flex-1 px-4 py-3 bg-gold/15 hover:bg-gold/25 text-gold font-serif text-sm rounded border border-gold/30 transition-colors"
        >
          召开内阁会议
        </button>
        <button
          onClick={handleReshuffle}
          className="flex-1 px-4 py-3 bg-ink-800/60 hover:bg-ink-800/80 text-parchment-200 font-serif text-sm rounded border border-gold/20 transition-colors"
        >
          内阁改组
        </button>
        <button
          onClick={handleBackroomLobby}
          className="flex-1 px-4 py-3 bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 font-serif text-sm rounded border border-purple-500/40 transition-colors"
          title="深夜召集利益集团代表，在棋盘上展开游说博弈"
        >
          🌙 密室游说
        </button>
      </div>

      {/* 内阁成员列表 — 圆桌卡片样式，点击卡片主体跳转聊天 */}
      <div className="flex-1 pb-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-serif text-xs text-parchment-200/60">内阁成员</span>
          <span className="font-mono text-[10px] text-parchment-200/40">
            点击成员卡片可进入私信对话
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {cabinet.map((member, i) => {
              const loyaltyColor =
                member.loyalty >= 70
                  ? 'text-green-400'
                  : member.loyalty >= 45
                  ? 'text-orange-400'
                  : 'text-red-400'
              const loyaltyBg =
                member.loyalty >= 70
                  ? 'bg-green-500'
                  : member.loyalty >= 45
                  ? 'bg-orange-500'
                  : 'bg-red-500'
              const unread = unreadCount(member.id)
              // 首字作为头像
              const initial = (member.name || '?').slice(0, 1)

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.04 }}
                  className="doc-card group relative flex flex-col p-3 transition-all hover:border-gold/40 hover:shadow-gold/20"
                >
                  {/* 顶部：头像 + 姓名/职务 + 未读角标 */}
                  <button
                    onClick={() => goToChatWith(member)}
                    className="flex items-start gap-3 text-left"
                    title={`与 ${member.name} 对话`}
                  >
                    <div className="relative shrink-0">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-gold/40 bg-gradient-to-br from-ink-800 to-ink-900 font-display text-lg font-bold text-gold shadow-gold/30">
                        {initial}
                      </div>
                      {unread > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold text-white">
                          {unread}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif text-sm font-semibold text-parchment-100 truncate">
                          {member.name}
                        </span>
                      </div>
                      <div className="font-serif text-[11px] text-gold/70 truncate">
                        {member.role}
                      </div>
                      <p className="font-serif text-[10px] text-parchment-200/40 italic mt-0.5 line-clamp-1">
                        "{member.advice}"
                      </p>
                    </div>
                  </button>

                  {/* 忠诚度条 */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-serif text-[9px] text-parchment-200/50 shrink-0">忠诚</span>
                    <div className="flex-1 progress-track h-1.5">
                      <motion.div
                        className={`h-full rounded-full ${loyaltyBg}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${member.loyalty}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className={`font-mono text-[11px] font-bold ${loyaltyColor} shrink-0`}>
                      {member.loyalty}
                    </span>
                  </div>

                  {/* 加成 */}
                  <div className="mt-2 flex items-center gap-1.5 min-h-[14px]">
                    <span className="font-serif text-[9px] text-parchment-200/50 shrink-0">加成</span>
                    <BonusDisplay bonuses={member.bonuses} loyalty={member.loyalty} compact />
                  </div>

                  {/* 底部行动条 */}
                  <div className="mt-3 flex items-center gap-1.5 border-t border-gold/10 pt-2">
                    <button
                      onClick={() => goToChatWith(member)}
                      className="flex-1 rounded bg-gold/10 px-2 py-1 font-serif text-[11px] font-bold text-gold transition-colors hover:bg-gold/20"
                    >
                      💬 私信 {unread > 0 && <span className="text-red-400">·{unread}</span>}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMember(member)
                        setShowActionMenu(true)
                      }}
                      className="rounded bg-ink-900/40 px-2 py-1 font-serif text-[11px] text-parchment-200/60 transition-colors hover:bg-red-600/20 hover:text-red-400"
                      title="解职"
                    >
                      解职
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* 内阁会议事件弹窗 */}
      <AnimatePresence>
        {meetingEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setMeetingEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📋</span>
                <h3 className="font-display text-lg font-bold text-gold">
                  {meetingEvent.title}
                </h3>
              </div>
              <p className="font-serif text-sm text-parchment-200 mb-5 leading-relaxed">
                {meetingEvent.description}
              </p>
              <div className="space-y-3">
                {meetingEvent.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleMeetingOption(option.id)}
                    className="option-btn w-full text-left p-4"
                  >
                    <div className="font-serif text-sm font-semibold text-parchment-100 mb-1">
                      {option.label}
                    </div>
                    <div className="font-serif text-xs text-parchment-200/60 mb-2">
                      {option.description}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {shouldShowOptionEffects(option, difficulty) ? (
                        Object.entries(option.effects).map(([key, value]) => {
                          const v = value ?? 0
                          return (
                            <span
                              key={key}
                              className={`font-mono ${v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-parchment-200/50'}`}
                            >
                              {METRIC_LABELS[key] ?? key} {v > 0 ? '+' : ''}{v}
                            </span>
                          )
                        })
                      ) : (
                        <span className="font-mono italic text-parchment-200/40">? 后果未卜</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 解职确认弹窗 */}
      <AnimatePresence>
        {showActionMenu && selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => {
              setShowActionMenu(false)
              setSelectedMember(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-lg font-bold text-parchment-100 mb-3">
                解职确认
              </h3>
              <p className="font-serif text-sm text-parchment-200 mb-4">
                您即将解除 <span className="font-semibold text-gold">{selectedMember.name}</span> 的{' '}
                <span className="font-semibold">{selectedMember.role}</span> 职务。
              </p>
              <p className="font-serif text-xs text-parchment-200/60 mb-4">
                解职后将从候补名单中选择新成员。此举可能影响社会稳定和您的声望。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDismiss(selectedMember)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-serif text-sm rounded hover:bg-red-700 transition-colors"
                >
                  确认解职
                </button>
                <button
                  onClick={() => {
                    setShowActionMenu(false)
                    setSelectedMember(null)
                  }}
                  className="flex-1 px-4 py-2 bg-ink-900/50 text-parchment-200 font-serif text-sm rounded hover:bg-ink-900/70 transition-colors"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 内阁改组弹窗（菜单 / 更换成员 / 设立新部门） */}
      <AnimatePresence>
        {reshuffleMode !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => {
              setReshuffleMode(null)
              setReshuffleTarget(null)
              setSelectedCandidate(null)
              setNewDeptName('')
              setNewDeptCandidate(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content p-6 max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ===== 模式一：改组菜单 ===== */}
              {reshuffleMode === 'menu' && (
                <>
                  <h3 className="font-display text-lg font-bold text-gold mb-2">
                    内阁改组
                  </h3>
                  <p className="font-serif text-sm text-parchment-200/70 mb-4">
                    选择改组方式：可更换现任成员，或设立全新部门扩充内阁。
                  </p>

                  <div className="grid grid-cols-1 gap-3 mb-4">
                    <button
                      onClick={() => setReshuffleMode('create')}
                      className="text-left p-4 rounded border border-gold/30 bg-gold/10 hover:bg-gold/20 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">✦</span>
                        <span className="font-serif text-sm font-semibold text-gold">
                          设立全新部门
                        </span>
                      </div>
                      <p className="font-serif text-xs text-parchment-200/60">
                        扩充内阁架构，任命新部门首长（科技、教育、卫生等）。
                      </p>
                    </button>
                  </div>

                  <div className="font-serif text-sm font-semibold text-parchment-200 mb-2">
                    更换现任成员
                  </div>
                  <div className="space-y-2 mb-4">
                    {cabinet.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleReshuffleMember(member)}
                        className="w-full text-left p-3 rounded border border-gold/20 bg-ink-900/40 hover:border-gold/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-sm font-semibold text-parchment-100">
                              {member.name}
                            </span>
                            <span className="font-serif text-xs text-parchment-200/60">
                              {member.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs ${
                              member.loyalty >= 70 ? 'text-green-400' : member.loyalty >= 45 ? 'text-orange-400' : 'text-red-400'
                            }`}>
                              忠诚 {member.loyalty}
                            </span>
                            <span className="text-gold text-xs">更换 →</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setReshuffleMode(null)
                        setReshuffleTarget(null)
                        setSelectedCandidate(null)
                      }}
                      className="flex-1 px-4 py-2 bg-ink-900/50 text-parchment-200 font-serif text-sm rounded hover:bg-ink-900/70 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </>
              )}

              {/* ===== 模式二：更换现任成员 ===== */}
              {reshuffleMode === 'replace' && reshuffleTarget && (
                <>
                  <button
                    onClick={() => {
                      setReshuffleMode('menu')
                      setReshuffleTarget(null)
                      setSelectedCandidate(null)
                    }}
                    className="mb-3 text-xs text-parchment-200/60 hover:text-gold transition-colors"
                  >
                    ← 返回改组菜单
                  </button>
                  <h3 className="font-display text-lg font-bold text-gold mb-2">
                    选择继任者 — {reshuffleTarget.role}
                  </h3>
                  <p className="font-serif text-sm text-parchment-200 mb-4">
                    现任：<span className="text-parchment-100 font-semibold">{reshuffleTarget.name}</span>
                    （忠诚度 {reshuffleTarget.loyalty}）
                  </p>

                  {/* 现任加成 */}
                  <div className="signature-area mb-4">
                    <div className="font-serif text-xs text-parchment-200/50 mb-1">现任加成（每月）</div>
                    <BonusDisplay bonuses={reshuffleTarget.bonuses} loyalty={reshuffleTarget.loyalty} />
                  </div>

                  {/* 候补名单 */}
                  <div className="font-serif text-sm font-semibold text-parchment-200 mb-2">候补人选</div>
                  <div className="space-y-2 mb-4">
                    {(REPLACEMENT_CANDIDATES[reshuffleTarget.role] ?? []).map((candidate, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedCandidate(idx)}
                        className={`w-full text-left p-4 rounded border transition-colors ${
                          selectedCandidate === idx
                            ? 'border-gold bg-gold/10'
                            : 'border-gold/20 bg-ink-900/40 hover:border-gold/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-sm font-semibold text-parchment-100">
                              {candidate.name}
                            </span>
                            <span className={`font-mono text-xs ${
                              candidate.loyalty >= 70 ? 'text-green-400' : candidate.loyalty >= 45 ? 'text-orange-400' : 'text-red-400'
                            }`}>
                              忠诚度 {candidate.loyalty}
                            </span>
                          </div>
                          {selectedCandidate === idx && (
                            <span className="text-gold text-xs">✓ 已选</span>
                          )}
                        </div>
                        <p className="font-serif text-xs text-parchment-200/50 italic mb-2">
                          "{candidate.advice}"
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-[10px] text-parchment-200/50">加成</span>
                          <BonusDisplay bonuses={candidate.bonuses} />
                        </div>

                        {/* 加成对比 */}
                        {selectedCandidate === idx && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-2 pt-2 border-t border-gold/10"
                          >
                            <div className="font-serif text-[10px] text-parchment-200/50 mb-1">与现任对比</div>
                            <div className="flex flex-wrap gap-2">
                              {(Object.keys(candidate.bonuses) as (keyof CabinetBonus)[]).map((key) => {
                                const oldVal = Math.round(reshuffleTarget.bonuses[key] * (reshuffleTarget.loyalty / 100))
                                const newVal = Math.round(candidate.bonuses[key] * (candidate.loyalty / 100))
                                const diff = newVal - oldVal
                                if (diff === 0) return null
                                return (
                                  <span
                                    key={key}
                                    className={`font-mono text-[10px] ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}
                                  >
                                    {METRIC_LABELS[key]} {diff > 0 ? '+' : ''}{diff}
                                  </span>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={confirmReshuffle}
                      disabled={selectedCandidate === null}
                      className={`flex-1 px-4 py-2 font-serif text-sm rounded transition-colors ${
                        selectedCandidate !== null
                          ? 'bg-gold text-ink-900 hover:bg-gold/80'
                          : 'bg-ink-900/50 text-parchment-200/30 cursor-not-allowed'
                      }`}
                    >
                      确认任命
                    </button>
                    <button
                      onClick={() => {
                        setReshuffleMode('menu')
                        setReshuffleTarget(null)
                        setSelectedCandidate(null)
                      }}
                      className="flex-1 px-4 py-2 bg-ink-900/50 text-parchment-200 font-serif text-sm rounded hover:bg-ink-900/70 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </>
              )}

              {/* ===== 模式三：设立全新部门 ===== */}
              {reshuffleMode === 'create' && (
                <>
                  <button
                    onClick={() => {
                      setReshuffleMode('menu')
                      setNewDeptName('')
                      setNewDeptCandidate(null)
                    }}
                    className="mb-3 text-xs text-parchment-200/60 hover:text-gold transition-colors"
                  >
                    ← 返回改组菜单
                  </button>
                  <h3 className="font-display text-lg font-bold text-gold mb-2">
                    设立全新部门
                  </h3>
                  <p className="font-serif text-sm text-parchment-200/70 mb-4">
                    为内阁增设新职位，任命首长以应对新形势。设立新部门将提升声望（+3）与民意（+1），但短期稳定略降（-1）。
                  </p>

                  {/* 部门名称输入 */}
                  <div className="mb-4">
                    <div className="font-serif text-sm font-semibold text-parchment-200 mb-2">
                      部门名称
                    </div>
                    <input
                      type="text"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="如：科技部长、教育部长..."
                      className="w-full px-3 py-2 bg-ink-900/60 border border-gold/30 rounded text-parchment-100 font-serif text-sm focus:outline-none focus:border-gold"
                      maxLength={12}
                    />
                    {/* 预设快捷选择 */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {PRESET_DEPARTMENT_NAMES.map((name) => {
                        const exists = cabinet.some((c) => c.role === name)
                        return (
                          <button
                            key={name}
                            onClick={() => !exists && setNewDeptName(name)}
                            disabled={exists}
                            className={`px-2 py-1 rounded text-xs font-serif transition-colors ${
                              exists
                                ? 'bg-ink-900/30 text-parchment-200/20 cursor-not-allowed line-through'
                                : newDeptName === name
                                ? 'bg-gold text-ink-900'
                                : 'bg-ink-900/40 text-parchment-200/70 hover:bg-gold/20 hover:text-gold border border-gold/20'
                            }`}
                          >
                            {name}
                          </button>
                        )
                      })}
                    </div>
                    {newDeptName.trim() && cabinet.some((c) => c.role === newDeptName.trim()) && (
                      <p className="font-serif text-xs text-red-400 mt-1">该部门已存在，请换一个名称。</p>
                    )}
                  </div>

                  {/* 候选首长 */}
                  <div className="font-serif text-sm font-semibold text-parchment-200 mb-2">
                    候选首长
                  </div>
                  <div className="space-y-2 mb-4">
                    {NEW_DEPARTMENT_CANDIDATES.map((candidate, idx) => (
                      <button
                        key={idx}
                        onClick={() => setNewDeptCandidate(idx)}
                        className={`w-full text-left p-4 rounded border transition-colors ${
                          newDeptCandidate === idx
                            ? 'border-gold bg-gold/10'
                            : 'border-gold/20 bg-ink-900/40 hover:border-gold/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-sm font-semibold text-parchment-100">
                              {candidate.name}
                            </span>
                            <span className="font-serif text-xs text-parchment-200/60">
                              专长：{METRIC_LABELS[candidate.specialty] ?? candidate.specialty}
                            </span>
                            <span className={`font-mono text-xs ${
                              candidate.loyalty >= 70 ? 'text-green-400' : candidate.loyalty >= 45 ? 'text-orange-400' : 'text-red-400'
                            }`}>
                              忠诚度 {candidate.loyalty}
                            </span>
                          </div>
                          {newDeptCandidate === idx && (
                            <span className="text-gold text-xs">✓ 已选</span>
                          )}
                        </div>
                        <p className="font-serif text-xs text-parchment-200/50 italic mb-2">
                          "{candidate.advice}"
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-[10px] text-parchment-200/50">加成</span>
                          <BonusDisplay bonuses={candidate.bonuses} />
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={confirmCreateDepartment}
                      disabled={
                        !newDeptName.trim() ||
                        newDeptCandidate === null ||
                        cabinet.some((c) => c.role === newDeptName.trim())
                      }
                      className={`flex-1 px-4 py-2 font-serif text-sm rounded transition-colors ${
                        newDeptName.trim() &&
                        newDeptCandidate !== null &&
                        !cabinet.some((c) => c.role === newDeptName.trim())
                          ? 'bg-gold text-ink-900 hover:bg-gold/80'
                          : 'bg-ink-900/50 text-parchment-200/30 cursor-not-allowed'
                      }`}
                    >
                      确认设立并任命
                    </button>
                    <button
                      onClick={() => {
                        setReshuffleMode('menu')
                        setNewDeptName('')
                        setNewDeptCandidate(null)
                      }}
                      className="flex-1 px-4 py-2 bg-ink-900/50 text-parchment-200 font-serif text-sm rounded hover:bg-ink-900/70 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}