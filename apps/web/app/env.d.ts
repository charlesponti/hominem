/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_API_URL: string;
  readonly VITE_POSTHOG_PUBLIC_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_OTEL_DISABLED?: 'true' | 'false';
  readonly VITE_OTEL_SERVICE_NAME?: string;
  readonly VITE_OTEL_SERVICE_VERSION?: string;
  readonly VITE_OTEL_DEPLOYMENT_ENVIRONMENT?: string;
  readonly VITE_OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  readonly VITE_OTEL_TRACES_SAMPLER_ARG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
