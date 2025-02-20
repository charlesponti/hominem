APP_DB_URL=postgresql://postgres:postgres@localhost:4432/hominem
TEST_DB_URL=postgresql://postgres:postgres@localhost:4433/hominem-test

run-dev:
	@echo "Starting development server..."
	pm2 start npm --name="hominem" -- run dev

run-redis:
	@echo "Starting Redis..."
	pm2 start npm --name="hominem-redis" -- run redis

db-gen:
	@echo "Generating changes..."
	DATABASE_URL=$(APP_DB_URL) npx drizzle-kit generate
	@echo "Generating test changes..."
	DATABASE_URL=$(TEST_DB_URL) npx drizzle-kit generate

db-migrate:
	@echo "Migrating application database..."
	DATABASE_URL=$(APP_DB_URL) npx drizzle-kit migrate
	@echo "Migrating test database..."
	DATABASE_URL=$(TEST_DB_URL) npx drizzle-kit migrate

db-migrate-drop:
	@echo "Dropping migration..."
	DATABASE_URL=$(APP_DB_URL) npx drizzle-kit drop
