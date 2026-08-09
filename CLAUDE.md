# Claude instructions

Never start long-running services (Expo/Metro, `pnpm dev`, the API, workers, databases, Docker containers, etc.) on your own. The user starts services for you. If a service is needed and not running, say so and ask the user to start it.

The root [AGENTS.md](AGENTS.md) is the sole agent instruction authority for this repository.
