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

echo ""
echo "🚀 启动开发服务器..."
echo ""

# 使用 concurrently 同时启动前后端
npm run dev
