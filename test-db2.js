const fs = require('fs');

// Read the SQLite file directly (it's just a file)
const dbPath = '/tmp/galaxia3.db';

// Check if file exists
if (!fs.existsSync(dbPath)) {
  console.log('DB not found');
  process.exit(1);
}

const stats = fs.statSync(dbPath);
console.log('DB size:', stats.size, 'bytes');

// Read SQLite header
const header = fs.readFileSync(dbPath, { encoding: 'utf8', length: 16 });
console.log('SQLite header:', header);
