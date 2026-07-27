import type { GameState, ParliamentState, PresidentState, CabinetMember, MetricKey, Metrics, NewsItem, EventOption } from '@/types/game'
import { REPLACEMENT_CANDIDATES } from './cabinet'
import { clamp } from '@/engine/metrics'

/** 议会事件 */
export interface ParliamentEvent {
  id: string
  title: string
  description: string
  options: EventOption[]
}

/** 每届任期月数 */
export const TERM_LENGTH_MONTHS = 48
/** 任期内最多解散议会次数 */
export const MAX_DISSOLUTIONS_PER_TERM = 1
/** 解散议会后冷却月数 */
export const DISSOLUTION_COOLDOWN_MONTHS = 18

/** 议会事件库 */
export const PARLIAMENT_EVENTS: ParliamentEvent[] = [
  {
    id: 'parliament_opposition_challenge',
    title: '反对党发起挑战',
    description: '反对党领袖在议会发表激烈演说，指责政府施政不力，并要求对您进行不信任投票。',
    options: [
      {
        id: 'counter_attack',
        label: '强硬反击',
        description: '当众驳斥反对党，揭露其黑料',
        effects: { prestige: 6, approval: -3, stability: -2 },
        newsTitle: '总理强硬回击反对党',
        newsSummary: '总理在议会与反对党激烈交锋，现场火药味十足。',
        tone: 'neutral',
      },
      {
        id: 'compromise',
        label: '妥协让步',
        description: '承诺调整部分政策以换取支持',
        effects: { approval: 4, prestige: -4, stability: 3 },
        newsTitle: '总理向反对党妥协',
        newsSummary: '政府承诺调整政策方向，反对党暂时息兵。',
        tone: 'neutral',
      },
      {
        id: 'ignore',
        label: '冷处理',
        description: '不予理会，继续推进议程',
        effects: { prestige: 2, approval: -2 },
        newsTitle: '总理无视反对党挑战',
        newsSummary: '总理对反对党指控置若罔闻，坚持原有路线。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'parliament_scandal',
    title: '议员丑闻曝光',
    description: '媒体曝光执政党一名议员涉嫌贪腐，舆论哗然。反对党要求彻查，党内要求切割。',
    options: [
      {
        id: 'expel',
        label: '立即开除党籍',
        description: '迅速切割，展现零容忍态度',
        effects: { approval: 5, prestige: 4, stability: -2 },
        newsTitle: '总理果断开除涉事议员',
        newsSummary: '政府迅速切割，展现反腐决心。',
        tone: 'positive',
      },
      {
        id: 'investigate',
        label: '成立调查组',
        description: '承诺彻查，但暂不开除',
        effects: { approval: 2, prestige: 2, stability: 2 },
        newsTitle: '政府承诺彻查议员丑闻',
        newsSummary: '总理表示将彻查到底，但反对党质疑诚意。',
        tone: 'neutral',
      },
      {
        id: 'defend',
        label: '力挺议员',
        description: '坚称无罪，力挺到底',
        effects: { approval: -6, prestige: -4, stability: -3 },
        newsTitle: '总理力挺涉事议员',
        newsSummary: '政府坚持为议员辩护，舆论批评声浪高涨。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'parliament_budget_fight',
    title: '预算案激战',
    description: '年度预算案提交议会审议，反对党联合部分议员要求大幅削减政府开支，否则将否决预算。',
    options: [
      {
        id: 'negotiate',
        label: '谈判妥协',
        description: '同意部分削减以换取通过',
        effects: { treasury: -4, approval: 2, stability: 3 },
        newsTitle: '预算案艰难通过',
        newsSummary: '政府做出让步，预算案最终获议会通过。',
        tone: 'neutral',
      },
      {
        id: 'stand_firm',
        label: '坚持原案',
        description: '拒绝妥协，呼吁党派团结',
        effects: { treasury: 4, approval: -3, stability: -4 },
        newsTitle: '预算案陷入僵局',
        newsSummary: '政府坚持原案，议会陷入对峙。',
        tone: 'negative',
      },
      {
        id: 'bribe',
        label: '政治交易',
        description: '以利益换取关键票数',
        effects: { treasury: -6, approval: -2, stability: 4, prestige: -3 },
        newsTitle: '预算案通过但争议不断',
        newsSummary: '政府通过政治交易确保预算通过，但被批暗箱操作。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'parliament_media_war',
    title: '媒体攻防战',
    description: '反对党控制的媒体持续攻击政府，执政党要求反击。议会内部就是否加强媒体管控争论不休。',
    options: [
      {
        id: 'counter_narrative',
        label: '加强宣传',
        description: '增加政府正面报道，以攻为守',
        effects: { approval: 4, prestige: 2, treasury: -3 },
        newsTitle: '政府加强正面宣传',
        newsSummary: '政府加大宣传力度，舆论战升温。',
        tone: 'neutral',
      },
      {
        id: 'regulate_media',
        label: '推动媒体监管',
        description: '立法限制反对派媒体',
        effects: { approval: -5, prestige: -3, stability: -4 },
        newsTitle: '政府推动媒体监管法案',
        newsSummary: '反对党批评政府打压新闻自由，国际舆论关注。',
        tone: 'negative',
      },
      {
        id: 'ignore_media',
        label: '不予回应',
        description: '专注施政，让事实说话',
        effects: { prestige: 3, approval: -2 },
        newsTitle: '总理对媒体攻击冷处理',
        newsSummary: '总理表示专注施政，不回应无端指责。',
        tone: 'neutral',
      },
    ],
  },
]

/** 总统事件 */
export interface PresidentEvent {
  id: string
  title: string
  description: string
  options: EventOption[]
}

/** 总统事件库 */
export const PRESIDENT_EVENTS: PresidentEvent[] = [
  {
    id: 'president_policy_conflict',
    title: '政策分歧',
    description: '总统公开批评您的某项政策，称其"不符合国家利益"，要求您立即调整。',
    options: [
      {
        id: 'concede',
        label: '妥协调整',
        description: '尊重总统意见，调整政策',
        effects: { prestige: -4, approval: 3, stability: 2 },
        newsTitle: '总理调整政策回应总统',
        newsSummary: '政府表示将听取总统建议，调整政策方向。',
        tone: 'neutral',
      },
      {
        id: 'defend',
        label: '坚持立场',
        description: '坚称政策正确，拒绝调整',
        effects: { prestige: 5, approval: -3, stability: -3 },
        newsTitle: '总理坚持政策不回退',
        newsSummary: '总理表示政策方向正确，不会因外界压力改变。',
        tone: 'neutral',
      },
      {
        id: 'negotiate',
        label: '私下协商',
        description: '与总统私下沟通，寻求共识',
        effects: { prestige: 2, approval: 1, stability: 1 },
        newsTitle: '府院私下协商达成共识',
        newsSummary: '总理与总统私下沟通，就政策细节达成一致。',
        tone: 'positive',
      },
    ],
  },
  {
    id: 'president_appointment',
    title: '人事任命争议',
    description: '总统拒绝任命您提名的一位重要官员，称其"资历不足"，要求更换人选。',
    options: [
      {
        id: 'accept',
        label: '更换人选',
        description: '接受总统意见，重新提名',
        effects: { prestige: -3, approval: 2, stability: 2 },
        newsTitle: '总理更换提名官员',
        newsSummary: '政府表示将重新考虑人选，尊重总统意见。',
        tone: 'neutral',
      },
      {
        id: 'insist',
        label: '坚持提名',
        description: '坚称人选合适，要求总统批准',
        effects: { prestige: 4, approval: -2, stability: -3 },
        newsTitle: '总理坚持提名引发府院对峙',
        newsSummary: '总理坚持原人选，府院关系紧张。',
        tone: 'negative',
      },
      {
        id: 'compromise',
        label: '提出折中方案',
        description: '提名双方都能接受的人选',
        effects: { prestige: 1, approval: 1, stability: 1 },
        newsTitle: '府院就人事任命达成妥协',
        newsSummary: '总理与总统协商后提名折中人选。',
        tone: 'positive',
      },
    ],
  },
  {
    id: 'president_foreign_policy',
    title: '外交路线之争',
    description: '总统主张采取更激进的外交路线，与您当前的温和路线产生冲突。',
    options: [
      {
        id: 'align',
        label: '调整外交路线',
        description: '向总统靠拢，采取更强硬姿态',
        effects: { diplomacy: -5, prestige: 4, approval: 2 },
        newsTitle: '政府外交路线转向强硬',
        newsSummary: '总理调整外交策略，采取更强硬立场。',
        tone: 'neutral',
      },
      {
        id: 'maintain',
        label: '坚持温和路线',
        description: '拒绝调整，坚持当前路线',
        effects: { diplomacy: 4, prestige: -3, approval: -2 },
        newsTitle: '总理坚持温和外交路线',
        newsSummary: '总理表示将继续推行温和外交政策。',
        tone: 'neutral',
      },
      {
        id: 'blend',
        label: '融合两种路线',
        description: '在关键议题上强硬，其他保持温和',
        effects: { diplomacy: 1, prestige: 2, approval: 1 },
        newsTitle: '政府外交路线微调',
        newsSummary: '总理表示将在关键议题上采取更强硬立场。',
        tone: 'positive',
      },
    ],
  },
  {
    id: 'president_economic_crisis',
    title: '经济危机应对',
    description: '经济出现下滑迹象，总统要求您立即采取紧急措施，否则将公开批评政府无能。',
    options: [
      {
        id: 'stimulus',
        label: '推出刺激计划',
        description: '大规模财政刺激',
        effects: { economy: 6, treasury: -8, approval: 4 },
        newsTitle: '政府推出经济刺激计划',
        newsSummary: '总理宣布大规模刺激措施，市场反应积极。',
        tone: 'positive',
      },
      {
        id: 'austerity',
        label: '紧缩政策',
        description: '削减开支，稳定财政',
        effects: { economy: -3, treasury: 5, approval: -5 },
        newsTitle: '政府实施紧缩政策',
        newsSummary: '总理宣布削减开支，民众不满情绪上升。',
        tone: 'negative',
      },
      {
        id: 'blame_president',
        label: '推责总统',
        description: '公开指责总统干预经济政策',
        effects: { prestige: 3, approval: -4, stability: -5 },
        newsTitle: '府院经济政策之争公开化',
        newsSummary: '总理指责总统干预经济政策，府院关系恶化。',
        tone: 'negative',
      },
    ],
  },
]

/** 初始议会状态 */
export const INITIAL_PARLIAMENT: ParliamentState = {
  rulingPartySeats: 55,
  confidence: 65,
  dissolved: false,
  dissolveCooldown: 0,
  dissolutionsThisTerm: 0,
  termStartTurn: 1,
}

/** 初始总统状态 */
export const INITIAL_PRESIDENT: PresidentState = {
  name: '李正国',
  relation: 60,
  sameParty: true,
  background: '资深政治家，曾任外交部长',
  temperament: 'moderate',
}

/** 总统姓名池（中文姓名） */
const PRESIDENT_NAMES = [
  '李正国', '王明远', '张文博', '陈志强', '刘建华',
  '赵宏图', '黄思齐', '周振华', '吴承恩', '徐立群',
  '孙德海', '马俊杰', '朱国梁', '胡景明', '郭守正',
  '林宗翰', '何承志', '高建邦', '罗文渊', '梁安邦',
]

/** 总统背景池 */
const PRESIDENT_BACKGROUNDS = [
  { background: '资深政治家，曾任外交部长', temperament: 'moderate' as const },
  { background: '退役将军，军方背景深厚', temperament: 'strong' as const },
  { background: '法学教授出身，崇尚宪政', temperament: 'moderate' as const },
  { background: '商界巨头转政坛，务实派', temperament: 'pragmatic' as const },
  { background: '工会领袖出身，亲民路线', temperament: 'moderate' as const },
  { background: '前中央银行行长，经济专家', temperament: 'pragmatic' as const },
  { background: '资深检察官，铁腕反腐', temperament: 'strong' as const },
  { background: '学术界转政界，理想主义者', temperament: 'moderate' as const },
  { background: '地方长官出身，基层经验丰富', temperament: 'pragmatic' as const },
  { background: '退伍军官，民族主义者', temperament: 'strong' as const },
]

/**
 * 随机生成总统
 * @param playerPartyId 玩家所选执政党 ID
 * @param forceSameParty 强制同党（默认 false，有 40% 概率异党）
 */
export function generateRandomPresident(playerPartyId?: string, forceSameParty = false): PresidentState {
  const name = PRESIDENT_NAMES[Math.floor(Math.random() * PRESIDENT_NAMES.length)]
  const bg = PRESIDENT_BACKGROUNDS[Math.floor(Math.random() * PRESIDENT_BACKGROUNDS.length)]

  // 40% 概率异党（除非强制同党）
  const sameParty = forceSameParty ? true : Math.random() < 0.6

  // 异党总统初始关系较低（40-55），同党总统较高（55-75）
  const relation = sameParty
    ? 55 + Math.floor(Math.random() * 21)
    : 40 + Math.floor(Math.random() * 16)

  return {
    name,
    relation,
    sameParty,
    background: bg.background,
    temperament: bg.temperament,
  }
}

/** 议会行动选项 */
export interface ParliamentActionOption {
  id: string
  label: string
  description: string
  icon: string
  available: (state: GameState) => boolean
  execute: (state: GameState) => { state: Partial<GameState>; news: { title: string; summary: string; tone: 'positive' | 'negative' | 'neutral' } }
}

export const PARLIAMENT_ACTIONS: ParliamentActionOption[] = [
  {
    id: 'dissolve',
    label: '提请解散议会',
    description: '请求总统解散议会，提前举行大选。每届任期最多解散 1 次，且需冷却 18 个月。',
    icon: '🏛️',
    available: (state) =>
      !state.parliament.dissolved &&
      state.parliament.dissolveCooldown <= 0 &&
      state.parliament.dissolutionsThisTerm < MAX_DISSOLUTIONS_PER_TERM &&
      (state.turn - state.parliament.termStartTurn) >= 6,
    execute: (state) => {
      const seats = state.parliament.rulingPartySeats
      const success = seats >= 50 && Math.random() * 100 < seats * 0.8
      if (success) {
        const newSeats = clamp(state.parliament.rulingPartySeats + Math.floor(Math.random() * 10 - 3))
        return {
          state: {
            parliament: {
              ...state.parliament,
              dissolved: true,
              dissolveCooldown: DISSOLUTION_COOLDOWN_MONTHS,
              dissolutionsThisTerm: state.parliament.dissolutionsThisTerm + 1,
              rulingPartySeats: newSeats,
              confidence: clamp(state.parliament.confidence + 10),
            },
            metrics: {
              ...state.metrics,
              prestige: clamp(state.metrics.prestige + (newSeats > seats ? 6 : -4)),
              stability: clamp(state.metrics.stability - 4),
            },
          },
          news: {
            title: '议会解散成功，提前大选举行',
            summary: newSeats > seats
              ? `执政党席位增至${newSeats}%，总理政治豪赌成功。`
              : `执政党席位变为${newSeats}%，结果不如预期。`,
            tone: newSeats > seats ? 'positive' : 'negative',
          },
        }
      }
      return {
        state: {
          parliament: {
            ...state.parliament,
            dissolveCooldown: DISSOLUTION_COOLDOWN_MONTHS,
            dissolutionsThisTerm: state.parliament.dissolutionsThisTerm + 1,
            confidence: clamp(state.parliament.confidence - 8),
          },
          metrics: {
            ...state.metrics,
            prestige: clamp(state.metrics.prestige - 8),
          },
        },
        news: {
          title: '解散议会提案被否决',
          summary: '总统拒绝解散议会，总理权威受损。',
          tone: 'negative',
        },
      }
    },
  },
  {
    id: 'qa_session',
    label: '参加议会质询',
    description: '出席议会质询环节，回应议员提问。表现好可提升信任度，表现差则适得其反。',
    icon: '🎤',
    available: (state) => !state.parliament.dissolved,
    execute: (state) => {
      const approval = state.metrics.approval
      const prestige = state.metrics.prestige
      const performance = (approval + prestige) / 2 + Math.random() * 20 - 10
      const good = performance > 50
      return {
        state: {
          parliament: {
            ...state.parliament,
            confidence: clamp(state.parliament.confidence + (good ? 6 : -4)),
          },
          metrics: {
            ...state.metrics,
            prestige: clamp(state.metrics.prestige + (good ? 4 : -3)),
            approval: clamp(state.metrics.approval + (good ? 2 : -2)),
          },
        },
        news: {
          title: good ? '总理质询表现出色' : '总理质询表现欠佳',
          summary: good
            ? '总理在议会质询中应对自如，赢得跨党派掌声。'
            : '总理在质询中频频失言，反对党抓住把柄大肆攻击。',
          tone: good ? 'positive' : 'negative',
        },
      }
    },
  },
  {
    id: 'vote_confidence',
    label: '发起信任投票',
    description: '主动在议会发起信任投票，展示执政合法性。若失败则被迫辞职。',
    icon: '🗳️',
    available: (state) => !state.parliament.dissolved && state.parliament.confidence >= 40,
    execute: (state) => {
      const conf = state.parliament.confidence
      const pass = Math.random() * 100 < conf
      if (pass) {
        return {
          state: {
            parliament: {
              ...state.parliament,
              confidence: clamp(conf + 10),
            },
            metrics: {
              ...state.metrics,
              prestige: clamp(state.metrics.prestige + 8),
              approval: clamp(state.metrics.approval + 4),
            },
          },
          news: {
            title: '信任投票高票通过',
            summary: `议会以${Math.round(conf)}%的支持率通过信任投票，总理执政地位稳固。`,
            tone: 'positive',
          },
        }
      }
      return {
        state: {
          parliament: { ...state.parliament, confidence: clamp(conf - 15) },
          metrics: {
            ...state.metrics,
            prestige: clamp(state.metrics.prestige - 12),
            approval: clamp(state.metrics.approval - 8),
          },
        },
        news: {
          title: '信任投票未通过，总理地位动摇',
          summary: '反对党欢庆胜利，执政党内部出现分裂迹象。',
          tone: 'negative',
        },
      }
    },
  },
  {
    id: 'propose_law',
    label: '推动立法议程',
    description: '向议会提交新法案，推动政策落地。需要消耗政治资本。',
    icon: '📜',
    available: (state) => !state.parliament.dissolved && state.parliament.rulingPartySeats >= 40,
    execute: (state) => {
      const seats = state.parliament.rulingPartySeats
      const pass = Math.random() * 100 < seats * 0.9
      if (pass) {
        return {
          state: {
            metrics: {
              ...state.metrics,
              approval: clamp(state.metrics.approval + 5),
              prestige: clamp(state.metrics.prestige + 4),
              economy: clamp(state.metrics.economy + 3),
            },
            parliament: {
              ...state.parliament,
              confidence: clamp(state.parliament.confidence + 3),
            },
          },
          news: {
            title: '总理推动的法案在议会通过',
            summary: '新法案获多数票通过，将惠及民生。',
            tone: 'positive',
          },
        }
      }
      return {
        state: {
          metrics: {
            ...state.metrics,
            prestige: clamp(state.metrics.prestige - 4),
          },
          parliament: {
            ...state.parliament,
            confidence: clamp(state.parliament.confidence - 5),
          },
        },
        news: {
          title: '总理推动的法案被议会否决',
          summary: '反对党联合投票否决法案，总理立法议程受挫。',
          tone: 'negative',
        },
      }
    },
  },
]

/** 总统互动选项 */
export interface PresidentActionOption {
  id: string
  label: string
  description: string
  icon: string
  available: (state: GameState) => boolean
  execute: (state: GameState) => { state: Partial<GameState>; news: { title: string; summary: string; tone: 'positive' | 'negative' | 'neutral' } }
}

export const PRESIDENT_ACTIONS: PresidentActionOption[] = [
  {
    id: 'meet_president',
    label: '拜会总统',
    description: '与总统进行私下会谈，改善关系或争取支持。',
    icon: '🤝',
    available: () => true,
    execute: (state) => {
      const rel = state.president.relation
      const sameParty = state.president.sameParty
      const boost = sameParty ? 8 : 3
      return {
        state: {
          president: {
            ...state.president,
            relation: clamp(rel + boost + Math.floor(Math.random() * 5)),
          },
          metrics: {
            ...state.metrics,
            prestige: clamp(state.metrics.prestige + 2),
          },
        },
        news: {
          title: '总理与总统举行会谈',
          summary: sameParty
            ? '同党总统对总理工作表示支持，双方达成共识。'
            : '跨党派会谈气氛友好，但实质进展有限。',
          tone: 'positive',
        },
      }
    },
  },
  {
    id: 'request_support',
    label: '请求总统支持政策',
    description: '请总统公开背书您的政策议程，可提升议会信任度。',
    icon: '📢',
    available: (state) => state.president.relation >= 50,
    execute: (state) => {
      const rel = state.president.relation
      const success = Math.random() * 100 < rel
      if (success) {
        return {
          state: {
            parliament: {
              ...state.parliament,
              confidence: clamp(state.parliament.confidence + 8),
            },
            metrics: {
              ...state.metrics,
              prestige: clamp(state.metrics.prestige + 5),
            },
          },
          news: {
            title: '总统公开支持总理政策',
            summary: '总统发表声明支持总理施政方向，执政联盟士气大振。',
            tone: 'positive',
          },
        }
      }
      return {
        state: {
          president: { ...state.president, relation: clamp(rel - 6) },
          metrics: { ...state.metrics, prestige: clamp(state.metrics.prestige - 3) },
        },
        news: {
          title: '总统拒绝为总理背书',
          summary: '总统公开表示「需要审慎评估」，总理略显尴尬。',
          tone: 'negative',
        },
      }
    },
  },
  {
    id: 'pressure_president',
    label: '向总统施压',
    description: '利用民意优势向总统施压，迫使其配合您的议程。风险较大。',
    icon: '⚡',
    available: (state) => state.metrics.approval >= 55,
    execute: (state) => {
      const approval = state.metrics.approval
      const success = Math.random() * 100 < approval * 0.7
      if (success) {
        return {
          state: {
            president: { ...state.president, relation: clamp(state.president.relation - 5) },
            parliament: { ...state.parliament, confidence: clamp(state.parliament.confidence + 5) },
            metrics: { ...state.metrics, prestige: clamp(state.metrics.prestige + 6) },
          },
          news: {
            title: '总理施压成功，总统让步',
            summary: '在民意压力下，总统同意配合总理的政策议程。',
            tone: 'positive',
          },
        }
      }
      return {
        state: {
          president: { ...state.president, relation: clamp(state.president.relation - 12) },
          metrics: {
            ...state.metrics,
            prestige: clamp(state.metrics.prestige - 8),
            approval: clamp(state.metrics.approval - 4),
          },
        },
        news: {
          title: '总理施压失败，总统强硬回击',
          summary: '总统发表声明批评总理「越权」，府院关系恶化。',
          tone: 'negative',
        },
      }
    },
  },
]

/** 内阁互动选项 */
export interface CabinetActionOption {
  id: string
  label: string
  description: string
  icon: string
  available: (state: GameState) => boolean
  execute: (state: GameState) => { state: Partial<GameState>; news: { title: string; summary: string; tone: 'positive' | 'negative' | 'neutral' } }
}

export const CABINET_ACTIONS: CabinetActionOption[] = [
  {
    id: 'reshuffle',
    label: '内阁改组',
    description: '调整内阁成员职位，可提升整体效率。忠诚度低的成员可能被替换。',
    icon: '🔄',
    available: (state) => state.cabinet.length > 0,
    execute: (state) => {
      const lowLoyalty = state.cabinet.filter((c) => c.loyalty < 50)
      let newCabinet = [...state.cabinet]
      const changes: string[] = []

      for (const member of lowLoyalty) {
        const candidates = REPLACEMENT_CANDIDATES[member.role]
        if (candidates && candidates.length > 0) {
          const candidate = candidates[Math.floor(Math.random() * candidates.length)]
          const idx = newCabinet.findIndex((c) => c.id === member.id)
          if (idx >= 0) {
            newCabinet[idx] = {
              ...member,
              name: candidate.name,
              loyalty: candidate.loyalty,
              advice: candidate.advice,
            }
            changes.push(`${candidate.name}接替${member.name}出任${member.role}`)
          }
        }
      }

      // 所有成员忠诚度小幅波动
      newCabinet = newCabinet.map((c) => ({
        ...c,
        loyalty: clamp(c.loyalty + Math.floor(Math.random() * 10 - 3)),
      }))

      return {
        state: { cabinet: newCabinet },
        news: {
          title: changes.length > 0 ? '内阁改组完成' : '内阁小幅调整',
          summary: changes.length > 0
            ? changes.join('；') + '。'
            : '总理对内阁进行微调，各部长职位基本不变。',
          tone: changes.length > 0 ? 'neutral' : 'neutral',
        },
      }
    },
  },
  {
    id: 'boost_loyalty',
    label: '召开内阁会议',
    description: '与全体内阁成员开会，统一思想，提升团队凝聚力。',
    icon: '📋',
    available: () => true,
    execute: (state) => {
      const newCabinet = state.cabinet.map((c) => ({
        ...c,
        loyalty: clamp(c.loyalty + Math.floor(Math.random() * 6 + 2)),
      }))
      return {
        state: { cabinet: newCabinet },
        news: {
          title: '总理召开内阁会议',
          summary: '各部长统一思想认识，团队凝聚力提升。',
          tone: 'positive',
        },
      }
    },
  },
  {
    id: 'dismiss_member',
    label: '解职内阁成员',
    description: '解除某位内阁成员的职务。将影响该部门效率和团队稳定。',
    icon: '❌',
    available: (state) => state.cabinet.some((c) => c.loyalty < 45),
    execute: (state) => {
      const target = state.cabinet.filter((c) => c.loyalty < 45)[0]
      if (!target) return { state: {}, news: { title: '', summary: '', tone: 'neutral' } }

      const candidates = REPLACEMENT_CANDIDATES[target.role]
      if (!candidates || candidates.length === 0) {
        return {
          state: { cabinet: state.cabinet.filter((c) => c.id !== target.id) },
          news: {
            title: `${target.name}被解除${target.role}职务`,
            summary: '总理果断换人，但新任人选尚未确定。',
            tone: 'negative',
          },
        }
      }

      const candidate = candidates[Math.floor(Math.random() * candidates.length)]
      const newCabinet = state.cabinet.map((c) =>
        c.id === target.id
          ? { ...c, name: candidate.name, loyalty: candidate.loyalty, advice: candidate.advice }
          : c,
      )

      return {
        state: { cabinet: newCabinet },
        news: {
          title: `${target.role}换人`,
          summary: `${candidate.name}接替${target.name}出任${target.role}。`,
          tone: 'neutral',
        },
      }
    },
  },
]

/** 总理日常行动选项 */
export interface DailyActionOption {
  id: string
  label: string
  description: string
  icon: string
  cooldown: number
  available: (state: GameState, lastUsedTurn: Record<string, number>) => boolean
  execute: (state: GameState) => { state: Partial<GameState>; news: { title: string; summary: string; tone: 'positive' | 'negative' | 'neutral' } }
}

export const DAILY_ACTIONS: DailyActionOption[] = [
  {
    id: 'speech',
    label: '发表全国演说',
    description: '通过电视与广播向全国发表演说，提振民心。',
    icon: '🎙️',
    cooldown: 6,
    available: (state, lastUsed) => (state.turn - (lastUsed['speech'] ?? 0)) >= 6,
    execute: (state) => {
      const boost = Math.floor(Math.random() * 6 + 3)
      return {
        state: {
          metrics: {
            ...state.metrics,
            approval: clamp(state.metrics.approval + boost),
            prestige: clamp(state.metrics.prestige + 2),
          },
        },
        news: {
          title: '总理发表全国电视演说',
          summary: '总理在演说中回顾施政成果，展望未来蓝图，民众反响积极。',
          tone: 'positive',
        },
      }
    },
  },
  {
    id: 'inspect',
    label: '视察地方',
    description: '亲赴地方视察，了解基层情况，拉近与民众距离。',
    icon: '🚗',
    cooldown: 8,
    available: (state, lastUsed) => (state.turn - (lastUsed['inspect'] ?? 0)) >= 8,
    execute: (state) => {
      return {
        state: {
          metrics: {
            ...state.metrics,
            approval: clamp(state.metrics.approval + 4),
            stability: clamp(state.metrics.stability + 3),
            economy: clamp(state.metrics.economy + 2),
          },
          secondary: {
            ...state.secondary,
            ruralSupport: clamp(state.secondary.ruralSupport + 6),
            urbanSupport: clamp(state.secondary.urbanSupport + 2),
          },
        },
        news: {
          title: '总理赴地方视察',
          summary: '总理深入基层，走访工厂与农村，民众夹道欢迎。',
          tone: 'positive',
        },
      }
    },
  },
  {
    id: 'diplomacy_call',
    label: '外交热线',
    description: '与外国领导人通电话，处理外交事务。',
    icon: '📞',
    cooldown: 5,
    available: (state, lastUsed) => (state.turn - (lastUsed['diplomacy_call'] ?? 0)) >= 5,
    execute: (state) => {
      const boost = Math.floor(Math.random() * 5 + 2)
      return {
        state: {
          metrics: {
            ...state.metrics,
            diplomacy: clamp(state.metrics.diplomacy + boost),
            prestige: clamp(state.metrics.prestige + 1),
          },
        },
        news: {
          title: '总理与外国领导人通话',
          summary: '双方就共同关心的议题交换意见，达成若干共识。',
          tone: 'positive',
        },
      }
    },
  },
  {
    id: 'rest',
    label: '处理日常政务',
    description: '安静地处理案头文件，不做特别举动。各项指标小幅自然恢复。',
    icon: '📂',
    cooldown: 0,
    available: () => true,
    execute: (state) => {
      return {
        state: {
          metrics: {
            ...state.metrics,
            treasury: clamp(state.metrics.treasury + 2),
          },
        },
        news: {
          title: '总理处理日常政务',
          summary: '本月无特别行动，政务平稳推进。',
          tone: 'neutral',
        },
      }
    },
  },
]