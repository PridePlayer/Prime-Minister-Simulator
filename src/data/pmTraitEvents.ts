// 总理特质事件：在游戏中触发，改变 pmTraitsNumeric 数值
// 触发条件基于特质阈值（如健康<30）或时间点（如任期过半）
import type { PMTraits, EventOption, GameState } from '@/types/game'

export interface PMTraitEvent {
  id: string
  title: string
  description: string
  /** 触发条件函数 */
  trigger: (state: GameState) => boolean
  /** 选项 */
  options: PMTraitEventOption[]
}

interface PMTraitEventOption extends EventOption {
  /** 改变总理特质数值（增减） */
  traitEffects?: Partial<PMTraits>
}

/**
 * 总理特质事件池
 * - 健康事件：健康低于 30 触发病休
 * - 道德事件：道德过高或过低触发不同剧情
 * - 魅力事件：外交成功后魅力提升
 * - 韧性事件：连续负面事件后韧性受考验
 * - 果断事件：紧急事件中表现影响果断
 */
export const PM_TRAIT_EVENTS: PMTraitEvent[] = [
  // ===== 健康事件 =====
  {
    id: 'pmtrait_health_sick',
    title: '总理健康告急',
    description: '长期高强度工作让总理身体亮起红灯。医生建议立即休养，但当前国事繁忙，休养意味着推迟多项重要议程。',
    trigger: (s) => s.pmTraitsNumeric.health < 30 && s.turn > 6,
    options: [
      {
        id: 'rest',
        label: '遵医嘱休养两周',
        effects: { stability: -3 },
        traitEffects: { health: 20, decisiveness: -5 },
        newsTitle: '总理病休两周，副总理代行职权',
        newsSummary: '总理因健康原因短期休养，期间国事由副总理代行处理，部分议程推迟。',
        tone: 'neutral',
      },
      {
        id: 'persist',
        label: '带病坚持工作',
        effects: { stability: 2 },
        traitEffects: { health: -10, resilience: 5 },
        newsTitle: '总理带病坚持工作，赢得议会敬意',
        newsSummary: '总理在身体不适的情况下仍坚持主持内阁会议，但其健康状况令幕僚担忧。',
        tone: 'positive',
      },
    ],
  },
  {
    id: 'pmtrait_health_checkup',
    title: '年度体检报告',
    description: '总理的年度体检报告出炉。结果显示长期执政带来的身体负担，但整体尚可控制。',
    trigger: (s) => s.turn > 0 && s.turn % 12 === 0,
    options: [
      {
        id: 'healthy_lifestyle',
        label: '调整作息，加强锻炼',
        effects: {},
        traitEffects: { health: 8, decisiveness: -2 },
        newsTitle: '总理开始严格执行健康作息',
        newsSummary: '总理公开承诺调整工作节奏，每日坚持锻炼，以更好的状态服务国家。',
        tone: 'positive',
      },
      {
        id: 'ignore',
        label: '无暇顾及，继续埋头工作',
        effects: {},
        traitEffects: { health: -5, resilience: 3 },
        newsTitle: '总理忽视健康警告',
        newsSummary: '面对体检报告的建议，总理选择继续高强度工作，幕僚私下表示担忧。',
        tone: 'neutral',
      },
    ],
  },

  // ===== 道德事件 =====
  {
    id: 'pmtrait_integrity_bribe',
    title: '商人的"心意"',
    description: '一位与政府有合作关系的富商通过中间人送来一份"心意"——价值不菲的古董。他暗示这是对总理推动其产业政策的"感谢"。',
    trigger: (s) => s.pmTraitsNumeric.integrity < 50 && s.turn > 8,
    options: [
      {
        id: 'accept',
        label: '收下古董，以为不知情',
        effects: { treasury: 0, prestige: -2 },
        traitEffects: { integrity: -15 },
        pmStatEffects: { riskIndex: 10 },
        newsTitle: '总理被曝收受富商馈赠',
        newsSummary: '媒体爆料总理收受价值连城的古董，反对党要求独立调查。',
        tone: 'negative',
      },
      {
        id: 'reject',
        label: '严词拒绝并警告中间人',
        effects: { prestige: 3 },
        traitEffects: { integrity: 10, charisma: 3 },
        newsTitle: '总理拒绝富商馈赠，赢得舆论赞誉',
        newsSummary: '总理公开拒绝价值连城的古董，并警告相关人员不得再有类似行为。',
        tone: 'positive',
      },
      {
        id: 'report',
        label: '上交纪检部门并立案调查',
        effects: { stability: 2 },
        traitEffects: { integrity: 15 },
        pmStatEffects: { partyPrestige: -5 },
        newsTitle: '总理上交纪检部门调查行贿商人',
        newsSummary: '总理将富商的馈赠上交纪检部门，并指示立案调查其背后的利益链。',
        tone: 'positive',
      },
    ],
  },

  // ===== 魅力事件 =====
  {
    id: 'pmtrait_charisma_speech',
    title: '全国电视演说的契机',
    description: '近期民意有所回升，幕僚建议趁热打铁，发表一场全国电视演说巩固声势。但演说效果取决于总理的个人魅力。',
    trigger: (s) => s.pmTraitsNumeric.charisma > 60 && s.metrics.approval > 55 && s.turn > 10,
    options: [
      {
        id: 'grand_speech',
        label: '发表宏大演说，展望国家未来',
        effects: { approval: 5, prestige: 4 },
        traitEffects: { charisma: 5 },
        pmStatEffects: { rhetoric: 3 },
        newsTitle: '总理全国演说引发热烈反响',
        newsSummary: '总理的电视演说打动人心，媒体称赞其展现了难得的政治魅力。',
        tone: 'positive',
      },
      {
        id: 'modest_address',
        label: '务实汇报施政进展',
        effects: { approval: 2 },
        traitEffects: { charisma: 1 },
        newsTitle: '总理发表务实施政汇报',
        newsSummary: '总理以务实风格向国民汇报近期施政进展，反响平稳。',
        tone: 'neutral',
      },
    ],
  },

  // ===== 韧性事件 =====
  {
    id: 'pmtrait_resilience_burnout',
    title: '执政倦怠期',
    description: '连续处理多起危机后，总理明显感到精神疲惫。幕僚注意到总理在会议中走神，决策效率下降。',
    trigger: (s) => s.pmTraitsNumeric.resilience < 35 && s.turn > 15,
    options: [
      {
        id: 'take_break',
        label: '安排短期休假，远离公务',
        effects: { stability: -2 },
        traitEffects: { resilience: 15, health: 5, decisiveness: -3 },
        newsTitle: '总理安排短期休假调整状态',
        newsSummary: '总理因倦怠期安排了为期一周的休假，副总理代行日常事务。',
        tone: 'neutral',
      },
      {
        id: 'push_through',
        label: '靠意志力坚持下去',
        effects: {},
        traitEffects: { resilience: -5, health: -8, decisiveness: 5 },
        newsTitle: '总理以惊人意志力克服倦怠',
        newsSummary: '总理在精神疲惫的情况下仍坚持工作，但其健康状况令人担忧。',
        tone: 'neutral',
      },
    ],
  },

  // ===== 果断事件 =====
  {
    id: 'pmtrait_decisiveness_crisis',
    title: '突发电网故障危机',
    description: '全国大面积电网故障突然发生，多个省份陷入停电。幕僚们意见分歧，有人主张立即召开紧急会议，有人建议总理直接拍板。',
    trigger: (s) => s.pmTraitsNumeric.decisiveness < 40 && s.turn > 5,
    options: [
      {
        id: 'decide_now',
        label: '立即拍板，调动应急资源',
        effects: { stability: 3, treasury: -5 },
        traitEffects: { decisiveness: 10, charisma: 3 },
        newsTitle: '总理果断应对电网危机',
        newsSummary: '总理在电网故障危机中果断决策，迅速调动应急资源恢复供电。',
        tone: 'positive',
      },
      {
        id: 'deliberate',
        label: '召集专家会议后再决策',
        effects: { stability: -2 },
        traitEffects: { decisiveness: -5, resilience: 3 },
        newsTitle: '电网危机应对迟缓，舆论批评',
        newsSummary: '总理在电网危机中决策迟缓，导致停电时间延长，舆论批评其优柔寡断。',
        tone: 'negative',
      },
    ],
  },

  // ===== 任期中点反思事件 =====
  {
    id: 'pmtrait_midterm_reflection',
    title: '任期中点的反思',
    description: '任期过半，总理在深夜独自回顾这段时间的施政。这是一次深刻的自我审视，将影响总理未来的执政风格。',
    trigger: (s) => s.turn === Math.floor(24) && !s.resolvedEventIds.includes('pmtrait_midterm_reflection'),
    options: [
      {
        id: 'toughen_up',
        label: '决心更加铁腕，推进艰难改革',
        effects: {},
        traitEffects: { decisiveness: 8, integrity: -3, resilience: 3 },
        newsTitle: '总理表态将推进艰难改革',
        newsSummary: '任期过半，总理公开表示将不再犹豫，推进此前搁置的艰难改革。',
        tone: 'neutral',
      },
      {
        id: 'connect_people',
        label: '决心更贴近民众，倾听民意',
        effects: { approval: 3 },
        traitEffects: { charisma: 8, integrity: 3 },
        newsTitle: '总理承诺更贴近民众',
        newsSummary: '总理表示将定期走访基层，倾听民众真实声音，调整施政方向。',
        tone: 'positive',
      },
      {
        id: 'stay_course',
        label: '坚持既定路线，稳扎稳打',
        effects: {},
        traitEffects: { resilience: 5, decisiveness: 2 },
        newsTitle: '总理表示将坚持既定施政路线',
        newsSummary: '面对任期中点的反思，总理选择坚持既定路线，认为方向正确无需调整。',
        tone: 'neutral',
      },
    ],
  },
]

/** 检查是否应触发总理特质事件（每 30 天检查一次，避免频繁） */
export function checkPMTraitEvent(state: GameState): PMTraitEvent | null {
  // 任期内已触发过的特质事件不再重复（除定期体检）
  for (const evt of PM_TRAIT_EVENTS) {
    if (evt.id === 'pmtrait_health_checkup') {
      // 体检事件每年触发，用 trigger 函数判断
      if (evt.trigger(state) && !state.resolvedEventIds.includes(`${evt.id}_${state.turn}`)) {
        return evt
      }
    } else {
      if (evt.trigger(state) && !state.resolvedEventIds.includes(evt.id)) {
        return evt
      }
    }
  }
  return null
}

/** 生成特质事件的唯一 ID（用于去重） */
export function getTraitEventInstanceId(evt: PMTraitEvent, turn: number): string {
  return evt.id === 'pmtrait_health_checkup' ? `${evt.id}_${turn}` : evt.id
}
