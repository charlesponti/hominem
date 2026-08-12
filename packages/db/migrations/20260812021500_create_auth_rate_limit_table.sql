-- +goose Up
-- +goose StatementBegin

-- Better Auth's shared rate-limit store. The API selects this storage mode
-- explicitly so OTP limits apply across instances and restarts.
CREATE TABLE "rateLimit" (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  "lastRequest" BIGINT NOT NULL
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "rateLimit";
-- +goose StatementEnd
