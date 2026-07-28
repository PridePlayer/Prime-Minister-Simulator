import type { GameEvent, GameState } from '@/types/game'

/**
 * 跨系统联动事件包
 *
 * 这些事件文案更长、更具体：会引用玩家当前世界状态（失业率、将领、税率、正在打的仗、
 * 总理的腐败值、生效的法律等），让玩家感觉自己的治理在真正塑造这个国家。
 *
 * 由于 GameEvent 类型本身不带条件字段，触发概率通过 getCrossSystemEventWeight 函数
 * 在 pickEvent 中动态加权实现：状态匹配时大幅提权，否则只保留极低基础权重。
 */

export const CROSS_SYSTEM_EVENTS: GameEvent[] = [
  // ============================================================================
  // 经济 → 社会：失业潮引发工会主席施压（联动失业率 + 工会 NPC）
  // ============================================================================
  {
    id: 'cross_unemployment_union_pressure',
    title: '失业潮来袭：工会主席的"最后通牒"',
    category: '社会',
    weight: 0.3, // 基础权重很低，仅在失业率高时通过 getCrossSystemEventWeight 提权
    minTurn: 6,
    description:
      '全国总工会主席孙铁柱推开你办公室的门，把一沓厚厚的请愿书拍在桌上。"总理，东南三省的失业率已经突破 14%，纺织厂和造船厂的工人连续两周在市政府门口静坐。"他声音沙哑，"他们曾经是您的选民。再不出手，下一次罢工就不是静坐了。"',
    options: [
      {
        id: 'a',
        label: '紧急拨款设立公共工程，吸收失业人口',
        description: '用国库换时间，但工会会记住这份情',
        effects: { treasury: -8, approval: 4, stability: 3, economy: 1 },
        secondaryEffects: { employmentRate: 3, protestFrequency: -4 },
        pmStatEffects: { politicalCapital: 4 },
        newsTitle: '总理签署紧急就业法令',
        newsSummary: '十万公共工程岗位立即投放，工会主席孙铁柱公开表示感谢。',
        tone: 'positive',
      },
      {
        id: 'b',
        label: '要求企业自行消化，政府仅出面"协调"',
        description: '不掏钱，但得罪工会',
        effects: { treasury: 1, stability: -3 },
        secondaryEffects: { protestFrequency: 5, socialCohesion: -2 },
        pmStatEffects: { politicalCapital: -3 },
        newsTitle: '政府称"失业问题需市场化解决"',
        newsSummary: '孙铁柱怒斥："总理忘了是谁把他抬进总理府的。"',
        tone: 'negative',
        delayedConsequence: {
          delayDays: 21,
          title: '东南三省爆发总罢工',
          description: '失业工人响应工会号召发起总罢工，港口与铁路瘫痪三日，损失以十亿计。',
          effects: { economy: -6, treasury: -4, stability: -5 },
          newsTitle: '总罢工让首都一夜入冬',
          newsSummary: '超市货架开始出现空缺，民众抢购生活物资。',
        },
      },
      {
        id: 'c',
        label: '推动劳动法修订案，立法强制企业留用',
        description: '法律层面根治，但需要数月审议',
        effects: { stability: 1 },
        secondaryEffects: { employmentRate: 2 },
        pmStatEffects: { politicalCapital: -5 },
        newsTitle: '总理启动劳动法紧急修订',
        newsSummary: '草案承诺对企业裁员增设"社会影响评估"门槛。',
        tone: 'neutral',
      },
    ],
  },

  // ============================================================================
  // 军事 → 政治：总参谋长的"军费备忘录"（联动军费占 GDP + 军方 NPC）
  // ============================================================================
  {
    id: 'cross_military_budget_memo',
    title: '总参谋长的"绝密备忘录"',
    category: '军事',
    weight: 0.3,
    minTurn: 8,
    description:
      '深夜，总参谋长周振国送来一份盖着"绝密"红章的备忘录。"总理，"他双手放在膝上，"军费占 GDP 比例已连续两年低于邻国平均水平。陆军战备度跌至危险区间，去年新兵训练时长被砍了三分之一。海军司令林远征让我转告您——他的舰队已经不敢出远海了。"',
    options: [
      {
        id: 'a',
        label: '提高军费至 GDP 的 4%，立刻拨付',
        description: '军方欢呼，国库重压',
        effects: { treasury: -6, stability: 1, prestige: 2 },
        pmStatEffects: { politicalCapital: -2 },
        newsTitle: '军费预算大幅上调引国际关注',
        newsSummary: '邻国召见我国武官表达"严重关切"，国际信用评级机构将我国列入观察名单。',
        tone: 'neutral',
        countryEffects: [{ targetNeighbors: true, relationDelta: -3 }],
      },
      {
        id: 'b',
        label: '维持现状，但承诺明年调整',
        description: '拖延战术，军方会记仇',
        effects: { stability: -1 },
        pmStatEffects: { politicalCapital: -3 },
        newsTitle: '军费调整计划延后',
        newsSummary: '总参谋长面色铁青地离开总理府，海军司令林远征未发一言。',
        tone: 'neutral',
        delayedConsequence: {
          delayDays: 45,
          title: '退役将领联名公开信',
          description: '一批退役将领发表联名公开信，指责政府"忽视国防"。信件在军方家属中广泛流传，引发稳定担忧。',
          effects: { stability: -4, prestige: -3 },
          newsTitle: '退役将领公开信震动朝野',
          newsSummary: '签名者包括三位前总参谋长，反对党要求总理赴议会答辩。',
        },
      },
      {
        id: 'c',
        label: '与周振国私下会谈：政治上支持，预算上"想办法"',
        description: '官样文章 + 私下安抚',
        effects: { treasury: -2 },
        pmStatEffects: { politicalCapital: 2 },
        personalLifeEffects: { stress: 4 },
        newsTitle: '总理与军方高层闭门会议',
        newsSummary: '会后总参谋长神色缓和，但海军司令仍一言不发。',
        tone: 'neutral',
      },
    ],
  },

  // ============================================================================
  // 外交 → 战争：边境冲突升级（联动邻国关系 + 制造战争借口）
  // ============================================================================
  {
    id: 'cross_border_incident_escalation',
    title: '边境哨所的枪声',
    category: '军事',
    weight: 0.4,
    minTurn: 10,
    description:
      '凌晨三点，国防部的红色电话响起。东部边境一处哨所昨夜发生交火，两名士兵阵亡，对方也有伤亡。情报显示这并非孤立事件——过去一个月邻国在该地区增兵三个营，侦察机频繁越境。邻国大使已被召见，但他只递来一份"遗憾"声明。军方的电报更直接："这是开战借口，总理。"',
    options: [
      {
        id: 'a',
        label: '高调调兵，宣布进入"战备状态"',
        description: '展示决心，但把局势推向战争边缘',
        effects: { stability: 2, prestige: 3, treasury: -4 },
        pmStatEffects: { politicalCapital: 3 },
        newsTitle: '总理下令东部军区进入战备',
        newsSummary: '国际社会紧急呼吁双方克制，邻国召回大使"磋商"。',
        tone: 'neutral',
        countryEffects: [{ targetNeighbors: true, relationDelta: -8 }],
      },
      {
        id: 'b',
        label: '召见邻国大使，提出严正交涉但克制',
        description: '外交途径优先',
        effects: { diplomacy: 1, prestige: -1 },
        pmStatEffects: { politicalCapital: 1 },
        newsTitle: '外交部向邻国大使提出严正交涉',
        newsSummary: '大使表示将向本国政府转达，但未做出具体承诺。',
        tone: 'neutral',
        countryEffects: [{ targetNeighbors: true, relationDelta: -2 }],
      },
      {
        id: 'c',
        label: '命令情报部门搜集证据，制造战争借口',
        description: '为后续军事行动铺路——这是高风险博弈',
        effects: { treasury: -2, prestige: -2 },
        pmStatEffects: { politicalCapital: -4, riskIndex: 8 },
        personalLifeEffects: { corruption: 6, stress: 8 },
        traitEffects: { integrity: -3 },
        newsTitle: '官方媒体集中报道"边境挑衅"证据',
        newsSummary: '国际观察员对部分证据的真实性提出疑问，但国内民愤已被点燃。',
        tone: 'negative',
        countryEffects: [{ targetNeighbors: true, relationDelta: -12 }],
      },
    ],
  },

  // ============================================================================
  // 法律 → 民意：劳动法修订引发商界反弹（联动生效中的法律 + 商界 NPC）
  // ============================================================================
  {
    id: 'cross_labor_law_industry_backlash',
    title: '工业协会会长的"私人晚宴"',
    category: '政治体制',
    weight: 0.4,
    minTurn: 8,
    description:
      '工业协会会长赵世昌邀请你到他郊外的庄园"共进晚餐"。餐桌上有龙虾、有陈年红酒，还有一份措辞委婉但威胁明确的备忘录——他代表百家会员企业表示："新的劳动法修订让用工成本上升 18%，三家工厂已开始外迁考察。如果总理不能"协调"，我们将不得不"重新评估政治献金的优先级"。"他举起酒杯，灯光在他眼中闪烁。',
    options: [
      {
        id: 'a',
        label: '坚持新法，请他们"适应市场规则"',
        description: '得罪商界，但保住民意基本盘',
        effects: { approval: 3, economy: -3, treasury: -2 },
        pmStatEffects: { politicalCapital: 2 },
        newsTitle: '工业协会公开批评政府"过度管制"',
        newsSummary: '赵世昌在采访中暗示"明年大选资金尚未敲定"。',
        tone: 'neutral',
        delayedConsequence: {
          delayDays: 60,
          title: '多家工厂宣布外迁',
          description: '外资企业联合发布外迁公告，制造业订单外流。失业率出现抬头迹象。',
          effects: { economy: -4, treasury: -3 },
          newsTitle: '制造业寒冬来临',
          newsSummary: '工会与商界同时向政府施压，总理陷入两难。',
        },
      },
      {
        id: 'b',
        label: '私下承诺"放宽执行口径"，但法律不撤回',
        description: '和稀泥，但双方都不满意',
        effects: { economy: 1, approval: -2 },
        pmStatEffects: { politicalCapital: 1 },
        personalLifeEffects: { corruption: 8, stress: 5 },
        newsTitle: '政府澄清"劳动法执行细则正在完善"',
        newsSummary: '工会指责政府"暗箱操作"，商界对"执行口径"持观望态度。',
        tone: 'neutral',
      },
      {
        id: 'c',
        label: '当夜撤回劳动法修订案',
        description: '完全倒向商界',
        effects: { economy: 3, approval: -6, stability: -2 },
        pmStatEffects: { politicalCapital: -5 },
        newsTitle: '总理宣布劳动法修订"暂缓"',
        newsSummary: '工会主席孙铁柱公开发表声明："工人不会忘记是谁背叛了我们。"',
        tone: 'negative',
      },
    ],
  },

  // ============================================================================
  // 腐败 → 丑闻：首富的"二次请托"（联动个人腐败值 + 商界 NPC）
  // ============================================================================
  {
    id: 'cross_tycoon_second_favor',
    title: '钱万通的"二次请托"',
    category: '政治体制',
    weight: 0.4,
    minTurn: 12,
    description:
      '钱万通又一次约你在那家私人会所见面。这次他的姿态放得更低，礼也送得更重——一份厚厚的"政治献金"清单，外加一份"未来十年基建项目联合开发"的协议。他笑得像老朋友："总理，上次的度假区项目运转良好，董事会让我再次向您表达谢意。"他停顿片刻，"另外，最近有记者在打听您夫人海外那套房产的事……我有朋友在媒体界，您看？"',
    options: [
      {
        id: 'a',
        label: '断然拒绝：从此与钱氏集团划清界限',
        description: '亡羊补牢，但已积重难返',
        effects: { economy: -2, prestige: 2 },
        personalLifeEffects: { corruption: -10, stress: 6 },
        traitEffects: { integrity: 5 },
        newsTitle: '钱氏集团宣布"暂停与政府合作"',
        newsSummary: '股价应声下跌，但总理支持率小幅回升。',
        tone: 'positive',
      },
      {
        id: 'b',
        label: '收下献金，托他处理记者',
        description: '彻底滑向深渊',
        effects: { treasury: 4 },
        pmStatEffects: { politicalCapital: 5 },
        personalLifeEffects: { corruption: 18, stress: 8 },
        traitEffects: { integrity: -6 },
        newsTitle: '调查记者"自愿"撤稿',
        newsSummary: '该记者三日后突然宣布"转向其他题材"，业界哗然。',
        tone: 'neutral',
        delayedConsequence: {
          delayDays: 80,
          title: '海外调查记者联盟公布录音',
          description: '一段钱万通在私人会所的录音被匿名泄露，其中提及"总理本人吩咐处理记者"。证据链开始指向总理府。',
          effects: { approval: -8, prestige: -10, stability: -4 },
          newsTitle: '"记者门"录音曝光',
          newsSummary: '反对党要求立即启动弹劾调查，国际媒体齐聚首都。',
        },
      },
      {
        id: 'c',
        label: '婉拒献金，但不追究此前的事',
        description: '试图止血，但不清算',
        effects: { economy: 1 },
        personalLifeEffects: { corruption: 4, stress: 4 },
        traitEffects: { integrity: -2 },
        newsTitle: '钱氏集团"主动"捐赠慈善基金',
        newsSummary: '赵世昌等商界人士注意到："总理在拉开距离，但还是留下了余地。"',
        tone: 'neutral',
      },
    ],
  },

  // ============================================================================
  // 战争 → 总理健康：长期战时压力（联动进行中的战争 + 总理压力）
  // ============================================================================
  {
    id: 'cross_war_pm_burnout',
    title: '战时连轴转：幕僚长的强制休假建议',
    category: '军事',
    weight: 0.5,
    minTurn: 10,
    description:
      '幕僚长把私人医生和心理咨询师一同请进了总理府。"总理，"他语气罕见地强硬，"战争已经持续 60 天，您连续 18 天没有合眼超过 4 小时。医生说您的心电图出现了警示信号，心理咨询师评估您处于"重度职业倦怠"边缘。指挥作战的是参谋长，不是您——但只有您能下最终决心。"窗外的参谋部灯火通明，作战地图上的红色箭头还在缓慢移动。',
    options: [
      {
        id: 'a',
        label: '接受建议，强制休整 3 天',
        description: '短期休整，长期获益',
        effects: { stability: 1 },
        personalLifeEffects: { stress: -15, familyRelation: 5 },
        traitEffects: { health: 6, resilience: 3 },
        newsTitle: '总理短暂休整后重返指挥岗位',
        newsSummary: '幕僚透露总理"在书房补看了三小时战报后入睡"。',
        tone: 'neutral',
      },
      {
        id: 'b',
        label: '拒绝，继续亲自坐镇指挥',
        description: '国家等不起，但身体在抗议',
        effects: { prestige: 2, stability: -1 },
        personalLifeEffects: { stress: 12 },
        traitEffects: { health: -5, decisiveness: -2 },
        newsTitle: '总理连轴工作引健康担忧',
        newsSummary: '医生在记者会上婉转表达"总理需要更多休息"。',
        tone: 'negative',
        delayedConsequence: {
          delayDays: 30,
          title: '总理在战情室晕倒',
          description: '连续工作 40 小时后，总理在战情室晕倒，被搀扶出指挥岗位。军方暂时接管日常战局，舆论哗然。',
          effects: { approval: -4, stability: -3, prestige: -5 },
          newsTitle: '总理健康突发状况震惊全国',
          newsSummary: '战时指挥权短暂移交引发国际关注，邻国趁机在边境增兵。',
        },
      },
    ],
  },

  // ============================================================================
  // 经济 + 外交：大国特使的"贸易谈判"（联动税率 + 大国关系）
  // ============================================================================
  {
    id: 'cross_great_power_trade_deal',
    title: '大国特使的"互利协议"',
    category: '外交',
    weight: 0.5,
    minTurn: 6,
    description:
      '大国特使塞缪尔·哈里森在五星级酒店的总统套房接待你。红酒、雪茄、低声的爵士乐——他显然想营造"老朋友"的氛围。"总理阁下，"他递来一份协议，"我国愿意将您的出口关税下调 15%，开放我们的金融市场给您的主要企业——条件是，您把当前税率下调一档，并停止对邻国的制裁。互利共赢，不是吗？"',
    options: [
      {
        id: 'a',
        label: '全盘接受，签署自由贸易协议',
        description: '经济大幅提振，但牺牲对邻国筹码',
        effects: { economy: 6, treasury: 2, approval: 2 },
        secondaryEffects: { industrialOutput: 4, employmentRate: 2 },
        pmStatEffects: { politicalCapital: 3 },
        newsTitle: '我国与大国签署历史性贸易协议',
        newsSummary: '股市当日上涨 4.2%，工厂订单激增。',
        tone: 'positive',
        countryEffects: [
          { targetAll: true, relationDelta: 3 },
          { targetNeighbors: true, setSanctioned: false },
        ],
      },
      {
        id: 'b',
        label: '只接受关税下调，拒绝解除制裁',
        description: '讨价还价，但可能激怒大国',
        effects: { economy: 3, diplomacy: -2 },
        pmStatEffects: { politicalCapital: 1 },
        newsTitle: '贸易谈判部分达成',
        newsSummary: '哈里森在记者会上"遗憾地表示未能达成全面协议"。',
        tone: 'neutral',
        countryEffects: [{ targetAll: true, relationDelta: -2 }],
      },
      {
        id: 'c',
        label: '拒绝：保护本国产业与对邻国筹码',
        description: '经济保守，但保留主动权',
        effects: { economy: -2, diplomacy: -1, prestige: 1 },
        pmStatEffects: { politicalCapital: -2 },
        newsTitle: '我国拒绝大国贸易要约',
        newsSummary: '大国特使公开表示"深感失望"，宣布"重新评估双边关系"。',
        tone: 'negative',
        countryEffects: [{ targetAll: true, relationDelta: -5 }],
      },
    ],
  },

  // ============================================================================
  // 宗教 → 社会：宗教界领袖的"道德追问"（联动社会团结 + 道德特质）
  // ============================================================================
  {
    id: 'cross_religion_moral_question',
    title: '慧明法师的"道德之问"',
    category: '社会',
    weight: 0.4,
    minTurn: 14,
    description:
      `慧明法师通过中间人请求一次"私下见面"。地点选在城郊的一座小庙，他身着灰色僧袍，盘膝而坐，桌上只有一壶粗茶。"总理，"他开口，"信众们近来不安。贫富悬殊加剧，官场传闻纷扰，老人在询问'国家还相信什么'。您愿意为民众做一次公开的精神告白吗？让国家知道您心里装着什么。"`,
    options: [
      {
        id: 'a',
        label: '接受邀约：发表"国家信念"电视讲话',
        description: '直面道德焦虑，可能触动人心',
        effects: { approval: 4, stability: 2, prestige: 1 },
        secondaryEffects: { socialCohesion: 3 },
        traitEffects: { charisma: 2 },
        newsTitle: '总理电视讲话获宗教界好评',
        newsSummary: '慧明法师表示"国家再次有了精神锚点"。',
        tone: 'positive',
      },
      {
        id: 'b',
        label: '婉拒，但承诺推进社会福利改革',
        description: '用政策代替精神',
        effects: { treasury: -2, approval: 1 },
        secondaryEffects: { socialCohesion: 1 },
        newsTitle: '政府宣布福利改革时间表',
        newsSummary: '慧明法师不置可否："行动胜于言辞，但愿如此。"',
        tone: 'neutral',
      },
      {
        id: 'c',
        label: '不回应：政教分离，国事不劳宗教',
        description: '保持距离，但失去道德高地',
        effects: { stability: -1, prestige: -1 },
        secondaryEffects: { socialCohesion: -2 },
        newsTitle: '宗教界对政府保持沉默',
        newsSummary: '部分信众开始转向反对党，慧明法师婉拒媒体采访。',
        tone: 'neutral',
      },
    ],
  },

  // ============================================================================
  // 媒体 + 总理健康：通讯社社长的"独家专访"
  // ============================================================================
  {
    id: 'cross_media_boss_interview',
    title: '通讯社社长的"独家专访"邀约',
    category: '政治体制',
    weight: 0.5,
    minTurn: 8,
    description:
      '国家通讯社社长吴文华亲自登门拜访，递上一份访谈提纲。"总理，民调数据显示您的支持率近半年下滑了 12 个百分点。我们想给您一次全国黄金时段的独家专访——70 分钟，无剪辑直播。提纲我先发您过目。"他停顿，"当然，我们会问一些尖锐的问题。但您若答得好，能让国家重新看到您的样子。"',
    options: [
      {
        id: 'a',
        label: '接受专访，准备充分',
        description: '高风险高回报',
        effects: { approval: 5, prestige: 2 },
        traitEffects: { charisma: 2 },
        pmStatEffects: { rhetoric: 3 },
        newsTitle: '总理专访收视率创近三年新高',
        newsSummary: '吴文华在采访中以"温和而尖锐"著称，但总理对答如流。',
        tone: 'positive',
      },
      {
        id: 'b',
        label: '接受专访，但要求"温和无害"的题目',
        description: '安全，但失去机会',
        effects: { approval: 1, prestige: -1 },
        personalLifeEffects: { stress: 3 },
        newsTitle: '总理专访评价两极',
        newsSummary: '观众普遍认为"像念政府工作报告"，吴文华本人未公开置评。',
        tone: 'neutral',
      },
      {
        id: 'c',
        label: '婉拒专访，发书面声明代替',
        description: '回避镜头，留下"软弱"印象',
        effects: { approval: -2, prestige: -2 },
        pmStatEffects: { politicalCapital: -2 },
        newsTitle: '总理婉拒电视专访',
        newsSummary: '吴文华公开表示"遗憾"，反对党开始炒作"总理不敢面对公众"。',
        tone: 'negative',
      },
    ],
  },

  // ============================================================================
  // 国际组织 + 制裁：诺沃代表的"人权质询"
  // ============================================================================
  {
    id: 'cross_intl_org_human_rights_query',
    title: '国际组织代表的"人权质询函"',
    category: '外交',
    weight: 0.4,
    minTurn: 12,
    description:
      `国际组织代表安吉拉·诺沃送来一份措辞礼貌但内容严厉的质询函。"总理阁下，"她用流利的中文说，"我国近期通过的《公共安全维护法》引发了国际关注。条款中的'预防性拘押'与'言论管控'部分与我们组织的基本准则存在明显冲突。我受托转达：若贵国在 60 天内未能做出修订，将面临降级审查，并可能触发联合制裁程序。"`,
    options: [
      {
        id: 'a',
        label: '承诺修订争议条款，主动合作',
        description: '让步以避免制裁',
        effects: { stability: -2, diplomacy: 3 },
        secondaryEffects: { majorPowerRelations: 2, orgInfluence: 2 },
        pmStatEffects: { politicalCapital: -2 },
        newsTitle: '政府宣布修订《公共安全维护法》',
        newsSummary: '诺沃表示"乐见进展"，国际组织暂停审查程序。',
        tone: 'positive',
        countryEffects: [{ targetAll: true, relationDelta: 2 }],
      },
      {
        id: 'b',
        label: '拒绝修订：内政不容干涉',
        description: '保住国内强硬派支持，但承担外交代价',
        effects: { approval: 2, diplomacy: -4, prestige: -2 },
        secondaryEffects: { majorPowerRelations: -3, orgInfluence: -4 },
        pmStatEffects: { politicalCapital: 2 },
        newsTitle: '总理强硬回应国际组织质询',
        newsSummary: '国内民愤被点燃，但国际信用评级被下调。',
        tone: 'negative',
        countryEffects: [{ targetAll: true, relationDelta: -4 }],
        delayedConsequence: {
          delayDays: 60,
          title: '国际组织启动联合制裁程序',
          description: '诺沃所在组织正式通过制裁决议，多个成员国宣布暂停与我国的贸易优惠。',
          effects: { economy: -5, treasury: -3, diplomacy: -6 },
          newsTitle: '国际制裁决议正式生效',
          newsSummary: '出口行业哀鸿遍野，多家工厂宣布裁员。',
        },
      },
      {
        id: 'c',
        label: '私下与诺沃"沟通"，争取延期',
        description: '走钢丝',
        effects: { diplomacy: -1 },
        pmStatEffects: { politicalCapital: -1 },
        personalLifeEffects: { corruption: 4, stress: 5 },
        newsTitle: '政府与国际组织"持续对话"',
        newsSummary: '诺沃态度缓和，但未做出明确承诺。',
        tone: 'neutral',
      },
    ],
  },

  // ============================================================================
  // 党内 + 总理：党内竞争对手的"逼宫"
  // ============================================================================
  {
    id: 'cross_party_rival_challenge',
    title: '党内竞争对手的"路线之争"',
    category: '政治体制',
    weight: 0.4,
    minTurn: 14,
    description:
      `党内竞争对手刘伟华在中委会会议上突然发难，递交了一份"路线反思"文件，措辞温和但刀刀见血。他直言："总理的支持率持续下滑，党内基层开始流失，我们需要一次'坦诚的路线检讨'——是否应该重新评估施政方向？"会议室空气凝滞，所有目光聚焦在你身上。中委会 30 名成员中，至少 8 人眼神闪烁。`,
    options: [
      {
        id: 'a',
        label: '直面辩论：在中委会陈述施政愿景',
        description: '用魅力与论据赢回支持',
        effects: { approval: 2, prestige: 2 },
        traitEffects: { charisma: 2 },
        pmStatEffects: { politicalCapital: 3, partyPrestige: 4, rhetoric: 3 },
        newsTitle: '总理在中委会力挽狂澜',
        newsSummary: '刘伟华的"反思"未能通过表决，但党内裂痕已显现。',
        tone: 'positive',
      },
      {
        id: 'b',
        label: '私下让步：让刘伟华进入内阁',
        description: '政治交易',
        effects: { stability: 1 },
        pmStatEffects: { politicalCapital: -3, partyPrestige: -2 },
        personalLifeEffects: { corruption: 5, stress: 4 },
        newsTitle: '刘伟华获任内阁要职',
        newsSummary: '"路线反思"被搁置，但党内观察人士指出"总理做了让步"。',
        tone: 'neutral',
      },
      {
        id: 'c',
        label: '强硬回应：直接清除异己',
        description: '展示权力，但留下隐患',
        effects: { stability: -2, prestige: -1 },
        pmStatEffects: { politicalCapital: 4, partyPrestige: -3, riskIndex: 5 },
        personalLifeEffects: { stress: 6 },
        newsTitle: '党内数名要员被调整职务',
        newsSummary: '刘伟华本人被"另有任用"，但其派系开始暗中串联。',
        tone: 'negative',
        delayedConsequence: {
          delayDays: 90,
          title: '党内派系公开分裂',
          description: '刘伟华派系联合反对党发起"路线公投"，党内分裂公开化。',
          effects: { stability: -5, approval: -3, prestige: -4 },
          newsTitle: '执政党出现历史性分裂',
          newsSummary: '多家地方党委公开表态"支持路线反思"。',
        },
      },
    ],
  },
]

/**
 * 跨系统事件状态权重提升函数
 *
 * 给定一个事件和当前游戏状态，返回该事件的动态权重倍数。
 * 状态匹配时大幅提权（×5~×8），否则保持基础权重。
 * 在 eventEngine.ts 的 pickEvent 中调用。
 */
export function getCrossSystemEventWeight(eventId: string, state: GameState): number {
  switch (eventId) {
    case 'cross_unemployment_union_pressure':
      // 失业率 > 10 时大幅提权
      return state.macro?.unemployment > 10 ? 6 : state.macro?.unemployment > 7 ? 2 : 0.2

    case 'cross_military_budget_memo':
      // 军费 < 2% 或陆军战备 < 40 时触发
      if (!state.military) return 0.2
      return state.military.defenseBudget < 2 || state.military.branches.army.readiness < 40 ? 6 : 0.5

    case 'cross_border_incident_escalation':
      // 邻国关系 < 50 或处于紧张时触发
      if (!state.countries?.length) return 0.3
      const worstNeighbor = Math.min(
        ...state.countries.filter((c) => c.isNeighbor).map((c) => c.relation),
      )
      return worstNeighbor < 50 ? 6 : worstNeighbor < 65 ? 2 : 0.3

    case 'cross_labor_law_industry_backlash':
      // 劳动法律非默认档 + 经济不稳时触发
      const laborLaw = state.activeLaws?.['labor_regulation']
      return laborLaw && laborLaw !== 'mixed_labor' ? (state.metrics.economy < 50 ? 6 : 3) : 0.2

    case 'cross_tycoon_second_favor':
      // 总理腐败值 > 30 时触发（黑金路径专属）
      return state.personalLife?.corruption > 30 ? 7 : 0.2

    case 'cross_war_pm_burnout':
      // 仅在战争进行中触发
      return state.activeWar && !state.activeWar.ended ? 8 : 0.1

    case 'cross_great_power_trade_deal':
      // 税率较高 + 大国关系 < 60 时触发
      const gpRelation = state.countries?.find((c) => !c.isNeighbor)?.relation ?? 50
      return (state.taxRate === 'high' || state.taxRate === 'very_high') && gpRelation < 60 ? 5 : 1

    case 'cross_religion_moral_question':
      // 社会团结 < 40 或道德特质 < 40 时触发
      return state.secondary?.socialCohesion < 40 || state.pmTraitsNumeric.integrity < 40 ? 5 : 0.5

    case 'cross_media_boss_interview':
      // 民意 < 45 时触发（媒体危机公关）
      return state.metrics.approval < 45 ? 5 : 0.5

    case 'cross_intl_org_human_rights_query':
      // 国际组织影响力 < 50 或与大国关系紧张时触发
      return state.secondary?.orgInfluence < 50 ? 5 : 0.5

    case 'cross_party_rival_challenge':
      // 党内威望 < 50 或民意 < 40 时触发
      return state.pmStats.partyPrestige < 50 || state.metrics.approval < 40 ? 6 : 0.3

    default:
      return 1
  }
}
