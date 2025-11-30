#!/bin/bash

# 服装出入库管理系统 - GitHub Pages 部署脚本

# 设置仓库信息
REPO_URL="https://github.com/QQ441176886/clothing-inventory-management.git"
BRANCH="gh-pages"

# 设置工作目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/dist"

# 检查dist目录是否存在
if [ ! -d "$BUILD_DIR" ]; then
    echo "错误：dist目录不存在，请先运行 npm run build"
    exit 1
fi

# 创建临时目录
TEMP_DIR=$(mktemp -d)
echo "创建临时目录：$TEMP_DIR"

# 进入临时目录并初始化git
cd "$TEMP_DIR"
git init
git config user.name "部署脚本"
git config user.email "deploy@example.com"

# 切换到gh-pages分支
if ! git checkout -b "$BRANCH"; then
    echo "错误：无法创建分支 $BRANCH"
    exit 1
fi

# 复制dist目录的所有内容到临时目录
cp -r "$BUILD_DIR"/* .

# 检查复制的文件
if [ ! -f "index.html" ] || [ ! -d "assets" ]; then
    echo "错误：复制的文件不完整"
    ls -la
    exit 1
fi

# 添加所有文件
git add .

# 提交
git commit -m "重新部署 - $(date '+%Y-%m-%d %H:%M:%S')"

# 推送到远程仓库
if git push -f "$REPO_URL" "$BRANCH"; then
    echo "\n✅ 部署成功！"
    echo "访问地址：https://QQ441176886.github.io/clothing-inventory-management"
else
    echo "\n❌ 部署失败，请检查网络连接或GitHub权限"
    exit 1
fi

# 清理临时目录
rm -rf "$TEMP_DIR"
echo "\n清理完成"
