import fs from 'fs';
import path from 'path';
import { initDatabase, query } from '../db';

const isPostgres = process.env.DATABASE_URL?.startsWith('postgres');

interface MenuDataDay {
  date: string;
  day_of_week: string;
  source_file: string;
  soup: {
    name: string;
    allergens: string;
  };
  meals: Array<{
    option: string;
    is_fit: boolean;
    name: string;
    details: string | null;
    weight: string;
    allergens: string;
  }>;
  daily_extra?: {
    name: string;
    price: string;
    weight: string;
  };
  user_choice?: string[];
}

const loadMenuData = (): MenuDataDay[] => {
  const possiblePaths = [
    process.env.MENU_DATA_PATH,
    path.join(process.cwd(), 'backend', 'menu-data.json'),
    path.join(process.cwd(), 'menu-data.json'),
    path.join(process.cwd(), '../database/menu-data.json'),
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    const resolved = path.resolve(p);
    if (fs.existsSync(resolved)) {
      console.log(`📁 Loading menu data from: ${resolved}`);
      return JSON.parse(fs.readFileSync(resolved, 'utf8'));
    }
  }

  throw new Error(
    `menu-data.json not found. Checked paths:\n` +
    possiblePaths.map(p => `  - ${path.resolve(p)}`).join('\n')
  );
};

const allergenMap: Record<string, string> = {
  '1': 'lepk',
  '2': 'kor',
  '3': 'vajc',
  '4': 'ryby',
  '5': 'arak',
  '6': 'sója',
  '7': 'mlie',
  '8': 'orechy',
  '9': 'zeler',
  '10': 'horcica',
  '11': 'sézam',
  '12': 'síran',
  '13': 'vlk',
  '14': 'mäk',
};

const parseAllergens = (allergensStr: string): string[] => {
  if (!allergensStr) return [];
  return allergensStr.split(',').map(a => allergenMap[a.trim()] || a.trim()).filter(Boolean);
};

const generateId = (prefix: string, ...parts: string[]): string => {
  const hash = parts.join('-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
  return `${prefix}-${hash}`.substring(0, 50);
};

const syncMenuData = async () => {
  await initDatabase();

  const menuData = loadMenuData();
  console.log(`📊 Found ${menuData.length} days of menu data`);

  // Calculate date offset to shift historical data to current week
  const firstDataDate = new Date(menuData[0].date);
  const today = new Date();
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - today.getDay() + 1);
  
  const daysOffset = Math.floor((currentMonday.getTime() - firstDataDate.getTime()) / (1000 * 60 * 60 * 24));
  console.log(`📅 Shifting dates by ${daysOffset} days to align with current week`);

  const createdMenuItems = new Set<string>();
  let menuItemsCount = 0;
  let dailyMenuCount = 0;

  for (const day of menuData) {
    const originalDate = new Date(day.date);
    const shiftedDate = new Date(originalDate);
    shiftedDate.setDate(originalDate.getDate() + daysOffset);
    const date = shiftedDate.toISOString().split('T')[0];

    const deadline = new Date(date);
    deadline.setDate(deadline.getDate() - 1);
    deadline.setHours(14, 30, 0, 0);
    const deadlineStr = deadline.toISOString();

    // Process soup
    if (day.soup && day.soup.name) {
      const soupId = generateId('mi', day.soup.name);
      if (!createdMenuItems.has(soupId)) {
        if (isPostgres) {
          await query(
            `INSERT INTO menu_items (id, name, description, price, allergens, deadline_type, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, 1)
             ON CONFLICT(id) DO UPDATE SET
               name = EXCLUDED.name,
               description = EXCLUDED.description,
               price = EXCLUDED.price,
               allergens = EXCLUDED.allergens,
               deadline_type = EXCLUDED.deadline_type,
               is_active = 1,
               updated_at = NOW()`,
            [soupId, day.soup.name, 'Polievka', 2.50, JSON.stringify(parseAllergens(day.soup.allergens)), 'standard']
          );
        } else {
          await query(
            `INSERT OR REPLACE INTO menu_items (id, name, description, price, allergens, deadline_type, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [soupId, day.soup.name, 'Polievka', 2.50, JSON.stringify(parseAllergens(day.soup.allergens)), 'standard']
          );
        }
        createdMenuItems.add(soupId);
        menuItemsCount++;
      }

      const dailyId = generateId('dm', date, 'soup', soupId);
      if (isPostgres) {
        await query(
          `INSERT INTO daily_menu (id, date, menu_item_id, menu_slot, deadline_timestamp)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT(id) DO UPDATE SET
             date = EXCLUDED.date,
             menu_item_id = EXCLUDED.menu_item_id,
             menu_slot = EXCLUDED.menu_slot,
             deadline_timestamp = EXCLUDED.deadline_timestamp`,
          [dailyId, date, soupId, 'Soup', deadlineStr]
        );
      } else {
        await query(
          `INSERT OR REPLACE INTO daily_menu (id, date, menu_item_id, menu_slot, deadline_timestamp)
           VALUES (?, ?, ?, ?, ?)`,
          [dailyId, date, soupId, 'Soup', deadlineStr]
        );
      }
      dailyMenuCount++;
    }

    // Process meals
    for (const meal of day.meals) {
      const mealId = generateId('mi', meal.name);
      if (!createdMenuItems.has(mealId)) {
        const description = [meal.details, meal.weight].filter(Boolean).join(' | ');
        if (isPostgres) {
          await query(
            `INSERT INTO menu_items (id, name, description, price, allergens, deadline_type, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, 1)
             ON CONFLICT(id) DO UPDATE SET
               name = EXCLUDED.name,
               description = EXCLUDED.description,
               price = EXCLUDED.price,
               allergens = EXCLUDED.allergens,
               deadline_type = EXCLUDED.deadline_type,
               is_active = 1,
               updated_at = NOW()`,
            [mealId, meal.name, description || null, 6.50, JSON.stringify(parseAllergens(meal.allergens)), 'standard']
          );
        } else {
          await query(
            `INSERT OR REPLACE INTO menu_items (id, name, description, price, allergens, deadline_type, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [mealId, meal.name, description || null, 6.50, JSON.stringify(parseAllergens(meal.allergens)), 'standard']
          );
        }
        createdMenuItems.add(mealId);
        menuItemsCount++;
      }

      const slot = meal.option === 'A' ? 'MenuA' : meal.option === 'B' ? 'MenuB' : 'Special';
      const dailyId = generateId('dm', date, slot, mealId);
      if (isPostgres) {
        await query(
          `INSERT INTO daily_menu (id, date, menu_item_id, menu_slot, deadline_timestamp)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT(id) DO UPDATE SET
             date = EXCLUDED.date,
             menu_item_id = EXCLUDED.menu_item_id,
             menu_slot = EXCLUDED.menu_slot,
             deadline_timestamp = EXCLUDED.deadline_timestamp`,
          [dailyId, date, mealId, slot, deadlineStr]
        );
      } else {
        await query(
          `INSERT OR REPLACE INTO daily_menu (id, date, menu_item_id, menu_slot, deadline_timestamp)
           VALUES (?, ?, ?, ?, ?)`,
          [dailyId, date, mealId, slot, deadlineStr]
        );
      }
      dailyMenuCount++;
    }
  }

  console.log(`✅ Sync complete:`);
  console.log(`   ${menuItemsCount} menu items created/updated`);
  console.log(`   ${dailyMenuCount} daily menu entries created/updated`);
};

syncMenuData().catch((error) => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});
