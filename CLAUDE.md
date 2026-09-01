# Claude instructions

Never start long-running services (Expo/Metro, `pnpm dev`, the API, workers, databases, Docker containers, etc.) on your own. The user starts services for you. If a service is needed and not running, say so and ask the user to start it.

The root [AGENTS.md](AGENTS.md) is the sole agent instruction authority for this repository. It points to the `hominem-dev-loop` skill for the portless proxy and worktree `.env` bootstrap steps a fresh worktree needs before `pnpm dev` will work.

For how web authentication works — the hosted login, the shared session cookie, and how apps talk to the API — follow [docs/authentication.md](docs/authentication.md): browsers use the API hosted login and public API URL, while SSR session and data calls require the private (Railway in production) API URL.
