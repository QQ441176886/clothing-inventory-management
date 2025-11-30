# 服装出入库管理系统 - GitHub Pages 部署脚本
# PowerShell 版本

# 设置仓库信息
$REPO_URL = "https://github.com/QQ441176886/clothing-inventory-management.git"
$BRANCH = "gh-pages"
$DIST_DIR = "dist"
$TEMP_DIR = "$env:TEMP\clothing-deploy"

# 检查dist目录是否存在
if (-not (Test-Path $DIST_DIR)) {
    Write-Host "Error: dist directory not found. Please run 'npm run build' first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 清理临时目录
if (Test-Path $TEMP_DIR) {
    Remove-Item -Recurse -Force $TEMP_DIR
}

# 创建临时目录
New-Item -ItemType Directory -Path $TEMP_DIR | Out-Null

# 复制dist目录内容到临时目录
Copy-Item -Recurse -Force "$DIST_DIR\*" "$TEMP_DIR\"

# 进入临时目录
Set-Location $TEMP_DIR

# 初始化git
Write-Host "Initializing git repository..."
git init
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to initialize git repository" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 创建并切换到gh-pages分支
git checkout -b $BRANCH
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to create branch $BRANCH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 配置git用户信息
git config user.name "Deploy Script"
git config user.email "deploy@example.com"

# 添加文件
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to add files" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 提交
git commit -m "Deploy update at $(Get-Date)"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to commit files" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 推送到远程仓库
git remote add origin $REPO_URL
Write-Host "Pushing to GitHub Pages..."
git push -f origin $BRANCH
if ($LASTEXITCODE -eq 0) {
    Write-Host "Deploy successful!" -ForegroundColor Green
    Write-Host "Please wait 1-5 minutes for GitHub Pages to update." -ForegroundColor Cyan
    Write-Host "Access your site at: https://QQ441176886.github.io/clothing-inventory-management" -ForegroundColor Cyan
} else {
    Write-Host "Deploy failed!" -ForegroundColor Red
    Write-Host "Check network connection or GitHub limits." -ForegroundColor Yellow
    Write-Host "Try manual deployment by copying all files from dist directory to gh-pages branch." -ForegroundColor Yellow
}

# 返回到项目目录
Set-Location $PSScriptRoot

# 清理临时目录
Remove-Item -Recurse -Force $TEMP_DIR

Read-Host "Press Enter to exit"