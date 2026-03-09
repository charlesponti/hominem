include .env
export

goose-install:
	@bash ../../scripts/install-goose.sh

goose-up: goose-install
	@echo "Migrating application database..."
	DATABASE_URL=$(DATABASE_URL) goose-migrate -dir ./migrations postgres "$(DATABASE_URL)" up
	@echo "Migrating test database..."
	DATABASE_URL=$(TEST_DATABASE_URL) goose-migrate -dir ./migrations postgres "$(TEST_DATABASE_URL)" up

goose-down: goose-install
	@echo "Rolling back latest migration on application database..."
	goose-migrate -dir ./migrations postgres "$(DATABASE_URL)" down

goose-status: goose-install
	@echo "Application database migration status..."
	goose-migrate -dir ./migrations postgres "$(DATABASE_URL)" status
