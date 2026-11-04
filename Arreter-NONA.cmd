@echo off
"C:\Program Files\nodejs\node.exe" "%~dp0scripts\validation\stop-nona-local.mjs"
if errorlevel 1 pause
