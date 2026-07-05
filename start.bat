@echo off
echo ========================================
echo   AI Image Gen - 启动脚本
echo ========================================
echo.

REM Check if ports are available
echo [1/4] 检查端口占用...
netstat -ano | findstr ":8000" >nul 2>&1
if %errorlevel% equ 0 (
    echo   后端端口 8000 已被占用
) else (
    echo   后端端口 8000 可用
)
netstat -ano | findstr ":3001" >nul 2>&1
if %errorlevel% equ 0 (
    echo   前端端口 3001 已被占用
) else (
    echo   前端端口 3001 可用
)
echo.

echo [2/4] 启动后端服务 (FastAPI)...
cd /d "%~dp0backend"
start "AI Image Gen Backend" cmd /k "uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul
echo   后端已启动: http://localhost:8000
echo.

echo [3/4] 启动前端服务 (Next.js)...
cd /d "%~dp0frontend"
start "AI Image Gen Frontend" cmd /k "npm run dev"
echo   前端已启动: http://localhost:3001
echo.

echo [4/4] 验证服务...
timeout /t 5 /nobreak >nul
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo   后端服务: OK
) else (
    echo   后端服务: FAIL
)
curl -s http://localhost:3001 >nul 2>&1
if %errorlevel% equ 0 (
    echo   前端服务: OK
) else (
    echo   前端服务: FAIL
)
echo.

echo ========================================
echo   访问地址:
echo   - 前端: http://localhost:3001
echo   - 后端: http://localhost:8000
echo   - API文档: http://localhost:8000/docs
echo ========================================
echo.
echo 按任意键关闭此窗口...
pause >nul
