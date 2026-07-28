import type { GameEvent } from '@/types/game'

/**
 * 多阶段事件链的实际事件定义
 *
 * 配合 eventChainDefinitions.ts 使用：每个 stage.eventId 对应这里的一个 GameEvent。
 * 这些事件通过 triggeredBy 字段标记"仅由事件链触发"，不会出现在普通随机池中。
 *
 * 设计原则：
 * - 每个阶段事件提供 2-3 个选项，玩家的选择会影响下一阶段是否触发
 * - 中间阶段选项可携带 chainId（指向同一链），让链持续滚动到末阶段
 * - 末阶段选项决定最终结局，不再 chainId
 * - 选项效果温和但累积影响明显，强调"步步升级"的剧情张力
 */
export const EVENT_CHAIN_EVENTS: GameEvent[] = [
  // ============================================================================
  // 链 1：边境冲突升级链
  // ============================================================================

  // 阶段 1：边境摩擦（链入口：可随机触发，minTurn=8 避免过早出现）
  {
    id: 'chain_border_friction',
    title: '边境哨所的小规模摩擦',
    category: '外交',
    description:
      '边防部门报告：邻国边防军在争议地区哨所附近与我方巡逻队发生对峙，双方均有士兵在推搡中受轻伤。邻国媒体大肆渲染，称我方"挑衅"。事件尚未升级，但舆情敏感。',
    weight: 0.6,
    minTurn: 8,
    options: [
      {
        id: 'a',
        label: '召见邻国大使，提出严正交涉',
        description: '外交途径降温，但立场强硬',
        effects: { diplomacy: -2, prestige: 2, stability: 1 },
        newsTitle: '政府召见邻国大使提出交涉',
        newsSummary: '外交渠道保持畅通，但双方立场针锋相对。',
        tone: 'neutral',
        chainId: 'chain_border_conflict',
        chainDelay: 21,
      },
      {
        id: 'b',
        label: '提议双方联合调查，缓和气氛',
        description: '低姿态降温，避免升级',
        effects: { diplomacy: 3, prestige: -1 },
        newsTitle: '两国同意对边境摩擦展开联合调查',
        newsSummary: '邻国表示欢迎，地区紧张氛围暂缓。',
        tone: 'positive',
        // 不携带 chainId：选择降温则链终止
      },
      {
        id: 'c',
        label: '增派边防部队，展示决心',
        description: '强硬回应，可能激化矛盾',
        effects: { diplomacy: -5, stability: 2, prestige: 3 },
        newsTitle: '政府向边境增派部队',
        newsSummary: '邻国谴责"军事挑衅"，国际社会表示关切。',
        tone: 'negative',
        chainId: 'chain_border_conflict',
        chainDelay: 14, // 升级更快
      },
    ],
  },

  // 阶段 2：军事小冲突
  {
    id: 'chain_military_skirmish',
    title: '边境军事小冲突',
    category: '军事',
    description:
      '边境局势急剧恶化：清晨时分，争议哨所附近爆发持续两小时的交火。我方有 3 名士兵受伤，对方据报有 5 人伤亡。双方互相指责对方先开火。国防部请求指示。',
    triggeredBy: { eventId: 'chain_border_friction', optionId: 'a' },
    options: [
      {
        id: 'a',
        label: '局部还击，控制冲突规模',
        description: '展示决心但不全面升级',
        effects: { stability: -2, diplomacy: -3, treasury: -3, prestige: 2 },
        newsTitle: '边境爆发小规模交火，我方局部还击',
        newsSummary: '冲突在数小时内平息，但双方均进入高度戒备。',
        tone: 'negative',
        chainId: 'chain_border_conflict',
        chainDelay: 30,
      },
      {
        id: 'b',
        label: '单方面停火，提议紧急磋商',
        description: '忍让降温，可能被解读为软弱',
        effects: { diplomacy: 2, prestige: -3, stability: 1 },
        newsTitle: '我方宣布单方面停火',
        newsSummary: '邻国回应谨慎，国际社会松了一口气。',
        tone: 'neutral',
        // 不升级
      },
      {
        id: 'c',
        label: '全面反击，夺回争议哨所',
        description: '军事升级，后果难料',
        effects: { stability: -4, diplomacy: -8, treasury: -6, prestige: 4 },
        newsTitle: '我军全面反击，夺回争议哨所',
        newsSummary: '邻国宣布进入战备状态，地区局势骤然紧张。',
        tone: 'negative',
        chainId: 'chain_border_conflict',
        chainDelay: 20,
      },
    ],
  },

  // 阶段 3：外交危机
  {
    id: 'chain_diplomatic_crisis',
    title: '外交危机全面爆发',
    category: '外交',
    description:
      '邻国召回大使，地区组织召开紧急会议讨论"安全局势"。多个大国发表声明呼吁克制，但私下向双方施压。贸易通道受阻，外商开始撤离。局势危急。',
    triggeredBy: { eventId: 'chain_military_skirmish', optionId: 'a' },
    options: [
      {
        id: 'a',
        label: '接受国际调解，参加和谈',
        description: '外交突围，但需做出让步',
        effects: { diplomacy: 5, prestige: -2, stability: 2 },
        newsTitle: '政府接受国际调解提议',
        newsSummary: '和谈定于下月召开，地区紧张暂缓。',
        tone: 'positive',
        chainId: 'chain_border_conflict',
        chainDelay: 35,
      },
      {
        id: 'b',
        label: '拒绝调解，强调"双边解决"',
        description: '维护主权，但被孤立',
        effects: { diplomacy: -4, prestige: 3, stability: -2 },
        newsTitle: '政府拒绝国际调解',
        newsSummary: '地区组织表示遗憾，多国召见我方大使。',
        tone: 'negative',
        chainId: 'chain_border_conflict',
        chainDelay: 28,
      },
      {
        id: 'c',
        label: '提议与邻国领导人直接通话',
        description: '高层外交，化解危机',
        effects: { diplomacy: 6, prestige: 1 },
        newsTitle: '总理与邻国领导人通话化解危机',
        newsSummary: '双方同意降温，但根本分歧未解。',
        tone: 'positive',
        // 选择直接通话则不再升级到末阶段
      },
    ],
  },

  // 阶段 4：制裁或谈判（末阶段）
  {
    id: 'chain_sanctions_or_negotiation',
    title: '制裁还是谈判？边境危机的终局',
    category: '外交',
    description:
      '边境危机已持续数月，国际社会耐心耗尽。联合国安理会即将表决制裁决议，邻国也暗示愿意回到谈判桌。这是关键时刻——您的选择将决定国家未来数年的外交处境。',
    triggeredBy: { eventId: 'chain_diplomatic_crisis', optionId: 'a' },
    options: [
      {
        id: 'a',
        label: '签署和平协议，做出领土妥协',
        description: '忍痛求和，换取长期和平',
        effects: { diplomacy: 12, prestige: -8, stability: 5, approval: -3 },
        newsTitle: '总理签署边境和平协议',
        newsSummary: '协议规定双方撤军并设立非军事区，国际社会普遍欢迎。',
        tone: 'positive',
      },
      {
        id: 'b',
        label: '拒绝制裁，强硬应对国际压力',
        description: '承受制裁但维护立场',
        effects: { diplomacy: -10, prestige: 5, stability: -3, economy: -5 },
        newsTitle: '政府拒绝接受国际制裁决议',
        newsSummary: '多国宣布经济制裁，外贸下滑，但国内民族情绪高涨。',
        tone: 'negative',
      },
      {
        id: 'c',
        label: '提出"冻结现状"方案，搁置争议',
        description: '不输不赢，模糊处理',
        effects: { diplomacy: 2, prestige: -2, stability: 2 },
        newsTitle: '政府提出"冻结现状"方案',
        newsSummary: '各方暂未表态，但局势暂时稳定。',
        tone: 'neutral',
      },
    ],
  },

  // ============================================================================
  // 链 2：经济危机链
  // ============================================================================

  // 阶段 1：衰退信号（链入口：可随机触发，minTurn=10 避免过早出现）
  {
    id: 'chain_recession_signal',
    title: '经济衰退的早期信号',
    category: '经济',
    description:
      '央行行长紧急求见：连续两个季度 GDP 增长率为负，制造业 PMI 跌破荣枯线，失业率开始抬头。财政部长建议立即采取行动，否则可能演变为全面衰退。市场情绪已现恐慌苗头。',
    weight: 0.6,
    minTurn: 10,
    options: [
      {
        id: 'a',
        label: '紧急降息，注入流动性',
        description: '货币政策刺激，但通胀风险',
        effects: { economy: 3, treasury: -2, approval: 1 },
        newsTitle: '央行紧急降息刺激经济',
        newsSummary: '股市应声反弹，但经济学家警告通胀压力。',
        tone: 'neutral',
        chainId: 'chain_economic_crisis',
        chainDelay: 25,
      },
      {
        id: 'b',
        label: '推出财政刺激方案',
        description: '扩大政府支出，但加重赤字',
        effects: { economy: 4, treasury: -6, approval: 2 },
        newsTitle: '政府推出大规模财政刺激',
        newsSummary: '基建项目密集上马，但财政赤字担忧加剧。',
        tone: 'positive',
        chainId: 'chain_economic_crisis',
        chainDelay: 25,
      },
      {
        id: 'c',
        label: '按兵不动，等待市场自我调整',
        description: '不作为，赌经济自愈',
        effects: { economy: -2, stability: -1 },
        newsTitle: '政府称"经济波动属正常"',
        newsSummary: '市场失望情绪蔓延，企业投资意愿进一步下降。',
        tone: 'negative',
        chainId: 'chain_economic_crisis',
        chainDelay: 18, // 不作为会更快升级
      },
    ],
  },

  // 阶段 2：银行挤兑
  {
    id: 'chain_bank_runs',
    title: '银行挤兑潮爆发',
    category: '经济',
    description:
      '坏消息接连不断：两家区域性银行因坏账激增出现挤兑，排队取款的市民挤满营业厅。央行紧急注资仍难以平息恐慌。储户开始把资金转移至外资银行，外汇储备快速流失。',
    triggeredBy: { eventId: 'chain_recession_signal', optionId: 'a' },
    options: [
      {
        id: 'a',
        label: '全面存款担保，稳定信心',
        description: '政府兜底，但财政代价巨大',
        effects: { treasury: -8, stability: 4, economy: 1 },
        newsTitle: '政府宣布全面存款担保',
        newsSummary: '挤兑潮迅速平息，但国库压力骤增。',
        tone: 'positive',
        chainId: 'chain_economic_crisis',
        chainDelay: 30,
      },
      {
        id: 'b',
        label: '救助系统重要性银行，放任小银行倒闭',
        description: '选择性救助，引发道德风险争议',
        effects: { treasury: -4, stability: -2, economy: -2 },
        newsTitle: '政府选择性救助大银行',
        newsSummary: '小储户蒙受损失，民意反弹，但系统性风险被控制。',
        tone: 'negative',
        chainId: 'chain_economic_crisis',
        chainDelay: 30,
      },
      {
        id: 'c',
        label: '紧急资本管制，限制提款',
        description: '非常手段，损害国际信誉',
        effects: { stability: -3, economy: -3, diplomacy: -2, treasury: 2 },
        newsTitle: '政府实施紧急资本管制',
        newsSummary: '挤兑被强制压下，但外资评级机构下调主权信用。',
        tone: 'negative',
        chainId: 'chain_economic_crisis',
        chainDelay: 25,
      },
    ],
  },

  // 阶段 3：紧缩措施
  {
    id: 'chain_austerity_measure',
    title: '财政紧缩的痛苦抉择',
    category: '经济',
    description:
      '危机深化使财政赤字失控。国际货币基金组织提出援助条件：必须实施紧缩措施，包括削减公共支出、提高退休年龄、降低补贴。国内工会与左翼政党已发出罢工警告。',
    triggeredBy: { eventId: 'chain_bank_runs', optionId: 'a' },
    options: [
      {
        id: 'a',
        label: '接受 IMF 援助，全面紧缩',
        description: '换取救命钱，但民众受苦',
        effects: { treasury: 10, economy: -3, approval: -8, stability: -4 },
        newsTitle: '政府接受 IMF 紧缩方案',
        newsSummary: '工会宣布全国总罢工，社会福利大幅削减。',
        tone: 'negative',
        chainId: 'chain_economic_crisis',
        chainDelay: 40,
      },
      {
        id: 'b',
        label: '拒绝外援，自主改革',
        description: '维护主权，但改革更慢',
        effects: { treasury: -2, economy: -1, approval: -2, prestige: 3 },
        newsTitle: '总理宣布"自主改革路线"',
        newsSummary: '市场反应谨慎，工会暂缓罢工但持观望态度。',
        tone: 'neutral',
        chainId: 'chain_economic_crisis',
        chainDelay: 40,
      },
      {
        id: 'c',
        label: '向大国申请紧急双边贷款',
        description: '地缘代价未明',
        effects: { treasury: 6, diplomacy: -3, prestige: -2 },
        newsTitle: '政府获得大国紧急贷款',
        newsSummary: '资金到位，但贷款附加条件引发外交猜测。',
        tone: 'neutral',
        chainId: 'chain_economic_crisis',
        chainDelay: 40,
      },
    ],
  },

  // 阶段 4：复苏或崩溃（末阶段）
  {
    id: 'chain_recovery_or_collapse',
    title: '经济危机的终局：复苏还是崩溃？',
    category: '经济',
    description:
      '经过数月艰难应对，经济来到十字路口。市场信心脆弱，任何风吹草动都可能引发新一轮恐慌。您的最终抉择将决定国家是走出阴霾还是坠入深渊。',
    triggeredBy: { eventId: 'chain_austerity_measure', optionId: 'a' },
    options: [
      {
        id: 'a',
        label: '坚持改革，承受短期阵痛',
        description: '相信时间会证明一切',
        effects: { economy: 8, approval: -4, stability: 2, treasury: 4 },
        newsTitle: '总理坚持改革路线，经济出现回暖迹象',
        newsSummary: '失业率开始回落，外资回流，但民众仍不满。',
        tone: 'positive',
      },
      {
        id: 'b',
        label: '改弦更张，推出"新政"',
        description: '大转向刺激经济',
        effects: { economy: 5, treasury: -8, approval: 6, stability: 1 },
        newsTitle: '总理宣布"国家复兴新政"',
        newsSummary: '大规模公共投资重启，民意回升，但赤字再次扩大。',
        tone: 'positive',
      },
      {
        id: 'c',
        label: '放弃抵抗，提前大选',
        description: '交由选民裁决',
        effects: { economy: -3, stability: -5, prestige: -5 },
        newsTitle: '总理宣布提前大选',
        newsSummary: '市场恐慌加剧，资本外流，国家信用评级再遭下调。',
        tone: 'negative',
      },
    ],
  },

  // ============================================================================
  // 链 3：政治丑闻链
  // ============================================================================

  // 阶段 1：谣言传播（链入口：可随机触发，minTurn=12 避免过早出现）
  {
    id: 'chain_rumor_spread',
    title: '总理府的"谣言风波"',
    category: '政治体制',
    description:
      '社交媒体上突然流传一组照片与录音，指控您在竞选期间接受某财团秘密捐款。原始帖子已被广泛转发，主流媒体尚在核实。总理府新闻官请求回应指示。',
    weight: 0.5,
    minTurn: 12,
    options: [
      {
        id: 'a',
        label: '立即召开记者会全盘否认',
        description: '强硬回应，但若属实则后患无穷',
        effects: { prestige: 2, approval: -1, stability: -1 },
        pmStatEffects: { riskIndex: 5 },
        newsTitle: '总理召开记者会否认指控',
        newsSummary: '部分媒体接受解释，但网络舆论仍存疑。',
        tone: 'neutral',
        chainId: 'chain_political_scandal',
        chainDelay: 20,
      },
      {
        id: 'b',
        label: '保持沉默，让事实说话',
        description: '低姿态处理，避免放大',
        effects: { prestige: -2, approval: -2 },
        pmStatEffects: { riskIndex: 3 },
        newsTitle: '总理府对传闻不予置评',
        newsSummary: '反对党批评"沉默即默认"，舆论持续发酵。',
        tone: 'negative',
        chainId: 'chain_political_scandal',
        chainDelay: 20,
      },
      {
        id: 'c',
        label: '主动邀请独立调查',
        description: '透明应对，掌握主动',
        effects: { prestige: 3, approval: 2 },
        pmStatEffects: { riskIndex: -2, politicalCapital: -3 },
        newsTitle: '总理邀请独立委员会调查',
        newsSummary: '舆论氛围转好，媒体称"敢于接受审查"。',
        tone: 'positive',
        // 透明应对则链终止
      },
    ],
  },

  // 阶段 2：媒体调查
  {
    id: 'chain_media_investigation',
    title: '深度调查报道引爆舆论',
    category: '政治体制',
    description:
      '国家通讯社与一家独立调查媒体联合发布长篇报道：通过交叉比对银行流水与竞选账目，发现竞选期间确有数笔"来源不明"资金流入总理竞选账户。报道证据链完整，反响强烈。',
    triggeredBy: { eventId: 'chain_rumor_spread', optionId: 'a' },
    options: [
      {
        id: 'a',
        label: '承认"记账疏忽"，公开致歉',
        description: '部分认错，争取宽大',
        effects: { approval: -5, prestige: -4, stability: -1 },
        pmStatEffects: { riskIndex: 8, politicalCapital: -5 },
        newsTitle: '总理公开致歉，称"记账疏忽"',
        newsSummary: '反对党不接受解释，要求司法介入。',
        tone: 'negative',
        chainId: 'chain_political_scandal',
        chainDelay: 28,
      },
      {
        id: 'b',
        label: '起诉媒体诽谤',
        description: '法律反击，但被批"打压新闻自由"',
        effects: { approval: -3, prestige: -3, stability: -2 },
        pmStatEffects: { riskIndex: 6 },
        newsTitle: '总理府起诉调查媒体诽谤',
        newsSummary: '国际记者组织发表声明关切，舆论分裂。',
        tone: 'negative',
        chainId: 'chain_political_scandal',
        chainDelay: 28,
      },
      {
        id: 'c',
        label: '辞退涉事竞选财务负责人',
        description: '切割策略，牺牲下属',
        effects: { approval: -2, prestige: -2 },
        pmStatEffects: { riskIndex: 4, partyPrestige: -5 },
        newsTitle: '总理辞退竞选财务负责人',
        newsSummary: '被辞退者扬言"爆出更多内幕"，危机未解。',
        tone: 'negative',
        chainId: 'chain_political_scandal',
        chainDelay: 25,
      },
    ],
  },

  // 阶段 3：议会质询
  {
    id: 'chain_parliament_inquiry',
    title: '议会启动正式质询',
    category: '政治体制',
    description:
      '反对党在议会成功推动成立特别调查委员会，您被要求出席公开质询。直播镜头前，您将面对数小时的尖锐提问。党内部分议员开始与您保持距离，提前为政治后路做打算。',
    triggeredBy: { eventId: 'chain_media_investigation', optionId: 'a' },
    options: [
      {
        id: 'a',
        label: '坦然出席，逐条辩驳',
        description: '正面应对，胜负在此一举',
        effects: { approval: 2, prestige: 3, stability: 1 },
        pmStatEffects: { politicalCapital: -8, rhetoric: 2 },
        newsTitle: '总理在质询中表现稳健',
        newsSummary: '部分中间派议员转变态度，但反对党仍不死心。',
        tone: 'neutral',
        chainId: 'chain_political_scandal',
        chainDelay: 35,
      },
      {
        id: 'b',
        label: '以"国家利益"为由拒绝出席',
        description: '强硬拒绝，但代价高昂',
        effects: { approval: -4, prestige: -4, stability: -3 },
        pmStatEffects: { riskIndex: 10, partyPrestige: -8 },
        newsTitle: '总理拒绝出席议会质询',
        newsSummary: '反对党提出不信任动议，执政联盟内部出现裂痕。',
        tone: 'negative',
        chainId: 'chain_political_scandal',
        chainDelay: 30,
      },
      {
        id: 'c',
        label: '与反对党幕后交易，换取质询搁置',
        description: '政治妥协，留有后患',
        effects: { prestige: -3, stability: 2 },
        pmStatEffects: { politicalCapital: -10, riskIndex: 4 },
        newsTitle: '议会突然宣布"质询程序暂缓"',
        newsSummary: '媒体质疑幕后交易，但具体细节无人知晓。',
        tone: 'neutral',
        chainId: 'chain_political_scandal',
        chainDelay: 35,
      },
    ],
  },

  // 阶段 4：辞职或挺过（末阶段）
  {
    id: 'chain_resignation_or_survival',
    title: '丑闻危机的终局：辞职还是挺过？',
    category: '政治体制',
    description:
      '持续数月的丑闻风波将国家政治推向临界点。街头出现要求您下台的抗议，党内元老陆续发出"为了国家"的暗示。最后的抉择就在眼前——辞职体面退场，还是硬挺到底赌一把？',
    triggeredBy: { eventId: 'chain_parliament_inquiry', optionId: 'a' },
    options: [
      {
        id: 'a',
        label: '硬挺到底，赌民意回暖',
        description: '坚持不辞职，迎接一切后果',
        effects: { approval: -3, prestige: -5, stability: -4 },
        pmStatEffects: { politicalCapital: -5, riskIndex: 10 },
        newsTitle: '总理坚拒辞职，称"将战斗到底"',
        newsSummary: '抗议持续，但基本盘有所稳固，局势仍未明朗。',
        tone: 'negative',
      },
      {
        id: 'b',
        label: '主动辞职，体面退场',
        description: '承认失败，提前结束任期',
        effects: { approval: 5, prestige: -10, stability: 3 },
        newsTitle: '总理宣布辞去职务',
        newsSummary: '副总理将接任看守政府，国家进入政治过渡期。',
        tone: 'negative',
        endsGame: true,
      },
      {
        id: 'c',
        label: '改组内阁，献祭替罪羊',
        description: '舍车保帅，争取时间',
        effects: { approval: 1, prestige: -3, stability: 1 },
        pmStatEffects: { riskIndex: -5, partyPrestige: -4 },
        newsTitle: '总理大规模改组内阁',
        newsSummary: '多名涉事部长被解职，舆论暂时转向新人事。',
        tone: 'neutral',
      },
    ],
  },
]

/**
 * 通过事件 ID 查找事件链阶段事件
 */
export function findChainEvent(eventId: string): GameEvent | undefined {
  return EVENT_CHAIN_EVENTS.find((e) => e.id === eventId)
}
