@echo off
cd /d "%~dp0"
node scripts\build-static.cjs
if errorlevel 1 exit /b 1
powershell -NoProfile -Command "Compress-Archive -Path 'deploy/site/*' -DestinationPath 'deploy/alwateen-upload.zip' -Force"
if errorlevel 1 exit /b 1
echo Upload deploy\alwateen-upload.zip
