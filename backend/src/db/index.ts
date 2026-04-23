import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const isPostgres = process.env.DATABASE_URL?.startsWith('postgres') || process.env.PGHOST !== undefined;

let pool: Pool | null = null;

// SQLite fallback for local development
let sqliteDb: any = null;

export const initDatabase = async (): Promise<void> => {
  try {
    if (isPostgres) {
      // PostgreSQL
      const connectionString = process.env.DATABASE_URL || 
        (process.env.PGHOST ? `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}` : undefined);
      
      if (!connectionString) {
        throw new Error('PostgreSQL configured but no connection string available');
      }
      
      pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });

      // Test connection
      const client = await pool.connect();
      console.log('✅ PostgreSQL connected');
      client.release();

      await createPostgresTables();
      await ensureDemoUsers();
    } else {
      // SQLite fallback
      const { Database } = await import('sqlite3');
      const { open } = await import('sqlite');
      const path = await import('path');
      
      const DB_PATH = process.env.SQLITE_PATH || path.join(process.cwd(), 'galaxia3.db');
      
      sqliteDb = await open({
        filename: DB_PATH,
        driver: Database,
      });

      await sqliteDb.run('PRAGMA foreign_keys = ON');
      await createSQLiteTables();
      await ensureDemoUsers();

      console.log('✅ SQLite database connected:', DB_PATH);
    }
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
      await sqliteDb.run(
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
  }
};

const createPostgresTables = async () => {
  const client = await pool!.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Menu items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL CHECK (price >= 0),
        allergens TEXT DEFAULT '[]',
        deadline_type TEXT DEFAULT 'standard' CHECK (deadline_type IN ('standard', 'express')),
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Daily menu table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_menu (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        menu_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        menu_slot TEXT NOT NULL CHECK (menu_slot IN ('MenuA', 'MenuB', 'Soup', 'Special')),
        deadline_timestamp TIMESTAMP NOT NULL,
        max_quantity INTEGER,
        is_locked INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, menu_item_id)
      )
    `);

    // Delivery plan items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_plan_items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        daily_menu_id TEXT NOT NULL REFERENCES daily_menu(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, daily_menu_id)
      )
    `);

    // Order history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        items_json TEXT NOT NULL,
        total_price REAL NOT NULL,
        delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
        payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'invoiced', 'overdue')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Raw payload used by render/import workflows
    await client.query(`
      CREATE TABLE IF NOT EXISTS render_menu_data (
        id TEXT PRIMARY KEY,
        source_name TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // One-shot import markers
    await client.query(`
      CREATE TABLE IF NOT EXISTS import_markers (
        import_key TEXT PRIMARY KEY,
        source_name TEXT NOT NULL,
        checksum TEXT,
        imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Delivery settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_settings (
        id TEXT PRIMARY KEY,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_daily_menu_date ON daily_menu(date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_delivery_plan_user ON delivery_plan_items(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_delivery_plan_daily ON delivery_plan_items(daily_menu_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_order_history_user ON order_history(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_order_history_date ON order_history(date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_render_menu_data_source ON render_menu_data(source_name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_import_markers_source ON import_markers(source_name)');

    await client.query('COMMIT');
    console.log('✅ PostgreSQL tables created');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const createSQLiteTables = async () => {
  // Users table
  await sqliteDb.run(`
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
  await sqliteDb.run(`
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
  await sqliteDb.run(`
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
  await sqliteDb.run(`
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
  await sqliteDb.run(`
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

  // Raw payload used by render/import workflows
  await sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS render_menu_data (
      id TEXT PRIMARY KEY,
      source_name TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // One-shot import markers
  await sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS import_markers (
      import_key TEXT PRIMARY KEY,
      source_name TEXT NOT NULL,
      checksum TEXT,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Delivery settings table
  await sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS delivery_settings (
      id TEXT PRIMARY KEY,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT
    )
  `);

  // Create indexes
  await sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_daily_menu_date ON daily_menu(date)');
  await sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_delivery_plan_user ON delivery_plan_items(user_id)');
  await sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_delivery_plan_daily ON delivery_plan_items(daily_menu_id)');
  await sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_order_history_user ON order_history(user_id)');
  await sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_order_history_date ON order_history(date)');
  await sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_render_menu_data_source ON render_menu_data(source_name)');
  await sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_import_markers_source ON import_markers(source_name)');
};

// Query helper
export const query = async <T = any>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> => {
  const start = Date.now();
  try {
    if (isPostgres && pool) {
      // PostgreSQL
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
      return { rows: result.rows, rowCount: result.rowCount || 0 };
    } else if (sqliteDb) {
      // SQLite
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
        
        const isUpdate = sql.trim().toLowerCase().startsWith('update');
        const isInsert = sql.trim().toLowerCase().startsWith('insert');
        
        const table = sql.match(/INSERT INTO (\w+)/)?.[1] || 
                      sql.match(/UPDATE (\w+)/)?.[1];
        
        if (isUpdate && table) {
          const id = params?.[params.length - 1];
          await sqliteDb.run(sql, params);
          const selectSql = `SELECT ${returningColumns} FROM ${table} WHERE id = ?`;
          const rows = await sqliteDb.all(selectSql, [id]);
          return { rows, rowCount: rows.length };
        } else if (isInsert && table) {
          const stmt = await sqliteDb.run(sql, params);
          const id = stmt.lastID;
          if (id) {
            const selectSql = `SELECT ${returningColumns} FROM ${table} WHERE id = ?`;
            const rows = await sqliteDb.all(selectSql, [id]);
            return { rows, rowCount: rows.length };
          }
        }
        
        const stmt = await sqliteDb.run(sql, params);
        return { rows: [], rowCount: stmt.changes };
      }

      if (sql.trim().toLowerCase().startsWith('select')) {
        const rows = await sqliteDb.all(sql, params);
        return { rows, rowCount: rows.length };
      }

      const stmt = await sqliteDb.run(sql, params);
      return { rows: [], rowCount: stmt.changes };
    }
    
    throw new Error('Database not initialized');
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export const getClient = () => {
  if (isPostgres) {
    return pool;
  }
  return sqliteDb;
};

export const withTransaction = async <T>(callback: (client: PoolClient | any) => Promise<T>): Promise<T> => {
  if (isPostgres && pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else if (sqliteDb) {
    await sqliteDb.run('BEGIN');
    try {
      const result = await callback(sqliteDb);
      await sqliteDb.run('COMMIT');
      return result;
    } catch (error) {
      await sqliteDb.run('ROLLBACK');
      throw error;
    }
  }
  
  throw new Error('Database not initialized');
};

export default { query, getClient, withTransaction };
