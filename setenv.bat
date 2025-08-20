@echo off
REM Usage: call setenv.bat local|docker
IF "%1"=="local" (
    copy /Y server\.env.local server\.env
    echo Switched to local environment variables.
) ELSE IF "%1"=="docker" (
    copy /Y server\.env.docker server\.env
    echo Switched to Docker environment variables.
) ELSE (
    echo Usage: call setenv.bat local^|docker
)
