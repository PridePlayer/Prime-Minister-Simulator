import type { GameEvent } from '@/types/game'
import { MORAL_DILEMMAS, LEAK_EVENTS } from './moralDilemmas'
import { PERSONAL_EVENTS } from './personalEvents'
import { CROSS_SYSTEM_EVENTS } from './crossSystemEvents'
import { EVENT_CHAIN_EVENTS } from './eventChainEvents'

/** 事件库（含事件链） */
export const EVENTS: GameEvent[] = [
  // ===== 事件链：停工 → 劳资法 → 就业市场 =====
  {
    id: 'evt_strike',
    title: '全国停工抗议浪潮',
    category: '社会',
    description:
      '铁路与港口工人联合发起停工行动，要求提高最低工资并缩短工时。停工已持续五日，物流近乎瘫痪，物价开始上涨。',
    options: [
      {
        id: 'a', label: '答应涨薪诉求，立法提高最低工资',
        description: '顺应民意，但加重企业负担',
        effects: { approval: 12, treasury: -10, economy: -8, stability: 6 },
        newsTitle: '总理签署最低工资上调法令',
        newsSummary: '工人欢呼雀跃，企业界担忧成本攀升。',
        tone: 'positive',
        chainId: 'evt_labor_law', chainDelay: 3,
      },
      {
        id: 'b', label: '强硬处置，宣布停工非法',
        description: '维护秩序，但激化矛盾',
        effects: { approval: -15, stability: -8, treasury: 4, prestige: -6 },
        newsTitle: '执法部门介入，停工被强行清场',
        newsSummary: '现场局势紧张，反对党强烈谴责。',
        chainId: 'evt_labor_unrest', chainDelay: 4,
      },
      {
        id: 'c', label: '邀请工会谈判，折中方案',
        description: '小幅让步，平衡各方',
        effects: { approval: 4, economy: -3, stability: 3, prestige: 5 },
        newsTitle: '劳资双方达成折中协议',
        newsSummary: '停工结束，最低工资小幅上调，各方勉强接受。',
      },
    ],
  },
  {
    id: 'evt_labor_law',
    title: '《劳动法》修订争议',
    category: '社会',
    triggeredBy: { eventId: 'evt_strike', optionId: 'a' },
    description:
      '最低工资上调后，企业界强烈反弹，要求修订《劳动法》放宽解雇限制以换取竞争力。工会则警告这是在削弱工人权益。',
    minTurn: 999, // 仅由事件链触发
    options: [
      {
        id: 'a', label: '接受企业诉求，修订劳动法',
        description: '市场化改革',
        effects: { economy: 8, approval: -10, treasury: 4, prestige: 2 },
        newsTitle: '《劳动法》修订案通过',
        newsSummary: '企业界欢迎，工会谴责出卖工人。',
        chainId: 'evt_employment_boom', chainDelay: 4,
      },
      {
        id: 'b', label: '拒绝修订，维持工人权益',
        description: '坚守立场',
        effects: { approval: 6, economy: -4, prestige: 4, stability: 2 },
        newsTitle: '政府拒绝修订《劳动法》',
        newsSummary: '工会感谢，部分企业威胁迁厂。',
      },
    ],
  },
  {
    id: 'evt_labor_unrest',
    title: '工会激进派崛起',
    category: '突发',
    triggeredBy: { eventId: 'evt_strike', optionId: 'b' },
    description:
      '罢工被镇压后，工会激进派抬头，呼吁更激进的抗争手段。街头小规模冲突此起彼伏，社会秩序面临考验。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '对话和解，释放被捕工会领袖',
        description: '缓和矛盾',
        effects: { approval: 6, stability: 4, prestige: -4 },
        newsTitle: '政府释放工会领袖，重启对话',
        newsSummary: '街头降温，但强硬派批评政府软弱。',
      },
      {
        id: 'b', label: '继续高压，颁布《公共秩序法》',
        description: '以暴制暴',
        effects: { stability: -6, approval: -8, prestige: 2, treasury: 2 },
        newsTitle: '《公共秩序法》出台，集会受限',
        newsSummary: '人权组织抗议，街头小幅平静。',
      },
    ],
  },
  {
    id: 'evt_employment_boom',
    title: '就业市场大爆发',
    category: '经济',
    triggeredBy: { eventId: 'evt_labor_law', optionId: 'a' },
    description:
      '劳动法修订后，企业投资信心大增，外资涌入，就业岗位快速增长。但工资增长停滞引发新争议。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '维持放手策略，让市场调节',
        description: '自由市场',
        effects: { economy: 10, approval: -4, prestige: 4, treasury: 6 },
        newsTitle: '就业市场持续繁荣',
        newsSummary: '企业利润新高，但贫富差距扩大。',
        tone: 'positive',
      },
      {
        id: 'b', label: '推出补充性福利政策',
        description: '平衡利润与公平',
        effects: { economy: 4, approval: 8, treasury: -6, prestige: 6 },
        newsTitle: '政府推出就业福利包',
        newsSummary: '低收入群体获补贴，企业负担略有增加。',
      },
    ],
  },

  // ===== 事件链：边境紧张 → 对峙 → 和解或冲突 =====
  {
    id: 'evt_border',
    title: '邻国边境军事调动',
    category: '外交',
    description:
      '情报部门报告，邻国「莫尔多维亚」在与我国接壤的边境地区集结了三个师的兵力，并进行实弹演习。',
    minTurn: 3,
    options: [
      {
        id: 'a', label: '加强边防，进入二级战备',
        description: '展示决心',
        effects: { stability: 6, treasury: -8, diplomacy: -10, prestige: 8 },
        newsTitle: '我军进入二级战备，边境局势紧张',
        newsSummary: '国防部宣布增兵边境，外交渠道仍保持畅通。',
        chainId: 'evt_border_standoff', chainDelay: 3,
      },
      {
        id: 'b', label: '主动致电邻国领导人降温',
        description: '外交手腕',
        effects: { diplomacy: 14, prestige: 6, stability: -3 },
        newsTitle: '总理热线通话，边境紧张缓解',
        newsSummary: '两国领导人达成共识，逐步撤回边境演习部队。',
        tone: 'positive',
        chainId: 'evt_border_treaty', chainDelay: 4,
      },
      {
        id: 'c', label: '向国际联盟申诉，寻求调停',
        description: '借力外部',
        effects: { diplomacy: 6, prestige: -8, stability: 2 },
        newsTitle: '我国向国际联盟提交申诉',
        newsSummary: '国际社会呼吁克制，邻国指责我国「外交化」争端。',
      },
    ],
  },
  {
    id: 'evt_border_standoff',
    title: '边境对峙升级',
    category: '外交',
    triggeredBy: { eventId: 'evt_border', optionId: 'a' },
    description:
      '双方增兵后，边境地区发生小规模交火。国际社会呼吁停火，但两国军方强硬派互不相让。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '不退缩，展示全面军事力量',
        description: '强军震慑',
        effects: { stability: 4, diplomacy: -8, treasury: -10, prestige: 10 },
        newsTitle: '我军展示新型武器，邻国暂缓行动',
        newsSummary: '军力展示震慑邻国，但财政负担加重。',
        chainId: 'evt_border_peace', chainDelay: 5,
      },
      {
        id: 'b', label: '接受调停，撤军至对峙前状态',
        description: '退一步海阔天空',
        effects: { diplomacy: 6, stability: -4, prestige: -4, treasury: 4 },
        newsTitle: '我方接受调停，撤回增援部队',
        newsSummary: '鹰派不满，但避免了全面冲突。',
      },
    ],
  },
  {
    id: 'evt_border_treaty',
    title: '边境和平条约谈判',
    category: '外交',
    triggeredBy: { eventId: 'evt_border', optionId: 'b' },
    description:
      '外交降温后，两国启动互信机制谈判，讨论建立非军事区与定期沟通渠道。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '签署全面和平条约',
        description: '一劳永逸',
        effects: { diplomacy: 16, stability: 6, prestige: 8, treasury: -2 },
        newsTitle: '两国签署历史性和平条约',
        newsSummary: '边境和平纪念日诞生，两国贸易量激增。',
        tone: 'positive',
      },
      {
        id: 'b', label: '仅签署有限互信备忘录',
        description: '谨慎推进',
        effects: { diplomacy: 6, stability: 2, prestige: 2 },
        newsTitle: '两国签署互信备忘录',
        newsSummary: '关系回暖，但实质性进展有限。',
      },
    ],
  },
  {
    id: 'evt_border_peace',
    title: '边境和平曙光',
    category: '外交',
    triggeredBy: { eventId: 'evt_border_standoff', optionId: 'a' },
    description:
      '军事对峙后，双方疲于消耗，民间反战情绪高涨。邻国新领导人释放和解信号。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '抓住机会，推动全面和解',
        description: '和平使者',
        effects: { diplomacy: 14, prestige: 12, approval: 6, treasury: 4 },
        newsTitle: '两国领导人握手言和，边境重开',
        newsSummary: '历史性握手，和平赢得国际赞誉。',
        tone: 'positive',
      },
      {
        id: 'b', label: '保持警惕，仅有限解冻关系',
        description: '戒心未消',
        effects: { diplomacy: 4, prestige: 2, stability: 2 },
        newsTitle: '边境管控部分放宽',
        newsSummary: '关系缓慢解冻，信任仍需时日。',
      },
    ],
  },

  // ===== 事件链：经济衰退 → 复苏 → 通胀 =====
  {
    id: 'evt_recession',
    title: '经济衰退预警',
    category: '经济',
    description:
      '央行行长紧急求见：连续两季度 GDP 负增长，制造业订单锐减，失业率攀升至 9.8%。',
    options: [
      {
        id: 'a', label: '推出大规模基建刺激计划',
        description: '以赤字换增长',
        effects: { economy: 14, treasury: -16, approval: 8, stability: 4 },
        newsTitle: '万亿基建计划获批，市场应声上涨',
        newsSummary: '股市大涨 3.2%，但财政赤字预警亮起红灯。',
        chainId: 'evt_recovery', chainDelay: 5,
      },
      {
        id: 'b', label: '降息并放松信贷监管',
        description: '货币宽松',
        effects: { economy: 8, treasury: -2, approval: 2, stability: -4 },
        newsTitle: '央行宣布降息 50 个基点',
        newsSummary: '信贷活跃，但通胀隐忧浮现。',
        chainId: 'evt_inflation_risk', chainDelay: 6,
      },
      {
        id: 'c', label: '紧缩财政，削减公共开支',
        description: '稳健但失人心',
        effects: { economy: -2, treasury: 12, approval: -12, stability: -6 },
        newsTitle: '政府推出紧缩方案，引发抗议',
        newsSummary: '福利削减惹众怒。',
      },
    ],
  },
  {
    id: 'evt_recovery',
    title: '经济强劲复苏',
    category: '经济',
    triggeredBy: { eventId: 'evt_recession', optionId: 'a' },
    description:
      '基建刺激见效，经济连续两个季度增长。但政府债务突破红线，国际评级机构发出警告。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '趁势加税，削减赤字',
        description: '财政纪律',
        effects: { treasury: 10, economy: -4, approval: -6, prestige: 6 },
        newsTitle: '政府加税偿债，评级回升',
        newsSummary: '财政健康改善，但商界不满。',
      },
      {
        id: 'b', label: '继续扩张，借钱发展',
        description: '增长至上',
        effects: { economy: 8, treasury: -8, approval: 4, prestige: -2 },
        newsTitle: '政府继续举债投资',
        newsSummary: '增长强劲，但债务风险上升。',
        chainId: 'evt_debt_crisis', chainDelay: 6,
      },
    ],
  },
  {
    id: 'evt_inflation_risk',
    title: '通胀压力抬头',
    category: '经济',
    triggeredBy: { eventId: 'evt_recession', optionId: 'b' },
    description:
      '宽松货币政策的副作用显现：CPI 连续三个月高于 4%，房价飙升，中产家庭生活成本骤增。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '收紧货币，加息抑制通胀',
        description: '货币政策急转弯',
        effects: { economy: -4, treasury: 4, approval: -4, stability: 2 },
        newsTitle: '央行加息 75 个基点',
        newsSummary: '通胀压力缓解，但房贷利率上升。',
      },
      {
        id: 'b', label: '价格管制，直接干预',
        description: '行政手段',
        effects: { economy: -6, approval: 6, stability: 4, treasury: -2 },
        newsTitle: '政府启动价格管制',
        newsSummary: '物价暂时稳定，但黑市开始抬头。',
      },
    ],
  },
  {
    id: 'evt_debt_crisis',
    title: '债务危机预警',
    category: '经济',
    triggeredBy: { eventId: 'evt_recovery', optionId: 'b' },
    description:
      '政府债务占 GDP 比重突破 120%，国际评级机构下调我国主权信用评级。外资开始撤离，本币贬值压力骤增。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '紧急财政紧缩+寻求国际援助',
        description: '痛定思痛',
        effects: { treasury: 12, economy: -8, approval: -10, diplomacy: 4 },
        newsTitle: '政府接受国际货币基金组织贷款',
        newsSummary: '债务危机暂时平息，但紧缩引发抗议。',
        chainId: 'evt_austerity', chainDelay: 4,
      },
      {
        id: 'b', label: '债务重组，延长还款期限',
        description: '技术性处理',
        effects: { treasury: 4, economy: -2, diplomacy: -4, approval: -4 },
        newsTitle: '政府启动债务重组谈判',
        newsSummary: '债主国态度强硬，谈判艰难。',
      },
    ],
  },
  {
    id: 'evt_austerity',
    title: '紧缩时代的阵痛',
    category: '社会',
    triggeredBy: { eventId: 'evt_debt_crisis', optionId: 'a' },
    description:
      '紧缩政策实施后，公共服务大幅削减，民众生活水平下降。社会不满情绪酝酿，极左政党支持率飙升。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '坚持紧缩，重建财政健康',
        description: '长痛不如短痛',
        effects: { treasury: 10, economy: -2, approval: -8, stability: -4, prestige: 6 },
        newsTitle: '财政实现盈余，国际赞誉',
        newsSummary: '财务健康恢复，但社会代价沉重。',
        tone: 'positive',
      },
      {
        id: 'b', label: '适度放宽，增加社会福利',
        description: '安抚民心',
        effects: { treasury: -4, approval: 8, stability: 4, economy: 2 },
        newsTitle: '政府放宽紧缩，增加福利支出',
        newsSummary: '民生回暖，但财政纪律受损。',
      },
    ],
  },

  // ===== 独立事件 =====
  {
    id: 'evt_disaster',
    title: '特大洪灾席卷东南',
    category: '突发',
    description:
      '东南三省遭遇百年一遇洪灾，堤坝决口，数十万人受灾。',
    options: [
      {
        id: 'a', label: '动用战略储备，全力救灾',
        description: '倾尽资源救人',
        effects: { approval: 14, treasury: -14, stability: 6, prestige: 8 },
        newsTitle: '总理亲赴灾区，调度全国资源救援',
        newsSummary: '救灾有力，灾民感念政府关怀。',
        tone: 'positive',
      },
      {
        id: 'b', label: '呼吁社会捐助，有限介入',
        description: '节省资源',
        effects: { approval: -8, treasury: -2, stability: -8, prestige: -6 },
        newsTitle: '政府呼吁民间捐助，救灾力度遭质疑',
        newsSummary: '舆论批评救援迟缓。',
      },
      {
        id: 'c', label: '军队介入，宣布紧急状态',
        description: '强力高效',
        effects: { approval: 6, treasury: -8, stability: 8, prestige: 4 },
        newsTitle: '军队开赴灾区，紧急状态生效',
        newsSummary: '秩序迅速恢复。',
      },
    ],
  },
  {
    id: 'evt_education',
    title: '教育改革之争',
    category: '社会',
    description: '教育部提交教改方案：取消文理分科、延长义务教育至十二年。家长群体分裂为两派。',
    once: true,
    options: [
      {
        id: 'a', label: '全面推行教改方案',
        description: '长远利好',
        effects: { approval: 6, treasury: -10, stability: -4, prestige: 10 },
        newsTitle: '教育改革法案正式通过',
        newsSummary: '十二年义务教育落地，教育界普遍欢迎。',
        tone: 'positive',
      },
      {
        id: 'b', label: '搁置改革，维持现状',
        description: '稳妥保守',
        effects: { approval: -2, stability: 2, prestige: -4 },
        newsTitle: '教改方案无限期搁置',
        newsSummary: '改革派失望，保守派松了口气。',
      },
      {
        id: 'c', label: '试点推行，逐步铺开',
        description: '中庸之道',
        effects: { approval: 4, treasury: -4, stability: 2, prestige: 6 },
        newsTitle: '教改将在三省市先行试点',
        newsSummary: '渐进式改革获得各方认可。',
      },
    ],
  },
  {
    id: 'evt_energy',
    title: '能源价格飙升',
    category: '经济',
    description: '国际原油价格突破每桶 120 美元，国内成品油、天然气价格联动上涨。',
    options: [
      {
        id: 'a', label: '动用价格补贴，冻结油价',
        description: '保民生',
        effects: { approval: 10, treasury: -12, economy: -2 },
        newsTitle: '政府出手冻结油价三个月',
        newsSummary: '民众松口气，但财政补贴压力巨大。',
      },
      {
        id: 'b', label: '推动新能源转型，长期投资',
        description: '治本之策',
        effects: { economy: 6, treasury: -8, approval: 2, prestige: 8 },
        newsTitle: '新能源转型计划启动',
        newsSummary: '光伏与风电项目获重大资金支持。',
        tone: 'positive',
      },
      {
        id: 'c', label: '放开价格，由市场调节',
        description: '尊重市场',
        effects: { economy: 4, approval: -14, stability: -6 },
        newsTitle: '油价全面市场化，涨幅惊人',
        newsSummary: '车主与运输业叫苦不迭。',
      },
    ],
  },
  {
    id: 'evt_summit',
    title: '国际峰会邀请',
    category: '外交',
    description: '受邀出席「环球合作峰会」，就贸易、气候与安全议题与多国领导人会晤。',
    minTurn: 2,
    once: true,
    options: [
      {
        id: 'a', label: '高调出席，主导议题',
        description: '展露锋芒',
        effects: { diplomacy: 16, prestige: 12, treasury: -4 },
        newsTitle: '总理在峰会上发表主旨演讲',
        newsSummary: '我国倡议获多国响应，国际媒体聚焦。',
        tone: 'positive',
      },
      {
        id: 'b', label: '低调参与，广结善缘',
        description: '务实外交',
        effects: { diplomacy: 8, prestige: 4, treasury: -2 },
        newsTitle: '我国代表团展开多场双边会晤',
        newsSummary: '低调但务实，签署数项合作协议。',
      },
      {
        id: 'c', label: '婉拒出席，专注内政',
        description: '内政优先',
        effects: { diplomacy: -10, prestige: -4, approval: 2 },
        newsTitle: '总理缺席峰会，专注国内事务',
        newsSummary: '国际社会略感失望，国内民众理解。',
      },
    ],
  },
  {
    id: 'evt_scandal',
    title: '阁员腐败丑闻曝光',
    category: '突发',
    description: '调查记者爆料：一名内阁部长涉嫌收受巨额贿赂。舆论哗然。',
    options: [
      {
        id: 'a', label: '立即开除并移交司法',
        description: '壮士断腕',
        effects: { approval: 10, prestige: 8, stability: -2, treasury: 2 },
        newsTitle: '涉事部长被免职并立案调查',
        newsSummary: '总理铁腕反腐，民众拍手称快。',
        tone: 'positive',
      },
      {
        id: 'b', label: '内部处理，低调淡化',
        description: '保党羽',
        effects: { approval: -14, prestige: -10, stability: -4 },
        newsTitle: '腐败丑闻被指「冷处理」',
        newsSummary: '舆论质疑政府包庇。',
        chainId: 'evt_scandal_aftermath', chainDelay: 5,
      },
      {
        id: 'c', label: '成立独立调查委员会',
        description: '程序正义',
        effects: { approval: 4, prestige: 2, stability: -2 },
        newsTitle: '独立调查委员会成立',
        newsSummary: '调查启动，结果尚待时日。',
      },
    ],
  },
  {
    id: 'evt_scandal_aftermath',
    title: '丑闻余波',
    category: '突发',
    triggeredBy: { eventId: 'evt_scandal', optionId: 'b' },
    description:
      '腐败丑闻被冷处理后，爆料记者持续跟踪，挖出更多涉及您亲信的线索。政治对手在议会发起弹劾动议。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '全面配合调查，主动切割',
        description: '止损',
        effects: { approval: 4, prestige: -6, stability: 2, treasury: 2 },
        newsTitle: '总理主动配合调查，亲信被免职',
        newsSummary: '政坛震荡，但阻止了弹劾。',
      },
      {
        id: 'b', label: '否认知情，正面反击',
        description: '硬扛',
        effects: { approval: -8, prestige: -4, stability: -6 },
        newsTitle: '弹劾动议在议会投票',
        newsSummary: '虽弹劾未过，但政府信誉严重受损。',
      },
    ],
  },
  {
    id: 'evt_healthcare',
    title: '公共医疗危机',
    category: '社会',
    description: '冬季流感叠加医疗资源紧张，多家公立医院急诊爆满。',
    options: [
      {
        id: 'a', label: '紧急拨款扩充医疗资源',
        description: '花钱解燃眉',
        effects: { approval: 12, treasury: -12, stability: 4, prestige: 4 },
        newsTitle: '医疗紧急拨款到位',
        newsSummary: '临时病房启用，医护人员获加班补贴。',
        tone: 'positive',
      },
      {
        id: 'b', label: '引入私立医疗，分流患者',
        description: '市场化',
        effects: { treasury: 4, approval: -8, stability: -4, economy: 4 },
        newsTitle: '公立医院与私立机构合作分流',
        newsSummary: '候诊缩短，但低收入群体抱怨费用高。',
      },
      {
        id: 'c', label: '推动分级诊疗长期改革',
        description: '治本',
        effects: { approval: 2, treasury: -6, prestige: 8, stability: 2 },
        newsTitle: '分级诊疗改革方案公布',
        newsSummary: '社区医疗获加强，长远布局启动。',
      },
    ],
  },
  {
    id: 'evt_trade',
    title: '自由贸易协定谈判',
    category: '外交',
    description: '与「南半球联盟」的自贸协定进入最后阶段。',
    minTurn: 4,
    options: [
      {
        id: 'a', label: '全面开放，签署协定',
        description: '拥抱全球化',
        effects: { economy: 12, diplomacy: 10, approval: -6, stability: -4 },
        newsTitle: '自贸协定正式签署',
        newsSummary: '出口行业振奋，部分本土产业忧虑。',
      },
      {
        id: 'b', label: '设置保护条款，有限开放',
        description: '平衡兼顾',
        effects: { economy: 6, diplomacy: 6, approval: 2, prestige: 4 },
        newsTitle: '自贸协定附带保护条款',
        newsSummary: '敏感产业获过渡期保护，各方妥协。',
        tone: 'positive',
      },
      {
        id: 'c', label: '退出谈判，保护本土产业',
        description: '闭关自守',
        effects: { economy: -8, diplomacy: -12, approval: 6, stability: 2 },
        newsTitle: '我国退出自贸谈判',
        newsSummary: '本土产业欢呼，外交关系趋冷。',
      },
    ],
  },
  {
    id: 'evt_tax',
    title: '税收改革辩论',
    category: '经济',
    description: '财政部提议改革税制：对高收入群体与大企业增税，用于补贴中低收入家庭。',
    once: true,
    options: [
      {
        id: 'a', label: '推动富人税改革',
        description: '劫富济贫',
        effects: { approval: 14, treasury: 14, economy: -6, prestige: 6 },
        newsTitle: '富人税改革法案通过',
        newsSummary: '中低收入家庭获补贴，财阀强烈抗议。',
        tone: 'positive',
      },
      {
        id: 'b', label: '维持现行税制',
        description: '不冒风险',
        effects: { approval: -2, treasury: 0, economy: 2 },
        newsTitle: '税改提案被搁置',
        newsSummary: '现状维持。',
      },
      {
        id: 'c', label: '减税刺激企业',
        description: '藏富于企',
        effects: { economy: 8, treasury: -10, approval: -4, prestige: -2 },
        newsTitle: '企业减税方案落地',
        newsSummary: '商界欢迎，但财政缺口扩大。',
      },
    ],
  },
  {
    id: 'evt_environment',
    title: '环保法案争议',
    category: '环境',
    description: '环保部门提出严苛的碳排放限制法案，要求重工业十年内减排 40%。',
    options: [
      {
        id: 'a', label: '通过严苛环保法案',
        description: '绿水青山',
        effects: { approval: 8, economy: -10, treasury: -4, prestige: 8, stability: -4 },
        newsTitle: '碳排放限制法案高票通过',
        newsSummary: '环保界欢呼，工业界警告失业潮。',
        tone: 'positive',
      },
      {
        id: 'b', label: '折中减排目标',
        description: '平衡环境与就业',
        effects: { approval: 4, economy: -2, prestige: 4 },
        newsTitle: '减排目标调整为二十年',
        newsSummary: '各方勉强接受的妥协方案。',
      },
      {
        id: 'c', label: '否决法案，优先发展',
        description: '经济优先',
        effects: { economy: 6, approval: -8, prestige: -6, stability: 2 },
        newsTitle: '环保法案遭否决',
        newsSummary: '工业界松气，环保人士抗议。',
      },
    ],
  },
  {
    id: 'evt_immigration',
    title: '移民政策之争',
    category: '社会',
    description: '邻国动荡导致大批难民涌向我国边境。',
    options: [
      {
        id: 'a', label: '开放边境，接纳难民',
        description: '人道优先',
        effects: { approval: -8, stability: -8, diplomacy: 10, prestige: 8 },
        newsTitle: '我国开放边境接纳难民',
        newsSummary: '国际社会赞誉，国内承载力告急。',
      },
      {
        id: 'b', label: '配额接收，严格审查',
        description: '理性平衡',
        effects: { approval: 2, stability: -2, diplomacy: 6, prestige: 4 },
        newsTitle: '移民配额制正式实施',
        newsSummary: '有限接收，严格审查背景。',
        tone: 'positive',
      },
      {
        id: 'c', label: '关闭边境，遣返难民',
        description: '本国优先',
        effects: { approval: 8, stability: 4, diplomacy: -12, prestige: -6 },
        newsTitle: '边境关闭，难民被遣返',
        newsSummary: '国内民众支持，国际舆论谴责。',
      },
    ],
  },
  {
    id: 'evt_infrastructure',
    title: '高铁网络扩建提案',
    category: '经济',
    description: '交通部提议投资建设贯通全国的高铁网络。',
    minTurn: 5,
    once: true,
    options: [
      {
        id: 'a', label: '批准全面扩建',
        description: '百年大计',
        effects: { economy: 12, approval: 8, treasury: -18, stability: 4, prestige: 10 },
        newsTitle: '高铁扩建工程动工',
        newsSummary: '沿线城市地价飙升，就业岗位激增。',
        tone: 'positive',
      },
      {
        id: 'b', label: '分期建设，优先干线',
        description: '量力而行',
        effects: { economy: 6, approval: 4, treasury: -8, prestige: 4 },
        newsTitle: '高铁干线先行启动',
        newsSummary: '分期方案稳健推进。',
      },
      {
        id: 'c', label: '暂缓，优先维护既有线路',
        description: '保守稳妥',
        effects: { economy: -2, treasury: 4, approval: -2, prestige: -4 },
        newsTitle: '高铁计划暂缓',
        newsSummary: '既有线路获维护，新线搁置。',
      },
    ],
  },
  {
    id: 'evt_military',
    title: '军费预算争议',
    category: '军事',
    description: '国防部要求将军费提升至 GDP 的 3%，财政部长警告将挤占民生支出。',
    options: [
      {
        id: 'a', label: '大幅增加军费',
        description: '强军兴武',
        effects: { stability: 6, diplomacy: -4, treasury: -12, prestige: 6, economy: -4 },
        newsTitle: '军费预算创历史新高',
        newsSummary: '新型战舰下水，邻国密切关注。',
      },
      {
        id: 'b', label: '适度增加，平衡民生',
        description: '中庸之道',
        effects: { stability: 2, treasury: -4, prestige: 2 },
        newsTitle: '军费温和增长',
        newsSummary: '军方略有不满。',
        tone: 'positive',
      },
      {
        id: 'c', label: '冻结军费，投入民生',
        description: '民生优先',
        effects: { approval: 6, treasury: 4, stability: -4, diplomacy: -6, prestige: -4 },
        newsTitle: '军费冻结，资金转向民生',
        newsSummary: '民众欢迎，军方强烈不满。',
      },
    ],
  },
  {
    id: 'evt_pension',
    title: '养老金制度危机',
    category: '社会',
    description: '人口老龄化加速，养老金账户连续三年赤字。',
    minTurn: 6,
    options: [
      {
        id: 'a', label: '推迟退休年龄',
        description: '治本但遭反对',
        effects: { treasury: 10, approval: -12, stability: -6, economy: 4 },
        newsTitle: '退休年龄将逐步推迟',
        newsSummary: '财政缓解，但老年群体抗议不断。',
      },
      {
        id: 'b', label: '提高缴费比例',
        description: '在职者负担加重',
        effects: { treasury: 8, approval: -8, economy: -4, stability: -2 },
        newsTitle: '养老金缴费比例上调',
        newsSummary: '在职者怨言增多。',
      },
      {
        id: 'c', label: '财政兜底补贴',
        description: '拖延问题',
        effects: { approval: 6, treasury: -14, stability: 2 },
        newsTitle: '财政拨款填补养老金缺口',
        newsSummary: '老年人安心，但财政压力加剧。',
      },
    ],
  },
  {
    id: 'evt_tech',
    title: '科技创新投资机遇',
    category: '经济',
    description: '一批本土科技企业在人工智能与芯片领域取得突破，寻求国家战略投资。',
    minTurn: 4,
    options: [
      {
        id: 'a', label: '设立国家科技基金重金投入',
        description: '押注未来',
        effects: { economy: 10, treasury: -14, prestige: 10, approval: 4 },
        newsTitle: '国家科技基金正式成立',
        newsSummary: '科技界振奋，资本市场追捧。',
        tone: 'positive',
        chainId: 'evt_tech_boom', chainDelay: 6,
      },
      {
        id: 'b', label: '提供税收优惠，市场主导',
        description: '四两拨千斤',
        effects: { economy: 6, treasury: -4, prestige: 4 },
        newsTitle: '科技企业税收优惠出台',
        newsSummary: '政策温和，企业自主发展。',
      },
      {
        id: 'c', label: '观望，鼓励外资合作',
        description: '借力发展',
        effects: { economy: 2, diplomacy: 4, prestige: -2, treasury: 2 },
        newsTitle: '政府鼓励中外科技合作',
        newsSummary: '外资进入，本土企业喜忧参半。',
      },
    ],
  },

  // ===== 事件链：科技投资 → 科技繁荣 → 科技霸权或泡沫 =====
  {
    id: 'evt_tech_boom',
    title: '科技产业大爆发',
    category: '经济',
    triggeredBy: { eventId: 'evt_tech', optionId: 'a' },
    description:
      '国家科技基金投入见效，本土企业在人工智能、量子计算等领域取得重大突破。国际资本涌入，科技园区遍地开花。但传统产业受到冲击，结构性失业问题浮现。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '继续加码，打造科技强国',
        description: '乘胜追击',
        effects: { economy: 12, treasury: -10, prestige: 12, approval: 4 },
        newsTitle: '科技产业持续高歌猛进',
        newsSummary: '多项核心技术突破，国际竞争力大幅提升。',
        tone: 'positive',
        chainId: 'evt_tech_hegemony', chainDelay: 8,
      },
      {
        id: 'b', label: '转向扶持传统产业，平衡发展',
        description: '结构转型',
        effects: { economy: 4, approval: 6, treasury: -6, stability: 4 },
        newsTitle: '政府出台传统产业扶持政策',
        newsSummary: '传统制造业获喘息之机，就业压力缓解。',
      },
      {
        id: 'c', label: '收紧监管，防范科技泡沫',
        description: '未雨绸缪',
        effects: { economy: -4, treasury: 4, stability: 4, prestige: -4 },
        newsTitle: '政府加强科技行业监管',
        newsSummary: '科技股回调，但系统性风险降低。',
      },
    ],
  },
  {
    id: 'evt_tech_hegemony',
    title: '科技霸权之争',
    category: '外交',
    triggeredBy: { eventId: 'evt_tech_boom', optionId: 'a' },
    description:
      '我国科技实力跃居世界前列，但这也引发了大国的警惕。技术封锁、人才争夺、标准制定权成为新的战场。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '自主研发，突破封锁',
        description: '科技自立',
        effects: { economy: 8, treasury: -8, prestige: 10, diplomacy: -6 },
        newsTitle: '核心技术全面自主化',
        newsSummary: '封锁反而加速了自主创新的步伐。',
        tone: 'positive',
      },
      {
        id: 'b', label: '主动开放，共享技术成果',
        description: '科技外交',
        effects: { diplomacy: 12, prestige: 8, economy: 4, treasury: -4 },
        newsTitle: '总理宣布技术共享计划',
        newsSummary: '多国受益，国际影响力大增。',
        tone: 'positive',
      },
    ],
  },

  // ===== 事件链：教育改革 → 人才红利 → 社会变革 =====
  {
    id: 'evt_education_chain',
    title: '教育公平之争',
    category: '社会',
    description:
      '城乡教育资源差距扩大，农村学生升学率持续走低。教育公平成为社会热议话题。',
    minTurn: 8,
    options: [
      {
        id: 'a', label: '推行教育资源均衡化政策',
        description: '大力投入农村教育',
        effects: { approval: 8, treasury: -10, stability: 4, prestige: 6 },
        newsTitle: '教育资源均衡化方案出台',
        newsSummary: '农村学校获大量资金与师资支持。',
        tone: 'positive',
        chainId: 'evt_talent_dividend', chainDelay: 8,
      },
      {
        id: 'b', label: '维持现状，鼓励民间办学',
        description: '市场化解决',
        effects: { treasury: 2, approval: -4, economy: 2 },
        newsTitle: '政府鼓励民间资本进入教育领域',
        newsSummary: '私立学校蓬勃发展，但学费水涨船高。',
      },
    ],
  },
  {
    id: 'evt_talent_dividend',
    title: '人才红利初现',
    category: '经济',
    triggeredBy: { eventId: 'evt_education_chain', optionId: 'a' },
    description:
      '教育均衡化政策实施多年后，农村出身的高素质人才大量涌现。创新创业活力增强，社会流动性提升。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '继续深化教育改革',
        description: '扩大成果',
        effects: { economy: 10, approval: 6, treasury: -6, prestige: 8 },
        newsTitle: '教育改革成果丰硕',
        newsSummary: '人才辈出，创新活力充沛。',
        tone: 'positive',
      },
      {
        id: 'b', label: '转向职业技能培训',
        description: '实用主义',
        effects: { economy: 6, approval: 4, treasury: -4 },
        newsTitle: '职业技能培训体系升级',
        newsSummary: '技术工人队伍壮大，制造业竞争力提升。',
      },
    ],
  },

  // ===== 事件链：环保争议 → 气候灾难/绿色转型 =====
  {
    id: 'evt_environment_chain',
    title: '严重雾霾袭击首都',
    category: '环境',
    description:
      '连续一周的严重雾霾笼罩首都，空气质量指数爆表。医院呼吸道疾病患者激增，民众戴口罩出行成为常态。',
    minTurn: 6,
    options: [
      {
        id: 'a', label: '紧急关停污染企业，铁腕治霾',
        description: '短期阵痛换蓝天',
        effects: { approval: 8, economy: -8, treasury: -4, stability: -2, prestige: 6 },
        newsTitle: '总理下令铁腕治霾',
        newsSummary: '数百家污染企业被关停，空气质量开始好转。',
        chainId: 'evt_green_transition', chainDelay: 5,
      },
      {
        id: 'b', label: '渐进治理，给企业转型时间',
        description: '平衡经济与环保',
        effects: { approval: -2, economy: 2, prestige: -2 },
        newsTitle: '政府出台渐进式治霾方案',
        newsSummary: '企业获得缓冲期，但雾霾问题未解。',
      },
      {
        id: 'c', label: '淡化处理，强调发展中问题',
        description: '发展优先',
        effects: { economy: 4, approval: -6, prestige: -4 },
        newsTitle: '政府回应雾霾：发展中的问题',
        newsSummary: '民众对官方说辞不买账。',
      },
    ],
  },
  {
    id: 'evt_green_transition',
    title: '绿色转型阵痛',
    category: '环境',
    triggeredBy: { eventId: 'evt_environment_chain', optionId: 'a' },
    description:
      '铁腕治霾后，大量传统工业企业面临关停或转型。数十万工人需要再就业，地方财政收入锐减。但空气质量明显改善。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '加大绿色产业投资，创造新就业',
        description: '凤凰涅槃',
        effects: { economy: 6, treasury: -8, approval: 6, prestige: 8 },
        newsTitle: '绿色产业投资计划启动',
        newsSummary: '新能源、环保产业吸纳大量就业。',
        tone: 'positive',
        chainId: 'evt_green_success', chainDelay: 6,
      },
      {
        id: 'b', label: '放缓关停步伐，给企业更多时间',
        description: '务实调整',
        effects: { economy: 2, approval: 2, treasury: 2 },
        newsTitle: '政府调整治霾节奏',
        newsSummary: '关停速度放缓，企业获得喘息。',
      },
    ],
  },
  {
    id: 'evt_green_success',
    title: '绿色发展典范',
    category: '环境',
    triggeredBy: { eventId: 'evt_green_transition', optionId: 'a' },
    description:
      '多年绿色转型成效显著，首都空气质量优良天数创历史新高。新能源产业成为新的经济增长点，国际社会的赞誉纷至沓来。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '申办国际气候大会',
        description: '引领全球治理',
        effects: { diplomacy: 12, prestige: 10, treasury: -4, approval: 6 },
        newsTitle: '我国成功申办国际气候大会',
        newsSummary: '绿色转型成果获国际认可。',
        tone: 'positive',
      },
      {
        id: 'b', label: '输出绿色技术，拓展外交空间',
        description: '技术外交',
        effects: { diplomacy: 8, economy: 6, prestige: 6 },
        newsTitle: '绿色技术出口成为新名片',
        newsSummary: '清洁能源技术走向多国。',
        tone: 'positive',
      },
    ],
  },

  // ===== 事件链：反腐 → 政治清洗/制度建设 =====
  {
    id: 'evt_anti_corruption',
    title: '重大贪腐案曝光',
    category: '突发',
    description:
      '检察机关公布了一起涉及多名高级官员的重大贪腐案件。涉案金额巨大，牵涉面广，震动朝野。',
    minTurn: 4,
    options: [
      {
        id: 'a', label: '一查到底，绝不姑息',
        description: '铁腕反腐',
        effects: { approval: 12, prestige: 8, stability: -4, treasury: 4 },
        newsTitle: '总理下令彻查贪腐案',
        newsSummary: '多名高官落马，民众拍手称快。',
        tone: 'positive',
        chainId: 'evt_corruption_network', chainDelay: 4,
      },
      {
        id: 'b', label: '有限调查，控制影响范围',
        description: '稳妥处理',
        effects: { approval: -4, prestige: -4, stability: 2 },
        newsTitle: '贪腐案调查范围受限',
        newsSummary: '舆论质疑政府反腐决心。',
      },
    ],
  },
  {
    id: 'evt_corruption_network',
    title: '腐败网络浮出水面',
    category: '突发',
    triggeredBy: { eventId: 'evt_anti_corruption', optionId: 'a' },
    description:
      '随着调查深入，一个盘根错节的腐败网络逐渐浮出水面。涉案人员遍及政商两界，甚至有您的政治盟友牵涉其中。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '继续深挖，建立长效反腐机制',
        description: '制度反腐',
        effects: { approval: 8, prestige: 10, stability: -6, treasury: -4 },
        newsTitle: '反腐制度体系建设启动',
        newsSummary: '阳光法案出台，官员财产公开制度试点。',
        tone: 'positive',
        chainId: 'evt_institutional_reform', chainDelay: 6,
      },
      {
        id: 'b', label: '适可而止，避免政治动荡',
        description: '见好就收',
        effects: { stability: 4, prestige: -6, approval: -4 },
        newsTitle: '反腐调查宣布阶段性结束',
        newsSummary: '部分涉案人员逃脱追责，舆论不满。',
      },
    ],
  },
  {
    id: 'evt_institutional_reform',
    title: '制度改革深化',
    category: '政治体制',
    triggeredBy: { eventId: 'evt_corruption_network', optionId: 'a' },
    description:
      '反腐运动推动了深层制度改革。权力运行更加透明，但既得利益集团的反弹也在加剧。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '推动全面制度改革',
        description: '重塑政治生态',
        effects: { approval: 6, prestige: 12, stability: -4, economy: 4 },
        newsTitle: '全面制度改革方案公布',
        newsSummary: '权力监督体系进一步完善。',
        tone: 'positive',
      },
      {
        id: 'b', label: '巩固成果，稳步推进',
        description: '渐进改革',
        effects: { approval: 4, prestige: 6, stability: 2 },
        newsTitle: '制度改革稳步推进',
        newsSummary: '反腐成果制度化，政治生态改善。',
        tone: 'positive',
      },
    ],
  },

  // ===== 突发事件：自然灾害链 =====
  {
    id: 'evt_earthquake',
    title: '强烈地震袭击',
    category: '突发',
    description:
      ' Richter 7.8 级强烈地震袭击中部地区，大量建筑倒塌，道路中断，通信瘫痪。初步估计伤亡惨重。',
    minTurn: 5,
    options: [
      {
        id: 'a', label: '启动最高级别应急响应',
        description: '举国救灾',
        effects: { approval: 10, treasury: -12, stability: 4, prestige: 8 },
        newsTitle: '全国动员抗震救灾',
        newsSummary: '军队、医疗队火速驰援，物资空运到位。',
        tone: 'positive',
        chainId: 'evt_reconstruction', chainDelay: 4,
      },
      {
        id: 'b', label: '请求国际援助',
        description: '借助外力',
        effects: { approval: 4, treasury: -4, diplomacy: 6, prestige: -4 },
        newsTitle: '政府接受国际救援援助',
        newsSummary: '多国救援队抵达，物资陆续到位。',
      },
    ],
  },
  {
    id: 'evt_reconstruction',
    title: '灾后重建',
    category: '社会',
    triggeredBy: { eventId: 'evt_earthquake', optionId: 'a' },
    description:
      '紧急救援阶段结束，灾后重建提上日程。灾区民众期盼早日重建家园，但资金缺口巨大。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '高标准重建，打造韧性城市',
        description: '百年大计',
        effects: { economy: 8, treasury: -14, approval: 8, prestige: 6 },
        newsTitle: '灾后高标准重建启动',
        newsSummary: '新建筑抗震标准大幅提升，灾区面貌一新。',
        tone: 'positive',
      },
      {
        id: 'b', label: '快速重建，优先恢复基本生活',
        description: '效率优先',
        effects: { economy: 4, treasury: -6, approval: 4 },
        newsTitle: '灾后快速重建推进',
        newsSummary: '临时安置点转为永久住房。',
      },
    ],
  },

  // ===== 突发事件：金融危机 =====
  {
    id: 'evt_financial_crisis',
    title: '金融市场剧烈震荡',
    category: '经济',
    description:
      '股市连续暴跌，多家金融机构面临流动性危机。投资者恐慌情绪蔓延，资本外流加速。',
    minTurn: 10,
    options: [
      {
        id: 'a', label: '注入流动性，稳定市场',
        description: '救市',
        effects: { economy: 6, treasury: -10, approval: 4, stability: 2 },
        newsTitle: '央行紧急注入流动性',
        newsSummary: '市场恐慌情绪暂时缓解。',
        chainId: 'evt_market_recovery', chainDelay: 4,
      },
      {
        id: 'b', label: '严格管控资本外流',
        description: '非常手段',
        effects: { economy: -4, treasury: 2, approval: -4, stability: -2 },
        newsTitle: '政府实施资本管制',
        newsSummary: '资本外流放缓，但外资信心受挫。',
      },
      {
        id: 'c', label: '不干预，让市场自我修复',
        description: '自由市场',
        effects: { economy: -8, approval: -8, prestige: -4 },
        newsTitle: '政府宣布不干预市场',
        newsSummary: '股市继续下探，民众积蓄缩水。',
      },
    ],
  },
  {
    id: 'evt_market_recovery',
    title: '市场信心重建',
    category: '经济',
    triggeredBy: { eventId: 'evt_financial_crisis', optionId: 'a' },
    description:
      '救市措施逐步见效，股市企稳回升。但金融监管的讨论成为焦点，各方对改革方向意见不一。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '加强金融监管，防范系统性风险',
        description: '亡羊补牢',
        effects: { economy: 2, treasury: 4, stability: 4, prestige: 4 },
        newsTitle: '金融监管改革方案出台',
        newsSummary: '系统性风险防控机制建立。',
        tone: 'positive',
      },
      {
        id: 'b', label: '放松管制，激发市场活力',
        description: '回归自由',
        effects: { economy: 6, treasury: -2, stability: -4 },
        newsTitle: '金融管制放松',
        newsSummary: '市场活跃度提升，但风险也在积累。',
      },
    ],
  },

  // ===== 突发事件：公共卫生 =====
  {
    id: 'evt_pandemic',
    title: '新型传染病暴发',
    category: '突发',
    description:
      '一种新型传染病在多省同时暴发，传播速度快，重症率高。医疗系统面临巨大压力，民众恐慌情绪蔓延。',
    minTurn: 8,
    options: [
      {
        id: 'a', label: '全面封控，严格隔离',
        description: '铁腕防疫',
        effects: { approval: 4, economy: -12, stability: 4, treasury: -8 },
        newsTitle: '全国启动最高级别防疫响应',
        newsSummary: '严格封控措施实施，疫情传播速度放缓。',
        chainId: 'evt_post_pandemic', chainDelay: 5,
      },
      {
        id: 'b', label: '精准防控，保障经济运行',
        description: '平衡防疫与发展',
        effects: { approval: 6, economy: -4, stability: 2, treasury: -4 },
        newsTitle: '精准防控方案实施',
        newsSummary: '重点区域严格管控，其他地区正常运作。',
      },
      {
        id: 'c', label: '群体免疫，放开管控',
        description: '与病毒共存',
        effects: { approval: -8, economy: -2, stability: -6, treasury: -2 },
        newsTitle: '政府宣布放开管控',
        newsSummary: '医疗系统承压，民众不安。',
      },
    ],
  },
  {
    id: 'evt_post_pandemic',
    title: '疫情后的复苏',
    category: '社会',
    triggeredBy: { eventId: 'evt_pandemic', optionId: 'a' },
    description:
      '疫情得到控制后，经济复苏成为首要任务。企业倒闭、失业增加、财政吃紧，重建工作任重道远。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '大规模经济刺激计划',
        description: '强力复苏',
        effects: { economy: 12, treasury: -12, approval: 8 },
        newsTitle: '疫后经济刺激计划出台',
        newsSummary: '消费回暖，就业逐步恢复。',
        tone: 'positive',
      },
      {
        id: 'b', label: '稳健复苏，控制债务',
        description: '量力而行',
        effects: { economy: 6, treasury: -4, approval: 4 },
        newsTitle: '经济稳健复苏推进',
        newsSummary: '增长温和但可持续。',
      },
    ],
  },

  // ===== 道德两难事件 + 匿名泄密事件 =====
  ...MORAL_DILEMMAS,
  ...LEAK_EVENTS,

  // ===== 总理个人生活事件（家庭 / 健康 / 黑金 / 压力）=====
  ...PERSONAL_EVENTS,

  // ===== 跨系统联动事件（读取世界状态：失业率/军费/战争/法律/腐败等）=====
  ...CROSS_SYSTEM_EVENTS,

  // ===== 新增事件：跨模块联动 + 延迟后果 =====

  // 跨模块：军事演习 → 外交摩擦（延迟后果）
  {
    id: 'evt_joint_drill',
    title: '联合军事演习邀请',
    category: '军事',
    description:
      '盟国发来联合军演邀请，规模为近年之最。军方认为这是展示军威、深化同盟的良机，但外交部警告可能刺激邻国。',
    minTurn: 4,
    options: [
      {
        id: 'a', label: '高调参与，展示军威',
        description: '强化同盟，但可能引发邻国反弹',
        effects: { prestige: 6, diplomacy: -4, stability: 2 },
        newsTitle: '总理宣布参与大规模联合军演',
        newsSummary: '军旗飘扬，盟国欢呼，但邻国召见大使表达"严重关切"。',
        tone: 'neutral',
        // 立即联动：所有邻国关系下降
        countryEffects: [{ targetNeighbors: true, relationDelta: -6 }],
        // 延迟后果：邻国在 60 天后发动外交报复（激活 addDelayedConsequence）
        delayedConsequence: {
          delayDays: 60,
          title: '邻国外交报复',
          description: '联合军演后，邻国宣布暂停双边贸易谈判，并对我国部分商品加征关税。',
          effects: { diplomacy: -6, economy: -5, treasury: -4 },
          newsTitle: '邻国就军演实施贸易报复',
          newsSummary: '关税壁垒骤起，出口企业叫苦不迭。',
          // 延迟联动：邻国关系进一步恶化并暂停贸易
          countryEffects: [
            { targetNeighbors: true, relationDelta: -8, liftTradeAgreement: true },
          ],
        },
      },
      {
        id: 'b', label: '低调参与，控制规模',
        description: '兼顾同盟与邻国感受',
        effects: { prestige: 2, diplomacy: 1 },
        newsTitle: '总理决定小幅参与军演',
        newsSummary: '克制姿态赢得外交空间，各方反应平淡。',
        tone: 'positive',
      },
      {
        id: 'c', label: '婉拒邀请',
        description: '避免刺激邻国，但冷落盟友',
        effects: { diplomacy: 3, prestige: -4, stability: -1 },
        newsTitle: '总理婉拒联合军演邀请',
        newsSummary: '邻国松一口气，盟国表示"遗憾"。',
        tone: 'neutral',
      },
    ],
  },

  // 跨模块：科技出口 → 外交+经济连锁
  {
    id: 'evt_tech_export',
    title: '关键技术出口争议',
    category: '外交',
    description:
      '本土企业研发的先进芯片技术收到海外大额订单，但其中一国与我国关系紧张。出口可获丰厚利润，但技术外流风险堪忧。',
    minTurn: 6,
    options: [
      {
        id: 'a', label: '批准全部出口',
        description: '赚取外汇，但技术可能被逆向',
        effects: { treasury: 8, economy: 5, diplomacy: -3 },
        newsTitle: '总理批准关键技术出口',
        newsSummary: '企业股价大涨，但安全部门发出警告。',
        tone: 'neutral',
        // 延迟后果：技术外流 90 天后引发产业竞争
        delayedConsequence: {
          delayDays: 90,
          title: '技术外流反噬',
          description: '进口国利用逆向技术推出竞品，我国相关产业遭受冲击。',
          effects: { economy: -7, prestige: -3, treasury: -3 },
          newsTitle: '技术外流引发产业竞争',
          newsSummary: '昔日客户今日对手，本土企业市场份额下滑。',
        },
      },
      {
        id: 'b', label: '仅出口至友好国家',
        description: '平衡利益与安全',
        effects: { treasury: 4, economy: 3, diplomacy: 2 },
        newsTitle: '总理限定技术出口对象',
        newsSummary: '选择性出口既保利润又控风险。',
        tone: 'positive',
      },
      {
        id: 'c', label: '全面禁止出口',
        description: '保护技术，但损失订单',
        effects: { economy: -4, prestige: 4, diplomacy: -2 },
        newsTitle: '总理下令禁止关键技术出口',
        newsSummary: '安全界赞赏，商界抗议。',
        tone: 'neutral',
      },
    ],
  },

  // 跨模块：能源危机 → 经济+社会+环境连锁（事件链）
  {
    id: 'evt_energy_crisis',
    title: '国际能源价格飙升',
    category: '经济',
    description:
      '国际油价一周内翻倍，国内成品油供应紧张，加油站排起长龙。财政补贴压力骤增，民众不满情绪上升。',
    minTurn: 5,
    options: [
      {
        id: 'a', label: '动用战略储备压价',
        description: '短期缓解，但储备耗尽后更被动',
        effects: { treasury: -8, economy: 2, approval: 4, stability: 2 },
        newsTitle: '总理下令动用战略石油储备',
        newsSummary: '油价回落，民众安心，但储备亮起红灯。',
        tone: 'positive',
        chainId: 'evt_energy_transition', chainDelay: 4,
      },
      {
        id: 'b', label: '大幅涨价，市场调节',
        description: '维护财政，但激化民意',
        effects: { economy: -6, approval: -10, stability: -5, treasury: 3 },
        newsTitle: '成品油价格大幅上调',
        newsSummary: '物流成本攀升，物价上涨预期强烈。',
        tone: 'negative',
        // 延迟后果：30 天后爆发抗议
        delayedConsequence: {
          delayDays: 30,
          title: '油价引发抗议',
          description: '油价上涨传导至物价，民众发起"反涨价"游行。',
          effects: { stability: -7, approval: -4, prestige: -3 },
          newsTitle: '反涨价游行席卷多城',
          newsSummary: '民众高呼"买不起"，反对党借势施压。',
        },
      },
      {
        id: 'c', label: '补贴+限价双管齐下',
        description: '财政承压，但稳住民生',
        effects: { treasury: -12, approval: 6, economy: -2, stability: 3 },
        newsTitle: '总理推出油价补贴与限价令',
        newsSummary: '民众欢呼，财政部愁眉不展。',
        tone: 'positive',
      },
    ],
  },
  // 能源危机事件链：能源转型压力
  {
    id: 'evt_energy_transition',
    title: '能源转型压力',
    category: '环境',
    triggeredBy: { eventId: 'evt_energy_crisis', optionId: 'a' },
    description:
      '战略储备消耗过半后，能源转型呼声高涨。环保团体推动可再生能源立法，传统能源企业则游说反对。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '加速可再生能源立法',
        description: '长期利好环境，短期冲击传统能源就业',
        effects: { economy: -3, approval: 4, prestige: 5, stability: 2 },
        newsTitle: '总理签署可再生能源加速法案',
        newsSummary: '风电光伏项目遍地开花，煤矿工人面临转岗。',
        tone: 'positive',
      },
      {
        id: 'b', label: '维持现状，逐步过渡',
        description: '稳妥但缓不济急',
        effects: { economy: 1, approval: 1 },
        newsTitle: '总理选择能源渐进转型',
        newsSummary: '各方勉强接受，环保团体表示失望。',
        tone: 'neutral',
      },
    ],
  },

  // 跨模块：社会抗议 → 议会质询（事件链）
  {
    id: 'evt_protest_wave',
    title: '多行业联合抗议',
    category: '社会',
    description:
      '教师、医护、卡车司机三大群体同时发起抗议，诉求涉及薪资、工时、油价。规模罕见，舆论沸腾。',
    minTurn: 7,
    options: [
      {
        id: 'a', label: '全面让步，满足诉求',
        description: '平息民愤，但财政与权威受损',
        effects: { approval: 8, treasury: -10, stability: 4, prestige: -3 },
        newsTitle: '总理宣布全面满足抗议诉求',
        newsSummary: '抗议人群散去，反对党批评"慷国库之慨"。',
        tone: 'positive',
      },
      {
        id: 'b', label: '强硬清场',
        description: '维护秩序，但激化矛盾',
        effects: { approval: -12, stability: -8, prestige: 3 },
        newsTitle: '执法部门强行清场抗议',
        newsSummary: '冲突画面传遍网络，国际社会表达关切。',
        tone: 'negative',
        chainId: 'evt_parliament_inquiry', chainDelay: 3,
      },
      {
        id: 'c', label: '分区谈判，分而治之',
        description: '拆解联盟，逐个击破',
        effects: { approval: 2, stability: 2, prestige: 4, treasury: -4 },
        newsTitle: '总理分批与抗议代表谈判',
        newsSummary: '联盟出现裂痕，抗议逐渐平息。',
        tone: 'neutral',
      },
    ],
  },
  // 抗议事件链：议会成立调查委员会
  {
    id: 'evt_parliament_inquiry',
    title: '议会成立清场调查委员会',
    category: '政治体制',
    triggeredBy: { eventId: 'evt_protest_wave', optionId: 'b' },
    description:
      '强硬清场引发舆论哗然，议会跨党派议员联名成立调查委员会，要求总理出席听证。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '积极配合，出席听证',
        description: '展现担当，但可能被质询失分',
        effects: { prestige: 3, stability: 2, approval: 2 },
        newsTitle: '总理出席议会调查听证',
        newsSummary: '总理直面质询，姿态稳健。',
        tone: 'positive',
      },
      {
        id: 'b', label: '拒绝出席，援引行政特权',
        description: '避免失分，但激化宪政争议',
        effects: { prestige: -2, stability: -4, approval: -3 },
        newsTitle: '总理拒绝出席议会听证',
        newsSummary: '宪政危机隐现，反对党酝酿弹劾。',
        tone: 'negative',
      },
    ],
  },

  // 跨模块：外交照会 → 军事紧张（延迟后果）
  {
    id: 'evt_border_incident',
    title: '边境武装冲突事件',
    category: '军事',
    description:
      '边境哨所报告与邻国发生短暂交火，双方各有伤亡。军方要求增兵，外交部主张降温。',
    minTurn: 8,
    options: [
      {
        id: 'a', label: '增兵边境，强硬对峙',
        description: '展示决心，但可能升级冲突',
        effects: { prestige: 4, diplomacy: -8, treasury: -5, stability: -2 },
        newsTitle: '总理下令增兵边境',
        newsSummary: '军列昼夜北运，邻国宣布进入高度戒备。',
        tone: 'neutral',
        // 立即联动：所有邻国关系重挫
        countryEffects: [{ targetNeighbors: true, relationDelta: -12 }],
        // 延迟后果：45 天后邻国发动经济制裁
        delayedConsequence: {
          delayDays: 45,
          title: '邻国经济制裁',
          description: '邻国宣布冻结我国资产、限制签证，并联合其盟国实施贸易制裁。',
          effects: { diplomacy: -7, economy: -6, treasury: -5, prestige: -3 },
          newsTitle: '邻国联合盟友实施制裁',
          newsSummary: '外交孤立加剧，出口与外资双降。',
          // 延迟联动：邻国关系降至敌对并启动制裁状态
          countryEffects: [
            { targetNeighbors: true, relationDelta: -15, setSanctioned: true, liftTradeAgreement: true },
          ],
        },
      },
      {
        id: 'b', label: '提议联合调查，降温处理',
        description: '避免升级，但被批软弱',
        effects: { diplomacy: 3, prestige: -3, stability: 1 },
        newsTitle: '总理提议联合调查边境事件',
        newsSummary: '邻国接受提议，军方表示不满。',
        tone: 'positive',
        // 联动：邻国关系小幅改善
        countryEffects: [{ targetNeighbors: true, relationDelta: 5 }],
      },
      {
        id: 'c', label: '诉诸国际组织仲裁',
        description: '引入外部调解',
        effects: { diplomacy: 1, prestige: 2, stability: -1 },
        newsTitle: '总理将边境事件诉诸国际仲裁',
        newsSummary: '国际组织受理，舆论转向法律途径。',
        tone: 'neutral',
        // 联动：邻国关系略缓，但非邻国观望
        countryEffects: [{ targetNeighbors: true, relationDelta: 2 }],
      },
    ],
  },

  // 新增：文化外交事件（外交+声望联动）
  {
    id: 'evt_cultural_diplomacy',
    title: '国际文化节邀请',
    category: '外交',
    description:
      '我国受邀主办年度国际文化节，这是展示软实力的良机。但筹备耗资不菲，且国内文化界对"政治化"艺术有所担忧。',
    minTurn: 3,
    options: [
      {
        id: 'a', label: '高规格承办',
        description: '提升声望，但财政支出大',
        effects: { prestige: 8, diplomacy: 5, treasury: -6, approval: 2 },
        newsTitle: '总理宣布高规格承办国际文化节',
        newsSummary: '万国旗帜飘扬，软实力登顶。',
        tone: 'positive',
      },
      {
        id: 'b', label: '简化承办',
        description: '兼顾影响与财政',
        effects: { prestige: 3, diplomacy: 2, treasury: -2 },
        newsTitle: '总理决定简化承办文化节',
        newsSummary: '务实姿态获好评。',
        tone: 'neutral',
      },
      {
        id: 'c', label: '婉拒承办',
        description: '省下财政，但错失良机',
        effects: { prestige: -3, treasury: 2 },
        newsTitle: '总理婉拒承办国际文化节',
        newsSummary: '他国接手承办，我国软实力受损。',
        tone: 'negative',
      },
    ],
  },

  // 新增：教育改革争议（社会+经济联动）
  {
    id: 'evt_education_reform',
    title: '高校学费调整争议',
    category: '社会',
    description:
      '教育部提出高校学费分层调整方案，理工科降费、文科涨费。学生群体强烈反对，企业界支持理工导向。',
    minTurn: 5,
    options: [
      {
        id: 'a', label: '推进原方案',
        description: '倾斜理工，但激化学生抗议',
        effects: { economy: 3, approval: -6, stability: -3, prestige: 2 },
        newsTitle: '总理推进高校学费分层方案',
        newsSummary: '理工降费文科涨费，学生示威持续。',
        tone: 'neutral',
      },
      {
        id: 'b', label: '全面降费',
        description: '顺应民意，但财政承压',
        effects: { approval: 7, treasury: -7, stability: 3 },
        newsTitle: '总理宣布全面降低高校学费',
        newsSummary: '学生欢呼，财政部忧心。',
        tone: 'positive',
      },
      {
        id: 'c', label: '撤回方案，维持现状',
        description: '回避争议，但失信于企业界',
        effects: { approval: 1, economy: -2, prestige: -2 },
        newsTitle: '总理撤回高校学费调整方案',
        newsSummary: '争议暂息，企业界表示失望。',
        tone: 'neutral',
      },
    ],
  },

  // ===== 事件链：食品安全 → 深查 → 整改 → 信心恢复 =====
  {
    id: 'evt_food_safety',
    title: '重大食品安全事故',
    category: '社会',
    description:
      '多地幼儿园与中小学学生集体出现腹泻、呕吐症状，溯源指向一家全国连锁的校园配餐企业。媒体曝光其车间卫生触目惊心：过期原料重新包装、操作员无健康证、清洗用水重复使用。家长群情激愤，社交平台涌现大量现场视频。',
    minTurn: 6,
    options: [
      {
        id: 'a', label: '彻查全行业，关停违规企业',
        description: '铁腕整治，短期供应链受冲击',
        effects: { approval: 12, treasury: -8, stability: 4, prestige: 6, economy: -4 },
        newsTitle: '总理下令彻查校园配餐行业',
        newsSummary: '多家违规企业被吊销执照，涉案人员被刑事拘留；部分学校被迫停餐改为家长自带。',
        tone: 'positive',
        chainId: 'evt_food_safety_reform', chainDelay: 4,
      },
      {
        id: 'b', label: '仅处罚涉事企业，控制影响',
        description: '稳妥处理，避免行业震荡',
        effects: { approval: -6, stability: -3, prestige: -2 },
        newsTitle: '涉事配餐企业被立案',
        newsSummary: '官方通报称"个别企业问题"，舆论质疑政府"避重就轻"。',
        tone: 'negative',
        chainId: 'evt_food_safety_leak', chainDelay: 5,
      },
      {
        id: 'c', label: '推给地方政府，中央不背锅',
        description: '甩锅地方，但损害中央权威',
        effects: { approval: -10, stability: -6, prestige: -8 },
        newsTitle: '政府发言人指地方监管失职',
        newsSummary: '地方政府反弹强烈，"谁的孩子谁抱走"成网络热词。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_food_safety_reform',
    title: '食品安全监管体系重塑',
    category: '社会',
    triggeredBy: { eventId: 'evt_food_safety', optionId: 'a' },
    description:
      '彻查风波后，政府成立跨部门食品安全委员会，推动《食品安全法》修订：建立全链条追溯、强制召回、举报重奖制度。但配套预算巨大，且部分地方官员因监管失职被追责，反弹暗流涌动。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '一次性投入，建成追溯体系',
        description: '长远治本，但财政承压',
        effects: { approval: 8, treasury: -14, prestige: 10, stability: 3 },
        newsTitle: '全国食品安全追溯平台正式上线',
        newsSummary: '每一份校园餐都可扫码查到田间地头；国际媒体赞为"发展中国家的监管范本"。',
        tone: 'positive',
        chainId: 'evt_food_safety_recovery', chainDelay: 6,
      },
      {
        id: 'b', label: '分省试点，逐步铺开',
        description: '稳健推进，但见效缓慢',
        effects: { approval: 4, treasury: -6, prestige: 4 },
        newsTitle: '食品安全追溯试点在五省启动',
        newsSummary: '试点省份家长欢迎，未试点地区家长焦虑"我们的孩子是不是二等公民"。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'evt_food_safety_leak',
    title: '匿名泄密：监管被指"放水"',
    category: '突发',
    triggeredBy: { eventId: 'evt_food_safety', optionId: 'b' },
    description:
      '一位前监管官员向媒体泄露内部文件，显示涉事企业早被列入"重点关注名单"，但因高层打招呼而长期免于检查。文件附有批示影印件，矛头直指某位副总理。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '公开调查副总理',
        description: '彰显反腐决心，但政治震荡',
        effects: { approval: 10, prestige: 6, stability: -6 },
        newsTitle: '副总理接受纪律审查',
        newsSummary: '高层震动，民众对反腐决心刮目相看；但党内也出现"过度追责"的暗流。',
        tone: 'positive',
      },
      {
        id: 'b', label: '否认文件真实性',
        description: '硬扛舆论，但公信力受损',
        effects: { approval: -12, prestige: -8, stability: -4 },
        newsTitle: '官方否认泄露文件真实性',
        newsSummary: '媒体公开原始扫描件对照，公信力进一步下滑。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_food_safety_recovery',
    title: '国产食品信心回暖',
    category: '经济',
    triggeredBy: { eventId: 'evt_food_safety_reform', optionId: 'a' },
    description:
      '追溯体系运行一年后成效显著：校园食物中毒事件下降 78%，国产食品出口检验合格率创历史新高。多国代表团前来考察，希望引进我国模式。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '输出监管模式，拓展外交空间',
        description: '软实力外交',
        effects: { diplomacy: 8, prestige: 8, economy: 4, treasury: 2 },
        newsTitle: '我国食品安全模式走向世界',
        newsSummary: '与十二个国家签署监管合作备忘录，"中国标准"首次成为区域参考。',
        tone: 'positive',
      },
      {
        id: 'b', label: '巩固内需，先稳住本国市场',
        description: '内循环优先',
        effects: { approval: 6, economy: 6, stability: 2 },
        newsTitle: '国产食品销量连续四月回升',
        newsSummary: '消费者信心指数跳升，进口替代效应明显。',
        tone: 'positive',
      },
    ],
  },

  // ===== 事件链：房地产泡沫 → 调控 → 软/硬着陆 =====
  {
    id: 'evt_property_bubble',
    title: '楼市高温预警',
    category: '经济',
    description:
      '一线城市房价同比上涨 38%，"千人摇号""茶水费""经营贷入市"等乱象频发。央行警告居民部门杠杆率已突破 72%，但地方政府依赖土地财政，对调控态度消极。',
    minTurn: 7,
    options: [
      {
        id: 'a', label: '出台最严调控，限购限贷',
        description: '强硬挤压泡沫，但短期经济承压',
        effects: { economy: -8, treasury: -6, approval: 6, stability: -3, prestige: 4 },
        newsTitle: '"史上最严"楼市调控组合拳出台',
        newsSummary: '限购、限贷、限售、限价四管齐下；炒房客连夜抛盘，多地中介关店。',
        tone: 'neutral',
        chainId: 'evt_property_cooling', chainDelay: 5,
      },
      {
        id: 'b', label: '温和警示，渐进收紧',
        description: '避免硬着陆，但泡沫仍在膨胀',
        effects: { economy: 4, treasury: 4, approval: -4, stability: 2 },
        newsTitle: '央行发文警示房地产金融风险',
        newsSummary: '措辞温和，市场理解为"绿灯信号"，房价继续攀升。',
        tone: 'negative',
        chainId: 'evt_property_burst', chainDelay: 6,
      },
      {
        id: 'c', label: '推动保障房大规模建设',
        description: '从源头治本，但财政吃紧',
        effects: { approval: 10, treasury: -16, stability: 4, economy: 2 },
        newsTitle: '总理宣布五年建设两千万套保障房',
        newsSummary: '年轻人与中低收入家庭欢呼，开发商忧心利润空间被压缩。',
        tone: 'positive',
        chainId: 'evt_property_cooling', chainDelay: 7,
      },
    ],
  },
  {
    id: 'evt_property_cooling',
    title: '楼市软着陆迹象',
    category: '经济',
    triggeredBy: { eventId: 'evt_property_bubble', optionId: 'a' },
    description:
      '调控一年后，房价涨幅回落至个位数，投机性需求大幅退潮。但土地财政塌方导致部分地方政府财政告急，公务员绩效工资推迟发放。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '加快地方财税体制改革',
        description: '长远治本，触动利益格局',
        effects: { economy: 4, prestige: 8, stability: -2, treasury: 2 },
        newsTitle: '地方财税体制改革方案落地',
        newsSummary: '房产税试点扩大，消费税后移，地方主体税种逐步成型。',
        tone: 'positive',
        chainId: 'evt_property_stable', chainDelay: 5,
      },
      {
        id: 'b', label: '临时中央转移支付救急',
        description: '短期止痛，但加剧中央财政压力',
        effects: { treasury: -12, stability: 4, approval: 2 },
        newsTitle: '中央下达地方转移支付紧急额度',
        newsSummary: '公务员补发工资，但分析师警告"治标不治本"。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'evt_property_burst',
    title: '楼市泡沫破裂',
    category: '经济',
    triggeredBy: { eventId: 'evt_property_bubble', optionId: 'b' },
    description:
      '温和调控未能遏制投机，外资突然撤离触发踩踏。多家头部房企美元债违约，烂尾楼业主集体停贷断供，银行不良率快速上升。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '保交楼优先，注入专项借款',
        description: '稳民生，但财政代价巨大',
        effects: { approval: 8, treasury: -18, stability: 4, economy: -4 },
        newsTitle: '总理宣布"保交楼"专项行动',
        newsSummary: '专项借款直达项目，烂尾工地重新响起塔吊声；购房者松一口气。',
        tone: 'positive',
        chainId: 'evt_property_stable', chainDelay: 6,
      },
      {
        id: 'b', label: '让市场出清，不救房企',
        description: '市场化原则，但短期冲击剧烈',
        effects: { economy: -12, stability: -8, approval: -10, treasury: 2 },
        newsTitle: '政府表态"不救市"，房企连环爆雷',
        newsSummary: '业界哗然，国际评级机构下调我国主权评级展望。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_property_stable',
    title: '楼市进入新常态',
    category: '经济',
    triggeredBy: { eventId: 'evt_property_cooling', optionId: 'a' },
    description:
      '历经阵痛后，房地产市场回归居住属性。租购并举、保障房与商品房双轨制初步成型，年轻人住房负担明显下降。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '巩固成果，扩大租赁市场',
        description: '长治久安',
        effects: { approval: 6, economy: 4, stability: 4, prestige: 4 },
        newsTitle: '"租购同权"全国落地',
        newsSummary: '租房家庭子女可就近入学，租客权益首次与业主实质对等。',
        tone: 'positive',
      },
      {
        id: 'b', label: '适度放松，托底经济',
        description: '平衡稳增长',
        effects: { economy: 6, approval: -2, treasury: 2 },
        newsTitle: '楼市政策边际放松',
        newsSummary: '改善型需求释放，房价温和回升；分析师警告"勿忘泡沫教训"。',
        tone: 'neutral',
      },
    ],
  },

  // ===== 事件链：老龄化危机 → 养老金压力 → 银发经济 =====
  {
    id: 'evt_aging_crisis',
    title: '人口老龄化警报',
    category: '社会',
    description:
      '最新人口普查数据公布：60 岁以上人口占比突破 28%，新生儿数量连续七年下降。劳动力红利消退，养老金账户承压，"未富先老"成为时代命题。',
    minTurn: 8,
    options: [
      {
        id: 'a', label: '全面放开生育并大额补贴',
        description: '激励生育，但财政长期承压',
        effects: { approval: 8, treasury: -14, stability: 3, prestige: 4 },
        newsTitle: '总理宣布全面放开生育限制',
        newsSummary: '0-3 岁托育免费、二孩三孩家庭购房利率七折、个人所得税大幅抵扣。',
        tone: 'positive',
        chainId: 'evt_aging_pension', chainDelay: 6,
      },
      {
        id: 'b', label: '渐进推迟退休年龄',
        description: '缓解养老压力，但反对强烈',
        effects: { treasury: 8, approval: -14, stability: -6, economy: 4 },
        newsTitle: '渐进式延迟退休方案公布',
        newsSummary: '每年推迟三个月，老工人抗议"白发人养白发人"。',
        tone: 'negative',
        chainId: 'evt_aging_pension', chainDelay: 4,
      },
      {
        id: 'c', label: '引进外籍劳工填补缺口',
        description: '开放移民，但社会摩擦大',
        effects: { economy: 6, diplomacy: 4, stability: -4, approval: -6 },
        newsTitle: '外籍劳工配额大幅提升',
        newsSummary: '制造业、建筑业用工缺口缓解，但本地工人抱怨"被抢饭碗"。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'evt_aging_pension',
    title: '养老金账户告急',
    category: '社会',
    triggeredBy: { eventId: 'evt_aging_crisis', optionId: 'b' },
    description:
      '延迟退休政策引发社会反弹之际，社保基金理事会报告：基本养老金当期缺口已扩大至 GDP 的 1.2%。如不彻底改革，五年内将耗尽结余。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '划转国资充实社保',
        description: '动用国资存量，长效但争议大',
        effects: { treasury: 10, approval: 8, prestige: 4, stability: 2 },
        newsTitle: '政府划转 10% 国有股权充实社保',
        newsSummary: '央企与地方国企股权划转启动，社保基金长期偿付能力显著增强。',
        tone: 'positive',
        chainId: 'evt_aging_silver', chainDelay: 5,
      },
      {
        id: 'b', label: '提高缴费率，在职者买单',
        description: '短期见效，但激化代际矛盾',
        effects: { treasury: 6, approval: -10, economy: -4, stability: -3 },
        newsTitle: '社保缴费率上调一个百分点',
        newsSummary: '年轻人到手工薪缩水，"养上一代还是养自己"成热搜话题。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_aging_silver',
    title: '银发经济崛起',
    category: '经济',
    triggeredBy: { eventId: 'evt_aging_pension', optionId: 'a' },
    description:
      '国资划转稳固了养老底盘，同时催生庞大的银发消费市场：康养小镇、适老化改造、智能陪伴机器人、长期护理保险等新业态爆发式增长。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '打造银发经济国家战略',
        description: '抢占蓝海市场',
        effects: { economy: 10, approval: 6, prestige: 6, treasury: 4 },
        newsTitle: '《银发经济国家战略》正式发布',
        newsSummary: '十大产业方向、千亿引导基金、适老化强制标准齐发；多国前来取经。',
        tone: 'positive',
      },
      {
        id: 'b', label: '重点保障基本服务，不追风',
        description: '稳健路线',
        effects: { approval: 4, treasury: -4, stability: 4 },
        newsTitle: '基本养老服务清单制度建立',
        newsSummary: '失能老人护理、社区食堂、上门医疗纳入政府兜底范围。',
        tone: 'positive',
      },
    ],
  },

  // ===== 事件链：网络攻击 → 归因 → 外交对峙 =====
  {
    id: 'evt_cyber_attack',
    title: '关键基础设施遭网络攻击',
    category: '军事',
    description:
      '清晨高峰时段，全国三大电网调度系统同时出现异常，部分城市地铁信号中断、医院备用电源切换失败。国家网络应急中心初步判定：这是国家级 APT 攻击，源头疑似某大国情报机构。',
    minTurn: 9,
    options: [
      {
        id: 'a', label: '公开归因，点名大国',
        description: '强硬透明，但外交关系破裂风险',
        effects: { prestige: 8, diplomacy: -10, stability: 2, treasury: -6 },
        newsTitle: '我国公开点名大国为网络攻击幕后黑手',
        newsSummary: '召见对方大使提交技术证据，国际社会高度关注；对方反咬"无端指控"。',
        tone: 'neutral',
        chainId: 'evt_cyber_attribution', chainDelay: 4,
        countryEffects: [{ targetAll: true, relationDelta: -6 }],
      },
      {
        id: 'b', label: '低调加固防御，不公开',
        description: '避免对抗，但被批软弱',
        effects: { treasury: -10, prestige: -4, stability: 4 },
        newsTitle: '国家网络安全升级工程悄然启动',
        newsSummary: '官方未透露攻击源，但电网与政务系统全面加固；舆论质疑"为什么不反击"。',
        tone: 'neutral',
        chainId: 'evt_cyber_attribution', chainDelay: 6,
      },
      {
        id: 'c', label: '反向渗透，对等反制',
        description: '以牙还牙，但可能升级冲突',
        effects: { prestige: 6, diplomacy: -8, stability: -2, treasury: -8 },
        newsTitle: '媒体曝我国对源国实施对等网络反制',
        newsSummary: '对方关键系统出现"技术故障"；双方默契未公开，但暗战升级。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'evt_cyber_attribution',
    title: '网络攻击归因争议',
    category: '外交',
    triggeredBy: { eventId: 'evt_cyber_attack', optionId: 'a' },
    description:
      '我国公开归因后，对方不仅否认，还联合其盟友发起"反向归因"，声称我国才是网络攻击的源头。国际舆论分裂，多国被迫选边站队。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '推动全球网络治理谈判',
        description: '化危为机，主导规则',
        effects: { diplomacy: 8, prestige: 10, treasury: -4 },
        newsTitle: '我国倡议"全球网络行为准则"',
        newsSummary: '联合国框架下六十余国响应，规则制定主导权向我国倾斜。',
        tone: 'positive',
        chainId: 'evt_cyber_peace', chainDelay: 5,
      },
      {
        id: 'b', label: '驱逐对方情报人员',
        description: '强硬升级',
        effects: { diplomacy: -10, prestige: 4, stability: -2 },
        newsTitle: '我国驱逐对方情报站站长',
        newsSummary: '对方随即对等驱逐，冷战式外交对抗再现。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_cyber_peace',
    title: '网络空间新秩序',
    category: '外交',
    triggeredBy: { eventId: 'evt_cyber_attribution', optionId: 'a' },
    description:
      '《全球网络行为准则》获得广泛支持，关键基础设施"禁手"、网络攻击归因透明化等原则首次写入国际法。我国被誉为"数字时代和平使者"。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '主导成立国际网络应急中心',
        description: '制度性话语权',
        effects: { diplomacy: 12, prestige: 14, treasury: -6, economy: 4 },
        newsTitle: '国际网络应急中心落户我国',
        newsSummary: '总部设于首都，多国派驻联络官；网络空间治理进入"中国时刻"。',
        tone: 'positive',
      },
      {
        id: 'b', label: '专注国内数字主权建设',
        description: '内循环优先',
        effects: { stability: 6, economy: 4, approval: 2, prestige: 4 },
        newsTitle: '《关键信息基础设施保护法》实施',
        newsSummary: '数据本地化、供应链安全审查、国产替代率指标全面落地。',
        tone: 'positive',
      },
    ],
  },

  // ===== 事件链：央行独立性争议 → 行长抗命 → 市场波动 =====
  {
    id: 'evt_central_bank_pressure',
    title: '总理施压央行降息',
    category: '经济',
    description:
      '经济增速放缓，您在公开场合连续三次"建议"央行"适时调整货币政策"。市场嗅到政治干预信号，本币汇率单日贬值 2.3%，国债收益率曲线倒挂。',
    minTurn: 8,
    options: [
      {
        id: 'a', label: '继续施压，要求立即降息',
        description: '短期刺激，但损害央行信誉',
        effects: { economy: 6, treasury: 2, approval: 2, prestige: -6, stability: -2 },
        newsTitle: '央行紧急会议后宣布降准 50 个基点',
        newsSummary: '本币继续走弱，外资单日净流出创年内新高；专家警告"独立性的葬礼"。',
        tone: 'neutral',
        chainId: 'evt_central_bank_resign', chainDelay: 4,
      },
      {
        id: 'b', label: '收回言论，尊重央行独立性',
        description: '修复市场信心',
        effects: { economy: -2, prestige: 6, treasury: 2, stability: 2 },
        newsTitle: '总理发言人澄清"无意干预央行"',
        newsSummary: '本币汇率回升，国债收益率曲线修复；市场松一口气。',
        tone: 'positive',
      },
      {
        id: 'c', label: '改组央行理事会，安插亲信',
        description: '彻底掌控，但国际信誉重挫',
        effects: { economy: -4, prestige: -12, stability: -4, treasury: 4 },
        newsTitle: '央行理事会大换血',
        newsSummary: '三位独立理事被替换，国际评级机构下调我国主权评级；本币跳水。',
        tone: 'negative',
        chainId: 'evt_central_bank_resign', chainDelay: 3,
      },
    ],
  },
  {
    id: 'evt_central_bank_resign',
    title: '央行行长抗命辞职',
    category: '突发',
    triggeredBy: { eventId: 'evt_central_bank_pressure', optionId: 'a' },
    description:
      '央行行长公开发表辞职声明，措辞罕见尖锐："当货币政策沦为政治附庸，央行的存在便失去意义。"国际财经媒体头版转载，全球资本市场震荡。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '挽留行长，公开承诺独立性',
        description: '止损，但颜面尽失',
        effects: { prestige: -8, economy: 4, stability: 2 },
        newsTitle: '总理与央行行长深夜长谈',
        newsSummary: '行长收回辞呈，但提出三项制度性保障要求；市场情绪修复。',
        tone: 'neutral',
      },
      {
        id: 'b', label: '批准辞职，任命自己人',
        description: '彻底掌控，但代价沉重',
        effects: { economy: -8, prestige: -10, stability: -4, treasury: -4 },
        newsTitle: '新任央行行长宣誓就职',
        newsSummary: '本币单日再跌 3%，外资抛售我国国债；分析师生成"政治附庸央行风险溢价"。',
        tone: 'negative',
        chainId: 'evt_central_bank_crisis', chainDelay: 5,
      },
    ],
  },
  {
    id: 'evt_central_bank_crisis',
    title: '货币危机全面爆发',
    category: '经济',
    triggeredBy: { eventId: 'evt_central_bank_resign', optionId: 'b' },
    description:
      '本币累计贬值 18%，进口商品价格飞涨，外汇储备快速消耗。资本管制呼声再起，但经济学家警告这会进一步打击外资信心。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '紧急加息捍卫本币',
        description: '止血，但经济雪上加霜',
        effects: { economy: -10, treasury: 4, prestige: 4, stability: -4 },
        newsTitle: '央行紧急加息 200 个基点',
        newsSummary: '本币企稳，但企业融资成本飙升，房贷利率突破 9%。',
        tone: 'neutral',
      },
      {
        id: 'b', label: '寻求 IMF 紧急贷款',
        description: '外援救急，但代价是改革条件',
        effects: { treasury: 12, diplomacy: 6, prestige: -10, approval: -6 },
        newsTitle: '我国与 IMF 达成紧急贷款协议',
        newsSummary: '附带财政紧缩、央行改革、市场开放等苛刻条件；主权评级回升。',
        tone: 'neutral',
      },
    ],
  },

  // ===== 事件链：区域分离主义 → 谈判 → 自治/弹压 =====
  {
    id: 'evt_regional_unrest',
    title: '边境省份分离情绪升温',
    category: '政治体制',
    description:
      '北方"卡拉契斯坦省"的民族语言政党在地方选举中大胜，公开提出"高度自治"乃至"独立公投"诉求。该省富含稀土与油气，中央绝不允许其脱离。',
    minTurn: 10,
    options: [
      {
        id: 'a', label: '启动宪法对话，扩大自治权',
        description: '柔性化解，但可能被解读为软弱',
        effects: { approval: 4, stability: 4, prestige: -4, diplomacy: 2 },
        newsTitle: '中央与卡拉契斯坦省启动宪法对话',
        newsSummary: '地方政党组织代表团赴京，提出语言、税收、警务三项自治诉求。',
        tone: 'neutral',
        chainId: 'evt_regional_negotiation', chainDelay: 5,
      },
      {
        id: 'b', label: '强硬表态，部署安全力量',
        description: '震慑分离，但激化矛盾',
        effects: { stability: 4, approval: -6, prestige: 4, treasury: -6 },
        newsTitle: '中央向卡拉契斯坦省增派安全力量',
        newsSummary: '地方政党领袖被以"煽动分裂"罪名传唤；国际人权组织表达关切。',
        tone: 'negative',
        chainId: 'evt_regional_crackdown', chainDelay: 4,
      },
      {
        id: 'c', label: '经济安抚，大规模投资',
        description: '用繁荣换认同',
        effects: { treasury: -16, economy: 4, approval: 6, stability: 2 },
        newsTitle: '中央公布卡拉契斯坦振兴计划',
        newsSummary: '五年三千亿投资，重点建设稀土深加工产业链与本地就业。',
        tone: 'positive',
      },
    ],
  },
  {
    id: 'evt_regional_negotiation',
    title: '自治谈判陷入僵局',
    category: '政治体制',
    triggeredBy: { eventId: 'evt_regional_unrest', optionId: 'a' },
    description:
      '中央与地方代表经过五轮谈判，在语言权与税收分享上达成共识，但警务与司法权卡死。地方政党强硬派威胁退出谈判，发起"公民不服从运动"。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '让出警务权，签署自治宪章',
        description: '联邦化妥协，但树立先例',
        effects: { stability: 6, approval: 4, prestige: -6, treasury: 2 },
        newsTitle: '《卡拉契斯坦自治宪章》签署',
        newsSummary: '地方警务由省府统管，司法部分共享；国际社会赞为"和解典范"。',
        tone: 'positive',
        chainId: 'evt_regional_resolution', chainDelay: 6,
      },
      {
        id: 'b', label: '谈判破裂，转入强硬',
        description: '改弦更张',
        effects: { stability: -8, prestige: 4, approval: -4 },
        newsTitle: '中央宣布中止自治谈判',
        newsSummary: '地方政党发起总罢工，省内交通瘫痪；中央部署安全力量。',
        tone: 'negative',
        chainId: 'evt_regional_crackdown', chainDelay: 3,
      },
    ],
  },
  {
    id: 'evt_regional_crackdown',
    title: '分离运动遭镇压',
    category: '突发',
    triggeredBy: { eventId: 'evt_regional_unrest', optionId: 'b' },
    description:
      '安全力量突袭分离主义政党总部，逮捕多名领袖。地方爆发大规模抗议，与军警发生冲突，造成数十人伤亡。国际媒体涌入报道。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '宣布紧急状态，全面封锁',
        description: '铁腕维稳',
        effects: { stability: -10, prestige: -8, treasury: -8, approval: -8, diplomacy: -6 },
        newsTitle: '卡拉契斯坦省进入紧急状态',
        newsSummary: '宵禁、断网、禁集会三管齐下；多国召回大使磋商，国际制裁呼声四起。',
        tone: 'negative',
        countryEffects: [{ targetNeighbors: true, relationDelta: -8 }],
      },
      {
        id: 'b', label: '释放部分被捕者，重启对话',
        description: '让步止损',
        effects: { stability: 4, approval: 4, prestige: -4, diplomacy: 2 },
        newsTitle: '中央释放分离运动领袖，重启对话',
        newsSummary: '冲突降温，国际社会欢迎；地方温和派重回谈判桌。',
        tone: 'positive',
        chainId: 'evt_regional_resolution', chainDelay: 5,
      },
    ],
  },
  {
    id: 'evt_regional_resolution',
    title: '民族和解进程',
    category: '政治体制',
    triggeredBy: { eventId: 'evt_regional_negotiation', optionId: 'a' },
    description:
      '自治宪章实施两年后，卡拉契斯坦省经济社会稳定，民族文化繁荣，分离情绪大幅消退。该模式被视为多民族国家治理的标杆。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '推广至其他多民族省份',
        description: '制度化成果',
        effects: { stability: 6, prestige: 8, approval: 4, treasury: -4 },
        newsTitle: '《多民族自治框架法》全国推行',
        newsSummary: '五省纳入试点，民族关系改善；学界誉为"21 世纪联邦主义新范式"。',
        tone: 'positive',
      },
      {
        id: 'b', label: '维持单一案例，不推广',
        description: '审慎处理',
        effects: { stability: 2, prestige: 2, approval: 2 },
        newsTitle: '中央强调"自治非普适"',
        newsSummary: '官方定调"因地制宜"，避免连锁诉求；学界略有失望。',
        tone: 'neutral',
      },
    ],
  },

  // ===== 事件链：媒体监管争议 → 言论自由 / 整肃 =====
  {
    id: 'evt_media_regulation',
    title: '《媒体责任法》争议',
    category: '政治体制',
    description:
      '司法部提出《媒体责任法》草案，要求新闻机构对"不实报道"承担连带责任，并设立"媒体伦理委员会"进行资质审核。记者协会与多家独立媒体联署反对，称之为"新闻审查的合法化"。',
    minTurn: 7,
    options: [
      {
        id: 'a', label: '强行通过法案',
        description: '管控信息，但损害言论自由',
        effects: { stability: 6, approval: -10, prestige: -8, treasury: 2 },
        newsTitle: '《媒体责任法》在议会强行通过',
        newsSummary: '多家独立媒体宣布停刊抗议，国际记者组织发布红色预警。',
        tone: 'negative',
        chainId: 'evt_media_backlash', chainDelay: 4,
      },
      {
        id: 'b', label: '撤回法案，扩大媒体自治',
        description: '捍卫新闻自由',
        effects: { approval: 6, prestige: 8, stability: -3 },
        newsTitle: '总理宣布撤回《媒体责任法》',
        newsSummary: '记者协会称"言论自由的胜利"；保守派批评"政府软弱"。',
        tone: 'positive',
        chainId: 'evt_media_freedom', chainDelay: 5,
      },
      {
        id: 'c', label: '折中修订，仅规范社交媒体',
        description: '抓大放小',
        effects: { approval: 2, stability: 2, prestige: 2 },
        newsTitle: '《网络信息传播管理条例》出台',
        newsSummary: '传统媒体未受冲击，自媒体需备案；各方反应不一。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'evt_media_backlash',
    title: '媒体整肃余波',
    category: '政治体制',
    triggeredBy: { eventId: 'evt_media_regulation', optionId: 'a' },
    description:
      '《媒体责任法》实施后，三十余家独立媒体被吊销执照，资深记者集体出走海外。国际评级机构下调我国"新闻自由指数"至全球倒数 15%。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '建立官方主导的"国家通讯社"',
        description: '统一信息出口',
        effects: { stability: 4, prestige: -6, approval: -4, treasury: -4 },
        newsTitle: '国家通讯社正式成立',
        newsSummary: '所有官方信息统一发布渠道；地方媒体沦为转发机构。',
        tone: 'negative',
      },
      {
        id: 'b', label: '适度放松，挽回国际形象',
        description: '止损',
        effects: { prestige: 4, approval: 4, stability: -2 },
        newsTitle: '总理宣布"适度放宽媒体管制"',
        newsSummary: '部分被吊销执照的媒体恢复运营；国际社会表示谨慎欢迎。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'evt_media_freedom',
    title: '新闻自由黄金期',
    category: '政治体制',
    triggeredBy: { eventId: 'evt_media_regulation', optionId: 'b' },
    description:
      '撤回法案后，调查报道迎来井喷：多起腐败案、环境案、冤假错案被深度曝光。民众对政府透明度评价创十年新高，但也出现"媒体审判"的争议。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '出台《信息公开法》',
        description: '制度化透明',
        effects: { approval: 6, prestige: 8, stability: 2, treasury: 2 },
        newsTitle: '《政府信息公开法》实施',
        newsSummary: '除国家秘密外，所有公共信息默认公开；民间可申请复议。',
        tone: 'positive',
      },
      {
        id: 'b', label: '加强媒体自律，设立行业伦理委员会',
        description: '行业自治',
        effects: { approval: 2, prestige: 4, stability: 2 },
        newsTitle: '媒体行业伦理委员会成立',
        newsSummary: '由记者协会、学者、读者代表组成；首批处理三起"媒体审判"投诉。',
        tone: 'positive',
      },
    ],
  },

  // ===== 事件链：太空计划 → 发射 → 国际影响 =====
  {
    id: 'evt_space_program',
    title: '载人登月计划争议',
    category: '经济',
    description:
      '航天局提出 2030 年前实现载人登月的宏伟计划，预算达 8000 亿。科技界热血沸腾，但社会团体质疑"民生尚未解决，何谈星辰大海"。',
    minTurn: 6,
    options: [
      {
        id: 'a', label: '批准计划，全力推进',
        description: '押注国家荣耀',
        effects: { prestige: 12, treasury: -16, approval: 4, economy: 4, stability: 2 },
        newsTitle: '总理宣布载人登月计划正式启动',
        newsSummary: '航天城扩建、运载火箭量产、宇航员选拔同步推进；青少年航天热升温。',
        tone: 'positive',
        chainId: 'evt_space_launch', chainDelay: 8,
      },
      {
        id: 'b', label: '缩减规模，聚焦深空探测',
        description: '务实路线',
        effects: { prestige: 6, treasury: -8, economy: 2 },
        newsTitle: '深空探测路线图公布',
        newsSummary: '取消载人登月，转向无人月球科研站与火星采样返回。',
        tone: 'neutral',
      },
      {
        id: 'c', label: '搁置计划，资金转向民生',
        description: '民生优先',
        effects: { approval: 8, treasury: 4, prestige: -6, stability: 2 },
        newsTitle: '载人登月计划无限期搁置',
        newsSummary: '航天界集体失落，年轻科研人才流失海外；民生支出增加。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_space_launch',
    title: '载人登月倒计时',
    category: '外交',
    triggeredBy: { eventId: 'evt_space_program', optionId: 'a' },
    description:
      '登月飞船"逐梦号"即将发射，全球 30 亿观众直播关注。但发射前 48 小时，气象预警显示发射窗口有雷暴过境，工程团队意见分裂。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '冒险按原计划发射',
        description: '抢历史时刻',
        effects: { prestige: 16, economy: 4, treasury: -4, stability: -4 },
        newsTitle: '"逐梦号"成功登陆月面！',
        newsSummary: '宇航员踏上月球的画面传遍全球；我国成为第二个独立登月的国家。',
        tone: 'positive',
        chainId: 'evt_space_legacy', chainDelay: 5,
      },
      {
        id: 'b', label: '推迟至下一个窗口',
        description: '稳妥至上',
        effects: { prestige: -2, treasury: -2, stability: 2 },
        newsTitle: '登月发射推迟至下月',
        newsSummary: '总工程师解释"安全永远是第一位"；部分舆论质疑"决策魄力不足"。',
        tone: 'neutral',
        chainId: 'evt_space_legacy', chainDelay: 7,
      },
    ],
  },
  {
    id: 'evt_space_legacy',
    title: '太空时代新格局',
    category: '外交',
    triggeredBy: { eventId: 'evt_space_launch', optionId: 'a' },
    description:
      '登月成功后，多国申请加入我国主导的"国际月球科研站"计划。但某大国发起"太空北约"，试图孤立我国太空合作。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '开放合作，共建月球科研站',
        description: '太空多边主义',
        effects: { diplomacy: 12, prestige: 8, economy: 4, treasury: -4 },
        newsTitle: '国际月球科研站正式奠基',
        newsSummary: '二十国签署合作协议，"太空北约"倡议无人问津。',
        tone: 'positive',
      },
      {
        id: 'b', label: '主导制定太空资源法',
        description: '规则先行',
        effects: { prestige: 10, diplomacy: 4, economy: 6, treasury: 2 },
        newsTitle: '我国颁布《外空资源开发法》',
        newsSummary: '先到先得原则被摒弃，建立"全人类共享"机制；国际法界高度评价。',
        tone: 'positive',
      },
    ],
  },

  // ===== 事件链：能源短缺 → 限电 → 多元化 =====
  {
    id: 'evt_power_shortage',
    title: '冬季限电危机',
    category: '经济',
    description:
      '寒潮叠加煤价高企，多地电网负荷告急。工业大省被迫"开三停四"，居民区夜间停电引发老人取暖死亡事件，舆论震动。',
    minTurn: 5,
    options: [
      {
        id: 'a', label: '紧急进口煤炭，高价保供',
        description: '保民生，但财政与外交承压',
        effects: { treasury: -12, approval: 6, stability: 4, economy: -2, diplomacy: -2 },
        newsTitle: '总理下令紧急进口煤炭保供',
        newsSummary: '专列昼夜抢运，居民供暖恢复；但进口成本创历史新高。',
        tone: 'neutral',
        chainId: 'evt_power_transition', chainDelay: 5,
      },
      {
        id: 'b', label: '优先保居民，工业大面积停产',
        description: '保民生优先',
        effects: { approval: 8, economy: -10, treasury: -4, stability: 2 },
        newsTitle: '工业限电扩大，制造业承压',
        newsSummary: '出口订单延期，部分外资企业启动"产能转移"评估。',
        tone: 'negative',
        chainId: 'evt_power_transition', chainDelay: 6,
      },
      {
        id: 'c', label: '强硬拉闸，强制节能',
        description: '简单粗暴',
        effects: { approval: -12, stability: -6, treasury: 2, economy: -6 },
        newsTitle: '多地强制拉闸限电引发民愤',
        newsSummary: '社交媒体涌现停电惨剧视频；反对党发起"还给人民光明"倡议。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_power_transition',
    title: '能源结构转型加速',
    category: '环境',
    triggeredBy: { eventId: 'evt_power_shortage', optionId: 'a' },
    description:
      '限电危机后，能源局推出"多元化能源战略"：加速核电审批、扩容跨区特高压、推动用户侧储能补贴。但核电安全争议再起。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '大规模上马第三代核电',
        description: '基荷电源',
        effects: { economy: 6, treasury: -10, prestige: 6, stability: 2, approval: -2 },
        newsTitle: '十二台核电机组同时获批',
        newsSummary: '核电占电源比重大幅提升；反核团体发起万人签名请愿。',
        tone: 'neutral',
      },
      {
        id: 'b', label: '聚焦储能与需求侧响应',
        description: '柔性方案',
        effects: { economy: 4, treasury: -6, prestige: 4, approval: 4 },
        newsTitle: '用户侧储能补贴政策出台',
        newsSummary: '工商业储能投资暴增，"虚拟电厂"概念走红；电网弹性显著提升。',
        tone: 'positive',
      },
    ],
  },

  // ===== 独立事件 =====
  {
    id: 'evt_diplomatic_expulsion',
    title: '外交使节遭驱逐',
    category: '外交',
    description:
      '某大国以"从事与身份不符活动"为由，驱逐我国驻该国大使馆一名参赞。对方措辞严厉，被外界解读为外交降级信号。',
    options: [
      {
        id: 'a', label: '对等驱逐对方使节',
        description: '针锋相对',
        effects: { diplomacy: -6, prestige: 4, stability: 0 },
        newsTitle: '我国对等驱逐对方大使馆参赞',
        newsSummary: '外交战升级，国际社会担忧双边关系持续恶化。',
        tone: 'neutral',
      },
      {
        id: 'b', label: '低调沟通，寻求缓和',
        description: '外交降温',
        effects: { diplomacy: 4, prestige: -4, stability: 2 },
        newsTitle: '我方与对方使馆私下沟通',
        newsSummary: '外交渠道保持畅通，事件未进一步发酵。',
        tone: 'positive',
      },
      {
        id: 'c', label: '召回大使磋商',
        description: '强烈抗议',
        effects: { diplomacy: -10, prestige: 6, stability: -2 },
        newsTitle: '我国召回驻对方大使磋商',
        newsSummary: '双边外交关系实质降级；商界担忧合作项目受阻。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_judicial_reform',
    title: '司法独立性改革',
    category: '政治体制',
    description:
      '最高法院院长公开倡议"司法去行政化"，建议取消地方党委对法院人事的提名权，由法官遴选委员会独立产生。地方官员集体反弹。',
    once: true,
    options: [
      {
        id: 'a', label: '支持改革，强力推行',
        description: '触动根本，但赢得历史评价',
        effects: { approval: 8, prestige: 12, stability: -4, treasury: 2 },
        newsTitle: '中央支持司法独立性改革',
        newsSummary: '法官遴选委员会成立，地方法院脱离行政干预；学界欢呼"世纪改革"。',
        tone: 'positive',
      },
      {
        id: 'b', label: '温和试点，逐步推进',
        description: '稳妥改革',
        effects: { approval: 4, prestige: 6, stability: 2 },
        newsTitle: '司法改革在五省市试点',
        newsSummary: '渐进式改革获多数认可；学界批评"力度不足"。',
        tone: 'neutral',
      },
      {
        id: 'c', label: '搁置改革，维护现状',
        description: '回避争议',
        effects: { approval: -4, prestige: -6, stability: 2 },
        newsTitle: '司法改革方案被搁置',
        newsSummary: '最高法院院长公开表示失望；国际法治指数下调我国评级。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_water_crisis',
    title: '城市供水危机',
    category: '突发',
    description:
      '上游化工厂泄漏污染水源，省会城市自来水停供 48 小时。超市瓶装水被抢购一空，医院急诊接收大量因饮用不洁水导致腹泻的市民。',
    options: [
      {
        id: 'a', label: '紧急调度外地水源，免费派水',
        description: '保民生',
        effects: { approval: 6, treasury: -10, stability: 4, prestige: -2 },
        newsTitle: '消防车与军车昼夜运水入城',
        newsSummary: '居民排队领水秩序井然；总理亲赴灾区慰问。',
        tone: 'positive',
      },
      {
        id: 'b', label: '严惩涉事企业，追究刑责',
        description: '铁腕问责',
        effects: { approval: 8, prestige: 6, treasury: 2, stability: -2 },
        newsTitle: '涉事化工厂董事长被刑事拘留',
        newsSummary: '环保部门吊销其所有许可证；网民呼吁"国企也不能例外"。',
        tone: 'positive',
      },
      {
        id: 'c', label: '淡化处理，强调"短期波动"',
        description: '维稳优先',
        effects: { approval: -10, stability: -6, prestige: -4 },
        newsTitle: '官方称供水"已基本恢复"',
        newsSummary: '市民发现自来水仍有异味，社交媒体涌现吐槽视频。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_factory_accident',
    title: '化工厂爆炸事故',
    category: '突发',
    description:
      '沿海工业城市一家大型化工厂发生连环爆炸，造成 47 人死亡、200 余人受伤。周边社区居民紧急疏散，环境监测显示有毒气体扩散。',
    options: [
      {
        id: 'a', label: '全力救援，全国哀悼日',
        description: '彰显人文关怀',
        effects: { approval: 8, treasury: -12, stability: 2, prestige: 4 },
        newsTitle: '总理宣布全国哀悼日',
        newsSummary: '降半旗致哀；救援队伍持续搜救，伤员转运至全国顶级医院。',
        tone: 'positive',
      },
      {
        id: 'b', label: '严查监管失职，整肃行业',
        description: '治本之策',
        effects: { approval: 6, treasury: -8, stability: -2, economy: -4, prestige: 6 },
        newsTitle: '政府开展化工行业安全大检查',
        newsSummary: '上百家不达标企业被关停整改；部分外资化工企业迁址评估。',
        tone: 'neutral',
      },
      {
        id: 'c', label: '低调处理，控制舆论',
        description: '维稳优先',
        effects: { approval: -12, prestige: -8, stability: -4 },
        newsTitle: '官方通报伤亡数字引发质疑',
        newsSummary: '社交媒体流传更多现场视频，公信力受损。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_religion_conflict',
    title: '宗教群体冲突',
    category: '社会',
    description:
      '两个长期不和的宗教群体因一座历史建筑归属问题爆发冲突，双方信徒对峙三日，局部出现打砸事件。',
    options: [
      {
        id: 'a', label: '派遣中央调解组',
        description: '柔性介入',
        effects: { approval: 4, stability: 4, prestige: 4, treasury: -2 },
        newsTitle: '中央宗教事务调解组抵达',
        newsSummary: '与双方领袖闭门磋商，提议共同管理委员会方案。',
        tone: 'positive',
      },
      {
        id: 'b', label: '军事化清场，强制平息',
        description: '强硬处置',
        effects: { stability: -4, approval: -6, prestige: -4, treasury: 2 },
        newsTitle: '安全力量强行清场',
        newsSummary: '冲突暂息，但双方均指责政府偏袒对方；暗流仍在涌动。',
        tone: 'negative',
      },
      {
        id: 'c', label: '交由地方法院裁决',
        description: '司法途径',
        effects: { stability: 2, prestige: 4, approval: 2 },
        newsTitle: '最高法院受理建筑归属案',
        newsSummary: '司法程序启动，双方同意先行停火；学界赞为"法治胜出"。',
        tone: 'positive',
      },
    ],
  },
  {
    id: 'evt_lottery_debate',
    title: '国家彩票立法争议',
    category: '经济',
    description:
      '财政部提出设立"国家发展彩票"，预计年筹款 800 亿用于教育与养老。但宗教团体与伦理学者联署反对，称之为"对穷人的隐性征税"。',
    once: true,
    options: [
      {
        id: 'a', label: '通过彩票法，明确公益用途',
        description: '开辟财源',
        effects: { treasury: 8, approval: -4, stability: 2, economy: 2 },
        newsTitle: '《国家发展彩票法》通过',
        newsSummary: '首期彩票三个月内发行，公益金专项用于农村教育与失能老人护理。',
        tone: 'neutral',
      },
      {
        id: 'b', label: '搁置方案，避免争议',
        description: '稳妥',
        effects: { treasury: 0, approval: 2, prestige: 2 },
        newsTitle: '彩票法被无限期搁置',
        newsSummary: '宗教团体与伦理学者表示欢迎；财政部表示遗憾。',
        tone: 'neutral',
      },
      {
        id: 'c', label: '改为"自愿公益债券"',
        description: '创新金融',
        effects: { treasury: 4, prestige: 6, approval: 4 },
        newsTitle: '"自愿公益债券"方案推出',
        newsSummary: '不中奖但可获税收抵扣，被誉为"良心金融创新"。',
        tone: 'positive',
      },
    ],
  },
  {
    id: 'evt_olympic_bid',
    title: '奥运申办争议',
    category: '外交',
    description:
      '奥委会邀请我国申办下届夏季奥运会。成功举办可极大提升国际形象，但巨额投入与赛后场馆闲置问题饱受争议。',
    minTurn: 4,
    once: true,
    options: [
      {
        id: 'a', label: '高调申办，举国体制',
        description: '展露大国气象',
        effects: { prestige: 12, treasury: -20, approval: 4, economy: 6, stability: 2 },
        newsTitle: '总理宣布申办下届夏季奥运会',
        newsSummary: '场馆建设启动，预计直接投资 4500 亿；旅游业预期井喷。',
        tone: 'positive',
      },
      {
        id: 'b', label: '联合邻国联合申办',
        description: '区域外交',
        effects: { diplomacy: 8, prestige: 6, treasury: -8, economy: 2 },
        newsTitle: '我国与两国联合申办',
        newsSummary: '区域合作象征；分摊成本，但协调难度大。',
        tone: 'positive',
      },
      {
        id: 'c', label: '放弃申办，资金转向民生',
        description: '民生优先',
        effects: { approval: 6, treasury: 4, prestige: -6, economy: -2 },
        newsTitle: '我国放弃奥运申办',
        newsSummary: '资金转向农村基础设施与全民体育设施；体育界遗憾，民众普遍支持。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'evt_drug_trafficking',
    title: '跨境毒品走私案',
    category: '突发',
    description:
      '边防部门破获特大跨境贩毒案，缴获冰毒 1.2 吨。但毒贩武装反抗，造成 6 名边防战士牺牲。涉案资金链指向境外某武装组织。',
    options: [
      {
        id: 'a', label: '跨境军事打击毒枭',
        description: '强硬反毒',
        effects: { prestige: 8, diplomacy: -8, treasury: -8, stability: 2, approval: 4 },
        newsTitle: '我国特种部队跨境清剿毒枭',
        newsSummary: '击毙毒枭头目，缴获大量武器；邻国强烈抗议"主权侵犯"。',
        tone: 'neutral',
        countryEffects: [{ targetNeighbors: true, relationDelta: -10 }],
      },
      {
        id: 'b', label: '与邻国联合执法',
        description: '外交途径',
        effects: { diplomacy: 6, prestige: 4, treasury: -4, stability: 2, approval: 2 },
        newsTitle: '我国与邻国签署联合反毒协议',
        newsSummary: '情报共享、联合巡逻、引渡协议三管齐下；边境治安明显改善。',
        tone: 'positive',
        countryEffects: [{ targetNeighbors: true, relationDelta: 6 }],
      },
      {
        id: 'c', label: '加强边境封锁，不跨境',
        description: '防御为主',
        effects: { stability: 4, treasury: -4, diplomacy: 0, economy: -2 },
        newsTitle: '边境进入反毒一级戒备',
        newsSummary: '走私通道被全面封锁，但合法贸易也受影响；边民抱怨生活不便。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'evt_diaspora_return',
    title: '海外侨民大规模归国',
    category: '社会',
    description:
      '受国际地缘政治动荡影响，数十万海外侨民集中归国，其中不乏高端人才与富裕资本。这是吸引人才的良机，但安置压力巨大。',
    options: [
      {
        id: 'a', label: '设立"侨民回归专项计划"',
        description: '拥抱人才',
        effects: { economy: 8, prestige: 8, treasury: -10, approval: 4, stability: 2 },
        newsTitle: '总理宣布"侨民回归专项计划"',
        newsSummary: '税收优惠、住房补贴、子女教育一条龙服务；高端人才回归潮涌现。',
        tone: 'positive',
      },
      {
        id: 'b', label: '严格审查，仅接纳高端人才',
        description: '选择性接收',
        effects: { economy: 4, prestige: 4, stability: 2, approval: -2 },
        newsTitle: '侨民回归实施积分制',
        newsSummary: '博士、技术专家优先；普通侨民抱怨"祖国关门"。',
        tone: 'neutral',
      },
      {
        id: 'c', label: '不鼓励大规模回归',
        description: '避免安置压力',
        effects: { economy: -2, prestige: -4, stability: 2, treasury: 2 },
        newsTitle: '官方表态"侨民可自主选择"',
        newsSummary: '海外侨民失望，部分高端人才转向他国；舆论批评"短视"。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_census_politics',
    title: '人口普查数据争议',
    category: '政治体制',
    description:
      '十年一度的人口普查数据公布后，多地议员质疑数据失真：某省统计人口 6000 万，但用电量与手机用户数仅相当于 4000 万。统计口径成为政治问题。',
    once: true,
    options: [
      {
        id: 'a', label: '成立独立调查委员会',
        description: '求真务实',
        effects: { approval: 6, prestige: 8, stability: -2, treasury: -2 },
        newsTitle: '政府成立人口数据独立调查委员会',
        newsSummary: '由统计、税务、电力、电信多方专家组成；承诺三个月内出结果。',
        tone: 'positive',
      },
      {
        id: 'b', label: '维持原数据，强调"科学性"',
        description: '护盘',
        effects: { approval: -6, prestige: -4, stability: 2 },
        newsTitle: '统计局坚持数据真实可靠',
        newsSummary: '学界与媒体公开反驳，社交平台涌现大量"用电量反推"分析。',
        tone: 'negative',
      },
      {
        id: 'c', label: '修订统计方法，重新普查',
        description: '认错重来',
        effects: { approval: 4, prestige: 4, treasury: -8, stability: 0 },
        newsTitle: '统计局宣布修订方法并重启普查',
        newsSummary: '承认方法学缺陷，重新设计抽样框；学界普遍赞赏。',
        tone: 'positive',
      },
    ],
  },
  {
    id: 'evt_pride_parade',
    title: '性少数群体游行申请',
    category: '社会',
    description:
      '性少数群体申请在首都举办首次公开游行，预计参加人数过万。保守宗教团体与家庭价值组织强烈反对，扬言"反制游行"。',
    options: [
      {
        id: 'a', label: '批准游行，派警力保护',
        description: '保障权利',
        effects: { approval: -4, prestige: 8, stability: -2, diplomacy: 4 },
        newsTitle: '首都迎来首次公开游行',
        newsSummary: '彩虹旗飘扬，国际人权组织点赞；保守派发起"家庭价值守护大会"。',
        tone: 'neutral',
      },
      {
        id: 'b', label: '以"公共秩序"为由拒绝',
        description: '维稳优先',
        effects: { approval: 2, prestige: -6, stability: 2, diplomacy: -2 },
        newsTitle: '官方以公共秩序为由驳回游行申请',
        newsSummary: '国际媒体批评"倒退"；申请人表示将向宪法法院申诉。',
        tone: 'negative',
      },
      {
        id: 'c', label: '改在封闭场地举办',
        description: '折中',
        effects: { approval: 0, prestige: 0, stability: 2, diplomacy: 0 },
        newsTitle: '游行改至封闭展览馆举行',
        newsSummary: '双方均不满意，但避免了正面冲突。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'evt_trade_war',
    title: '大国贸易战升级',
    category: '外交',
    description:
      '某大国宣布对我国 1500 亿美元商品加征 25% 关税，涉及高科技、新能源、纺织等行业。我国随即公布对等反制清单。',
    minTurn: 8,
    options: [
      {
        id: 'a', label: '对等反制，强硬到底',
        description: '捍卫尊严',
        effects: { economy: -8, diplomacy: -10, prestige: 8, treasury: 4, approval: 4 },
        newsTitle: '我国公布对等反制关税清单',
        newsSummary: '对方农产品、汽车、化工品遭精准打击；对方农场主集体抗议。',
        tone: 'neutral',
        countryEffects: [{ targetAll: true, relationDelta: -5 }],
      },
      {
        id: 'b', label: '谈判妥协，部分让步',
        description: '务实止损',
        effects: { economy: -2, diplomacy: 4, prestige: -6, approval: -4, treasury: 2 },
        newsTitle: '我国与对方达成阶段性贸易协议',
        newsSummary: '扩大进口、加强知识产权保护；国内产业界批评"卖国"。',
        tone: 'neutral',
      },
      {
        id: 'c', label: '联合第三方组建"反关税联盟"',
        description: '多边反击',
        effects: { diplomacy: 8, prestige: 8, economy: -2, treasury: -2 },
        newsTitle: '我国牵头组建"多边贸易维护联盟"',
        newsSummary: '二十国加入，发表《反对单边关税宣言》；对方陷于孤立。',
        tone: 'positive',
      },
    ],
  },
  {
    id: 'evt_ai_displacement',
    title: 'AI 导致大规模失业',
    category: '经济',
    description:
      '生成式 AI 在一年内替代了 800 万白领岗位，包括初级程序员、文案、客服、翻译、会计等。年轻毕业生求职困难，"反 AI 运动"在多国蔓延。',
    minTurn: 10,
    options: [
      {
        id: 'a', label: '征收"AI 自动化税"补贴失业者',
        description: '财富再分配',
        effects: { approval: 8, treasury: 8, economy: -4, prestige: 4 },
        newsTitle: '《人工智能自动化税法》通过',
        newsSummary: '每替代一个岗位，企业需缴纳该岗位年薪 15% 的"转型税"；资金用于全民再培训。',
        tone: 'positive',
      },
      {
        id: 'b', label: '大规模再培训计划',
        description: '提升人力资本',
        effects: { approval: 4, treasury: -10, economy: 4, prestige: 6 },
        newsTitle: '总理宣布"全民 AI 时代再培训计划"',
        newsSummary: '五年万亿预算，重点培训 AI 协作、创意产业、护理服务等"难替代"领域。',
        tone: 'positive',
      },
      {
        id: 'c', label: '不干预，让市场自我调节',
        description: '自由市场',
        effects: { economy: 6, approval: -10, stability: -6, prestige: -4 },
        newsTitle: '官方表态"技术革命不可阻挡"',
        newsSummary: '失业率攀升至 12%，街头出现"砸 AI"抗议；硅谷资本欢呼。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_supervolcano',
    title: '远海火山大喷发',
    category: '突发',
    description:
      '远海火山岛发生 VEI-5 级喷发，火山灰扩散至我国东部空域，多个国际机场关闭一周。农业部门警告火山灰可能影响夏季粮食产量。',
    options: [
      {
        id: 'a', label: '紧急空运粮食储备',
        description: '保供稳价',
        effects: { approval: 6, treasury: -10, stability: 4, economy: -2 },
        newsTitle: '国家粮食储备紧急投放市场',
        newsSummary: '粮价企稳，但库存预警亮起红灯。',
        tone: 'positive',
      },
      {
        id: 'b', label: '鼓励多元化进口',
        description: '外贸补缺口',
        effects: { economy: -2, treasury: -4, diplomacy: 4, approval: 2 },
        newsTitle: '我国紧急从多国进口粮食',
        newsSummary: '粮食缺口补齐，但外交上需让步；多国借机提价。',
        tone: 'neutral',
      },
      {
        id: 'c', label: '不干预，让市场调节',
        description: '自由放任',
        effects: { approval: -10, stability: -8, economy: -4, treasury: 2 },
        newsTitle: '粮价连续上涨引发抢购',
        newsSummary: '超市米面被抢空，低收入家庭生活陷入困境。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'evt_constitutional_amendment',
    title: '修宪公投争议',
    category: '政治体制',
    description:
      '执政党提出修宪公投，内容包括延长总理任期上限与调整议会权力分配。反对党指责这是"民主倒退"，扬言抵制公投。',
    minTurn: 10,
    once: true,
    options: [
      {
        id: 'a', label: '强行推动公投',
        description: '扩大权力',
        effects: { prestige: -8, approval: -8, stability: -6, treasury: -4 },
        newsTitle: '修宪公投在争议中举行',
        newsSummary: '反对党抵制，投票率仅 42%；公投通过但合法性受质疑。',
        tone: 'negative',
        chainId: 'evt_constitutional_crisis', chainDelay: 4,
      },
      {
        id: 'b', label: '撤回修宪，尊重任期限制',
        description: '捍卫宪政',
        effects: { approval: 6, prestige: 8, stability: 4 },
        newsTitle: '总理宣布撤回修宪方案',
        newsSummary: '国际社会高度赞赏；反对党表示"民主胜利"。',
        tone: 'positive',
      },
      {
        id: 'c', label: '改为"专家委员会"研讨',
        description: '冷处理',
        effects: { approval: 0, stability: 2, prestige: -2 },
        newsTitle: '修宪交由专家委员会研讨',
        newsSummary: '各方接受这一过渡方案，但专家委员会的代表性受质疑。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'evt_constitutional_crisis',
    title: '宪政危机',
    category: '政治体制',
    triggeredBy: { eventId: 'evt_constitutional_amendment', optionId: 'a' },
    description:
      '修宪公投通过后，最高法院裁定公投程序违宪，议会反对党发起总理弹劾动议。军方表态"忠于宪法"，局势紧张。',
    minTurn: 999,
    options: [
      {
        id: 'a', label: '接受裁决，撤回修宪',
        description: '止损',
        effects: { prestige: -8, approval: 4, stability: 4 },
        newsTitle: '总理接受最高法院裁决',
        newsSummary: '修宪撤回，弹劾动议中止；民主制度经受考验。',
        tone: 'neutral',
      },
      {
        id: 'b', label: '解散议会，重新大选',
        description: '诉诸民意',
        effects: { stability: -10, prestige: -10, approval: -4, treasury: -6 },
        newsTitle: '总理解散议会，提前大选',
        newsSummary: '国际社会谴责"宪政自杀"；街头大规模抗议持续。',
        tone: 'negative',
      },
      {
        id: 'c', label: '宣布紧急状态，暂停宪法',
        description: '极端手段',
        effects: { stability: -15, prestige: -20, approval: -10, treasury: -8, diplomacy: -10 },
        newsTitle: '总理宣布全国紧急状态',
        newsSummary: '国际制裁潮涌现，多国断交；军方分裂迹象明显。',
        tone: 'negative',
        endsGame: true,
      },
    ],
  },
  {
    id: 'evt_teacher_strike',
    title: '全国教师大罢课',
    category: '社会',
    description:
      '教师工会发起全国大罢课，要求提高薪资、缩小城乡差距、减轻非教学负担。三千万学生被迫停课，家长集体请假照看孩子。',
    options: [
      {
        id: 'a', label: '满足全部诉求，提高教育投入',
        description: '尊重教师',
        effects: { approval: 10, treasury: -14, stability: 4, prestige: 6 },
        newsTitle: '总理签署教师待遇保障法',
        newsSummary: '教师基础工资翻倍，城乡差距五年内消除；家长拍手称快。',
        tone: 'positive',
      },
      {
        id: 'b', label: '强硬解散工会，强制复课',
        description: '维稳优先',
        effects: { approval: -14, stability: -8, prestige: -6, treasury: 2 },
        newsTitle: '政府宣布教师工会非法',
        newsSummary: '工会领袖被捕，教师被迫复课；国际舆论强烈谴责。',
        tone: 'negative',
      },
      {
        id: 'c', label: '部分满足，重启谈判',
        description: '折中',
        effects: { approval: 4, treasury: -6, stability: 2, prestige: 2 },
        newsTitle: '教师工会与政府达成框架协议',
        newsSummary: '薪资上调 30%，非教学负担三年内清理；罢课结束。',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'evt_rare_earth_weaponization',
    title: '稀土出口管制争议',
    category: '外交',
    description:
      '国防部建议将稀土出口作为外交武器，对特定国家实施禁运。但产业界警告这将加速他国自主研发，长期损害我国垄断地位。',
    minTurn: 8,
    options: [
      {
        id: 'a', label: '对特定国家实施禁运',
        description: '外交武器化',
        effects: { diplomacy: -8, economy: -4, treasury: 4, prestige: 4 },
        newsTitle: '我国对三国实施稀土出口禁运',
        newsSummary: '对方高科技产业受冲击；多国紧急寻找替代供应。',
        tone: 'neutral',
        countryEffects: [{ targetAll: true, relationDelta: -4 }],
      },
      {
        id: 'b', label: '加强技术管制，不禁运原料',
        description: '精准打击',
        effects: { economy: 2, prestige: 4, diplomacy: -2, treasury: 2 },
        newsTitle: '我国限制稀土提炼技术出口',
        newsSummary: '原料继续出口，但核心工艺受限；产业界与外交界均满意。',
        tone: 'positive',
      },
      {
        id: 'c', label: '扩大产能，巩固份额',
        description: '市场策略',
        effects: { economy: 4, treasury: -4, prestige: 2, diplomacy: 2 },
        newsTitle: '我国稀土产能扩张计划启动',
        newsSummary: '通过规模效应压低全球价格，让替代研发无利可图；战略眼光长远。',
        tone: 'positive',
      },
    ],
  },
  {
    id: 'evt_biodiversity_crisis',
    title: '生物多样性危机',
    category: '环境',
    description:
      '环保组织报告：我国脊椎动物种群数量三十年下降 68%，多种濒危物种正式宣布灭绝。生态红线与开发红线的冲突白热化。',
    options: [
      {
        id: 'a', label: '建立国家公园体系',
        description: '生态保护',
        effects: { approval: 6, prestige: 8, treasury: -10, economy: -2, stability: 2 },
        newsTitle: '首批十个国家公园正式设立',
        newsSummary: '总面积相当于一个中等省份；多种濒危物种栖息地得到保护。',
        tone: 'positive',
      },
      {
        id: 'b', label: '推动生态补偿机制',
        description: '经济激励',
        effects: { approval: 4, treasury: -6, economy: 2, prestige: 4 },
        newsTitle: '《生态补偿条例》实施',
        newsSummary: '保护生态的地区获财政转移支付；开发受限地区获发展权交易收入。',
        tone: 'positive',
      },
      {
        id: 'c', label: '优先经济发展，象征性保护',
        description: '发展优先',
        effects: { economy: 4, approval: -8, prestige: -6, treasury: 2 },
        newsTitle: '环保组织批评政府"漂绿"行径',
        newsSummary: '国际生物多样性大会拒绝我国代表发言；学界集体失望。',
        tone: 'negative',
      },
    ],
  },

  // ===== 多阶段事件链事件（边境冲突升级链 / 经济危机链 / 政治丑闻链）=====
  // 详见 src/data/eventChainDefinitions.ts 与 src/data/eventChainEvents.ts
  // 这些事件通过 triggeredBy 标记，不会出现在普通随机池中
  ...EVENT_CHAIN_EVENTS,
]