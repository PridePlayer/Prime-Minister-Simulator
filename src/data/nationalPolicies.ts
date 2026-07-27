import type { NationalPolicy } from '@/types/game'

/** 国家政策库：每类政策构成一棵树
 *  - 根节点为默认政策（isDefault）
 *  - requiresPolicy 指向前置政策 ID（必须曾启用过，查 adoptedPolicies 历史）
 *  - unlockedByInitiative 指向改革 ID（改革完成后才解锁，改革↔政策树联动）
 *  - 每类同时仅 1 项生效；切换需付出代价（国库/政治资本/稳定/民意）
 */

export const NATIONAL_POLICIES: NationalPolicy[] = [
  // ===== 经济政策树 =====
  {
    id: 'pol_econ_balanced',
    category: '经济',
    name: '均衡发展路线',
    description: '政府与市场并重，平衡各方利益。经济政策树的根节点，默认起始政策。',
    perTurnEffects: { economy: 1, treasury: 1 },
    switchCost: {},
    isDefault: true,
  },
  {
    id: 'pol_econ_market',
    category: '经济',
    name: '自由市场路线',
    description: '大幅放松管制，鼓励私营经济，市场效率高但贫富差距扩大。从均衡路线分叉而来。',
    perTurnEffects: { economy: 3, treasury: 2, approval: -1, stability: -1 },
    switchCost: { treasury: 8, politicalCapital: 10, stability: -5 },
    prerequisites: { economy: 40 },
    requiresPolicy: ['pol_econ_balanced'],
  },
  {
    id: 'pol_econ_state',
    category: '经济',
    name: '国家主导路线',
    description: '强化国有企业，国家掌控命脉产业。稳定但效率较低。从均衡路线分叉而来。',
    perTurnEffects: { economy: -1, treasury: 3, stability: 2, prestige: 1 },
    switchCost: { treasury: 12, politicalCapital: 15, approval: -5 },
    prerequisites: { stability: 50 },
    requiresPolicy: ['pol_econ_balanced'],
  },
  {
    id: 'pol_econ_green',
    category: '经济',
    name: '绿色经济路线',
    description: '在国家主导基础上转向环保产业，经济增速放缓但国际声望提升。需要先经过国家主导路线。',
    perTurnEffects: { economy: 0, prestige: 2, diplomacy: 1, approval: 1 },
    switchCost: { treasury: 10, politicalCapital: 8, economy: -3 },
    prerequisites: { diplomacy: 40 },
    requiresPolicy: ['pol_econ_state'],
  },
  {
    id: 'pol_econ_deregulation',
    category: '经济',
    name: '激进去监管路线',
    description: '在自由市场基础上彻底废除行业管制，资本狂欢但社会风险陡增。需要先经过自由市场路线。',
    perTurnEffects: { economy: 5, treasury: 3, approval: -3, stability: -3 },
    switchCost: { treasury: 14, politicalCapital: 18, stability: -8, approval: -6 },
    prerequisites: { economy: 55 },
    requiresPolicy: ['pol_econ_market'],
  },
  {
    id: 'pol_econ_industrial_policy',
    category: '经济',
    name: '产业政策主导路线',
    description: '由国家遴选战略性新兴产业重点扶持，打造自主技术生态。需完成「科技创新基金」改革后解锁。',
    perTurnEffects: { economy: 4, prestige: 3, treasury: -2 },
    switchCost: { treasury: 16, politicalCapital: 14, economy: -2 },
    prerequisites: { economy: 50 },
    requiresPolicy: ['pol_econ_state'],
    unlockedByInitiative: ['ini_tech_fund'],
  },

  // ===== 社会政策树 =====
  {
    id: 'pol_soc_welfare',
    category: '社会',
    name: '高福利路线',
    description: '扩大公共福利覆盖，民众满意度高但财政压力大。社会政策树的根节点，默认起始政策。',
    perTurnEffects: { approval: 3, stability: 1, treasury: -2 },
    switchCost: {},
    isDefault: true,
  },
  {
    id: 'pol_soc_merit',
    category: '社会',
    name: '效率优先路线',
    description: '减少福利投入，鼓励竞争，经济活力强但民意略低。从高福利路线分叉而来。',
    perTurnEffects: { economy: 2, treasury: 2, approval: -2 },
    switchCost: { treasury: 5, politicalCapital: 8, approval: -8 },
    prerequisites: { economy: 45 },
    requiresPolicy: ['pol_soc_welfare'],
  },
  {
    id: 'pol_soc_tradition',
    category: '社会',
    name: '传统价值路线',
    description: '弘扬传统文化与家庭价值，社会凝聚力强但改革阻力大。从高福利路线分叉而来。',
    perTurnEffects: { stability: 2, approval: 1, prestige: 1 },
    switchCost: { politicalCapital: 5, treasury: 3 },
    requiresPolicy: ['pol_soc_welfare'],
  },
  {
    id: 'pol_soc_universal',
    category: '社会',
    name: '全民基本收入路线',
    description: '向全体公民无差别发放基本收入，颠覆性社会保障。需完成「全民基本收入实验」改革后解锁。',
    perTurnEffects: { approval: 6, stability: 3, treasury: -5, economy: 1 },
    switchCost: { treasury: 20, politicalCapital: 20, stability: -4 },
    prerequisites: { treasury: 40 },
    requiresPolicy: ['pol_soc_welfare'],
    unlockedByInitiative: ['ini_ubi'],
  },
  {
    id: 'pol_soc_conservative',
    category: '社会',
    name: '保守主义路线',
    description: '在传统价值基础上强化社会秩序与道德规范，凝聚力极强但开放度下降。需先经过传统价值路线。',
    perTurnEffects: { stability: 4, approval: 2, prestige: 1, diplomacy: -1 },
    switchCost: { politicalCapital: 10, treasury: 6, diplomacy: -3 },
    prerequisites: { stability: 55 },
    requiresPolicy: ['pol_soc_tradition'],
  },

  // ===== 外交政策树 =====
  {
    id: 'pol_dip_nonaligned',
    category: '外交',
    name: '不结盟路线',
    description: '在大国之间保持中立，自主性强但难以获得大国援助。外交政策树的根节点，默认起始政策。',
    perTurnEffects: { diplomacy: 0, prestige: 1, treasury: 0 },
    switchCost: {},
    isDefault: true,
  },
  {
    id: 'pol_dip_bigpower',
    category: '外交',
    name: '亲大国路线',
    description: '与某大国结成紧密伙伴关系，获得大量援助但损害自主性。从不结盟路线分叉而来。',
    perTurnEffects: { diplomacy: 2, treasury: 2, prestige: -1, approval: -1 },
    switchCost: { politicalCapital: 15, prestige: -5, approval: -3 },
    prerequisites: { diplomacy: 35 },
    requiresPolicy: ['pol_dip_nonaligned'],
  },
  {
    id: 'pol_dip_regional',
    category: '外交',
    name: '区域合作路线',
    description: '深化与邻国合作，区域影响力提升但大国关系紧张。从不结盟路线分叉而来。',
    perTurnEffects: { diplomacy: 1, economy: 1, prestige: 1 },
    switchCost: { politicalCapital: 8, treasury: 5 },
    requiresPolicy: ['pol_dip_nonaligned'],
  },
  {
    id: 'pol_dip_isolation',
    category: '外交',
    name: '孤立主义路线',
    description: '减少国际参与，专注内部事务，外交关系全面恶化。需完成「闭关自守政策」改革后解锁。',
    perTurnEffects: { diplomacy: -3, treasury: 1, approval: 1, stability: 1 },
    switchCost: { politicalCapital: 12, diplomacy: -10, prestige: -5 },
    requiresPolicy: ['pol_dip_nonaligned'],
    unlockedByInitiative: ['ini_isolation'],
  },
  {
    id: 'pol_dip_alliance',
    category: '外交',
    name: '军事同盟路线',
    description: '与大国缔结正式军事同盟，获得安全保障但可能卷入大国博弈。需完成「缔结军事同盟」改革后解锁。',
    perTurnEffects: { diplomacy: 3, stability: 2, treasury: -2, prestige: 2 },
    switchCost: { politicalCapital: 18, treasury: 8, prestige: 3 },
    prerequisites: { diplomacy: 45 },
    requiresPolicy: ['pol_dip_bigpower'],
    unlockedByInitiative: ['ini_alliance'],
  },

  // ===== 军事政策树 =====
  {
    id: 'pol_mil_defensive',
    category: '军事',
    name: '防御性国防',
    description: '维持基础国防力量，不主动扩张。军事政策树的根节点，默认路线。',
    perTurnEffects: { stability: 1, treasury: 0 },
    switchCost: {},
    isDefault: true,
  },
  {
    id: 'pol_mil_expansion',
    category: '军事',
    name: '军备扩张路线',
    description: '大幅增加军费，提升国际威慑力，但财政与外交承压。从防御性国防分叉而来。',
    perTurnEffects: { prestige: 2, stability: 1, treasury: -3, diplomacy: -1 },
    switchCost: { treasury: 20, politicalCapital: 12, diplomacy: -3 },
    prerequisites: { treasury: 50 },
    requiresPolicy: ['pol_mil_defensive'],
  },
  {
    id: 'pol_mil_demobilize',
    category: '军事',
    name: '裁军和平路线',
    description: '大幅裁军，将军费转投民生。外交改善但军方不满。从防御性国防分叉而来。',
    perTurnEffects: { treasury: 3, approval: 2, diplomacy: 1, stability: -1, prestige: -2 },
    switchCost: { politicalCapital: 15, stability: -5, prestige: -3 },
    requiresPolicy: ['pol_mil_defensive'],
  },
  {
    id: 'pol_mil_nuclear',
    category: '军事',
    name: '核威慑路线',
    description: '以核武器作为终极威慑力量，国际地位骤升但外交孤立。需完成「核能研究计划」改革后解锁。',
    perTurnEffects: { prestige: 5, stability: 3, diplomacy: -3, treasury: -4 },
    switchCost: { treasury: 25, politicalCapital: 25, diplomacy: -10, prestige: 5 },
    prerequisites: { prestige: 50 },
    requiresPolicy: ['pol_mil_expansion'],
    unlockedByInitiative: ['ini_nuclear_program'],
  },
  {
    id: 'pol_mil_peace',
    category: '军事',
    name: '永久中立路线',
    description: '宪法层面确立永久中立地位，彻底告别军事对抗。需完成「裁军与和平路线」改革后解锁。',
    perTurnEffects: { diplomacy: 4, approval: 3, treasury: 2, prestige: -1, stability: 2 },
    switchCost: { politicalCapital: 20, prestige: -8, stability: -3 },
    prerequisites: { diplomacy: 50 },
    requiresPolicy: ['pol_mil_demobilize'],
    unlockedByInitiative: ['ini_demilitarize'],
  },

  // ===== 环境政策树 =====
  {
    id: 'pol_env_balanced',
    category: '环境',
    name: '环境与发展并重',
    description: '在经济发展与环境保护之间寻求平衡。环境政策树的根节点，默认路线。',
    perTurnEffects: { economy: 0, approval: 0 },
    switchCost: {},
    isDefault: true,
  },
  {
    id: 'pol_env_priority',
    category: '环境',
    name: '生态优先路线',
    description: '严格环保标准，长期利好但短期经济承压。从环境与发展并重分叉而来。',
    perTurnEffects: { approval: 2, prestige: 1, economy: -2, diplomacy: 1 },
    switchCost: { treasury: 8, economy: -3, politicalCapital: 5 },
    requiresPolicy: ['pol_env_balanced'],
  },
  {
    id: 'pol_env_develop',
    category: '环境',
    name: '发展优先路线',
    description: '放宽环保要求以加速经济发展，长期环境代价高。从环境与发展并重分叉而来。',
    perTurnEffects: { economy: 3, treasury: 1, approval: -2, prestige: -1 },
    switchCost: { politicalCapital: 5, approval: -3 },
    requiresPolicy: ['pol_env_balanced'],
  },
  {
    id: 'pol_env_eco_state',
    category: '环境',
    name: '生态紧急治理路线',
    description: '宣布生态紧急状态，强制转型绿色产业。需完成「生态紧急状态」改革后解锁。',
    perTurnEffects: { approval: 4, diplomacy: 3, prestige: 2, economy: -3, treasury: -2 },
    switchCost: { treasury: 15, politicalCapital: 15, economy: -5 },
    prerequisites: { stability: 50 },
    requiresPolicy: ['pol_env_priority'],
    unlockedByInitiative: ['ini_eco_dictatorship'],
  },
  {
    id: 'pol_env_green_economy',
    category: '环境',
    name: '绿色能源经济路线',
    description: '以清洁能源为经济新引擎，实现增长与减排双赢。需完成「绿色能源转型计划」改革后解锁。',
    perTurnEffects: { economy: 2, prestige: 2, diplomacy: 2, approval: 1, treasury: -1 },
    switchCost: { treasury: 12, politicalCapital: 10, economy: -2 },
    prerequisites: { diplomacy: 35 },
    requiresPolicy: ['pol_env_priority'],
    unlockedByInitiative: ['ini_green_energy'],
  },

  // ===== 政治体制政策树 =====
  {
    id: 'pol_gov_centralized',
    category: '政治',
    name: '中央集权路线',
    description: '强化中央权威，决策效率高但地方积极性低。政治政策树的根节点，默认路线。',
    perTurnEffects: { stability: 1, prestige: 1, approval: -1 },
    switchCost: {},
    isDefault: true,
  },
  {
    id: 'pol_gov_decentralized',
    category: '政治',
    name: '地方分权路线',
    description: '下放权力给地方，地方活力高但中央掌控力下降。从中央集权分叉而来。',
    perTurnEffects: { economy: 2, approval: 2, stability: -1, prestige: -1 },
    switchCost: { politicalCapital: 15, stability: -5, treasury: 5 },
    prerequisites: { stability: 50 },
    requiresPolicy: ['pol_gov_centralized'],
  },
  {
    id: 'pol_gov_technocratic',
    category: '政治',
    name: '技术官僚路线',
    description: '由专家主导决策，效率高但缺乏民意基础。从中央集权分叉而来。',
    perTurnEffects: { economy: 2, treasury: 1, approval: -1 },
    switchCost: { politicalCapital: 10, approval: -3 },
    requiresPolicy: ['pol_gov_centralized'],
  },
  {
    id: 'pol_gov_populist',
    category: '政治',
    name: '民粹主义路线',
    description: '高度顺应民意，民意高但决策短视，国际形象受损。从中央集权分叉而来。',
    perTurnEffects: { approval: 3, prestige: -2, economy: -1 },
    switchCost: { politicalCapital: 5, prestige: -5 },
    requiresPolicy: ['pol_gov_centralized'],
  },
  {
    id: 'pol_gov_authoritarian',
    category: '政治',
    name: '强人集权路线',
    description: '通过修宪将权力高度集中于总理，决策极速但民主受损。需完成「修宪：扩大总理权力」改革后解锁。',
    perTurnEffects: { prestige: 3, stability: 3, economy: 1, approval: -3, diplomacy: -2 },
    switchCost: { politicalCapital: 25, approval: -10, diplomacy: -8, stability: -5 },
    prerequisites: { prestige: 55 },
    requiresPolicy: ['pol_gov_centralized'],
    unlockedByInitiative: ['ini_constitution'],
  },
  {
    id: 'pol_gov_federal',
    category: '政治',
    name: '联邦制路线',
    description: '建立联邦式治理结构，地方高度自治。需完成「地方分权改革」改革后解锁。',
    perTurnEffects: { approval: 3, economy: 3, stability: -2, prestige: -1, treasury: 2 },
    switchCost: { politicalCapital: 20, stability: -8, treasury: 8 },
    prerequisites: { stability: 45 },
    requiresPolicy: ['pol_gov_decentralized'],
    unlockedByInitiative: ['ini_decentralize'],
  },
  {
    id: 'pol_gov_transparent',
    category: '政治',
    name: '阳光政府路线',
    description: '全面公开政府财政与决策过程，建立透明化治理。需完成「政府透明化法案」改革后解锁。',
    perTurnEffects: { approval: 2, prestige: 2, stability: 1, treasury: 1 },
    switchCost: { politicalCapital: 12, treasury: 6 },
    prerequisites: { prestige: 40 },
    requiresPolicy: ['pol_gov_technocratic'],
    unlockedByInitiative: ['ini_transparency'],
  },
]

/** 获取指定类别下的所有政策 */
export function getPoliciesByCategory(category: string): NationalPolicy[] {
  return NATIONAL_POLICIES.filter((p) => p.category === category)
}

/** 获取指定类别的默认政策 */
export function getDefaultPolicy(category: string): NationalPolicy {
  return (
    NATIONAL_POLICIES.find((p) => p.category === category && p.isDefault) ??
    NATIONAL_POLICIES.find((p) => p.category === category)!
  )
}

/** 获取指定政策在树中的层级深度（根节点为 0） */
export function getPolicyDepth(policy: NationalPolicy): number {
  if (!policy.requiresPolicy || policy.requiresPolicy.length === 0) return 0
  let depth = 0
  let current: NationalPolicy | undefined = policy
  const visited = new Set<string>()
  while (current?.requiresPolicy && current.requiresPolicy.length > 0) {
    const parentId = current.requiresPolicy[0]
    if (visited.has(parentId)) break // 防止循环
    visited.add(parentId)
    current = NATIONAL_POLICIES.find((p) => p.id === parentId)
    if (!current) break
    depth++
  }
  return depth
}

/** 所有政策类别 */
export const POLICY_CATEGORIES = ['经济', '社会', '外交', '军事', '环境', '政治']
