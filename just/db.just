test_db_url := 'postgresql://postgres:postgres@127.0.0.1:5434/app-test'

migrate profile='':
    #!/usr/bin/env bash
    if [[ "{{ profile }}" == test ]]; then export DATABASE_URL='{{ test_db_url }}'; fi
    [[ -n "${DATABASE_URL:-}" ]] || { echo 'error: DATABASE_URL must be set' >&2; exit 1; }
    goose_bin="$("{{ justfile_directory() }}/just/goose-install.sh")"
    "$goose_bin" -dir "{{ justfile_directory() }}/packages/db/migrations" postgres "$DATABASE_URL" up

rollback profile='':
    #!/usr/bin/env bash
    if [[ "{{ profile }}" == test ]]; then export DATABASE_URL='{{ test_db_url }}'; fi
    [[ -n "${DATABASE_URL:-}" ]] || { echo 'error: DATABASE_URL must be set' >&2; exit 1; }
    goose_bin="$("{{ justfile_directory() }}/just/goose-install.sh")"
    "$goose_bin" -dir "{{ justfile_directory() }}/packages/db/migrations" postgres "$DATABASE_URL" down

status profile='':
    #!/usr/bin/env bash
    if [[ "{{ profile }}" == test ]]; then export DATABASE_URL='{{ test_db_url }}'; fi
    [[ -n "${DATABASE_URL:-}" ]] || { echo 'error: DATABASE_URL must be set' >&2; exit 1; }
    goose_bin="$("{{ justfile_directory() }}/just/goose-install.sh")"
    "$goose_bin" -dir "{{ justfile_directory() }}/packages/db/migrations" postgres "$DATABASE_URL" status

validate profile='':
    just db migrate "{{ profile }}"
    ! just db status "{{ profile }}" | grep -Eiq pending

lint *refs:
    "{{ justfile_directory() }}/packages/db/scripts/check-schema-qualified-drops.sh" {{ refs }}

codegen:
    #!/usr/bin/env bash
    [[ -n "${DATABASE_URL:-}" ]] || { echo 'error: DATABASE_URL must be set' >&2; exit 1; }
    cd "{{ justfile_directory() }}/packages/db"
    pnpm exec kysely-codegen
    pnpm exec oxfmt ./src/types/database.ts --write
