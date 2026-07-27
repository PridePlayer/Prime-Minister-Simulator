import type { GameState, EndingGrade, Metrics } from '@/types/game'

/** 历史教科书评估文本 */
export interface LegacyAssessment {
  /** 历史定性标题（如"摇摇欲坠的妥协大师"） */
  historicalTitle: string
  /** 教科书评估段落 */
  textbookEvaluation: string
  /** 退任头条新闻 */
  retirementHeadline: string
  /** 头条副标题 */
  headlineSubtitle: string
  /** 回忆录畅销度 0-100 */
  memoirPopularity: number
  /** 回忆录标题 */
  memoirTitle: string
  /** 历史标签（3-5个关键词） */
  historicalTags: string[]
  /** 肖像画描述 */
  portraitDescription: string
}

/** 根据最终状态生成历史遗产评估 */
export function generateLegacy(state: GameState): LegacyAssessment {
  const grade = state.endingGrade ?? 'C'
  const metrics = state.metrics
  const avg = (metrics.approval + metrics.economy + metrics.stability + metrics.prestige + metrics.diplomacy) / 5
  const turn = state.turn
  const term = state.term

  // 历史定性标题
  const historicalTitle = getHistoricalTitle(grade, metrics, state.endingReason)

  // 教科书评估
  const textbookEvaluation = getTextbookEvaluation(grade, metrics, state.pmName, turn, term)

  // 退任头条
  const retirementHeadline = getRetirementHeadline(grade, state.endingReason)
  const headlineSubtitle = getHeadlineSubtitle(grade, metrics)

  // 回忆录
  const memoirPopularity = calculateMemoirPopularity(grade, metrics, turn)
  const memoirTitle = getMemoirTitle(grade, state.pmName, metrics)

  // 历史标签
  const historicalTags = getHistoricalTags(grade, metrics, state)

  // 肖像画描述
  const portraitDescription = getPortraitDescription(grade, metrics)

  return {
    historicalTitle,
    textbookEvaluation,
    retirementHeadline,
    headlineSubtitle,
    memoirPopularity,
    memoirTitle,
    historicalTags,
    portraitDescription,
  }
}

function getHistoricalTitle(grade: EndingGrade, metrics: Metrics, endingReason?: string): string {
  if (endingReason?.includes('不信任') || endingReason?.includes('下台')) {
    return '短命的危机总理'
  }
  if (endingReason?.includes('辞职')) {
    return '黯然退场的理想主义者'
  }

  switch (grade) {
    case 'S':
      if (metrics.economy >= 90) return '缔造奇迹的国父'
      if (metrics.diplomacy >= 90) return '纵横捭阖的外交巨匠'
      if (metrics.approval >= 90) return '万民拥戴的领袖'
      return '青史留名的伟大总理'
    case 'A':
      if (metrics.stability >= 80) return '定海神针般的稳健者'
      if (metrics.economy >= 80) return '繁荣时代的奠基人'
      return '卓有成效的改革者'
    case 'B':
      if (metrics.approval >= 60) return '尚得民心的务实派'
      if (metrics.prestige >= 60) return '中规中矩的执政者'
      return '功过相当的过渡人物'
    case 'C':
      if (metrics.stability < 40) return '摇摇欲坠的妥协大师'
      if (metrics.economy < 40) return '经济困局的替罪羊'
      return '平庸乏味的看守总理'
    case 'D':
      if (metrics.approval < 20) return '众叛亲离的失败者'
      if (metrics.stability < 20) return '动荡时代的纵火者'
      return '遗臭万年的昏聩之主'
  }
}

function getTextbookEvaluation(grade: EndingGrade, metrics: Metrics, pmName: string, turn: number, term: number): string {
  const years = Math.floor(turn / 12)

  switch (grade) {
    case 'S':
      return `${pmName}总理的执政时期（历时约${years}年，连任${term}届）被后世史学家誉为"黄金时代"。在其治下，国家综合国力达到历史巅峰，${metrics.economy >= 85 ? '经济腾飞、民生富足' : '各项指标全面繁荣'}。${pmName}以其卓越的政治智慧，在复杂的国际环境中为国家赢得了前所未有的地位。20年后的今天，其施政理念仍被政治学院奉为经典案例。`
    case 'A':
      return `${pmName}总理（执政约${years}年）被公认为成效显著的改革派领导人。尽管面临诸多挑战，${pmName}成功推动了关键领域的变革，${metrics.economy >= 70 ? '经济持续增长' : '国家稳步前进'}。历史评价认为，其任期内的若干决策对国家长远发展产生了积极影响，是一位值得肯定的政治家。`
    case 'B':
      return `${pmName}总理（执政约${years}年）的历史评价呈现两极化。支持者称其维持了国家的稳定运转，批评者则认为其错失了多项改革良机。${metrics.approval >= 55 ? '民众对其印象尚可' : '民间口碑一般'}。总体而言，${pmName}是一位过渡性人物，既无显赫功绩，也无重大过失。`
    case 'C':
      return `${pmName}总理（执政约${years}年）在历史上的存在感较为稀薄。${metrics.stability < 40 ? '其任期内社会矛盾持续激化' : '国家在其治下未见明显起色'}，多项经济指标停滞不前。史学家普遍认为，${pmName}缺乏应对复杂局面的能力，是一位被时代洪流裹挟的平庸政客。`
    case 'D':
      return `${pmName}总理（执政约${years}年）被历史定性为失败典型。${metrics.approval < 20 ? '其任期内民意崩塌、社会撕裂' : ''}${metrics.stability < 20 ? '国家陷入严重动荡' : ''}${metrics.economy < 30 ? '经济衰退、民不聊生' : ''}。20年后的教科书将其作为"如何毁掉一个国家"的反面教材，其政治遗产几乎完全是负面的。`
  }
}

function getRetirementHeadline(grade: EndingGrade, endingReason?: string): string {
  if (endingReason?.includes('不信任')) return '不信任投票通过 总理黯然下台'
  if (endingReason?.includes('辞职')) return '总理宣布辞职 政坛震动'
  if (endingReason?.includes('大选')) return '大选落败 总理承认败选'

  switch (grade) {
    case 'S': return '功成身退 总理荣退'
    case 'A': return '总理任期届满 各界致敬'
    case 'B': return '总理卸任 评价褒贬不一'
    case 'C': return '总理黯然卸任 民众反应平淡'
    case 'D': return '总理仓皇下台 历史评价负面'
  }
}

function getHeadlineSubtitle(grade: EndingGrade, metrics: Metrics): string {
  switch (grade) {
    case 'S': return `综合国力评分${Math.round((metrics.approval + metrics.economy + metrics.stability + metrics.prestige + metrics.diplomacy) / 5)}，创历史新高`
    case 'A': return `任内多项指标改善，留下积极政治遗产`
    case 'B': return `功过相抵，历史评价尚需沉淀`
    case 'C': return `执政成绩平平，未留下显著印记`
    case 'D': return `任内多项指标恶化，留下烂摊子`
  }
}

function calculateMemoirPopularity(grade: EndingGrade, metrics: Metrics, turn: number): number {
  let base = 30
  switch (grade) {
    case 'S': base = 85; break
    case 'A': base = 65; break
    case 'B': base = 45; break
    case 'C': base = 25; break
    case 'D': base = 15; break
  }
  // 执政时间加成
  const yearBonus = Math.min(10, Math.floor(turn / 12))
  // 戏剧性加成（极端指标）
  const dramaBonus = (metrics.approval < 20 || metrics.approval > 90) ? 8 : 0
  return Math.min(100, base + yearBonus + dramaBonus)
}

function getMemoirTitle(grade: EndingGrade, pmName: string, metrics: Metrics): string {
  if (metrics.diplomacy >= 85) return `《大国博弈：${pmName}的外交岁月》`
  if (metrics.economy >= 85) return `《繁荣之路：${pmName}的经济改革手记》`
  if (metrics.approval < 20) return `《至暗时刻：${pmName}的最后的告白》`
  switch (grade) {
    case 'S': return `《光荣与梦想：${pmName}回忆录》`
    case 'A': return `《改革的足迹：${pmName}执政纪实》`
    case 'B': return `《风雨执政路：${pmName}的十年》`
    case 'C': return `《平庸岁月：${pmName}的政治日记》`
    case 'D': return `《失败的教训：${pmName}的忏悔录》`
  }
}

function getHistoricalTags(grade: EndingGrade, metrics: Metrics, state: GameState): string[] {
  const tags: string[] = []

  // 根据指标添加标签
  if (metrics.economy >= 85) tags.push('经济繁荣')
  else if (metrics.economy < 30) tags.push('经济衰退')

  if (metrics.approval >= 85) tags.push('万民拥戴')
  else if (metrics.approval < 20) tags.push('民怨沸腾')

  if (metrics.stability >= 80) tags.push('国泰民安')
  else if (metrics.stability < 20) tags.push('社会动荡')

  if (metrics.diplomacy >= 85) tags.push('外交辉煌')
  if (metrics.prestige >= 85) tags.push('国际声望')

  // 根据任期添加标签
  if (state.term >= 3) tags.push('长期执政')
  if (state.turn > 60) tags.push('历经风雨')

  // 根据结局原因添加标签
  if (state.endingReason?.includes('不信任')) tags.push('被迫下台')
  if (state.endingReason?.includes('辞职')) tags.push('主动请辞')

  // 根据改革添加标签
  if (state.completedInitiatives.length >= 5) tags.push('改革先锋')
  if (state.completedInitiatives.some(id => id.includes('nationalize'))) tags.push('国有化推手')
  if (state.completedInitiatives.some(id => id.includes('free_market'))) tags.push('市场化旗手')

  // 限制5个标签
  return tags.slice(0, 5)
}

function getPortraitDescription(grade: EndingGrade, metrics: Metrics): string {
  switch (grade) {
    case 'S':
      return '肖像画中，总理目光坚定而温和，嘴角带着自信的微笑。背景是繁荣的城市天际线，象征其治下的黄金时代。画框为华丽的金色雕花，悬挂在国家美术馆正厅。'
    case 'A':
      return '肖像画中，总理神情庄重，手持改革方案文件。背景是议会大厦，体现其民主执政理念。画框为深色实木，悬挂在美术馆主廊道。'
    case 'B':
      return '肖像画中，总理面容平静，姿态中规中矩。背景为素色，无特殊象征。画框为普通木质，悬挂在美术馆侧厅。'
    case 'C':
      return '肖像画中，总理神情略显疲惫，眼神中带着无奈。背景灰暗，画框简朴，被安置在美术馆角落，鲜有人驻足。'
    case 'D':
      return '肖像画被移出了国家美术馆正厅，仅在后院仓库中积灰。画中总理面色阴沉，背景斑驳脱落，无人愿意修复。'
  }
}
