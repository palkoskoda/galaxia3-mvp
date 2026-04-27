import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { ApiResponse, User, DeliveryPlanItem, DailyMenu, MenuItem } from '../types';
import bcrypt from 'bcryptjs';

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
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
// ZÁKAZNÍCKA PODPORA (Customer Service)
// ============================================

// GET /api/admin/customer-service/search?query=... - Vyhľadať zákazníka
router.get('/customer-service/search', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const searchQuery = (req.query.query as string || '').trim();

    if (!searchQuery || searchQuery.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Zadajte aspoň 2 znaky na vyhľadávanie'
      });
    }

    const searchPattern = `%${searchQuery}%`;

    const result = await query<User>(
      `SELECT id, email, first_name, last_name, phone, address, role, is_senior, is_active, created_at, updated_at
       FROM users
       WHERE email LIKE ?
          OR first_name LIKE ?
          OR last_name LIKE ?
          OR phone LIKE ?
          OR address LIKE ?
       ORDER BY
         CASE WHEN email = ? THEN 0 ELSE 1 END,
         last_name, first_name
       LIMIT 20`,
      [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchQuery]
    );

    const users = result.rows.map((user: any) => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      address: user.address,
      role: user.role,
      isSenior: user.is_senior === 1,
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

// POST /api/admin/customer-service/customers - rýchlo založiť zákazníka pre telefonickú/email objednávku
router.post('/customer-service/customers', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone, email, address } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, error: 'Meno a priezvisko sú povinné' });
    }

    const normalizedEmail = (email || '').trim() || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@local.invalid`;
    const existing = await query<any>(
      `SELECT id, email, first_name, last_name, phone, address, role, is_active, created_at, updated_at
       FROM users WHERE email = ? OR (? IS NOT NULL AND phone = ?)
       LIMIT 1`,
      [normalizedEmail, phone || null, phone || null]
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        data: {
          id: existing.rows[0].id,
          email: existing.rows[0].email,
          firstName: existing.rows[0].first_name,
          lastName: existing.rows[0].last_name,
          phone: existing.rows[0].phone,
          address: existing.rows[0].address,
          role: existing.rows[0].role,
          isActive: existing.rows[0].is_active === 1,
          createdAt: existing.rows[0].created_at,
          updatedAt: existing.rows[0].updated_at,
          existing: true,
        },
      });
    }

    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = await bcrypt.hash('password123', 10);
    await query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, address, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'customer', 1)`,
      [userId, normalizedEmail, passwordHash, firstName, lastName, phone || null, address || null]
    );

    res.json({
      success: true,
      data: {
        id: userId,
        email: normalizedEmail,
        firstName,
        lastName,
        phone: phone || null,
        address: address || null,
        role: 'customer',
        isActive: true,
        existing: false,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/customer-service/intake-context?userId=...&date=YYYY-MM-DD
router.get('/customer-service/intake-context', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.query.userId || '').trim();
    const date = String(req.query.date || '').trim();
    if (!userId || !date) {
      return res.status(400).json({ success: false, error: 'userId a date sú povinné' });
    }

    const menuResult = await query<any>(
      `SELECT dm.id, dm.date, dm.menu_slot, dm.deadline_timestamp, dm.is_locked,
              mi.id as menu_item_id, mi.name as menu_item_name, mi.price as menu_item_price
       FROM daily_menu dm
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dm.date = ?
       ORDER BY CASE dm.menu_slot WHEN 'Soup' THEN 1 WHEN 'MenuA' THEN 2 WHEN 'MenuB' THEN 3 ELSE 4 END, mi.name`,
      [date]
    );

    const existingPlans = await query<any>(
      `SELECT dpi.id as plan_id, dpi.quantity, dpi.delivery_address,
              dm.id as daily_menu_id, dm.menu_slot,
              mi.name as menu_item_name, mi.price as menu_item_price
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dpi.user_id = ? AND dm.date = ?
       ORDER BY dm.menu_slot, mi.name`,
      [userId, date]
    );

    const recentResult = await query<any>(
      `SELECT oh.date, oh.items_json, oh.total_price
       FROM order_history oh
       WHERE oh.user_id = ?
       ORDER BY oh.date DESC
       LIMIT 3`,
      [userId]
    );

    const futurePlansResult = await query<any>(
      `SELECT dm.date, dm.menu_slot, mi.name as menu_item_name, mi.price as menu_item_price, dpi.quantity
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dpi.user_id = ? AND dm.date >= ?
       ORDER BY dm.date, dm.menu_slot, mi.name`,
      [userId, date]
    );

    const groupedFuturePlans = futurePlansResult.rows.reduce((acc: any[], row: any) => {
      let day = acc.find((item) => item.date === row.date);
      if (!day) {
        day = { date: row.date, items: [], totalPrice: 0 };
        acc.push(day);
      }
      day.items.push({
        menuSlot: row.menu_slot,
        itemName: row.menu_item_name,
        quantity: row.quantity,
        price: row.menu_item_price,
      });
      day.totalPrice += (row.quantity || 0) * (row.menu_item_price || 0);
      return acc;
    }, []);

    res.json({
      success: true,
      data: {
        menu: menuResult.rows.map((row: any) => ({
          id: row.id,
          date: row.date,
          menuSlot: row.menu_slot,
          deadlineTimestamp: row.deadline_timestamp,
          isLocked: row.is_locked === 1,
          menuItem: {
            id: row.menu_item_id,
            name: row.menu_item_name,
            price: row.menu_item_price,
          },
        })),
        existingPlans: existingPlans.rows.map((row: any) => ({
          planId: row.plan_id,
          dailyMenuId: row.daily_menu_id,
          menuSlot: row.menu_slot,
          menuItemName: row.menu_item_name,
          menuItemPrice: row.menu_item_price,
          quantity: row.quantity,
          deliveryAddress: row.delivery_address,
        })),
        recentOrders: recentResult.rows.map((row: any) => ({
          date: row.date,
          items: JSON.parse(row.items_json || '[]'),
          totalPrice: row.total_price,
        })),
        futurePlans: groupedFuturePlans,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/customer-service/user/:userId - Detail zákazníka s objednávkami
router.get('/customer-service/user/:userId', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;

    // Základné info o zákazníkovi
    const userResult = await query<User>(
      `SELECT id, email, first_name, last_name, phone, address, role, is_senior, is_active, created_at, updated_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Zákazník nenájdený'
      });
    }

    const user = {
      ...userResult.rows[0],
      isSenior: (userResult.rows[0] as any).is_senior === 1,
      isActive: (userResult.rows[0] as any).is_active === 1,
    };

    // Aktuálne objednávky (budúce dni)
    const currentPlans = await query<any>(
      `SELECT
         dpi.id as plan_id,
         dpi.quantity,
         dpi.delivery_address,
         dpi.last_updated,
         dm.id as daily_menu_id,
         dm.date,
         dm.menu_slot,
         dm.deadline_timestamp,
         dm.is_locked,
         mi.id as menu_item_id,
         mi.name as menu_item_name,
         mi.price,
         CASE WHEN dm.deadline_timestamp > datetime('now') THEN 1 ELSE 0 END as is_editable
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dpi.user_id = ? AND dm.date >= date('now')
       ORDER BY dm.date, dm.menu_slot`,
      [userId]
    );

    // História objednávok (minulé dni)
    const historyResult = await query<any>(
      `SELECT
         oh.id,
         oh.date,
         oh.items_json,
         oh.total_price,
         oh.delivery_status,
         oh.payment_status,
         oh.created_at
       FROM order_history oh
       WHERE oh.user_id = ?
       ORDER BY oh.date DESC
       LIMIT 30`,
      [userId]
    );

    const response: ApiResponse<{
      user: typeof user;
      currentPlans: any[];
      history: any[];
    }> = {
      success: true,
      data: {
        user,
        currentPlans: currentPlans.rows.map(row => ({
          planId: row.plan_id,
          quantity: row.quantity,
          deliveryAddress: row.delivery_address,
          lastUpdated: row.last_updated,
          dailyMenuId: row.daily_menu_id,
          date: row.date,
          menuSlot: row.menu_slot,
          deadlineTimestamp: row.deadline_timestamp,
          isLocked: row.is_locked === 1,
          isEditable: row.is_editable === 1,
          menuItem: {
            id: row.menu_item_id,
            name: row.menu_item_name,
            price: row.price,
          }
        })),
        history: historyResult.rows.map(row => ({
          id: row.id,
          date: row.date,
          items: JSON.parse(row.items_json || '[]'),
          totalPrice: row.total_price,
          deliveryStatus: row.delivery_status,
          paymentStatus: row.payment_status,
          createdAt: row.created_at,
        })),
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/customer-service/user/:userId/reset-password - Reset hesla
router.put('/customer-service/user/:userId/reset-password', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId;
    const newPassword = req.body.password || 'password123';

    // Overiť či používateľ existuje
    const userCheck = await query('SELECT id FROM users WHERE id = ?', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Zákazník nenájdený'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await query(
      `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
      [passwordHash, userId]
    );

    const response: ApiResponse<{ message: string; temporaryPassword: string }> = {
      success: true,
      data: {
        message: 'Heslo bolo resetované',
        temporaryPassword: newPassword,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/customer-service/plan/:planId - Upraviť objednávku (množstvo)
router.put('/customer-service/plan/:planId', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actorUserId = req.user!.id;
    const planId = req.params.planId;
    const { quantity, deliveryAddress } = req.body;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'Zadajte platné množstvo (0 alebo viac)'
      });
    }

    // Overiť či objednávka existuje a či nie je po termíne
    const planCheck = await query<any>(
      `SELECT dpi.*, dm.deadline_timestamp, dm.is_locked
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       WHERE dpi.id = ?`,
      [planId]
    );

    if (planCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Objednávka nenájdená'
      });
    }

    const plan = planCheck.rows[0];
    const previousQuantity = plan.quantity;
    const previousAddress = plan.delivery_address;

    // Kontrola uzávierky
    if (plan.is_locked === 1) {
      return res.status(403).json({
        success: false,
        error: 'Deň je uzamknutý, objednávku nemožno upraviť'
      });
    }

    const deadline = new Date(plan.deadline_timestamp);
    if (deadline < new Date()) {
      // Check if order is manually locked
      const lockCheck = await query(
        'SELECT id FROM order_locks WHERE plan_item_id = ? AND unlocked_at IS NULL',
        [planId]
      );
      
      if (lockCheck.rows.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'Objednávka je uzamknutá po uzávierke, kontaktujte administrátora'
        });
      }
    }

    if (quantity === 0) {
      // Zmazať objednávku
      await query('DELETE FROM delivery_plan_items WHERE id = ?', [planId]);
      await logPlanAudit({
        planItemId: planId,
        userId: plan.user_id,
        actorUserId,
        actionType: 'admin_plan_deleted',
        fieldName: 'quantity',
        oldValue: previousQuantity,
        newValue: 0,
      });

      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Objednávka bola zrušená' },
      };
      res.json(response);
    } else {
      // Upraviť množstvo
      await query(
        `UPDATE delivery_plan_items
         SET quantity = ?, delivery_address = COALESCE(?, delivery_address), last_updated = datetime('now')
         WHERE id = ?`,
        [quantity, deliveryAddress ?? null, planId]
      );

      await logPlanAudit({
        planItemId: planId,
        userId: plan.user_id,
        actorUserId,
        actionType: 'admin_plan_updated',
        fieldName: 'quantity',
        oldValue: previousQuantity,
        newValue: quantity,
      });
      if (deliveryAddress !== undefined && deliveryAddress !== previousAddress) {
        await logPlanAudit({
          planItemId: planId,
          userId: plan.user_id,
          actorUserId,
          actionType: 'admin_delivery_address_updated',
          fieldName: 'delivery_address',
          oldValue: previousAddress,
          newValue: deliveryAddress,
        });
      }

      const response: ApiResponse<{ message: string; quantity: number; deliveryAddress?: string }> = {
        success: true,
        data: { message: 'Objednávka bola upravená', quantity, deliveryAddress },
      };
      res.json(response);
    }
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/customer-service/plan/:planId - Zrušiť objednávku
router.delete('/customer-service/plan/:planId', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = req.params.planId;

    // Overiť či objednávka existuje
    const planCheck = await query<any>(
      `SELECT dpi.*, dm.deadline_timestamp, dm.is_locked, dm.date
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       WHERE dpi.id = ?`,
      [planId]
    );

    if (planCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Objednávka nenájdená'
      });
    }

    const plan = planCheck.rows[0];

    // Kontrola uzávierky
    if (plan.is_locked === 1) {
      return res.status(403).json({
        success: false,
        error: 'Deň je uzamknutý, objednávku nemožno zrušiť'
      });
    }

    const deadline = new Date(plan.deadline_timestamp);
    if (deadline < new Date()) {
      // Check if order is manually locked
      const lockCheck = await query(
        'SELECT id FROM order_locks WHERE plan_item_id = ? AND unlocked_at IS NULL',
        [planId]
      );
      
      if (lockCheck.rows.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'Objednávka je uzamknutá po uzávierke, kontaktujte administrátora'
        });
      }
    }

    await query('DELETE FROM delivery_plan_items WHERE id = ?', [planId]);
    await logPlanAudit({
      planItemId: planId,
      userId: plan.user_id,
      actorUserId: req.user!.id,
      actionType: 'admin_plan_deleted',
      fieldName: 'quantity',
      oldValue: plan.quantity,
      newValue: 0,
      reason: 'Admin cancelled order',
    });

    const response: ApiResponse<{ message: string; cancelledDate: string }> = {
      success: true,
      data: { 
        message: 'Objednávka bola zrušená',
        cancelledDate: plan.date
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/customer-service/user/:userId/create-order - Vytvoriť objednávku za zákazníka
router.post('/customer-service/user/:userId/create-order', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actorUserId = req.user!.id;
    const userId = req.params.userId;
    const { dailyMenuId, quantity, deliveryAddress } = req.body;

    if (!dailyMenuId || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: 'Zadajte dailyMenuId a množstvo (min. 1)'
      });
    }

    // Overiť či daily menu existuje a nie je po termíne
    const dmCheck = await query<any>(
      `SELECT * FROM daily_menu WHERE id = ? AND deadline_timestamp > datetime('now') AND is_locked = 0`,
      [dailyMenuId]
    );

    if (dmCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Jedlo nie je dostupné alebo už uplynula uzávierka'
      });
    }

    // Skontrolovať či už existuje objednávka
    const existingCheck = await query(
      'SELECT id FROM delivery_plan_items WHERE user_id = ? AND daily_menu_id = ?',
      [userId, dailyMenuId]
    );

    const planId = existingCheck.rows.length > 0
      ? existingCheck.rows[0].id
      : `plan-${userId}-${dailyMenuId}`;

    if (existingCheck.rows.length > 0) {
      // Update existing
      await query(
        `UPDATE delivery_plan_items
         SET quantity = quantity + ?, delivery_address = COALESCE(?, delivery_address), last_updated = datetime('now')
         WHERE id = ?`,
        [quantity, deliveryAddress ?? null, planId]
      );
      await logPlanAudit({
        planItemId: planId,
        userId,
        actorUserId,
        actionType: 'admin_plan_quantity_incremented',
        fieldName: 'quantity',
        newValue: quantity,
      });
      if (deliveryAddress !== undefined) {
        await logPlanAudit({
          planItemId: planId,
          userId,
          actorUserId,
          actionType: 'admin_delivery_address_updated',
          fieldName: 'delivery_address',
          newValue: deliveryAddress,
        });
      }
    } else {
      // Insert new
      await query(
        `INSERT INTO delivery_plan_items (id, user_id, daily_menu_id, quantity, delivery_address, last_updated)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [planId, userId, dailyMenuId, quantity, deliveryAddress ?? null]
      );
      await logPlanAudit({
        planItemId: planId,
        userId,
        actorUserId,
        actionType: 'admin_plan_created',
        fieldName: 'quantity',
        newValue: quantity,
      });
      if (deliveryAddress !== undefined) {
        await logPlanAudit({
          planItemId: planId,
          userId,
          actorUserId,
          actionType: 'admin_delivery_address_updated',
          fieldName: 'delivery_address',
          newValue: deliveryAddress,
        });
      }
    }

    const response: ApiResponse<{ message: string; planId: string; quantity: number; deliveryAddress?: string }> = {
      success: true,
      data: {
        message: 'Objednávka bola vytvorená',
        planId,
        quantity,
        deliveryAddress,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/customer-service/today-orders - Dnešné objednávky (rýchly prehľad)
router.get('/customer-service/today-orders', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await query<any>(
      `SELECT
         u.id as user_id,
         u.first_name || ' ' || u.last_name as user_name,
         u.phone as user_phone,
         COALESCE(dpi.delivery_address, u.address) as user_address,
         mi.name as menu_item_name,
         dpi.quantity,
         dm.menu_slot,
         dm.deadline_timestamp,
         CASE WHEN dm.deadline_timestamp > datetime('now') THEN 1 ELSE 0 END as is_editable
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       JOIN users u ON dpi.user_id = u.id
       WHERE dm.date = ?
       ORDER BY u.last_name, u.first_name, dm.menu_slot`,
      [today]
    );

    const response: ApiResponse<typeof result.rows> = {
      success: true,
      data: result.rows.map(row => ({
        userId: row.user_id,
        userName: row.user_name,
        userPhone: row.user_phone,
        userAddress: row.user_address,
        menuItemName: row.menu_item_name,
        quantity: row.quantity,
        menuSlot: row.menu_slot,
        deadlineTimestamp: row.deadline_timestamp,
        isEditable: row.is_editable === 1,
      })),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
