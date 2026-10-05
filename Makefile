# Atajos. `make help` lista todo.
.DEFAULT_GOAL := help
help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
dev: ## Desarrollo local (DB en Docker, apps con recarga)
	@scripts/dev.sh
up: ## Producción: construir y levantar todo
	@scripts/up.sh
deploy: ## Desplegar nueva versión (TAG=git sha)
	@scripts/deploy.sh
rollback: ## Volver a una versión: make rollback TAG=abc123
	@scripts/rollback.sh $(TAG)
down: ## Detener todo (conserva datos)
	docker compose down
logs: ## Logs en vivo: make logs S=api
	@scripts/logs.sh $(S)
backup: ## Respaldo inmediato de la base de datos
	@scripts/backup.sh
restore: ## Restaurar: make restore F=backups/archivo.dump.gz
	@scripts/restore.sh $(F)
smoke: ## Prueba de humo: make smoke URL=https://...
	@scripts/smoke.sh $(URL)
test: ## Pruebas unitarias de la API
	npm test -w apps/api
build: ## Compilar shared, API y web (sin Docker)
	npm run build
