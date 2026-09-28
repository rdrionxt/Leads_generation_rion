@echo off
title RION LEADS Generation Tool
color 0B

echo =====================================================================
echo                 RION LEADS GENERATION TOOL v1.2 PRO
echo     AI-Powered B2B Lead Extractor (Google Maps + Email Enrichment)
echo =====================================================================
echo.

cd /d "%~dp0"

set PYTHON_CMD=python
if exist "C:\Users\Administrator\Python311\python.exe" (
    set PYTHON_CMD=C:\Users\Administrator\Python311\python.exe
)

echo [*] Starting RION LEADS Engine Server on http://localhost:8000 ...
start "" http://localhost:8000

echo [*] Server is active. Press Ctrl+C in this console to terminate.
echo.
"%PYTHON_CMD%" app.py

pause
