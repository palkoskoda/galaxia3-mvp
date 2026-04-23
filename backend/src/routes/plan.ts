import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { authenticate } from '../middleware/auth';
import { setSelectionSchema } from '../utils/validators';
import { NotFoundError, DeadlinePassedError, ValidationError } from '../utils/errors';
import { ApiResponse, DeliveryPlanItem } from '../types';

const router = Router();

// ============================================
// ŽIVÝ PLÁN - KĽÚČOVÁ FUNKCIONALITA
// ============================================

// PUT /api/plan/selection - Nastaviť počet kusov pre jedlo
// Toto je HLAVNÝ endpoint pre stavový model
router.put('/selection', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const validated = setSelectionSchema.parse(req.body);
    const { dailyMenuId, quantity } = validated;

    // Check if daily menu exists and get deadline
    const dmResult = await query<{
      id: string;
      deadline_timestamp: string;
      is_locked: number;
      menu_item_name: string;
    }>(
      `SELECT dm.id, dm.deadline_timestamp, dm.is_locked, mi.name as menu_item_name
       FROM daily_menu dm
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dm.id = $1`,
      [dailyMenuId]
    );

    if (dmResult.rows.length === 0) {
      throw new NotFoundError('Daily menu item');
    }

    const dailyMenu = dmResult.rows[0];

    // Check deadline
    if (new Date(dailyMenu.deadline_timestamp) < new Date()) {
      throw new DeadlinePassedError(`Uzávierka pre ${dailyMenu.menu_item_name} už prebehla`);
    }

    if (dailyMenu.is_locked === 1) {
      throw new DeadlinePassedError(`Položka ${dailyMenu.menu_item_name} je zamknutá`);
    }

    let result;

    if (quantity === 0) {
      // DELETE - Odstrániť záznam ak je quantity 0
      result = await query(
        'DELETE FROM delivery_plan_items WHERE user_id = $1 AND daily_menu_id = $2 RETURNING *',
        [userId, dailyMenuId]
      );

      if (result.rows.length === 0) {
        // Nothing to delete, but that's ok
        const response: ApiResponse<{ message: string }> = {
          success: true,
          data: { message: 'Selection removed (was not present)' },
        };
        res.json(response);
        return;
      }
    } else {
      // Check if record exists
      const existingResult = await query(
        'SELECT id FROM delivery_plan_items WHERE user_id = $1 AND daily_menu_id = $2',
        [userId, dailyMenuId]
      );

      if (existingResult.rows.length > 0) {
        // UPDATE existing record
        result = await query<DeliveryPlanItem>(
          `UPDATE delivery_plan_items 
           SET quantity = $1, last_updated = datetime('now')
           WHERE user_id = $2 AND daily_menu_id = $3
           RETURNING *`,
          [quantity, userId, dailyMenuId]
        );
      } else {
        // INSERT new record
        const id = `plan-${userId}-${dailyMenuId}-${Date.now()}`;
        result = await query<DeliveryPlanItem>(
          `INSERT INTO delivery_plan_items (id, user_id, daily_menu_id, quantity, last_updated)
           VALUES ($1, $2, $3, $4, datetime('now'))
           RETURNING *`,
          [id, userId, dailyMenuId, quantity]
        );
      }
    }

    const response: ApiResponse<DeliveryPlanItem | { message: string }> = {
      success: true,
      data: quantity === 0 
        ? { message: 'Selection removed' }
        : result.rows[0],
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/plan/my - Môj aktuálny plán dodávok
router.get('/my', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const from = req.query.from as string || new Date().toISOString().split('T')[0];

    const result = await query<any>(
      `SELECT 
         dpi.id,
         dpi.user_id,
         dpi.daily_menu_id,
         dpi.quantity,
         dpi.last_updated,
         dm.id as dm_id,
         dm.date as dm_date,
         dm.menu_item_id as dm_menu_item_id,
         dm.menu_slot as dm_menu_slot,
         dm.deadline_timestamp as dm_deadline_timestamp,
         dm.max_quantity as dm_max_quantity,
         dm.is_locked as dm_is_locked,
         mi.id as mi_id,
         mi.name as mi_name,
         mi.description as mi_description,
         mi.price as mi_price,
         mi.allergens as mi_allergens,
         mi.deadline_type as mi_deadline_type,
         mi.is_active as mi_is_active
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dpi.user_id = $1
         AND dm.date >= $2
       ORDER BY dm.date, 
         CASE dm.menu_slot 
           WHEN 'Soup' THEN 1 
           WHEN 'MenuA' THEN 2 
           WHEN 'MenuB' THEN 3 
           WHEN 'Special' THEN 4 
         END`,
      [userId, from]
    );

    // Transform to expected format
    const items = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      dailyMenuId: row.daily_menu_id,
      quantity: row.quantity,
      lastUpdated: row.last_updated,
      dailyMenu: {
        id: row.dm_id,
        date: row.dm_date,
        menuItemId: row.dm_menu_item_id,
        menuSlot: row.dm_menu_slot,
        deadlineTimestamp: row.dm_deadline_timestamp,
        maxQuantity: row.dm_max_quantity,
        isLocked: row.dm_is_locked === 1,
        menuItem: {
          id: row.mi_id,
          name: row.mi_name,
          description: row.mi_description,
          price: row.mi_price,
          allergens: JSON.parse(row.mi_allergens || '[]'),
          deadlineType: row.mi_deadline_type,
          isActive: row.mi_is_active === 1,
        },
      },
    }));

    // Group by date
    const grouped = items.reduce((acc, item) => {
      const date = item.dailyMenu.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          items: [] as typeof items,
          totalPrice: 0,
        };
      }
      acc[date].items.push(item);
      acc[date].totalPrice += item.quantity * item.dailyMenu.menuItem.price;
      return acc;
    }, {} as Record<string, { date: string; items: typeof items; totalPrice: number }>);

    const response: ApiResponse<typeof grouped> = {
      success: true,
      data: grouped,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/plan/summary/:date - Súhrn pre konkrétny deň (pre používateľa)
router.get('/summary/:date', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const date = req.params.date;

    const result = await query<{
      total_items: number;
      total_price: number;
    }>(
      `SELECT 
         COUNT(*) as total_items,
         COALESCE(SUM(dpi.quantity * mi.price), 0) as total_price
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dpi.user_id = $1 AND dm.date = $2`,
      [userId, date]
    );

    const response: ApiResponse<typeof result.rows[0]> = {
      success: true,
      data: result.rows[0],
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
