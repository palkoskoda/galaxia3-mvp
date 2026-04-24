import { query, initDatabase } from '../db';
import bcrypt from 'bcryptjs';

const isPostgres = process.env.DATABASE_URL?.startsWith('postgres');
const resetDemoData = process.env.RESET_DEMO_DATA === 'true';

const seed = async () => {
  await initDatabase();

  console.log('🌱 Seeding database...');

  // Hash password
  const passwordHash = await bcrypt.hash('password123', 10);
  console.log('Password hash:', passwordHash);

  if (resetDemoData) {
    console.log('⚠️ RESET_DEMO_DATA=true, clearing demo data first');
    await query('DELETE FROM delivery_plan_items');
    await query('DELETE FROM order_history');
    await query('DELETE FROM daily_menu');
    await query('DELETE FROM menu_items');
    await query('DELETE FROM users WHERE email LIKE \'%@example.com\' OR email LIKE \'%@galaxia.sk\'');
    console.log('✅ Cleared existing data');
  } else {
    console.log('ℹ️ Non-destructive seed mode: existing data will be preserved');
  }

  // Users
  const users = [
    { id: 'admin-001', email: 'admin@galaxia.sk', firstName: 'Admin', lastName: 'Galaxia', phone: '+421900000001', address: 'Hlavná 1, Bratislava', role: 'admin' },
    { id: 'staff-001', email: 'kuchar@galaxia.sk', firstName: 'Ján', lastName: 'Kuchár', phone: '+421900000002', address: 'Kuchynská 5, Bratislava', role: 'staff' },
    { id: 'staff-002', email: 'rozvoz@galaxia.sk', firstName: 'Peter', lastName: 'Rozvoz', phone: '+421900000003', address: 'Rozvozová 10, Bratislava', role: 'staff' },
    { id: 'user-001', email: 'klient1@example.com', firstName: 'Mária', lastName: 'Nováková', phone: '+421911111111', address: 'Nováková 15, Bratislava', role: 'customer' },
    { id: 'user-002', email: 'klient2@example.com', firstName: 'Jozef', lastName: 'Kováč', phone: '+421922222222', address: 'Kováčska 22, Bratislava', role: 'customer' },
    { id: 'user-003', email: 'klient3@example.com', firstName: 'Anna', lastName: 'Horváthová', phone: '+421933333333', address: 'Horváthova 8, Bratislava', role: 'customer' },
    { id: 'user-004', email: 'klient4@example.com', firstName: 'Peter', lastName: 'Novotný', phone: '+421944444444', address: 'Novotná 12, Bratislava', role: 'customer' },
    { id: 'user-005', email: 'klient5@example.com', firstName: 'Eva', lastName: 'Kováčová', phone: '+421955555555', address: 'Kováčova 5, Bratislava', role: 'customer' },
  ];

  for (const user of users) {
    if (isPostgres) {
      await query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, address, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
         ON CONFLICT(email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           phone = EXCLUDED.phone,
           address = EXCLUDED.address,
           role = EXCLUDED.role,
           is_active = 1,
           updated_at = NOW()`,
        [user.id, user.email, passwordHash, user.firstName, user.lastName, user.phone, user.address, user.role]
      );
    } else {
      await query(
        `INSERT OR REPLACE INTO users (id, email, password_hash, first_name, last_name, phone, address, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [user.id, user.email, passwordHash, user.firstName, user.lastName, user.phone, user.address, user.role]
      );
    }
  }
  console.log(`✅ ${users.length} users created`);

  // Menu items
  const menuItems = [
    { id: 'menu-001', name: 'Kurací rezeň s ryžou', description: 'Kurací rezeň v trojobale, dusená ryža, uhorkový šalát', price: 6.50, allergens: JSON.stringify(['lepk', 'vajc', 'mlie']), deadline_type: 'standard' },
    { id: 'menu-002', name: 'Bravčový guláš s knedľou', description: 'Tradičný bravčový guláš, domáca knedľa', price: 7.20, allergens: JSON.stringify(['lepk', 'mlie']), deadline_type: 'standard' },
    { id: 'menu-003', name: 'Vyprážaný syr s hranolkami', description: 'Vyprážaný eidam, hranolky, tatárska omáčka', price: 6.80, allergens: JSON.stringify(['lepk', 'mlie', 'vajc']), deadline_type: 'standard' },
    { id: 'menu-004', name: 'Pečené kuracie stehno', description: 'Pečené kuracie stehno, zemiakový šalát', price: 7.50, allergens: JSON.stringify(['vajc']), deadline_type: 'standard' },
    { id: 'menu-005', name: 'Hovädzí steak', description: 'Hovädzí steak s restovanými zemiakmi', price: 9.50, allergens: JSON.stringify([]), deadline_type: 'standard' },
    { id: 'menu-006', name: 'Morčacie prsia na grile', description: 'Grilované morčacie prsia, ryža, zelenina', price: 8.00, allergens: JSON.stringify([]), deadline_type: 'standard' },
    { id: 'menu-101', name: 'Ryža s hubami', description: 'Hlivové rizoto s parmezánom', price: 6.00, allergens: JSON.stringify(['mlie']), deadline_type: 'standard' },
    { id: 'menu-102', name: 'Zeleninové lasagne', description: 'Lasagne so špenátom a ricottou', price: 6.50, allergens: JSON.stringify(['lepk', 'mlie', 'vajc']), deadline_type: 'standard' },
    { id: 'menu-103', name: 'Quinoa šalát', description: 'Quinoa s pečenou zeleninou a fetou', price: 6.20, allergens: JSON.stringify(['mlie']), deadline_type: 'standard' },
    { id: 'menu-104', name: 'Tofu stir-fry', description: 'Tofu s miešanou zeleninou a ryžou', price: 6.00, allergens: JSON.stringify(['sója']), deadline_type: 'standard' },
    { id: 'menu-105', name: 'Cestoviny s pesto', description: 'Tagliatelle s bazalkovým pestom', price: 6.50, allergens: JSON.stringify(['lepk', 'orechy']), deadline_type: 'standard' },
    { id: 'menu-106', name: 'Zapekaná zelenina', description: 'Zapečená zelenina s mozzarellou', price: 5.80, allergens: JSON.stringify(['mlie']), deadline_type: 'standard' },
    { id: 'menu-201', name: 'Slepačí vývar s rezancami', description: 'Tradičný slepačí vývar, domáce rezance', price: 2.50, allergens: JSON.stringify(['lepk', 'vajc']), deadline_type: 'standard' },
    { id: 'menu-202', name: 'Paradajková polievka', description: 'Krémová paradajková polievka s bazalkou', price: 2.50, allergens: JSON.stringify(['mlie']), deadline_type: 'standard' },
    { id: 'menu-203', name: 'Šampiňónová polievka', description: 'Krémová šampiňónová polievka', price: 2.50, allergens: JSON.stringify(['mlie']), deadline_type: 'standard' },
    { id: 'menu-204', name: 'Hráškový krém', description: 'Jemný hráškový krém s mätou', price: 2.50, allergens: JSON.stringify(['mlie']), deadline_type: 'standard' },
    { id: 'menu-205', name: 'Držková polievka', description: 'Tradičná držková polievka', price: 3.00, allergens: JSON.stringify([]), deadline_type: 'standard' },
    { id: 'menu-301', name: 'Cesnaková polievka', description: 'Sýta cesnaková polievka s chlebom', price: 3.00, allergens: JSON.stringify(['lepk', 'mlie']), deadline_type: 'express' },
    { id: 'menu-302', name: 'Šunková bageta', description: 'Bageta so šunkou a syrom', price: 4.50, allergens: JSON.stringify(['lepk', 'mlie']), deadline_type: 'express' },
    { id: 'menu-303', name: 'Croissant', description: 'Maslový croissant', price: 2.00, allergens: JSON.stringify(['lepk', 'mlie', 'vajc']), deadline_type: 'express' },
    { id: 'menu-304', name: 'Jogurt s ovocím', description: 'Grécky jogurt s čerstvým ovocím', price: 3.50, allergens: JSON.stringify(['mlie']), deadline_type: 'express' },
    { id: 'menu-305', name: 'Chlebíčky', description: 'Dva chlebíčky podľa výberu', price: 3.00, allergens: JSON.stringify(['lepk']), deadline_type: 'express' },
  ];

  for (const item of menuItems) {
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
        [item.id, item.name, item.description, item.price, item.allergens, item.deadline_type]
      );
    } else {
      await query(
        `INSERT OR REPLACE INTO menu_items (id, name, description, price, allergens, deadline_type, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [item.id, item.name, item.description, item.price, item.allergens, item.deadline_type]
      );
    }
  }
  console.log(`✅ ${menuItems.length} menu items created`);

  // Daily menu for next 14 days
  const today = new Date();
  
  let dailyMenuCount = 0;
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    const deadline = new Date(date);
    deadline.setDate(deadline.getDate() - 1);
    deadline.setHours(14, 30, 0, 0);
    const deadlineStr = deadline.toISOString();

    let dailyItems: { menuItemId: string; slot: string }[] = [];

    if (dayOfWeek === 1) {
      dailyItems = [
        { menuItemId: 'menu-201', slot: 'Soup' },
        { menuItemId: 'menu-001', slot: 'MenuA' },
        { menuItemId: 'menu-101', slot: 'MenuB' },
      ];
    } else if (dayOfWeek === 2) {
      dailyItems = [
        { menuItemId: 'menu-202', slot: 'Soup' },
        { menuItemId: 'menu-002', slot: 'MenuA' },
        { menuItemId: 'menu-102', slot: 'MenuB' },
      ];
    } else if (dayOfWeek === 3) {
      dailyItems = [
        { menuItemId: 'menu-203', slot: 'Soup' },
        { menuItemId: 'menu-003', slot: 'MenuA' },
        { menuItemId: 'menu-103', slot: 'MenuB' },
      ];
    } else if (dayOfWeek === 4) {
      dailyItems = [
        { menuItemId: 'menu-204', slot: 'Soup' },
        { menuItemId: 'menu-004', slot: 'MenuA' },
        { menuItemId: 'menu-104', slot: 'MenuB' },
      ];
    } else if (dayOfWeek === 5) {
      dailyItems = [
        { menuItemId: 'menu-205', slot: 'Soup' },
        { menuItemId: 'menu-005', slot: 'MenuA' },
        { menuItemId: 'menu-105', slot: 'MenuB' },
      ];
    } else {
      const expressDeadline = new Date(date);
      expressDeadline.setHours(9, 0, 0, 0);
      const expressDeadlineStr = expressDeadline.toISOString();
      
      dailyItems = [
        { menuItemId: 'menu-301', slot: 'Special' },
        { menuItemId: 'menu-302', slot: 'Special' },
        { menuItemId: 'menu-303', slot: 'Special' },
        { menuItemId: 'menu-304', slot: 'Special' },
      ];
      
      for (const item of dailyItems) {
        const id = `dm-${dateStr}-${item.slot}-${item.menuItemId}`;
        if (isPostgres) {
          await query(
            `INSERT INTO daily_menu (id, date, menu_item_id, menu_slot, deadline_timestamp)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT(id) DO UPDATE SET
               date = EXCLUDED.date,
               menu_item_id = EXCLUDED.menu_item_id,
               menu_slot = EXCLUDED.menu_slot,
               deadline_timestamp = EXCLUDED.deadline_timestamp`,
            [id, dateStr, item.menuItemId, item.slot, expressDeadlineStr]
          );
        } else {
          await query(
            `INSERT OR REPLACE INTO daily_menu (id, date, menu_item_id, menu_slot, deadline_timestamp)
             VALUES (?, ?, ?, ?, ?)`,
            [id, dateStr, item.menuItemId, item.slot, expressDeadlineStr]
          );
        }
        dailyMenuCount++;
      }
      continue;
    }

    for (const item of dailyItems) {
      const id = `dm-${dateStr}-${item.slot}-${item.menuItemId}`;
      if (isPostgres) {
        await query(
          `INSERT INTO daily_menu (id, date, menu_item_id, menu_slot, deadline_timestamp)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT(id) DO UPDATE SET
             date = EXCLUDED.date,
             menu_item_id = EXCLUDED.menu_item_id,
             menu_slot = EXCLUDED.menu_slot,
             deadline_timestamp = EXCLUDED.deadline_timestamp`,
          [id, dateStr, item.menuItemId, item.slot, deadlineStr]
        );
      } else {
        await query(
          `INSERT OR REPLACE INTO daily_menu (id, date, menu_item_id, menu_slot, deadline_timestamp)
           VALUES (?, ?, ?, ?, ?)`,
          [id, dateStr, item.menuItemId, item.slot, deadlineStr]
        );
      }
      dailyMenuCount++;
    }
  }
  console.log(`✅ ${dailyMenuCount} daily menu items created`);

  // Sample delivery plans
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterStr = dayAfter.toISOString().split('T')[0];

  const getDailyMenuId = async (date: string, slot: string) => {
    const result = await query('SELECT id FROM daily_menu WHERE date = $1 AND menu_slot = $2', [date, slot]);
    return result.rows[0]?.id;
  };

  const dm1 = await getDailyMenuId(tomorrowStr, 'MenuA');
  const dm2 = await getDailyMenuId(tomorrowStr, 'Soup');
  if (dm1) {
    await query(
      `INSERT INTO delivery_plan_items (id, user_id, daily_menu_id, quantity, last_updated)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT(id) DO UPDATE SET quantity = EXCLUDED.quantity, last_updated = NOW()`,
      [`plan-u001-${dm1}`, 'user-001', dm1, 1]
    );
  }
  if (dm2) {
    await query(
      `INSERT INTO delivery_plan_items (id, user_id, daily_menu_id, quantity, last_updated)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT(id) DO UPDATE SET quantity = EXCLUDED.quantity, last_updated = NOW()`,
      [`plan-u001-${dm2}`, 'user-001', dm2, 1]
    );
  }

  if (dm1) {
    await query(
      `INSERT INTO delivery_plan_items (id, user_id, daily_menu_id, quantity, last_updated)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT(id) DO UPDATE SET quantity = EXCLUDED.quantity, last_updated = NOW()`,
      [`plan-u002-${dm1}`, 'user-002', dm1, 2]
    );
  }

  const dm3 = await getDailyMenuId(dayAfterStr, 'MenuB');
  const dm4 = await getDailyMenuId(dayAfterStr, 'Soup');
  if (dm3) {
    await query(
      `INSERT INTO delivery_plan_items (id, user_id, daily_menu_id, quantity, last_updated)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT(id) DO UPDATE SET quantity = EXCLUDED.quantity, last_updated = NOW()`,
      [`plan-u003-${dm3}`, 'user-003', dm3, 1]
    );
  }
  if (dm4) {
    await query(
      `INSERT INTO delivery_plan_items (id, user_id, daily_menu_id, quantity, last_updated)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT(id) DO UPDATE SET quantity = EXCLUDED.quantity, last_updated = NOW()`,
      [`plan-u003-${dm4}`, 'user-003', dm4, 1]
    );
  }

  if (dm1 && dm2) {
    await query(
      `INSERT INTO delivery_plan_items (id, user_id, daily_menu_id, quantity, last_updated)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT(id) DO UPDATE SET quantity = EXCLUDED.quantity, last_updated = NOW()`,
      [`plan-u004-${dm1}`, 'user-004', dm1, 3]
    );
    await query(
      `INSERT INTO delivery_plan_items (id, user_id, daily_menu_id, quantity, last_updated)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT(id) DO UPDATE SET quantity = EXCLUDED.quantity, last_updated = NOW()`,
      [`plan-u004-${dm2}`, 'user-004', dm2, 3]
    );
  }

  console.log('✅ Sample delivery plans created');

  // Sample order history
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  await query(
    `INSERT INTO order_history (id, user_id, date, items_json, total_price, delivery_status, payment_status)
     VALUES ($1, $2, $3, $4, $5, 'delivered', 'paid')
     ON CONFLICT(id) DO UPDATE SET
       items_json = EXCLUDED.items_json,
       total_price = EXCLUDED.total_price`,
    ['hist-001', 'user-001', yesterdayStr, JSON.stringify([
      { item_name: 'Kurací rezeň s ryžou', quantity: 1, price: 6.50 },
      { item_name: 'Slepačí vývar s rezancami', quantity: 1, price: 2.50 }
    ]), 9.00]
  );

  await query(
    `INSERT INTO order_history (id, user_id, date, items_json, total_price, delivery_status, payment_status)
     VALUES ($1, $2, $3, $4, $5, 'delivered', 'paid')
     ON CONFLICT(id) DO UPDATE SET
       items_json = EXCLUDED.items_json,
       total_price = EXCLUDED.total_price`,
    ['hist-002', 'user-002', yesterdayStr, JSON.stringify([
      { item_name: 'Bravčový guláš s knedľou', quantity: 2, price: 7.20 }
    ]), 14.40]
  );

  console.log('✅ Sample order history created');

  // Settings
  const settings = [
    { key: 'standard_deadline_time', value: '14:30', desc: 'Čas uzávierky pre štandardné objednávky' },
    { key: 'express_deadline_time', value: '09:00', desc: 'Čas uzávierky pre expresné objednávky' },
    { key: 'planning_horizon_days', value: '14', desc: 'Koľko dní dopredu sa zobrazuje menu' },
    { key: 'currency', value: 'EUR', desc: 'Mena' },
  ];

  for (const setting of settings) {
    if (isPostgres) {
      await query(
        `INSERT INTO delivery_settings (id, setting_key, setting_value, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT(setting_key) DO UPDATE SET
           setting_value = EXCLUDED.setting_value,
           description = EXCLUDED.description`,
        [`setting-${setting.key}`, setting.key, setting.value, setting.desc]
      );
    } else {
      await query(
        `INSERT OR REPLACE INTO delivery_settings (id, setting_key, setting_value, description)
         VALUES (?, ?, ?, ?)`,
        [`setting-${setting.key}`, setting.key, setting.value, setting.desc]
      );
    }
  }
  console.log('✅ Settings created');

  console.log('\n✨ Seeding complete!');
  console.log('\nTest accounts:');
  console.log('  admin@galaxia.sk / password123');
  console.log('  kuchar@galaxia.sk / password123');
  console.log('  klient1@example.com / password123');
  console.log('  klient2@example.com / password123');
  console.log('  klient3@example.com / password123');
  console.log('  klient4@example.com / password123');
  console.log('  klient5@example.com / password123');
};

// Export for programmatic use
export { seed };

// Run if called directly
if (require.main === module) {
  seed().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
