# PrivaNest 部署指南

## 📦 部署到服务器

### 1. 环境准备

确保服务器上已安装：
- Node.js >= 18.x
- npm / pnpm / yarn
- Git（可选）

### 2. 上传项目

```bash
# 方式一：使用 Git
git clone <your-repo-url>
cd PrivaNest

# 方式二：直接上传压缩包并解压
```

### 3. 一键安装和启动

```bash
# 安装所有依赖并启动开发模式
./start.sh
```

这会自动：
- 安装前后端所有依赖
- 创建配置文件
- 同时启动前后端服务

### 4. 配置环境变量（关键步骤）

编辑 `backend/.env` 文件：

```bash
# 服务端口
PORT=4000

# JWT 密钥（务必修改为随机字符串！）
JWT_SECRET=your-production-secret-key-here-$(openssl rand -base64 32)

# 媒体库路径（根据你的实际存储位置配置）
# 例如：
MEDIA_PATHS=/data/media,/mnt/disk1/movies,/mnt/disk2/series

# 封面存储路径
COVER_PATH=./storage/covers

# 数据库路径
DB_PATH=./storage/database.db
```

### 5. 启动服务

#### 开发模式（不推荐生产环境）
```bash
# 启动后端
cd backend
npm run dev

# 另一个终端启动前端
cd frontend
npm run dev
```

#### 生产模式（推荐）

**方案一：使用 PM2（推荐）**

```bash
# 全局安装 PM2
npm install -g pm2

# 构建前端
cd frontend
npm run build

# 启动后端
cd ../backend
pm2 start dist/app.js --name privanest-backend

# 查看状态
pm2 status

# 设置开机自启
pm2 startup
pm2 save
```

**方案二：Systemd 服务**

创建 `/etc/systemd/system/privanest.service`:

```ini
[Unit]
Description=PrivaNest Private Cinema
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/PrivaNest/backend
ExecStart=/usr/bin/node backend/dist/app.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

然后启动：
```bash
sudo systemctl daemon-reload
sudo systemctl start privanest
sudo systemctl enable privanest
```

### 6. Nginx 反向代理（可选但推荐）

安装 Nginx 并配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/PrivaNest/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 媒体文件代理（如果需要）
    location /storage {
        proxy_pass http://localhost:4000/storage;
        proxy_set_header Host $host;
    }
}
```

启动 Nginx：
```bash
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 7. 构建前端（如果使用 Nginx）

```bash
cd frontend
npm run build
# 生成的 dist 目录放到 Nginx 根目录
```

---

## 🔒 安全建议

1. **修改 JWT 密钥**：务必生成随机字符串
   ```bash
   openssl rand -base64 32
   ```

2. **防火墙配置**：只开放必要端口
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

3. **HTTPS 配置**：使用 Let's Encrypt 免费证书
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

4. **文件权限**：确保媒体目录有读取权限
   ```bash
   sudo chown -R www-data:www-data /data/media
   sudo chmod -R 755 /data/media
   ```

---

## 🎯 配置示例

### 场景一：单机部署，媒体在外部硬盘

```bash
# .env 配置
MEDIA_PATHS=/mnt/external-drive/movies
```

### 场景二：多盘符管理

```bash
# .env 配置
MEDIA_PATHS=/data/movies,/data/series,/data/anime
```

### 场景三：NAS 网络挂载

```bash
# 先挂载 NAS
sudo mount -t nfs nas-ip:/volume1/media /mnt/nas-media

# .env 配置
MEDIA_PATHS=/mnt/nas-media
```

---

## 🐳 Docker 部署（可选）

创建 `docker-compose.yml`:

```yaml
version: '3'
services:
  privanest:
    build: .
    ports:
      - "4000:4000"
    volumes:
      - ./backend:/app/backend
      - /data/media:/media:ro  # 只读挂载
      - ./backend/storage:/app/storage
    environment:
      - MEDIA_PATHS=/media
      - JWT_SECRET=your-secret-key
    restart: always
```

启动：
```bash
docker-compose up -d
```

---

## ✅ 验证部署

1. 访问 `http://your-server-ip:4000/api/health` 应返回 `{"status":"ok"}`
2. 前端访问 `http://your-server-ip:3000`（或 Nginx 配置的域名）
3. 检查媒体库是否能正确读取配置的文件夹

---

## 🆘 常见问题

### Q: 无法读取媒体文件？
A: 检查文件权限和 `.env` 中的路径配置

### Q: 上传失败？
A: 确保 `storage/` 目录有写入权限

### Q: 跨域错误？
A: 检查后端 CORS 配置或使用 Nginx 反向代理

### Q: TypeScript 编译错误？
A: 运行 `npm run typecheck` 检查类型错误
