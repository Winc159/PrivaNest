#!/bin/bash

echo "🎬 PrivaNest - 快速启动脚本"
echo "=========================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js >= 18.x"
    exit 1
fi

echo "✅ Node.js 版本：$(node -v)"

# 检查是否已安装依赖
if [ ! -d "frontend/node_modules" ] || [ ! -d "backend/node_modules" ]; then
    echo ""
    echo "📦 正在安装依赖..."
    
    # 后端设置
    cd backend
    if [ ! -f ".env" ]; then
        echo "⚠️  未找到 .env 文件，正在创建..."
        cp .env.example .env
        echo "✅ 已创建 .env 文件，请编辑配置你的媒体库路径！"
    fi
    npm install
    
    # 前端设置
    cd ../frontend
    npm install
    
    cd ..
    echo ""
    echo "✅ 依赖安装完成！"
fi

# Redis 检查和启动（可选）
echo ""
echo "🔍 检查 Redis 服务状态..."

if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis 服务正在运行"
        
        # 显示 Redis 信息
        REDIS_INFO=$(redis-cli INFO server 2>/dev/null | grep redis_version | cut -d: -f2 | tr -d '\r')
        echo "   📊 Redis 版本：${REDIS_INFO:-unknown}"
    else
        echo "⚠️  Redis 服务未运行"
        echo ""
        echo "💡 提示：Redis 是可选的，系统会自动降级到内存缓存模式"
        echo ""
        read -p "是否现在启动 Redis？(y/n) " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                if command -v brew &> /dev/null; then
                    echo "🚀 通过 Homebrew 启动 Redis..."
                    brew services start redis
                    sleep 2
                    if redis-cli ping &> /dev/null; then
                        echo "✅ Redis 启动成功"
                    else
                        echo "⚠️  Redis 启动失败，将以内存缓存模式运行"
                    fi
                else
                    echo "⚠️  未检测到 Homebrew，请手动启动 Redis"
                fi
            elif command -v systemctl &> /dev/null; then
                echo "🚀 通过 systemd 启动 Redis..."
                sudo systemctl start redis-server
                sleep 2
                if redis-cli ping &> /dev/null; then
                    echo "✅ Redis 启动成功"
                else
                    echo "⚠️  Redis 启动失败，将以内存缓存模式运行"
                fi
            else
                echo "⚠️  无法自动启动 Redis，请手动启动或使用以下命令："
                echo "   Docker: docker run -d --name privanest-redis -p 6379:6379 redis:latest"
            fi
        fi
    fi
else
    echo "⚠️  未找到 redis-cli 命令"
    echo ""
    echo "💡 Redis 未安装，系统将以内存缓存模式运行"
    echo ""
    echo "📦 如需安装 Redis，请选择以下方式："
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "   macOS (Homebrew): brew install redis"
    elif command -v apt-get &> /dev/null; then
        echo "   Ubuntu/Debian: sudo apt-get install redis-server"
    elif command -v yum &> /dev/null; then
        echo "   CentOS/RHEL: sudo yum install redis"
    fi
    echo "   Docker: docker run -d --name privanest-redis -p 6379:6379 redis:latest"
    echo ""
fi

# 检查后端 .env 文件
cd backend
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  未找到 .env 文件，正在从 .env.example 创建..."
    cp .env.example .env
    echo "✅ .env 文件已创建"
    echo ""
    echo "📝 请编辑 backend/.env 文件配置以下内容："
    echo "   - MEDIA_PATHS: 你的媒体库路径"
    echo "   - REDIS_HOST: Redis 服务器地址（可选，默认 localhost）"
    echo "   - REDIS_PORT: Redis 端口（可选，默认 6379）"
    echo ""
fi
cd ..

echo ""
echo "=========================="
echo "🚀 即将启动开发服务器..."
echo "=========================="
echo ""

# 使用 concurrently 同时启动前后端
npm run dev
