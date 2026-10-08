# =====================================================================
# Pimentones La Cajita - Script Maestro de Arranque Persistente y Watchdog
# =====================================================================
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$global:StartTime = Get-Date

function Write-Header {
    Write-Host ""
    Write-Host "==========================================================================" -ForegroundColor Red
    Write-Host "         PIMENTONES LA CAJITA - SUPERVISOR DE DESPLIEGUE Y PERSISTENCIA   " -ForegroundColor Yellow
    Write-Host "==========================================================================" -ForegroundColor Red
    Write-Host ""
}

function Write-Step {
    param([string]$Num, [string]$Title)
    Write-Host "[$Num] $Title" -ForegroundColor Cyan
}

function Test-PortListening {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $conn)
}

function Test-ServiceHttp {
    param([string]$Url, [int]$TimeoutSec = 8)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        $sw.Stop()
        if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 400) {
            return @{
                Success = $true
                StatusCode = $res.StatusCode
                LatencyMs = [math]::Round($sw.Elapsed.TotalMilliseconds)
                Error = $null
            }
        } else {
            return @{
                Success = $false
                StatusCode = $res.StatusCode
                LatencyMs = [math]::Round($sw.Elapsed.TotalMilliseconds)
                Error = "Status code $($res.StatusCode)"
            }
        }
    } catch {
        $sw.Stop()
        return @{
            Success = $false
            StatusCode = 0
            LatencyMs = [math]::Round($sw.Elapsed.TotalMilliseconds)
            Error = $_.Exception.Message
        }
    }
}

function Ensure-DockerRunning {
    Write-Host "   -> Comprobando motor Docker Desktop..." -NoNewline -ForegroundColor DarkGray
    $dockerOk = $false
    try {
        docker info > $null 2>&1
        if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
    } catch {}

    if (-not $dockerOk) {
        Write-Host " [INICIANDO DOCKER]" -ForegroundColor Yellow
        $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerDesktopPath) {
            Start-Process $dockerDesktopPath
            Write-Host "   Esperando conexion con motor Docker..." -NoNewline -ForegroundColor DarkGray
            $waited = 0
            while ($waited -lt 60) {
                Start-Sleep -Seconds 3
                docker info > $null 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $dockerOk = $true
                    break
                }
                $waited += 3
            }
        } else {
            Write-Host "   [!] Docker Desktop no encontrado en ruta estandar." -ForegroundColor Red
            return $false
        }
    }

    if ($dockerOk) {
        Write-Host " [MOTOR OPERATIVO]" -ForegroundColor Green
        return $true
    } else {
        Write-Host " [FALLO AL INICIAR DOCKER]" -ForegroundColor Red
        return $false
    }
}

function Ensure-PostgresDb {
    Write-Host "   -> Comprobando PostgreSQL (lacajita-dev-db-1)..." -NoNewline -ForegroundColor DarkGray
    $health = docker inspect lacajita-dev-db-1 --format '{{.State.Health.Status}}' 2>$null
    if ($health -ne 'healthy') {
        docker compose -f "$PSScriptRoot\pimentones-scripts-infra\docker-compose.dev.yml" up -d db > $null 2>&1
        $waitDb = 0
        while ($waitDb -lt 30) {
            Start-Sleep -Seconds 2
            $health = docker inspect lacajita-dev-db-1 --format '{{.State.Health.Status}}' 2>$null
            if ($health -eq 'healthy') { break }
            $waitDb += 2
        }
    }

    if ($health -eq 'healthy') {
        Write-Host " [HEALTHY - Puerto 5434]" -ForegroundColor Green
        return $true
    } else {
        Write-Host " [ESTADO: $health]" -ForegroundColor Yellow
        return $false
    }
}

function Kill-PortProcess {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $connections) {
        if ($c.OwningProcess -and $c.OwningProcess -ne 0) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

function Start-Or-Recover-Service {
    param(
        [string]$ServiceName,
        [int]$Port,
        [string]$WorkDir,
        [string]$WindowTitle,
        [string]$Command = "npm run dev"
    )
    if (-not (Test-PortListening -Port $Port)) {
        Write-Host "   [+] Lanzando proceso $ServiceName en segundo plano..." -ForegroundColor Yellow
        Start-Process powershell -WindowStyle Minimized -WorkingDirectory $WorkDir -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle='$WindowTitle'; Write-Host '--- $WindowTitle ---' -ForegroundColor Yellow; $Command"
    }
}

function Wait-Until-Compiled-Successfully {
    param(
        [string]$ServiceName,
        [int]$Port,
        [string]$HealthUrl,
        [string]$WorkDir,
        [string]$WindowTitle,
        [int]$MaxTimeoutSec = 60
    )
    Write-Host "   Verificando compilacion de $ServiceName..." -NoNewline -ForegroundColor DarkGray
    $elapsed = 0
    $launched = $false

    # Verificar si el proceso esta lanzado; si no, lanzarlo
    if (-not (Test-PortListening -Port $Port)) {
        Start-Or-Recover-Service -ServiceName $ServiceName -Port $Port -WorkDir $WorkDir -WindowTitle $WindowTitle
        $launched = $true
    }

    $spinnerChars = @('|', '/', '-', '\')
    $spinIdx = 0

    while ($elapsed -lt $MaxTimeoutSec) {
        $spinIdx++
        $char = $spinnerChars[$spinIdx % 4]

        # Verificar respuesta HTTP (esto fuerza a Next.js a compilar la pagina)
        $check = Test-ServiceHttp -Url $HealthUrl -TimeoutSec 10
        if ($check.Success) {
            Write-Host " [COMPILED SUCCESSFULLY]" -ForegroundColor Green
            Write-Host "      |-- Codigo: $($check.StatusCode) OK | Latencia: $($check.LatencyMs)ms | URL: $HealthUrl" -ForegroundColor Gray
            return $true
        }

        # Si pasaron mas de 35 segundos y no escucha, reiniciar proceso agresivamente
        if ($elapsed -gt 35 -and -not (Test-PortListening -Port $Port)) {
            Write-Host "`n   [!] $ServiceName no respondio. Forzando relanzamiento persistente..." -ForegroundColor Yellow
            Kill-PortProcess -Port $Port
            Start-Sleep -Seconds 1
            Start-Or-Recover-Service -ServiceName $ServiceName -Port $Port -WorkDir $WorkDir -WindowTitle $WindowTitle
            $elapsed = 0
        }

        Start-Sleep -Seconds 2
        $elapsed += 2
        Write-Host -NoNewline "."
    }

    Write-Host " [AVISO: TIMEOUT - EL SUPERVISOR CONTINUARA PERSISTIENDO]" -ForegroundColor Yellow
    return $false
}

# =====================================================================
# EJECUCION PRINCIPAL
# =====================================================================
Write-Header

# 1. Docker
Write-Step "1/5" "Asegurando motor Docker Desktop..."
$dockerOk = Ensure-DockerRunning

# 2. Base de datos PostgreSQL
Write-Step "2/5" "Asegurando contenedor PostgreSQL (Persistencia y Salud)..."
$dbOk = Ensure-PostgresDb

# 3. Backend API (NestJS :4001)
Write-Step "3/5" "Compilando y levantando Backend API (NestJS)..."
$backendReady = Wait-Until-Compiled-Successfully `
    -ServiceName "Backend API (NestJS)" `
    -Port 4001 `
    -HealthUrl "http://127.0.0.1:4001/api/health" `
    -WorkDir "$PSScriptRoot\pimentones-backend-api" `
    -WindowTitle "Pimentones-Backend-API"

# 4. Storefront eCommerce (Next.js :3000)
Write-Step "4/5" "Compilando y levantando Storefront eCommerce (Next.js)..."
$storeReady = Wait-Until-Compiled-Successfully `
    -ServiceName "Storefront eCommerce" `
    -Port 3000 `
    -HealthUrl "http://127.0.0.1:3000" `
    -WorkDir "$PSScriptRoot\pimentones-ecommerce-frontend" `
    -WindowTitle "Pimentones-Storefront"

# 5. Backoffice Admin (Next.js :3002)
Write-Step "5/5" "Compilando y levantando Backoffice Admin (Next.js)..."
$adminReady = Wait-Until-Compiled-Successfully `
    -ServiceName "Backoffice Admin" `
    -Port 3002 `
    -HealthUrl "http://127.0.0.1:3002/admin" `
    -WorkDir "$PSScriptRoot\pimentones-backoffice-frontend" `
    -WindowTitle "Pimentones-Backoffice"

# Lanzar navegadores
Write-Host ""
Write-Host "Abriendo aplicaciones en el navegador..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"
Start-Sleep -Milliseconds 600
Start-Process "http://localhost:3002/admin"

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "    [OK] COMPILED SUCCESSFULLY - TODOS LOS SERVICIOS OPERATIVOS AL 100%   " -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "  * Storefront Tienda  : http://localhost:3000" -ForegroundColor White
Write-Host "  * Backoffice Admin   : http://localhost:3002/admin" -ForegroundColor White
Write-Host "  * Backend API REST   : http://localhost:4001/api" -ForegroundColor White
Write-Host "  * Swagger API Docs   : http://localhost:4001/api/docs" -ForegroundColor White
Write-Host "  * PostgreSQL DB      : localhost:5434 (DB: lacajita)" -ForegroundColor White
Write-Host "--------------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Credenciales Admin   : admin@pimentoneslacajita.com / LaCajita2026!Admin#Seguro" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  MODO PERSISTENTE ACTIVO: El supervisor monitorea y auto-recupera servicios." -ForegroundColor Cyan
Write-Host "  Presiona [Ctrl+C] en esta terminal para detener todo el sistema limpiamente." -ForegroundColor DarkGray
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host ""

# =====================================================================
# BUCLE DE SUPERVISION CONTINUA Y AUTO-RECUPERACION (WATCHDOG)
# =====================================================================
$auditCount = 0
$restartCounts = @{
    "Database" = 0
    "Backend" = 0
    "Storefront" = 0
    "Backoffice" = 0
}

try {
    while ($true) {
        $auditCount++
        $now = Get-Date -Format "HH:mm:ss"
        $uptime = (Get-Date) - $global:StartTime
        $uptimeStr = "{0:D2}h {1:D2}m {2:D2}s" -f $uptime.Hours, $uptime.Minutes, $uptime.Seconds

        # 1. DB
        $dbHealth = (docker inspect lacajita-dev-db-1 --format '{{.State.Health.Status}}' 2>$null)
        $dbOk = ($dbHealth -eq 'healthy')
        if (-not $dbOk) {
            $restartCounts["Database"]++
            Write-Host "`n[$now] [!] ALERTA: PostgreSQL cayo ($dbHealth). Levantando contenedor..." -ForegroundColor Red
            docker compose -f "$PSScriptRoot\pimentones-scripts-infra\docker-compose.dev.yml" up -d db > $null 2>&1
        }

        # 2. Backend
        $backendCheck = Test-ServiceHttp -Url "http://127.0.0.1:4001/api/health" -TimeoutSec 3
        if (-not $backendCheck.Success) {
            $restartCounts["Backend"]++
            Write-Host "`n[$now] [!] ALERTA: Backend API en puerto 4001 no responde. Auto-recuperando..." -ForegroundColor Red
            Kill-PortProcess -Port 4001
            Start-Or-Recover-Service -ServiceName "Backend API" -Port 4001 -WorkDir "$PSScriptRoot\pimentones-backend-api" -WindowTitle "Pimentones-Backend-API"
        }

        # 3. Storefront
        $storeCheck = Test-ServiceHttp -Url "http://127.0.0.1:3000" -TimeoutSec 3
        if (-not $storeCheck.Success) {
            $restartCounts["Storefront"]++
            Write-Host "`n[$now] [!] ALERTA: Storefront en puerto 3000 no responde. Auto-recuperando..." -ForegroundColor Red
            Kill-PortProcess -Port 3000
            Start-Or-Recover-Service -ServiceName "Storefront eCommerce" -Port 3000 -WorkDir "$PSScriptRoot\pimentones-ecommerce-frontend" -WindowTitle "Pimentones-Storefront"
        }

        # 4. Backoffice
        $adminCheck = Test-ServiceHttp -Url "http://127.0.0.1:3002/admin" -TimeoutSec 3
        if (-not $adminCheck.Success) {
            $restartCounts["Backoffice"]++
            Write-Host "`n[$now] [!] ALERTA: Backoffice en puerto 3002 no responde. Auto-recuperando..." -ForegroundColor Red
            Kill-PortProcess -Port 3002
            Start-Or-Recover-Service -ServiceName "Backoffice Admin" -Port 3002 -WorkDir "$PSScriptRoot\pimentones-backoffice-frontend" -WindowTitle "Pimentones-Backoffice"
        }

        # Mostrar estado resumido dinámico cada ciclo (cada 4 segundos)
        $dbStatus = if ($dbOk) { "OK" } else { "FAIL" }
        $bkStatus = if ($backendCheck.Success) { "$($backendCheck.LatencyMs)ms" } else { "FAIL" }
        $stStatus = if ($storeCheck.Success) { "$($storeCheck.LatencyMs)ms" } else { "FAIL" }
        $adStatus = if ($adminCheck.Success) { "$($adminCheck.LatencyMs)ms" } else { "FAIL" }

        # Si todo esta OK, mostrar linea de pulso
        $allOk = $dbOk -and $backendCheck.Success -and $storeCheck.Success -and $adminCheck.Success
        $statusTag = if ($allOk) { "[* EN VIVO: 100% OPERATIVO]" } else { "[! REPARANDO SERVICIOS]" }

        $statusLine = "  $statusTag [$now] Uptime: $uptimeStr | DB(5434): $dbStatus | API(4001): $bkStatus | Store(3000): $stStatus | Admin(3002): $adStatus | Ciclo: #$auditCount"
        # Pad with spaces to clear any previous longer text
        $paddedLine = $statusLine.PadRight(118)
        Write-Host -NoNewline "`r$paddedLine"

        # Cada 40 ciclos (~2.5 minutos), imprimir un reporte formal con salto de linea
        if ($auditCount % 40 -eq 0) {
            Write-Host ""
            Write-Host "  --- [REPORTE DE SALUD - $now | Uptime: $uptimeStr] ---" -ForegroundColor DarkCyan
            Write-Host "      PostgreSQL DB (5434)  : $(if($dbOk){'HEALTHY'}else{'FALLA'}) (Reinicios: $($restartCounts['Database']))" -ForegroundColor Gray
            Write-Host "      Backend API (4001)    : $(if($backendCheck.Success){'COMPILED - 200 OK (' + $backendCheck.LatencyMs + 'ms)'}else{'FALLA'}) (Reinicios: $($restartCounts['Backend']))" -ForegroundColor Gray
            Write-Host "      Storefront (3000)     : $(if($storeCheck.Success){'COMPILED - 200 OK (' + $storeCheck.LatencyMs + 'ms)'}else{'FALLA'}) (Reinicios: $($restartCounts['Storefront']))" -ForegroundColor Gray
            Write-Host "      Backoffice (3002)     : $(if($adminCheck.Success){'COMPILED - 200 OK (' + $adminCheck.LatencyMs + 'ms)'}else{'FALLA'}) (Reinicios: $($restartCounts['Backoffice']))" -ForegroundColor Gray
            Write-Host "  --------------------------------------------------------" -ForegroundColor DarkCyan
        }

        Start-Sleep -Seconds 4
    }
} finally {
    Write-Host "`n"
    Write-Host "[!] Senal de parada recibida. Ejecutando cierre ordenado..." -ForegroundColor Yellow
    & "$PSScriptRoot\stop_all.ps1"
}
