import type { GameState, NewsItem } from '@/types/game'

/** 环境新闻（背景新闻）模板
 *  每月初按当前指标状态从对应池中随机抽取 1-2 条
 *  用于丰富新闻流、强化沉浸感、不阻塞玩家决策
 */

interface AmbientNewsTemplate {
  title: string
  summary: string
  category: NewsItem['category']
  tone: NewsItem['tone']
  /** 适配该模板所需的指标条件（满足任一即可） */
  condition?: (s: GameState) => boolean
  /** 模板权重，默认 1 */
  weight?: number
}

/** 经济类新闻：根据 economy 指标分级 */
const ECONOMY_NEWS: AmbientNewsTemplate[] = [
  // 高经济（≥70）
  {
    title: '股市创历史新高，分析师警告"非理性繁荣"',
    summary: '上证综指突破 6800 点，散户开户数单日破百万；央行研究局内部报告警告估值已脱离基本面。',
    category: '经济',
    tone: 'positive',
    condition: (s) => s.metrics.economy >= 70,
  },
  {
    title: '出口订单旺季爆满，港口集装箱"一箱难求"',
    summary: '主要港口吞吐量同比增 38%，船公司加开加班船；外贸企业招聘工人排队至年底。',
    category: '经济',
    tone: 'positive',
    condition: (s) => s.metrics.economy >= 70,
  },
  {
    title: '本土电动车企海外市占率突破 25%',
    summary: '欧洲与东南亚市场表现亮眼，传统车企加速电动化转型应对；业内预计明年份额将达三分之一。',
    category: '经济',
    tone: 'positive',
    condition: (s) => s.metrics.economy >= 70,
  },
  {
    title: '独角兽企业年内新增 47 家，资本寒冬论破产',
    summary: '人工智能、生物医药、新能源三大赛道贡献过半新增独角兽；多家中概股启动回流上市。',
    category: '经济',
    tone: 'positive',
    condition: (s) => s.metrics.economy >= 70,
  },
  // 中等经济（40-69）
  {
    title: '制造业 PMI 在荣枯线附近徘徊',
    summary: '最新 PMI 录得 50.3，新订单小幅回升但就业分项仍疲软；经济学家对下半年走势意见分歧。',
    category: '经济',
    tone: 'neutral',
    condition: (s) => s.metrics.economy >= 40 && s.metrics.economy < 70,
  },
  {
    title: '消费复苏分化：奢侈品热销，平价零售承压',
    summary: '高端商场客流同比增 22%，社区便利店关闭潮持续；分析指"K 型复苏"特征明显。',
    category: '经济',
    tone: 'neutral',
    condition: (s) => s.metrics.economy >= 40 && s.metrics.economy < 70,
  },
  {
    title: '中小银行合并潮加速',
    summary: '今年已有 12 家城商行与农商行完成合并重组；监管层称"化解风险、提升效率"。',
    category: '经济',
    tone: 'neutral',
    condition: (s) => s.metrics.economy >= 40 && s.metrics.economy < 70,
  },
  {
    title: '外贸"新三样"出口亮眼，传统品类下滑',
    summary: '电动载人汽车、锂电池、太阳能电池出口合计增 67%；纺织、家具、玩具出口继续承压。',
    category: '经济',
    tone: 'neutral',
    condition: (s) => s.metrics.economy >= 40 && s.metrics.economy < 70,
  },
  // 低经济（<40）
  {
    title: '制造业裁员潮蔓延至白领岗位',
    summary: '多家龙头企业启动"优化"，研发与管理部门首当其冲；求职平台简历投递量同比翻倍。',
    category: '经济',
    tone: 'negative',
    condition: (s) => s.metrics.economy < 40,
  },
  {
    title: '地方财政吃紧，公务员绩效工资再次推迟',
    summary: '多个省份下发通知，第三季度绩效延后至年底统一发放；基层公务员抱怨"房租都交不上"。',
    category: '经济',
    tone: 'negative',
    condition: (s) => s.metrics.economy < 40,
  },
  {
    title: '信用卡逾期率创五年新高',
    summary: '央行数据显示信用卡半年逾期率达 1.4%，年轻群体违约率突出；银行业协会预警消费金融风险。',
    category: '经济',
    tone: 'negative',
    condition: (s) => s.metrics.economy < 40,
  },
  {
    title: '外资制造业连续六月净流出',
    summary: '商务部数据：外资制造业实际使用金额同比降 18%；部分产能迁至东南亚与南亚。',
    category: '经济',
    tone: 'negative',
    condition: (s) => s.metrics.economy < 40,
  },
]

/** 民意类新闻：根据 approval 分级 */
const APPROVAL_NEWS: AmbientNewsTemplate[] = [
  {
    title: '最新民调：总理支持率创就职以来新高',
    summary: '权威民调机构数据显示总理支持率达 68%，"执政果断""民生为本"是高频正面词。',
    category: '决策',
    tone: 'positive',
    condition: (s) => s.metrics.approval >= 70,
  },
  {
    title: '"总理这一年"网络评选：网民点赞"接地气"',
    summary: '社交平台发起的话题阅读量破 30 亿，最热评论是"终于有位肯听真话的总理"。',
    category: '决策',
    tone: 'positive',
    condition: (s) => s.metrics.approval >= 70,
  },
  {
    title: '街访：市民对未来一年普遍乐观',
    summary: '记者走访八座城市，受访者最关心的是就业、医疗与子女教育；多数表示"日子越过越好"。',
    category: '社会',
    tone: 'positive',
    condition: (s) => s.metrics.approval >= 70,
  },
  {
    title: '民调：执政党基本盘稳固，中间选民观望',
    summary: '执政党支持率稳定在 45% 左右，反对党 28%；分析指中间选民将决定下届大选走向。',
    category: '决策',
    tone: 'neutral',
    condition: (s) => s.metrics.approval >= 40 && s.metrics.approval < 70,
  },
  {
    title: '"总理厨房"访谈收视率破纪录',
    summary: '总理在访谈中畅谈家常菜与童年记忆，观众反馈"亲切""有温度"；反对党批评"避谈政策"。',
    category: '决策',
    tone: 'neutral',
    condition: (s) => s.metrics.approval >= 40 && s.metrics.approval < 70,
  },
  {
    title: '社媒热议：年轻人最关心的话题是"买房"',
    summary: '关键词云显示"房价""首付""贷款利率"占据前三；专家呼吁政策更多关注 Z 世代需求。',
    category: '社会',
    tone: 'neutral',
    condition: (s) => s.metrics.approval >= 40 && s.metrics.approval < 70,
  },
  {
    title: '反对党发起"倒阁"联署，街头响应冷淡',
    summary: '联署 24 小时仅获 8 万人签名，远低于预期；分析指民意未到临界点，反对党内部出现路线之争。',
    category: '决策',
    tone: 'positive',
    condition: (s) => s.metrics.approval >= 50 && s.metrics.approval < 65,
  },
  {
    title: '民调：总理支持率跌至危险区间',
    summary: '权威民调显示总理支持率仅 32%，反对党支持率反超 5 个百分点；执政党内部出现"换帅"声音。',
    category: '决策',
    tone: 'negative',
    condition: (s) => s.metrics.approval < 40,
  },
  {
    title: '社媒涌现"总理下台"话题，阅读破 10 亿',
    summary: '话题下汇聚大量对物价、就业、腐败的不满；网信办紧急约谈平台要求"防止煽动"。',
    category: '决策',
    tone: 'negative',
    condition: (s) => s.metrics.approval < 40,
  },
  {
    title: '出租车司机集体罢运，抗议"活不下去"',
    summary: '油价上涨、网约车挤压、份子钱居高不下三大压力下，全国二十城出租车司机响应罢运呼吁。',
    category: '社会',
    tone: 'negative',
    condition: (s) => s.metrics.approval < 40,
  },
]

/** 外交类新闻 */
const DIPLOMACY_NEWS: AmbientNewsTemplate[] = [
  {
    title: '我国与三国签署友好合作条约',
    summary: '涉及经贸、文化、安全三大领域；多国媒体评述我国外交"朋友圈持续扩大"。',
    category: '外交',
    tone: 'positive',
    condition: (s) => s.metrics.diplomacy >= 70,
  },
  {
    title: '"我国文化周"在十二国同步开幕',
    summary: '京剧、书法、汉服、茶道等体验活动吸引数十万外国观众；海外"中文热"再升温。',
    category: '外交',
    tone: 'positive',
    condition: (s) => s.metrics.diplomacy >= 60,
  },
  {
    title: '我国主导的区域合作组织扩容至 18 国',
    summary: '新加入三国签署议定书；秘书处将设立永久性行政总部于我国首都。',
    category: '外交',
    tone: 'positive',
    condition: (s) => s.metrics.diplomacy >= 60,
  },
  {
    title: '外交部例行记者会：就近期热点答问',
    summary: '发言人就贸易摩擦、地区冲突、签证便利化等十个问题作出回应；现场记者提问踊跃。',
    category: '外交',
    tone: 'neutral',
    condition: (s) => s.metrics.diplomacy >= 40 && s.metrics.diplomacy < 70,
  },
  {
    title: '我国特使出访三国，斡旋地区冲突',
    summary: '穿梭外交持续五日，相关方同意重启谈判；国际社会期待我国发挥更大建设性作用。',
    category: '外交',
    tone: 'positive',
    condition: (s) => s.metrics.diplomacy >= 50,
  },
  {
    title: '邻国宣布对等削减我国驻外机构规模',
    summary: '要求我国驻该国领事馆人员减半，理由是"对等原则"；我国外交部表示遗憾并研究反制。',
    category: '外交',
    tone: 'negative',
    condition: (s) => s.metrics.diplomacy < 40,
  },
  {
    title: '某大国舰队在争议海域"自由航行"',
    summary: '航母战斗群进入我国主张专属经济区，我国海军全程跟踪监视；外交部召见对方大使抗议。',
    category: '外交',
    tone: 'negative',
    condition: (s) => s.metrics.diplomacy < 50,
  },
  {
    title: '国际人权组织发布年度报告批评我国',
    summary: '报告聚焦劳工权利、网络自由、少数族群三大议题；我国外交部斥为"政治偏见"。',
    category: '外交',
    tone: 'negative',
    condition: (s) => s.metrics.diplomacy < 40,
  },
]

/** 稳定度类新闻 */
const STABILITY_NEWS: AmbientNewsTemplate[] = [
  {
    title: '全国治安满意度调查：连续三年上升',
    summary: '夜间独行安全感、社区警民关系、突发事件处置三项指标均创新高。',
    category: '社会',
    tone: 'positive',
    condition: (s) => s.metrics.stability >= 70,
  },
  {
    title: '"枫桥经验"新实践：调解纠纷 280 万件',
    summary: '基层调解组织覆盖全国 95% 村庄与社区；大量纠纷化解在萌芽，诉讼增量明显放缓。',
    category: '社会',
    tone: 'positive',
    condition: (s) => s.metrics.stability >= 60,
  },
  {
    title: '城市夜经济繁荣，年轻人扎堆"打卡"',
    summary: '夜间消费占社会零售额比重突破 18%；24 小时书店、深夜食堂、夜跑路线走红。',
    category: '社会',
    tone: 'positive',
    condition: (s) => s.metrics.stability >= 55,
  },
  {
    title: '社区议事厅：让居民"说了算"',
    summary: '老旧小区改造、加装电梯、停车位分配等难题通过协商解决；治理模式获学界肯定。',
    category: '社会',
    tone: 'neutral',
    condition: (s) => s.metrics.stability >= 40 && s.metrics.stability < 70,
  },
  {
    title: '多地出现"抢盐""抢药"风潮',
    summary: '谣言扩散引发非理性囤积，超市货架被抢空；市场监管部门紧急澄清。',
    category: '社会',
    tone: 'negative',
    condition: (s) => s.metrics.stability < 40,
  },
  {
    title: '网络流传"末日预言"引发恐慌',
    summary: '所谓"星象学家"预测大灾难，社交平台扩散速度惊人；专家集体辟谣。',
    category: '社会',
    tone: 'negative',
    condition: (s) => s.metrics.stability < 35,
  },
  {
    title: '极端组织宣称对系列袭击负责',
    summary: '国际反恐情报显示我国境内已有潜伏小组；安全部门提升警戒级别。',
    category: '紧急',
    tone: 'negative',
    condition: (s) => s.metrics.stability < 30,
  },
]

/** 声望类新闻 */
const PRESTIGE_NEWS: AmbientNewsTemplate[] = [
  {
    title: '我国作家斩获国际文学大奖',
    summary: '评委会盛赞其作品"以东方视角叩问人类共同命运"；颁奖词被多家媒体转载。',
    category: '社会',
    tone: 'positive',
    condition: (s) => s.metrics.prestige >= 60,
  },
  {
    title: '我国科学家当选国际科学院院长',
    summary: '任期为三年，期间将主导全球科研合作议程；学界视为"软实力里程碑"。',
    category: '社会',
    tone: 'positive',
    condition: (s) => s.metrics.prestige >= 60,
  },
  {
    title: '我国导演作品入围三大电影节主竞赛',
    summary: '三部华语片同时入围，创近二十年新高；影评人期待"华语新浪潮"。',
    category: '社会',
    tone: 'positive',
    condition: (s) => s.metrics.prestige >= 50,
  },
  {
    title: '我国运动员破世界纪录',
    summary: '在田径游泳举重三项目接连突破；体育总局宣布加大基础项目投入。',
    category: '社会',
    tone: 'positive',
    condition: (s) => s.metrics.prestige >= 50,
  },
  {
    title: '国际美食博览会：我国菜系斩获 12 金',
    summary: '川菜、粤菜、淮扬菜系大放异彩；米其林指南宣布明年首发"中国专版"。',
    category: '社会',
    tone: 'positive',
    condition: (s) => s.metrics.prestige >= 45,
  },
  {
    title: '我国古装剧海外热播，多国观众追剧',
    summary: '流媒体平台播放量破 10 亿，"汉服热"在东南亚与拉美蔓延；文化输出再下一城。',
    category: '社会',
    tone: 'positive',
    condition: (s) => s.metrics.prestige >= 45,
  },
  {
    title: '我国科学家被国际期刊撤稿，学术诚信受质疑',
    summary: '《自然》撤回一篇高引论文，通讯作者为我国院士；学界呼吁彻查。',
    category: '社会',
    tone: 'negative',
    condition: (s) => s.metrics.prestige < 40,
  },
]

/** 环境类新闻（无直接环境指标，作为随机花絮出现） */
const ENVIRONMENT_NEWS: AmbientNewsTemplate[] = [
  {
    title: '首都蓝天数创十年新高',
    summary: 'PM2.5 平均浓度同比下降 22%；环保部门归因于产业升级与清洁能源替代。',
    category: '环境',
    tone: 'positive',
  },
  {
    title: '流域江豚数量回升，禁渔成效初显',
    summary: '科考队观测到江豚群体 78 个，较禁渔前增 35%；生物多样性恢复信号明确。',
    category: '环境',
    tone: 'positive',
  },
  {
    title: '"光伏+治沙"模式在西北沙漠成功落地',
    summary: '板上发电、板下种植、板间养殖三位一体；联合国防治荒漠化公约秘书处前来考察。',
    category: '环境',
    tone: 'positive',
  },
  {
    title: '城市垃圾分类执行率突破 85%',
    summary: '厨余垃圾分出量同比增 40%，可回收物回收率达 65%；居民习惯逐步养成。',
    category: '环境',
    tone: 'neutral',
  },
  {
    title: '部分河流出现"绿藻爆发"，水质预警',
    summary: '农业面源污染与高温叠加导致富营养化；环保部门启动应急处理。',
    category: '环境',
    tone: 'negative',
  },
  {
    title: '沙尘暴南下，南方城市空气质量骤降',
    summary: '罕见沙尘影响波及南部多省，多城 PM10 爆表；气象部门提示老人儿童减少外出。',
    category: '环境',
    tone: 'negative',
  },
  {
    title: '沿海出现赤潮，海鲜禁捕区域扩大',
    summary: '受影响海域达 1.2 万平方公里，渔民损失惨重；政府启动应急补偿机制。',
    category: '环境',
    tone: 'negative',
  },
]

/** 通用花絮新闻（不依赖指标） */
const FLAVOR_NEWS: AmbientNewsTemplate[] = [
  {
    title: '八旬老人独居深山 60 年，被发现时家中藏书万卷',
    summary: '老人曾是民国大学生，避世隐居至今；文物部门紧急介入保护其藏书与手稿。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '流浪狗"上岗"成为消防队吉祥物',
    summary: '被消防员救下后不愿离开，如今参与社区消防宣传；社交媒体粉丝破百万。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '乡村小学只有 6 名学生，老师坚持 30 年',
    summary: '"只要还有一个孩子，我就不离开"；纪录片导演将其故事拍成短片获国际奖。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '农民自家菜地挖出宋代古钱币窖藏',
    summary: '文物部门鉴定为真品，共 1800 余枚；农民获奖励并自愿上交。',
    category: '社会',
    tone: 'neutral',
  },
  {
    title: '城市出现"反向春运"现象：父母进城陪子女过年',
    summary: '今年春运反向客流同比增 23%；分析指年轻人工作压力大、假期短是主因。',
    category: '社会',
    tone: 'neutral',
  },
  {
    title: '"00 后"择业观调查：超六成首选"稳定"',
    summary: '公务员、教师、国企成为热门；"躺平""佛系"成高频词；社会学家表示担忧。',
    category: '社会',
    tone: 'neutral',
  },
  {
    title: '高校开设"反诈骗"必修课',
    summary: '电信诈骗受害群体年轻化趋势明显；教育部将反诈纳入通识教育。',
    category: '社会',
    tone: 'neutral',
  },
  {
    title: '"银发网红"崛起：80 岁奶奶直播带货月入十万',
    summary: '主要销售农产品与手工艺品；粉丝称其"治愈了焦虑的年轻人"。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '考古队发现两千年前水利工程，至今仍在使用',
    summary: '该工程采用"鱼嘴分水"原理，与现代流体力学高度吻合；被誉为"古代智慧结晶"。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '"汉字听写大会"决赛收视破纪录',
    summary: '决赛选手平均年龄仅 12 岁，能正确书写"龘""爩""麤"等冷僻字；网友叹"自愧不如"。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '城市推出"无声公交"，禁止外放电子设备',
    summary: '乘客反响热烈，"终于可以安静通勤了"；其他城市纷纷表示跟进。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '"国潮"消费持续升温，本土品牌份额首超国际',
    summary: '运动鞋服、美妆、潮玩三大品类本土品牌份额突破 52%；Z 世代是消费主力。',
    category: '经济',
    tone: 'positive',
  },
  {
    title: '冬季供暖北方启动，南方"供暖线"之争再起',
    summary: '南方湿冷地区居民呼吁"集中供暖"；专家建议因地制宜发展分散式供暖。',
    category: '社会',
    tone: 'neutral',
  },
  {
    title: '新能源汽车保有量突破 2000 万辆',
    summary: '充电桩缺口仍达 400 万个，"找桩难"成最大痛点；经济规划部门加快推进社区充电网络。',
    category: '经济',
    tone: 'neutral',
  },
  {
    title: '"剧本杀"行业遭遇强监管',
    summary: '新规要求剧本备案、限制暴力恐怖题材；业内预测 30% 门店将面临转型或关停。',
    category: '社会',
    tone: 'neutral',
  },
  {
    title: '城市马拉松参赛人数破百万',
    summary: '全年赛事 380 场，带动消费超 200 亿；业余选手完赛率创历史新高。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '"快递小哥"获评全国劳动模范',
    summary: '从业 12 年派送 30 万件包裹零投诉；颁奖词称其为"城市毛细血管"。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '乡村"村 BA"篮球赛火爆全网',
    summary: '现场观众上万人，直播观看破亿；NBA 官方账号转发并致贺。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '"老年大学"报名火爆，名额秒光',
    summary: '热门课程包括智能手机、摄影、舞蹈、外语；银发群体终身学习意识觉醒。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '城市出现"周末农场"热潮',
    summary: '市民租地种菜，体验田园生活；农户获得稳定租金，城乡互动新模式涌现。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '考古学家在西部发现完整恐龙化石',
    summary: '距今约 1.2 亿年，属于新属新种；命名为"华夏龙"，将建博物馆原地保护。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '"短视频沉迷"成心理健康新议题',
    summary: '调查显示青少年日均刷短视频 2.8 小时；心理学家呼吁"数字排毒"。',
    category: '社会',
    tone: 'neutral',
  },
]

/** 国际新闻：纯背景氛围 */
const INTERNATIONAL_NEWS: AmbientNewsTemplate[] = [
  {
    title: '某大国大选结果出炉，新总统即将就职',
    summary: '选战激烈程度创纪录，投票率达 75%；市场关注其对华政策走向。',
    category: '外交',
    tone: 'neutral',
  },
  {
    title: '邻国发生 7.2 级地震，我国派出救援队',
    summary: '救援队携带生命探测仪与医疗物资，三小时内抵达灾区；两国关系有望升温。',
    category: '外交',
    tone: 'positive',
  },
  {
    title: '国际原油价格剧烈波动',
    summary: 'OPEC+ 紧急会议未能达成减产协议，油价单日跌 8%；分析指供需博弈加剧。',
    category: '经济',
    tone: 'neutral',
  },
  {
    title: '联合国通过《人工智能伦理全球公约》',
    summary: '我国是首批签署国之一；公约确立"以人为本、透明可释、可控"三大原则。',
    category: '外交',
    tone: 'positive',
  },
  {
    title: '全球粮食安全峰会召开',
    summary: '我国承诺向最不发达国家提供 500 万吨粮食援助；获国际社会高度评价。',
    category: '外交',
    tone: 'positive',
  },
  {
    title: '某大国央行加息引发新兴市场资本外流',
    summary: '多国货币贬值，我国本币相对稳健；分析指外汇储备充足是关键缓冲。',
    category: '经济',
    tone: 'neutral',
  },
  {
    title: '国际空间站延期退役至 2030 年',
    summary: '我国"天宫"空间站将与之并行运行；商业航天公司加速布局低轨星座。',
    category: '社会',
    tone: 'neutral',
  },
  {
    title: '某地区冲突停火协议正式生效',
    summary: '我国作为调停方之一出席签字仪式；联合国秘书长感谢我国贡献。',
    category: '外交',
    tone: 'positive',
  },
  {
    title: '南极冰盖融化速度超预期',
    summary: '最新研究显示融化速度比 IPCC 预测快 30%；海平面上升威胁沿海城市。',
    category: '环境',
    tone: 'negative',
  },
  {
    title: '全球首例"实验室培养肉"获批上市',
    summary: '某国监管机构批准其作为食品销售；我国企业已申请同类许可。',
    category: '社会',
    tone: 'neutral',
  },
  {
    title: '国际足联宣布下届世界杯扩军至 48 队',
    summary: '我国男足出线概率上升；体育总局启动"冲击世界杯"专项计划。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '某大国宣布登月计划提前至 2028 年',
    summary: '新一轮太空竞赛迹象明显；我国航天局表示"按自己节奏推进"。',
    category: '社会',
    tone: 'neutral',
  },
  {
    title: '全球癌症五年生存率提升至 68%',
    summary: '免疫疗法与精准医疗贡献最大；我国本土创新药首次进入全球前十。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '北极航道夏季全线通航',
    summary: '亚欧航运时间缩短 40%；我国航运公司已派出首艘试航货轮。',
    category: '经济',
    tone: 'positive',
  },
  {
    title: '全球二氧化碳浓度突破 425ppm',
    summary: '气候学家警告"1.5 度目标已基本无望"；COP 大会紧急磋商。',
    category: '环境',
    tone: 'negative',
  },
  {
    title: '某国爆发"反 AI 失业"大游行',
    summary: '游行波及二十余城，部分发生打砸科技企业事件；多国政府高度关注。',
    category: '社会',
    tone: 'negative',
  },
]

/** 科技/创新新闻 */
const TECH_NEWS: AmbientNewsTemplate[] = [
  {
    title: '我国量子计算机"九章三号"问世',
    summary: '求解特定问题速度比超算快亿亿倍；论文登上《自然》封面，业内誉为"量子霸权里程碑"。',
    category: '经济',
    tone: 'positive',
  },
  {
    title: '本土团队发布开源大模型，性能比肩国际顶尖',
    summary: '参数规模 700 亿，完全开源免费商用；开发者社区一天内 GitHub star 破 5 万。',
    category: '经济',
    tone: 'positive',
  },
  {
    title: '我国可重复使用火箭首次成功回收',
    summary: '一级火箭精准着陆于海上平台；航天运输成本有望降低 90%。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '"脑机接口"临床试验获批',
    summary: '首批 10 名瘫痪患者将接受植入；伦理委员会同步设立监督机制。',
    category: '社会',
    tone: 'neutral',
  },
  {
    title: '本土 5nm 芯片量产，打破技术封锁',
    summary: '采用国产 EUV 替代方案，良率达 70%；某大国紧急召开应对会议。',
    category: '经济',
    tone: 'positive',
  },
  {
    title: '我国发现新型常温超导材料',
    summary: '近常温常压下实现零电阻，论文引发全球复制潮；如证实将颠覆能源产业。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '自动驾驶出租车获全国运营牌照',
    summary: '首批十城开通商业运营，单公里价格低于传统出租 30%；司机群体抗议。',
    category: '经济',
    tone: 'neutral',
  },
  {
    title: '我国人造太阳运行时间突破千秒',
    summary: '等离子体温度 1.5 亿度，距离商用核聚变又近一步；国际聚变组织致贺。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '"基因剪刀"治愈首例遗传病',
    summary: '镰刀型贫血症患者完全康复；伦理与监管框架同步完善。',
    category: '社会',
    tone: 'positive',
  },
  {
    title: '我国深海载人潜水器突破万米深度',
    summary: '在马里亚纳海沟完成科考任务，发现 17 个新物种；深海资源开发进入新阶段。',
    category: '社会',
    tone: 'positive',
  },
]

/** 全部环境新闻池 */
const ALL_AMBIENT_POOLS: AmbientNewsTemplate[][] = [
  ECONOMY_NEWS,
  APPROVAL_NEWS,
  DIPLOMACY_NEWS,
  STABILITY_NEWS,
  PRESTIGE_NEWS,
  ENVIRONMENT_NEWS,
  FLAVOR_NEWS,
  INTERNATIONAL_NEWS,
  TECH_NEWS,
]

/** 生成一条环境新闻
 *  - 优先从满足 condition 的池中抽取
 *  - 同一池中权重随机
 *  - 避免短期内重复（通过传入 recentTitles 过滤）
 */
export function rollAmbientNews(state: GameState, recentTitles: string[] = []): NewsItem | null {
  // 收集所有满足条件的候选
  const candidates: { t: AmbientNewsTemplate; pool: AmbientNewsTemplate[] }[] = []
  for (const pool of ALL_AMBIENT_POOLS) {
    for (const t of pool) {
      if (!t.condition || t.condition(state)) {
        if (!recentTitles.includes(t.title)) {
          candidates.push({ t, pool })
        }
      }
    }
  }
  if (candidates.length === 0) return null

  // 权重随机
  const weights = candidates.map((c) => c.t.weight ?? 1)
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]
    if (r <= 0) {
      const { t } = candidates[i]
      return {
        id: `news_ambient_${state.totalDays}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: `${state.year}年${state.month}月`,
        title: t.title,
        summary: t.summary,
        category: t.category,
        tone: t.tone,
      }
    }
  }
  const last = candidates[candidates.length - 1].t
  return {
    id: `news_ambient_${state.totalDays}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: `${state.year}年${state.month}月`,
    title: last.title,
    summary: last.summary,
    category: last.category,
    tone: last.tone,
  }
}

/** 月度环境新闻：生成 1-2 条
 *  返回的 NewsItem 已带 id 与时间戳
 */
export function generateMonthlyAmbientNews(state: GameState, recentTitles: string[] = []): NewsItem[] {
  const result: NewsItem[] = []
  const count = Math.random() < 0.5 ? 1 : 2
  const usedTitles = [...recentTitles]
  for (let i = 0; i < count; i++) {
    const news = rollAmbientNews(state, usedTitles)
    if (!news) break
    result.push(news)
    // 假设 title 字段非空，加入已用列表
    const matchedTitle = ALL_AMBIENT_POOLS
      .flat()
      .find((t) => news.title === t.title)?.title
    if (matchedTitle) usedTitles.push(matchedTitle)
  }
  return result
}
