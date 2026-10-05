# scripts/up.ps1 - Levantar stack de producción con Docker Compose en Windows
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\.."

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Creé .env desde .env.example: edítalo (DB_PASSWORD, SITE_DOMAIN, SITE_URL) y vuelve a ejecutar." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "apps\api\.env")) {
    Copy-Item "apps\api\.env.example" "apps\api\.env"
    Write-Host "Creé apps\api\.env: define JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD y vuelve a ejecutar." -ForegroundColor Yellow
    exit 1
}

Write-Host ">>> Construyendo y levantando contenedores con Docker Compose..." -ForegroundColor Cyan
docker compose build --pull
docker compose up -d --remove-orphans
docker compose ps

Write-Host "`n>>> Verificando salud de la API..." -ForegroundColor Cyan
try {
    $res = Invoke-RestMethod -Uri "http://localhost/api/health" -TimeoutSec 10
    Write-Host "Salud API: $($res | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "API iniciando o accesible por puerto 4000..." -ForegroundColor Yellow
}
