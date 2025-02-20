APP_DB_URL=postgresql://postgres:postgres@localhost:4432/hominem
TEST_DB_URL=postgresql://postgres:postgres@localhost:4433/hominem-test

db-gen:
	@echo "Generating changes..."
	DATABASE_URL=$(APP_DB_URL) bunx drizzle-kit generate
	@echo "Generating test changes..."
	DATABASE_URL=$(TEST_DB_URL) bunx drizzle-kit generate

db-migrate:
	@echo "Migrating application database..."
	DATABASE_URL=$(APP_DB_URL) bunx drizzle-kit migrate
	@echo "Migrating test database..."
	DATABASE_URL=$(TEST_DB_URL) bunx drizzle-kit migrate

db-migrate-drop:
	@echo "Dropping migration..."
	DATABASE_URL=$(APP_DB_URL) bunx drizzle-kit drop
