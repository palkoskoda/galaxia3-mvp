import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { ApiResponse } from '../types';

const router = Router();

// ============================================
// ROZVOZOVÉ TRASY (Delivery Routes)
// ============================================

// GET /api/delivery-routes/:date - Získať rozvozovú trasu pre dátum
router.get('/:date', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = req.params.date;

    // Get route with items
    const routeResult = await query<any>(
      `SELECT 
         dr.id as route_id,
         dr.date,
         dr.driver_name,
         dr.driver_phone,
         dr.vehicle_info,
         dr.notes,
         dr.status as route_status,
         dri.id as item_id,
         dri.plan_item_id,
         dri.user_id,
         dri.delivery_address,
         dri.delivery_sequence,
         dri.delivery_status,
         dri.driver_notes,
         dri.delivered_at,
         dri.delivered_by,
         u.first_name || ' ' || u.last_name as user_name,
         u.phone as user_phone,
         dpi.quantity,
         mi.name as menu_item_name
       FROM delivery_routes dr
       LEFT JOIN delivery_route_items dri ON dr.id = dri.route_id
       LEFT JOIN users u ON dri.user_id = u.id
       LEFT JOIN delivery_plan_items dpi ON dri.plan_item_id = dpi.id
       LEFT JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       LEFT JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dr.date = ?
       ORDER BY dri.delivery_sequence`,
      [date]
    );

    if (routeResult.rows.length === 0) {
      // Return empty route structure
      const response: ApiResponse<{
        route: any;
        items: any[];
      }> = {
        success: true,
        data: {
          route: null,
          items: [],
        },
      };
      res.json(response);
      return;
    }

    const route = {
      id: routeResult.rows[0].route_id,
      date: routeResult.rows[0].date,
      driverName: routeResult.rows[0].driver_name,
      driverPhone: routeResult.rows[0].driver_phone,
      vehicleInfo: routeResult.rows[0].vehicle_info,
      notes: routeResult.rows[0].notes,
      status: routeResult.rows[0].route_status,
    };

    const items = routeResult.rows
      .filter((row: any) => row.item_id !== null)
      .map((row: any) => ({
        id: row.item_id,
        planItemId: row.plan_item_id,
        userId: row.user_id,
        userName: row.user_name,
        userPhone: row.user_phone,
        deliveryAddress: row.delivery_address,
        deliverySequence: row.delivery_sequence,
        deliveryStatus: row.delivery_status,
        driverNotes: row.driver_notes,
        deliveredAt: row.delivered_at,
        deliveredBy: row.delivered_by,
        quantity: row.quantity,
        menuItemName: row.menu_item_name,
      }));

    const response: ApiResponse<{
      route: typeof route;
      items: typeof items;
    }> = {
      success: true,
      data: { route, items },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/delivery-routes - Vytvoriť rozvozovú trasu
router.post('/', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, driverName, driverPhone, vehicleInfo, notes } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Dátum je povinný',
      });
    }

    // Check if route already exists for this date
    const existingRoute = await query(
      'SELECT id FROM delivery_routes WHERE date = ?',
      [date]
    );

    if (existingRoute.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Rozvozová trasa pre tento dátum už existuje',
      });
    }

    const routeId = `route-${date}-${Date.now()}`;
    await query(
      `INSERT INTO delivery_routes (id, date, driver_name, driver_phone, vehicle_info, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [routeId, date, driverName || null, driverPhone || null, vehicleInfo || null, notes || null]
    );

    // Auto-populate route items from delivery plans for this date
    const planItems = await query<any>(
      `SELECT 
         dpi.id as plan_item_id,
         dpi.user_id,
         COALESCE(dpi.delivery_address, u.address) as delivery_address,
         dpi.quantity,
         mi.name as menu_item_name
       FROM delivery_plan_items dpi
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN users u ON dpi.user_id = u.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dm.date = ?`,
      [date]
    );

    for (let i = 0; i < planItems.rows.length; i++) {
      const item = planItems.rows[i];
      const itemId = `route-item-${routeId}-${i}`;
      await query(
        `INSERT INTO delivery_route_items (id, route_id, plan_item_id, user_id, delivery_address, delivery_sequence)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [itemId, routeId, item.plan_item_id, item.user_id, item.delivery_address, i + 1]
      );
    }

    const response: ApiResponse<{
      message: string;
      routeId: string;
      itemCount: number;
    }> = {
      success: true,
      data: {
        message: 'Rozvozová trasa bola vytvorená',
        routeId,
        itemCount: planItems.rows.length,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/delivery-routes/:routeId - Upraviť rozvozovú trasu
router.put('/:routeId', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const routeId = req.params.routeId;
    const { driverName, driverPhone, vehicleInfo, notes, status } = req.body;

    await query(
      `UPDATE delivery_routes 
       SET driver_name = COALESCE(?, driver_name),
           driver_phone = COALESCE(?, driver_phone),
           vehicle_info = COALESCE(?, vehicle_info),
           notes = COALESCE(?, notes),
           status = COALESCE(?, status),
           updated_at = datetime('now')
       WHERE id = ?`,
      [driverName, driverPhone, vehicleInfo, notes, status, routeId]
    );

    res.json({ success: true, data: { message: 'Trasa bola upravená' } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/delivery-routes/items/:itemId - Upraviť položku trasy
router.put('/items/:itemId', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = req.params.itemId;
    const { deliverySequence, deliveryStatus, driverNotes } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (deliverySequence !== undefined) {
      updates.push('delivery_sequence = ?');
      params.push(deliverySequence);
    }
    if (deliveryStatus !== undefined) {
      updates.push('delivery_status = ?');
      params.push(deliveryStatus);
    }
    if (driverNotes !== undefined) {
      updates.push('driver_notes = ?');
      params.push(driverNotes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Žiadne zmeny na uloženie',
      });
    }

    params.push(itemId);
    await query(
      `UPDATE delivery_route_items 
       SET ${updates.join(', ')}, updated_at = datetime('now')
       WHERE id = ?`,
      params
    );

    res.json({ success: true, data: { message: 'Položka trasy bola upravená' } });
  } catch (error) {
    next(error);
  }
});

// POST /api/delivery-routes/items/:itemId/deliver - Označiť ako doručené
router.post('/items/:itemId/deliver', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = req.params.itemId;
    const userId = req.user!.id;

    await query(
      `UPDATE delivery_route_items 
       SET delivery_status = 'delivered', 
           delivered_at = datetime('now'),
           delivered_by = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [userId, itemId]
    );

    res.json({ success: true, data: { message: 'Označené ako doručené' } });
  } catch (error) {
    next(error);
  }
});

// POST /api/delivery-routes/items/:itemId/fail - Označiť ako nedoručené
router.post('/items/:itemId/fail', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = req.params.itemId;
    const { reason } = req.body;

    await query(
      `UPDATE delivery_route_items 
       SET delivery_status = 'failed',
           driver_notes = COALESCE(?, driver_notes),
           updated_at = datetime('now')
       WHERE id = ?`,
      [reason, itemId]
    );

    res.json({ success: true, data: { message: 'Označené ako nedoručené' } });
  } catch (error) {
    next(error);
  }
});

// GET /api/delivery-routes/:date/export - Export trasy ako CSV
router.get('/:date/export', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = req.params.date;

    const items = await query<any>(
      `SELECT 
         dri.delivery_sequence,
         u.first_name || ' ' || u.last_name as user_name,
         u.phone as user_phone,
         dri.delivery_address,
         mi.name as menu_item_name,
         dpi.quantity,
         dri.delivery_status,
         dri.driver_notes
       FROM delivery_routes dr
       JOIN delivery_route_items dri ON dr.id = dri.route_id
       JOIN users u ON dri.user_id = u.id
       LEFT JOIN delivery_plan_items dpi ON dri.plan_item_id = dpi.id
       LEFT JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       LEFT JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dr.date = ?
       ORDER BY dri.delivery_sequence`,
      [date]
    );

    // Generate CSV
    const csvHeader = 'Poradie,Meno,Telefon,Adresa,Jedlo,Mnozstvo,Stav,Poznamky\n';
    const csvRows = items.rows.map((row: any) => [
      row.delivery_sequence,
      `"${row.user_name || ''}"`,
      row.user_phone || '',
      `"${row.delivery_address || ''}"`,
      `"${row.menu_item_name || ''}"`,
      row.quantity || '',
      row.delivery_status || '',
      `"${row.driver_notes || ''}"`,
    ].join(','));

    const csv = csvHeader + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rozvoz-${date}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

export default router;
