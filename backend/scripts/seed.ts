import { getDatabase, closeDatabase } from '../src/database';
import bcrypt from 'bcryptjs';

/**
 * 填充种子数据
 */
async function seed() {
  const db = getDatabase();

  try {
    console.log('Seeding database...\n');

    // 检查是否已有管理员用户
    const existingAdmin = db.prepare('SELECT 1 FROM users WHERE username = ?').get('admin');

    if (!existingAdmin) {
      // 创建默认管理员用户
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      db.prepare(`
        INSERT INTO users (username, password_hash, email, role)
        VALUES (?, ?, ?, ?)
      `).run('admin', passwordHash, 'admin@privanest.local', 'admin');

      console.log('✅ Created default admin user:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   ⚠️  Please change the password after first login!\n');
    } else {
      console.log('⏭️  Admin user already exists, skipping...\n');
    }

    console.log('=================================');
    console.log('Seeding completed!');
    console.log('=================================\n');

  } catch (error) {
    console.error('Seeding failed:', (error as Error).message);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

seed().catch(console.error);
