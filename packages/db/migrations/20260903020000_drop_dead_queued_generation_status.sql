-- +goose Up
-- +goose StatementBegin
-- 'queued' was added to the status enum for forward-compat but no reducer
-- in packages/chat/src/generation-machine has ever produced it — every
-- generation starts directly at 'preparing'. Confirmed unused via a full
-- audit of the reducers before removing it here.
ALTER TABLE app.chat_generation_runs
  DROP CONSTRAINT app_chat_generation_runs_status_check,
  ADD CONSTRAINT app_chat_generation_runs_status_check
    CHECK (status IN (
      'preparing', 'running', 'cancel_requested', 'awaiting_confirmation',
      'saving', 'committed', 'cancelled', 'failed'
    ));
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE app.chat_generation_runs
  DROP CONSTRAINT app_chat_generation_runs_status_check,
  ADD CONSTRAINT app_chat_generation_runs_status_check
    CHECK (status IN (
      'preparing', 'queued', 'running', 'cancel_requested', 'awaiting_confirmation',
      'saving', 'committed', 'cancelled', 'failed'
    ));
-- +goose StatementEnd
