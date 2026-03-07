# 🚀 数据库快速开始指南

## ✅ 已完成配置

你的 PrivaNest 项目现在已配备完整的 SQLite 数据库系统！

---

## 📦 安装的依赖

- ✅ `better-sqlite3` - SQLite 数据库库
- ✅ `@types/better-sqlite3` - TypeScript 类型声明

---

## 🎯 立即使用（3 步完成）

### 第 1 步：初始化数据库

```bash
cd backend
npm run db:migrate
```

**输出示例：**
```
Starting database migration...

🔄 Running: 001_create_users_table...
✅ Completed: 001_create_users_table

🔄 Running: 002_create_media_files_table...
✅ Completed: 002_create_media_files_table

🔄 Running: 003_create_playback_history_table...
✅ Completed: 003_create_playback_history_table

🔄 Running: 004_create_favorites_table...
✅ Completed: 004_create_favorites_table

=================================
Migration completed!
Executed: 4, Skipped: 0
=================================
```

### 第 2 步：创建默认管理员

```bash
npm run db:seed
```

**输出示例：**
```
Seeding database...

✅ Created default admin user:
   Username: admin
   Password: admin123
   ⚠️  Please change the password after first login!

=================================
Seeding completed!
=================================
```

### 第 3 步：启动项目

```bash
npm run dev
```

数据库会在应用启动时自动初始化！

---

## 🔧 常用命令速查

| 命令 | 说明 | 使用场景 |
|------|------|----------|
| `npm run db:migrate` | 执行所有未执行的迁移 | 首次部署、新增表结构 |
| `npm run db:reset` | 删除数据库文件 | 开发环境重置 |
| `npm run db:seed` | 填充初始数据 | 创建测试数据 |
| `npm run db:test` | 运行数据库测试 | 验证数据库功能 |

---

## 📊 已创建的数据表

### 1. users - 用户表
- 存储用户账户信息
- 支持角色权限（user/admin）
- 密码加密存储

### 2. media_files - 媒体文件表
- 缓存扫描到的媒体文件
- 记录文件路径、大小、类型
- 支持封面和元数据

### 3. playback_history - 播放历史表
- 记录观看进度
- 支持续播功能
- 自动去重（upsert）

### 4. favorites - 收藏表
- 用户收藏管理
- 支持备注功能
- 自动去重

---

## 💻 代码中使用示例

### 用户操作

```typescript
import { userService } from './src/database/services/user.service';

// 查找用户
const user = userService.findByUsername('admin');

// 创建用户
const newUser = userService.create({
  username: 'test',
  password_hash: 'hashed_pwd',
  email: 'test@example.com'
});
```

### 播放进度

```typescript
import { playbackService } from './src/database/services/playback.service';

// 保存播放进度
playbackService.upsert({
  user_id: 1,
  media_file_id: 10,
  progress: 120,
  duration: 3600,
  is_completed: false
});

// 获取播放历史
const history = playbackService.findByUserId(1);
```

### 收藏管理

```typescript
import { favoriteService } from './src/database/services/favorite.service';

// 添加收藏
favoriteService.create({
  user_id: 1,
  media_file_id: 10,
  note: '喜欢的电影'
});

// 获取收藏列表
const favorites = favoriteService.findByUserId(1);

// 取消收藏
favoriteService.removeByUserAndMedia(1, 10);
```

---

## 🛠️ 查看数据库内容

### 方法 1：VS Code 插件
安装 `SQLite Viewer` 插件，点击 `storage/database.db` 文件即可查看。

### 方法 2：DB Browser for SQLite
```bash
brew install --cask db-browser-for-sqlite
open backend/storage/database.db
```

### 方法 3：命令行
```bash
sqlite3 backend/storage/database.db
.tables
SELECT * FROM users;
```

---

## ⚠️ 重要提示

1. **默认管理员密码**：`admin123` - 首次登录后请立即修改
2. **不要手动修改数据库**：始终使用迁移脚本管理变更
3. **定期备份**：生产环境请备份 `storage/database.db`
4. **团队开发**：新增迁移后通知队友执行 `npm run db:migrate`

---

## 📚 完整文档

详细使用说明请查看 [`DATABASE.md`](./DATABASE.md)

---

## 🎉 恭喜！

你的数据库已经配置完成，可以开始使用了！

下一步建议：
- [ ] 将现有的内存存储逻辑迁移到数据库
- [ ] 实现播放进度记忆功能
- [ ] 添加收藏夹 UI 界面
- [ ] 完善媒体文件元数据管理
