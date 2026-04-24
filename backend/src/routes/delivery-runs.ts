import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { ApiResponse } from '../types';

const router = Router();

const upsertRunTemplate = async (input: {
  name: string;
  driverName?: string | null;
  driverPhone?: string | null;
  vehicleInfo?: string | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  validFrom?: string | null;
}) => {
  const existing = await query<any>('SELECT id, sort_order FROM delivery_run_templates WHERE name = ?', [input.name]);
  if (existing.rows.length > 0) {
    const templateId = existing.rows[0].id;
    await query(
      `UPDATE delivery_run_templates
       SET driver_name = COALESCE(?, driver_name),
           driver_phone = COALESCE(?, driver_phone),
           vehicle_info = COALESCE(?, vehicle_info),
           time_from = COALESCE(?, time_from),
           time_to = COALESCE(?, time_to),
           is_active = 1,
           valid_to = NULL,
           updated_at = datetime('now')
       WHERE id = ?`,
      [input.driverName || null, input.driverPhone || null, input.vehicleInfo || null, input.timeFrom || null, input.timeTo || null, templateId]
    );
    return templateId;
  }

  const sortResult = await query<any>('SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM delivery_run_templates');
  const templateId = `drt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await query(
    `INSERT INTO delivery_run_templates (id, name, driver_name, driver_phone, vehicle_info, time_from, time_to, sort_order, valid_from, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [templateId, input.name, input.driverName || null, input.driverPhone || null, input.vehicleInfo || null, input.timeFrom || null, input.timeTo || null, (sortResult.rows[0]?.max_sort || 0) + 1, input.validFrom || null]
  );
  return templateId;
};

// ============================================
// ROZVOZOVÉ JAZDY (Delivery Runs) - Trello štýl
// ============================================

// GET /api/delivery-runs/templates - zoznam šablón
router.get('/templates/list', authenticate, authorize('admin', 'staff'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query<any>(
      `SELECT * FROM delivery_run_templates
       WHERE is_active = 1 AND (valid_to IS NULL OR valid_to >= date('now'))
       ORDER BY sort_order, time_from, name`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/delivery-runs/:date/bootstrap - skopírovať jazdy z posledného použitého dňa alebo zo šablón
router.post('/:date/bootstrap', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = req.params.date;
    const existingRuns = await query<any>('SELECT id FROM delivery_runs WHERE date = ?', [date]);
    if (existingRuns.rows.length > 0) {
      return res.json({ success: true, data: { createdCount: 0, source: 'existing' } });
    }

    const previousDateResult = await query<any>(
      `SELECT date FROM delivery_runs WHERE date < ? GROUP BY date ORDER BY date DESC LIMIT 1`,
      [date]
    );

    let createdCount = 0;
    let source: 'last-used-day' | 'templates' | 'none' = 'none';

    if (previousDateResult.rows.length > 0) {
      const previousDate = previousDateResult.rows[0].date;
      const previousRuns = await query<any>(
        `SELECT * FROM delivery_runs WHERE date = ? ORDER BY time_from, name, created_at`,
        [previousDate]
      );

      for (const run of previousRuns.rows) {
        const templateId = await upsertRunTemplate({
          name: run.name,
          driverName: run.driver_name,
          driverPhone: run.driver_phone,
          vehicleInfo: run.vehicle_info,
          timeFrom: run.time_from,
          timeTo: run.time_to,
          validFrom: previousDate,
        });
        const runId = `run-${date}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await query(
          `INSERT INTO delivery_runs (id, date, template_id, name, driver_name, driver_phone, vehicle_info, time_from, time_to, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [runId, date, templateId, run.name, run.driver_name, run.driver_phone, run.vehicle_info, run.time_from, run.time_to, run.notes || null]
        );
        createdCount++;
      }
      source = 'last-used-day';
    } else {
      const templates = await query<any>(
        `SELECT * FROM delivery_run_templates
         WHERE is_active = 1
           AND (valid_from IS NULL OR valid_from <= ?)
           AND (valid_to IS NULL OR valid_to >= ?)
         ORDER BY sort_order, time_from, name`,
        [date, date]
      );

      for (const template of templates.rows) {
        const runId = `run-${date}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await query(
          `INSERT INTO delivery_runs (id, date, template_id, name, driver_name, driver_phone, vehicle_info, time_from, time_to)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [runId, date, template.id, template.name, template.driver_name, template.driver_phone, template.vehicle_info, template.time_from, template.time_to]
        );
        createdCount++;
      }
      source = templates.rows.length > 0 ? 'templates' : 'none';
    }

    res.json({ success: true, data: { createdCount, source } });
  } catch (error) {
    next(error);
  }
});

// GET /api/delivery-runs/:date - Získať všetky jazdy pre dátum
router.get('/:date', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = req.params.date;

    // Get all runs for date
    const runsResult = await query<any>(
      `SELECT * FROM delivery_runs WHERE date = ? ORDER BY time_from, name`,
      [date]
    );

    const runs = [];
    for (const run of runsResult.rows) {
      // Get items for this run
      const itemsResult = await query<any>(
        `SELECT 
           dri.id,
           dri.plan_item_id,
           dri.user_id,
           dri.delivery_address,
           dri.delivery_sequence,
           dri.delivery_status,
           dri.driver_notes,
           dri.delivered_at,
           u.first_name || ' ' || u.last_name as user_name,
           u.phone as user_phone,
           dpi.quantity,
           mi.name as menu_item_name,
           mi.price as menu_item_price
         FROM delivery_run_items dri
         JOIN users u ON dri.user_id = u.id
         LEFT JOIN delivery_plan_items dpi ON dri.plan_item_id = dpi.id
         LEFT JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
         LEFT JOIN menu_items mi ON dm.menu_item_id = mi.id
         WHERE dri.run_id = ?
         ORDER BY dri.delivery_sequence`,
        [run.id]
      );

      // Calculate totals
      const totalMeals = itemsResult.rows.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      const totalPrice = itemsResult.rows.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.menu_item_price || 0)), 0);

      runs.push({
        ...run,
        items: itemsResult.rows.map((item: any) => ({
          id: item.id,
          planItemId: item.plan_item_id,
          userId: item.user_id,
          userName: item.user_name,
          userPhone: item.user_phone,
          deliveryAddress: item.delivery_address,
          deliverySequence: item.delivery_sequence,
          deliveryStatus: item.delivery_status,
          driverNotes: item.driver_notes,
          deliveredAt: item.delivered_at,
          quantity: item.quantity,
          menuItemName: item.menu_item_name,
          menuItemPrice: item.menu_item_price,
        })),
        totalMeals,
        totalPrice,
      });
    }

    // Get unassigned items (items not in any run)
    const unassignedResult = await query<any>(
      `SELECT 
         dpi.id as plan_item_id,
         dpi.user_id,
         COALESCE(dpi.delivery_address, u.address) as delivery_address,
         dpi.quantity,
         u.first_name || ' ' || u.last_name as user_name,
         u.phone as user_phone,
         mi.name as menu_item_name,
         mi.price as menu_item_price
       FROM delivery_plan_items dpi
       JOIN users u ON dpi.user_id = u.id
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dm.date = ?
         AND dpi.id NOT IN (
           SELECT plan_item_id FROM delivery_run_items 
           WHERE plan_item_id IS NOT NULL
         )
       ORDER BY COALESCE(dpi.delivery_address, u.address)`,
      [date]
    );

    const unassignedTotalMeals = unassignedResult.rows.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const unassignedTotalPrice = unassignedResult.rows.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.menu_item_price || 0)), 0);

    const response: ApiResponse<{
      runs: typeof runs;
      unassigned: {
        items: any[];
        totalMeals: number;
        totalPrice: number;
      };
    }> = {
      success: true,
      data: {
        runs,
        unassigned: {
          items: unassignedResult.rows.map((item: any) => ({
            planItemId: item.plan_item_id,
            userId: item.user_id,
            userName: item.user_name,
            userPhone: item.user_phone,
            deliveryAddress: item.delivery_address,
            quantity: item.quantity,
            menuItemName: item.menu_item_name,
            menuItemPrice: item.menu_item_price,
          })),
          totalMeals: unassignedTotalMeals,
          totalPrice: unassignedTotalPrice,
        },
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/delivery-runs - Vytvoriť novú jazdu
router.post('/', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, name, driverName, driverPhone, vehicleInfo, timeFrom, timeTo, notes } = req.body;

    if (!date || !name) {
      return res.status(400).json({
        success: false,
        error: 'Dátum a názov sú povinné',
      });
    }

    const templateId = await upsertRunTemplate({
      name,
      driverName: driverName || null,
      driverPhone: driverPhone || null,
      vehicleInfo: vehicleInfo || null,
      timeFrom: timeFrom || null,
      timeTo: timeTo || null,
      validFrom: date,
    });

    const runId = `run-${date}-${Date.now()}`;
    await query(
      `INSERT INTO delivery_runs (id, date, template_id, name, driver_name, driver_phone, vehicle_info, time_from, time_to, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [runId, date, templateId, name, driverName || null, driverPhone || null, vehicleInfo || null, timeFrom || null, timeTo || null, notes || null]
    );

    res.json({
      success: true,
      data: {
        message: 'Jazda bola vytvorená',
        runId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/delivery-runs/:date/auto-assign - Auto-priradenie objednávok
router.post('/:date/auto-assign', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = req.params.date;

    // Get all unassigned items for this date
    const unassignedResult = await query<any>(
      `SELECT 
         dpi.id as plan_item_id,
         dpi.user_id,
         COALESCE(dpi.delivery_address, u.address) as delivery_address,
         dpi.quantity
       FROM delivery_plan_items dpi
       JOIN users u ON dpi.user_id = u.id
       JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       WHERE dm.date = ?
         AND dpi.id NOT IN (
           SELECT plan_item_id FROM delivery_run_items 
           WHERE plan_item_id IS NOT NULL
         )`,
      [date]
    );

    let assignedCount = 0;
    let unassignedCount = 0;

    for (const item of unassignedResult.rows) {
      // Check if this address has a previous assignment
      const assignmentResult = await query<any>(
        `SELECT ara.run_id, dr.name as run_name
         FROM address_run_assignments ara
         JOIN delivery_runs dr ON ara.run_id = dr.id
         WHERE ara.address = ?
         ORDER BY ara.last_assigned_at DESC
         LIMIT 1`,
        [item.delivery_address]
      );

      if (assignmentResult.rows.length > 0) {
        const previousRunName = assignmentResult.rows[0].run_name;

        // Find today's run with the same name/slot
        const runCheck = await query<any>(
          'SELECT id FROM delivery_runs WHERE date = ? AND name = ? ORDER BY created_at ASC LIMIT 1',
          [date, previousRunName]
        );

        if (runCheck.rows.length > 0) {
          const runId = runCheck.rows[0].id;

          // Get next sequence number
          const seqResult = await query(
            'SELECT MAX(delivery_sequence) as max_seq FROM delivery_run_items WHERE run_id = ?',
            [runId]
          );
          const nextSeq = (seqResult.rows[0]?.max_seq || 0) + 1;

          const itemId = `dri-${runId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          await query(
            `INSERT INTO delivery_run_items (id, run_id, plan_item_id, user_id, delivery_address, delivery_sequence)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [itemId, runId, item.plan_item_id, item.user_id, item.delivery_address, nextSeq]
          );

          // Update assignment history to today's actual run id
          await query(
            `INSERT INTO address_run_assignments (id, address, run_id, assignment_count, last_assigned_at)
             VALUES (?, ?, ?, 1, datetime('now'))
             ON CONFLICT(address) DO UPDATE SET
               run_id = excluded.run_id,
               assignment_count = assignment_count + 1,
               last_assigned_at = datetime('now')`,
            [`ara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, item.delivery_address, runId]
          );

          assignedCount++;
          continue;
        }
      }

      unassignedCount++;
    }

    res.json({
      success: true,
      data: {
        message: 'Auto-priradenie dokončené',
        assignedCount,
        unassignedCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/delivery-runs/:runId - Upraviť jazdu
router.put('/:runId', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.runId;
    const { name, driverName, driverPhone, vehicleInfo, timeFrom, timeTo, notes, status } = req.body;

    await query(
      `UPDATE delivery_runs 
       SET name = COALESCE(?, name),
           driver_name = COALESCE(?, driver_name),
           driver_phone = COALESCE(?, driver_phone),
           vehicle_info = COALESCE(?, vehicle_info),
           time_from = COALESCE(?, time_from),
           time_to = COALESCE(?, time_to),
           notes = COALESCE(?, notes),
           status = COALESCE(?, status),
           updated_at = datetime('now')
       WHERE id = ?`,
      [name, driverName, driverPhone, vehicleInfo, timeFrom, timeTo, notes, status, runId]
    );

    res.json({ success: true, data: { message: 'Jazda bola upravená' } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/delivery-runs/:runId - Zmazať jazdu
router.delete('/:runId', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.runId;

    // Items will be automatically unassigned due to CASCADE
    await query('DELETE FROM delivery_runs WHERE id = ?', [runId]);

    res.json({ success: true, data: { message: 'Jazda bola zmazaná' } });
  } catch (error) {
    next(error);
  }
});

// POST /api/delivery-runs/items/move - Presunúť položky medzi jazdami alebo z/do nepriradených
router.post('/items/move', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemIds, targetRunId } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'itemIds (pole) je povinné',
      });
    }

    let nextSeq = 1;
    if (targetRunId) {
      const seqResult = await query(
        'SELECT MAX(delivery_sequence) as max_seq FROM delivery_run_items WHERE run_id = ?',
        [targetRunId]
      );
      nextSeq = (seqResult.rows[0]?.max_seq || 0) + 1;
    }

    let movedCount = 0;

    for (const itemId of itemIds) {
      // 1) Try existing assigned item by delivery_run_items.id
      const existingRunItemResult = await query<any>(
        'SELECT * FROM delivery_run_items WHERE id = ?',
        [itemId]
      );

      if (existingRunItemResult.rows.length > 0) {
        const item = existingRunItemResult.rows[0];

        if (targetRunId) {
          await query(
            `UPDATE delivery_run_items 
             SET run_id = ?, delivery_sequence = ?, updated_at = datetime('now')
             WHERE id = ?`,
            [targetRunId, nextSeq, itemId]
          );

          if (item.delivery_address) {
            await query(
              `INSERT INTO address_run_assignments (id, address, run_id, assignment_count, last_assigned_at)
               VALUES (?, ?, ?, 1, datetime('now'))
               ON CONFLICT(address) DO UPDATE SET
                 run_id = excluded.run_id,
                 assignment_count = assignment_count + 1,
                 last_assigned_at = datetime('now')`,
              [`ara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, item.delivery_address, targetRunId]
            );
          }

          nextSeq++;
        } else {
          // move back to unassigned
          await query('DELETE FROM delivery_run_items WHERE id = ?', [itemId]);
        }

        movedCount++;
        continue;
      }

      // 2) Try unassigned item by plan_item_id
      const unassignedItemResult = await query<any>(
        `SELECT 
           dpi.id as plan_item_id,
           dpi.user_id,
           COALESCE(dpi.delivery_address, u.address) as delivery_address
         FROM delivery_plan_items dpi
         JOIN users u ON dpi.user_id = u.id
         WHERE dpi.id = ?`,
        [itemId]
      );

      if (unassignedItemResult.rows.length === 0) continue;
      if (!targetRunId) continue; // already unassigned

      const item = unassignedItemResult.rows[0];
      const newRunItemId = `dri-${targetRunId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      await query(
        `INSERT INTO delivery_run_items (id, run_id, plan_item_id, user_id, delivery_address, delivery_sequence)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newRunItemId, targetRunId, item.plan_item_id, item.user_id, item.delivery_address, nextSeq]
      );

      if (item.delivery_address) {
        await query(
          `INSERT INTO address_run_assignments (id, address, run_id, assignment_count, last_assigned_at)
           VALUES (?, ?, ?, 1, datetime('now'))
           ON CONFLICT(address) DO UPDATE SET
             run_id = excluded.run_id,
             assignment_count = assignment_count + 1,
             last_assigned_at = datetime('now')`,
          [`ara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, item.delivery_address, targetRunId]
        );
      }

      nextSeq++;
      movedCount++;
    }

    res.json({
      success: true,
      data: {
        message: `${movedCount} položiek presunutých`,
        movedCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/delivery-runs/items/reorder - Zmeniť poradie v rámci jazdy
router.post('/items/reorder', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'itemIds (pole) je povinné',
      });
    }

    for (let i = 0; i < itemIds.length; i++) {
      await query(
        'UPDATE delivery_run_items SET delivery_sequence = ?, updated_at = datetime("now") WHERE id = ?',
        [i + 1, itemIds[i]]
      );
    }

    res.json({
      success: true,
      data: {
        message: 'Poradie bolo aktualizované',
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/delivery-runs/items/:itemId/deliver - Označiť ako doručené
router.post('/items/:itemId/deliver', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = req.params.itemId;
    const userId = req.user!.id;

    await query(
      `UPDATE delivery_run_items 
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

// POST /api/delivery-runs/items/:itemId/fail - Označiť ako nedoručené
router.post('/items/:itemId/fail', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = req.params.itemId;
    const { reason } = req.body;

    await query(
      `UPDATE delivery_run_items 
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

// GET /api/delivery-runs/:date/export - Export všetkých jázd ako CSV
router.get('/:date/export', authenticate, authorize('admin', 'staff'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = req.params.date;

    const items = await query<any>(
      `SELECT 
         dr.name as run_name,
         dr.driver_name,
         dri.delivery_sequence,
         u.first_name || ' ' || u.last_name as user_name,
         u.phone as user_phone,
         dri.delivery_address,
         mi.name as menu_item_name,
         dpi.quantity,
         dri.delivery_status,
         dri.driver_notes
       FROM delivery_runs dr
       JOIN delivery_run_items dri ON dr.id = dri.run_id
       JOIN users u ON dri.user_id = u.id
       LEFT JOIN delivery_plan_items dpi ON dri.plan_item_id = dpi.id
       LEFT JOIN daily_menu dm ON dpi.daily_menu_id = dm.id
       LEFT JOIN menu_items mi ON dm.menu_item_id = mi.id
       WHERE dr.date = ?
       ORDER BY dr.name, dri.delivery_sequence`,
      [date]
    );

    // Generate CSV
    const csvHeader = 'Jazda,Vodič,Poradie,Meno,Telefon,Adresa,Jedlo,Mnozstvo,Stav,Poznamky\n';
    const csvRows = items.rows.map((row: any) => [
      `"${row.run_name || ''}"`,
      `"${row.driver_name || ''}"`,
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
