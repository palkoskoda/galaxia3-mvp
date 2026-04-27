import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { authenticate } from '../middleware/auth';
import { setSelectionSchema } from '../utils/validators';
import { NotFoundError, DeadlinePassedError, ValidationError } from '../utils/errors';
import { ApiResponse, DeliveryPlanItem } from '../types';

const router = Router();

const logPlanAudit = async (params: {
  planItemId: string;
  userId: string;
  actorUserId: string;
  actionType: string;
  fieldName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
}) => {
  const auditId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await query(
    `INSERT INTO delivery_plan_audit_log (id, plan_item_id, user_id, actor_user_id, action_type, field_name, old_value, new_value, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      auditId,
      params.planItemId,
      params.userId,
      params.actorUserId,
      params.actionType,
      params.fieldName || null,
      params.oldValue != null ? String(params.oldValue) : null,
      params.newValue != null ? String(params.newValue) : null,
      params.reason || null,
    ]
  );
};

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
      menu_slot: string;
    }>(
      `SELECT dm.id, dm.deadline_timestamp, dm.is_locked, mi.name as menu_item_name, dm.menu_slot
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

      await logPlanAudit({
        planItemId: result.rows[0].id,
        userId,
        actorUserId: userId,
        actionType: 'plan_item_deleted',
        fieldName: 'quantity',
        oldValue: result.rows[0].quantity,
        newValue: 0,
      });
    } else {
      // Check if record exists
      const existingResult = await query<any>(
        'SELECT id, quantity, include_soup, include_extra FROM delivery_plan_items WHERE user_id = $1 AND daily_menu_id = $2',
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
        await logPlanAudit({
          planItemId: existingResult.rows[0].id,
          userId,
          actorUserId: userId,
          actionType: 'quantity_updated',
          fieldName: 'quantity',
          oldValue: existingResult.rows[0].quantity,
          newValue: quantity,
        });
      } else {
        // INSERT new record
        const id = `plan-${userId}-${dailyMenuId}-${Date.now()}`;
        result = await query<DeliveryPlanItem>(
          `INSERT INTO delivery_plan_items (id, user_id, daily_menu_id, quantity, delivery_address, include_soup, include_extra, last_updated)
           VALUES ($1, $2, $3, $4, NULL, 1, 0, datetime('now'))
           RETURNING *`,
          [id, userId, dailyMenuId, quantity]
        );
        await logPlanAudit({
          planItemId: id,
          userId,
          actorUserId: userId,
          actionType: 'plan_item_created',
          fieldName: 'quantity',
          newValue: quantity,
        });
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

// PUT /api/plan/item/:planId/options - Zmeniť polievku/extra pre objednávku
router.put('/item/:planId/options', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const planId = req.params.planId;
    const { includeSoup, includeExtra } = req.body;

    const planCheck = await query<any>(
      `SELECT dpi.id, dpi.include_soup, dpi.include_extra, dm.date, dm.deadline_timestamp, dm.is_locked
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       WHERE dpi.id = $1 AND dpi.user_id = $2`,
      [planId, userId]
    );

    if (planCheck.rows.length === 0) {
      throw new NotFoundError('Delivery plan item');
    }

    const plan = planCheck.rows[0];
    if (plan.is_locked === 1 || new Date(plan.deadline_timestamp) < new Date()) {
      throw new DeadlinePassedError('Uzávierka už uplynula, objednávku nemožno upraviť');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (includeSoup !== undefined) {
      updates.push(`include_soup = $${paramIdx++}`);
      values.push(includeSoup ? 1 : 0);
    }
    if (includeExtra !== undefined) {
      updates.push(`include_extra = $${paramIdx++}`);
      values.push(includeExtra ? 1 : 0);
    }

    if (updates.length === 0) {
      throw new ValidationError('No options to update');
    }

    values.push(planId, userId);

    const result = await query<DeliveryPlanItem>(
      `UPDATE delivery_plan_items
       SET ${updates.join(', ')}, last_updated = datetime('now')
       WHERE id = $${paramIdx++} AND user_id = $${paramIdx++}
       RETURNING *`,
      values
    );

    if (includeSoup !== undefined) {
      await logPlanAudit({
        planItemId: planId,
        userId,
        actorUserId: userId,
        actionType: 'options_updated',
        fieldName: 'include_soup',
        oldValue: plan.include_soup,
        newValue: includeSoup ? 1 : 0,
      });
    }
    if (includeExtra !== undefined) {
      await logPlanAudit({
        planItemId: planId,
        userId,
        actorUserId: userId,
        actionType: 'options_updated',
        fieldName: 'include_extra',
        oldValue: plan.include_extra,
        newValue: includeExtra ? 1 : 0,
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// PUT /api/plan/item/:planId/delivery-address - Upraviť adresu doručenia pre konkrétnu objednávku
router.put('/item/:planId/delivery-address', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const planId = req.params.planId;
    const deliveryAddress = (req.body.deliveryAddress || '').trim();

    const planCheck = await query<any>(
      `SELECT dpi.id, dpi.delivery_address, dm.date, dm.deadline_timestamp, dm.is_locked
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       WHERE dpi.id = $1 AND dpi.user_id = $2`,
      [planId, userId]
    );

    if (planCheck.rows.length === 0) {
      throw new NotFoundError('Delivery plan item');
    }

    const plan = planCheck.rows[0];
    if (plan.is_locked === 1 || new Date(plan.deadline_timestamp) < new Date()) {
      throw new DeadlinePassedError('Uzávierka už uplynula, adresu nemožno upraviť');
    }

    const result = await query<DeliveryPlanItem>(
      `UPDATE delivery_plan_items
       SET delivery_address = $1, last_updated = datetime('now')
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [deliveryAddress || null, planId, userId]
    );

    await logPlanAudit({
      planItemId: planId,
      userId,
      actorUserId: userId,
      actionType: 'delivery_address_updated',
      fieldName: 'delivery_address',
      oldValue: plan.delivery_address,
      newValue: deliveryAddress || null,
    });

    const response: ApiResponse<DeliveryPlanItem> = {
      success: true,
      data: result.rows[0],
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/plan/item/:planId/reset-delivery-address - Reset adresy na profilovú default
router.post('/item/:planId/reset-delivery-address', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const planId = req.params.planId;

    const planCheck = await query<any>(
      `SELECT dpi.id, dpi.delivery_address, dm.deadline_timestamp, dm.is_locked
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       WHERE dpi.id = $1 AND dpi.user_id = $2`,
      [planId, userId]
    );

    if (planCheck.rows.length === 0) throw new NotFoundError('Delivery plan item');
    const plan = planCheck.rows[0];
    if (plan.is_locked === 1 || new Date(plan.deadline_timestamp) < new Date()) {
      throw new DeadlinePassedError('Uzávierka už uplynula, adresu nemožno upraviť');
    }

    const result = await query<DeliveryPlanItem>(
      `UPDATE delivery_plan_items SET delivery_address = NULL, last_updated = datetime('now') WHERE id = $1 AND user_id = $2 RETURNING *`,
      [planId, userId]
    );

    await logPlanAudit({
      planItemId: planId,
      userId,
      actorUserId: userId,
      actionType: 'delivery_address_reset',
      fieldName: 'delivery_address',
      oldValue: plan.delivery_address,
      newValue: null,
    });

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// POST /api/plan/day/:date/apply-default-address - Použiť profilovú adresu pre všetky objednávky v daný deň
router.post('/day/:date/apply-default-address', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const date = req.params.date;

    const plans = await query<any>(
      `SELECT dpi.id, dpi.delivery_address, dm.deadline_timestamp, dm.is_locked
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       WHERE dpi.user_id = $1 AND dm.date = $2`,
      [userId, date]
    );

    const editablePlans = plans.rows.filter((row: any) => row.is_locked !== 1 && new Date(row.deadline_timestamp) >= new Date());

    for (const plan of editablePlans) {
      await query(
        `UPDATE delivery_plan_items SET delivery_address = NULL, last_updated = datetime('now') WHERE id = $1`,
        [plan.id]
      );
      await logPlanAudit({
        planItemId: plan.id,
        userId,
        actorUserId: userId,
        actionType: 'delivery_address_reset_for_day',
        fieldName: 'delivery_address',
        oldValue: plan.delivery_address,
        newValue: null,
      });
    }

    res.json({ success: true, data: { updatedCount: editablePlans.length } });
  } catch (error) {
    next(error);
  }
});

// GET /api/plan/my - Môj aktuálny plán dodávok
router.get('/my', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const from = req.query.from as string || new Date().toISOString().split('T')[0];

    // Get user's senior status
    const userResult = await query<{ is_senior: number }>(
      'SELECT is_senior FROM users WHERE id = $1',
      [userId]
    );
    const isSenior = userResult.rows[0]?.is_senior === 1;

    const result = await query<any>(
      `SELECT
         dpi.id,
         dpi.user_id,
         dpi.daily_menu_id,
         dpi.quantity,
         dpi.delivery_address,
         dpi.include_soup,
         dpi.include_extra,
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
         mi.senior_price as mi_senior_price,
         mi.allergens as mi_allergens,
         mi.deadline_type as mi_deadline_type,
         mi.is_active as mi_is_active,
         soup.price as soup_price,
         extra.price as extra_price
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       LEFT JOIN daily_menu dm_soup ON dm_soup.date = dm.date AND dm_soup.menu_slot = 'Soup'
       LEFT JOIN menu_items soup ON dm_soup.menu_item_id = soup.id
       LEFT JOIN daily_menu dm_extra ON dm_extra.date = dm.date AND dm_extra.menu_slot = 'Extra'
       LEFT JOIN menu_items extra ON dm_extra.menu_item_id = extra.id
       WHERE dpi.user_id = $1
         AND dm.date >= $2
       ORDER BY dm.date,
         CASE dm.menu_slot
           WHEN 'Soup' THEN 1
           WHEN 'MenuA' THEN 2
           WHEN 'MenuB' THEN 3
           WHEN 'Special' THEN 4
           WHEN 'Extra' THEN 5
         END`,
      [userId, from]
    );

    // Transform to expected format
    const items = result.rows.map(row => {
      const isMeal = row.dm_menu_slot !== 'Soup' && row.dm_menu_slot !== 'Extra';
      const soupPrice = row.soup_price || 0.50;
      const extraPrice = row.extra_price || 0.50;
      const basePrice = isSenior && row.mi_senior_price != null ? row.mi_senior_price : row.mi_price;
      const unitPrice = isMeal
        ? basePrice + (row.include_soup ? soupPrice : 0) + (row.include_extra ? extraPrice : 0)
        : basePrice;

      return {
        id: row.id,
        userId: row.user_id,
        dailyMenuId: row.daily_menu_id,
        quantity: row.quantity,
        deliveryAddress: row.delivery_address,
        includeSoup: row.include_soup === 1,
        includeExtra: row.include_extra === 1,
        lastUpdated: row.last_updated,
        unitPrice,
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
            seniorPrice: row.mi_senior_price,
            allergens: JSON.parse(row.mi_allergens || '[]'),
            deadlineType: row.mi_deadline_type,
            isActive: row.mi_is_active === 1,
          },
        },
      };
    });

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
      acc[date].totalPrice += item.quantity * item.unitPrice;
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

    // Get user's senior status
    const userResult = await query<{ is_senior: number }>(
      'SELECT is_senior FROM users WHERE id = $1',
      [userId]
    );
    const isSenior = userResult.rows[0]?.is_senior === 1;

    const result = await query<{
      total_items: number;
      total_price: number;
    }>(
      `SELECT
         COUNT(*) as total_items,
         COALESCE(SUM(
           dpi.quantity * (
             CASE WHEN $3 = 1 AND mi.senior_price IS NOT NULL THEN mi.senior_price ELSE mi.price END +
             CASE WHEN dm.menu_slot IN ('MenuA', 'MenuB', 'Special') AND dpi.include_soup = 1 THEN COALESCE(soup.price, 0.50) ELSE 0 END +
             CASE WHEN dm.menu_slot IN ('MenuA', 'MenuB', 'Special') AND dpi.include_extra = 1 THEN COALESCE(extra.price, 0.50) ELSE 0 END
           )
         ), 0) as total_price
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       LEFT JOIN daily_menu dm_soup ON dm_soup.date = dm.date AND dm_soup.menu_slot = 'Soup'
       LEFT JOIN menu_items soup ON dm_soup.menu_item_id = soup.id
       LEFT JOIN daily_menu dm_extra ON dm_extra.date = dm.date AND dm_extra.menu_slot = 'Extra'
       LEFT JOIN menu_items extra ON dm_extra.menu_item_id = extra.id
       WHERE dpi.user_id = $1 AND dm.date = $2`,
      [userId, date, isSenior ? 1 : 0]
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
