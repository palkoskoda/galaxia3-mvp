import { query, initDatabase } from '../db';
import bcrypt from 'bcryptjs';

const fixPasswords = async () => {
  await initDatabase();

  console.log('🔧 Fixing passwords...');

  const passwordHash = await bcrypt.hash('password123', 10);
  console.log('New hash:', passwordHash);

  // Update all users with new password hash
  await query(
    'UPDATE users SET password_hash = ?',
    [passwordHash]
  );

  console.log('✅ All passwords updated to: password123');
  
  // Verify
  const users = await query('SELECT email, password_hash FROM users');
  console.log('\nUsers:');
  for (const user of users.rows) {
    const isValid = await bcrypt.compare('password123', user.password_hash);
    console.log(`  ${user.email}: ${isValid ? '✅ OK' : '❌ FAIL'}`);
  }

  process.exit(0);
};

fixPasswords().catch(console.error);
