// ========== КОНФИГУРАЦИЯ ИГРЫ STAR FORGE ==========
export const CONFIG_ITEMS = {
    // ========== ОБЫЧНЫЕ СЛИТКИ (ШАХТЫ) ==========
    copper: { 
        id: 'copper', name: 'Медь', icon: '🟫', 
        rarity: 'Обычный', rarityClass: 'common', rarityLevel: 'common',
        sourceType: 'expedition', location: 'mine',
        glowClass: 'glow-copper', 
        description: 'Фундаментальный металл цивилизации. Медь используется в электропроводке всех космических кораблей. Её теплый блеск символизирует начало великого пути коллекционера. В древности медь ценилась на вес золота, и сегодня она остаётся критически важным ресурсом для колонизации дальних миров.', 
        imagePath: 'assets/ingots/copper.png', fallbackColor: '#B87333', isCollectible: false, xpValue: 5, sellValue: 5 
    },
    iron: { 
        id: 'iron', name: 'Железо', icon: '⬜', 
        rarity: 'Обычный', rarityClass: 'common', rarityLevel: 'common',
        sourceType: 'expedition', location: 'mine',
        glowClass: 'glow-iron', 
        description: 'Основа промышленности. Железо — это скелет космических станций и каркас межзвёздных крейсеров. Его добывают в недрах планет, где оно формировалось миллиарды лет. Несмотря на кажущуюся простоту, без железа невозможна экспансия человечества в глубокий космос. Каждый слиток — вклад в будущее.', 
        imagePath: 'assets/ingots/iron.png', fallbackColor: '#A8A9AD', isCollectible: false, xpValue: 5, sellValue: 5 
    },
    coal: { 
        id: 'coal', name: 'Угольный брикет', icon: '⬛', 
        rarity: 'Обычный', rarityClass: 'common', rarityLevel: 'common',
        sourceType: 'expedition', location: 'mine',
        glowClass: 'glow-copper', 
        description: 'Спрессованная энергия древних лесов. Уголь — это не просто топливо, это память планеты. В условиях космоса угольные брикеты используются в системах фильтрации и как сырьё для синтеза наноматериалов. Его матовая чернота скрывает потенциал, который раскрывается лишь при сверхвысоких температурах.', 
        imagePath: 'assets/ingots/coal.png', fallbackColor: '#2C2C2E', isCollectible: false, xpValue: 4, sellValue: 4 
    },
    tin: { 
        id: 'tin', name: 'Олово', icon: '🔘', 
        rarity: 'Обычный', rarityClass: 'common', rarityLevel: 'common',
        sourceType: 'expedition', location: 'mine',
        glowClass: 'glow-iron', 
        description: 'Мягкий, но стратегически важный металл. Олово незаменимо для создания припоев и сплавов, устойчивых к коррозии. На космических верфях оловянные соединения защищают критически важные узлы от разрушения. Его серебристый отлив напоминает о холодном свете далёких лун.', 
        imagePath: 'assets/ingots/tin.png', fallbackColor: '#C0C0C0', isCollectible: false, xpValue: 5, sellValue: 5 
    },
    nickel: { 
        id: 'nickel', name: 'Никель', icon: '🔩', 
        rarity: 'Обычный', rarityClass: 'common', rarityLevel: 'common',
        sourceType: 'expedition', location: 'mine',
        glowClass: 'glow-iron', 
        description: 'Ключевой компонент нержавеющей стали и суперсплавов. Никель придаёт металлам прочность и устойчивость к экстремальным температурам. Его часто находят в метеоритах, что делает его мостом между геологией планет и тайнами космоса. Каждый слиток никеля — это шаг к созданию неуязвимых кораблей.', 
        imagePath: 'assets/ingots/nickel.png', fallbackColor: '#A0A0A0', isCollectible: false, xpValue: 6, sellValue: 6 
    },
    lead: { 
        id: 'lead', name: 'Свинец', icon: '🔘', 
        rarity: 'Обычный', rarityClass: 'common', rarityLevel: 'common',
        sourceType: 'expedition', location: 'mine',
        glowClass: 'glow-iron', 
        description: 'Тяжёлый и надёжный защитник. Свинец используется для экранирования от радиации в ядерных реакторах и космических скафандрах. Его плотная структура поглощает смертоносные лучи, позволяя исследовать самые опасные уголки галактики. Мрачный блеск свинца — это обещание безопасности.', 
        imagePath: 'assets/ingots/lead.png', fallbackColor: '#6B6B6B', isCollectible: false, xpValue: 5, sellValue: 5 
    },
    
    // ========== СЛИТКИ ДЖУНГЛЕЙ ==========
    biocopper: { 
        id: 'biocopper', name: 'Био-медь', icon: '🧪', 
        rarity: 'Редкий', rarityClass: 'rare', rarityLevel: 'rare',
        sourceType: 'expedition', location: 'jungle',
        glowClass: 'glow-gold', 
        description: 'Удивительный сплав, созданный симбиозом меди и микроорганизмов джунглей. Био-медь обладает способностью к самовосстановлению при подаче слабого электричества. Её зеленоватое свечение указывает на активные биологические процессы внутри. Это материал будущего для самовосстанавливающихся кораблей.', 
        imagePath: 'assets/ingots/biocopper.png', fallbackColor: '#4CAF50', isCollectible: false, xpValue: 15, sellValue: 15 
    },
    oxidizedsilver: { 
        id: 'oxidizedsilver', name: 'Окисленное серебро', icon: '🥈', 
        rarity: 'Редкий', rarityClass: 'rare', rarityLevel: 'rare',
        sourceType: 'expedition', location: 'jungle',
        glowClass: 'glow-platinum', 
        description: 'Серебро, веками лежавшее во влажных недрах джунглей. Оксидная плёнка придаёт ему радужные переливы и уникальные антибактериальные свойства. В медицине дальнего космоса такие слитки ценятся выше чистого серебра, так как их поверхность стерильна и ускоряет заживление ран.', 
        imagePath: 'assets/ingots/oxidizedsilver.png', fallbackColor: '#C0C0C0', isCollectible: false, xpValue: 18, sellValue: 18 
    },
    emeraldsteel: { 
        id: 'emeraldsteel', name: 'Изумрудная сталь', icon: '💚', 
        rarity: 'Эпический', rarityClass: 'epic', rarityLevel: 'epic',
        sourceType: 'expedition', location: 'jungle',
        glowClass: 'glow-platinum', 
        description: 'Легендарный сплав, в кристаллической решётке которого содержатся атомы изумруда. Изумрудная сталь невероятно острая и никогда не тупится. Клинки из неё способны разрезать даже композитную броню. Её зелёное сияние — признак высочайшего мастерства древних кузнецов джунглей.', 
        imagePath: 'assets/ingots/emeraldsteel.png', fallbackColor: '#50C878', isCollectible: false, xpValue: 35, sellValue: 35 
    },
    woodalloy: { 
        id: 'woodalloy', name: 'Древесный сплав', icon: '🪵', 
        rarity: 'Редкий', rarityClass: 'rare', rarityLevel: 'rare',
        sourceType: 'expedition', location: 'jungle',
        glowClass: 'glow-gold', 
        description: 'Уникальный композит, сочетающий прочность металла и лёгкость дерева. Создаётся путём пропитки особых пород деревьев расплавленными минералами. Древесный сплав используется для создания эргономичных деталей интерьера премиальных яхт и орбитальных станций.', 
        imagePath: 'assets/ingots/woodalloy.png', fallbackColor: '#8B4513', isCollectible: false, xpValue: 20, sellValue: 20 
    },
    vinebronze: { 
        id: 'vinebronze', name: 'Лиановая бронза', icon: '🌿', 
        rarity: 'Редкий', rarityClass: 'rare', rarityLevel: 'rare',
        sourceType: 'expedition', location: 'jungle',
        glowClass: 'glow-gold', 
        description: 'Бронза, армированная волокнами космических лиан. Эти лианы способны выдерживать перепады давления и температур, делая сплав идеальным для внешней обшивки кораблей, садящихся на планеты с агрессивной атмосферой. Её коричневато-зелёный оттенок напоминает о буйстве жизни.', 
        imagePath: 'assets/ingots/vinebronze.png', fallbackColor: '#CD7F32', isCollectible: false, xpValue: 22, sellValue: 22 
    },
    
    // ========== СЛИТКИ АСТЕРОИДОВ ==========
    titanium: { 
        id: 'titanium', name: 'Титан', icon: '🔷', 
        rarity: 'Эпический', rarityClass: 'epic', rarityLevel: 'epic',
        sourceType: 'expedition', location: 'asteroid',
        glowClass: 'glow-platinum', 
        description: 'Бог среди металлов. Титан сочетает невероятную прочность с поразительной лёгкостью. Из него строят каркасы звездолётов, способных выходить в гиперпространство. Добыча титана в поясе астероидов — опасное, но крайне прибыльное занятие. Его холодный синий блеск вселяет уверенность.', 
        imagePath: 'assets/ingots/titanium.png', fallbackColor: '#5A9CFF', isCollectible: false, xpValue: 40, sellValue: 40 
    },
    cobalt: { 
        id: 'cobalt', name: 'Кобальт', icon: '🔵', 
        rarity: 'Редкий', rarityClass: 'rare', rarityLevel: 'rare',
        sourceType: 'expedition', location: 'asteroid',
        glowClass: 'glow-gold', 
        description: 'Стратегический металл для производства аккумуляторов и жаропрочных сплавов. Кобальт из астероидов отличается исключительной чистотой и используется в реакторах военных крейсеров. Его глубокий синий цвет символизирует бескрайние глубины космоса, откуда он прибыл.', 
        imagePath: 'assets/ingots/cobalt.png', fallbackColor: '#0047AB', isCollectible: false, xpValue: 25, sellValue: 25 
    },
    iridium: { 
        id: 'iridium', name: 'Иридиевый стержень', icon: '💠', 
        rarity: 'Легендарный', rarityClass: 'legendary', rarityLevel: 'legendary',
        sourceType: 'expedition', location: 'asteroid',
        glowClass: 'glow-diamond', 
        description: 'Один из самых редких и плотных металлов во вселенной. Иридий невероятно устойчив к коррозии и высоким температурам. Из него изготавливают сердечники варп-двигателей и защитные купола для колоний на вулканических планетах. Владеть иридием — значит владеть частицей вечности.', 
        imagePath: 'assets/ingots/iridium.png', fallbackColor: '#E5E4E2', isCollectible: false, xpValue: 60, sellValue: 60 
    },
    platincon: { 
        id: 'platincon', name: 'Платиновый концентрат', icon: '💎', 
        rarity: 'Эпический', rarityClass: 'epic', rarityLevel: 'epic',
        sourceType: 'expedition', location: 'asteroid',
        glowClass: 'glow-platinum', 
        description: 'Высококонцентрированная платиновая руда, прошедшая первичную обработку прямо в невесомости. Содержит не только платину, но и редкоземельные элементы. Концентрат ценится ювелирами и инженерами за возможность создавать уникальные сплавы с заданными свойствами.', 
        imagePath: 'assets/ingots/platincon.png', fallbackColor: '#E5E4E2', isCollectible: false, xpValue: 45, sellValue: 45 
    },
    lunarsilver: { 
        id: 'lunarsilver', name: 'Лунное серебро', icon: '🌙', 
        rarity: 'Редкий', rarityClass: 'rare', rarityLevel: 'rare',
        sourceType: 'expedition', location: 'asteroid',
        glowClass: 'glow-gold', 
        description: 'Серебро, миллиарды лет облучавшееся космическими лучами. Приобрело уникальный молочный оттенок и слабые люминесцентные свойства. Лунное серебро используется в точной оптике и для создания зеркал телескопов, заглядывающих в самые далёкие галактики.', 
        imagePath: 'assets/ingots/lunarsilver.png', fallbackColor: '#F5F5DC', isCollectible: false, xpValue: 28, sellValue: 28 
    },
    starchrome: { 
        id: 'starchrome', name: 'Звёздный хром', icon: '⭐', 
        rarity: 'Эпический', rarityClass: 'epic', rarityLevel: 'epic',
        sourceType: 'expedition', location: 'asteroid',
        glowClass: 'glow-platinum', 
        description: 'Хром, добытый из осколков сверхновых. Его поверхность переливается всеми цветами радуги благодаря микроскопическим вкраплениям других элементов. Звёздный хром — излюбленный материал дизайнеров для создания эксклюзивных корпусов личных звездолётов. Это металл, рождённый в огне.', 
        imagePath: 'assets/ingots/starchrome.png', fallbackColor: '#C0C0C0', isCollectible: false, xpValue: 38, sellValue: 38 
    },
    
    // ========== КРАФТОВЫЕ СЛИТКИ ==========
    black_mirror: { 
        id: 'black_mirror', name: 'Чёрное Зеркало', icon: '🌑', 
        rarity: 'Крафтовый', rarityClass: 'epic', rarityLevel: 'epic',
        sourceType: 'crafted', location: 'craft',
        glowClass: 'glow-darkmatter', 
        description: 'Загадочный артефакт, созданный в горниле Великой Переплавки. Чёрное Зеркало не отражает свет — оно поглощает его, открывая врата в неизведанные измерения. Говорят, тот кто заглянет в него достаточно долго, увидит отражение своей истинной судьбы. Создаётся из чистейшего угля и прочного железа.', 
        imagePath: 'assets/ingots/black_mirror.png', fallbackColor: '#1a1a1a', isCollectible: false, xpValue: 50, sellValue: 120 
    },
    astro_bronze: { 
        id: 'astro_bronze', name: 'Астро-Бронза', icon: '🛰️', 
        rarity: 'Крафтовый', rarityClass: 'epic', rarityLevel: 'epic',
        sourceType: 'crafted', location: 'craft',
        glowClass: 'glow-platinum', 
        description: 'Сплав, созданный по технологиям древних космических цивилизаций. Астро-Бронза невероятно лёгкая и устойчивая к радиации. Легенды гласят, что именно из такого материала были построены первые межзвёздные корабли, способные преодолевать горизонты событий чёрных дыр.', 
        imagePath: 'assets/ingots/astro_bronze.png', fallbackColor: '#CDAA7D', isCollectible: false, xpValue: 65, sellValue: 150 
    },
    chrome_titan: { 
        id: 'chrome_titan', name: 'Хромированный Титан', icon: '🛡️', 
        rarity: 'Крафтовый', rarityClass: 'epic', rarityLevel: 'epic',
        sourceType: 'crafted', location: 'craft',
        glowClass: 'glow-platinum', 
        description: 'Сверхпрочная броня из титана с хромовым покрытием. Используется для создания непробиваемых щитов и корпусов военных крейсеров. Поверхность сплава настолько твёрдая, что способна выдержать прямое попадание астероида.', 
        imagePath: 'assets/ingots/chrome_titan.png', fallbackColor: '#7B9FC5', isCollectible: false, xpValue: 80, sellValue: 180 
    },
    platinum_alloy: { 
        id: 'platinum_alloy', name: 'Платиновый Сплав', icon: '💎', 
        rarity: 'Крафтовый', rarityClass: 'legendary', rarityLevel: 'legendary',
        sourceType: 'crafted', location: 'craft',
        glowClass: 'glow-diamond', 
        description: 'Вершина кузнечного мастерства. Платина и иридий сливаются в сплав, который не подвластен времени и коррозии. Его блеск виден за сотни метров, а прочность позволяет ковать из него королевские регалии и детали варп-двигателей.', 
        imagePath: 'assets/ingots/platinum_alloy.png', fallbackColor: '#E6E8FA', isCollectible: false, xpValue: 120, sellValue: 250 
    },
    
    // ========== ☄️ МЕТЕОРИТНЫЕ СЛИТКИ ==========
    rheolite: { 
        id: 'rheolite', name: 'Реолит', icon: '🪨', 
        rarity: 'Обычный', rarityClass: 'common', rarityLevel: 'common',
        sourceType: 'meteor', location: 'meteor',
        glowClass: 'glow-iron', 
        description: 'Матовый серый металл, основа основ метеоритного пояса. Реолит формируется в сердце астероидов под воздействием колоссального давления и космического холода. Несмотря на кажущуюся невзрачность, этот металл служит фундаментом для создания передовых космических сплавов. Тысячи старателей начинают свой путь именно с него.', 
        imagePath: 'assets/ingots/rheolite.png', fallbackColor: '#9E9E9E', isCollectible: false, xpValue: 8, sellValue: 8 
    },
    ferrite: { 
        id: 'ferrite', name: 'Феррит', icon: '🪨', 
        rarity: 'Обычный', rarityClass: 'common', rarityLevel: 'common',
        sourceType: 'meteor', location: 'meteor',
        glowClass: 'glow-iron', 
        description: 'Тяжёлое, грубое метеоритное железо, прошедшее через атмосферу сотен миров. Феррит магнитится к ядру планет и часто используется для создания навигационных систем дальнего космоса. Его грубая текстура хранит историю столкновений целых галактик.', 
        imagePath: 'assets/ingots/ferrite.png', fallbackColor: '#6B6B6B', isCollectible: false, xpValue: 10, sellValue: 10 
    },
    cosmic_steel: { 
        id: 'cosmic_steel', name: 'Космическая Сталь', icon: '🌌', 
        rarity: 'Обычный', rarityClass: 'common', rarityLevel: 'common',
        sourceType: 'meteor', location: 'meteor',
        glowClass: 'glow-iron', 
        description: 'Прочный сплав, выкованный из обломков обшивки неизвестных кораблей, дрейфующих в пустоте миллионы лет. Космическая Сталь хранит в себе память о давно исчезнувших цивилизациях. Её поверхность покрыта микроскопическими символами, которые до сих пор не удалось расшифровать.', 
        imagePath: 'assets/ingots/cosmic_steel.png', fallbackColor: '#78909C', isCollectible: false, xpValue: 12, sellValue: 12 
    },
    siderite: { 
        id: 'siderite', name: 'Сидерит', icon: '💫', 
        rarity: 'Редкий', rarityClass: 'rare', rarityLevel: 'rare',
        sourceType: 'meteor', location: 'meteor',
        glowClass: 'glow-gold', 
        description: 'Искрящийся ингот с вкраплениями кристаллических космических зёрен. При ударе о твёрдую поверхность Сидерит издаёт мелодичный звон, напоминающий пение далёких звёзд. Ювелиры отдают за него целые состояния, чтобы создать украшения, мерцающие как Млечный Путь.', 
        imagePath: 'assets/ingots/siderite.png', fallbackColor: '#C0C0C0', isCollectible: false, xpValue: 25, sellValue: 25 
    },
    star_silver: { 
        id: 'star_silver', name: 'Звёздное Серебро', icon: '⭐', 
        rarity: 'Редкий', rarityClass: 'rare', rarityLevel: 'rare',
        sourceType: 'meteor', location: 'meteor',
        glowClass: 'glow-platinum', 
        description: 'Благородный металл, излучающий мягкий лунный свет даже в полной темноте. Звёздное Серебро использовалось древними звездоплавателями для создания вечных источников света на борту ковчегов. Прикосновение к нему вызывает чувство невесомости и покоя.', 
        imagePath: 'assets/ingots/star_silver.png', fallbackColor: '#E8E8E8', isCollectible: false, xpValue: 30, sellValue: 30 
    },
    astralium: { 
        id: 'astralium', name: 'Астралиум', icon: '💜', 
        rarity: 'Эпический', rarityClass: 'epic', rarityLevel: 'epic',
        sourceType: 'meteor', location: 'meteor',
        glowClass: 'glow-platinum', 
        description: 'Фиолетовый переливающийся сплав, впитавший энергию звёздной пыли туманностей. Астралиум пульсирует в такт с космическим микроволновым фоном — эхом Большого Взрыва. Учёные полагают, что он может стать ключом к пониманию тёмной энергии.', 
        imagePath: 'assets/ingots/astralium.png', fallbackColor: '#9C27B0', isCollectible: false, xpValue: 50, sellValue: 50 
    },
    luminor: { 
        id: 'luminor', name: 'Люминор', icon: '💙', 
        rarity: 'Эпический', rarityClass: 'epic', rarityLevel: 'epic',
        sourceType: 'meteor', location: 'meteor',
        glowClass: 'glow-platinum', 
        description: 'Ярко-синий ингот, который пульсирует неоновым светом в присутствии живых существ. Люминор реагирует на биополе, меняя яркость свечения. Его используют для создания медицинских сканеров, способных находить жизнь на расстоянии сотен километров.', 
        imagePath: 'assets/ingots/luminor.png', fallbackColor: '#00BCD4', isCollectible: false, xpValue: 55, sellValue: 55 
    },
    meteor_gold: { 
        id: 'meteor_gold', name: 'Метеоритное Золото', icon: '✨', 
        rarity: 'Эпический', rarityClass: 'epic', rarityLevel: 'epic',
        sourceType: 'meteor', location: 'meteor',
        glowClass: 'glow-platinum', 
        description: 'Чистейшее космическое золото со шлейфом из микрочастиц, танцующих вокруг слитка. Метеоритное Золото никогда не тускнеет и не окисляется. Легенды гласят, что оно способно исполнить одно желание того, кто добудет его в сердце падающей звезды.', 
        imagePath: 'assets/ingots/meteor_gold.png', fallbackColor: '#FFD700', isCollectible: false, xpValue: 60, sellValue: 60 
    },
    singular: { 
        id: 'singular', name: 'Сингуляр', icon: '🕳️', 
        rarity: 'Легендарный', rarityClass: 'legendary', rarityLevel: 'legendary',
        sourceType: 'meteor', location: 'meteor',
        glowClass: 'glow-diamond', 
        description: 'Абсолютно чёрный слиток, поглощающий свет вокруг себя. Сингуляр на ощупь холоднее абсолютного нуля, но при этом не обжигает кожу. Физики предполагают, что внутри него заключена микроскопическая сингулярность — точка, где законы физики перестают работать.', 
        imagePath: 'assets/ingots/singular.png', fallbackColor: '#000000', isCollectible: false, xpValue: 100, sellValue: 100 
    },
    nebulite: { 
        id: 'nebulite', name: 'Небулит', icon: '🌌', 
        rarity: 'Легендарный', rarityClass: 'legendary', rarityLevel: 'legendary',
        sourceType: 'meteor', location: 'meteor',
        glowClass: 'glow-diamond', 
        description: 'Металл, внутри которого заперта переливающаяся неоновая микро-галактика. Небулит был найден в самом центре Крабовидной туманности и, по оценкам учёных, содержит в себе материю возрастом 4.5 миллиарда лет. Вглядываясь в него, можно увидеть рождение новых миров.', 
        imagePath: 'assets/ingots/nebulite.png', fallbackColor: '#FF4081', isCollectible: false, xpValue: 120, sellValue: 120 
    },
    cosmonium: { 
        id: 'cosmonium', name: 'Космониум', icon: '🌈', 
        rarity: 'Легендарный', rarityClass: 'legendary', rarityLevel: 'legendary',
        sourceType: 'meteor', location: 'meteor',
        glowClass: 'glow-diamond', 
        description: 'Вершина космической эволюции, сверкающая всеми спектрами радуги одновременно. Космониум — самый редкий из известных металлов, его месторождения встречаются лишь в осколках сверхновых типа Ia. Говорят, что один грамм Космониума способен питать целый город энергией в течение года.', 
        imagePath: 'assets/ingots/cosmonium.png', fallbackColor: '#FFFFFF', isCollectible: false, xpValue: 150, sellValue: 150 
    },
    
    // ========== КОЛЛЕКЦИОННЫЕ АРТЕФАКТЫ (НЕ ТРОГАЕМ) ==========
    isotope: { 
        id: 'isotope', name: 'Изотоп-256', icon: '☢️', 
        rarity: 'COLLECTIBLE', rarityClass: 'collectible', rarityLevel: 'collectible',
        sourceType: 'expedition', location: 'mine',
        glowClass: 'glow-isotope', 
        description: 'Древняя легенда шахтёров. Говорят, Изотоп-256 — это осколок давно погасшей звезды, упавший в недра планеты миллионы лет назад. Его радиоактивное мерцание гипнотизирует. Учёные до сих пор спорят о его происхождении, но сходятся в одном: второго такого артефакта во всей галактике не существует.', 
        imagePath: 'assets/ingots/isotope.png', fallbackColor: '#00FFC8', isCollectible: true, xpValue: 300, sellValue: 500 
    },
    osmium: { 
        id: 'osmium', name: 'Древний Осмий', icon: '🪨', 
        rarity: 'COLLECTIBLE', rarityClass: 'collectible', rarityLevel: 'collectible',
        sourceType: 'expedition', location: 'mine',
        glowClass: 'glow-osmium', 
        description: 'Самый плотный природный элемент во вселенной. Этот осмий старше самой Солнечной системы. Он прибыл к нам из глубин Млечного Пути, пережив рождение и смерть десятков звёзд. Прикоснуться к нему — значит прикоснуться к вечности.', 
        imagePath: 'assets/ingots/osmium.png', fallbackColor: '#9664FF', isCollectible: true, xpValue: 300, sellValue: 500 
    },
    biosteel: { 
        id: 'biosteel', name: 'Био-Сталь', icon: '🧬', 
        rarity: 'COLLECTIBLE', rarityClass: 'collectible', rarityLevel: 'collectible',
        sourceType: 'expedition', location: 'jungle',
        glowClass: 'glow-biosteel', 
        description: 'Венец эволюции органических металлов. Био-Сталь — это не просто материал, это симбионт. Она растёт, дышит и способна к примитивной регенерации. Слиток Био-Стали тёплый на ощупь и едва заметно вибрирует, словно живое сердце.', 
        imagePath: 'assets/ingots/biosteel.png', fallbackColor: '#32C864', isCollectible: true, xpValue: 400, sellValue: 700 
    },
    relicbronze: { 
        id: 'relicbronze', name: 'Реликтовая Бронза', icon: '🏺', 
        rarity: 'COLLECTIBLE', rarityClass: 'collectible', rarityLevel: 'collectible',
        sourceType: 'expedition', location: 'jungle',
        glowClass: 'glow-relicbronze', 
        description: 'Сплав, созданный не человеческими руками. На его поверхности выгравированы символы, не поддающиеся расшифровке. Реликтовая Бронза не поддаётся никаким современным инструментам — её нельзя расплавить, разрезать или поцарапать.', 
        imagePath: 'assets/ingots/relicbronze.png', fallbackColor: '#C87832', isCollectible: true, xpValue: 400, sellValue: 700 
    },
    tungsten: { 
        id: 'tungsten', name: 'Звёздный Вольфрам', icon: '⭐', 
        rarity: 'COLLECTIBLE', rarityClass: 'collectible', rarityLevel: 'collectible',
        sourceType: 'expedition', location: 'asteroid',
        glowClass: 'glow-tungsten', 
        description: 'Металл, прошедший горнило сверхновой. Имеет самую высокую температуру плавления среди всех известных веществ. Способен накапливать и высвобождать огромное количество энергии.', 
        imagePath: 'assets/ingots/tungsten.png', fallbackColor: '#6496FF', isCollectible: true, xpValue: 500, sellValue: 900 
    },
    darkmatter: { 
        id: 'darkmatter', name: 'Тёмная Материя', icon: '🌑', 
        rarity: 'COLLECTIBLE', rarityClass: 'collectible', rarityLevel: 'collectible',
        sourceType: 'expedition', location: 'asteroid',
        glowClass: 'glow-darkmatter', 
        description: 'Стабилизированный сгусток невидимой субстанции, из которой состоит большая часть Вселенной. Не взаимодействует со светом, но её гравитационное влияние колоссально. Учёные предполагают, что это ключ к пониманию структуры мироздания.', 
        imagePath: 'assets/ingots/darkmatter.png', fallbackColor: '#B400FF', isCollectible: true, xpValue: 500, sellValue: 900 
    },
    
    // ========== 🏆 ОСОБЫЕ КОЛЛЕКЦИОННЫЕ МЕТЕОРИТНЫЕ СЛИТКИ ==========
    orion: { 
        id: 'orion', name: 'Орион', icon: '🔵', 
        rarity: 'COLLECTIBLE', rarityClass: 'collectible', rarityLevel: 'collectible',
        sourceType: 'special_meteor', location: 'meteor',
        glowClass: 'glow-osmium', 
        description: 'Глубокий тёмно-синий слиток с эффектом живого звёздного неба внутри. Вглядываясь в Орион, можно увидеть движущиеся созвездия и целые галактические рукава. Говорят, что он был создан в поясе Ориона — колыбели самых ярких звёзд Млечного Пути.', 
        imagePath: 'assets/ingots/orion.png', fallbackColor: '#0D47A1', isCollectible: true, xpValue: 800, sellValue: 1500 
    },
    andromeda: { 
        id: 'andromeda', name: 'Андромеда', icon: '💜', 
        rarity: 'COLLECTIBLE', rarityClass: 'collectible', rarityLevel: 'collectible',
        sourceType: 'special_meteor', location: 'meteor',
        glowClass: 'glow-darkmatter', 
        description: 'Красно-фиолетовый бурлящий металл, символизирующий расширение Вселенной. Андромеда пульсирует в такт с движением нашей галактики к туманности Андромеды. Учёные считают, что этот металл содержит в себе энергию Великого Аттрактора — загадочной силы, притягивающей целые скопления галактик.', 
        imagePath: 'assets/ingots/andromeda.png', fallbackColor: '#6A1B9A', isCollectible: true, xpValue: 800, sellValue: 1500 
    }
};

export const CRAFT_RECIPES = {
    black_mirror: { id: 'black_mirror', name: 'Чёрное Зеркало', icon: '🌑', description: 'Объедини уголь и железо.', resultIngotId: 'black_mirror', ingredients: { iron: 2, coal: 1 }, xpReward: 30, smeltTime: 10 },
    astro_bronze: { id: 'astro_bronze', name: 'Астро-Бронза', icon: '🛰️', description: 'Сплав космических технологий.', resultIngotId: 'astro_bronze', ingredients: { vinebronze: 3, lunarsilver: 1 }, xpReward: 45, smeltTime: 15 },
    chrome_titan: { id: 'chrome_titan', name: 'Хромированный Титан', icon: '🛡️', description: 'Броня из титана и хрома.', resultIngotId: 'chrome_titan', ingredients: { titanium: 2, starchrome: 1 }, xpReward: 55, smeltTime: 20 },
    platinum_alloy: { id: 'platinum_alloy', name: 'Платиновый Сплав', icon: '💎', description: 'Платина и иридий.', resultIngotId: 'platinum_alloy', ingredients: { platincon: 5, iridium: 2 }, xpReward: 75, smeltTime: 25 }
};

export const CONFIG_GEODES = {
    mine: { id: 'mine', name: 'Жеода Шахт', icon: '🪨', isSpecial: false, timer: 30, description: 'Глубинная порода, хранящая тепло земных недр.', stages: [{ minTaps: 7, maxTaps: 10, imagePath: 'assets/geodes/mine_stage1.png', fallbackIcon: '🪨' }, { minTaps: 3, maxTaps: 6, imagePath: 'assets/geodes/mine_stage2.png', fallbackIcon: '💔' }, { minTaps: 1, maxTaps: 2, imagePath: 'assets/geodes/mine_stage3.png', fallbackIcon: '💥' }], lootTable: [{ ingotId: 'copper', chance: 0.30 }, { ingotId: 'iron', chance: 0.25 }, { ingotId: 'coal', chance: 0.15 }, { ingotId: 'tin', chance: 0.10 }, { ingotId: 'nickel', chance: 0.10 }, { ingotId: 'lead', chance: 0.10 }], xpValue: 10 },
    jungle: { id: 'jungle', name: 'Жеода Джунглей', icon: '🌲', isSpecial: false, timer: 300, description: 'Таинственная жеода, пропитанная энергией древних лесов.', stages: [{ minTaps: 7, maxTaps: 10, imagePath: 'assets/geodes/jungle_stage1.png', fallbackIcon: '🌲' }, { minTaps: 3, maxTaps: 6, imagePath: 'assets/geodes/jungle_stage2.png', fallbackIcon: '🍂' }, { minTaps: 1, maxTaps: 2, imagePath: 'assets/geodes/jungle_stage3.png', fallbackIcon: '🪵' }], lootTable: [{ ingotId: 'biocopper', chance: 0.20 }, { ingotId: 'oxidizedsilver', chance: 0.20 }, { ingotId: 'emeraldsteel', chance: 0.15 }, { ingotId: 'woodalloy', chance: 0.20 }, { ingotId: 'vinebronze', chance: 0.25 }], xpValue: 20 },
    asteroid: { id: 'asteroid', name: 'Жеода Астероидов', icon: '🌌', isSpecial: false, timer: 1200, description: 'Космический артефакт из пояса астероидов.', stages: [{ minTaps: 7, maxTaps: 10, imagePath: 'assets/geodes/asteroid_stage1.png', fallbackIcon: '🌌' }, { minTaps: 3, maxTaps: 6, imagePath: 'assets/geodes/asteroid_stage2.png', fallbackIcon: '☄️' }, { minTaps: 1, maxTaps: 2, imagePath: 'assets/geodes/asteroid_stage3.png', fallbackIcon: '💫' }], lootTable: [{ ingotId: 'titanium', chance: 0.20 }, { ingotId: 'cobalt', chance: 0.15 }, { ingotId: 'iridium', chance: 0.10 }, { ingotId: 'platincon', chance: 0.20 }, { ingotId: 'lunarsilver', chance: 0.15 }, { ingotId: 'starchrome', chance: 0.20 }], xpValue: 40 },
    
    // ========== ☄️ НОВЫЕ МЕТЕОРИТНЫЕ ЖЕОДЫ ==========
    meteor_common: { 
        id: 'meteor_common', name: 'Космический обломок', icon: '☄️', isSpecial: false, timer: 60, 
        description: 'Обычный осколок метеоритного дождя, упавший из пояса астероидов. Внутри могут скрываться базовые космические металлы.', 
        stages: [{ minTaps: 7, maxTaps: 10, imagePath: 'assets/geodes/meteor_common_stage1.png', fallbackIcon: '☄️' }, { minTaps: 3, maxTaps: 6, imagePath: 'assets/geodes/meteor_common_stage2.png', fallbackIcon: '💫' }, { minTaps: 1, maxTaps: 2, imagePath: 'assets/geodes/meteor_common_stage3.png', fallbackIcon: '💥' }], 
        lootTable: [
            { ingotId: 'rheolite', chance: 0.35 },
            { ingotId: 'ferrite', chance: 0.30 },
            { ingotId: 'cosmic_steel', chance: 0.20 },
            { ingotId: 'siderite', chance: 0.10 },
            { ingotId: 'star_silver', chance: 0.05 }
        ], 
        xpValue: 15 
    },
    meteor_rare: { 
        id: 'meteor_rare', name: 'Звёздное ядро', icon: '🌟', isSpecial: false, timer: 600, 
        description: 'Редкое ядро разрушенной звезды, содержащее энергию термоядерного синтеза. Внутри спрятаны ценные космические металлы.', 
        stages: [{ minTaps: 7, maxTaps: 10, imagePath: 'assets/geodes/meteor_rare_stage1.png', fallbackIcon: '🌟' }, { minTaps: 3, maxTaps: 6, imagePath: 'assets/geodes/meteor_rare_stage2.png', fallbackIcon: '✨' }, { minTaps: 1, maxTaps: 2, imagePath: 'assets/geodes/meteor_rare_stage3.png', fallbackIcon: '💥' }], 
        lootTable: [
            { ingotId: 'siderite', chance: 0.25 },
            { ingotId: 'star_silver', chance: 0.25 },
            { ingotId: 'astralium', chance: 0.20 },
            { ingotId: 'luminor', chance: 0.15 },
            { ingotId: 'meteor_gold', chance: 0.10 },
            { ingotId: 'singular', chance: 0.05 }
        ], 
        xpValue: 50 
    },
    meteor_legendary: { 
        id: 'meteor_legendary', name: 'Осколок Пустоты', icon: '🕳️', isSpecial: false, timer: 1800, 
        description: 'Легендарный осколок из глубин Межгалактической Пустоты. Внутри заключены редчайшие металлы, рождённые в горниле сверхновых.', 
        stages: [{ minTaps: 7, maxTaps: 10, imagePath: 'assets/geodes/meteor_legendary_stage1.png', fallbackIcon: '🕳️' }, { minTaps: 3, maxTaps: 6, imagePath: 'assets/geodes/meteor_legendary_stage2.png', fallbackIcon: '🌌' }, { minTaps: 1, maxTaps: 2, imagePath: 'assets/geodes/meteor_legendary_stage3.png', fallbackIcon: '💥' }], 
        lootTable: [
            { ingotId: 'astralium', chance: 0.20 },
            { ingotId: 'meteor_gold', chance: 0.20 },
            { ingotId: 'singular', chance: 0.25 },
            { ingotId: 'nebulite', chance: 0.25 },
            { ingotId: 'cosmonium', chance: 0.10 }
        ], 
        xpValue: 120 
    },
    
    // ========== ОСОБЫЕ ЖЕОДЫ ==========
    special_mine: { id: 'special_mine', name: 'Реликтовая Руда', icon: '💠', isSpecial: true, location: 'mine', timer: 45, description: 'Древняя руда, пульсирующая энергией.', stages: [{ minTaps: 7, maxTaps: 10, imagePath: 'assets/geodes/special_mine_stage1.png', fallbackIcon: '💠' }, { minTaps: 3, maxTaps: 6, imagePath: 'assets/geodes/special_mine_stage2.png', fallbackIcon: '🔶' }, { minTaps: 1, maxTaps: 2, imagePath: 'assets/geodes/special_mine_stage3.png', fallbackIcon: '🔸' }], possibleIngots: ['isotope', 'osmium'], xpValue: 100 },
    special_jungle: { id: 'special_jungle', name: 'Окисленный Сплав', icon: '🧪', isSpecial: true, location: 'jungle', timer: 450, description: 'Сплав, созданный природой за миллионы лет.', stages: [{ minTaps: 7, maxTaps: 10, imagePath: 'assets/geodes/special_jungle_stage1.png', fallbackIcon: '🧪' }, { minTaps: 3, maxTaps: 6, imagePath: 'assets/geodes/special_jungle_stage2.png', fallbackIcon: '🧫' }, { minTaps: 1, maxTaps: 2, imagePath: 'assets/geodes/special_jungle_stage3.png', fallbackIcon: '⚗️' }], possibleIngots: ['biosteel', 'relicbronze'], xpValue: 150 },
    special_asteroid: { id: 'special_asteroid', name: 'Метеоритное Ядро', icon: '☄️', isSpecial: true, location: 'asteroid', timer: 1800, description: 'Ядро древнего метеорита.', stages: [{ minTaps: 7, maxTaps: 10, imagePath: 'assets/geodes/special_asteroid_stage1.png', fallbackIcon: '☄️' }, { minTaps: 3, maxTaps: 6, imagePath: 'assets/geodes/special_asteroid_stage2.png', fallbackIcon: '🌠' }, { minTaps: 1, maxTaps: 2, imagePath: 'assets/geodes/special_asteroid_stage3.png', fallbackIcon: '💫' }], possibleIngots: ['tungsten', 'darkmatter'], xpValue: 200 },
    special_meteor: { id: 'special_meteor', name: 'Ядро Галактики', icon: '🌀', isSpecial: true, location: 'meteor', timer: 3600, description: 'Сердце падшей звезды, хранящее коллекционные сокровища космоса.', stages: [{ minTaps: 7, maxTaps: 10, imagePath: 'assets/geodes/special_meteor_stage1.png', fallbackIcon: '🌀' }, { minTaps: 3, maxTaps: 6, imagePath: 'assets/geodes/special_meteor_stage2.png', fallbackIcon: '🌌' }, { minTaps: 1, maxTaps: 2, imagePath: 'assets/geodes/special_meteor_stage3.png', fallbackIcon: '💫' }], possibleIngots: ['orion', 'andromeda'], xpValue: 300 }
};

export const CONFIG_EXPEDITIONS = {
    mine: { id: 'mine', name: 'Шахты', description: 'Глубинная разработка в коре планеты.', imagePath: 'assets/expeditions/mine.png', fallbackIcon: '⛏️', timer: 30, requiredLevel: 1, specialGeodeChance: 0.10, specialGeodeId: 'special_mine' },
    jungle: { id: 'jungle', name: 'Джунгли', description: 'Опасные, но богатые заросли.', imagePath: 'assets/expeditions/jungle.png', fallbackIcon: '🌴', timer: 300, requiredLevel: 5, specialGeodeChance: 0.15, specialGeodeId: 'special_jungle' },
    asteroid: { id: 'asteroid', name: 'Пояс Астероидов', description: 'Экстремальная экспедиция в открытый космос.', imagePath: 'assets/expeditions/asteroid.png', fallbackIcon: '🪐', timer: 1200, requiredLevel: 10, specialGeodeChance: 0.25, specialGeodeId: 'special_asteroid' }
};

export const LEVELS = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3300, 4000, 4800, 5700, 6700, 7800, 9000, 10300, 11700, 13200, 15000];
export const STATUSES = ['Новичок', 'Старатель', 'Геолог', 'Шахтёр', 'Исследователь', 'Космопроходец', 'Мастер Жеод', 'Хранитель', 'Легенда'];

export const DEFAULT_STATE = {
    expeditions: { mine: { active: false, endTime: null, scanUsed: false, specialChanceBoost: null }, jungle: { active: false, endTime: null, scanUsed: false, specialChanceBoost: null }, asteroid: { active: false, endTime: null, scanUsed: false, specialChanceBoost: null } },
    geodes: { mine: 2, jungle: 1, asteroid: 0, special_mine: 0, special_jungle: 0, special_asteroid: 0, meteor_common: 0, meteor_rare: 0, meteor_legendary: 0, special_meteor: 0 },
    ingots: {},
    discoveredSpecialGeodes: { mine: false, jungle: false, asteroid: false, meteor: false },
    collectedArtifacts: { mine: [], jungle: [], asteroid: [], meteor: [] },
    minedStats: {},
    player: { level: 1, xp: 0, totalOpened: 0, totalIngots: 0, totalArtifacts: 0 },
    echoCooldowns: {},
    expeditionBonuses: {}
};

// ========== КОНФИГУРАЦИЯ ИВЕНТОВ (РОТАЦИЯ) ==========
export const EVENTS_CONFIG = {
    rotationInterval: 30 * 60 * 1000,
    eventDuration: 15 * 60 * 1000,
    events: ['great_smelt', 'meteor_storm'],
    
    great_smelt: {
        id: 'great_smelt',
        name: 'Великая Переплавка',
        icon: '🔥',
        description: 'Древние кузни остывают!',
        longDescription: 'Собери ресурсы и создай крафтовые предметы в Плавильне!'
    },
    
    meteor_storm: {
        id: 'meteor_storm',
        name: 'Метеоритный Шторм',
        icon: '☄️',
        description: 'Небо пылает! Лови падающие метеориты!',
        longDescription: 'Метеориты падают с небес! Тапай по ним, чтобы собрать. Обменяй осколки на жеоды!',
        stormDuration: 30,
        meteorTypes: {
            legendary: { icon: '✨', emoji: '✨', color: '#FFD700', glowColor: 'rgba(255, 215, 0, 0.8)', speed: 2.2, size: 55, spawnWeight: 0.08, pointsPerUnit: 1, requiredForGeode: 2 },
            rare: { icon: '🔥', emoji: '🔥', color: '#FF8C00', glowColor: 'rgba(255, 140, 0, 0.7)', speed: 3.0, size: 48, spawnWeight: 0.27, pointsPerUnit: 1, requiredForGeode: 4 },
            common: { icon: '☄️', emoji: '☄️', color: '#A0A0A0', glowColor: 'rgba(160, 160, 160, 0.6)', speed: 3.8, size: 40, spawnWeight: 0.65, pointsPerUnit: 1, requiredForGeode: 6 }
        },
        spawnInterval: 400,
        maxMeteorsOnScreen: 12,
        rewards: {
            legendary: { geodeId: 'special_asteroid', geodeCount: 1, xpBonus: 150 },
            rare: { geodeId: 'asteroid', geodeCount: 1, xpBonus: 60 },
            common: { geodeId: 'mine', geodeCount: 1, xpBonus: 20 }
        }
    }
};
