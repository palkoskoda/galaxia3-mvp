import { Database } from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config();

// Použijeme SQLite pre lokálne testovanie
const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'galaxia3.db');

let db: any = null;

export const initDatabase = async (): Promise<void> => {
  try {
    db = await open({
      filename: DB_PATH,
      driver: Database,
    });

    // Enable foreign keys
    await db.run('PRAGMA foreign_keys = ON');

    // Create tables if they don't exist
    await createTables();
    await ensureDemoUsers();

    console.log('✅ SQLite database connected:', DB_PATH);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

const ensureDemoUsers = async () => {
  const passwordHash = await bcrypt.hash('password123', 10);
  const demoUsers = [
    { id: 'admin-001', email: 'admin@galaxia.sk', firstName: 'Admin', lastName: 'Galaxia', phone: '+421900000001', address: 'Hlavná 1, Bratislava', role: 'admin' },
    { id: 'staff-001', email: 'kuchar@galaxia.sk', firstName: 'Ján', lastName: 'Kuchár', phone: '+421900000002', address: 'Kuchynská 5, Bratislava', role: 'staff' },
    { id: 'staff-002', email: 'rozvoz@galaxia.sk', firstName: 'Peter', lastName: 'Rozvoz', phone: '+421900000003', address: 'Rozvozová 10, Bratislava', role: 'staff' },
    { id: 'user-001', email: 'klient1@example.com', firstName: 'Mária', lastName: 'Nováková', phone: '+421911111111', address: 'Nováková 15, Bratislava', role: 'customer' },
    { id: 'user-002', email: 'klient2@example.com', firstName: 'Jozef', lastName: 'Kováč', phone: '+421922222222', address: 'Kováčska 22, Bratislava', role: 'customer' },
    { id: 'user-003', email: 'klient3@example.com', firstName: 'Anna', lastName: 'Horváthová', phone: '+421933333333', address: 'Horváthova 8, Bratislava', role: 'customer' },
  ];

  for (const user of demoUsers) {
    await db.run(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, address, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT(email) DO UPDATE SET
         password_hash = excluded.password_hash,
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         phone = excluded.phone,
         address = excluded.address,
         role = excluded.role,
         is_active = 1,
         updated_at = datetime("now")`,
      [user.id, user.email, passwordHash, user.firstName, user.lastName, user.phone, user.address, user.role]
    );
  }
};

const createTables = async () => {
  // Users table
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'staff')),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Menu items table
  await db.run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL CHECK (price >= 0),
      allergens TEXT DEFAULT '[]',
      deadline_type TEXT DEFAULT 'standard' CHECK (deadline_type IN ('standard', 'express')),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Daily menu table
  await db.run(`
    CREATE TABLE IF NOT EXISTS daily_menu (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      menu_slot TEXT NOT NULL CHECK (menu_slot IN ('MenuA', 'MenuB', 'Soup', 'Special')),
      deadline_timestamp DATETIME NOT NULL,
      max_quantity INTEGER,
      is_locked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, menu_item_id)
    )
  `);

  // Delivery plan items table
  await db.run(`
    CREATE TABLE IF NOT EXISTS delivery_plan_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      daily_menu_id TEXT NOT NULL REFERENCES daily_menu(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, daily_menu_id)
    )
  `);

  // Order history table
  await db.run(`
    CREATE TABLE IF NOT EXISTS order_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      items_json TEXT NOT NULL,
      total_price REAL NOT NULL,
      delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
      payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'invoiced', 'overdue')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Delivery settings table
  await db.run(`
    CREATE TABLE IF NOT EXISTS delivery_settings (
      id TEXT PRIMARY KEY,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT
    )
  `);

  // Create indexes
  await db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_daily_menu_date ON daily_menu(date)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_delivery_plan_user ON delivery_plan_items(user_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_delivery_plan_daily ON delivery_plan_items(daily_menu_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_order_history_user ON order_history(user_id)');
  await db.run('CREATE INDEX IF NOT EXISTS idx_order_history_date ON order_history(date)');
};

// Query helper that mimics pg's interface
export const query = async <T = any>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> => {
  const start = Date.now();
  try {
    // Convert PostgreSQL syntax to SQLite
    let sql = text
      .replace(/\$\d+/g, '?')  // Replace $1, $2 with ?
      .replace(/NOW\(\)/g, 'datetime("now")')
      .replace(/CURRENT_TIMESTAMP/g, 'datetime("now")')
      .replace(/CURRENT_DATE/g, 'date("now")')
      .replace(/gen_random_uuid\(\)/g, 'lower(hex(randomblob(16)))')
      .replace(/::[a-zA-Z]+/g, '');  // Remove type casts

    // Handle RETURNING clause
    const returningMatch = sql.match(/RETURNING\s+(.+)$/i);
    if (returningMatch) {
      const returningColumns = returningMatch[1];
      sql = sql.replace(/RETURNING\s+(.+)$/i, '');
      
      // For UPDATE/DELETE, we need to get the ID first
      const isUpdate = sql.trim().toLowerCase().startsWith('update');
      const isDelete = sql.trim().toLowerCase().startsWith('delete');
      const isInsert = sql.trim().toLowerCase().startsWith('insert');
      
      const table = sql.match(/INSERT INTO (\w+)/)?.[1] || 
                    sql.match(/UPDATE (\w+)/)?.[1] ||
                    sql.match(/DELETE FROM (\w+)/)?.[1];
      
      if (isUpdate && table) {
        // For UPDATE, extract the ID from WHERE clause
        const whereMatch = sql.match(/WHERE\s+id\s*=\s*\?/i);
        if (whereMatch && params && params.length > 0) {
          // The last param should be the ID for UPDATE
          const id = params[params.length - 1];
          // Execute the update
          await db.run(sql, params);
          // Fetch the updated row
          const selectSql = `SELECT ${returningColumns} FROM ${table} WHERE id = ?`;
          const rows = await db.all(selectSql, [id]);
          const duration = Date.now() - start;
          console.log('Executed query', { text: text.substring(0, 100), duration, rows: rows.length });
          return { rows, rowCount: rows.length };
        }
      } else if (isInsert && table) {
        // For INSERT, use lastID
        const stmt = await db.run(sql, params);
        const id = stmt.lastID;
        if (id) {
          const selectSql = `SELECT ${returningColumns} FROM ${table} WHERE id = ?`;
          const rows = await db.all(selectSql, [id]);
          const duration = Date.now() - start;
          console.log('Executed query', { text: text.substring(0, 100), duration, rows: rows.length });
          return { rows, rowCount: rows.length };
        }
      }
      
      // Fallback
      const stmt = await db.run(sql, params);
      return { rows: [], rowCount: stmt.changes };
    }

    // SELECT queries
    if (sql.trim().toLowerCase().startsWith('select')) {
      const rows = await db.all(sql, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: rows.length });
      return { rows, rowCount: rows.length };
    }

    // INSERT/UPDATE/DELETE
    const stmt = await db.run(sql, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: stmt.changes });
    return { rows: [], rowCount: stmt.changes };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export const getClient = () => db;

export const withTransaction = async <T>(callback: any): Promise<T> => {
  await db.run('BEGIN');
  try {
    const result = await callback(db);
    await db.run('COMMIT');
    return result;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
};

export default db;
