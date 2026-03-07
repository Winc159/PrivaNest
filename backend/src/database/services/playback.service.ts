import { getDatabase } from '../index';
import type { Database } from 'better-sqlite3';

export interface PlaybackHistory {
  id: number;
  user_id: number;
  media_file_id: number;
  progress: number;
  duration: number;
  is_completed: boolean;
  last_watched_at: string;
  created_at: string;
}

export interface CreatePlaybackDTO {
  user_id: number;
  media_file_id: number;
  progress?: number;
  duration?: number;
  is_completed?: boolean;
}

export class PlaybackService {
  private db: Database;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 获取用户的播放历史
   */
  findByUserId(userId: number, limit = 20): PlaybackHistory[] {
    const stmt = this.db.prepare(`
      SELECT ph.*, mf.file_name, mf.file_path, mf.cover_url
      FROM playback_history ph
      JOIN media_files mf ON ph.media_file_id = mf.id
      WHERE ph.user_id = ?
      ORDER BY ph.last_watched_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit) as PlaybackHistory[];
  }

  /**
   * 获取单个播放记录
   */
  findById(id: number): PlaybackHistory | undefined {
    const stmt = this.db.prepare('SELECT * FROM playback_history WHERE id = ?');
    return stmt.get(id) as PlaybackHistory | undefined;
  }

  /**
   * 获取用户观看某个文件的进度
   */
  findByUserAndMedia(userId: number, mediaFileId: number): PlaybackHistory | undefined {
    const stmt = this.db.prepare(
      'SELECT * FROM playback_history WHERE user_id = ? AND media_file_id = ?'
    );
    return stmt.get(userId, mediaFileId) as PlaybackHistory | undefined;
  }

  /**
   * 创建或更新播放记录
   */
  upsert(data: CreatePlaybackDTO): PlaybackHistory {
    const existing = this.findByUserAndMedia(data.user_id, data.media_file_id);

    if (existing) {
      return this.update(existing.id, data)!;
    } else {
      return this.create(data);
    }
  }

  /**
   * 创建播放记录
   */
  create(data: CreatePlaybackDTO): PlaybackHistory {
    const stmt = this.db.prepare(`
      INSERT INTO playback_history (user_id, media_file_id, progress, duration, is_completed)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.user_id,
      data.media_file_id,
      data.progress || 0,
      data.duration || 0,
      data.is_completed ? 1 : 0
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * 更新播放记录
   */
  update(id: number, data: Partial<CreatePlaybackDTO>): PlaybackHistory | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.progress !== undefined) {
      fields.push('progress = ?');
      values.push(data.progress);
    }
    if (data.duration !== undefined) {
      fields.push('duration = ?');
      values.push(data.duration);
    }
    if (data.is_completed !== undefined) {
      fields.push('is_completed = ?');
      values.push(data.is_completed ? 1 : 0);
    }

    fields.push('last_watched_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE playback_history SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  /**
   * 删除播放记录
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM playback_history WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * 清除用户的播放历史
   */
  deleteByUserId(userId: number): boolean {
    const stmt = this.db.prepare('DELETE FROM playback_history WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes > 0;
  }
}

// 导出单例
export const playbackService = new PlaybackService();
