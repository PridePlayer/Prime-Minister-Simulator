import type { NPCBase } from '@/types/game'

// ============================================================================
// 政界 NPC（5 个，原有）
// ============================================================================

/** 反对党领袖 */
export const OPPOSITION_LEADER: NPCBase = {
  id: 'npc_opposition',
  name: '李明远',
  role: '反对党领袖',
  traits: ['hardliner', 'pragmatist'],
  attitude: 30,
}

/** 中间派联盟党魁 */
export const CENTER_PARTY_LEADER: NPCBase = {
  id: 'npc_center',
  name: '王建国',
  role: '中间派联盟党魁',
  traits: ['moderate', 'pragmatist'],
  attitude: 55,
}

/** 左翼进步党党魁 */
export const LEFT_PARTY_LEADER: NPCBase = {
  id: 'npc_left',
  name: '张晓红',
  role: '左翼进步党党魁',
  traits: ['idealist', 'hardliner'],
  attitude: 40,
}

/** 右翼保守党党魁 */
export const RIGHT_PARTY_LEADER: NPCBase = {
  id: 'npc_right',
  name: '陈志强',
  role: '右翼保守党党魁',
  traits: ['hardliner', 'opportunist'],
  attitude: 35,
}

/** 党内竞争对手 */
export const PARTY_RIVAL: NPCBase = {
  id: 'npc_rival',
  name: '刘伟华',
  role: '党内竞争对手',
  traits: ['opportunist', 'pragmatist'],
  attitude: 45,
}

// ============================================================================
// 军方 NPC（2 个）—— 将领：总参谋长 + 海军司令
// ============================================================================

/** 总参谋长（陆军出身，对军费预算与战争决策影响重大） */
export const CHIEF_OF_DEFENSE: NPCBase = {
  id: 'npc_cdf',
  name: '周振国',
  role: '总参谋长',
  traits: ['hardliner', 'pragmatist'],
  attitude: 50,
}

/** 海军司令（主张海权扩张，与邻国摩擦相关） */
export const NAVY_COMMANDER: NPCBase = {
  id: 'npc_navy_cmd',
  name: '林远征',
  role: '海军司令',
  traits: ['hardliner', 'idealist'],
  attitude: 45,
}

// ============================================================================
// 商界 NPC（2 个）—— 首富 + 工业协会会长
// ============================================================================

/** 国家首富（资本集团代表，可触发黑金事件） */
export const TYCOON: NPCBase = {
  id: 'npc_tycoon',
  name: '钱万通',
  role: '国家首富',
  traits: ['opportunist', 'pragmatist'],
  attitude: 60,
}

/** 工业协会会长（关注税率、贸易、就业政策） */
export const INDUSTRY_BOSS: NPCBase = {
  id: 'npc_industry',
  name: '赵世昌',
  role: '工业协会会长',
  traits: ['pragmatist', 'moderate'],
  attitude: 55,
}

// ============================================================================
// 工会与媒体 NPC（2 个）
// ============================================================================

/** 全国总工会主席（与失业率、劳动法高度相关） */
export const UNION_LEADER: NPCBase = {
  id: 'npc_union',
  name: '孙铁柱',
  role: '全国总工会主席',
  traits: ['hardliner', 'idealist'],
  attitude: 40,
}

/** 国家通讯社社长（舆论与媒体评价的关键节点） */
export const MEDIA_BOSS: NPCBase = {
  id: 'npc_media',
  name: '吴文华',
  role: '国家通讯社社长',
  traits: ['moderate', 'pragmatist'],
  attitude: 65,
}

// ============================================================================
// 宗教与社会领袖（1 个）
// ============================================================================

/** 宗教界领袖（影响社会团结与道德议题） */
export const RELIGIOUS_LEADER: NPCBase = {
  id: 'npc_religion',
  name: '慧明法师',
  role: '宗教界领袖',
  traits: ['moderate', 'idealist'],
  attitude: 50,
}

// ============================================================================
// 外国政要 NPC（3 个）—— 邻国大使 + 大国特使 + 国际组织代表
// ============================================================================

/** 邻国大使（边境冲突与外交危机的联系人） */
export const NEIGHBOR_AMBASSADOR: NPCBase = {
  id: 'npc_amb_neighbor',
  name: '伊万诺夫',
  role: '邻国大使',
  traits: ['pragmatist', 'moderate'],
  attitude: 50,
}

/** 大国特使（大国关系走向的关键人物） */
export const GREAT_POWER_ENVOY: NPCBase = {
  id: 'npc_envoy_gp',
  name: '塞缪尔·哈里森',
  role: '大国特使',
  traits: ['pragmatist', 'opportunist'],
  attitude: 45,
}

/** 国际组织代表（影响国际组织影响力与制裁决议） */
export const INTL_ORG_REP: NPCBase = {
  id: 'npc_intl_org',
  name: '安吉拉·诺沃',
  role: '国际组织代表',
  traits: ['moderate', 'idealist'],
  attitude: 55,
}

// ============================================================================
// 全部 NPC 集合（15 个）
// ============================================================================
export const ALL_NPCS: NPCBase[] = [
  OPPOSITION_LEADER,
  CENTER_PARTY_LEADER,
  LEFT_PARTY_LEADER,
  RIGHT_PARTY_LEADER,
  PARTY_RIVAL,
  CHIEF_OF_DEFENSE,
  NAVY_COMMANDER,
  TYCOON,
  INDUSTRY_BOSS,
  UNION_LEADER,
  MEDIA_BOSS,
  RELIGIOUS_LEADER,
  NEIGHBOR_AMBASSADOR,
  GREAT_POWER_ENVOY,
  INTL_ORG_REP,
]

/** NPC 性格反应权重 */
export const NPC_REACTION_WEIGHTS = {
  idealist: {
    policy_compromise: 1.3, // 政策妥协
    interest_exchange: 0.6, // 利益交换（负面）
    public_pressure: 0.8, // 公开施压
    private_negotiation: 1.1, // 私下谈判
  },
  pragmatist: {
    policy_compromise: 1.0,
    interest_exchange: 1.2,
    public_pressure: 0.9,
    private_negotiation: 1.0,
  },
  hardliner: {
    policy_compromise: 0.7,
    interest_exchange: 0.8,
    public_pressure: 1.3,
    private_negotiation: 0.9,
  },
  moderate: {
    policy_compromise: 1.2,
    interest_exchange: 1.0,
    public_pressure: 0.7,
    private_negotiation: 1.2,
  },
  opportunist: {
    policy_compromise: 0.9,
    interest_exchange: 1.4,
    public_pressure: 1.1,
    private_negotiation: 1.0,
  },
}

/** 根据 NPC 性格计算反应 */
export function calculateNPCReaction(
  npc: NPCBase,
  actionType: keyof typeof NPC_REACTION_WEIGHTS,
): number {
  let totalWeight = 0
  for (const trait of npc.traits) {
    totalWeight += NPC_REACTION_WEIGHTS[trait][actionType]
  }
  return totalWeight / npc.traits.length
}

/** 按 ID 查找 NPC */
export function findNpcById(id: string): NPCBase | undefined {
  return ALL_NPCS.find((n) => n.id === id)
}
