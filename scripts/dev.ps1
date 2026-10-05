# scripts/dev.ps1 - Desarrollo local en Windows (PostgreSQL en Docker + Apps con recarga en caliente)
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\.."

Write-Host ">>> [1/4] Levantando PostgreSQL en Docker..." -ForegroundColor Cyan
docker compose -f docker-compose.dev.yml up -d db

if (-not (Test-Path "apps\api\.env")) {
    Write-Host ">>> Configurando apps\api\.env inicial..." -ForegroundColor Yellow
    Copy-Item "apps\api\.env.example" "apps\api\.env"
    $envContent = Get-Content "apps\api\.env" -Raw
    $envContent = $envContent -replace "JWT_SECRET=.*", "JWT_SECRET=secreto-de-desarrollo-largo-123"
    $envContent = $envContent -replace "ADMIN_PASSWORD=.*", "ADMIN_PASSWORD=clave-de-desarrollo"
    $envContent += "`nJOBS_INLINE=true`n"
    Set-Content "apps\api\.env" $envContent
}

if (-not (Test-Path "apps\web\.env.local")) {
    Write-Host ">>> Configurando apps\web\.env.local inicial..." -ForegroundColor Yellow
    Copy-Item "apps\web\.env.example" "apps\web\.env.local"
}

Write-Host ">>> [2/4] Compilando contratos compartidos (packages/shared)..." -ForegroundColor Cyan
npm run build -w packages/shared

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "  Pimentones La Cajita - Entorno de Desarrollo" -ForegroundColor Green
Write-Host "  Tienda Web:        http://localhost:3000" -ForegroundColor White
Write-Host "  Panel Admin:       http://localhost:3000/admin" -ForegroundColor White
Write-Host "  Documentación API: http://localhost:4000/api/docs" -ForegroundColor White
Write-Host "  Salud API:         http://localhost:4000/api/health" -ForegroundColor White
Write-Host "=======================================================`n" -ForegroundColor Green

Write-Host ">>> [3/4] Iniciando API y Frontend en paralelo..." -ForegroundColor Cyan
npm run dev
