include .env
export

goose-up:
	@echo "Migrating application database..."
	goose -dir ./migrations postgres "$(DATABASE_URL)" up
	@echo "Migrating test database..."
	goose -dir ./migrations postgres "$(TEST_DATABASE_URL)" up

goose-down:
	@echo "Rolling back latest migration on application database..."
	goose -dir ./migrations postgres "$(DATABASE_URL)" down

goose-status:
	@echo "Application database migration status..."
	goose -dir ./migrations postgres "$(DATABASE_URL)" status
