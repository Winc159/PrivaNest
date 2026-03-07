# PrivaNest 数据库使用指南

## 📊 数据库概述

PrivaNest 使用 **SQLite** 作为持久化存储数据库，通过 **better-sqlite3** 库进行操作。

### 数据库特性

- ✅ **迁移脚本管理**：版本化的数据库结构变更
- ✅ **自动化部署**：一键初始化和重置
- ✅ **类型安全**：完整的 TypeScript 类型定义
- ✅ **服务层封装**：统一的 CRUD 操作接口

---

## 🗄️ 数据表结构

### 1. users（用户表）
存储用户账户信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| username | TEXT | 用户名（唯一） |
| password_hash | TEXT | 密码哈希 |
| email | TEXT | 邮箱 |
| avatar_url | TEXT | 头像 URL |
| role | TEXT | 角色（user/admin） |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 2. media_files（媒体文件表）
缓存扫描到的媒体文件信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| file_path | TEXT | 完整路径（唯一） |
| file_name | TEXT | 文件名 |
| file_type | TEXT | 文件类型（video/image） |
| file_size | INTEGER | 文件大小（字节） |
| library_path | TEXT | 所属媒体库路径 |
| relative_path | TEXT | 相对路径 |
| parent_path | TEXT | 父级路径 |
| cover_url | TEXT | 封面 URL |
| metadata | TEXT | 元数据（JSON） |
| scanned_at | DATETIME | 扫描时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### 3. playback_history（播放历史表）
记录用户观看进度

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 用户 ID（外键） |
| media_file_id | INTEGER | 媒体文件 ID（外键） |
| progress | REAL | 播放进度（秒） |
| duration | REAL | 总时长（秒） |
| is_completed | BOOLEAN | 是否已完成 |
| last_watched_at | DATETIME | 最后观看时间 |
| created_at | DATETIME | 创建时间 |

### 4. favorites（收藏表）
用户收藏的媒体内容

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 用户 ID（外键） |
| media_file_id | INTEGER | 媒体文件 ID（外键） |
| note | TEXT | 备注 |
| created_at | DATETIME | 创建时间 |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
# 执行所有迁移（创建表结构）
npm run db:migrate

# （可选）填充初始数据（创建默认管理员）
npm run db:seed
```

### 3. 启动项目

```bash
npm run dev
```

数据库会在首次启动时自动初始化。

---

## 📝 常用命令

### 数据库迁移

```bash
# 执行所有未执行的迁移
npm run db:migrate

# 重置数据库（删除所有数据）
npm run db:reset

# 填充种子数据
npm run db:seed
```

---

## 🔧 创建新的迁移

当需要修改数据库结构时：

### 1. 创建迁移文件

```bash
touch src/database/migrations/005_create_new_table.ts
```

### 2. 编写迁移逻辑

```typescript
import Database from 'better-sqlite3';

export function up(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS new_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);
}

export function down(db: Database.Database) {
  db.exec('DROP TABLE IF EXISTS new_table');
}
```

### 3. 执行迁移

```bash
npm run db:migrate
```

---

## 💻 在代码中使用数据库

### 示例：用户服务

```typescript
import { userService } from '@/database/services/user.service';

// 查找用户
const user = userService.findByUsername('admin');

// 创建用户
const newUser = userService.create({
  username: 'newuser',
  password_hash: 'hashed_password',
  email: 'user@example.com'
});

// 更新用户
userService.update(user.id, { email: 'new@email.com' });

// 删除用户
userService.delete(user.id);
```

### 示例：播放历史服务

```typescript
import { playbackService } from '@/database/services/playback.service';

// 获取用户播放历史
const history = playbackService.findByUserId(1);

// 保存播放进度
playbackService.upsert({
  user_id: 1,
  media_file_id: 10,
  progress: 120.5,
  duration: 3600,
  is_completed: false
});

// 获取特定文件的播放进度
const progress = playbackService.findByUserAndMedia(1, 10);
```

### 示例：收藏服务

```typescript
import { favoriteService } from '@/database/services/favorite.service';

// 添加收藏
favoriteService.create({
  user_id: 1,
  media_file_id: 10,
  note: '喜欢的电影'
});

// 获取用户收藏列表
const favorites = favoriteService.findByUserId(1);

// 取消收藏
favoriteService.removeByUserAndMedia(1, 10);
```

---

## 🛠️ 数据库工具

### 查看数据库文件

```bash
# macOS
open backend/storage/database.db

# 或使用 SQLite 客户端工具
# - DB Browser for SQLite
# - TablePlus
# - SQLite Viewer (VS Code 插件)
```

### 手动执行 SQL

```typescript
import { getDatabase } from '@/database';

const db = getDatabase();

// 查询
const users = db.prepare('SELECT * FROM users').all();

// 插入
db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
  .run('test', 'hash');

// 更新
db.prepare('UPDATE users SET email = ? WHERE id = ?').run('new@email.com', 1);

// 删除
db.prepare('DELETE FROM users WHERE id = ?').run(1);
```

---

## 📦 目录结构

```
backend/
├── src/
│   ├── database/
│   │   ├── index.ts                    # 数据库连接管理
│   │   ├── migrations/                 # 迁移脚本
│   │   │   ├── 001_create_users_table.ts
│   │   │   ├── 002_create_media_files_table.ts
│   │   │   ├── 003_create_playback_history_table.ts
│   │   │   └── 004_create_favorites_table.ts
│   │   └── services/                   # 数据访问层
│   │       ├── user.service.ts
│   │       ├── playback.service.ts
│   │       └── favorite.service.ts
├── scripts/
│   ├── migrate.ts                      # 迁移执行脚本
│   ├── reset-db.ts                     # 重置数据库脚本
│   └── seed.ts                         # 种子数据脚本
└── storage/
    └── database.db                     # SQLite 数据库文件
```

---

## ⚠️ 注意事项

1. **不要手动修改数据库文件**：始终使用迁移脚本管理结构变更
2. **定期备份**：生产环境请定期备份 `storage/database.db`
3. **测试数据**：使用 `db:reset` 和 `db:seed` 快速重建测试数据
4. **团队协作**：新增迁移后及时通知团队成员执行 `db:migrate`

---

## 🎯 最佳实践

- ✅ 所有数据库操作通过 Service 层进行
- ✅ 使用事务处理批量操作
- ✅ 为常用查询字段创建索引
- ✅ 外键约束保证数据完整性
- ✅ 定期清理过期的播放历史

---

## 📚 参考资料

- [better-sqlite3 文档](https://github.com/WiseLibs/better-sqlite3)
- [SQLite 官方文档](https://www.sqlite.org/docs.html)
- [数据库迁移模式](https://martinfowler.com/articles/migration.html)
