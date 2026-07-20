@echo off
cd /d "%~dp0.."
echo Starting Vite dev server on http://localhost:8080
echo API proxy: /api -> http://localhost:8000
if not exist node_modules (
  echo Installing npm dependencies...
  call npm install
)
call npm run dev
