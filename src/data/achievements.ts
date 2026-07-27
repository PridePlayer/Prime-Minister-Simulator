import type { Achievement } from '@/types/game'

/** 成就定义 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach_first',
    name: '初登大宝',
    desc: '就任首届总理',
    icon: '🏛️',
    unlocked: false,
  },
  {
    id: 'ach_reelect',
    name: '成功连任',
    desc: '在大选中获得连任',
    icon: '🗳️',
    unlocked: false,
  },
  {
    id: 'ach_three_terms',
    name: '三朝元老',
    desc: '连任两届以上',
    icon: '👑',
    unlocked: false,
  },
  {
    id: 'ach_full_house',
    name: '满堂喝彩',
    desc: '六项国家指标同时达到 85 以上',
    icon: '🌟',
    unlocked: false,
  },
  {
    id: 'ach_survivor',
    name: '不倒翁',
    desc: '民意跌破 20 后回升至 50 以上',
    icon: '🪂',
    unlocked: false,
  },
  {
    id: 'ach_economy_miracle',
    name: '经济奇迹',
    desc: '经济指数达到 100',
    icon: '📈',
    unlocked: false,
  },
  {
    id: 'ach_diplomacy_master',
    name: '外交大师',
    desc: '外交关系达到 100',
    icon: '🕊️',
    unlocked: false,
  },
  {
    id: 'ach_centurion',
    name: '长青总理',
    desc: '执政超过 150 个回合',
    icon: '⏳',
    unlocked: false,
  },
]
