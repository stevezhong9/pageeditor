#!/bin/bash

# GitHub 仓库设置脚本
# 使用方法: ./setup-github.sh YOUR_GITHUB_USERNAME

if [ -z "$1" ]; then
    echo "❌ 请提供您的 GitHub 用户名"
    echo "使用方法: ./setup-github.sh YOUR_GITHUB_USERNAME"
    echo ""
    echo "📝 如何找到您的 GitHub 用户名："
    echo "1. 访问 https://github.com"
    echo "2. 登录后点击右上角头像"
    echo "3. 用户名显示在 URL 中：https://github.com/[用户名]"
    echo ""
    echo "🔍 或者查看您的 article-generator 仓库 URL"
    exit 1
fi

USERNAME=$1
echo "🚀 设置 GitHub 远程仓库..."
echo "👤 用户名: $USERNAME"
echo "📦 仓库名: pageeditor"
echo ""

# 检查是否已有远程仓库
if git remote get-url origin 2>/dev/null; then
    echo "🔄 更新现有的远程仓库地址..."
    git remote set-url origin https://github.com/$USERNAME/pageeditor.git
else
    echo "➕ 添加远程仓库..."
    git remote add origin https://github.com/$USERNAME/pageeditor.git
fi

echo "✅ 远程仓库配置完成！"
echo ""
echo "📋 接下来的步骤："
echo "1. 在 GitHub 上创建 'pageeditor' 仓库（如果还没有）"
echo "2. 运行: git push -u origin main"
echo "3. 前往 Vercel 进行部署"
echo ""
echo "🌐 GitHub 仓库地址: https://github.com/$USERNAME/pageeditor"