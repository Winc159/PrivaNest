import Database from 'better-sqlite3';

/**
 * 创建媒体文件表
 */
export function up(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS media_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT UNIQUE NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      library_path TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      parent_path TEXT,
      cover_url TEXT,
      metadata TEXT,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_media_file_path ON media_files(file_path);
    CREATE INDEX IF NOT EXISTS idx_media_library ON media_files(library_path);
    CREATE INDEX IF NOT EXISTS idx_media_parent ON media_files(parent_path);
    CREATE INDEX IF NOT EXISTS idx_media_type ON media_files(file_type);
  `);
}

/**
 * 回滚：删除媒体文件表
 */
export function down(db: Database.Database) {
  db.exec('DROP TABLE IF EXISTS media_files');
}
