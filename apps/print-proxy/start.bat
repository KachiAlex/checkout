@echo off
echo Starting Print Proxy Server...
echo.
echo Server will be available at: ws://localhost:8080
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
node server.js

