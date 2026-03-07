import Database from 'better-sqlite3';

/**
 * 创建播放历史表
 */
export function up(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS playback_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      media_file_id INTEGER NOT NULL,
      progress REAL DEFAULT 0,
      duration REAL DEFAULT 0,
      is_completed BOOLEAN DEFAULT 0,
      last_watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (media_file_id) REFERENCES media_files(id) ON DELETE CASCADE,
      UNIQUE(user_id, media_file_id)
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_playback_user ON playback_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_playback_media ON playback_history(media_file_id);
    CREATE INDEX IF NOT EXISTS idx_playback_last_watched ON playback_history(last_watched_at);
  `);
}

/**
 * 回滚：删除播放历史表
 */
export function down(db: Database.Database) {
  db.exec('DROP TABLE IF EXISTS playback_history');
}
