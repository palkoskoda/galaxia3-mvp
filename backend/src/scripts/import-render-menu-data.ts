import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { initDatabase, query } from '../db';

type RenderPayload = unknown;

const loadPayload = (): { sourceName: string; payload: RenderPayload } => {
  const jsonFromEnv = process.env.MENU_DATA_JSON;
  if (jsonFromEnv && jsonFromEnv.trim()) {
    return {
      sourceName: process.env.MENU_DATA_SOURCE || 'MENU_DATA_JSON',
      payload: JSON.parse(jsonFromEnv),
    };
  }

  // Try multiple fallback paths for different environments
  const possiblePaths = [
    process.env.MENU_DATA_PATH,
    path.join(process.cwd(), 'backend', 'menu-data.json'),      // Docker /app
    path.join(process.cwd(), 'menu-data.json'),                   // backend dir
    path.join(process.cwd(), '../database/menu-data.json'),       // monorepo root
  ].filter(Boolean) as string[];

  let filePath: string | null = null;
  for (const p of possiblePaths) {
    const resolved = path.resolve(p);
    if (fs.existsSync(resolved)) {
      filePath = resolved;
      break;
    }
  }

  if (!filePath) {
    throw new Error(
      `Missing render payload. Set MENU_DATA_JSON or MENU_DATA_PATH, or create one of:\n` +
      possiblePaths.map(p => `  - ${path.resolve(p)}`).join('\n')
    );
  }

  return {
    sourceName: path.basename(filePath),
    payload: JSON.parse(fs.readFileSync(filePath, 'utf8')),
  };
};

const main = async () => {
  await initDatabase();

  const { sourceName, payload } = loadPayload();
  const payloadJson = JSON.stringify(payload);
  const checksum = crypto.createHash('sha256').update(payloadJson).digest('hex');
  const id = `render-${Date.now()}`;

  const existingMarker = await query<{ import_key: string; checksum: string | null }>(
    'SELECT import_key, checksum FROM import_markers WHERE import_key = ?',
    ['menu-data-bootstrap']
  );

  if (existingMarker.rows.length > 0) {
    const row = existingMarker.rows[0];
    if (row.checksum === checksum) {
      console.log(`ℹ️  One-shot import already completed from ${sourceName}`);
      process.exit(0);
    }

    throw new Error(
      `One-shot import already exists with a different payload checksum. Remove the import_markers row if you intentionally need to re-run it.`
    );
  }

  await query(
    `INSERT INTO render_menu_data (id, source_name, payload_json)
     VALUES (?, ?, ?)`,
    [id, sourceName, payloadJson]
  );
  await query(
    `INSERT INTO import_markers (import_key, source_name, checksum)
     VALUES (?, ?, ?)`,
    ['menu-data-bootstrap', sourceName, checksum]
  );

  console.log(`✅ One-shot import completed from ${sourceName}`);
};

main().catch((error) => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
