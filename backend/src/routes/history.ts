import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { NotFoundError } from '../utils/errors';
import { ApiResponse, OrderHistory } from '../types';

const router = Router();

// ============================================
// HISTÓRIA DODÁVOK (Order History)
// ============================================

// GET /api/history - Moja história dodávok
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await query<OrderHistory>(
      `SELECT 
         id,
         user_id,
         date,
         items_json as items,
         total_price,
         delivery_status,
         payment_status,
         notes,
         created_at,
         updated_at
       FROM order_history
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const response: ApiResponse<OrderHistory[]> = {
      success: true,
      data: result.rows,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/history/:id - Detail konkrétnej dodávky
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const historyId = req.params.id;

    const result = await query<OrderHistory>(
      `SELECT 
         id,
         user_id,
         date,
         items_json as items,
         total_price,
         delivery_status,
         payment_status,
         notes,
         created_at,
         updated_at
       FROM order_history
       WHERE id = $1 AND user_id = $2`,
      [historyId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Order history entry');
    }

    const response: ApiResponse<OrderHistory> = {
      success: true,
      data: result.rows[0],
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/history/admin/all - Všetky dodávky (admin)
router.get('/admin/all', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (from) {
      whereClause += ` AND date >= $${paramIndex++}`;
      params.push(from);
    }

    if (to) {
      whereClause += ` AND date <= $${paramIndex++}`;
      params.push(to);
    }

    if (status) {
      whereClause += ` AND delivery_status = $${paramIndex++}`;
      params.push(status);
    }

    params.push(limit);
    params.push(offset);

    const result = await query<OrderHistory & { user_name: string; user_email: string }>(
      `SELECT 
         oh.id,
         oh.user_id,
         oh.date,
         oh.items_json as items,
         oh.total_price,
         oh.delivery_status,
         oh.payment_status,
         oh.notes,
         oh.created_at,
         oh.updated_at,
         u.first_name || ' ' || u.last_name as user_name,
         u.email as user_email
       FROM order_history oh
       JOIN users u ON oh.user_id = u.id
       ${whereClause}
       ORDER BY oh.date DESC, u.last_name
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const response: ApiResponse<typeof result.rows> = {
      success: true,
      data: result.rows,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/history/:id/status - Zmeniť stav dodávky (admin)
router.put('/:id/status', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const historyId = req.params.id;
    const { deliveryStatus, paymentStatus, notes } = req.body;

    const result = await query<OrderHistory>(
      `UPDATE order_history 
       SET delivery_status = COALESCE($1, delivery_status),
           payment_status = COALESCE($2, payment_status),
           notes = COALESCE($3, notes)
       WHERE id = $4
       RETURNING *`,
      [deliveryStatus, paymentStatus, notes, historyId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Order history entry');
    }

    const response: ApiResponse<OrderHistory> = {
      success: true,
      data: result.rows[0],
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
