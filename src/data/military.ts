import type { General, MilitaryBranch, MilitaryState } from '@/types/game'

/** 军种元信息 */
export const BRANCH_META: Record<MilitaryBranch, { label: string; icon: string; desc: string }> = {
  army: { label: '陆军', icon: '🪖', desc: '地面作战力量，战争中的主力' },
  navy: { label: '海军', icon: '⚓', desc: '海上力量，保护贸易航线与海岸线' },
  airForce: { label: '空军', icon: '✈️', desc: '空中力量，决定制空权与打击能力' },
}

/** 初始将领名单 */
export const INITIAL_GENERALS: General[] = [
  { id: 'gen_zhao', name: '赵铁柱', branch: 'army', skill: 78, loyalty: 72, trait: '刚愎自用，战功赫赫的老派将领', age: 58, active: true },
  { id: 'gen_qian', name: '钱海峰', branch: 'navy', skill: 65, loyalty: 80, trait: '谨慎稳健，深谙海权战略', age: 54, active: true },
  { id: 'gen_sun', name: '孙凌云', branch: 'airForce', skill: 71, loyalty: 66, trait: '技术官僚出身，推崇现代化改革', age: 49, active: true },
  { id: 'gen_li', name: '李镇国', branch: 'joint', skill: 82, loyalty: 58, trait: '威望极高的总参谋长，对文人政府颇有微词', age: 61, active: true },
]

/** 后备将领池（可任命） */
export const GENERAL_CANDIDATES: General[] = [
  { id: 'gen_zhou', name: '周卫国', branch: 'army', skill: 69, loyalty: 85, trait: '忠诚可靠的少壮派', age: 45, active: false },
  { id: 'gen_wu', name: '吴定波', branch: 'navy', skill: 74, loyalty: 62, trait: '远洋派，主张扩张海军', age: 52, active: false },
  { id: 'gen_zheng', name: '郑长空', branch: 'airForce', skill: 60, loyalty: 90, trait: '忠心耿耿但能力平庸', age: 47, active: false },
  { id: 'gen_feng', name: '冯破虏', branch: 'army', skill: 88, loyalty: 40, trait: '天才战术家，但野心勃勃', age: 50, active: false },
]

/** 初始军事状态 */
export const INITIAL_MILITARY: MilitaryState = {
  branches: {
    army: { personnel: 45, equipment: 62, readiness: 68, morale: 70 },
    navy: { personnel: 12, equipment: 58, readiness: 60, morale: 66 },
    airForce: { personnel: 8, equipment: 65, readiness: 64, morale: 72 },
  },
  generals: INITIAL_GENERALS.map((g) => ({ ...g })),
  defenseBudget: 2.4, // 占 GDP %
  lastBudgetChangeDay: 0,
}

/** 军费预算档位（占 GDP %） */
export const DEFENSE_BUDGET_OPTIONS: { value: number; label: string; desc: string }[] = [
  { value: 0.8, label: '裁军紧缩', desc: '大幅削减军费，军队快速萎缩' },
  { value: 1.5, label: '低限度维持', desc: '仅维持基本运转，战备下滑' },
  { value: 2.4, label: '标准国防', desc: '和平时期正常水平（默认）' },
  { value: 3.8, label: '扩军备战', desc: '扩充军备，战备与装备提升' },
  { value: 6.0, label: '战时体制', desc: '举国扩军，财政不堪重负' },
]

/**
 * 计算玩家综合军事实力（0-100+）
 * = 三军加权（装备 35% + 战备 35% + 士气 30%）× 兵力系数 + 将领加成
 * 战争胜负判定以此替代旧的硬编码 60
 */
export function computeMilitaryStrength(military: MilitaryState): number {
  const weights: Record<MilitaryBranch, number> = { army: 0.5, navy: 0.25, airForce: 0.25 }
  let branchScore = 0
  for (const b of Object.keys(weights) as MilitaryBranch[]) {
    const s = military.branches[b]
    const quality = s.equipment * 0.35 + s.readiness * 0.35 + s.morale * 0.3
    // 兵力系数：以陆军 45 万为基准 1.0，过少惩罚，过多边际递减
    const base = b === 'army' ? 45 : b === 'navy' ? 12 : 8
    const sizeFactor = Math.min(1.3, Math.max(0.4, Math.sqrt(s.personnel / base)))
    branchScore += quality * sizeFactor * weights[b]
  }
  // 将领加成：现役最高指挥能力 × 15%，联合参谋额外计一次
  const active = military.generals.filter((g) => g.active)
  const bestSkill = active.length > 0 ? Math.max(...active.map((g) => g.skill)) : 40
  const joint = active.find((g) => g.branch === 'joint')
  const generalBonus = (bestSkill * 0.12) + (joint ? joint.skill * 0.05 : 0)
  // 忠诚度过低的将领会造成内耗
  const disloyal = active.filter((g) => g.loyalty < 40).length
  return Math.max(5, Math.min(120, branchScore + generalBonus - disloyal * 6))
}

/** 军费档位描述 */
export function budgetLabel(v: number): string {
  const opt = DEFENSE_BUDGET_OPTIONS.reduce((prev, cur) =>
    Math.abs(cur.value - v) < Math.abs(prev.value - v) ? cur : prev,
  )
  return opt.label
}
