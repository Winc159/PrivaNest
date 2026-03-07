import { getDatabase } from '../index';
import type { Database } from 'better-sqlite3';

export interface Favorite {
  id: number;
  user_id: number;
  media_file_id: number;
  note?: string;
  created_at: string;
}

export interface CreateFavoriteDTO {
  user_id: number;
  media_file_id: number;
  note?: string;
}

export class FavoriteService {
  private db: Database;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 获取用户的收藏列表
   */
  findByUserId(userId: number): Favorite[] {
    const stmt = this.db.prepare(`
      SELECT f.*, mf.file_name, mf.file_path, mf.cover_url, mf.file_type
      FROM favorites f
      JOIN media_files mf ON f.media_file_id = mf.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `);
    return stmt.all(userId) as Favorite[];
  }

  /**
   * 检查是否已收藏
   */
  findByUserAndMedia(userId: number, mediaFileId: number): Favorite | undefined {
    const stmt = this.db.prepare(
      'SELECT * FROM favorites WHERE user_id = ? AND media_file_id = ?'
    );
    return stmt.get(userId, mediaFileId) as Favorite | undefined;
  }

  /**
   * 添加收藏
   */
  create(data: CreateFavoriteDTO): Favorite {
    // 检查是否已存在
    const existing = this.findByUserAndMedia(data.user_id, data.media_file_id);
    if (existing) {
      return existing;
    }

    const stmt = this.db.prepare(`
      INSERT INTO favorites (user_id, media_file_id, note)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(
      data.user_id,
      data.media_file_id,
      data.note || null
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * 删除收藏
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM favorites WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * 根据 ID 获取收藏
   */
  findById(id: number): Favorite | undefined {
    const stmt = this.db.prepare('SELECT * FROM favorites WHERE id = ?');
    return stmt.get(id) as Favorite | undefined;
  }

  /**
   * 取消收藏（通过用户和媒体文件 ID）
   */
  removeByUserAndMedia(userId: number, mediaFileId: number): boolean {
    const favorite = this.findByUserAndMedia(userId, mediaFileId);
    if (!favorite) {
      return false;
    }
    return this.delete(favorite.id);
  }
}

// 导出单例
export const favoriteService = new FavoriteService();
