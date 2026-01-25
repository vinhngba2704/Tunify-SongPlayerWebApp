@echo off
echo ========================================
echo   Music Player - Full Stack Launcher
echo   Backend (FastAPI) + Frontend (Next.js)
echo ========================================
echo.

echo Starting Backend Server...
start "Music Player Backend" cmd /k "uv run python -m backend.core.main"

echo Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "Music Player Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Both servers are starting!
echo ========================================
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo API Docs: http://127.0.0.1:8000/docs
echo.
echo Press any key to exit this launcher window...
echo (The servers will continue running in separate windows)
pause > nul