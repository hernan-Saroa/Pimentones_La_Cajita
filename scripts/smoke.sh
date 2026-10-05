#!/usr/bin/env bash
# Prueba de humo tras un despliegue: salud, catálogo, página de producto y documentación.
set -euo pipefail
URL=${1:-${SITE_URL:-http://localhost}}
ok(){ printf '  ✓ %s\n' "$1"; }; fail(){ printf '  ✗ %s\n' "$1"; exit 1; }
curl -fs "$URL/api/health" > /dev/null && ok "API responde" || fail "API no responde"
N=$(curl -fs "$URL/api/products" | tr -d '\r' | grep -o '"slug"' | wc -l); [ "$N" -gt 0 ] && ok "$N productos" || fail "catálogo vacío"
SLUG=$(curl -fs "$URL/api/products" | tr -d '\r' | grep -o '"slug":"[^"]*"' | head -1 | cut -d'"' -f4)
curl -fs "$URL/producto/$SLUG" | grep -q 'application/ld+json' && ok "ficha de producto con datos para Google" || fail "ficha sin datos estructurados"
curl -fs "$URL/sitemap.xml" | grep -q '<loc>' && ok "sitemap" || fail "sitemap"
curl -fs -o /dev/null -w '%{http_code}' "$URL/api/docs" | grep -q 200 && ok "documentación OpenAPI" || fail "OpenAPI"
echo "Humo OK en $URL"
