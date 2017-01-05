@echo off
setlocal enabledelayedexpansion

for /L %%i in (1,1,5) DO (
echo %%i
hexo clean
hexo g
hexo d
)
pause