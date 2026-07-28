import type { TaskNode, GameState } from '@/types/game'

/** 任务树：玩家可在任务树页面查看所有任务及完成路径
 *  任务分为不同类别，部分任务有前置依赖
 *  完成"终极"类别任务可达成游戏最终胜利
 */

export const TASK_TREE: TaskNode[] = [
  // ===== 经济类 =====
  {
    id: 'task_econ_1',
    category: '经济',
    title: '经济启航',
    description: '将经济指数提升到 60 以上，奠定发展基础。',
    requirements: { economy: 60 },
    prerequisiteTasks: [],
    rewards: {
      effects: { treasury: 5 },
      pmStatEffects: { politicalCapital: 5 },
    },
    achievementId: 'ach_first',
  },
  {
    id: 'task_econ_2',
    category: '经济',
    title: '繁荣初现',
    description: '将经济指数提升到 80 以上，国家进入繁荣期。',
    requirements: { economy: 80 },
    prerequisiteTasks: ['task_econ_1'],
    rewards: {
      effects: { treasury: 10, prestige: 5 },
      pmStatEffects: { politicalCapital: 10 },
    },
  },
  {
    id: 'task_econ_3',
    category: '经济',
    title: '经济奇迹',
    description: '将经济指数提升到 100，创造经济奇迹。',
    requirements: { economy: 100 },
    prerequisiteTasks: ['task_econ_2'],
    rewards: {
      achievements: ['ach_economy_miracle'],
      pmStatEffects: { politicalCapital: 15, partyPrestige: 10 },
    },
    achievementId: 'ach_economy_miracle',
  },

  // ===== 社会类 =====
  {
    id: 'task_soc_1',
    category: '社会',
    title: '民心初聚',
    description: '将民意支持率提升到 65 以上。',
    requirements: { approval: 65 },
    prerequisiteTasks: [],
    rewards: {
      effects: { stability: 3 },
      pmStatEffects: { politicalCapital: 5 },
    },
  },
  {
    id: 'task_soc_2',
    category: '社会',
    title: '民众拥戴',
    description: '将民意支持率提升到 80 以上，民众真心拥戴。',
    requirements: { approval: 80 },
    prerequisiteTasks: ['task_soc_1'],
    rewards: {
      effects: { stability: 5, prestige: 3 },
      pmStatEffects: { partyPrestige: 8 },
    },
  },
  {
    id: 'task_soc_3',
    category: '社会',
    title: '不倒翁',
    description: '在民意低于 20 时扭转局势并存活至下月。',
    requirements: { approval: 30 },
    prerequisiteTasks: [],
    rewards: {
      achievements: ['ach_survivor'],
      pmStatEffects: { politicalCapital: 20, rhetoric: 5 },
    },
    achievementId: 'ach_survivor',
  },

  // ===== 外交类 =====
  {
    id: 'task_dip_1',
    category: '外交',
    title: '邦交初立',
    description: '将外交关系提升到 60 以上。',
    requirements: { diplomacy: 60 },
    prerequisiteTasks: [],
    rewards: {
      effects: { prestige: 3 },
      pmStatEffects: { politicalCapital: 5 },
    },
  },
  {
    id: 'task_dip_2',
    category: '外交',
    title: '外交大师',
    description: '将外交关系提升到 100，成为国际舞台的领袖。',
    requirements: { diplomacy: 100 },
    prerequisiteTasks: ['task_dip_1'],
    rewards: {
      achievements: ['ach_diplomacy_master'],
      effects: { prestige: 10 },
      pmStatEffects: { politicalCapital: 15 },
    },
    achievementId: 'ach_diplomacy_master',
  },

  // ===== 军事类 =====
  {
    id: 'task_mil_1',
    category: '军事',
    title: '国防稳固',
    description: '将稳定度提升到 75 以上，确保国防稳固。',
    requirements: { stability: 75 },
    prerequisiteTasks: [],
    rewards: {
      effects: { prestige: 3 },
      pmStatEffects: { politicalCapital: 5 },
    },
  },
  {
    id: 'task_mil_2',
    category: '军事',
    title: '钢铁长城',
    description: '同时将稳定度与声望提升到 85 以上。',
    requirements: { stability: 85, prestige: 85 },
    prerequisiteTasks: ['task_mil_1'],
    rewards: {
      effects: { stability: 5, prestige: 5 },
      pmStatEffects: { politicalCapital: 12 },
    },
  },

  // ===== 政治类 =====
  {
    id: 'task_pol_1',
    category: '政治',
    title: '初登大宝',
    description: '就任首届总理。',
    requirements: { turn: 1 },
    prerequisiteTasks: [],
    rewards: {
      achievements: ['ach_first'],
    },
    achievementId: 'ach_first',
  },
  {
    id: 'task_pol_2',
    category: '政治',
    title: '成功连任',
    description: '在大选中获得连任。',
    requirements: { term: 2 },
    prerequisiteTasks: ['task_pol_1'],
    rewards: {
      achievements: ['ach_reelect'],
      pmStatEffects: { politicalCapital: 15, partyPrestige: 10 },
    },
    achievementId: 'ach_reelect',
  },
  {
    id: 'task_pol_3',
    category: '政治',
    title: '三朝元老',
    description: '连任两届以上，成为政坛常青树。',
    requirements: { term: 3 },
    prerequisiteTasks: ['task_pol_2'],
    rewards: {
      achievements: ['ach_three_terms'],
      pmStatEffects: { politicalCapital: 25, partyPrestige: 15 },
    },
    achievementId: 'ach_three_terms',
  },
  {
    id: 'task_pol_4',
    category: '政治',
    title: '长青总理',
    description: '执政超过 100 个回合。',
    requirements: { turn: 100 },
    prerequisiteTasks: [],
    rewards: {
      achievements: ['ach_centurion'],
      pmStatEffects: { politicalCapital: 20 },
    },
    achievementId: 'ach_centurion',
  },

  // ===== 终极任务 =====
  {
    id: 'task_ultimate_1',
    category: '终极',
    title: '满堂喝彩',
    description: '六项国家指标同时达到 80 以上，达成盛世之治。',
    requirements: {
      approval: 80,
      treasury: 80,
      economy: 80,
      stability: 80,
      diplomacy: 80,
      prestige: 80,
    },
    prerequisiteTasks: ['task_econ_2', 'task_soc_2', 'task_dip_1', 'task_mil_2'],
    rewards: {
      achievements: ['ach_full_house'],
      effects: { approval: 5, treasury: 5, economy: 5, stability: 5, diplomacy: 5, prestige: 5 },
      pmStatEffects: { politicalCapital: 30, partyPrestige: 20 },
    },
    achievementId: 'ach_full_house',
  },
  {
    id: 'task_ultimate_2',
    category: '终极',
    title: '千古一相',
    description: '完成所有终极前置任务，并连任三届以上，成就千古一相的伟业。',
    requirements: {
      term: 3,
      approval: 70,
      economy: 70,
      stability: 70,
      diplomacy: 70,
      prestige: 70,
    },
    prerequisiteTasks: ['task_ultimate_1', 'task_pol_3'],
    rewards: {
      achievements: ['ach_three_terms', 'ach_full_house'],
      pmStatEffects: { politicalCapital: 50, partyPrestige: 30, rhetoric: 20 },
    },
  },
]

/** 检查任务是否已完成（基于游戏状态） */
export function isTaskCompleted(
  task: TaskNode,
  state: {
    metrics: { approval: number; treasury: number; economy: number; stability: number; diplomacy: number; prestige: number }
    term: number
    turn: number
  },
): boolean {
  const { metrics, term, turn } = state
  for (const [key, value] of Object.entries(task.requirements)) {
    if (key === 'term') {
      if (term < (value ?? 0)) return false
    } else if (key === 'turn') {
      if (turn < (value ?? 0)) return false
    } else {
      if ((metrics[key as keyof typeof metrics] ?? 0) < (value ?? 0)) return false
    }
  }
  return true
}

/** 检查任务是否已解锁（前置任务是否完成） */
export function isTaskUnlocked(
  task: TaskNode,
  completedTaskIds: string[],
): boolean {
  if (!task.prerequisiteTasks || task.prerequisiteTasks.length === 0) return true
  return task.prerequisiteTasks.every((id) => completedTaskIds.includes(id))
}

/**
 * 找出本回合新完成的任务：满足完成条件 + 前置已满足 + 尚未在 completedTaskIds 中
 * 返回新增完成任务列表（保留顺序）
 */
export function findNewlyCompletedTasks(state: GameState): TaskNode[] {
  const completed = new Set(state.completedTaskIds)
  const newly: TaskNode[] = []
  for (const task of TASK_TREE) {
    if (completed.has(task.id)) continue
    if (!isTaskUnlocked(task, state.completedTaskIds)) continue
    if (isTaskCompleted(task, state)) {
      newly.push(task)
    }
  }
  return newly
}

/** 任务类别元信息 */
export const TASK_CATEGORY_META: { category: TaskNode['category']; label: string; icon: string; color: string }[] = [
  { category: '经济', label: '经济', icon: '📈', color: '#c9a961' },
  { category: '社会', label: '社会', icon: '👥', color: '#e0c98a' },
  { category: '外交', label: '外交', icon: '🤝', color: '#7a9d55' },
  { category: '军事', label: '军事', icon: '⚔️', color: '#b34554' },
  { category: '政治', label: '政治', icon: '🏛️', color: '#6b5b95' },
  { category: '终极', label: '终极', icon: '👑', color: '#d4af37' },
]
