const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function test() {
  const db = await open({
    filename: '/tmp/galaxia3.db',
    driver: sqlite3.Database
  });

  const dates = await db.all('SELECT date FROM daily_menu ORDER BY date LIMIT 5');
  console.log('First 5 dates:', dates.map(d => d.date));

  const count = await db.get('SELECT COUNT(*) as count FROM daily_menu');
  console.log('Total daily_menu:', count.count);

  const items = await db.get('SELECT COUNT(*) as count FROM menu_items');
  console.log('Total menu_items:', items.count);

  await db.close();
}

test().catch(console.error);
