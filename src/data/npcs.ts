import type { NPCBase } from '@/types/game'

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

/** NPC 性格反应权重 */
export const NPC_REACTION_WEIGHTS = {
  idealist: {
    policy_compromise: 1.3, // 政策妥协
   利益_exchange: 0.6, // 利益交换（负面）
    public_pressure: 0.8, // 公开施压
    private_negotiation: 1.1, // 私下谈判
  },
  pragmatist: {
    policy_compromise: 1.0,
    利益_exchange: 1.2,
    public_pressure: 0.9,
    private_negotiation: 1.0,
  },
  hardliner: {
    policy_compromise: 0.7,
    利益_exchange: 0.8,
    public_pressure: 1.3,
    private_negotiation: 0.9,
  },
  moderate: {
    policy_compromise: 1.2,
    利益_exchange: 1.0,
    public_pressure: 0.7,
    private_negotiation: 1.2,
  },
  opportunist: {
    policy_compromise: 0.9,
    利益_exchange: 1.4,
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
