import { closeDatabase } from '../src/database';
import { existsSync, rmSync } from 'fs';
import path from 'path';
import { config } from '../src/config';

/**
 * 重置数据库（删除数据库文件，下次启动时自动重建）
 */
async function resetDatabase() {
  const dbPath = path.resolve(config.dbPath);

  console.log('Preparing to reset database...');
  console.log(`Database path: ${dbPath}\n`);

  if (existsSync(dbPath)) {
    try {
      // 关闭数据库连接
      closeDatabase();

      // 删除主数据库文件
      rmSync(dbPath);
      console.log(`✅ Deleted: ${dbPath}`);

      // 删除 WAL 相关文件
      const walPath = dbPath + '-wal';
      const shmPath = dbPath + '-shm';

      if (existsSync(walPath)) {
        rmSync(walPath);
        console.log(`✅ Deleted: ${walPath}`);
      }

      if (existsSync(shmPath)) {
        rmSync(shmPath);
        console.log(`✅ Deleted: ${shmPath}`);
      }

      console.log('\n=================================');
      console.log('Database reset successfully!');
      console.log('Run "npm run db:migrate" to rebuild the database.');
      console.log('=================================\n');

    } catch (error) {
      console.error('Failed to reset database:', (error as Error).message);
      process.exit(1);
    }
  } else {
    console.log('Database file does not exist. Nothing to reset.');
  }
}

resetDatabase().catch(console.error);


