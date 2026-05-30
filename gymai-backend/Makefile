# Limpiar

.PHONY: clean
clean:
	@echo "Eliminando archivos de cache y reportes"
	# caches python/pytest
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache
	@echo "Limpieza completa."
