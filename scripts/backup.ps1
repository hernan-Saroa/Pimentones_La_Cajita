# scripts/backup.ps1 - Generar un respaldo inmediato de la base de datos
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\.."

Write-Host ">>> Ejecutando respaldo inmediato en contenedor..." -ForegroundColor Cyan
docker compose exec -T backup /scripts/backup.sh

if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

Write-Host ">>> Copiando respaldo a carpeta local ./backups..." -ForegroundColor Cyan
docker compose cp backup:/backups/. ./backups/
Get-ChildItem -Path "backups" | Sort-Object LastWriteTime -Descending | Select-Object -First 3
