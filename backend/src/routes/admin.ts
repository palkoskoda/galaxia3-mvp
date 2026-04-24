import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { NotFoundError, ValidationError } from '../utils/errors';
import { ApiResponse, KitchenSummaryItem, DeliveryDetail, User } from '../types';

const router = Router();

// ============================================
// ADMIN ROUTES
// ============================================

// GET /api/admin/dashboard - Dashboard štatistiky
router.get('/dashboard', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Dnešné štatistiky
    const todayStats = await query<{
      total_orders: number;
      total_meals: number;
      total_revenue: number;
    }>(
      `SELECT 
         COUNT(DISTINCT dpi.user_id) as total_orders,
         COALESCE(SUM(dpi.quantity), 0) as total_meals,
         COALESCE(SUM(dpi.quantity * mi.price), 0) as total_revenue
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dm.date = $1`,
      [today]
    );

    // Aktívni zákazníci
    const activeCustomers = await query<{ count: number }>(
      `SELECT COUNT(DISTINCT user_id) as count
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       WHERE dm.date >= date('now')`
    );

    // Objednávky na zajtra
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const tomorrowStats = await query<{
      total_orders: number;
      total_meals: number;
    }>(
      `SELECT 
         COUNT(DISTINCT dpi.user_id) as total_orders,
         COALESCE(SUM(dpi.quantity), 0) as total_meals
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       WHERE dm.date = $1`,
      [tomorrowStr]
    );

    const response: ApiResponse<{
      today: typeof todayStats.rows[0];
      tomorrow: typeof tomorrowStats.rows[0];
      activeCustomers: number;
    }> = {
      success: true,
      data: {
        today: todayStats.rows[0],
        tomorrow: tomorrowStats.rows[0],
        activeCustomers: activeCustomers.rows[0].count,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// ============================================
// DENNÁ SÚPISKA
// ============================================

// GET /api/admin/daily-summary/:date - Denná súpiska
router.get('/daily-summary/:date', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = req.params.date;

    // Kontrola či je po uzávierke
    const deadlineCheck = await query<{
      all_locked: number;
      any_items: number;
    }>(
      `SELECT 
         MIN(CASE WHEN is_locked = 1 OR deadline_timestamp < datetime('now') THEN 1 ELSE 0 END) as all_locked,
         COUNT(*) as any_items
       FROM daily_menu
       WHERE date = $1`,
      [date]
    );

    // Súhrn pre kuchyňu
    const kitchenSummary = await query<KitchenSummaryItem>(
      `SELECT 
         mi.name as menu_item_name,
         COALESCE(SUM(dpi.quantity), 0) as total_quantity
       FROM daily_menu dm
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       LEFT JOIN delivery_plan_items dpi ON dm.id = dpi.daily_menu_id
       WHERE dm.date = $1
       GROUP BY mi.name
       ORDER BY mi.name`,
      [date]
    );

    // Detail pre rozvoz - SQLite compatible (no jsonb_agg)
    const deliveryResult = await query<any>(
      `SELECT 
         u.id as user_id,
         u.first_name || ' ' || u.last_name as user_name,
         COALESCE(dpi.delivery_address, u.address) as user_address,
         u.phone as user_phone,
         SUM(dpi.quantity * mi.price) as total_price
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       JOIN users u ON dpi.user_id = u.id
       WHERE dm.date = $1
       GROUP BY u.id, u.first_name, u.last_name, COALESCE(dpi.delivery_address, u.address), u.phone
       ORDER BY u.last_name, u.first_name`,
      [date]
    );

    // Get items for each delivery
    const deliveries: DeliveryDetail[] = [];
    for (const row of deliveryResult.rows) {
      const itemsResult = await query<any>(
        `SELECT 
           mi.name as item_name,
           dpi.quantity,
           mi.price
         FROM delivery_plan_items dpi
         JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
         JOIN menu_items mi ON dm.menu_item_id = mi.id
         JOIN users u ON dpi.user_id = u.id
         WHERE dpi.user_id = $1 AND dm.date = $2
           AND COALESCE(dpi.delivery_address, u.address) = $3`,
        [row.user_id, date, row.user_address]
      );

      deliveries.push({
        userId: row.user_id,
        userName: row.user_name,
        userAddress: row.user_address,
        userPhone: row.user_phone,
        items: itemsResult.rows.map((item: any) => ({
          itemName: item.item_name,
          quantity: item.quantity,
          price: item.price,
        })),
        totalPrice: row.total_price,
      });
    }

    // Celkové štatistiky
    const totals = await query<{
      total_meals: number;
      total_revenue: number;
      total_customers: number;
    }>(
      `SELECT 
         COALESCE(SUM(dpi.quantity), 0) as total_meals,
         COALESCE(SUM(dpi.quantity * mi.price), 0) as total_revenue,
         COUNT(DISTINCT dpi.user_id) as total_customers
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dm.date = $1`,
      [date]
    );

    const response: ApiResponse<{
      date: string;
      isFinal: boolean;
      kitchen: KitchenSummaryItem[];
      deliveries: DeliveryDetail[];
      totals: typeof totals.rows[0];
    }> = {
      success: true,
      data: {
        date,
        isFinal: deadlineCheck.rows[0]?.all_locked === 1 || false,
        kitchen: kitchenSummary.rows,
        deliveries,
        totals: totals.rows[0],
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/archive-day/:date - Archivovať deň (presunúť do histórie)
router.post('/archive-day/:date', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = req.params.date;

    // Získame všetky plány pre daný deň
    const plans = await query<{
      user_id: string;
      items: string;
      total_price: number;
    }>(
      `SELECT 
         dpi.user_id,
         json_group_array(json_object(
           'item_name', mi.name,
           'quantity', dpi.quantity,
           'price', mi.price
         )) as items,
         SUM(dpi.quantity * mi.price) as total_price
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dm.date = $1
       GROUP BY dpi.user_id`,
      [date]
    );

    // Vložíme do histórie
    for (const plan of plans.rows) {
      const id = `hist-${date}-${plan.user_id}`;
      await query(
        `INSERT OR IGNORE INTO order_history (id, user_id, date, items_json, total_price, delivery_status, payment_status)
         VALUES ($1, $2, $3, $4, $5, 'pending', 'pending')`,
        [id, plan.user_id, date, plan.items, plan.total_price]
      );
    }

    // Zamkneme denné menu
    await query(
      'UPDATE daily_menu SET is_locked = 1 WHERE date = $1',
      [date]
    );

    const response: ApiResponse<{
      archived: number;
      message: string;
    }> = {
      success: true,
      data: {
        archived: plans.rows.length,
        message: `Deň ${date} bol archivovaný`,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// ============================================
// SPRÁVA POUŽÍVATEĽOV
// ============================================

// GET /api/admin/users - Zoznam používateľov
router.get('/users', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.query.role as string;
    const search = req.query.search as string;

    let whereClause = 'WHERE 1=1';
    const params: string[] = [];

    if (role) {
      whereClause += ` AND role = $${params.length + 1}`;
      params.push(role);
    }

    if (search) {
      whereClause += ` AND (
        first_name LIKE $${params.length + 1}
        OR last_name LIKE $${params.length + 1}
        OR email LIKE $${params.length + 1}
        OR phone LIKE $${params.length + 1}
        OR address LIKE $${params.length + 1}
      )`;
      params.push(`%${search}%`);
    }

    const result = await query<User>(
      `SELECT id, email, first_name, last_name, phone, address, role, is_active, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    const users = result.rows.map((user: any) => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      address: user.address,
      role: user.role,
      isActive: user.is_active === 1,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    const response: ApiResponse<User[]> = {
      success: true,
      data: users,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id - Upraviť používateľa
router.put('/users/:id', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;
    const { firstName, lastName, phone, address, role, isActive } = req.body;

    // Build dynamic query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    values.push(userId);

    const result = await query<User>(
      `UPDATE users 
       SET ${updates.join(', ')}
       WHERE id = ?
       RETURNING id, email, first_name, last_name, phone, address, role, is_active, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = {
      ...result.rows[0],
      isActive: (result.rows[0] as any).is_active === 1,
    };

    const response: ApiResponse<User> = {
      success: true,
      data: user,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// ============================================
// NASTAVENIA
// ============================================

// GET /api/admin/settings - Systémové nastavenia
router.get('/settings', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query<{
      setting_key: string;
      setting_value: string;
      description: string;
    }>('SELECT * FROM delivery_settings');

    const settings = result.rows.reduce((acc, row) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {} as Record<string, string>);

    const response: ApiResponse<typeof settings> = {
      success: true,
      data: settings,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/settings - Upraviť nastavenia
router.put('/settings', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      const id = `setting-${key}`;
      
      // Check if setting exists
      const existing = await query(
        'SELECT id FROM delivery_settings WHERE setting_key = ?',
        [key]
      );
      
      if (existing.rows.length > 0) {
        // Update existing
        await query(
          'UPDATE delivery_settings SET setting_value = ? WHERE setting_key = ?',
          [value, key]
        );
      } else {
        // Insert new
        await query(
          'INSERT INTO delivery_settings (id, setting_key, setting_value) VALUES (?, ?, ?)',
          [id, key, value]
        );
      }
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Settings updated' },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/sync-menu - Sync menu data from menu-data.json
router.post('/sync-menu', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { execSync } = require('child_process');
    const path = require('path');
    
    const scriptPath = path.join(__dirname, '..', 'scripts', 'sync-menu-data.js');
    
    try {
      const result = execSync(`node "${scriptPath}"`, { 
        encoding: 'utf8',
        cwd: path.join(__dirname, '..', '..')
      });
      
      const response: ApiResponse<{ message: string; output: string }> = {
        success: true,
        data: {
          message: 'Menu data synced successfully',
          output: result,
        },
      };
      
      res.json(response);
    } catch (execError: any) {
      const response: ApiResponse<{ message: string; error: string }> = {
        success: false,
        data: {
          message: 'Sync failed',
          error: execError.stderr || execError.message,
        },
      };
      
      res.status(500).json(response);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
