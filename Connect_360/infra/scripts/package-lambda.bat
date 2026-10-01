@echo off
REM =============================================================================
REM Connect360 - Lambda Packaging Script (Windows)
REM Creates zip files for each Lambda function with shared dependencies
REM Run from: c:\Users\jayadharsini.m\Downloads\connect360\infra
REM =============================================================================

echo === Connect360 Lambda Packager (Windows) ===
echo.

set PROJECT_ROOT=%~dp0..\..
set SHARED_DIR=%PROJECT_ROOT%\backend\shared
set LAMBDAS_DIR=%PROJECT_ROOT%\backend\lambdas
set OUTPUT_DIR=%~dp0..\lambda_packages

REM Create output directory
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM Package each Lambda
for %%L in (auth services workers bookings verification admin) do (
    echo Packaging: connect360-%%L -^> %%L.zip
    
    REM Create temp directory
    if exist "%TEMP%\lambda_build" rmdir /s /q "%TEMP%\lambda_build"
    mkdir "%TEMP%\lambda_build"
    
    REM Copy handler
    copy "%LAMBDAS_DIR%\connect360-%%L\handler.py" "%TEMP%\lambda_build\" >nul
    
    REM Copy shared modules
    copy "%SHARED_DIR%\*.py" "%TEMP%\lambda_build\" >nul
    
    REM Create zip using PowerShell
    powershell -Command "Compress-Archive -Path '%TEMP%\lambda_build\*' -DestinationPath '%OUTPUT_DIR%\%%L.zip' -Force"
    
    echo   -^> Created %%L.zip
)

echo.
echo === All Lambda packages created in: %OUTPUT_DIR% ===
echo.
dir "%OUTPUT_DIR%"
