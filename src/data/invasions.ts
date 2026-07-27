import type { InvasionEvent, GameState } from '@/types/game'

/** 外国入侵事件库 — 特殊条件下触发 */
export const INVASIONS: InvasionEvent[] = [
  {
    id: 'inv_moldovia',
    title: '莫尔多维亚全面入侵',
    category: '军事',
    invader: '莫尔多维亚共和国',
    description: '邻国莫尔多维亚以「保护边境少数民族」为由，出动三个装甲师越过边境，向我国北部三省发起全面进攻。国际社会的谴责未能阻止其推进。',
    trigger: (state: GameState) => {
      // 触发条件：外交极低 + 稳定低（原需 evt_border_standoff 事件链，已放宽）
      // 若已触发过边境事件链则更易触发，否则需要更苛刻的指标条件
      const hasBorderStandoff = state.resolvedEventIds.includes('evt_border_standoff')
      if (hasBorderStandoff) {
        return (
          state.metrics.diplomacy < 30 &&
          state.metrics.stability < 35 &&
          state.turn > 12
        )
      }
      return (
        state.metrics.diplomacy < 20 &&
        state.metrics.stability < 25 &&
        state.turn > 12
      )
    },
    phases: [
      {
        id: 'phase1',
        label: '冲突初期：敌军入侵',
        description: '敌军装甲部队已突破边境防线，正向首都方向推进。空军遭受重创，制空权丧失。',
        options: [
          {
            id: 'a',
            label: '全面动员，誓死抵抗',
            description: '征召所有预备役，发动全民抗战',
            effects: { stability: -15, treasury: -20, approval: 10, prestige: 8, diplomacy: -5 },
            newsTitle: '总理发表抗战演说，全国总动员',
            newsSummary: '全民抗战意志坚定，但敌军攻势凶猛。',
            tone: 'negative',
          },
          {
            id: 'b',
            label: '请求国际军事援助',
            description: '向盟国求援',
            effects: { stability: -8, treasury: -10, diplomacy: 10, prestige: -6 },
            newsTitle: '总理向国际社会请求紧急军事援助',
            newsSummary: '盟国承诺支援，但需要时间部署。',
            tone: 'neutral',
          },
          {
            id: 'c',
            label: '宣布投降，避免更大伤亡',
            description: '屈辱求和',
            effects: { stability: 5, treasury: -30, approval: -25, prestige: -30, diplomacy: -15 },
            newsTitle: '政府宣布无条件投降',
            newsSummary: '国家蒙受奇耻大辱，民众愤怒与绝望交织。',
            tone: 'negative',
          },
        ],
      },
      {
        id: 'phase2',
        label: '冲突中后期：战略抉择',
        description: '冲突已持续数月，双方伤亡惨重。首都圈遭到轰炸，经济濒临崩溃。国际社会调停意愿增强。',
        options: [
          {
            id: 'a',
            label: '发动反攻，收复失地',
            description: '孤注一掷',
            effects: { stability: -10, treasury: -15, approval: 8, prestige: 12, economy: -10 },
            newsTitle: '我军发动大规模反攻',
            newsSummary: '战况激烈，胜负未卜。',
            tone: 'neutral',
          },
          {
            id: 'b',
            label: '接受国际调停，签署停战协议',
            description: '体面结束',
            effects: { stability: 8, treasury: -8, approval: -4, prestige: -4, diplomacy: 8 },
            newsTitle: '双方签署停战协议',
            newsSummary: '冲突结束，但领土争议未解。',
            tone: 'neutral',
          },
          {
            id: 'c',
            label: '使用大规模杀伤性武器',
            description: '毁灭性打击',
            effects: { stability: -20, treasury: -10, approval: -15, prestige: -20, diplomacy: -30 },
            newsTitle: '我军使用违禁武器',
            newsSummary: '国际社会震惊，我国遭到全面制裁。',
            tone: 'negative',
          },
        ],
      },
    ],
  },
  {
    id: 'inv_coalition',
    title: '多国联军入侵',
    category: '军事',
    invader: '国际联军',
    description: '以「人权危机」为由，由三个大国组成的联军对我国发起军事干预。空军已掌握制空权，海军封锁主要港口。',
    trigger: (state: GameState) => {
      // 触发条件：外交极低 + 启动核计划 + 稳定低
      return (
        state.metrics.diplomacy < 20 &&
        state.completedInitiatives.includes('ini_nuclear_program') &&
        state.metrics.stability < 35 &&
        state.turn > 18
      )
    },
    phases: [
      {
        id: 'phase1',
        label: '联军空袭与封锁',
        description: '联军对军事设施与基础设施进行大规模空袭，港口被封锁，物资供应紧张。',
        options: [
          {
            id: 'a',
            label: '全面抵抗，发动全民防卫',
            description: '全民抗战',
            effects: { stability: -12, treasury: -18, approval: 12, prestige: 10, diplomacy: -10 },
            newsTitle: '总理号召全民抗战',
            newsSummary: '民众同仇敌忾，但损失惨重。',
            tone: 'negative',
          },
          {
            id: 'b',
            label: '寻求大国调解',
            description: '外交斡旋',
            effects: { stability: -6, treasury: -8, diplomacy: 8, prestige: -8 },
            newsTitle: '总理请求大国调解',
            newsSummary: '调解努力进行中，但联军未停止行动。',
            tone: 'neutral',
          },
          {
            id: 'c',
            label: '接受联军条件，避免更大灾难',
            description: '屈辱妥协',
            effects: { stability: 10, treasury: -25, approval: -20, prestige: -25, diplomacy: 5 },
            newsTitle: '政府接受联军最后通牒',
            newsSummary: '冲突结束，但国家主权严重受损。',
            tone: 'negative',
          },
        ],
      },
    ],
  },
  {
    id: 'inv_neighbor_raid',
    title: '邻国边境突袭',
    category: '军事',
    invader: '邻国',
    description: '邻国趁我国内政不稳之际，出动特种部队突袭边境城镇，占领多处战略要地。',
    trigger: (state: GameState) => {
      // 触发条件（已放宽）：稳定低 + 外交低 + 未缔结同盟
      // 这是入门级入侵事件，条件相对容易达成
      return (
        state.metrics.stability < 30 &&
        state.metrics.diplomacy < 35 &&
        !state.completedInitiatives.includes('ini_alliance') &&
        state.turn > 8
      )
    },
    phases: [
      {
        id: 'phase1',
        label: '边境危机',
        description: '敌军已占领边境三座城镇，正在构筑防御工事。国际社会呼吁双方克制。',
        options: [
          {
            id: 'a',
            label: '立即反击，收复失地',
            description: '武力解决',
            effects: { stability: -8, treasury: -12, approval: 8, prestige: 6, diplomacy: -4 },
            newsTitle: '我军发起反击作战',
            newsSummary: '战斗激烈，双方均有伤亡。',
            tone: 'neutral',
          },
          {
            id: 'b',
            label: '通过外交途径解决',
            description: '和平谈判',
            effects: { stability: 4, treasury: -4, diplomacy: 6, prestige: -6, approval: -4 },
            newsTitle: '总理提议和平谈判',
            newsSummary: '邻国态度暧昧，谈判前景不明。',
            tone: 'neutral',
          },
          {
            id: 'c',
            label: '默认既成事实，避免冲突升级',
            description: '忍气吞声',
            effects: { stability: 6, treasury: 0, approval: -12, prestige: -10, diplomacy: -2 },
            newsTitle: '政府默认邻国占领现状',
            newsSummary: '民众愤怒，政府威信受损。',
            tone: 'negative',
          },
        ],
      },
    ],
  },
]