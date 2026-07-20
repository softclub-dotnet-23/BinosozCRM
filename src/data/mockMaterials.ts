import type { Material } from "../types";

interface CategoryInfo {
  category: string;
  unit: string;
  image: string;
  supplier: string;
  baseNames: string[];
  priceRange: [number, number];
  stockRange: [number, number];
}

const CATEGORY_POOL: CategoryInfo[] = [
  {
    category: "Цемент",
    unit: "мешок",
    image: "/images/materials/cement-m400.jpg",
    supplier: "ООО «ТаджЦемент»",
    baseNames: ["Цемент М400", "Цемент М500", "Цемент ПЦ400-Д20", "Цемент белый", "Цемент тампонажный"],
    priceRange: [70, 95],
    stockRange: [40, 400],
  },
  {
    category: "Металл",
    unit: "тонна",
    image: "/images/materials/rebar-12mm.jpg",
    supplier: "МеталлТрейд",
    baseNames: ["Арматура Ø8 мм", "Арматура Ø10 мм", "Арматура Ø14 мм", "Арматура Ø16 мм", "Швеллер стальной", "Уголок стальной", "Проволока вязальная"],
    priceRange: [9500, 13500],
    stockRange: [0.3, 2.5],
  },
  {
    category: "Кирпич",
    unit: "шт",
    image: "/images/materials/red-brick.jpg",
    supplier: "Кирпичный завод №1",
    baseNames: ["Кирпич силикатный", "Кирпич облицовочный", "Кирпич пустотелый", "Кирпич полнотелый"],
    priceRange: [1.8, 3.2],
    stockRange: [1500, 12000],
  },
  {
    category: "Сыпучие",
    unit: "м³",
    image: "/images/materials/river-sand.jpg",
    supplier: "Карьер «Гиссар»",
    baseNames: ["Песок карьерный", "Песок мытый", "Щебень 5-20 мм", "Щебень 40-70 мм", "Отсев щебёночный"],
    priceRange: [140, 220],
    stockRange: [4, 40],
  },
  {
    category: "Дерево",
    unit: "м³",
    image: "/images/materials/timber-board.jpg",
    supplier: "ЛесТорг",
    baseNames: ["Доска обрезная", "Доска половая", "Брус строительный", "Фанера ламинированная", "ОСБ плита"],
    priceRange: [1800, 3200],
    stockRange: [1, 7],
  },
  {
    category: "Сантехника",
    unit: "м",
    image: "/images/materials/pvc-pipe-110.jpg",
    supplier: "СантехМаркет",
    baseNames: ["Труба ПВХ Ø50", "Труба ПВХ Ø110", "Труба ПВХ Ø160", "Труба полипропиленовая Ø25", "Труба канализационная"],
    priceRange: [18, 65],
    stockRange: [15, 200],
  },
  {
    category: "Отделочные",
    unit: "кг",
    image: "/images/materials/facade-paint.jpg",
    supplier: "Dulux",
    baseNames: ["Краска фасадная", "Краска интерьерная", "Грунтовка глубокого проникновения", "Шпатлёвка финишная", "Клей плиточный"],
    priceRange: [40, 90],
    stockRange: [8, 90],
  },
  {
    category: "Электрика",
    unit: "м",
    image: "/images/materials/electrical-cable.jpg",
    supplier: "ЭлектроСнаб",
    baseNames: ["Провод ВВГ 3×2.5", "Провод ВВГ 3×4", "Кабель ПВС 2×1.5", "Кабель силовой ВВГнг"],
    priceRange: [9, 22],
    stockRange: [40, 350],
  },
  {
    category: "Изоляция",
    unit: "м²",
    image: "/images/materials/basalt-insulation.jpg",
    supplier: "ТехноНИКОЛЬ",
    baseNames: ["Утеплитель базальтовый", "Утеплитель минеральный", "Пенопласт ПСБ-25", "Пароизоляционная плёнка"],
    priceRange: [35, 60],
    stockRange: [20, 150],
  },
];

const WAREHOUSES = ["Склад (главный)", "Склад (резервный)", "Склад «Худжанд»"];

interface FeaturedRow {
  name: string;
  supplier: string;
  category: string;
  unit: string;
  unitDetail: string | null;
  image: string;
  stock: number;
  minStock: number;
  price: number;
  note: string;
}

const FEATURED: FeaturedRow[] = [
  { name: "Цемент М400", supplier: "ООО «ТаджЦемент»", category: "Цемент", unit: "мешок", unitDetail: "50 кг", image: "/images/materials/cement-m400.jpg", stock: 320, minStock: 100, price: 75.0, note: "" },
  { name: "Арматура Ø12 мм", supplier: "МеталлТрейд", category: "Металл", unit: "тонна", unitDetail: null, image: "/images/materials/rebar-12mm.jpg", stock: 2.15, minStock: 1.0, price: 11200, note: "" },
  { name: "Кирпич красный", supplier: "Кирпичный завод №1", category: "Кирпич", unit: "шт", unitDetail: null, image: "/images/materials/red-brick.jpg", stock: 8450, minStock: 2000, price: 2.2, note: "" },
  { name: "Песок речной", supplier: "Карьер «Гиссар»", category: "Сыпучие", unit: "м³", unitDetail: null, image: "/images/materials/river-sand.jpg", stock: 18.6, minStock: 10.0, price: 160.0, note: "" },
  { name: "Щебень 20-40 мм", supplier: "Карьер «Файзобод»", category: "Сыпучие", unit: "м³", unitDetail: null, image: "/images/materials/gravel-20-40.jpg", stock: 12.3, minStock: 8.0, price: 180.0, note: "" },
  { name: "Доска обрезная", supplier: "ЛесТорг", category: "Дерево", unit: "м³", unitDetail: null, image: "/images/materials/timber-board.jpg", stock: 3.25, minStock: 5.0, price: 2500.0, note: "" },
  { name: "Труба ПВХ Ø110", supplier: "СантехМаркет", category: "Сантехника", unit: "м", unitDetail: null, image: "/images/materials/pvc-pipe-110.jpg", stock: 45, minStock: 20, price: 28.0, note: "" },
  { name: "Краска фасадная", supplier: "Dulux", category: "Отделочные", unit: "кг", unitDetail: null, image: "/images/materials/facade-paint.jpg", stock: 12.5, minStock: 20, price: 65.0, note: "" },
  { name: "Провод ВВГ 3×2.5", supplier: "ЭлектроСнаб", category: "Электрика", unit: "м", unitDetail: null, image: "/images/materials/electrical-cable.jpg", stock: 120, minStock: 50, price: 12.5, note: "" },
  { name: "Утеплитель базальтовый", supplier: "ТехноНИКОЛЬ", category: "Изоляция", unit: "м²", unitDetail: null, image: "/images/materials/basalt-insulation.jpg", stock: 60, minStock: 30, price: 45.0, note: "" },
];

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Deterministic "last updated" timestamp spread across late July 2026, matching the date
// range the rest of the inventory mock data (receipts/write-offs/transfers) lives in.
function syntheticUpdatedAt(index: number): string {
  const day = 1 + (index % 29);
  const hour = 6 + (index % 12);
  const minute = (index * 7) % 60;
  return `2026-07-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

let num = 1;

const featuredMaterials: Material[] = FEATURED.map((f, i) => ({
  id: `mat-${String(num).padStart(4, "0")}`,
  number: num++,
  name: f.name,
  supplier: f.supplier,
  category: f.category,
  unit: f.unit,
  unitDetail: f.unitDetail,
  imageUrl: f.image,
  stock: f.stock,
  minStock: f.minStock,
  price: f.price,
  warehouse: WAREHOUSES[0],
  note: f.note,
  updatedAt: syntheticUpdatedAt(i),
}));

// Padding distribution across the 9 categories: 118 more materials. Most stay comfortably
// above their minimum; a spread of ~2 low + ~1 critical item per category (plus the 2
// featured low/critical rows above) gives the Stock page a realistic, non-degenerate
// critical-stock list and donut breakdown instead of only 1-2 flagged items out of 128.
const PADDING_PER_CATEGORY = [13, 13, 13, 13, 13, 13, 13, 13, 14];
const LOW_INDICES = new Set<number>([2, 7]);
const CRITICAL_INDICES = new Set<number>([4]);

const paddingMaterials: Material[] = [];
CATEGORY_POOL.forEach((cat, catIndex) => {
  const count = PADDING_PER_CATEGORY[catIndex];
  for (let i = 0; i < count; i++) {
    const baseName = cat.baseNames[i % cat.baseNames.length];
    const variantSuffix = Math.floor(i / cat.baseNames.length);
    const name = variantSuffix > 0 ? `${baseName} (партия ${variantSuffix + 1})` : baseName;

    const [minPrice, maxPrice] = cat.priceRange;
    const price = round(minPrice + ((i * 37) % 100) / 100 * (maxPrice - minPrice), 2);

    const [minStockRange, maxStockRange] = cat.stockRange;
    const minStock = round(minStockRange + ((i * 53) % 100) / 100 * (maxStockRange - minStockRange) * 0.4, 2);

    let stock: number;
    if (LOW_INDICES.has(i)) {
      stock = round(minStock * 0.85, 2);
    } else if (CRITICAL_INDICES.has(i)) {
      stock = round(minStock * 0.5, 2);
    } else {
      stock = round(minStock * (1.3 + ((i * 29) % 100) / 100), 2);
    }

    paddingMaterials.push({
      id: `mat-${String(num).padStart(4, "0")}`,
      number: num++,
      name,
      supplier: cat.supplier,
      category: cat.category,
      unit: cat.unit,
      unitDetail: null,
      imageUrl: cat.image,
      stock,
      minStock,
      price,
      warehouse: WAREHOUSES[(catIndex + i) % WAREHOUSES.length],
      note: "",
      updatedAt: syntheticUpdatedAt(num),
    });
  }
});

export const mockMaterials: Material[] = [...featuredMaterials, ...paddingMaterials];

export const MATERIAL_CATEGORIES: string[] = Array.from(new Set(mockMaterials.map((m) => m.category))).sort((a, b) =>
  a.localeCompare(b, "ru"),
);
export const MATERIAL_SUPPLIERS: string[] = Array.from(new Set(mockMaterials.map((m) => m.supplier))).sort((a, b) =>
  a.localeCompare(b, "ru"),
);
export const MATERIAL_WAREHOUSES: string[] = WAREHOUSES;

export const CATEGORY_IMAGE: Record<string, string> = Object.fromEntries(CATEGORY_POOL.map((c) => [c.category, c.image]));
