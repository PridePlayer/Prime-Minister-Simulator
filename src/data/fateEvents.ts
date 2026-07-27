import type { PendingEvent } from '@/types/game'

/** 季度随机命运事件池
 *  每 3 个月（一个季度）触发一次，为游戏增加不可预测的"小插曲"
 *  这些事件与主线无关，模拟真实政治生活中的偶然事件
 */
export interface FateEventTemplate {
  id: string
  title: string
  description: (pmName: string) => string
  category: '经济' | '外交' | '社会' | '突发' | '政治体制'
  options: {
    id: string
    label: string
    description?: string
    effects: Record<string, number>
    pmStatEffects?: Record<string, number>
    newsTitle: string
    newsSummary: string
    tone?: 'positive' | 'negative' | 'neutral'
  }[]
}

export const FATE_EVENTS: FateEventTemplate[] = [
  {
    id: 'fate_market_rumor',
    title: '股市流言引发恐慌',
    description: (pm) => `一则关于政府即将出台严苛金融监管的谣言在市场蔓延，股市开盘暴跌 4%。财政部紧急澄清，但投资者信心已受损。${pm}面临如何应对的抉择。`,
    category: '经济',
    options: [
      {
        id: 'deny',
        label: '官方辟谣，强调政策稳定',
        effects: { economy: 2, approval: 1 },
        pmStatEffects: { politicalCapital: -3 },
        newsTitle: '政府澄清市场传闻',
        newsSummary: '总理办公室发表声明否认严苛监管传闻，市场情绪有所缓和。',
        tone: 'neutral',
      },
      {
        id: 'act',
        label: '顺势推出温和监管',
        effects: { economy: -3, stability: 3, treasury: 2 },
        newsTitle: '政府推出温和金融监管',
        newsSummary: '借市场传闻之际，政府推出适度的金融监管措施。',
        tone: 'neutral',
      },
      {
        id: 'ignore',
        label: '置之不理，市场自行消化',
        effects: { economy: -2, approval: -2 },
        pmStatEffects: { riskIndex: +3 },
        newsTitle: '政府对股市波动保持沉默',
        newsSummary: '市场对政府态度表示失望，投资者观望情绪加重。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'fate_celebrity_endorsement',
    title: '知名艺人公开支持',
    description: (pm) => `国民级流行歌手在演唱会上公开表达对${pm}总理施政方向的赞赏，相关视频在社交媒体获得千万播放。这一"意外代言"带来巨大流量，但也引来政治化争议。`,
    category: '社会',
    options: [
      {
        id: 'embrace',
        label: '公开感谢，借势宣传',
        effects: { approval: 5, prestige: 3 },
        pmStatEffects: { politicalCapital: +4 },
        newsTitle: '总理回应艺人支持',
        newsSummary: '总理在社交媒体感谢艺人支持，年轻群体关注度上升。',
        tone: 'positive',
      },
      {
        id: 'distance',
        label: '保持距离，避免政治化',
        effects: { approval: 1, stability: 2 },
        newsTitle: '总理对艺人支持保持克制',
        newsSummary: '总理表示欣赏但拒绝将艺人支持政治化。',
        tone: 'neutral',
      },
      {
        id: 'criticize',
        label: '批评艺人介入政治',
        effects: { approval: -4, stability: -2, prestige: -3 },
        pmStatEffects: { riskIndex: +5 },
        newsTitle: '总理批评艺人介入政治',
        newsSummary: '艺人粉丝群体强烈反弹，社媒出现要求总理道歉的话题。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'fate_foreign_award',
    title: '外国授予和平奖提名',
    description: (pm) => `某国际组织宣布提名${pm}总理为"年度和平人物"候选人，理由是其在区域合作中的贡献。但该组织与本国存在历史争议，引发国内舆论分歧。`,
    category: '外交',
    options: [
      {
        id: 'accept',
        label: '接受提名，高调宣传',
        effects: { diplomacy: 5, prestige: 4, approval: -3 },
        pmStatEffects: { politicalCapital: +3 },
        newsTitle: '总理接受国际和平奖提名',
        newsSummary: '政府高调宣传提名消息，但国内民族主义者表达不满。',
        tone: 'positive',
      },
      {
        id: 'lowkey',
        label: '低调处理，不公开表态',
        effects: { diplomacy: 2, prestige: 1 },
        newsTitle: '政府对提名保持低调',
        newsSummary: '总理办公室未对外发表声明，提名消息淡化处理。',
        tone: 'neutral',
      },
      {
        id: 'decline',
        label: '婉拒提名',
        effects: { approval: 4, diplomacy: -3, prestige: -2 },
        pmStatEffects: { partyPrestige: +5 },
        newsTitle: '总理婉拒国际和平奖提名',
        newsSummary: '总理以"国内事务优先"为由婉拒，国内民族主义者赞许。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'fate_minister_gaffe',
    title: '内阁部长失言风波',
    description: (pm) => `一位内阁部长在私人聚会上失言，被偷拍上传网络。言论涉及敏感群体，引发舆论风暴。该部长已向${pm}总理请罪，等待处置决定。`,
    category: '突发',
    options: [
      {
        id: 'fire',
        label: '立即解职，划清界限',
        effects: { approval: 4, stability: -3, prestige: 2 },
        pmStatEffects: { politicalCapital: -5, partyPrestige: -3 },
        newsTitle: '总理解职失言部长',
        newsSummary: '失言部长被立即免职，但党内出现对总理"过于严苛"的议论。',
        tone: 'neutral',
      },
      {
        id: 'defend',
        label: '公开维护，要求道歉了事',
        effects: { approval: -6, stability: 2 },
        pmStatEffects: { riskIndex: +6, partyPrestige: +2 },
        newsTitle: '总理维护失言部长',
        newsSummary: '总理表示部长已道歉应予宽容，反对党强烈抨击。',
        tone: 'negative',
      },
      {
        id: 'reassign',
        label: '调任闲职，淡化处理',
        effects: { approval: 1, stability: 1 },
        pmStatEffects: { politicalCapital: -2 },
        newsTitle: '失言部长被调任闲职',
        newsSummary: '总理以"工作需要"为由调整该部长职务，舆论争议趋缓。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'fate_natural_discovery',
    title: '勘探发现战略矿产',
    description: () => `地质勘探队在偏远省份发现一处大型稀有金属矿藏，初步评估储量可观。这一发现可能改变国家经济格局，但开发涉及环境与外资准入等复杂议题。`,
    category: '经济',
    options: [
      {
        id: 'nationalize',
        label: '国有化开发，自主经营',
        effects: { treasury: 5, economy: 3, diplomacy: -2 },
        pmStatEffects: { politicalCapital: -8, partyPrestige: +4 },
        newsTitle: '政府宣布矿产国有化',
        newsSummary: '新矿藏将由国企开发，国际矿业资本表达失望。',
        tone: 'positive',
      },
      {
        id: 'foreign',
        label: '引入外资合作开发',
        effects: { economy: 6, treasury: 3, approval: -2, diplomacy: 3 },
        pmStatEffects: { riskIndex: +4 },
        newsTitle: '政府与国际矿企签署开发协议',
        newsSummary: '外资引入加速开发，但民族主义者质疑主权让渡。',
        tone: 'neutral',
      },
      {
        id: 'delay',
        label: '暂缓开发，先做环评',
        effects: { approval: 3, economy: -1, stability: 2 },
        pmStatEffects: { politicalCapital: +2 },
        newsTitle: '政府启动矿产环评',
        newsSummary: '环保组织欢迎政府谨慎态度，开发计划推迟两年。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'fate_leak_scandal',
    title: '机密文件外泄',
    description: (pm) => `一批政府内部文件被匿名人士泄露给媒体，涉及${pm}总理与某外国领导人的私下对话记录。内容若属实，可能影响外交关系，也暴露政府内部存在泄密者。`,
    category: '突发',
    options: [
      {
        id: 'investigate',
        label: '成立调查委员会',
        effects: { stability: -2, approval: 2 },
        pmStatEffects: { politicalCapital: -6, riskIndex: +3 },
        newsTitle: '政府成立泄密调查委员会',
        newsSummary: '总理下令彻查泄密源头，但政府内部气氛紧张。',
        tone: 'neutral',
      },
      {
        id: 'deny',
        label: '否认文件真实性',
        effects: { diplomacy: -4, prestige: -3 },
        pmStatEffects: { riskIndex: +8 },
        newsTitle: '政府否认泄露文件真实性',
        newsSummary: '政府称文件系伪造，但国际媒体拿出更多证据。',
        tone: 'negative',
      },
      {
        id: 'transparent',
        label: '主动公开完整对话',
        effects: { approval: 4, diplomacy: -2, prestige: 3 },
        pmStatEffects: { partyPrestige: +3 },
        newsTitle: '政府主动公开完整对话记录',
        newsSummary: '透明化处理赢得民意，但外交关系短期受损。',
        tone: 'positive',
      },
    ],
  },
  {
    id: 'fate_viral_moment',
    title: '总理日常生活视频走红',
    description: (pm) => `一段${pm}总理下班后独自在便利店买夜宵的视频在社交媒体爆红，三天内累计播放破亿。网友称赞总理"接地气"，但也有人质疑是否为刻意公关。`,
    category: '社会',
    options: [
      {
        id: 'ride',
        label: '顺应舆论，强化亲民形象',
        effects: { approval: 6, prestige: 2 },
        pmStatEffects: { politicalCapital: +5 },
        newsTitle: '总理亲民形象走红网络',
        newsSummary: '政府借势推出系列亲民内容，民意支持率上升。',
        tone: 'positive',
      },
      {
        id: 'normal',
        label: '保持平常心，不刻意回应',
        effects: { approval: 3 },
        newsTitle: '总理对走红视频保持低调',
        newsSummary: '总理表示"只是普通生活"，未借势宣传。',
        tone: 'neutral',
      },
      {
        id: 'complain',
        label: '抱怨侵犯隐私',
        effects: { approval: -5, prestige: -2 },
        pmStatEffects: { riskIndex: +4 },
        newsTitle: '总理批评偷拍侵犯隐私',
        newsSummary: '网友反应两极，有人同情也有人嘲讽总理"玻璃心"。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'fate_opposition_split',
    title: '反对党内部出现分裂',
    description: () => `主要反对党因路线之争公开分裂，两位副党魁宣布退党另立新党。这一变动暂时削弱了反对力量，但也带来了政治版图的不确定性。`,
    category: '政治体制',
    options: [
      {
        id: 'mediate',
        label: '出面斡旋，促成和解',
        effects: { stability: 3, diplomacy: 2 },
        pmStatEffects: { politicalCapital: -4, partyPrestige: +3 },
        newsTitle: '总理斡旋反对党分裂',
        newsSummary: '总理居中调停，反对党暂缓分裂，但矛盾未解。',
        tone: 'positive',
      },
      {
        id: 'exploit',
        label: '趁机拉拢分裂派系',
        effects: { approval: -2, stability: -2, prestige: 3 },
        pmStatEffects: { riskIndex: +6 },
        newsTitle: '政府拉拢反对党分裂派系',
        newsSummary: '部分分裂议员加入执政联盟，但被指责趁火打劫。',
        tone: 'neutral',
      },
      {
        id: 'observe',
        label: '观望，不介入',
        effects: { stability: 1, approval: 1 },
        newsTitle: '政府对反对党分裂保持观望',
        newsSummary: '总理表示"反对党内部事务不评论"，政局暂稳。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'fate_scientific_breakthrough',
    title: '本国科学家取得重大突破',
    description: () => `国家实验室宣布在新能源材料领域取得突破性进展，相关论文登顶国际顶级期刊。这一成果有望带动产业升级，但商业化仍需巨额投入。`,
    category: '经济',
    options: [
      {
        id: 'fund',
        label: '追加科研经费',
        effects: { economy: 4, treasury: -3, prestige: 4 },
        pmStatEffects: { politicalCapital: -3 },
        newsTitle: '政府追加科研经费',
        newsSummary: '总理宣布追加 50 亿经费支持新能源材料产业化。',
        tone: 'positive',
      },
      {
        id: 'private',
        label: '鼓励民营企业接手',
        effects: { economy: 3, treasury: 2, approval: -1 },
        pmStatEffects: { riskIndex: +2 },
        newsTitle: '政府鼓励民企接手科研成果',
        newsSummary: '多家大型企业表达接手意愿，但学界担忧技术垄断。',
        tone: 'neutral',
      },
      {
        id: 'seal',
        label: '列为国家机密',
        effects: { diplomacy: -3, prestige: 2, stability: 1 },
        pmStatEffects: { partyPrestige: -2, riskIndex: +5 },
        newsTitle: '政府将新材料研究列为机密',
        newsSummary: '科研成果被列为国家机密，国际学界表达失望。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'fate_border_incident',
    title: '边境小规模摩擦',
    description: () => `邻国边防部队在争议地区与我方发生对峙，双方均有士兵轻伤。局势尚可控，但民族主义情绪已被点燃，社交媒体出现要求强硬回应的呼声。`,
    category: '外交',
    options: [
      {
        id: 'negotiate',
        label: '启动外交对话，降温处理',
        effects: { diplomacy: 3, approval: -2, stability: 2 },
        pmStatEffects: { politicalCapital: -4 },
        newsTitle: '政府启动边境外交对话',
        newsSummary: '双方同意通过外交渠道解决，但民族主义者批评软弱。',
        tone: 'neutral',
      },
      {
        id: 'protest',
        label: '强烈抗议，召回大使',
        effects: { diplomacy: -5, approval: 5, prestige: 2 },
        pmStatEffects: { riskIndex: +5, partyPrestige: +4 },
        newsTitle: '政府召回大使表达抗议',
        newsSummary: '外交部召回大使，民族主义者叫好，但外交关系恶化。',
        tone: 'negative',
      },
      {
        id: 'military',
        label: '增兵边境，展示决心',
        effects: { diplomacy: -8, stability: -3, approval: 4, treasury: -3 },
        pmStatEffects: { riskIndex: +10 },
        newsTitle: '政府增兵边境',
        newsSummary: '军队向边境集结，国际社会表达关切。',
        tone: 'negative',
      },
    ],
  },
]

/** 随机挑选一个命运事件模板并生成 PendingEvent */
export function rollFateEvent(pmName: string, totalDays: number, turn: number): PendingEvent {
  const template = FATE_EVENTS[Math.floor(Math.random() * FATE_EVENTS.length)]
  return {
    instanceId: `fate_${template.id}_${turn}_${Math.floor(Math.random() * 1000)}`,
    eventId: template.id,
    title: template.title,
    description: template.description(pmName),
    category: template.category,
    options: template.options.map((o) => ({
      id: o.id,
      label: o.label,
      description: o.description,
      effects: o.effects,
      pmStatEffects: o.pmStatEffects,
      newsTitle: o.newsTitle,
      newsSummary: o.newsSummary,
      tone: o.tone,
    })),
    isEmergency: false,
    triggeredDay: totalDays,
    deadlineDay: totalDays + 21,
    defaultOptionId: template.options[0].id,
  }
}
