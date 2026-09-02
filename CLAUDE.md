# Claude instructions

The root [AGENTS.md](AGENTS.md) is the sole agent instruction authority for this repository — including whether you may start local dev services yourself. It points to the `hominem-development` skill for the portless proxy, the worktree `.env` bootstrap steps a fresh worktree needs before `pnpm dev` will work, and how to run services.

For how web authentication works — the hosted login, the shared session cookie, and how apps talk to the API — follow [docs/authentication.md](docs/authentication.md): browsers use the API hosted login and public API URL, while SSR session and data calls require the private (Railway in production) API URL.
