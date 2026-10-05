# scripts/smoke.ps1 - Prueba de humo (Smoke Test) para validar endpoints en Windows
param(
    [string]$Url = "http://localhost"
)

function Test-Endpoint {
    param([string]$Name, [scriptblock]$TestBlock)
    try {
        $result = & $TestBlock
        if ($result) {
            Write-Host "  [OK] $Name" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $Name" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "  [FAIL] $Name: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n>>> Ejecutando pruebas de humo en $Url..." -ForegroundColor Cyan

Test-Endpoint "Salud de API (/api/health)" {
    $res = Invoke-RestMethod -Uri "$Url/api/health" -Method Get
    return ($res.status -eq "ok" -or $res -ne $null)
}

Test-Endpoint "Catálogo de productos (/api/products)" {
    $products = Invoke-RestMethod -Uri "$Url/api/products" -Method Get
    return ($products.Count -gt 0)
}

Test-Endpoint "Documentación OpenAPI (/api/docs)" {
    $res = Invoke-WebRequest -Uri "$Url/api/docs" -Method Get -SkipHttpErrorCheck
    return ($res.StatusCode -eq 200)
}

Test-Endpoint "Sitemap XML (/sitemap.xml)" {
    $res = Invoke-WebRequest -Uri "$Url/sitemap.xml" -Method Get -SkipHttpErrorCheck
    return ($res.StatusCode -eq 200 -and $res.Content -like "*<urlset*")
}

Write-Host "`n>>> Todas las pruebas de humo pasaron correctamente!`n" -ForegroundColor Green
