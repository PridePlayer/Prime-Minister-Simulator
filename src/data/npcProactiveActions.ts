import type { GameState, Metrics } from '@/types/game'

/**
 * NPC 主动行动：NPC 根据自身状态/世界状态主动发起来电、拜访或公开声明，
 * 而不是被动等待事件触发。每 60 天检查一次（见 eventEngine.advanceDay）。
 *
 * - type='call'     : NPC 来电，简短直接
 * - type='visit'    : NPC 登门拜访，通常为重要事项
 * - type='statement': NPC 公开发表声明，对民意/舆论有放大效应
 *
 * 触发后会被包装成 PendingEvent 加入 pendingEvents 队列，玩家在 14 天内决策。
 */
export interface NPCProactiveAction {
  /** 触发该行动的 NPC ID（对应 npcs.ts 中的 NPCBase.id） */
  npcId: string
  /** 行动类型 */
  type: 'call' | 'visit' | 'statement'
  /** 行动标题（也是 PendingEvent.title） */
  title: string
  /** 行动描述（也是 PendingEvent.description） */
  description: string
  /** 触发条件：返回 true 时该行动可被加入待处理事件队列 */
  trigger: (state: GameState) => boolean
  /** 玩家可选的回应选项 */
  options: {
    id: string
    label: string
    /** 一级指标效果 */
    effects: Partial<Metrics>
    /** NPC 对总理态度变化（写入 npcMemories.tone 时参考；正数改善，负数恶化） */
    npcDispositionDelta?: number
    /** 决策新闻标题 */
    newsTitle: string
    /** 决策新闻摘要 */
    newsSummary: string
  }[]
}

/**
 * NPC 主动行动库（10 条）。
 * 文案中刻意使用 NPC 真名与角色，强化"NPC 主动找上门"的代入感。
 * 所有数值效果均为温和级别，避免与主事件系统抢戏。
 */
export const NPC_PROACTIVE_ACTIONS: NPCProactiveAction[] = [
  // ============================================================================
  // 1. 总参谋长周振国 —— 军费过低时来电施压
  // ============================================================================
  {
    npcId: 'npc_cdf',
    type: 'call',
    title: '总参谋长的深夜来电',
    description:
      '凌晨三点，桌上的红色电话响起。听筒那头是总参谋长周振国沙哑的声音："总理，军费占 GDP 已经跌到危险水平，陆军战备度连续三个月下滑。再不补款，今年的秋季演习只能取消。这是底线问题。"',
    trigger: (s) =>
      s.military?.defenseBudget < 2.0 &&
      s.military?.branches?.army?.readiness < 55,
    options: [
      {
        id: 'a',
        label: '答应下月提高军费至 3%',
        effects: { treasury: -4, stability: 1, prestige: 1 },
        npcDispositionDelta: 8,
        newsTitle: '总理承诺上调军费',
        newsSummary: '总参谋长周振国对总理的承诺表示满意，军方暂时按兵不动。',
      },
      {
        id: 'b',
        label: '以财政紧张为由婉拒',
        effects: { stability: -2, prestige: -2 },
        npcDispositionDelta: -10,
        newsTitle: '军费调整遭拒，军方不满',
        newsSummary: '总参谋长面色铁青地挂断电话，陆军基层军官私议纷纷。',
      },
      {
        id: 'c',
        label: '提出"以训代费"方案：暂不减款，强化训练',
        effects: { treasury: -1, stability: 1 },
        npcDispositionDelta: 2,
        newsTitle: '军方启动"以训代费"应急方案',
        newsSummary: '秋季演习如期举行，但装备更新仍遥遥无期。',
      },
    ],
  },

  // ============================================================================
  // 2. 工业协会会长赵世昌 —— 高税率时登门拜访
  // ============================================================================
  {
    npcId: 'npc_industry',
    type: 'visit',
    title: '工业协会会长的拜访',
    description:
      '工业协会会长赵世昌带着一摞报表推门而入，未等落座便开口："总理，连续三个季度的高税率让会员企业利润下滑逾两成，已有六家制造商在准备迁厂。再不动手，明年税基会塌方。他递上建议书：减税或放松管制，二选一。"',
    trigger: (s) =>
      (s.taxRate === 'high' || s.taxRate === 'very_high') &&
      s.metrics.economy < 50,
    options: [
      {
        id: 'a',
        label: '下调税率至中档',
        effects: { treasury: -3, economy: 4, approval: 2 },
        npcDispositionDelta: 10,
        newsTitle: '总理宣布下调税率',
        newsSummary: '工业协会会长赵世昌公开表示感谢，企业界信心回升。',
      },
      {
        id: 'b',
        label: '维持税率，但承诺放松部分行业管制',
        effects: { economy: 2, stability: -1 },
        npcDispositionDelta: 4,
        newsTitle: '政府出台行业管制松绑清单',
        newsSummary: '企业家们态度缓和，但减税诉求仍未解决。',
      },
      {
        id: 'c',
        label: '坚持财政优先，拒绝让步',
        effects: { economy: -3, stability: -2 },
        npcDispositionDelta: -8,
        newsTitle: '总理拒绝企业界减税诉求',
        newsSummary: '赵世昌离开总理府时面色阴沉，工业协会理事会连夜召开。',
      },
    ],
  },

  // ============================================================================
  // 3. 国家通讯社社长吴文华 —— 民意低迷时发表公开声明
  // ============================================================================
  {
    npcId: 'npc_media',
    type: 'statement',
    title: '通讯社社长的公开声明',
    description:
      '国家通讯社社长吴文华在全国记者协会年会上发表演讲，措辞罕见地直接："政府近期的施政方向已引发公众广泛忧虑。媒体既非政府的传声筒，也非反对派的打手，但必须为沉默的大多数发声。我们呼吁总理尽快回应民意。"演讲视频迅速在网络发酵。',
    trigger: (s) => s.metrics.approval < 35,
    options: [
      {
        id: 'a',
        label: '召开记者会，正面回应媒体关切',
        effects: { approval: 3, prestige: 2, stability: 1 },
        npcDispositionDelta: 6,
        newsTitle: '总理召开记者会回应媒体',
        newsSummary: '吴文华对总理的姿态表示肯定，舆论氛围暂时缓和。',
      },
      {
        id: 'b',
        label: '约谈社长，要求"统一口径"',
        effects: { approval: -2, stability: -2, prestige: -3 },
        npcDispositionDelta: -12,
        newsTitle: '总理约谈通讯社社长引发争议',
        newsSummary: '外界批评政府施压媒体，吴文华态度转为冷淡。',
      },
      {
        id: 'c',
        label: '不理会，让新闻热度自然冷却',
        effects: { approval: -1, prestige: -1 },
        npcDispositionDelta: -4,
        newsTitle: '政府对媒体声明保持沉默',
        newsSummary: '通讯社内部讨论是否加大报道力度。',
      },
    ],
  },

  // ============================================================================
  // 4. 全国总工会主席孙铁柱 —— 失业率高时来电施压
  // ============================================================================
  {
    npcId: 'npc_union',
    type: 'call',
    title: '总工会主席的"热线电话"',
    description:
      '办公桌上的红色电话响起，听筒里传来总工会主席孙铁柱浑厚的嗓音："总理，制造业失业人数这个月又涨了。工人们开始在我办公室门口排队。我不希望事态恶化，但工会经费撑不了几周。给我个准话：政府打算怎么办？"',
    trigger: (s) =>
      (s.macro?.unemployment ?? 0) > 9 ||
      s.secondary?.employmentRate < 45,
    options: [
      {
        id: 'a',
        label: '紧急拨款设立公共工程岗位',
        effects: { treasury: -6, approval: 4, stability: 2 },
        npcDispositionDelta: 9,
        newsTitle: '总理承诺立即投放公共工程岗位',
        newsSummary: '孙铁柱在工会大会上宣布消息，台下掌声雷动。',
      },
      {
        id: 'b',
        label: '要求企业承担社会责任，政府不掏钱',
        effects: { stability: -2, approval: -1 },
        npcDispositionDelta: -7,
        newsTitle: '政府拒绝为失业问题直接买单',
        newsSummary: '孙铁柱警告："工会的耐心是有限的。"',
      },
      {
        id: 'c',
        label: '承诺推动再培训计划，但需时间',
        effects: { approval: 1, economy: 1 },
        npcDispositionDelta: 3,
        newsTitle: '总理启动失业工人再培训计划',
        newsSummary: '工会接受方案，但要求半年内见到实效。',
      },
    ],
  },

  // ============================================================================
  // 5. 反对党领袖李明远 —— 稳定度低时发表公开声明
  // ============================================================================
  {
    npcId: 'npc_opposition',
    type: 'statement',
    title: '反对党领袖的国会台阶声明',
    description:
      '反对党领袖李明远站在国会大厦台阶上，对着密集的麦克风宣读声明："本届政府的无能已让国家陷入分裂。街头抗议此起彼伏，国际信誉持续下滑。我们正式要求总理召集特别会议，接受质询，否则将启动不信任投票程序。"',
    trigger: (s) => s.metrics.stability < 35,
    options: [
      {
        id: 'a',
        label: '接受特别质询，正面迎战',
        effects: { prestige: 3, approval: 2, stability: 1 },
        npcDispositionDelta: 2,
        newsTitle: '总理接受国会特别质询',
        newsSummary: '李明远表示欢迎，称"真相必须公之于众"。',
      },
      {
        id: 'b',
        label: '以"国家利益"为由拒绝',
        effects: { stability: -2, prestige: -2, approval: -1 },
        npcDispositionDelta: -8,
        newsTitle: '总理拒绝反对党质询要求',
        newsSummary: '李明远宣布将在下周发起不信任投票动议。',
      },
      {
        id: 'c',
        label: '邀请反对党领袖闭门磋商',
        effects: { stability: 2, prestige: -1 },
        npcDispositionDelta: 5,
        newsTitle: '总理邀请反对党领袖磋商国是',
        newsSummary: '李明远接受邀请，但表示"对话不能代替问责"。',
      },
    ],
  },

  // ============================================================================
  // 6. 邻国大使伊万诺夫 —— 外交关系紧张时登门拜访
  // ============================================================================
  {
    npcId: 'npc_amb_neighbor',
    type: 'visit',
    title: '邻国大使的紧急拜访',
    description:
      '邻国大使伊万诺夫未预约便来到外交部，递交了一份措辞强硬的照会："近期贵国在边境地区的军事调动已引起我方严重关切。我奉命正式提出交涉，请总理阁下立即澄清意图，否则我方将采取对等措施。"他面无表情地等候回复。',
    trigger: (s) =>
      s.countries.some(
        (c) => c.isNeighbor && c.relation < 40 && c.relation > 0,
      ),
    options: [
      {
        id: 'a',
        label: '澄清为常规演习，承诺透明通报',
        effects: { diplomacy: 3, stability: 1 },
        npcDispositionDelta: 5,
        newsTitle: '政府向邻国澄清边境军事调动',
        newsSummary: '伊万诺夫表示将如实转达，外交紧张暂缓。',
      },
      {
        id: 'b',
        label: '拒绝解释，强调主权内政',
        effects: { diplomacy: -4, prestige: 2, stability: -1 },
        npcDispositionDelta: -6,
        newsTitle: '政府拒绝邻国交涉，强调主权',
        newsSummary: '邻国召回大使磋商，地区局势进一步紧张。',
      },
      {
        id: 'c',
        label: '提议召开双边峰会化解分歧',
        effects: { diplomacy: 5, prestige: 1 },
        npcDispositionDelta: 8,
        newsTitle: '总理提议与邻国召开紧急峰会',
        newsSummary: '伊万诺夫表态积极，称"对话总比对抗好"。',
      },
    ],
  },

  // ============================================================================
  // 7. 国家首富钱万通 —— 国库空虚时来电"献策"
  // ============================================================================
  {
    npcId: 'npc_tycoon',
    type: 'call',
    title: '首富的"善意"来电',
    description:
      '首富钱万通的声音从听筒里传来，带着惯有的圆滑："总理阁下，听说国库吃紧？我有个双赢方案——由我的财团代垫一笔款项，利率优惠，只需您在某个港口扩建项目上「多多关照」。这是一举两得的好事，您看？"',
    trigger: (s) => s.metrics.treasury < 25,
    options: [
      {
        id: 'a',
        label: '接受"好意"，签订秘密协议',
        effects: { treasury: 8, prestige: -2 },
        npcDispositionDelta: 12,
        newsTitle: '政府获得"私营财团低息贷款"',
        newsSummary: '钱万通公开称赞总理"务实"，但舆论质疑交易透明度。',
      },
      {
        id: 'b',
        label: '婉拒，称需走公开招标程序',
        effects: { treasury: -1, prestige: 2 },
        npcDispositionDelta: -5,
        newsTitle: '总理拒绝首富"私下融资"提议',
        newsSummary: '钱万通态度转冷，称"以后还有的是机会"。',
      },
      {
        id: 'c',
        label: '反提议：以严格监管换取合法捐助',
        effects: { treasury: 4, stability: 1 },
        npcDispositionDelta: 4,
        newsTitle: '首富宣布向国库"无偿捐助"',
        newsSummary: '附带的监管条款让钱万通略感不悦，但仍接受。',
      },
    ],
  },

  // ============================================================================
  // 8. 宗教界领袖慧明法师 —— 社会团结度低时发表声明
  // ============================================================================
  {
    npcId: 'npc_religion',
    type: 'statement',
    title: '宗教界领袖的和平呼吁',
    description:
      '慧明法师在全国佛教协会大会上发表讲话："近期社会撕裂加剧，不同群体相互敌视。宗教界不能袖手旁观。我们呼吁政府与各界重启对话，以慈悲心化解戾气。否则，社会的伤口将越来越深。"讲话被各大媒体转载。',
    trigger: (s) => s.secondary?.socialCohesion < 35,
    options: [
      {
        id: 'a',
        label: '邀请宗教界参与社会和解委员会',
        effects: { stability: 3, approval: 2 },
        npcDispositionDelta: 8,
        newsTitle: '政府成立社会和解委员会',
        newsSummary: '慧明法师答应担任名誉顾问，各界反应积极。',
      },
      {
        id: 'b',
        label: '感谢其关心，但表示政教分离',
        effects: { stability: -1, prestige: 1 },
        npcDispositionDelta: -3,
        newsTitle: '政府回应宗教界：政教分离原则不变',
        newsSummary: '慧明法师表示理解，但信徒中有人感到失望。',
      },
      {
        id: 'c',
        label: '捐资支持宗教界的社会服务项目',
        effects: { treasury: -2, stability: 2, approval: 1 },
        npcDispositionDelta: 6,
        newsTitle: '政府拨款支持宗教慈善事业',
        newsSummary: '慧明法师主持感恩法会，社会氛围出现回暖。',
      },
    ],
  },

  // ============================================================================
  // 9. 大国特使塞缪尔·哈里森 —— 大国关系恶化时来访
  // ============================================================================
  {
    npcId: 'npc_envoy_gp',
    type: 'visit',
    title: '大国特使的"私人访问"',
    description:
      '大国特使塞缪尔·哈里森以"私人身份"造访总理府，寒暄后神色一正："总理阁下，我受我国政府委托私下传话——贵国近期的某些外交姿态让我国决策层感到不安。我们不愿看到两国关系滑向不可逆的低位。希望您能给出一些积极的信号。"',
    trigger: (s) =>
      s.countries.some(
        (c) => !c.isNeighbor && c.power > 70 && c.relation < 45,
      ),
    options: [
      {
        id: 'a',
        label: '承诺调整外交姿态，寻求对话',
        effects: { diplomacy: 4, prestige: -1 },
        npcDispositionDelta: 6,
        newsTitle: '政府向大国释放缓和信号',
        newsSummary: '哈里森表示将如实汇报，双边关系有望企稳。',
      },
      {
        id: 'b',
        label: '坚持独立外交，拒绝"指导"',
        effects: { diplomacy: -3, prestige: 3, approval: 2 },
        npcDispositionDelta: -7,
        newsTitle: '总理当面拒绝大国"私下传话"',
        newsSummary: '哈里森神色凝重地离开，大国媒体开始连篇报道。',
      },
      {
        id: 'c',
        label: '提议就具体议题展开工作层磋商',
        effects: { diplomacy: 2, stability: 1 },
        npcDispositionDelta: 4,
        newsTitle: '两国同意就具体议题重启磋商',
        newsSummary: '哈里森表示欢迎"务实态度"，但提醒"行动胜于言辞"。',
      },
    ],
  },

  // ============================================================================
  // 10. 党内竞争对手刘伟华 —— 党内威望低时来电"关心"
  // ============================================================================
  {
    npcId: 'npc_rival',
    type: 'call',
    title: '党内竞争对手的"问候电话"',
    description:
      '党内竞争对手刘伟华的声音透着关切："老朋友，最近民调不太理想啊。党内一些同志开始担心明年的选举。我当然支持你，但你也知道，政治是现实的——是不是该考虑做一些人事调整，让党内有更广泛的代表性？我手头有几个靠谱的人选……"',
    trigger: (s) => s.pmStats.partyPrestige < 35,
    options: [
      {
        id: 'a',
        label: '接受建议，吸纳其推荐人选入阁',
        effects: { prestige: -2, stability: 2 },
        npcDispositionDelta: 7,
        newsTitle: '总理改组内阁，吸纳党内新面孔',
        newsSummary: '刘伟华公开表态支持总理，党内异见暂平。',
      },
      {
        id: 'b',
        label: '婉拒，称"时机不成熟"',
        effects: { stability: -1, prestige: 1 },
        npcDispositionDelta: -4,
        newsTitle: '总理婉拒党内人事调整建议',
        newsSummary: '刘伟华表面理解，私下开始串联党内中坚力量。',
      },
      {
        id: 'c',
        label: '反将一军：邀请其出任副总理',
        effects: { prestige: -3, stability: 3, approval: -1 },
        npcDispositionDelta: 3,
        newsTitle: '总理邀请党内竞争对手入阁',
        newsSummary: '刘伟华陷入两难：拒绝则暴露野心，接受则被"绑上战车"。',
      },
    ],
  },
]

/**
 * 检查并返回本次应触发的 NPC 主动行动。
 * - 每 60 天检查一次（由 eventEngine.advanceDay 控制）
 * - 一次只触发一个，避免事件队列被 NPC 行动淹没
 * - 同一 NPC 在事件冷却期内不重复触发
 *
 * @returns 被选中的 NPC 主动行动，或 null（无符合条件者）
 */
export function pickNPCProactiveAction(
  state: GameState,
): NPCProactiveAction | null {
  // 候选行动：触发条件成立 + 不在事件冷却内 + 当前待处理事件不超过 2 个
  if (state.pendingEvents.length > 2) return null

  const candidates = NPC_PROACTIVE_ACTIONS.filter((a) => {
    if (!a.trigger(state)) return false
    // 简单冷却：以 npcProactive_<npcId> 作为虚拟事件 ID 检查
    const cooldown = state.eventCooldowns.find(
      (c) => c.eventId === `npcProactive_${a.npcId}`,
    )
    if (cooldown) {
      return state.totalDays - cooldown.triggeredDay >= cooldown.cooldownDays
    }
    return true
  })

  if (candidates.length === 0) return null

  // 加权随机：优先选择状态偏离阈值更严重的（这里简化为均匀随机）
  return candidates[Math.floor(Math.random() * candidates.length)]
}
