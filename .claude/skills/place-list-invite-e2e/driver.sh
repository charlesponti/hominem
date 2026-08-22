#!/usr/bin/env bash
# Drives the place-list invite/accept journey against the real dev API.
# Auth (signup, cookie jars, the test-domain safety rail) lives in
# hominem-auth-e2e/lib.sh, sourced below — this file only adds the
# place-list-specific calls (create-list, invite, accept, pending-invites)
# and its own manifest for collections, which auth's lib knows nothing
# about.
#
# What this script CANNOT do: put the invitee's session into the browser.
# Better Auth's session cookie is httpOnly, so a curl-obtained session
# lives only in its cookie jar — it can't be injected into a page via
# document.cookie. Use this script to set up/tear down state fast, and
# use the browser only for the part that actually needs eyes: watching
# the "Pending invites" card + Accept button render in chat. See
# ../hominem-auth-e2e/SKILL.md for the browser-side OTP sequence when you
# DO need a test account logged into the browser.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ../hominem-auth-e2e/lib.sh

API_URL="$HOMINEM_API_URL"
MANIFEST="$HOMINEM_E2E_STATE_DIR/place-lists-manifest.json"
[ -f "$MANIFEST" ] || echo '{"lists":[]}' >"$MANIFEST"

manifest_add_list() {
  local tmp; tmp="$(mktemp)"
  jq --arg id "$1" --arg owner_email "$2" \
    '.lists += [{id: $id, owner_email: $owner_email}] | .lists |= unique_by(.id)' \
    "$MANIFEST" >"$tmp"
  mv "$tmp" "$MANIFEST"
}

cmd_create_list() {
  local email="$1" name="$2"
  hominem_require_test_email "$email"
  local resp
  resp="$(curl -sS -b "$(hominem_cookiejar_for "$email")" -X POST "$API_URL/api/place-lists" \
    -H 'content-type: application/json' \
    -d "$(jq -nc --arg name "$name" '{name: $name}')")"

  local list_id
  list_id="$(echo "$resp" | jq -r '.placeList.id // empty')"
  if [ -z "$list_id" ]; then
    echo "create-list failed: $resp" >&2
    exit 1
  fi

  manifest_add_list "$list_id" "$email"
  echo "$list_id"
}

cmd_invite() {
  local email="$1" list_id="$2" invitee_email="$3" role="${4:-editor}"
  hominem_require_test_email "$email"
  hominem_require_test_email "$invitee_email"
  curl -sS -b "$(hominem_cookiejar_for "$email")" -X POST "$API_URL/api/place-lists/$list_id/collaborators" \
    -H 'content-type: application/json' \
    -d "$(jq -nc --arg email "$invitee_email" --arg role "$role" \
      '{email: $email, role: $role}')"
  echo
}

cmd_pending_invites() {
  local email="$1"
  curl -sS -b "$(hominem_cookiejar_for "$email")" "$API_URL/api/place-lists/invites"
  echo
}

cmd_accept() {
  local email="$1" list_id="$2"
  curl -sS -b "$(hominem_cookiejar_for "$email")" -X POST "$API_URL/api/place-lists/$list_id/collaborators/accept"
  echo
}

cmd_cleanup() {
  local lists; lists="$(jq -c '.lists[]' "$MANIFEST" 2>/dev/null || true)"
  if [ -z "$lists" ]; then
    echo "no lists in manifest"
  else
    echo "deleting place lists: $lists"
    while IFS= read -r list; do
      [ -z "$list" ] && continue
      local id owner_email
      id="$(jq -r '.id' <<<"$list")"
      owner_email="$(jq -r '.owner_email' <<<"$list")"
      hominem_require_test_email "$owner_email"
      psql "$(hominem_db_url)" -v ON_ERROR_STOP=1 -v list_id="$id" -v owner_email="$owner_email" \
        -c 'DELETE FROM app.collections
            WHERE id = :'"'"'list_id'"'"'
              AND owner_userid = (SELECT id FROM "user" WHERE email = :'"'"'owner_email'"'"');'
    done <<<"$lists"
  fi
  rm -f "$MANIFEST"
  echo "note: this only cleans up lists — run hominem-auth-e2e/driver.sh delete-user for each test account you signed up"
}

case "${1:-}" in
  signup) shift; id="$(hominem_signup "$1")"; echo "signed up $1 -> userId=$id (cookiejar: $(hominem_cookiejar_for "$1"))" ;;
  create-list) shift; cmd_create_list "$@" ;;
  invite) shift; cmd_invite "$@" ;;
  pending-invites) shift; cmd_pending_invites "$@" ;;
  accept) shift; cmd_accept "$@" ;;
  whoami) shift; hominem_whoami "$1"; echo ;;
  cleanup) shift; cmd_cleanup "$@" ;;
  *)
    cat >&2 <<'EOF'
usage: driver.sh <command> [args]

  signup <email>                                    OTP sign-up/sign-in as email (dev OTP is always 000000)
  create-list <ownerEmail> <name>                   create a place list, prints its id
  invite <ownerEmail> <listId> <inviteeEmail> [role] invite an email (editor|viewer, default editor)
  pending-invites <email>                           GET pending invites for email's session
  accept <email> <listId>                           accept an invite as email
  whoami <email>                                    print the Better Auth session for email
  cleanup                                            delete place lists this script created (manifest-driven)

Every email must end in @test.hominem.dev (enforced by hominem-auth-e2e/lib.sh).
Cleanup only covers lists — also run:
  .claude/skills/hominem-auth-e2e/driver.sh delete-user <email>
for each test account you signed up.
EOF
    exit 1
    ;;
esac
