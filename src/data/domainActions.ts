import type { Metrics, PMStats, SecondaryMetrics, NewsTone } from '@/types/game'

/** 领域类型：军事/社会/经济/环境 */
export type DomainType = 'military' | 'society' | 'economy' | 'environment'

/** 领域行动定义 */
export interface DomainAction {
  /** 唯一 ID */
  id: string
  /** 所属领域 */
  domain: DomainType
  /** 行动名称 */
  label: string
  /** 行动描述 */
  description: string
  /** 图标 */
  icon: string
  /** 行动类别（用于页面分组） */
  category: string
  /** 政治资本代价 */
  politicalCapitalCost: number
  /** 国库代价 */
  treasuryCost?: number
  /** 冷却回合数 */
  cooldown: number
  /** 前置条件（指标阈值） */
  prerequisites?: Partial<Metrics>
  /** 一次性效果：一级指标 */
  metricEffects: Partial<Metrics>
  /** 一次性效果：二级指标 */
  secondaryEffects?: Partial<SecondaryMetrics>
  /** 一次性效果：总理个人数值 */
  pmStatEffects?: Partial<PMStats>
  /** 产生的新闻 */
  news: {
    title: string
    summary: string
    tone: NewsTone
  }
  /** 是否只能执行一次 */
  once?: boolean
}

/** 领域元信息 */
export interface DomainMeta {
  type: DomainType
  label: string
  icon: string
  /** 主色调 */
  color: string
  /** 关联的一级指标 key */
  primaryMetric: keyof Metrics
  /** 关联的二级指标 key 列表 */
  secondaryMetrics: (keyof SecondaryMetrics)[]
  /** 现状描述文案模板 */
  statusTitle: string
}

/** 四大领域元信息 */
export const DOMAIN_META: Record<DomainType, DomainMeta> = {
  military: {
    type: 'military',
    label: '军事',
    icon: '⚔️',
    color: '#b34554',
    primaryMetric: 'stability',
    secondaryMetrics: ['crimeRate', 'socialCohesion'],
    statusTitle: '国防与军力现状',
  },
  society: {
    type: 'society',
    label: '社会',
    icon: '👥',
    color: '#e0c98a',
    primaryMetric: 'approval',
    secondaryMetrics: ['urbanSupport', 'ruralSupport', 'youthSupport', 'socialCohesion'],
    statusTitle: '社会与文化现状',
  },
  economy: {
    type: 'economy',
    label: '经济',
    icon: '📈',
    color: '#c9a961',
    primaryMetric: 'economy',
    secondaryMetrics: ['industrialOutput', 'agriculturalOutput', 'employmentRate', 'inflationRate', 'fiscalSurplus'],
    statusTitle: '经济与产业现状',
  },
  environment: {
    type: 'environment',
    label: '环境',
    icon: '🌱',
    color: '#7a9d55',
    primaryMetric: 'prestige',
    secondaryMetrics: ['socialCohesion'],
    statusTitle: '生态与环境现状',
  },
}

/** 军事领域行动 */
const MILITARY_ACTIONS: DomainAction[] = [
  {
    id: 'mil_recruit',
    domain: 'military',
    label: '扩军征召',
    description: '扩大征兵规模，增加常备军力。军力提升但财政与民意承压。',
    icon: '🎖️',
    category: '军力建设',
    politicalCapitalCost: 8,
    treasuryCost: 10,
    cooldown: 4,
    prerequisites: { stability: 40 },
    metricEffects: { stability: 3, prestige: 2, treasury: -3, approval: -2 },
    secondaryEffects: { crimeRate: -2 },
    pmStatEffects: { politicalCapital: -2 },
    news: {
      title: '政府宣布扩军计划',
      summary: '国防部公布新征兵令，年内将扩充两个师的常备兵力。',
      tone: 'neutral',
    },
  },
  {
    id: 'mil_drill',
    domain: 'military',
    label: '联合军演',
    description: '组织三军联合演习，提升战备水平与威慑力。',
    icon: '🚢',
    category: '军力建设',
    politicalCapitalCost: 5,
    treasuryCost: 6,
    cooldown: 3,
    metricEffects: { stability: 2, prestige: 3, diplomacy: -1 },
    secondaryEffects: { socialCohesion: 1 },
    news: {
      title: '三军联合演习圆满落幕',
      summary: '为期一周的联合军演展示了国防实力，国际社会高度关注。',
      tone: 'positive',
    },
  },
  {
    id: 'mil_weapon',
    domain: 'military',
    label: '武器装备升级',
    description: '采购新型武器装备，更新老旧军备，提升现代化水平。',
    icon: '🔧',
    category: '装备研发',
    politicalCapitalCost: 10,
    treasuryCost: 15,
    cooldown: 6,
    prerequisites: { treasury: 40 },
    metricEffects: { stability: 2, prestige: 4, treasury: -5 },
    news: {
      title: '军方接收新型装备',
      summary: '首批新型主战坦克与战机列装部队，军力现代化迈出关键一步。',
      tone: 'positive',
    },
  },
  {
    id: 'mil_veteran',
    domain: 'military',
    label: '优待退伍军人',
    description: '提高退伍军人待遇，安置转业，稳固军方支持。',
    icon: '🏅',
    category: '军民关系',
    politicalCapitalCost: 6,
    treasuryCost: 8,
    cooldown: 4,
    metricEffects: { approval: 3, stability: 2, treasury: -2 },
    secondaryEffects: { socialCohesion: 2 },
    news: {
      title: '退伍军人保障法修订通过',
      summary: '新法大幅提高退伍军人津贴与就业安置力度，获社会各界好评。',
      tone: 'positive',
    },
  },
  {
    id: 'mil_anti_terror',
    domain: 'military',
    label: '反恐专项行动',
    description: '开展反恐清剿行动，打击极端势力，维护国家安全。',
    icon: '🛡️',
    category: '安全维护',
    politicalCapitalCost: 12,
    treasuryCost: 8,
    cooldown: 8,
    prerequisites: { stability: 30 },
    metricEffects: { stability: 5, approval: 2, prestige: 2 },
    secondaryEffects: { crimeRate: -5, socialCohesion: 2 },
    pmStatEffects: { riskIndex: 3 },
    news: {
      title: '反恐行动取得重大成果',
      summary: '安全部队成功捣毁多个极端组织据点，社会治安显著改善。',
      tone: 'positive',
    },
  },
  {
    id: 'mil_border',
    domain: 'military',
    label: '边防加固',
    description: '强化边境防御工事与巡逻，防止非法越境与走私。',
    icon: '🗻',
    category: '安全维护',
    politicalCapitalCost: 7,
    treasuryCost: 10,
    cooldown: 5,
    metricEffects: { stability: 3, treasury: -2 },
    secondaryEffects: { crimeRate: -3 },
    news: {
      title: '边境防御体系全面升级',
      summary: '新边防防线竣工，走私与非法越境案件大幅下降。',
      tone: 'neutral',
    },
  },
]

/** 社会（含文化）领域行动 */
const SOCIETY_ACTIONS: DomainAction[] = [
  {
    id: 'soc_education',
    domain: 'society',
    label: '教育投入',
    description: '增加教育经费，改善学校设施，提升国民素质。',
    icon: '📚',
    category: '民生保障',
    politicalCapitalCost: 8,
    treasuryCost: 12,
    cooldown: 4,
    metricEffects: { approval: 4, economy: 1, treasury: -3 },
    secondaryEffects: { youthSupport: 5, urbanSupport: 2 },
    news: {
      title: '教育预算创历史新高',
      summary: '政府公布新教育发展纲要，大幅增加基础教育投入。',
      tone: 'positive',
    },
  },
  {
    id: 'soc_healthcare',
    domain: 'society',
    label: '医疗体系改革',
    description: '推进医保覆盖，建设新医院，改善医疗服务。',
    icon: '🏥',
    category: '民生保障',
    politicalCapitalCost: 10,
    treasuryCost: 15,
    cooldown: 5,
    metricEffects: { approval: 5, stability: 2, treasury: -4 },
    secondaryEffects: { urbanSupport: 3, ruralSupport: 3 },
    news: {
      title: '全民医保体系扩展',
      summary: '新一批公立医院落成，医保覆盖率提升至历史新高。',
      tone: 'positive',
    },
  },
  {
    id: 'soc_culture_festival',
    domain: 'society',
    label: '举办文化节',
    description: '组织全国性文化节庆活动，弘扬传统文化，凝聚民族认同。',
    icon: '🎭',
    category: '文化事业',
    politicalCapitalCost: 5,
    treasuryCost: 6,
    cooldown: 3,
    metricEffects: { approval: 3, prestige: 2, treasury: -1 },
    secondaryEffects: { socialCohesion: 4 },
    news: {
      title: '国家文化节盛大开幕',
      summary: '为期一个月的文化节吸引数百万民众参与，传统文化焕发新生。',
      tone: 'positive',
    },
  },
  {
    id: 'soc_heritage',
    domain: 'society',
    label: '文化遗产保护',
    description: '修缮历史遗迹，保护非物质文化遗产，传承文明。',
    icon: '🏛️',
    category: '文化事业',
    politicalCapitalCost: 6,
    treasuryCost: 8,
    cooldown: 4,
    metricEffects: { prestige: 3, approval: 2, treasury: -2 },
    secondaryEffects: { socialCohesion: 2 },
    news: {
      title: '古迹修复工程竣工',
      summary: '多处国家级文物完成修缮，联合国教科文组织予以表彰。',
      tone: 'positive',
    },
  },
  {
    id: 'soc_employment',
    domain: 'society',
    label: '就业促进计划',
    description: '推出就业补贴与培训计划，降低失业率。',
    icon: '💼',
    category: '民生保障',
    politicalCapitalCost: 9,
    treasuryCost: 12,
    cooldown: 4,
    prerequisites: { economy: 35 },
    metricEffects: { approval: 4, economy: 2, treasury: -3 },
    secondaryEffects: { employmentRate: 5, urbanSupport: 2 },
    news: {
      title: '就业促进法案生效',
      summary: '新法案为企业提供招聘补贴，预计创造十万个就业岗位。',
      tone: 'positive',
    },
  },
  {
    id: 'soc_pension',
    domain: 'society',
    label: '提高养老金',
    description: '上调基础养老金标准，改善老年人生活。',
    icon: '👴',
    category: '民生保障',
    politicalCapitalCost: 7,
    treasuryCost: 10,
    cooldown: 5,
    metricEffects: { approval: 4, stability: 2, treasury: -3 },
    secondaryEffects: { ruralSupport: 4 },
    news: {
      title: '养老金标准上调',
      summary: '政府宣布基础养老金每月增加200元，惠及千万老人。',
      tone: 'positive',
    },
  },
  {
    id: 'soc_media',
    domain: 'society',
    label: '文化输出推广',
    description: '扶持文化产业出海，提升国际文化影响力。',
    icon: '🎬',
    category: '文化事业',
    politicalCapitalCost: 8,
    treasuryCost: 8,
    cooldown: 5,
    prerequisites: { prestige: 40 },
    metricEffects: { prestige: 4, diplomacy: 2, treasury: -2 },
    secondaryEffects: { socialCohesion: 2 },
    news: {
      title: '国家文化输出战略启动',
      summary: '多部国产影视作品登陆国际平台，文化软实力显著提升。',
      tone: 'positive',
    },
  },
  {
    id: 'soc_anti_crime',
    domain: 'society',
    label: '治安整治行动',
    description: '开展全国治安整治，打击违法犯罪，净化社会环境。',
    icon: '🚔',
    category: '社会治安',
    politicalCapitalCost: 6,
    treasuryCost: 6,
    cooldown: 4,
    metricEffects: { stability: 3, approval: 2, treasury: -1 },
    secondaryEffects: { crimeRate: -6, socialCohesion: 1 },
    news: {
      title: '全国治安整治行动启动',
      summary: '警方开展百日治安行动，各类犯罪率显著下降。',
      tone: 'neutral',
    },
  },
]

/** 经济领域行动 */
const ECONOMY_ACTIONS: DomainAction[] = [
  {
    id: 'eco_infra',
    domain: 'economy',
    label: '基础设施建设',
    description: '投资交通、能源等大型基建项目，拉动经济增长。',
    icon: '🏗️',
    category: '产业投资',
    politicalCapitalCost: 10,
    treasuryCost: 18,
    cooldown: 5,
    metricEffects: { economy: 4, approval: 2, treasury: -5 },
    secondaryEffects: { industrialOutput: 4, employmentRate: 3 },
    news: {
      title: '国家基建投资计划启动',
      summary: '政府公布万亿基建计划，多个重点项目同期开工。',
      tone: 'positive',
    },
  },
  {
    id: 'eco_tax_cut',
    domain: 'economy',
    label: '减税降费',
    description: '降低企业与个人税负，激发市场活力。',
    icon: '💰',
    category: '财税政策',
    politicalCapitalCost: 12,
    treasuryCost: 8,
    cooldown: 6,
    metricEffects: { economy: 3, approval: 3, treasury: -4 },
    secondaryEffects: { industrialOutput: 3, employmentRate: 2 },
    news: {
      title: '新一轮减税降费政策落地',
      summary: '增值税与企业所得税税率下调，企业负担显著减轻。',
      tone: 'positive',
    },
  },
  {
    id: 'eco_industry',
    domain: 'economy',
    label: '产业升级',
    description: '推动传统产业技术改造，发展高端制造业。',
    icon: '🏭',
    category: '产业投资',
    politicalCapitalCost: 10,
    treasuryCost: 14,
    cooldown: 5,
    prerequisites: { economy: 45 },
    metricEffects: { economy: 5, treasury: -3 },
    secondaryEffects: { industrialOutput: 6, employmentRate: -1 },
    news: {
      title: '产业升级专项基金设立',
      summary: '政府设立千亿产业升级基金，重点支持高端制造业。',
      tone: 'positive',
    },
  },
  {
    id: 'eco_agriculture',
    domain: 'economy',
    label: '农业现代化',
    description: '推广农业机械与新技术，保障粮食安全。',
    icon: '🌾',
    category: '产业投资',
    politicalCapitalCost: 7,
    treasuryCost: 10,
    cooldown: 4,
    metricEffects: { economy: 2, approval: 2, treasury: -2 },
    secondaryEffects: { agriculturalOutput: 5, ruralSupport: 3 },
    news: {
      title: '农业现代化推进计划',
      summary: '新一批农机补贴下发，智慧农业试点扩大至全国。',
      tone: 'positive',
    },
  },
  {
    id: 'eco_trade',
    domain: 'economy',
    label: '促进出口',
    description: '出台出口鼓励政策，扩大国际贸易份额。',
    icon: '📦',
    category: '经贸发展',
    politicalCapitalCost: 8,
    treasuryCost: 6,
    cooldown: 4,
    prerequisites: { diplomacy: 35 },
    metricEffects: { economy: 3, treasury: 2, diplomacy: 1 },
    secondaryEffects: { industrialOutput: 2, forexReserves: 4 },
    news: {
      title: '出口促进新政发布',
      summary: '政府提高出口退税率，企业海外订单显著增长。',
      tone: 'positive',
    },
  },
  {
    id: 'eco_inflation',
    domain: 'economy',
    label: '物价调控',
    description: '介入市场稳定物价，抑制通胀过热。',
    icon: '⚖️',
    category: '财税政策',
    politicalCapitalCost: 6,
    treasuryCost: 8,
    cooldown: 3,
    metricEffects: { approval: 2, economy: -1, treasury: -2 },
    secondaryEffects: { inflationRate: -5 },
    news: {
      title: '政府出手稳定物价',
      summary: '经济规划部门投放储备物资，民生商品价格回落。',
      tone: 'neutral',
    },
  },
  {
    id: 'eco_fintech',
    domain: 'economy',
    label: '金融科技发展',
    description: '扶持金融科技产业，提升金融服务效率。',
    icon: '💳',
    category: '产业投资',
    politicalCapitalCost: 9,
    treasuryCost: 8,
    cooldown: 5,
    prerequisites: { economy: 50 },
    metricEffects: { economy: 3, treasury: 2, prestige: 1 },
    secondaryEffects: { fiscalSurplus: 2, industrialOutput: 2 },
    news: {
      title: '金融科技产业园区落成',
      summary: '国家级金融科技产业园开园，吸引百家企业入驻。',
      tone: 'positive',
    },
  },
  {
    id: 'eco_sme',
    domain: 'economy',
    label: '扶持中小企业',
    description: '为中小企业提供低息贷款与政策支持。',
    icon: '🏪',
    category: '财税政策',
    politicalCapitalCost: 7,
    treasuryCost: 10,
    cooldown: 4,
    metricEffects: { economy: 2, approval: 2, treasury: -3 },
    secondaryEffects: { employmentRate: 4, industrialOutput: 2 },
    news: {
      title: '中小企业扶持计划启动',
      summary: '新设专项贷款基金，中小企业融资难题得到缓解。',
      tone: 'positive',
    },
  },
]

/** 环境领域行动 */
const ENVIRONMENT_ACTIONS: DomainAction[] = [
  {
    id: 'env_reforest',
    domain: 'environment',
    label: '植树造林',
    description: '开展大规模国土绿化行动，提升森林覆盖率。',
    icon: '🌳',
    category: '生态修复',
    politicalCapitalCost: 5,
    treasuryCost: 8,
    cooldown: 3,
    metricEffects: { approval: 2, prestige: 1, treasury: -2 },
    secondaryEffects: { socialCohesion: 1 },
    news: {
      title: '国土绿化行动启动',
      summary: '全国义务植树月活动展开，年内计划造林百万亩。',
      tone: 'positive',
    },
  },
  {
    id: 'env_renewable',
    domain: 'environment',
    label: '可再生能源',
    description: '投资风能、太阳能等清洁能源，减少化石依赖。',
    icon: '☀️',
    category: '绿色发展',
    politicalCapitalCost: 10,
    treasuryCost: 15,
    cooldown: 6,
    prerequisites: { economy: 40 },
    metricEffects: { economy: 1, prestige: 3, treasury: -4, diplomacy: 1 },
    secondaryEffects: { industrialOutput: 1 },
    news: {
      title: '清洁能源基地投产',
      summary: '大型光伏与风电基地并网发电，可再生能源占比创新高。',
      tone: 'positive',
    },
  },
  {
    id: 'env_pollution',
    domain: 'environment',
    label: '污染治理',
    description: '加强工业污染排放管控，改善空气与水质。',
    icon: '🌫️',
    category: '污染治理',
    politicalCapitalCost: 8,
    treasuryCost: 12,
    cooldown: 4,
    metricEffects: { approval: 3, economy: -1, treasury: -3, prestige: 1 },
    secondaryEffects: { urbanSupport: 3 },
    news: {
      title: '污染防治攻坚见效',
      summary: '主要城市空气质量显著改善，多条河流水质恢复达标。',
      tone: 'positive',
    },
  },
  {
    id: 'env_protect',
    domain: 'environment',
    label: '自然保护区',
    description: '设立新的自然保护区，保护生物多样性。',
    icon: '🦌',
    category: '生态修复',
    politicalCapitalCost: 6,
    treasuryCost: 6,
    cooldown: 4,
    metricEffects: { prestige: 2, approval: 2, treasury: -1 },
    secondaryEffects: { socialCohesion: 1 },
    news: {
      title: '新增国家级自然保护区',
      summary: '内阁批准设立三处国家级自然保护区，珍稀物种栖息地得到保护。',
      tone: 'positive',
    },
  },
  {
    id: 'env_recycle',
    domain: 'environment',
    label: '循环经济推广',
    description: '推广垃圾分类与资源回收，发展循环经济。',
    icon: '♻️',
    category: '绿色发展',
    politicalCapitalCost: 5,
    treasuryCost: 6,
    cooldown: 3,
    metricEffects: { approval: 2, economy: 1, treasury: -1 },
    secondaryEffects: { urbanSupport: 2 },
    news: {
      title: '垃圾分类全国推行',
      summary: '新版垃圾分类管理条例实施，资源回收率大幅提升。',
      tone: 'neutral',
    },
  },
  {
    id: 'env_climate',
    domain: 'environment',
    label: '气候承诺',
    description: '履行国际气候协定，承诺减排目标，提升国际形象。',
    icon: '🌍',
    category: '国际合作',
    politicalCapitalCost: 10,
    treasuryCost: 8,
    cooldown: 8,
    prerequisites: { diplomacy: 40 },
    metricEffects: { diplomacy: 3, prestige: 4, economy: -2, approval: 1 },
    news: {
      title: '国家气候行动方案公布',
      summary: '政府承诺2030年碳达峰，国际社会给予高度评价。',
      tone: 'positive',
    },
  },
  {
    id: 'env_water',
    domain: 'environment',
    label: '水资源保护',
    description: '治理水体污染，保护水源地，提升饮水安全。',
    icon: '💧',
    category: '污染治理',
    politicalCapitalCost: 7,
    treasuryCost: 10,
    cooldown: 4,
    metricEffects: { approval: 3, treasury: -2, prestige: 1 },
    secondaryEffects: { ruralSupport: 3, urbanSupport: 2 },
    news: {
      title: '水源地保护工程竣工',
      summary: '全国主要水源地保护工程完工，饮用水安全得到保障。',
      tone: 'positive',
    },
  },
  {
    id: 'env_organic',
    domain: 'environment',
    label: '有机农业推广',
    description: '推广有机种植，减少农药化肥使用，提升食品安全。',
    icon: '🥬',
    category: '绿色发展',
    politicalCapitalCost: 6,
    treasuryCost: 8,
    cooldown: 4,
    metricEffects: { approval: 2, economy: -1, treasury: -2, prestige: 1 },
    secondaryEffects: { agriculturalOutput: -1, ruralSupport: 2 },
    news: {
      title: '有机农业示范区扩容',
      summary: '新增十个有机农业示范省，绿色食品认证体系完善。',
      tone: 'positive',
    },
  },
]

/** 所有领域行动合集 */
export const DOMAIN_ACTIONS: DomainAction[] = [
  ...MILITARY_ACTIONS,
  ...SOCIETY_ACTIONS,
  ...ECONOMY_ACTIONS,
  ...ENVIRONMENT_ACTIONS,
]

/** 按领域获取行动列表 */
export function getActionsByDomain(domain: DomainType): DomainAction[] {
  return DOMAIN_ACTIONS.filter((a) => a.domain === domain)
}

/** 按 ID 获取行动 */
export function getActionById(id: string): DomainAction | undefined {
  return DOMAIN_ACTIONS.find((a) => a.id === id)
}
