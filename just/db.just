test_db_url := 'postgresql://postgres:postgres@127.0.0.1:4433/hominem-test'

create name:
    #!/usr/bin/env bash
    [[ "{{ name }}" =~ ^[a-z0-9]+(_[a-z0-9]+)*$ ]] || {
        echo 'error: migration name must use lowercase words separated by underscores' >&2
        exit 1
    }
    goose_bin="$("{{ justfile_directory() }}/just/goose-install.sh")"
    "$goose_bin" -dir "{{ justfile_directory() }}/packages/db/migrations" create "{{ name }}" sql

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
    if [[ "{{ profile }}" != test && "${ALLOW_DB_ROLLBACK:-}" != 1 ]]; then
        echo 'error: set ALLOW_DB_ROLLBACK=1 for a non-test database rollback' >&2
        exit 1
    fi
    goose_bin="$("{{ justfile_directory() }}/just/goose-install.sh")"
    "$goose_bin" -dir "{{ justfile_directory() }}/packages/db/migrations" postgres "$DATABASE_URL" down

status profile='':
    #!/usr/bin/env bash
    if [[ "{{ profile }}" == test ]]; then export DATABASE_URL='{{ test_db_url }}'; fi
    [[ -n "${DATABASE_URL:-}" ]] || { echo 'error: DATABASE_URL must be set' >&2; exit 1; }
    goose_bin="$("{{ justfile_directory() }}/just/goose-install.sh")"
    "$goose_bin" -dir "{{ justfile_directory() }}/packages/db/migrations" postgres "$DATABASE_URL" status

validate profile='':
    #!/usr/bin/env bash
    goose_bin="$("{{ justfile_directory() }}/just/goose-install.sh")"
    "$goose_bin" -dir "{{ justfile_directory() }}/packages/db/migrations" validate
    just db migrate "{{ profile }}"
    ! just db status "{{ profile }}" | grep -Eiq pending

lint *refs:
    "{{ justfile_directory() }}/packages/db/scripts/check-migrations.sh"
    "{{ justfile_directory() }}/packages/db/scripts/check-schema-qualified-drops.sh" {{ refs }}

backup:
    #!/usr/bin/env bash
    mkdir -p ~/.hominem
    db="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5434/hominem}"
    ts="$(date +%Y%m%d_%H%M%S)"
    PGPASSWORD=postgres pg_dump -h localhost -p 5434 -U postgres -d hominem -f ~/.hominem/hominem_dev_"${ts}".sql
    echo "Backup saved to ~/.hominem/hominem_dev_${ts}.sql"

codegen:
    #!/usr/bin/env bash
    [[ -n "${DATABASE_URL:-}" ]] || { echo 'error: DATABASE_URL must be set' >&2; exit 1; }
    cd "{{ justfile_directory() }}/packages/db"
    pnpm exec kysely-codegen
    pnpm exec oxfmt ./src/types/database.ts --write
