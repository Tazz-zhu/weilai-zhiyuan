@echo off
chcp 65001 >nul
title 未来致远 · 分享给朋友
echo.
echo   ============================================
echo     🌅 未来致远 · 分享给朋友
echo   ============================================
echo.

:: 检查服务是否在运行
netstat -ano | findstr ":4173" | findstr "LISTENING" >nul
if errorlevel 1 (
  echo   [!] 服务未检测到运行，请先运行「启动未来致远.bat」。
  echo        （若已启动请忽略，也可能是防火墙拦截了本机检测）
  echo.
)

:: 获取局域网 IPv4 地址
set "IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set "IP=%%a"
  goto gotip
)
:gotip
set "IP=%IP: =%"

echo   【方案一】局域网访问 —— 朋友连同一个 WiFi 就能看
echo.
echo      ➜ 把下面这个地址发给朋友：
echo.
echo         http://%IP%:4173
echo.
echo      [提示] 如果朋友打不开，多半是防火墙拦截。
echo             请关闭本窗口后，右键本脚本 →「以管理员身份运行」，
echo             会自动放行 TCP 4173 端口；或者手动放行：
echo             Windows 安全中心 → 防火墙 → 允许应用/端口 → 新增 4173
echo.

:: 若以管理员运行，自动放行防火墙
net session >nul 2>&1
if not errorlevel 1 (
  netsh advfirewall firewall show rule name="weilai-zhiyuan-4173" >nul 2>&1
  if errorlevel 1 (
    netsh advfirewall firewall add rule name="weilai-zhiyuan-4173" dir=in action=allow protocol=TCP localport=4173 profile=private >nul
    echo   ✅ 已自动放行防火墙 TCP 4173（仅专用网络）
  ) else (
    echo   ✅ 防火墙规则已存在
  )
  echo.
)

:: 公网隧道（异地朋友也能看）
where cloudflared >nul 2>&1
if errorlevel 1 (
  echo   【方案二】公网访问 —— 朋友在异地也能看（可选）
  echo.
  echo     需要先安装 Cloudflare 隧道（免费、无需注册），任选一种：
  echo       ① 命令安装：  winget install cloudflared
  echo       ② 官网下载：  https://developers.cloudflare.com/cloudflared/quickstart/
  echo.
  echo     安装后运行本脚本即可获得公网链接；也可以手动运行：
  echo       cloudflared tunnel --url http://localhost:4173
  echo.
  echo     运行后会生成 https://xxxx.trycloudflare.com 链接，发给朋友即可。
  echo     （临时链接，关闭后失效；适合演示/短期分享）
  echo.
  goto end
)

echo   【方案二】公网访问 —— 检测到 Cloudflare 隧道，可让异地朋友直接看
echo.
set /p Y=  是否现在启动公网隧道？(Y/N):
if /i "%Y%"=="Y" goto tunnel
goto end

:tunnel
echo.
echo   正在建立公网隧道，请把输出的 https:// 链接发给朋友…
echo   保持本窗口开启，关闭即断开。
echo.
cloudflared tunnel --url http://localhost:4173
goto end

:end
echo.
pause
