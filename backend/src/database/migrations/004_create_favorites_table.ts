import Database from 'better-sqlite3';

/**
 * 创建收藏表
 */
export function up(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      media_file_id INTEGER NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (media_file_id) REFERENCES media_files(id) ON DELETE CASCADE,
      UNIQUE(user_id, media_file_id)
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_media ON favorites(media_file_id);
  `);
}

/**
 * 回滚：删除收藏表
 */
export function down(db: Database.Database) {
  db.exec('DROP TABLE IF EXISTS favorites');
}
