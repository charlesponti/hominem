table "__drizzle_migrations" {
  schema = schema.drizzle
  column "id" {
    null = false
    type = serial
  }
  column "hash" {
    null = false
    type = text
  }
  column "created_at" {
    null = true
    type = bigint
  }
  primary_key {
    columns = [column.id]
  }
}
table "auth_refresh_tokens" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "session_id" {
    null = false
    type = uuid
  }
  column "family_id" {
    null = false
    type = uuid
  }
  column "parent_id" {
    null = true
    type = uuid
  }
  column "token_hash" {
    null = false
    type = text
  }
  column "expires_at" {
    null = false
    type = timestamptz
  }
  column "used_at" {
    null = true
    type = timestamptz
  }
  column "revoked_at" {
    null = true
    type = timestamptz
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "auth_refresh_tokens_session_id_fkey" {
    columns     = [column.session_id]
    ref_columns = [table.auth_sessions.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "auth_refresh_tokens_family_id_idx" {
    columns = [column.family_id]
  }
  index "auth_refresh_tokens_session_id_idx" {
    columns = [column.session_id]
  }
}
table "auth_sessions" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "session_state" {
    null = false
    type = text
  }
  column "acr" {
    null = true
    type = text
  }
  column "amr" {
    null    = true
    type    = jsonb
    default = "[]"
  }
  column "ip_hash" {
    null = true
    type = text
  }
  column "user_agent_hash" {
    null = true
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "last_seen_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "revoked_at" {
    null = true
    type = timestamptz
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "auth_sessions_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "auth_sessions_user_id_idx" {
    columns = [column.user_id]
  }
}
table "auth_subjects" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "provider" {
    null = false
    type = text
  }
  column "provider_subject" {
    null = false
    type = text
  }
  column "is_primary" {
    null    = true
    type    = boolean
    default = false
  }
  column "linked_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "unlinked_at" {
    null = true
    type = timestamptz
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "auth_subjects_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  unique "auth_subjects_provider_provider_subject_key" {
    columns = [column.provider, column.provider_subject]
  }
}
table "bookmarks" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "url" {
    null = false
    type = text
  }
  column "title" {
    null = true
    type = text
  }
  column "description" {
    null = true
    type = text
  }
  column "favicon" {
    null = true
    type = text
  }
  column "thumbnail" {
    null = true
    type = text
  }
  column "source" {
    null = true
    type = text
  }
  column "folder" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "search_vector" {
    null = true
    type = tsvector
    as {
      expr = "to_tsvector('english'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(url, ''::text)))"
      type = STORED
    }
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "bookmarks_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "bookmarks_folder_idx" {
    columns = [column.user_id, column.folder]
    where   = "(folder IS NOT NULL)"
  }
  index "bookmarks_search_idx" {
    columns = [column.search_vector]
    type    = GIN
  }
  index "bookmarks_user_idx" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.created_at
    }
  }
  unique "bookmarks_user_id_url_key" {
    columns = [column.user_id, column.url]
  }
}
table "budget_goals" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "category_id" {
    null = true
    type = uuid
  }
  column "target_amount" {
    null = false
    type = numeric(12,2)
  }
  column "target_period" {
    null = false
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "budget_goals_category_id_fkey" {
    columns     = [column.category_id]
    ref_columns = [table.tags.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "budget_goals_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "budget_goals_category_id_idx" {
    columns = [column.category_id]
  }
  index "budget_goals_user_id_idx" {
    columns = [column.user_id]
  }
  check "budget_goals_target_amount_check" {
    expr = "(target_amount >= (0)::numeric)"
  }
  unique "budget_goals_user_id_category_id_target_period_key" {
    columns = [column.user_id, column.category_id, column.target_period]
  }
}
table "calendar_attendees" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "event_id" {
    null = false
    type = uuid
  }
  column "person_id" {
    null = true
    type = uuid
  }
  column "email" {
    null = true
    type = text
  }
  column "status" {
    null    = true
    type    = text
    default = "needs_action"
  }
  column "role" {
    null    = true
    type    = text
    default = "required"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "calendar_attendees_event_id_fkey" {
    columns     = [column.event_id]
    ref_columns = [table.calendar_events.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "calendar_attendees_person_id_fkey" {
    columns     = [column.person_id]
    ref_columns = [table.persons.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "calendar_attendees_event_idx" {
    columns = [column.event_id]
  }
  index "calendar_attendees_person_idx" {
    columns = [column.person_id]
  }
}
table "calendar_events" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "event_type" {
    null = false
    type = text
  }
  column "title" {
    null = false
    type = text
  }
  column "description" {
    null = true
    type = text
  }
  column "start_time" {
    null = false
    type = timestamptz
  }
  column "end_time" {
    null = true
    type = timestamptz
  }
  column "all_day" {
    null    = true
    type    = boolean
    default = false
  }
  column "location" {
    null = true
    type = text
  }
  column "location_coords" {
    null = true
    type = jsonb
  }
  column "source" {
    null = true
    type = text
  }
  column "external_id" {
    null = true
    type = text
  }
  column "color" {
    null = true
    type = text
  }
  column "recurring" {
    null = true
    type = jsonb
  }
  column "metadata" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "search_vector" {
    null = true
    type = tsvector
    as {
      expr = "to_tsvector('english'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(location, ''::text)))"
      type = STORED
    }
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "calendar_events_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "calendar_events_agenda_idx" {
    columns = [column.user_id, column.start_time, column.end_time, column.all_day]
    include = [column.title, column.color]
  }
  index "calendar_events_search_idx" {
    columns = [column.search_vector]
    type    = GIN
  }
  index "calendar_events_user_time_idx" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.start_time
    }
   }
}
table "chat" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "title" {
    null = false
    type = text
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "note_id" {
    null = true
    type = uuid
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "chat_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "chat_note_id_fkey" {
    columns     = [column.note_id]
    ref_columns = [table.notes.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "chat_user_idx" {
    columns = [column.user_id]
  }
  index "chat_note_idx" {
    columns = [column.note_id]
  }
}
table "chat_message" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "chat_id" {
    null = false
    type = uuid
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "role" {
    null = false
    type = text
  }
  column "content" {
    null = false
    type = text
  }
  column "files" {
    null = true
    type = jsonb
  }
  column "tool_calls" {
    null = true
    type = jsonb
  }
  column "reasoning" {
    null = true
    type = text
  }
  column "parent_message_id" {
    null = true
    type = uuid
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "chat_message_chat_id_fkey" {
    columns     = [column.chat_id]
    ref_columns = [table.chat.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "chat_message_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "chat_message_parent_id_fkey" {
    columns     = [column.parent_message_id]
    ref_columns = [table.chat_message.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  index "chat_message_chat_idx" {
    columns = [column.chat_id]
  }
  index "chat_message_user_idx" {
    columns = [column.user_id]
  }
}
table "career_applications" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "job_id" {
    null = false
    type = uuid
  }
  column "applied_at" {
    null = true
    type = date
  }
  column "status" {
    null    = true
    type    = text
    default = "applied"
  }
  column "stage" {
    null = true
    type = text
  }
  column "outcome" {
    null = true
    type = text
  }
  column "notes" {
    null = true
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "career_applications_job_id_fkey" {
    columns     = [column.job_id]
    ref_columns = [table.career_jobs.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "career_applications_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "career_applications_job_idx" {
    columns = [column.job_id]
  }
  index "career_applications_user_idx" {
    columns = [column.user_id, column.stage]
  }
}
table "career_companies" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "name" {
    null = false
    type = text
  }
  column "industry" {
    null = true
    type = text
  }
  column "size" {
    null = true
    type = text
  }
  column "website" {
    null = true
    type = text
  }
  column "logo_url" {
    null = true
    type = text
  }
  column "notes" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "career_companies_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "career_companies_name_trgm" {
    type = GIN
    on {
      column = column.name
      ops    = "public.gin_trgm_ops"
    }
  }
  index "career_companies_user_idx" {
    columns = [column.user_id]
  }
}
table "career_interviews" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "application_id" {
    null = false
    type = uuid
  }
  column "scheduled_at" {
    null = true
    type = timestamptz
  }
  column "format" {
    null = true
    type = text
  }
  column "type" {
    null = true
    type = text
  }
  column "interviewers" {
    null    = true
    type    = jsonb
    default = "[]"
  }
  column "feedback" {
    null = true
    type = text
  }
  column "outcome" {
    null = true
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "career_interviews_application_id_fkey" {
    columns     = [column.application_id]
    ref_columns = [table.career_applications.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "career_interviews_application_idx" {
    columns = [column.application_id]
  }
}
table "career_jobs" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "company_id" {
    null = true
    type = uuid
  }
  column "title" {
    null = false
    type = text
  }
  column "location" {
    null = true
    type = text
  }
  column "remote_type" {
    null = true
    type = text
  }
  column "salary_min" {
    null = true
    type = bigint
  }
  column "salary_max" {
    null = true
    type = bigint
  }
  column "salary_currency" {
    null    = true
    type    = text
    default = "USD"
  }
  column "url" {
    null = true
    type = text
  }
  column "status" {
    null    = true
    type    = text
    default = "interested"
  }
  column "notes" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "career_jobs_company_id_fkey" {
    columns     = [column.company_id]
    ref_columns = [table.career_companies.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "career_jobs_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "career_jobs_user_idx" {
    columns = [column.user_id, column.status]
  }
}
table "contacts" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "first_name" {
    null = false
    type = text
  }
  column "last_name" {
    null = true
    type = text
  }
  column "email" {
    null = true
    type = text
  }
  column "phone" {
    null = true
    type = text
  }
  column "linkedin_url" {
    null = true
    type = text
  }
  column "title" {
    null = true
    type = text
  }
  column "notes" {
    null = true
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "contacts_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "contact_email_idx" {
    columns = [column.email]
  }
  index "contact_user_id_idx" {
    columns = [column.user_id]
  }
}
table "finance_accounts" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "name" {
    null = false
    type = text
  }
  column "account_type" {
    null = false
    type = text
  }
  column "institution_name" {
    null = true
    type = text
  }
  column "institution_id" {
    null = true
    type = text
  }
  column "balance" {
    null    = true
    type    = numeric(12,2)
    default = 0
  }
  column "currency" {
    null    = true
    type    = text
    default = "USD"
  }
  column "is_active" {
    null    = true
    type    = boolean
    default = true
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "finance_accounts_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "finance_accounts_active_idx" {
    columns = [column.user_id, column.account_type]
    where   = "(is_active = true)"
  }
  index "finance_accounts_user_idx" {
    columns = [column.user_id]
  }
}
table "finance_transactions" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "account_id" {
    null = false
    type = uuid
  }
  column "amount" {
    null = false
    type = numeric(12,2)
  }
  column "transaction_type" {
    null = false
    type = text
  }
  column "category_id" {
    null = true
    type = uuid
  }
  column "category" {
    null = true
    type = text
  }
  column "description" {
    null = true
    type = text
  }
  column "merchant_name" {
    null = true
    type = text
  }
  column "date" {
    null = false
    type = date
  }
  column "date_raw" {
    null = true
    type = text
  }
  column "pending" {
    null    = true
    type    = boolean
    default = false
  }
  column "source" {
    null = true
    type = text
  }
  column "external_id" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id, column.date]
  }
  index "finance_transactions_account_idx" {
    on {
      column = column.account_id
    }
    on {
      desc   = true
      column = column.date
    }
  }
  index "finance_transactions_date_brin" {
    columns = [column.date]
    type    = BRIN
    storage_params {
      pages_per_range = 32
    }
  }
  index "finance_transactions_pending_idx" {
    where = "(pending = true)"
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.date
    }
  }
  index "finance_transactions_user_account_date_id_idx" {
    on {
      column = column.user_id
    }
    on {
      column = column.account_id
    }
    on {
      desc   = true
      column = column.date
    }
    on {
      desc   = true
      column = column.id
    }
  }
  index "finance_transactions_user_date_id_idx" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.date
    }
    on {
      desc   = true
      column = column.id
    }
  }
  index "finance_transactions_user_date_idx" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.date
    }
  }
  partition {
    type    = RANGE
    columns = [column.date]
  }
}
table "financial_institutions" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "name" {
    null = false
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  index "financial_institutions_name_idx" {
    unique  = true
    columns = [column.name]
  }
}
table "goals" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "title" {
    null = false
    type = text
  }
  column "description" {
    null = true
    type = text
  }
  column "target_date" {
    null = true
    type = timestamptz
  }
  column "status" {
    null    = true
    type    = text
    default = "active"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "goals_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "goals_user_status_idx" {
    columns = [column.user_id, column.status]
  }
}
table "health_records" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "record_type" {
    null = false
    type = text
  }
  column "value" {
    null = true
    type = numeric(10,2)
  }
  column "unit" {
    null = true
    type = text
  }
  column "source" {
    null = true
    type = text
  }
  column "metadata" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "recorded_at" {
    null = false
    type = timestamptz
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id, column.recorded_at]
  }
  index "health_records_recorded_brin" {
    columns = [column.recorded_at]
    type    = BRIN
  }
  index "health_records_type_idx" {
    on {
      column = column.user_id
    }
    on {
      column = column.record_type
    }
    on {
      desc   = true
      column = column.recorded_at
    }
  }
  index "health_records_user_recorded_idx" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.recorded_at
    }
  }
  partition {
    type    = RANGE
    columns = [column.recorded_at]
  }
}
table "key_results" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "goal_id" {
    null = false
    type = uuid
  }
  column "title" {
    null = false
    type = text
  }
  column "target_value" {
    null = true
    type = numeric(10,2)
  }
  column "current_value" {
    null = true
    type = numeric(10,2)
  }
  column "unit" {
    null = true
    type = text
  }
  column "due_date" {
    null = true
    type = timestamptz
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "key_results_goal_id_fkey" {
    columns     = [column.goal_id]
    ref_columns = [table.goals.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "key_results_goal_idx" {
    columns = [column.goal_id]
  }
}
table "logs" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "action" {
    null = false
    type = text
  }
  column "entity_type" {
    null = true
    type = text
  }
  column "entity_id" {
    null = true
    type = uuid
  }
  column "metadata" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id, column.created_at]
  }
  index "logs_created_brin" {
    columns = [column.created_at]
    type    = BRIN
  }
  index "logs_entity_idx" {
    where = "(entity_type IS NOT NULL)"
    on {
      column = column.entity_type
    }
    on {
      column = column.entity_id
    }
    on {
      desc   = true
      column = column.created_at
    }
  }
  index "logs_user_created_idx" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.created_at
    }
  }
  partition {
    type    = RANGE
    columns = [column.created_at]
  }
}
table "music_albums" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "external_id" {
    null = true
    type = text
  }
  column "source" {
    null = false
    type = text
  }
  column "title" {
    null = false
    type = text
  }
  column "artist_name" {
    null = true
    type = text
  }
  column "release_date" {
    null = true
    type = text
  }
  column "album_art_url" {
    null = true
    type = text
  }
  column "genre" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "music_albums_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "music_albums_user_idx" {
    columns = [column.user_id, column.source]
  }
}
table "music_artists" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "external_id" {
    null = true
    type = text
  }
  column "source" {
    null = false
    type = text
  }
  column "name" {
    null = false
    type = text
  }
  column "image_url" {
    null = true
    type = text
  }
  column "genre" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "music_artists_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "music_artists_external_idx" {
    columns = [column.source, column.external_id]
  }
  index "music_artists_name_trgm" {
    type = GIN
    on {
      column = column.name
      ops    = "public.gin_trgm_ops"
    }
  }
  index "music_artists_user_idx" {
    columns = [column.user_id, column.source]
  }
}
table "music_liked" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "track_id" {
    null = false
    type = uuid
  }
  column "source" {
    null = false
    type = text
  }
  column "liked_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "music_liked_track_id_fkey" {
    columns     = [column.track_id]
    ref_columns = [table.music_tracks.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "music_liked_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "music_liked_user_idx" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.liked_at
    }
  }
  unique "music_liked_user_id_track_id_key" {
    columns = [column.user_id, column.track_id]
  }
}
table "music_listening" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "track_id" {
    null = true
    type = uuid
  }
  column "source" {
    null = false
    type = text
  }
  column "started_at" {
    null = false
    type = timestamptz
  }
  column "ended_at" {
    null = true
    type = timestamptz
  }
  column "duration_seconds" {
    null = true
    type = integer
  }
  column "completed" {
    null    = true
    type    = boolean
    default = false
  }
  column "context_type" {
    null = true
    type = text
  }
  column "context_id" {
    null = true
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id, column.started_at]
  }
  index "music_listening_started_brin" {
    columns = [column.started_at]
    type    = BRIN
  }
  index "music_listening_user_started_idx" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.started_at
    }
  }
  partition {
    type    = RANGE
    columns = [column.started_at]
  }
}
table "music_playlist_tracks" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "playlist_id" {
    null = false
    type = uuid
  }
  column "track_id" {
    null = false
    type = uuid
  }
  column "position" {
    null = false
    type = integer
  }
  column "added_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "music_playlist_tracks_playlist_id_fkey" {
    columns     = [column.playlist_id]
    ref_columns = [table.music_playlists.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "music_playlist_tracks_track_id_fkey" {
    columns     = [column.track_id]
    ref_columns = [table.music_tracks.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "music_playlist_tracks_playlist_idx" {
    columns = [column.playlist_id, column.position]
  }
  index "music_playlist_tracks_track_idx" {
    columns = [column.track_id]
  }
  unique "music_playlist_tracks_playlist_id_track_id_key" {
    columns = [column.playlist_id, column.track_id]
  }
}
table "music_playlists" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "external_id" {
    null = true
    type = text
  }
  column "source" {
    null = false
    type = text
  }
  column "name" {
    null = false
    type = text
  }
  column "description" {
    null = true
    type = text
  }
  column "image_url" {
    null = true
    type = text
  }
  column "is_public" {
    null    = true
    type    = boolean
    default = false
  }
  column "track_count" {
    null    = true
    type    = integer
    default = 0
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "music_playlists_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "music_playlists_user_idx" {
    columns = [column.user_id, column.source]
  }
}
table "music_tracks" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "external_id" {
    null = true
    type = text
  }
  column "source" {
    null = false
    type = text
  }
  column "title" {
    null = false
    type = text
  }
  column "artist_name" {
    null = true
    type = text
  }
  column "album_name" {
    null = true
    type = text
  }
  column "album_art_url" {
    null = true
    type = text
  }
  column "duration_seconds" {
    null = true
    type = integer
  }
  column "track_number" {
    null = true
    type = integer
  }
  column "disc_number" {
    null = true
    type = integer
  }
  column "isrc" {
    null = true
    type = text
  }
  column "genre" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "search_vector" {
    null = true
    type = tsvector
    as {
      expr = "to_tsvector('simple'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE(artist_name, ''::text)) || ' '::text) || COALESCE(album_name, ''::text)))"
      type = STORED
    }
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "music_tracks_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "music_tracks_external_idx" {
    columns = [column.source, column.external_id]
  }
  index "music_tracks_isrc_idx" {
    columns = [column.isrc]
    where   = "(isrc IS NOT NULL)"
  }
  index "music_tracks_search_idx" {
    columns = [column.search_vector]
    type    = GIN
  }
  index "music_tracks_user_idx" {
    columns = [column.user_id, column.source]
  }
}
table "note_shares" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "note_id" {
    null = false
    type = uuid
  }
  column "shared_with_user_id" {
    null = false
    type = uuid
  }
  column "permission" {
    null    = true
    type    = text
    default = "read"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "note_shares_note_id_fkey" {
    columns     = [column.note_id]
    ref_columns = [table.notes.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "note_shares_shared_with_user_id_fkey" {
    columns     = [column.shared_with_user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "note_shares_note_idx" {
    columns = [column.note_id]
  }
  index "note_shares_user_idx" {
    columns = [column.shared_with_user_id]
  }
  unique "note_shares_note_id_shared_with_user_id_key" {
    columns = [column.note_id, column.shared_with_user_id]
  }
}
table "note_tags" {
  schema = schema.public
  column "note_id" {
    null = false
    type = uuid
  }
  column "tag_id" {
    null = false
    type = uuid
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.note_id, column.tag_id]
  }
  foreign_key "note_tags_note_id_fkey" {
    columns     = [column.note_id]
    ref_columns = [table.notes.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "note_tags_tag_id_fkey" {
    columns     = [column.tag_id]
    ref_columns = [table.tags.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "note_tags_note_idx" {
    columns = [column.note_id]
  }
  index "note_tags_tag_idx" {
    columns = [column.tag_id]
  }
}
table "notes" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "title" {
    null = true
    type = text
  }
  column "content" {
    null = true
    type = text
  }
  column "source" {
    null = true
    type = text
  }
  column "is_locked" {
    null    = true
    type    = boolean
    default = false
  }
  column "folder" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "search_vector" {
    null = true
    type = tsvector
    as {
      expr = "to_tsvector('english'::regconfig, ((COALESCE(title, ''::text) || ' '::text) || COALESCE(content, ''::text)))"
      type = STORED
    }
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "type" {
    null    = false
    type    = text
    default = "note"
  }
  column "status" {
    null    = false
    type    = text
    default = "draft"
  }
  column "excerpt" {
    null = true
    type = text
  }
  column "mentions" {
    null    = true
    type    = jsonb
    default = "[]"
  }
  column "analysis" {
    null = true
    type = jsonb
  }
  column "publishing_metadata" {
    null = true
    type = jsonb
  }
  column "parent_note_id" {
    null = true
    type = uuid
  }
  column "version_number" {
    null    = false
    type    = integer
    default = 1
  }
  column "is_latest_version" {
    null    = false
    type    = boolean
    default = true
  }
  column "published_at" {
    null = true
    type = timestamptz
  }
  column "scheduled_for" {
    null = true
    type = timestamptz
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "notes_parent_fk" {
    columns     = [column.parent_note_id]
    ref_columns = [table.notes.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "notes_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "notes_latest_idx" {
    columns = [column.is_latest_version]
  }
  index "notes_parent_idx" {
    columns = [column.parent_note_id]
  }
  index "notes_published_at_idx" {
    columns = [column.published_at]
  }
  index "notes_search_idx" {
    columns = [column.search_vector]
    type    = GIN
  }
  index "notes_status_idx" {
    columns = [column.status]
  }
  index "notes_type_idx" {
    columns = [column.type]
  }
  index "notes_user_unlocked_idx" {
    where = "(is_locked = false)"
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.updated_at
    }
  }
  index "notes_user_updated_idx" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.updated_at
    }
  }
  index "notes_version_idx" {
    columns = [column.parent_note_id, column.version_number]
  }
}
table "persons" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "owner_user_id" {
    null = false
    type = uuid
  }
  column "person_type" {
    null = false
    type = text
  }
  column "first_name" {
    null = true
    type = text
  }
  column "last_name" {
    null = true
    type = text
  }
  column "email" {
    null = true
    type = text
  }
  column "phone" {
    null = true
    type = text
  }
  column "avatar_url" {
    null = true
    type = text
  }
  column "notes" {
    null = true
    type = text
  }
  column "metadata" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "date_started" {
    null = true
    type = timestamptz
  }
  column "date_ended" {
    null = true
    type = timestamptz
  }
  column "search_vector" {
    null = true
    type = tsvector
    as {
      expr = "to_tsvector('simple'::regconfig, ((((((COALESCE(first_name, ''::text) || ' '::text) || COALESCE(last_name, ''::text)) || ' '::text) || COALESCE(email, ''::text)) || ' '::text) || COALESCE(phone, ''::text)))"
      type = STORED
    }
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "persons_owner_user_id_fkey" {
    columns     = [column.owner_user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "persons_email_idx" {
    columns = [column.owner_user_id, column.email]
  }
  index "persons_name_trgm_idx" {
    type = GIN
    on {
      expr = "(((COALESCE(first_name, ''::text) || ' '::text) || COALESCE(last_name, ''::text)))"
      ops  = "public.gin_trgm_ops"
    }
  }
  index "persons_owner_idx" {
    columns = [column.owner_user_id, column.person_type]
  }
  index "persons_search_idx" {
    columns = [column.search_vector]
    type    = GIN
  }
}
table "places" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "name" {
    null = false
    type = text
  }
  column "address" {
    null = true
    type = text
  }
  column "latitude" {
    null = true
    type = numeric(10,8)
  }
  column "longitude" {
    null = true
    type = numeric(11,8)
  }
  column "location" {
    null = true
    type = sql("public.geography(Point,4326)")
  }
  column "place_type" {
    null = true
    type = text
  }
  column "rating" {
    null = true
    type = numeric(2,1)
  }
  column "notes" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "places_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "places_location_idx" {
    columns = [column.location]
    type    = GIST
  }
  index "places_type_idx" {
    columns = [column.user_id, column.place_type]
  }
  index "places_user_idx" {
    columns = [column.user_id]
  }
}
table "plaid_items" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "item_id" {
    null = false
    type = text
  }
  column "institution_id" {
    null = true
    type = uuid
  }
  column "cursor" {
    null = true
    type = text
  }
  column "access_token" {
    null = true
    type = text
  }
  column "status" {
    null    = true
    type    = text
    default = "healthy"
  }
  column "error" {
    null = true
    type = text
  }
  column "last_synced_at" {
    null = true
    type = timestamptz
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "plaid_items_institution_id_fkey" {
    columns     = [column.institution_id]
    ref_columns = [table.financial_institutions.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "plaid_items_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "plaid_items_item_id_idx" {
    on {
      column = column.item_id
    }
    on {
      desc   = true
      column = column.created_at
    }
  }
  index "plaid_items_user_id_idx" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.created_at
    }
  }
  unique "plaid_items_user_id_item_id_key" {
    columns = [column.user_id, column.item_id]
  }
}
table "possession_containers" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "name" {
    null = false
    type = text
  }
  column "location" {
    null = true
    type = text
  }
  column "description" {
    null = true
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "possession_containers_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "possession_containers_user_idx" {
    columns = [column.user_id]
  }
}
table "possessions" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "container_id" {
    null = true
    type = uuid
  }
  column "name" {
    null = false
    type = text
  }
  column "description" {
    null = true
    type = text
  }
  column "category" {
    null = true
    type = text
  }
  column "purchase_date" {
    null = true
    type = date
  }
  column "purchase_price" {
    null = true
    type = numeric(10,2)
  }
  column "current_value" {
    null = true
    type = numeric(10,2)
  }
  column "condition" {
    null = true
    type = text
  }
  column "location" {
    null = true
    type = text
  }
  column "serial_number" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "possessions_container_id_fkey" {
    columns     = [column.container_id]
    ref_columns = [table.possession_containers.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "possessions_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "possessions_category_idx" {
    columns = [column.user_id, column.category]
  }
  index "possessions_container_idx" {
    columns = [column.container_id]
  }
  index "possessions_user_idx" {
    columns = [column.user_id]
  }
}
table "possessions_usage" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "possession_id" {
    null = false
    type = uuid
  }
  column "container_id" {
    null = true
    type = uuid
  }
  column "type" {
    null = true
    type = text
  }
  column "timestamp" {
    null = true
    type = timestamptz
  }
  column "amount" {
    null = true
    type = numeric(10,2)
  }
  column "amount_unit" {
    null = true
    type = text
  }
  column "method" {
    null = true
    type = text
  }
  column "start_date" {
    null = true
    type = date
  }
  column "end_date" {
    null = true
    type = date
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "possessions_usage_container_id_fkey" {
    columns     = [column.container_id]
    ref_columns = [table.possession_containers.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "possessions_usage_possession_id_fkey" {
    columns     = [column.possession_id]
    ref_columns = [table.possessions.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "possessions_usage_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "possessions_usage_container_idx" {
    columns = [column.container_id]
  }
  index "possessions_usage_possession_idx" {
    columns = [column.possession_id]
  }
  index "possessions_usage_user_idx" {
    columns = [column.user_id]
  }
}
table "schools" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "name" {
    null = false
    type = text
  }
  column "degree" {
    null = true
    type = text
  }
  column "field_of_study" {
    null = true
    type = text
  }
  column "start_year" {
    null = true
    type = integer
  }
  column "end_year" {
    null = true
    type = integer
  }
  column "gpa" {
    null = true
    type = numeric(3,2)
  }
  column "notes" {
    null = true
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "schools_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "schools_user_idx" {
    columns = [column.user_id]
  }
}
table "searches" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "query" {
    null = false
    type = text
  }
  column "results_count" {
    null = true
    type = integer
  }
  column "clicked_result_id" {
    null = true
    type = uuid
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id, column.created_at]
  }
  index "searches_created_brin" {
    columns = [column.created_at]
    type    = BRIN
  }
  index "searches_query_trgm" {
    type = GIN
    on {
      column = column.query
      ops    = "public.gin_trgm_ops"
    }
  }
  index "searches_user_created_idx" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.created_at
    }
  }
  partition {
    type    = RANGE
    columns = [column.created_at]
  }
}
table "tag_shares" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "tag_id" {
    null = false
    type = uuid
  }
  column "shared_with_user_id" {
    null = false
    type = uuid
  }
  column "permission" {
    null    = true
    type    = text
    default = "read"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "tag_shares_shared_with_user_id_fkey" {
    columns     = [column.shared_with_user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "tag_shares_tag_id_fkey" {
    columns     = [column.tag_id]
    ref_columns = [table.tags.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "tag_shares_tag_id_idx" {
    columns = [column.tag_id]
  }
  index "tag_shares_user_id_idx" {
    columns = [column.shared_with_user_id]
  }
  unique "tag_shares_tag_id_shared_with_user_id_key" {
    columns = [column.tag_id, column.shared_with_user_id]
  }
}
table "tagged_items" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "tag_id" {
    null = false
    type = uuid
  }
  column "entity_type" {
    null = false
    type = text
  }
  column "entity_id" {
    null = false
    type = uuid
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "tagged_items_tag_id_fkey" {
    columns     = [column.tag_id]
    ref_columns = [table.tags.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "tagged_items_entity_idx" {
    columns = [column.entity_type, column.entity_id]
  }
  index "tagged_items_finance_txn_entity_tag_idx" {
    columns = [column.entity_id, column.tag_id]
    where   = "(entity_type = 'finance_transaction'::text)"
  }
  index "tagged_items_finance_txn_tag_entity_idx" {
    columns = [column.tag_id, column.entity_id]
    where   = "(entity_type = 'finance_transaction'::text)"
  }
  index "tagged_items_tag_id_idx" {
    columns = [column.tag_id]
  }
  unique "tagged_items_tag_id_entity_type_entity_id_key" {
    columns = [column.tag_id, column.entity_type, column.entity_id]
  }
}
table "tags" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "owner_id" {
    null = false
    type = uuid
  }
  column "group_id" {
    null = true
    type = text
  }
  column "name" {
    null = false
    type = text
  }
  column "emoji_image_url" {
    null = true
    type = text
  }
  column "color" {
    null = true
    type = text
  }
  column "description" {
    null = true
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "tags_owner_id_fkey" {
    columns     = [column.owner_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "tags_owner_id_idx" {
    columns = [column.owner_id]
  }
  index "tags_owner_name_idx" {
    unique  = true
    columns = [column.owner_id, column.name]
  }
}
table "task_list_collaborators" {
  schema = schema.public
  column "list_id" {
    null = false
    type = uuid
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "added_by_user_id" {
    null = true
    type = uuid
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.list_id, column.user_id]
  }
  foreign_key "task_list_collaborators_added_by_user_id_fkey" {
    columns     = [column.added_by_user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "task_list_collaborators_list_id_fkey" {
    columns     = [column.list_id]
    ref_columns = [table.task_lists.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "task_list_collaborators_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "task_list_collaborators_list_idx" {
    columns = [column.list_id]
  }
  index "task_list_collaborators_user_idx" {
    columns = [column.user_id]
  }
}
table "task_list_invites" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "list_id" {
    null = false
    type = uuid
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "invited_user_email" {
    null = false
    type = text
  }
  column "invited_user_id" {
    null = true
    type = uuid
  }
  column "accepted" {
    null    = false
    type    = boolean
    default = false
  }
  column "token" {
    null = false
    type = text
  }
  column "accepted_at" {
    null = true
    type = timestamptz
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "task_list_invites_invited_user_id_fkey" {
    columns     = [column.invited_user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "task_list_invites_list_id_fkey" {
    columns     = [column.list_id]
    ref_columns = [table.task_lists.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "task_list_invites_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "task_list_invites_email_lower_idx" {
    on {
      expr = "lower(invited_user_email)"
    }
  }
  index "task_list_invites_invited_user_idx" {
    columns = [column.invited_user_id]
  }
  index "task_list_invites_list_idx" {
    columns = [column.list_id]
  }
  index "task_list_invites_user_idx" {
    columns = [column.user_id]
  }
  unique "task_list_invites_token_key" {
    columns = [column.token]
  }
}
table "task_lists" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "name" {
    null = false
    type = text
  }
  column "color" {
    null = true
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "task_lists_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "task_lists_user_idx" {
    columns = [column.user_id]
  }
}
table "tasks" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "title" {
    null = false
    type = text
  }
  column "description" {
    null = true
    type = text
  }
  column "status" {
    null    = true
    type    = text
    default = "pending"
  }
  column "priority" {
    null    = true
    type    = text
    default = "medium"
  }
  column "due_date" {
    null = true
    type = timestamptz
  }
  column "completed_at" {
    null = true
    type = timestamptz
  }
  column "parent_id" {
    null = true
    type = uuid
  }
  column "list_id" {
    null = true
    type = uuid
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "tasks_list_id_fkey" {
    columns     = [column.list_id]
    ref_columns = [table.task_lists.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "tasks_parent_id_fkey" {
    columns     = [column.parent_id]
    ref_columns = [table.tasks.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "tasks_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "tasks_open_idx" {
    columns = [column.user_id, column.due_date, column.priority]
    where   = "(status = ANY (ARRAY['pending'::text, 'in_progress'::text]))"
  }
  index "tasks_user_due_idx" {
    columns = [column.user_id, column.due_date]
  }
  index "tasks_user_status_idx" {
    columns = [column.user_id, column.status]
  }
}
table "travel_flights" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "trip_id" {
    null = true
    type = uuid
  }
  column "flight_number" {
    null = true
    type = text
  }
  column "airline" {
    null = true
    type = text
  }
  column "departure_airport" {
    null = true
    type = text
  }
  column "arrival_airport" {
    null = true
    type = text
  }
  column "departure_time" {
    null = true
    type = timestamptz
  }
  column "arrival_time" {
    null = true
    type = timestamptz
  }
  column "confirmation_code" {
    null = true
    type = text
  }
  column "seat" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "travel_flights_trip_id_fkey" {
    columns     = [column.trip_id]
    ref_columns = [table.travel_trips.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "travel_flights_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "travel_flights_trip_idx" {
    columns = [column.trip_id]
  }
  index "travel_flights_user_idx" {
    columns = [column.user_id, column.departure_time]
  }
}
table "travel_hotels" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "trip_id" {
    null = true
    type = uuid
  }
  column "name" {
    null = false
    type = text
  }
  column "address" {
    null = true
    type = text
  }
  column "check_in" {
    null = true
    type = date
  }
  column "check_out" {
    null = true
    type = date
  }
  column "confirmation_code" {
    null = true
    type = text
  }
  column "room_type" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "travel_hotels_trip_id_fkey" {
    columns     = [column.trip_id]
    ref_columns = [table.travel_trips.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "travel_hotels_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "travel_hotels_trip_idx" {
    columns = [column.trip_id]
  }
  index "travel_hotels_user_idx" {
    columns = [column.user_id, column.check_in]
  }
}
table "travel_trips" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "name" {
    null = false
    type = text
  }
  column "description" {
    null = true
    type = text
  }
  column "start_date" {
    null = false
    type = date
  }
  column "end_date" {
    null = true
    type = date
  }
  column "status" {
    null    = true
    type    = text
    default = "planned"
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "travel_trips_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "travel_trips_user_idx" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.start_date
    }
  }
}
table "user_account" {
  schema = schema.public
  column "id" {
    null    = false
    type    = text
    default = sql("(gen_random_uuid())::text")
  }
  column "account_id" {
    null = false
    type = text
  }
  column "provider_id" {
    null = false
    type = text
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "access_token" {
    null = true
    type = text
  }
  column "refresh_token" {
    null = true
    type = text
  }
  column "id_token" {
    null = true
    type = text
  }
  column "access_token_expires_at" {
    null = true
    type = timestamptz
  }
  column "refresh_token_expires_at" {
    null = true
    type = timestamptz
  }
  column "scope" {
    null = true
    type = text
  }
  column "password" {
    null = true
    type = text
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "user_account_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "user_account_user_id_idx" {
    columns = [column.user_id]
  }
}
table "user_accounts" {
  schema = schema.public
  column "id" {
    null = false
    type = text
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "account_id" {
    null = false
    type = text
  }
  column "provider" {
    null = false
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "user_accounts_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "user_accounts_user_id_idx" {
    columns = [column.user_id]
  }
  unique "user_accounts_user_id_provider_account_id_key" {
    columns = [column.user_id, column.provider, column.account_id]
  }
}
table "user_api_keys" {
  schema = schema.public
  column "id" {
    null = false
    type = text
  }
  column "user_id" {
    null = true
    type = uuid
  }
  column "name" {
    null = false
    type = text
  }
  column "key_hash" {
    null = false
    type = text
  }
  column "expires_at" {
    null = true
    type = timestamptz
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "user_api_keys_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "user_api_keys_user_id_idx" {
    columns = [column.user_id]
  }
  unique "user_api_keys_key_hash_key" {
    columns = [column.key_hash]
  }
}
table "user_device_code" {
  schema = schema.public
  column "id" {
    null    = false
    type    = text
    default = sql("(gen_random_uuid())::text")
  }
  column "device_code" {
    null = false
    type = text
  }
  column "user_code" {
    null = false
    type = text
  }
  column "user_id" {
    null = true
    type = uuid
  }
  column "expires_at" {
    null = false
    type = timestamptz
  }
  column "status" {
    null = false
    type = text
  }
  column "last_polled_at" {
    null = true
    type = timestamptz
  }
  column "polling_interval" {
    null = true
    type = integer
  }
  column "client_id" {
    null = true
    type = text
  }
  column "scope" {
    null = true
    type = text
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "user_device_code_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  index "user_device_code_device_code_idx" {
    columns = [column.device_code]
  }
  index "user_device_code_user_code_idx" {
    columns = [column.user_code]
  }
}
table "user_jwks" {
  schema = schema.public
  column "id" {
    null    = false
    type    = text
    default = sql("(gen_random_uuid())::text")
  }
  column "public_key" {
    null = false
    type = text
  }
  column "private_key" {
    null = false
    type = text
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "expires_at" {
    null = true
    type = timestamptz
  }
  primary_key {
    columns = [column.id]
  }
}
table "user_passkey" {
  schema = schema.public
  column "id" {
    null    = false
    type    = text
    default = sql("(gen_random_uuid())::text")
  }
  column "name" {
    null = true
    type = text
  }
  column "public_key" {
    null = false
    type = text
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "credential_id" {
    null = false
    type = text
  }
  column "counter" {
    null = false
    type = integer
  }
  column "device_type" {
    null = false
    type = text
  }
  column "backed_up" {
    null = false
    type = boolean
  }
  column "transports" {
    null = true
    type = text
  }
  column "created_at" {
    null = true
    type = timestamptz
  }
  column "aaguid" {
    null = true
    type = text
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "user_passkey_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "user_passkey_credential_id_idx" {
    columns = [column.credential_id]
  }
  index "user_passkey_user_id_idx" {
    columns = [column.user_id]
  }
}
table "user_person_relations" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "person_id" {
    null = false
    type = uuid
  }
  column "relationship_type" {
    null = true
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "user_person_relations_person_id_fkey" {
    columns     = [column.person_id]
    ref_columns = [table.persons.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "user_person_relations_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "user_person_relations_person_idx" {
    columns = [column.person_id]
  }
  index "user_person_relations_user_idx" {
    columns = [column.user_id]
  }
  unique "user_person_relations_user_id_person_id_key" {
    columns = [column.user_id, column.person_id]
  }
}
table "user_session" {
  schema = schema.public
  column "id" {
    null    = false
    type    = text
    default = sql("(gen_random_uuid())::text")
  }
  column "expires_at" {
    null = false
    type = timestamptz
  }
  column "token" {
    null = false
    type = text
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "ip_address" {
    null = true
    type = text
  }
  column "user_agent" {
    null = true
    type = text
  }
  column "user_id" {
    null = false
    type = uuid
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "user_session_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "user_session_user_id_idx" {
    columns = [column.user_id]
  }
  unique "user_session_token_key" {
    columns = [column.token]
  }
}
table "user_sessions" {
  schema = schema.public
  column "id" {
    null = false
    type = text
  }
  column "user_id" {
    null = true
    type = uuid
  }
  column "expires_at" {
    null = false
    type = timestamptz
  }
  column "token" {
    null = false
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "user_sessions_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "user_sessions_token_idx" {
    columns = [column.token]
  }
  index "user_sessions_user_id_idx" {
    columns = [column.user_id]
  }
  unique "user_sessions_token_key" {
    columns = [column.token]
  }
}
table "user_verification" {
  schema = schema.public
  column "id" {
    null    = false
    type    = text
    default = sql("(gen_random_uuid())::text")
  }
  column "identifier" {
    null = false
    type = text
  }
  column "value" {
    null = false
    type = text
  }
  column "expires_at" {
    null = false
    type = timestamptz
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  index "user_verification_identifier_idx" {
    columns = [column.identifier]
  }
}
table "users" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "email" {
    null = false
    type = text
  }
  column "name" {
    null = true
    type = text
  }
  column "avatar_url" {
    null = true
    type = text
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "image" {
    null = true
    type = text
  }
  column "email_verified" {
    null    = false
    type    = boolean
    default = false
  }
  column "is_admin" {
    null    = false
    type    = boolean
    default = false
  }
  primary_key {
    columns = [column.id]
  }
  index "users_email_lower_idx" {
    on {
      expr = "lower(email)"
    }
  }
  unique "users_email_key" {
    columns = [column.email]
  }
}
table "video_channels" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "external_id" {
    null = true
    type = text
  }
  column "source" {
    null = false
    type = text
  }
  column "name" {
    null = false
    type = text
  }
  column "handle" {
    null = true
    type = text
  }
  column "avatar_url" {
    null = true
    type = text
  }
  column "subscriber_count" {
    null = true
    type = integer
  }
  column "description" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "video_channels_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "video_channels_user_idx" {
    columns = [column.user_id, column.source]
  }
}
table "video_subscriptions" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "channel_id" {
    null = false
    type = uuid
  }
  column "subscribed_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "video_subscriptions_channel_id_fkey" {
    columns     = [column.channel_id]
    ref_columns = [table.video_channels.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "video_subscriptions_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  unique "video_subscriptions_user_id_channel_id_key" {
    columns = [column.user_id, column.channel_id]
  }
}
table "video_viewings" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "content_type" {
    null = false
    type = text
  }
  column "external_id" {
    null = true
    type = text
  }
  column "source" {
    null = false
    type = text
  }
  column "title" {
    null = false
    type = text
  }
  column "description" {
    null = true
    type = text
  }
  column "thumbnail_url" {
    null = true
    type = text
  }
  column "duration_seconds" {
    null = true
    type = integer
  }
  column "watched_at" {
    null = false
    type = timestamptz
  }
  column "watch_time_seconds" {
    null    = true
    type    = integer
    default = 0
  }
  column "completed" {
    null    = true
    type    = boolean
    default = false
  }
  column "season" {
    null = true
    type = integer
  }
  column "episode" {
    null = true
    type = integer
  }
  column "channel_name" {
    null = true
    type = text
  }
  column "data" {
    null    = true
    type    = jsonb
    default = "{}"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id, column.watched_at]
  }
  index "video_viewings_content_type_idx" {
    columns = [column.user_id, column.content_type]
  }
  index "video_viewings_user_watched_idx" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.watched_at
    }
  }
  index "video_viewings_watched_brin" {
    columns = [column.watched_at]
    type    = BRIN
  }
  partition {
    type    = RANGE
    columns = [column.watched_at]
  }
}
schema "drizzle" {
}
schema "public" {
  comment = "standard public schema"
}
