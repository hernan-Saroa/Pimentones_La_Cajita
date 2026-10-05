# scripts/logs.ps1 - Ver logs de contenedores en tiempo real
param(
    [string]$Service = ""
)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\.."

if ($Service) {
    docker compose logs -f --tail=200 $Service
} else {
    docker compose logs -f --tail=200
}
