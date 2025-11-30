@echo off

REM 设置仓库信息
set REPO_URL=https://github.com/QQ441176886/clothing-inventory-management.git
set BRANCH=gh-pages
set DIST_DIR=dist
set TEMP_DIR=%TEMP%\clothing-deploy

REM 检查dist目录是否存在
if not exist %DIST_DIR% (
    echo Error: dist directory not found. Please run "npm run build" first.
    pause
    exit /b 1
)

REM 清理临时目录
if exist %TEMP_DIR% (
    rmdir /s /q %TEMP_DIR%
)

REM 创建临时目录
mkdir %TEMP_DIR%

REM 复制dist目录内容到临时目录
xcopy /s /e %DIST_DIR%\* %TEMP_DIR%\

REM 进入临时目录
cd %TEMP_DIR%

REM 初始化git
git init
git checkout -b %BRANCH%

REM 添加文件
git add .

REM 提交
git commit -m "Deploy update at %DATE% %TIME%"

REM 推送到远程仓库
git remote add origin %REPO_URL%
git push -f origin %BRANCH%

REM 检查推送结果
if %ERRORLEVEL% equ 0 (
    echo Deploy successful!
    echo Please wait 1-5 minutes for GitHub Pages to update.
    echo Access your site at: https://QQ441176886.github.io/clothing-inventory-management
) else (
    echo Deploy failed!
    echo Check network connection or GitHub limits.
    echo Try manual deployment by copying all files from dist directory to gh-pages branch.
)

REM 清理临时目录
cd /d %~dp0
rmdir /s /q %TEMP_DIR%

pause