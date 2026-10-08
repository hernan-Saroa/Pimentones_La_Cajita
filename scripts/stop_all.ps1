# =====================================================================
# Pimentones La Cajita - Script de Parada (stop_all.ps1)
# =====================================================================
$ErrorActionPreference = 'Continue'
Write-Host "==========================================================" -ForegroundColor Red
Write-Host "   DETENIENDO PLATAFORMA PIMENTONES LA CAJITA             " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Red

# 1. Detener procesos por puerto (4001, 3000, 3002)
$ports = @(4001, 3000, 3002)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $connections) {
        if ($c.OwningProcess -and $c.OwningProcess -ne 0) {
            Write-Host "Deteniendo proceso en puerto $port (PID $($c.OwningProcess))..." -ForegroundColor Cyan
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

# 2. Cerrar ventanas de PowerShell secundarias asociadas a la plataforma
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { 
    $_.CommandLine -match "pimentones-backend-api" -or 
    $_.CommandLine -match "pimentones-ecommerce-frontend" -or 
    $_.CommandLine -match "pimentones-backoffice-frontend" 
} | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

# 3. Detener contenedor Docker PostgreSQL
Write-Host "Deteniendo contenedor PostgreSQL en Docker..." -ForegroundColor Cyan
docker compose -f pimentones-scripts-infra\docker-compose.dev.yml stop db

Write-Host "Plataforma detenida con exito." -ForegroundColor Green
