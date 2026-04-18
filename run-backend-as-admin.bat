@echo off
title NetworkPulse API (elevated)
cd /d "%~dp0backend"

echo.
echo  Starting the API with Administrator rights (required for packet capture on Windows).
echo  Approve the UAC prompt if Windows asks.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Start-Process -FilePath 'python' -ArgumentList 'run.py' -WorkingDirectory '%CD%' -Verb RunAs"

if errorlevel 1 (
  echo If that failed, try: right-click this file -^> Run as administrator
  pause
)
