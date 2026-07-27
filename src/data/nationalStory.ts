import type { GameState, StoryBeat } from '@/types/game'

/** 故事节拍类型（从 types/game.ts 统一导出，避免循环依赖） */
export type { StoryBeat, StoryPhase, StoryCategory } from '@/types/game'

/**
 * 叙事节拍池
 *  阶段划分：
 *    - early（执政初期）：turn 1-12
 *    - mid（执政中期）：turn 13-36
 *    - late（执政后期）：turn 37+
 *  所有文本统一以"我国/本国/共和国"指代玩家国家，不出现现实国名
 */
export const STORY_BEATS: StoryBeat[] = [
  // ===================== 执政初期 =====================
  {
    id: 'early_civ_dawn',
    category: '民间百态',
    phase: 'early',
    title: '黎明街市',
    text: '总理府的灯还亮着，城东的菜市却已喧嚣。鱼贩把冰碴扫进阴沟，茶馆伙计用抹布擦拭昨夜的旧报纸。新政府的名号被咀嚼了一整夜，如今只化作摊头闲谈里一句轻飘飘的"且看且看"。共和国的清晨，总比政令来得更早一些。',
    minTurn: 1,
    maxTurn: 12,
  },
  {
    id: 'early_civ_letters',
    category: '民间百态',
    phase: 'early',
    title: '人民来信',
    text: '总理府收发室堆积着成千上万封信件，有人寄来自家腌的咸菜，有人在信封背面写下孩子的学费数字。秘书们按颜色分类：白色申诉、红色告急、黄色建议。每一封都是这个国家最真实的脉搏，也是新总理肩上最沉的重量。',
    minTurn: 1,
    maxTurn: 12,
  },
  {
    id: 'early_court_cabinet',
    category: '朝堂风云',
    phase: 'early',
    title: '长桌之上',
    text: '内阁长桌擦得能照见人影，部长们正襟危坐，皮鞋却在不自觉地对齐桌腿。新总理尚未开口，空气里已弥漫着试探与揣测。谁会率先表态？谁又会在第一道政令上留下印记？这张桌子见证了数任政府的更迭，今日又迎来新的主人。',
    minTurn: 1,
    maxTurn: 12,
  },
  {
    id: 'early_court_president',
    category: '朝堂风云',
    phase: 'early',
    title: '总统的书房',
    text: '总统府书房墙上挂着历届元首的肖像，目光如炬又含着某种默许。新总理第一次踏入此地，茶已沏好，奏折尚未翻开。两人寒暄着天气，却都明白真正的对话藏在寒暄之后。这个国家的双头体制，从来都需要微妙的平衡。',
    minTurn: 1,
    maxTurn: 12,
  },
  {
    id: 'early_intl_watch',
    category: '国际视角',
    phase: 'early',
    title: '异邦观察家',
    text: '数家外国大报同时刊出我国新总理的简历，标题里反复出现"未知数"三字。邻国情报机构连夜整理档案，远洋的使馆则向国内发回第一份评估电报。世界在观望——这个刚换舵手的国家，会驶向何方？',
    minTurn: 1,
    maxTurn: 12,
  },
  {
    id: 'early_season_spring',
    category: '节令时序',
    phase: 'early',
    title: '春日履新',
    text: '玉兰开了又谢，谢了又开，总理府花园里的园丁换了一茬又一茬。就职时的红毯尚未褪色，新政策已随春风吹遍四方。这是一个适合开始的季节，万物萌动，连同那些尚未说出口的承诺。',
    minTurn: 1,
    maxTurn: 12,
  },

  // ===================== 执政中期 =====================
  {
    id: 'mid_civ_workers',
    category: '民间百态',
    phase: 'mid',
    title: '厂房灯火',
    text: '城郊工厂的夜班铃响过三遍，工人们在更衣室里议论着新出台的产业政策。有人点头，有人摇头，更多人只是默默把工牌挂回铁钩。政策条文太长，他们只记得与自己相关的那一句。共和国的工业脉搏，就跳动在这些粗粝的手掌之间。',
    minTurn: 13,
    maxTurn: 36,
  },
  {
    id: 'mid_civ_frontier',
    category: '民间百态',
    phase: 'mid',
    title: '边陲小镇',
    text: '边境线上的小镇邮差每周进城一次，带回首都的报纸和外省的酱料。镇上老人说，他们这辈子见过三任总理的画像挂在乡公所墙上，每一任都承诺修路，路却仍是那条路。可今年的电灯比去年亮了些，孩子们也开始念起了更厚的课本。',
    minTurn: 13,
    maxTurn: 36,
  },
  {
    id: 'mid_court_parliament',
    category: '朝堂风云',
    phase: 'mid',
    title: '议场风云',
    text: '议场穹顶之下，反对党党魁的质询如同连珠箭，执政党议员的起立喝彩又似浪潮。议长敲槌不止，旁听席上的记者奋笔疾书。总理坐在前排，神色不动，手中的笔却在议程纸上划下一道又一道。这场博弈没有硝烟，却比硝烟更耗人心血。',
    minTurn: 13,
    maxTurn: 36,
  },
  {
    id: 'mid_intl_envoy',
    category: '国际视角',
    phase: 'mid',
    title: '使节夜宴',
    text: '国宾馆的水晶灯下，三国使节举杯共饮，谈笑间却字字机锋。我国外长不动声色地周旋其间，将一句隐晦的承诺翻译成另一句更隐晦的回应。国际舞台从来不是擂台，而是一张铺满丝绸的棋盘。',
    minTurn: 13,
    maxTurn: 36,
  },
  {
    id: 'mid_season_autumn',
    category: '节令时序',
    phase: 'mid',
    title: '秋深议政',
    text: '秋风过境，议场外的银杏铺了一地金黄。总理府的暖炉已经生起，幕僚们裹着大衣捧着文件穿梭于长廊。这是个收获的季节，也是个清算的季节——年初立下的承诺，如今要一件件拿出来对账。',
    minTurn: 13,
    maxTurn: 36,
  },
  {
    id: 'mid_season_winter',
    category: '节令时序',
    phase: 'mid',
    title: '冬夜孤灯',
    text: '大雪封了北方的山路，南方的湿冷却钻进每一扇没关严的窗。总理府书房的灯亮到凌晨，秘书端来的茶已经凉透。这个国家的冬天总是漫长，但每一个长夜之后，都该有一场新的春耕。',
    minTurn: 13,
    maxTurn: 36,
  },

  // ===================== 执政后期 =====================
  {
    id: 'late_civ_elders',
    category: '民间百态',
    phase: 'late',
    title: '老人与画像',
    text: '老城区茶馆里，几位白发老人对坐着下棋，墙上挂着总理数年前的旧画像。他们谈起这位总理如同谈起一位久居邻屋的老相识——既有赞许，也有失望，更多的是一种说不清的熟悉。这个国家的老人见得多，也记得牢。',
    minTurn: 37,
    maxTurn: 9999,
  },
  {
    id: 'late_court_throne',
    category: '朝堂风云',
    phase: 'late',
    title: '高处孤寒',
    text: '总理府的椅子坐久了，会变得越来越硬。部长们进退皆惧，幕僚们言辞愈发谨慎，连反对党也学会了在某些议题上沉默。权力的顶端从来都冷，冷到连自己的回声都听得清清楚楚。',
    minTurn: 37,
    maxTurn: 9999,
  },
  {
    id: 'late_court_successor',
    category: '朝堂风云',
    phase: 'late',
    title: '暗流涌动',
    text: '党内年轻一代已经开始在私下场合频频聚会，他们谈论"后总理时代"的措辞越来越不加掩饰。老臣们则在各派之间走动，试探、结盟、平衡。这个国家的权力交接从来都不是一纸公文能解决的事，它是一场漫长的、无声的潮汐。',
    minTurn: 37,
    maxTurn: 9999,
  },
  {
    id: 'late_intl_status',
    category: '国际视角',
    phase: 'late',
    title: '他国镜鉴',
    text: '我国国旗飘扬在数十个国际组织的会场前厅，外国教科书中已开始用专门章节描述这个国家的崛起。当年的观望者已变成参与者，当年的质疑者已变成合作者。世界习惯了我国的身影，正如我国习惯了世界的目光。',
    minTurn: 37,
    maxTurn: 9999,
  },
  {
    id: 'late_intl_summit',
    category: '国际视角',
    phase: 'late',
    title: '峰会座次',
    text: '在某次国际峰会的合影里，我国总理被安排在了第一排正中。这个位置十年前还属于别人，如今却仿佛天然就该如此。闪光灯亮起的瞬间，历史也被悄悄定格——一个国家的份量，往往就藏在这些不言自明的细节里。',
    minTurn: 37,
    maxTurn: 9999,
  },
  {
    id: 'late_season_spring',
    category: '节令时序',
    phase: 'late',
    title: '任末春风',
    text: '又是一年玉兰花开，总理府花园里的树比就职时高了一截。园丁换了三任，政策改了又改，唯有春风年年如期。站在窗前看花瓣落进庭院的池水，总理忽然想起就职那日许下的誓言——有些做到了，有些仍在路上，有些，或许永远只能留在心里。',
    minTurn: 37,
    maxTurn: 9999,
  },
]

/**
 * 根据当前回合挑选一个符合条件的随机故事节拍
 *  - 自动按 turn 匹配阶段与 minTurn/maxTurn
 *  - 通过 excludeId 避免连续两次抽到同一条
 *  - 若无候选（理论上不会发生），返回 null
 */
export function pickStoryBeat(state: GameState, excludeId?: string | null): StoryBeat | null {
  const turn = state.turn
  const eligible = STORY_BEATS.filter(
    (b) => turn >= b.minTurn && turn <= b.maxTurn && b.id !== excludeId,
  )
  if (eligible.length === 0) return null
  const idx = Math.floor(Math.random() * eligible.length)
  return eligible[idx]
}
