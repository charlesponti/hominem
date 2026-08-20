-- +goose Up
-- +goose StatementBegin
DROP TRIGGER IF EXISTS app_chat_generation_runs_set_updated_at ON app.chat_generation_runs;

CREATE TRIGGER app_chat_generation_runs_set_updated_at
  BEFORE UPDATE ON app.chat_generation_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_snake();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS app_chat_generation_runs_set_updated_at ON app.chat_generation_runs;

CREATE TRIGGER app_chat_generation_runs_set_updated_at
  BEFORE UPDATE ON app.chat_generation_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- +goose StatementEnd
