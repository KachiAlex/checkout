@echo off
REM Deploy licensing migration to Neon database
REM Usage: Run this script when you're ready to apply the migration

cd /d "%~dp0\apps\backend"

echo.
echo ================================
echo Deploying Licensing Migration
echo ================================
echo.

REM Set Neon connection string
set DATABASE_URL=postgresql://neondb_owner:npg_tliG7PZ1bIMK@ep-late-wind-aemwrxse-pooler.c-2.us-east-2.aws.neon.tech/migration?sslmode=require^&channel_binding=require

echo Connecting to Neon database...
echo Database: migration
echo Host: ep-late-wind-aemwrxse-pooler.c-2.us-east-2.aws.neon.tech
echo.

REM Apply migration
echo Applying migration: add_licensing_and_backup_models
npx prisma migrate deploy

if %errorlevel% equ 0 (
    echo.
    echo ================================
    echo ✓ Migration successful!
    echo ================================
    echo.
    echo Tables created:
    echo - License
    echo - LicenseAudit
    echo - DeviceRegistration
    echo - BackupManifest
    echo.
    echo You can now test the licensing system!
) else (
    echo.
    echo ================================
    echo ✗ Migration failed
    echo ================================
    echo.
    echo Please check:
    echo 1. Neon database is accessible
    echo 2. Connection string is correct
    echo 3. Firewall isn't blocking connections
)

pause
