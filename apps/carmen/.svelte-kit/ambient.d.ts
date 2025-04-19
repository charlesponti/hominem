
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```bash
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const VITE_API_URL: string;
	export const DATABASE_URL: string;
	export const NEXTAUTH_SECRET: string;
	export const NEXTAUTH_URL: string;
	export const VITE_GOOGLE_API_KEY: string;
	export const GOOGLE_CLIENT_ID: string;
	export const GOOGLE_CLIENT_SECRET: string;
	export const GOOGLE_SERVICE_ACCOUNT: string;
	export const SEGMENT_KEY: string;
	export const CYPRESS_RECORD_KEY: string;
	export const npm_config_legacy_peer_deps: string;
	export const TERM_PROGRAM: string;
	export const NODE: string;
	export const INIT_CWD: string;
	export const TERM: string;
	export const SHELL: string;
	export const DOCKER_VOLUMES: string;
	export const npm_config_registry: string;
	export const npm_config_resolve_peers: string;
	export const USER: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const npm_config_strict_peer_dependencies: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const npm_execpath: string;
	export const npm_config_verify_deps_before_run: string;
	export const npm_config_frozen_lockfile: string;
	export const PATH: string;
	export const npm_config_auto_install_peers: string;
	export const npm_command: string;
	export const PWD: string;
	export const npm_lifecycle_event: string;
	export const npm_package_name: string;
	export const LANG: string;
	export const npm_config_resolution_mode: string;
	export const npm_config_node_linker: string;
	export const TURBO_HASH: string;
	export const npm_config_node_gyp: string;
	export const npm_package_version: string;
	export const SHLVL: string;
	export const HOME: string;
	export const npm_lifecycle_script: string;
	export const npm_config_user_agent: string;
	export const npm_node_execpath: string;
	export const COLORTERM: string;
	export const _: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		VITE_API_URL: string;
		DATABASE_URL: string;
		NEXTAUTH_SECRET: string;
		NEXTAUTH_URL: string;
		VITE_GOOGLE_API_KEY: string;
		GOOGLE_CLIENT_ID: string;
		GOOGLE_CLIENT_SECRET: string;
		GOOGLE_SERVICE_ACCOUNT: string;
		SEGMENT_KEY: string;
		CYPRESS_RECORD_KEY: string;
		npm_config_legacy_peer_deps: string;
		TERM_PROGRAM: string;
		NODE: string;
		INIT_CWD: string;
		TERM: string;
		SHELL: string;
		DOCKER_VOLUMES: string;
		npm_config_registry: string;
		npm_config_resolve_peers: string;
		USER: string;
		PNPM_SCRIPT_SRC_DIR: string;
		npm_config_strict_peer_dependencies: string;
		__CF_USER_TEXT_ENCODING: string;
		npm_execpath: string;
		npm_config_verify_deps_before_run: string;
		npm_config_frozen_lockfile: string;
		PATH: string;
		npm_config_auto_install_peers: string;
		npm_command: string;
		PWD: string;
		npm_lifecycle_event: string;
		npm_package_name: string;
		LANG: string;
		npm_config_resolution_mode: string;
		npm_config_node_linker: string;
		TURBO_HASH: string;
		npm_config_node_gyp: string;
		npm_package_version: string;
		SHLVL: string;
		HOME: string;
		npm_lifecycle_script: string;
		npm_config_user_agent: string;
		npm_node_execpath: string;
		COLORTERM: string;
		_: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * Dynamic environment variables cannot be used during prerendering.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
