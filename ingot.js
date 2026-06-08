// ========== INGOT МОДУЛЬ: ПРОГРЕССИЯ СЛИТКА ==========

export const INGOT_LEVELS = {
  1: {
    level: 1,
    name: 'Ржавый Слиток',
    icon: '🪨',
    era: 'Эпоха Шахт',
    shavingsCost: 50,
    ingotCost: { copper: 3 }
  },
  2: {
    level: 2,
    name: 'Чугунный Слиток',
    icon: '⚫',
    era: 'Эпоха Шахт',
    shavingsCost: 100,
    ingotCost: { iron: 2, coal: 2 }
  },
  3: {
    level: 3,
    name: 'Медный Слиток',
    icon: '🟫',
    era: 'Эпоха Шахт',
    shavingsCost: 200,
    ingotCost: { copper: 5, tin: 2 }
  },
  4: {
    level: 4,
    name: 'Железный Слиток',
    icon: '⬜',
    era: 'Эпоха Шахт',
    shavingsCost: 350,
    ingotCost: { iron: 5, nickel: 2, coal: 3 }
  },
  5: {
    level: 5,
    name: 'Бронзовый Слиток',
    icon: '🟤',
    era: 'Эпоха Джунглей',
    shavingsCost: 500,
    ingotCost: { vinebronze: 2, woodalloy: 1 }
  },
  6: {
    level: 6,
    name: 'Стальной Слиток',
    icon: '🔩',
    era: 'Эпоха Джунглей',
    shavingsCost: 750,
    ingotCost: { iron: 4, coal: 4, nickel: 2 }
  },
  7: {
    level: 7,
    name: 'Изумрудный Слиток',
    icon: '💚',
    era: 'Эпоха Джунглей',
    shavingsCost: 1000,
    ingotCost: { emeraldsteel: 2, biocopper: 3 }
  },
  8: {
    level: 8,
    name: 'Окисленный Слиток',
    icon: '🥈',
    era: 'Эпоха Джунглей',
    shavingsCost: 1400,
    ingotCost: { oxidizedsilver: 2, vinebronze: 3, woodalloy: 2 }
  },
  9: {
    level: 9,
    name: 'Био-Стальной Слиток',
    icon: '🧬',
    era: 'Эпоха Джунглей',
    shavingsCost: 1800,
    ingotCost: { biocopper: 4, emeraldsteel: 2, woodalloy: 3 }
  },
  10: {
    level: 10,
    name: 'Вольфрамовый Слиток',
    icon: '⭐',
    era: 'Пояс Астероидов',
    shavingsCost: 2500,
    ingotCost: { starchrome: 2, titanium: 2, cobalt: 1 }
  },
  11: {
    level: 11,
    name: 'Титановый Слиток',
    icon: '🔷',
    era: 'Пояс Астероидов',
    shavingsCost: 3500,
    ingotCost: { titanium: 4, starchrome: 3, lunarsilver: 2 }
  },
  12: {
    level: 12,
    name: 'Кобальтовый Слиток',
    icon: '🔵',
    era: 'Пояс Астероидов',
    shavingsCost: 5000,
    ingotCost: { cobalt: 4, titanium: 3, platincon: 2 }
  },
  13: {
    level: 13,
    name: 'Иридиевый Слиток',
    icon: '💠',
    era: 'Далёкий Космос',
    shavingsCost: 7000,
    ingotCost: { iridium: 2, platincon: 4, lunarsilver: 3 }
  },
  14: {
    level: 14,
    name: 'Платиновый Слиток',
    icon: '💎',
    era: 'Далёкий Космос',
    shavingsCost: 10000,
    ingotCost: { platincon: 6, iridium: 3, starchrome: 4 }
  },
  15: {
    level: 15,
    name: 'Космониумный Слиток',
    icon: '🌈',
    era: 'Далёкий Космос',
    shavingsCost: 15000,
    ingotCost: { cosmonium: 1, nebulite: 2, singular: 2, meteor_gold: 3 }
  }
};
