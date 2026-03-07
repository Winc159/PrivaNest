import Database from 'better-sqlite3';
import path from 'path';
import { config } from '../config';

let db: Database.Database | null = null;

/**
 * 获取数据库实例（单例模式）
 */
export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.resolve(config.dbPath);
    db = new Database(dbPath);
    // 启用 WAL 模式提升性能
    db.pragma('journal_mode = WAL');
    // 启用外键约束
    db.pragma('foreign_keys = ON');
  }
  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 初始化数据库（执行迁移检查）
 */
export async function initDatabase(): Promise<void> {
  const database = getDatabase();
  
  // 创建迁移记录表
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database initialized successfully');
}
