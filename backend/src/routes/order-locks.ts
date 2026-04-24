import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { ApiResponse } from '../types';

const router = Router();

// ============================================
// UZAMKNUTIE OBJEDNÁVOK (Order Locks)
// ============================================

// GET /api/order-locks/:planItemId - Skontrolovať či je objednávka uzamknutá
router.get('/:planItemId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planItemId = req.params.planItemId;

    const lockResult = await query<any>(
      `SELECT 
         ol.id,
         ol.locked_at,
         ol.lock_reason,
         ol.lock_type,
         ol.unlocked_at,
         u.first_name || ' ' || u.last_name as locked_by_name
       FROM order_locks ol
       LEFT JOIN users u ON ol.locked_by = u.id
       WHERE ol.plan_item_id = ? AND ol.unlocked_at IS NULL
       ORDER BY ol.locked_at DESC
       LIMIT 1`,
      [planItemId]
    );

    const isLocked = lockResult.rows.length > 0;

    const response: ApiResponse<{
      isLocked: boolean;
      lock: any;
    }> = {
      success: true,
      data: {
        isLocked,
        lock: isLocked ? lockResult.rows[0] : null,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/order-locks - Uzamknúť objednávku
router.post('/', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { planItemId, lockReason, lockType } = req.body;

    if (!planItemId || !lockReason) {
      return res.status(400).json({
        success: false,
        error: 'planItemId a lockReason sú povinné',
      });
    }

    // Check if already locked
    const existingLock = await query(
      'SELECT id FROM order_locks WHERE plan_item_id = ? AND unlocked_at IS NULL',
      [planItemId]
    );

    if (existingLock.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Objednávka je už uzamknutá',
      });
    }

    // Get plan item details for user_id
    const planItem = await query<any>(
      'SELECT user_id FROM delivery_plan_items WHERE id = ?',
      [planItemId]
    );

    if (planItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Objednávka nenájdená',
      });
    }

    const lockId = `lock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await query(
      `INSERT INTO order_locks (id, plan_item_id, user_id, locked_by, lock_reason, lock_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [lockId, planItemId, planItem.rows[0].user_id, userId, lockReason, lockType || 'manual']
    );

    res.json({
      success: true,
      data: {
        message: 'Objednávka bola uzamknutá',
        lockId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/order-locks/:lockId/unlock - Odomknúť objednávku
router.post('/:lockId/unlock', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const lockId = req.params.lockId;
    const { unlockReason } = req.body;

    await query(
      `UPDATE order_locks 
       SET unlocked_at = datetime('now'),
           unlocked_by = ?,
           unlock_reason = ?
       WHERE id = ? AND unlocked_at IS NULL`,
      [userId, unlockReason || 'Odomknuté administrátorom', lockId]
    );

    res.json({
      success: true,
      data: { message: 'Objednávka bola odomknutá' },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/order-locks - Zoznam všetkých uzamknutí (pre admin)
router.get('/', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, planItemId, active } = req.query;

    let sql = `
      SELECT 
        ol.id,
        ol.plan_item_id,
        ol.user_id,
        ol.locked_at,
        ol.lock_reason,
        ol.lock_type,
        ol.unlocked_at,
        ol.unlock_reason,
        u1.first_name || ' ' || u1.last_name as user_name,
        u2.first_name || ' ' || u2.last_name as locked_by_name,
        u3.first_name || ' ' || u3.last_name as unlocked_by_name
      FROM order_locks ol
      LEFT JOIN users u1 ON ol.user_id = u1.id
      LEFT JOIN users u2 ON ol.locked_by = u2.id
      LEFT JOIN users u3 ON ol.unlocked_by = u3.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      sql += ' AND ol.user_id = ?';
      params.push(userId);
    }

    if (planItemId) {
      sql += ' AND ol.plan_item_id = ?';
      params.push(planItemId);
    }

    if (active === 'true') {
      sql += ' AND ol.unlocked_at IS NULL';
    }

    sql += ' ORDER BY ol.locked_at DESC LIMIT 100';

    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
