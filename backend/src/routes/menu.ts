import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { createMenuItemSchema, updateMenuItemSchema, createDailyMenuSchema } from '../utils/validators';
import { NotFoundError } from '../utils/errors';
import { ApiResponse, MenuItem, DailyMenu, DailyMenuWithSelection } from '../types';

const router = Router();

// ============================================
// KNIŽNICA JEDÁL (Menu Items)
// ============================================

// GET /api/menu/items - Všetky jedlá z knižnice
router.get('/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query<MenuItem>(
      'SELECT * FROM menu_items WHERE is_active = 1 ORDER BY name'
    );

    // Parse allergens JSON
    const items = result.rows.map(item => ({
      ...item,
      allergens: JSON.parse(item.allergens as unknown as string || '[]'),
    }));

    const response: ApiResponse<MenuItem[]> = {
      success: true,
      data: items,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/menu/items/:id - Detail jedla
router.get('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query<MenuItem>(
      'SELECT * FROM menu_items WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Menu item');
    }

    const item = {
      ...result.rows[0],
      allergens: JSON.parse(result.rows[0].allergens as unknown as string || '[]'),
    };

    const response: ApiResponse<MenuItem> = {
      success: true,
      data: item,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/menu/items - Vytvoriť nové jedlo (admin)
router.post('/items', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createMenuItemSchema.parse(req.body);

    const result = await query<MenuItem>(
      `INSERT INTO menu_items (id, name, description, price, allergens, deadline_type)
       VALUES (lower(hex(randomblob(16))), $1, $2, $3, $4, $5)
       RETURNING *`,
      [validated.name, validated.description, validated.price, JSON.stringify(validated.allergens || []), validated.deadlineType || 'standard']
    );

    const item = {
      ...result.rows[0],
      allergens: JSON.parse(result.rows[0].allergens as unknown as string || '[]'),
    };

    const response: ApiResponse<MenuItem> = {
      success: true,
      data: item,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/menu/items/:id - Upraviť jedlo (admin)
router.put('/items/:id', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = updateMenuItemSchema.parse(req.body);

    const result = await query<MenuItem>(
      `UPDATE menu_items 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           allergens = COALESCE($4, allergens),
           deadline_type = COALESCE($5, deadline_type)
       WHERE id = $6
       RETURNING *`,
      [validated.name, validated.description, validated.price, validated.allergens ? JSON.stringify(validated.allergens) : undefined, validated.deadlineType, req.params.id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Menu item');
    }

    const item = {
      ...result.rows[0],
      allergens: JSON.parse(result.rows[0].allergens as unknown as string || '[]'),
    };

    const response: ApiResponse<MenuItem> = {
      success: true,
      data: item,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/menu/items/:id - Deaktivovať jedlo (admin)
router.delete('/items/:id', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query<MenuItem>(
      'UPDATE menu_items SET is_active = 0 WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Menu item');
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Menu item deactivated' },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// ============================================
// DENNÁ PONUKA (Daily Menu)
// ============================================

// GET /api/menu/plan - Živý jedálny lístok s používateľskými výbermi
router.get('/plan', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const days = parseInt(req.query.days as string) || 14;

    // Get daily menu with user's selections - SQLite compatible
    const result = await query<any>(
      `SELECT 
         dm.id,
         dm.date,
         dm.menu_item_id,
         dm.menu_slot,
         dm.deadline_timestamp,
         dm.max_quantity,
         dm.is_locked,
         dm.created_at,
         dm.updated_at,
         mi.id as mi_id,
         mi.name as mi_name,
         mi.description as mi_description,
         mi.price as mi_price,
         mi.allergens as mi_allergens,
         mi.deadline_type as mi_deadline_type,
         mi.is_active as mi_is_active,
         mi.created_at as mi_created_at,
         mi.updated_at as mi_updated_at,
         COALESCE(dpi.quantity, 0) as user_quantity,
         CASE WHEN dm.deadline_timestamp > datetime('now') THEN 1 ELSE 0 END as is_editable
       FROM daily_menu dm
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       LEFT JOIN delivery_plan_items dpi ON dm.id = dpi.daily_menu_id AND dpi.user_id = $1
       WHERE dm.date >= date('now') 
         AND dm.date <= date('now', '+' || $2 || ' days')
         AND mi.is_active = 1
       ORDER BY dm.date, 
         CASE dm.menu_slot 
           WHEN 'Soup' THEN 1 
           WHEN 'MenuA' THEN 2 
           WHEN 'MenuB' THEN 3 
           WHEN 'Special' THEN 4 
         END`,
      [userId, days]
    );

    // Transform to expected format
    const items: DailyMenuWithSelection[] = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      menuItemId: row.menu_item_id,
      menuSlot: row.menu_slot,
      deadlineTimestamp: row.deadline_timestamp,
      maxQuantity: row.max_quantity,
      isLocked: row.is_locked === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      menuItem: {
        id: row.mi_id,
        name: row.mi_name,
        description: row.mi_description,
        price: row.mi_price,
        allergens: JSON.parse(row.mi_allergens || '[]'),
        deadlineType: row.mi_deadline_type,
        isActive: row.mi_is_active === 1,
        createdAt: row.mi_created_at,
        updatedAt: row.mi_updated_at,
      },
      userQuantity: row.user_quantity,
      isEditable: row.is_editable === 1,
    }));

    // Group by date
    const grouped = items.reduce((acc, item) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          items: [],
          isPastDeadline: new Date(item.deadlineTimestamp) < new Date(),
        };
      }
      acc[date].items.push(item);
      return acc;
    }, {} as Record<string, { date: string; items: DailyMenuWithSelection[]; isPastDeadline: boolean }>);

    const response: ApiResponse<typeof grouped> = {
      success: true,
      data: grouped,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/menu/daily - Denná ponuka pre admina
router.get('/daily', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const from = req.query.from as string || new Date().toISOString().split('T')[0];
    const to = req.query.to as string || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await query<any>(
      `SELECT 
         dm.*,
         mi.id as mi_id,
         mi.name as mi_name,
         mi.description as mi_description,
         mi.price as mi_price,
         mi.allergens as mi_allergens,
         mi.deadline_type as mi_deadline_type,
         mi.is_active as mi_is_active,
         mi.created_at as mi_created_at,
         mi.updated_at as mi_updated_at,
         COALESCE(SUM(dpi.quantity), 0) as total_ordered
       FROM daily_menu dm
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       LEFT JOIN delivery_plan_items dpi ON dm.id = dpi.daily_menu_id
       WHERE dm.date BETWEEN $1 AND $2
       GROUP BY dm.id
       ORDER BY dm.date, dm.menu_slot`,
      [from, to]
    );

    const items: DailyMenu[] = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      menuItemId: row.menu_item_id,
      menuSlot: row.menu_slot,
      deadlineTimestamp: row.deadline_timestamp,
      maxQuantity: row.max_quantity,
      isLocked: row.is_locked === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      menuItem: {
        id: row.mi_id,
        name: row.mi_name,
        description: row.mi_description,
        price: row.mi_price,
        allergens: JSON.parse(row.mi_allergens || '[]'),
        deadlineType: row.mi_deadline_type,
        isActive: row.mi_is_active === 1,
        createdAt: row.mi_created_at,
        updatedAt: row.mi_updated_at,
      },
      totalOrdered: row.total_ordered,
    }));

    const response: ApiResponse<DailyMenu[]> = {
      success: true,
      data: items,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/menu/daily - Pridať jedlo do dennej ponuky (admin)
router.post('/daily', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createDailyMenuSchema.parse(req.body);

    let deadlineTimestamp: string;
    
    if (validated.deadlineTimestamp) {
      // Použi explicitne zadaný čas uzávierky
      deadlineTimestamp = validated.deadlineTimestamp;
    } else {
      // Fallback - vypočítaj podľa deadline_type jedla
      const itemResult = await query<{ deadline_type: string }>(
        'SELECT deadline_type FROM menu_items WHERE id = $1',
        [validated.menuItemId]
      );

      if (itemResult.rows.length === 0) {
        throw new NotFoundError('Menu item');
      }

      const deadlineType = itemResult.rows[0].deadline_type;
      
      if (deadlineType === 'standard') {
        // Day before at 14:30
        const date = new Date(validated.date);
        date.setDate(date.getDate() - 1);
        date.setHours(14, 30, 0, 0);
        deadlineTimestamp = date.toISOString();
      } else {
        // Same day at 9:00
        const date = new Date(validated.date);
        date.setHours(9, 0, 0, 0);
        deadlineTimestamp = date.toISOString();
      }
    }

    const result = await query<DailyMenu>(
      `INSERT INTO daily_menu (id, date, menu_item_id, menu_slot, deadline_timestamp, max_quantity)
       VALUES (lower(hex(randomblob(16))), $1, $2, $3, $4, $5)
       RETURNING *`,
      [validated.date, validated.menuItemId, validated.menuSlot, deadlineTimestamp, validated.maxQuantity]
    );

    const response: ApiResponse<DailyMenu> = {
      success: true,
      data: result.rows[0],
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/menu/daily/:id - Odstrániť z dennej ponuky (admin)
router.delete('/daily/:id', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      'DELETE FROM daily_menu WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Daily menu item');
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Daily menu item removed' },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
