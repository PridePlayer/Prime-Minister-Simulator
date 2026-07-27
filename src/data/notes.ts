import type { DiplomaticNote } from '@/types/game'

/** 外部照会库 */
export const DIPLOMATIC_NOTES: DiplomaticNote[] = [
  {
    id: 'note_trade_agreement',
    from: '北方联邦商务部',
    subject: '双边自由贸易协定',
    content: '我方提议与贵国签署双边自由贸易协定，降低关税壁垒，促进双边贸易。此举预计将为两国带来显著的经济收益。',
    acceptEffects: { economy: 8, diplomacy: 6, treasury: 4, approval: -2 },
    rejectEffects: { diplomacy: -5, economy: -2 },
    acceptNews: {
      title: '两国签署自由贸易协定',
      summary: '政府与北方联邦签署自贸协定，预计将大幅提升双边贸易额。',
    },
    rejectNews: {
      title: '自贸谈判搁浅',
      summary: '政府拒绝签署自贸协定，北方联邦表示遗憾。',
    },
  },
  {
    id: 'note_tech_cooperation',
    from: '东方共和国科技部',
    subject: '科技合作协议',
    content: '我方提议与贵国开展科技合作，共享人工智能与清洁能源领域的研究成果。合作期间双方互派科研人员，共同推进技术转化。',
    acceptEffects: { economy: 6, diplomacy: 5, prestige: 3, approval: 2 },
    rejectEffects: { diplomacy: -4, prestige: -2 },
    acceptNews: {
      title: '两国达成科技合作协议',
      summary: '政府与东方共和国签署科技合作协议，将在人工智能和清洁能源领域展开合作。',
    },
    rejectNews: {
      title: '科技合作提议被拒',
      summary: '政府拒绝科技合作提议，东方共和国表示失望。',
    },
  },
  {
    id: 'note_military_aid',
    from: '西方联盟安全委员会',
    subject: '军事援助与安全合作',
    content: '鉴于当前地区安全形势，我方愿向贵国提供军事装备与训练支持，以增强贵国防御能力。此举需贵国在联合国投票中与我方保持一致。',
    acceptEffects: { prestige: 5, diplomacy: 4, stability: 3, approval: -5 },
    rejectEffects: { diplomacy: -6, prestige: 2, approval: 3 },
    acceptNews: {
      title: '政府接受军事援助',
      summary: '政府接受西方联盟军事援助，国防能力将得到提升，但部分民众批评政府丧失外交自主。',
    },
    rejectNews: {
      title: '政府拒绝军事援助',
      summary: '政府拒绝西方联盟军事援助，强调独立自主的外交政策。',
    },
  },
  {
    id: 'note_loan_offer',
    from: '南方发展银行',
    subject: '低息发展贷款',
    content: '我行愿向贵国提供低息发展贷款，用于基础设施建设和民生工程。贷款总额相当于贵国国内生产总值的3%，利率低于市场水平。',
    acceptEffects: { treasury: 10, economy: 5, approval: 3, diplomacy: 2 },
    rejectEffects: { diplomacy: -3, treasury: -2 },
    acceptNews: {
      title: '政府获得低息发展贷款',
      summary: '政府从南方发展银行获得低息贷款，将用于基建和民生工程。',
    },
    rejectNews: {
      title: '政府拒绝发展贷款',
      summary: '政府拒绝南方发展银行贷款提议，强调财政自律。',
    },
  },
  {
    id: 'note_refugee_crisis',
    from: '邻国联合事务部',
    subject: '难民安置合作请求',
    content: '由于邻国地区冲突，大量难民涌入我两国边境。我方提议贵国分担安置压力，接收部分难民。国际社会将提供人道主义援助资金。',
    acceptEffects: { diplomacy: 7, approval: -6, stability: -4, treasury: 3 },
    rejectEffects: { diplomacy: -8, approval: 4, stability: 2 },
    acceptNews: {
      title: '政府同意接收难民',
      summary: '政府同意接收部分难民，国际社会表示赞赏，但国内民众表达担忧。',
    },
    rejectNews: {
      title: '政府拒绝接收难民',
      summary: '政府拒绝难民安置请求，国际社会批评政府缺乏人道主义精神。',
    },
  },
  {
    id: 'note_extradition',
    from: '西方联盟司法部',
    subject: '逃犯引渡请求',
    content: '我方请求贵国引渡一名涉嫌巨额诈骗的逃犯，该逃犯目前藏匿于贵国。两国间无引渡条约，但希望基于司法互助原则予以配合。',
    acceptEffects: { diplomacy: 5, prestige: 3, approval: -2, stability: 1 },
    rejectEffects: { diplomacy: -4, prestige: -2, approval: 3 },
    acceptNews: {
      title: '政府同意引渡逃犯',
      summary: '逃犯被引渡至西方联盟，两国司法合作加深，但部分民众质疑主权让步。',
    },
    rejectNews: {
      title: '政府拒绝引渡请求',
      summary: '政府以无引渡条约为由拒绝，西方联盟表达不满。',
    },
  },
  {
    id: 'note_cultural_exchange',
    from: '东方共和国文化部',
    subject: '文化交流合作',
    content: '我方提议与贵国开展深度文化交流，互设文化中心，举办艺术展览与学术互访。此举将增进两国人民理解，深化双边关系。',
    acceptEffects: { diplomacy: 6, approval: 3, prestige: 2, treasury: -2 },
    rejectEffects: { diplomacy: -3, approval: -1 },
    acceptNews: {
      title: '两国签署文化交流协议',
      summary: '政府与东方共和国开展深度文化交流，互设文化中心。',
    },
    rejectNews: {
      title: '文化交流提议被拒',
      summary: '政府拒绝东方共和国文化交流提议，两国关系降温。',
    },
  },
  {
    id: 'note_intelligence_sharing',
    from: '北方联邦安全局',
    subject: '情报共享协议',
    content: '鉴于地区恐怖主义威胁上升，我方提议与贵国建立情报共享机制，互通涉恐人员信息。协议将提升双方反恐能力，但需承诺信息保密。',
    acceptEffects: { stability: 4, diplomacy: 4, prestige: 2, approval: -2 },
    rejectEffects: { stability: -2, diplomacy: -3 },
    acceptNews: {
      title: '政府签署情报共享协议',
      summary: '与北方联邦建立反恐情报共享机制，部分民众担忧隐私权受损。',
    },
    rejectNews: {
      title: '政府拒绝情报共享',
      summary: '政府拒绝情报共享提议，强调独立反恐立场。',
    },
  },
  {
    id: 'note_border_demarcation',
    from: '南方共和国外交部',
    subject: '边界划界谈判',
    content: '我方提议就两国争议边界重启谈判，基于历史协议与国际法原则，达成最终划界协议。争议地区涉及资源开发权。',
    acceptEffects: { diplomacy: 8, stability: 3, treasury: -3, economy: 2 },
    rejectEffects: { diplomacy: -5, stability: -2 },
    acceptNews: {
      title: '政府同意重启边界谈判',
      summary: '与南方共和国重启边界划界谈判，地区紧张缓解。',
    },
    rejectNews: {
      title: '政府拒绝边界谈判',
      summary: '政府拒绝重启谈判，南方共和国表示遗憾，边境局势紧张。',
    },
  },
  {
    id: 'note_environmental_pact',
    from: '国际环境组织联盟',
    subject: '区域环境保护公约',
    content: '我方邀请贵国加入区域环境保护公约，承诺减少碳排放、保护跨境水资源、共享清洁能源技术。公约将提升我国国际形象，但需承担减排义务。',
    acceptEffects: { diplomacy: 7, approval: 4, economy: -3, treasury: -4, prestige: 3 },
    rejectEffects: { diplomacy: -4, approval: -2 },
    acceptNews: {
      title: '政府加入区域环保公约',
      summary: '我国成为环境保护公约成员国，国际形象提升，但企业面临减排压力。',
    },
    rejectNews: {
      title: '政府拒绝加入环保公约',
      summary: '政府拒绝加入环保公约，国际环保组织表达强烈失望。',
    },
  },
  {
    id: 'note_energy_pipeline',
    from: '中亚能源联盟',
    subject: '跨境能源管道',
    content: '我方提议建设穿越贵国的能源管道，连接产油国与国际市场。贵国将获得过境费与优惠能源供应，但需投入基建资金并承担环境风险。',
    acceptEffects: { economy: 8, treasury: 6, diplomacy: 4, stability: -2, approval: -3 },
    rejectEffects: { economy: -2, diplomacy: -3 },
    acceptNews: {
      title: '政府同意建设跨境能源管道',
      summary: '能源管道项目启动，过境费收入可观，但环保群体抗议。',
    },
    rejectNews: {
      title: '政府拒绝能源管道项目',
      summary: '政府拒绝管道项目，中亚能源联盟转向他国。',
    },
  },
  {
    id: 'note_human_rights_inquiry',
    from: '联合国人权事务高级专员',
    subject: '人权状况调查请求',
    content: '联合国人权事务高级专员办事处请求派遣调查团访问贵国，评估近期被报道的人权状况。访问将增强透明度，但可能暴露内部问题。',
    acceptEffects: { diplomacy: 5, prestige: 3, stability: -3, approval: -2 },
    rejectEffects: { diplomacy: -7, prestige: -4, approval: 2 },
    acceptNews: {
      title: '政府接受联合国人权调查',
      summary: '联合国调查团即将访问，国际社会赞赏政府透明度，但内部紧张加剧。',
    },
    rejectNews: {
      title: '政府拒绝联合国人权调查',
      summary: '政府拒绝调查请求，国际社会强烈批评，外交关系恶化。',
    },
  },
]
