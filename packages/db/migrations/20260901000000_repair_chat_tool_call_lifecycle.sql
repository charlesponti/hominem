-- +goose Up
-- +goose StatementBegin
DO $$
DECLARE
  message_record RECORD;
  tool_call JSONB;
  repaired_tool_call JSONB;
  repaired_tool_calls JSONB;
  key_name TEXT;
  legacy_status TEXT;
  confirmation_status TEXT;
  execution_status TEXT;
BEGIN
  FOR message_record IN
    SELECT id, tool_calls
    FROM app.chat_messages
    WHERE tool_calls IS NOT NULL
  LOOP
    IF jsonb_typeof(message_record.tool_calls) <> 'array' THEN
      RAISE EXCEPTION
        'Cannot repair chat message %: tool_calls is not an array',
        message_record.id;
    END IF;

    repaired_tool_calls := '[]'::JSONB;

    FOR tool_call IN
      SELECT value
      FROM jsonb_array_elements(message_record.tool_calls)
    LOOP
      IF jsonb_typeof(tool_call) <> 'object' THEN
        RAISE EXCEPTION
          'Cannot repair chat message %: tool call is not an object',
          message_record.id;
      END IF;

      legacy_status := tool_call->>'status';
      repaired_tool_call := tool_call - 'status';

      IF tool_call ? 'status' THEN
        IF jsonb_typeof(tool_call->'status') <> 'string'
          OR legacy_status NOT IN ('completed', 'rejected')
        THEN
          RAISE EXCEPTION
            'Cannot repair chat message %: unsupported tool call status',
            message_record.id;
        END IF;

        IF legacy_status = 'completed' THEN
          IF tool_call ? 'executionStatus'
            AND tool_call->>'executionStatus' <> 'completed'
          THEN
            RAISE EXCEPTION
              'Cannot repair chat message %: conflicting tool call execution status',
              message_record.id;
          END IF;
          repaired_tool_call := repaired_tool_call
            || jsonb_build_object('executionStatus', 'completed');
        ELSE
          IF tool_call ? 'confirmationStatus'
            AND tool_call->>'confirmationStatus' <> 'rejected'
          THEN
            RAISE EXCEPTION
              'Cannot repair chat message %: conflicting tool call confirmation status',
              message_record.id;
          END IF;
          IF tool_call ? 'executionStatus'
            AND tool_call->>'executionStatus' <> 'pending'
          THEN
            RAISE EXCEPTION
              'Cannot repair chat message %: rejected tool call has execution state',
              message_record.id;
          END IF;
          repaired_tool_call := repaired_tool_call
            || jsonb_build_object('confirmationStatus', 'rejected');
        END IF;
      END IF;

      FOR key_name IN
        SELECT jsonb_object_keys(repaired_tool_call)
      LOOP
        IF key_name NOT IN (
          'args', 'type', 'toolName', 'toolCallId', 'confirmationStatus',
          'executionStatus', 'preview'
        ) THEN
          RAISE EXCEPTION
            'Cannot repair chat message %: unsupported tool call field',
            message_record.id;
        END IF;
      END LOOP;

      IF jsonb_typeof(repaired_tool_call->'args') <> 'object'
        OR jsonb_typeof(repaired_tool_call->'type') <> 'string'
        OR repaired_tool_call->>'type' <> 'tool-call'
        OR jsonb_typeof(repaired_tool_call->'toolName') <> 'string'
        OR repaired_tool_call->>'toolName' = ''
        OR jsonb_typeof(repaired_tool_call->'toolCallId') <> 'string'
        OR repaired_tool_call->>'toolCallId' = ''
      THEN
        RAISE EXCEPTION
          'Cannot repair chat message %: invalid tool call fields',
          message_record.id;
      END IF;

      IF repaired_tool_call ? 'preview'
        AND jsonb_typeof(repaired_tool_call->'preview') NOT IN ('object', 'null')
      THEN
        RAISE EXCEPTION
          'Cannot repair chat message %: invalid tool call preview',
          message_record.id;
      END IF;

      confirmation_status := repaired_tool_call->>'confirmationStatus';
      execution_status := repaired_tool_call->>'executionStatus';

      IF repaired_tool_call ? 'confirmationStatus'
        AND confirmation_status NOT IN ('pending', 'approved', 'rejected')
      THEN
        RAISE EXCEPTION
          'Cannot repair chat message %: invalid tool call confirmation status',
          message_record.id;
      END IF;

      IF repaired_tool_call ? 'executionStatus'
        AND execution_status NOT IN ('pending', 'running', 'completed', 'failed')
      THEN
        RAISE EXCEPTION
          'Cannot repair chat message %: invalid tool call execution status',
          message_record.id;
      END IF;

      IF confirmation_status = 'pending'
        AND execution_status IN ('completed', 'failed')
      THEN
        RAISE EXCEPTION
          'Cannot repair chat message %: pending confirmation has terminal execution',
          message_record.id;
      END IF;

      IF confirmation_status = 'rejected'
        AND execution_status IN ('running', 'completed', 'failed')
      THEN
        RAISE EXCEPTION
          'Cannot repair chat message %: rejected confirmation has execution state',
          message_record.id;
      END IF;

      repaired_tool_calls := repaired_tool_calls || jsonb_build_array(repaired_tool_call);
    END LOOP;

    IF repaired_tool_calls <> message_record.tool_calls THEN
      UPDATE app.chat_messages
      SET tool_calls = repaired_tool_calls,
          updatedat = now()
      WHERE id = message_record.id;
    END IF;
  END LOOP;
END $$;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DO $$
DECLARE
  message_record RECORD;
  tool_call JSONB;
  restored_tool_call JSONB;
  restored_tool_calls JSONB;
BEGIN
  FOR message_record IN
    SELECT id, tool_calls
    FROM app.chat_messages
    WHERE tool_calls IS NOT NULL
  LOOP
    restored_tool_calls := '[]'::JSONB;

    FOR tool_call IN
      SELECT value
      FROM jsonb_array_elements(message_record.tool_calls)
    LOOP
      restored_tool_call := tool_call;

      IF tool_call->>'executionStatus' = 'completed'
        AND NOT (tool_call ? 'confirmationStatus')
      THEN
        restored_tool_call := (tool_call - 'executionStatus')
          || jsonb_build_object('status', 'completed');
      ELSIF tool_call->>'confirmationStatus' = 'rejected'
        AND NOT (tool_call ? 'executionStatus')
      THEN
        restored_tool_call := (tool_call - 'confirmationStatus')
          || jsonb_build_object('status', 'rejected');
      END IF;

      restored_tool_calls := restored_tool_calls || jsonb_build_array(restored_tool_call);
    END LOOP;

    IF restored_tool_calls <> message_record.tool_calls THEN
      UPDATE app.chat_messages
      SET tool_calls = restored_tool_calls,
          updatedat = now()
      WHERE id = message_record.id;
    END IF;
  END LOOP;
END $$;
-- +goose StatementEnd
