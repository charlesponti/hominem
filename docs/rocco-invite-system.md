## Rocco Invite System (Token-Based)

### Overview
- Invites let a list owner share a list with another user via email.
- Each invite includes a unique token required to accept or decline (bearer secret).
- The invited email is still stored and used for delivery, audit intent, deduping per list/email, and fallback lookup (e.g., showing pending invites when a user visits the invites page without a token).
- Users sign in with Google, but invites can be sent to any email (including non-Gmail). Acceptance can happen even if the invited email differs from the signed-in Google email, with safeguards to prevent hijacking.

### Data Model (Drizzle)
- `list_invite` (primary key: `listId` + `invitedUserEmail`)
  - `listId`: target list
  - `invitedUserEmail`: lowercased email the invite was sent to
  - `invitedUserId`: user id if the email matches an existing user at send time or once accepted
  - `userId`: inviter user id
  - `accepted`, `acceptedAt`: acceptance tracking
  - `token`: secure random token (unique) required for accept/decline
  - `createdAt`, `updatedAt`: timestamps
- `user_lists`: membership table; entry is created on accept (ignore if already present).

### Sending Invites
- Code: `apps/rocco/app/lib/trpc/routers/invites.ts` → `create` → `sendListInvite` in `packages/data/src/services/lists.service.ts`.
- Email is lowercased and deduped per list (`listId` + `invitedUserEmail`).
- Delivery: `sendListInvite` now calls `sendInviteEmail` (Resend) with a link built from `APP_BASE_URL`. If no base URL is set, the invite is still created but the email is skipped and a warning is logged.
- Guards:
  - Cannot invite yourself (compare to requester email).
  - If invited user already belongs to the list, reject with conflict.
- If the invited email already exists as a user, `invitedUserId` is set immediately; otherwise left null.

### Accepting Invites (token required)
- Entry point: `client.api.invites.accept` (Hono RPC) → `acceptListInvite` service. Use `client.api.invites.accept.$post({ json: { listId, token } })` from the client.
- Lookup: by `listId` + `token`. The invited email remains on the record for display/audit and deduping but is not used to authorize acceptance.
- Safeguards:
  - signed-in user id isn't `invitedUserId`  → 403.
  - Already accepted → 400.
  - Not found → 404.
- Success path:
  - Marks invite accepted, sets `acceptedAt`, and **binds `invitedUserId` to the accepting user**.
  - Inserts membership into `user_lists` (no-op if already there).
- Mismatched email handling:
  - Acceptance uses the invite token (bearer secret), not the current Google email.
  - UI warns/asks for confirmation if signed-in email ≠ invited email before calling accept.

### Declining Invites
- `client.api.invites.decline` (Hono RPC) deletes the invite by `listId` + `token` (use `client.api.invites.decline.$post({ json: { listId, token } })`).
- If the invite is bound to a different `invitedUserId`, decline is forbidden.
- List owners can delete pending invites they sent; accepted invites cannot be deleted.

### Listing Invites
- Incoming: `client.api.invites.getAll` optionally accepts `{ token }` to load a specific invite via a secure link (call via `client.api.invites.getAll.$post({ json: { token } })`); otherwise returns invites where `invitedUserEmail` matches the signed-in user or `invitedUserId` matches.
- By list (owner view): `client.api.invites.getByList` returns invites for a list the owner controls (`client.api.invites.getByList.$post({ json: { listId } })`).
- Outbound (sent): `client.api.invites.getAllOutbound` (`client.api.invites.getAllOutbound.$post()`).

### UI Behaviors (Rocco app)
- Invites page (`apps/rocco/app/routes/invites.tsx`):
  - Supports loading via `?token=` link; shows a banner when loaded from a secure link.
  - Without a token, the page still lists invites that match the current user’s email or `invitedUserId`, so email remains relevant for discovery.
- Invite item (`apps/rocco/app/components/InviteListItem.tsx`):
  - On email mismatch, shows warning text and confirm dialog before accepting.

### Error Codes (service level)
- 404: invite not found.
- 400: invite already accepted.
- 403: invite bound to another user.
- 409: duplicate invite creation.

### Case Coverage / Edge Cases
- Invite sent to unregistered email, later accepted by Google account with different email → allowed; invite binds to accepting user id (token required).
- Invite sent to an email already registered to a user, then another user tries to accept → blocked (403).
- Decline respects `invitedUserId` binding to avoid hijack.
- Existing membership is idempotent on accept; no duplicate membership rows.

### Testing Notes
- Service tests (needs DB): `packages/data/src/services/lists.service.test.ts` cover:
  - Accept with mismatched invited email vs Google email.
  - Reject accept when invite already bound to another user.
- UI confirmation relies on browser `confirm`; no headless test included today.
