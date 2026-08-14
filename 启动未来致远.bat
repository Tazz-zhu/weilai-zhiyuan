@echo off
chcp 65001 >nul
title 未来致远 · 你的人生，自己导航
echo.
echo   ==========================================
echo     🌅 未来致远 · 你的人生，自己导航
echo   ==========================================
echo.

set "NODE_CMD=node"

where node >nul 2>nul
if errorlevel 1 (
    if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
        set "NODE_CMD=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    ) else (
        echo   [错误] 未找到 Node.js。
        echo   请安装 Node.js 22.5 或更高版本（https://nodejs.org），并加入 PATH。
        pause
        exit /b 1
    )
)

echo   正在启动服务：http://localhost:4173
echo.
start "" http://localhost:4173
"%NODE_CMD%" server.js

echo.
pause
