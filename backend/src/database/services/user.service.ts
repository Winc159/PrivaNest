import { getDatabase } from '../index';
import type { Database } from 'better-sqlite3';

export interface User {
  id: number;
  username: string;
  email?: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserDTO {
  username: string;
  password_hash: string;
  email?: string;
  avatar_url?: string;
  role?: string;
}

export class UserService {
  private db: Database;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * 根据用户名查找用户
   */
  findByUsername(username: string): User | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as User | undefined;
  }

  /**
   * 根据 ID 查找用户
   */
  findById(id: number): User | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
  }

  /**
   * 创建用户
   */
  create(data: CreateUserDTO): User {
    const stmt = this.db.prepare(`
      INSERT INTO users (username, password_hash, email, avatar_url, role)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.username,
      data.password_hash,
      data.email || null,
      data.avatar_url || null,
      data.role || 'user'
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * 更新用户信息
   */
  update(id: number, data: Partial<CreateUserDTO>): User | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email);
    }
    if (data.avatar_url !== undefined) {
      fields.push('avatar_url = ?');
      values.push(data.avatar_url);
    }
    if (data.password_hash !== undefined) {
      fields.push('password_hash = ?');
      values.push(data.password_hash);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE users SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  /**
   * 删除用户
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * 获取所有用户
   */
  findAll(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    return stmt.all() as User[];
  }
}

// 导出单例
export const userService = new UserService();
