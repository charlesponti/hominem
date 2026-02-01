include .env
export

db-gen:
	@echo "Generating changes..."
	DATABASE_URL=$(DATABASE_URL) bunx drizzle-kit generate
	@echo "Generating test changes..."
	DATABASE_URL=$(TEST_DATABASE_URL) bunx drizzle-kit generate

db-migrate:
	@echo "Migrating application database..."
	DATABASE_URL=$(DATABASE_URL) bunx drizzle-kit migrate
	@echo "Migrating test database..."
	DATABASE_URL=$(TEST_DATABASE_URL) bunx drizzle-kit migrate

db-migrate-drop:
	@echo "Dropping migration..."
	DATABASE_URL=$(DATABASE_URL) bunx drizzle-kit drop
	@echo "Dropping test database migration..."
	DATABASE_URL=$(TEST_DATABASE_URL) bunx drizzle-kit drop
