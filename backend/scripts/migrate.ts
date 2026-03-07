import { getDatabase, closeDatabase, initDatabase } from '../src/database';
import { readdirSync } from 'fs';
import path from 'path';

/**
 * 执行数据库迁移
 */
async function runMigrations() {
  const db = getDatabase();

  try {
    console.log('Starting database migration...\n');

    // 初始化数据库，创建 _migrations 表
    await initDatabase();

    // 读取所有迁移文件并排序
    const migrationDir = path.join(process.cwd(), 'src/database/migrations');
    const files = readdirSync(migrationDir)
      .filter(file => file.endsWith('.ts'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    let executedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const migrationName = file.replace('.ts', '');

      // 检查是否已执行
      const exists = db.prepare('SELECT 1 FROM _migrations WHERE name = ?').get(migrationName);
      if (exists) {
        console.log(`⏭️  Skipped: ${migrationName}`);
        skippedCount++;
        continue;
      }

      console.log(`🔄 Running: ${migrationName}...`);

      try {
        // 动态导入迁移文件
        const migration = await import(path.join(migrationDir, file));
        
        // 执行 up 方法
        migration.up(db);

        // 记录已执行
        db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migrationName);
        
        console.log(`✅ Completed: ${migrationName}\n`);
        executedCount++;
      } catch (error) {
        console.error(`❌ Failed: ${migrationName}`);
        console.error(`Error: ${(error as Error).message}\n`);
        throw error;
      }
    }

    console.log('\n=================================');
    console.log(`Migration completed!`);
    console.log(`Executed: ${executedCount}, Skipped: ${skippedCount}`);
    console.log('=================================\n');

  } catch (error) {
    console.error('Migration failed:', (error as Error).message);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

// 执行迁移
runMigrations().catch(console.error);
