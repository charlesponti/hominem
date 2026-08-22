---
name: place-list-invite-e2e
description: Verify the place-list collaborator invite/accept journey end-to-end — inviting a collaborator (with or without an existing account), the in-chat "Pending invites" Accept button, and confirming access actually activates. Use when asked to test/verify place-list invites, the invite-accept UI, or collaboration on place lists.
---

Load `hominem-auth-e2e` alongside this skill — it owns account setup,
cookie jars, the test-domain safety rail, and the browser OTP/logout
walk. This skill only covers what's specific to place lists: creating a
list, inviting a collaborator, checking pending invites, accepting, and
the chat UI that surrounds all of that.

`driver.sh` here sources `../hominem-auth-e2e/lib.sh`, so `signup` /
`whoami` on this CLI are the same calls as the auth skill's — it's just
convenient to not switch scripts mid-flow. State (cookie jars + this
skill's own list manifest) lives in `/tmp/hominem-e2e`, shared with the
auth skill.

## Prerequisites

- API on `http://localhost:4040`, web app on `http://localhost:4445` —
  **the user starts these**, never start them yourself (see root
  `CLAUDE.md`). If they're not up, ask the user to start them.
- `jq` and `psql` on PATH.

## Fast path (fully scripted, no browser)

This journey inherently needs two distinct identities — an owner and an
invitee can't be the same account — so it's the one case where the
stable default user (`test@hominem.local`, from `hominem-auth-e2e`)
plays the owner and only the invitee needs a disposable
`@test.hominem.dev` account:

```bash
D=.claude/skills/place-list-invite-e2e/driver.sh
OWNER=test@hominem.local

.claude/skills/hominem-auth-e2e/driver.sh signin-default
$D signup invitee-e2e@test.hominem.dev
LIST_ID=$($D create-list "$OWNER" "E2E Verify List")
$D invite "$OWNER" "$LIST_ID" invitee-e2e@test.hominem.dev editor
$D pending-invites invitee-e2e@test.hominem.dev   # should list the invite
$D accept invitee-e2e@test.hominem.dev "$LIST_ID"
$D pending-invites invitee-e2e@test.hominem.dev   # should now be empty

# teardown — only the list and the disposable invitee; test@hominem.local persists
$D cleanup
.claude/skills/hominem-auth-e2e/driver.sh delete-user invitee-e2e@test.hominem.dev
```

Use this path when you only need to confirm the API/service layer
behaves — it does **not** exercise the LLM tool-call path or the
in-chat Accept button.

## Full path (verifies the actual chat UI)

The Accept button lives in `apps/web/app/components/chat/pending-place-list-invites.tsx`,
rendered from `apps/web/app/routes/chat/chat.$chatId.tsx` as a sibling of
the (collapsed-by-default) `list_pending_invites` tool card — always
visible, not gated behind expanding the card.

1. **Set up state with the script** (as above): `signup` the invitee,
   have the real user (or a scripted test owner) invite them.
   - If the invite should come from the real logged-in user (to also
     exercise the LLM tool-call path), do it in the open browser tab by
     sending a chat message that names the tool explicitly — the model
     has been flaky about inferring `invite_place_list_collaborator`
     from plain English:
     `Call invite_place_list_collaborator on <list> with email <invitee> and role editor.`
     (Name `create_place_list` explicitly too if the list doesn't exist yet.)

2. **Log the invitee into the browser** — see `hominem-auth-e2e`'s
   SKILL.md for the exact OTP-box sequence (bulk-typing the code doesn't
   work; it needs six single-character `type` calls).

3. **Ask chat for pending invites** and watch the Accept button appear
   already-expanded (not nested in the collapsed tool card):
   `Call list_pending_invites to check for any pending place list invites.`
   Click Accept, screenshot, confirm the green "✓ Accepted" state.

4. **Confirm access actually activated** (not just a UI flip) by asking
   `Call list_place_lists to show my place lists.` — the invited list
   should now appear in the invitee's own list.

5. **Sign back into the browser as the real user** before ending the
   session — see `hominem-auth-e2e`'s SKILL.md for the logout workaround
   (the account-menu "Sign out" click is unreliable here) and the same
   OTP walk to restore the real user's session.

6. **Clean up**: run this skill's `cleanup` for lists, and
   `hominem-auth-e2e/driver.sh delete-user` for each test account. For
   anything created directly through the browser under the real
   account, verify `owner_userid` in `app.collections` actually matches
   before deleting it manually — never delete a row without confirming
   you created it this session.

## Reference: the place-list API surface `driver.sh` wraps

All under `http://localhost:4040/api` (auth endpoints are documented in
`hominem-auth-e2e`'s SKILL.md instead):

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/place-lists` | `{name}` → `{placeList:{id,...}}` |
| POST | `/place-lists/:id/collaborators` | `{email, role: editor\|viewer}` |
| GET | `/place-lists/invites` | pending invites for the caller |
| POST | `/place-lists/:id/collaborators/accept` | no body |

Source: `services/api/src/rpc/routes/place-lists.ts`, mounted at
`/place-lists` in `services/api/src/rpc/routes/economy.ts`.
