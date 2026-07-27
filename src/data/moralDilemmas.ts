import type { GameEvent } from '@/types/game'

/**
 * 道德两难事件库
 * 包含「公义 vs 权力」与「私利 vs 公职」两类两难事件
 * 部分选项会通过 chainId 触发匿名泄密或政治危机事件（见 LEAK_EVENTS）
 */
export const MORAL_DILEMMAS: GameEvent[] = [
  // ===== 公义 vs 权力 =====
  {
    id: 'dilemma_medical_bill',
    title: '救命医疗法案困境',
    category: '社会',
    description:
      '一项能拯救数万贫困患者的医疗补助法案即将表决。然而，您的关键盟友党派威胁：若通过该法案将撤资倒阁，导致政府垮台。',
    options: [
      {
        id: 'pass_bill',
        label: '坚持通过法案（公义）',
        description: '即使政府垮台也要做正确的事',
        effects: { approval: 12, stability: -8, prestige: 8 },
        newsTitle: '医疗法案强行通过',
        newsSummary: '政府冒着倒台风险通过了救命法案，民众为之动容。',
        tone: 'positive',
        // 通过后盟友撤资，延迟触发
        chainId: 'dilemma_coalition_collapse', chainDelay: 4,
      },
      {
        id: 'shelve_bill',
        label: '暂缓法案（权力）',
        description: '保住执政联盟，但牺牲患者利益',
        effects: { approval: -10, stability: 4, prestige: -5 },
        newsTitle: '医疗法案被搁置',
        newsSummary: '政府向盟友妥协，医疗法案无限期推迟。',
        tone: 'negative',
      },
      {
        id: 'cover_up',
        label: '暂时掩盖，私下推进',
        description: '表面妥协，暗中筹备，但可能日后泄密',
        effects: { approval: -3, stability: 2 },
        newsTitle: '医疗法案争议暂息',
        newsSummary: '政府表示将重新评估方案，各方暂时观望。',
        tone: 'neutral',
        // 这个选项会添加延迟后果（需要在 store 中处理，这里用 chainId 模拟）
        chainId: 'dilemma_leak_medical', chainDelay: 6,
      },
    ],
  },
  // ===== 私利 vs 公职 =====
  {
    id: 'dilemma_family_scandal',
    title: '家族丑闻曝光',
    category: '突发',
    description:
      '媒体掌握了你家族企业涉嫌逃税的证据。你可以动用权力压下报道，但这会增加个人风险指数。',
    options: [
      {
        id: 'suppress',
        label: '压下报道（私利）',
        description: '动用关系压制媒体，但风险指数上升',
        effects: { approval: -3, prestige: -2 },
        newsTitle: '家族企业传闻被否认',
        newsSummary: '政府发言人否认相关指控，媒体暂未跟进。',
        tone: 'neutral',
        // 延迟触发泄密危机
        chainId: 'dilemma_leak_family', chainDelay: 5,
      },
      {
        id: 'confess',
        label: '公开承认并切割（公职）',
        description: '与家族切割，承担政治代价',
        effects: { approval: 4, prestige: -8, stability: -3 },
        newsTitle: '总理公开家族企业问题',
        newsSummary: '总理宣布与涉事家族企业切割，接受调查。',
        tone: 'positive',
      },
      {
        id: 'investigate',
        label: '成立独立调查',
        description: '走法律程序，不偏不倚',
        effects: { approval: 2, prestige: 2, stability: -1 },
        newsTitle: '政府启动独立调查',
        newsSummary: '总理下令对家族企业问题进行独立调查。',
        tone: 'neutral',
      },
    ],
  },
  // ===== 老家基建倾斜 =====
  {
    id: 'dilemma_hometown_funding',
    title: '老家基建拨款争议',
    category: '经济',
    description:
      '你的老家省份申请一笔巨额基建拨款。审批流程上，该项目评分偏低，但你的亲属在当地任职。反对党已开始质疑。',
    options: [
      {
        id: 'approve_funding',
        label: '批准拨款（私利）',
        description: '照顾老家，但累积风险',
        effects: { approval: -5, treasury: -8, economy: 2 },
        newsTitle: '争议基建项目获批',
        newsSummary: '政府批准老家省份基建拨款，反对党质疑利益输送。',
        tone: 'negative',
        chainId: 'dilemma_leak_funding', chainDelay: 7,
      },
      {
        id: 'reject_funding',
        label: '驳回申请（公职）',
        description: '秉公处理，但得罪家乡人',
        effects: { approval: 3, prestige: 5 },
        newsTitle: '总理驳回争议拨款',
        newsSummary: '总理以评分不足为由驳回老家基建申请，展现原则。',
        tone: 'positive',
      },
      {
        id: 'delay_funding',
        label: '要求重新评估',
        description: '拖延决策，两面讨好',
        effects: { approval: 0, stability: 1 },
        newsTitle: '基建项目被要求重新评估',
        newsSummary: '政府要求对该项目进行二次评估。',
        tone: 'neutral',
      },
    ],
  },
]

/** 匿名泄密事件（延迟后果触发） */
export const LEAK_EVENTS: GameEvent[] = [
  {
    id: 'dilemma_leak_medical',
    title: '匿名泄密：医疗法案内幕',
    category: '突发',
    description:
      '一份政府内部文件被泄露给媒体，显示您在医疗法案问题上曾私下妥协。舆论哗然，公信力遭受重创。',
    options: [
      {
        id: 'apologize',
        label: '公开道歉',
        description: '承认错误，请求公众谅解',
        effects: { approval: 3, prestige: -8, stability: -3 },
        newsTitle: '总理就泄密事件道歉',
        newsSummary: '总理公开承认决策失误，请求公众谅解。',
        tone: 'neutral',
      },
      {
        id: 'deny',
        label: '否认并甩锅',
        description: '坚称文件被曲解',
        effects: { approval: -8, prestige: -4, stability: -4 },
        newsTitle: '总理否认泄密指控',
        newsSummary: '总理否认相关指控，但媒体证据确凿。',
        tone: 'negative',
      },
      {
        id: 'resign_minister',
        label: '让相关大臣背锅',
        description: '牺牲下属平息舆论',
        effects: { approval: 2, prestige: -3, stability: -2 },
        newsTitle: '相关大臣引咎辞职',
        newsSummary: '政府让相关大臣承担泄密责任。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'dilemma_leak_family',
    title: '匿名泄密：家族丑闻再起',
    category: '突发',
    description:
      '之前被压下的家族企业丑闻被匿名人士曝光，比原先更猛烈。不仅逃税证据确凿，还牵涉到您曾干预媒体。',
    options: [
      {
        id: 'full_confess',
        label: '全面坦白',
        description: '承认一切，接受任何后果',
        effects: { approval: 5, prestige: -12, stability: -5 },
        newsTitle: '总理全面坦白家族问题',
        newsSummary: '总理承认曾干预媒体报道，表示愿意接受调查。',
        tone: 'neutral',
      },
      {
        id: 'fight_back',
        label: '强硬对抗',
        description: '否认一切，追究泄密者',
        effects: { approval: -12, prestige: -8, stability: -6 },
        newsTitle: '总理强硬回应泄密',
        newsSummary: '总理否认所有指控，下令调查泄密来源。',
        tone: 'negative',
      },
      {
        id: 'resign',
        label: '引咎辞职',
        description: '以辞职承担责任',
        effects: { approval: 8, prestige: -20, stability: -8 },
        newsTitle: '总理宣布辞职',
        newsSummary: '总理宣布因家族丑闻引咎辞职。',
        tone: 'negative',
        endsGame: true,
      },
    ],
  },
  {
    id: 'dilemma_leak_funding',
    title: '匿名泄密：基建拨款黑幕',
    category: '突发',
    description:
      '媒体获得您与老家亲属的通讯记录，显示您曾私下承诺批准基建拨款。利益输送的证据确凿。',
    options: [
      {
        id: 'cancel_project',
        label: '立即取消项目',
        description: '止损，但承认有过承诺',
        effects: { approval: 2, treasury: 4, prestige: -6 },
        newsTitle: '政府取消争议基建',
        newsSummary: '总理下令取消老家基建项目，承认决策不当。',
        tone: 'neutral',
      },
      {
        id: 'defend',
        label: '辩护到底',
        description: '坚称通讯被断章取义',
        effects: { approval: -8, prestige: -5, stability: -3 },
        newsTitle: '总理为基建拨款辩护',
        newsSummary: '总理坚称基建项目合理合法。',
        tone: 'negative',
      },
    ],
  },
  {
    id: 'dilemma_coalition_collapse',
    title: '盟友撤资倒阁',
    category: '政治体制',
    description:
      '如您所料，关键盟友党派宣布退出执政联盟，并联合反对党发起不信任投票。政府面临垮台危机。',
    options: [
      {
        id: 'fight_vote',
        label: '迎战不信任投票',
        description: '在议会力挽狂澜',
        effects: { stability: -5, prestige: -4 },
        newsTitle: '总理迎战不信任投票',
        newsSummary: '总理表示有信心在不信任投票中胜出。',
        tone: 'neutral',
      },
      {
        id: 'seek_compromise',
        label: '寻求妥协',
        description: '让出部分权力保住联盟',
        effects: { approval: 2, prestige: -8, stability: 3 },
        newsTitle: '总理与盟友重启谈判',
        newsSummary: '政府做出重大让步，试图挽救执政联盟。',
        tone: 'neutral',
      },
      {
        id: 'resign',
        label: '主动辞职',
        description: '体面下台，避免更大危机',
        effects: { approval: 5, prestige: -15, stability: -3 },
        newsTitle: '总理宣布辞职',
        newsSummary: '总理宣布为政府危机负责，主动辞职。',
        tone: 'negative',
        endsGame: true,
      },
    ],
  },
]
