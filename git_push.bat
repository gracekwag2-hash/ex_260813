@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo ================================================
echo  ex_260813 GitHub push
echo ================================================
echo.

if exist ".git\index.lock" (
    echo [1/5] Removing stale lock file...
    del /f /q ".git\index.lock"
) else (
    echo [1/5] No lock file. OK.
)

if not exist ".git" (
    echo [!] No git repository found. Initializing...
    git init
    git config user.name "gracekwag2"
    git config user.email "gracekwag2@gmail.com"
    git remote add origin https://github.com/gracekwag2-hash/ex_260813.git
)

echo [2/5] Staging files...
git add -A
if errorlevel 1 goto :error

echo [3/5] Creating commit...
git commit -m "Add proposal site, lotto generator, and ADsP notes"

echo [4/5] Setting branch to main...
git branch -M main

echo [5/5] Pushing to GitHub...
git push -u origin main
if errorlevel 1 goto :error

echo.
echo ================================================
echo  Done! Check: https://github.com/gracekwag2-hash/ex_260813
echo ================================================
echo.
pause
exit /b 0

:error
echo.
echo ================================================
echo  Something went wrong. See the message above.
echo  If it asks for login, sign in to GitHub and run again.
echo ================================================
echo.
pause
exit /b 1
