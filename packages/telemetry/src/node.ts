import { logs, type LogAttributes } from '@opentelemetry/api-logs';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import {
  BatchSpanProcessor,
  ParentBasedSampler,
  SamplingDecision,
  TraceIdRatioBasedSampler,
  type SamplingResult,
  type Sampler,
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

import { logger, setTelemetryLogSink } from './logger.js';

type TelemetryConfig = {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  otlpEndpoint?: string;
  otlpProtocol?: string;
  samplingRatio?: number;
  otlpHeaders?: Record<string, string>;
};

const SPEECH_LOG_PREFIXES = ['chat_speech_', 'speech_', '[speech-usage]'];
const SPEECH_LOG_ATTRIBUTES = new Set([
  'audioBytes',
  'attempts',
  'characterCount',
  'durationMs',
  'outcome',
  'providerReadyDurationMs',
  'requestToFirstPlayableMs',
  'sessionDurationMs',
  'terminal',
  'timeToFirstAudioByteMs',
]);

class SpeechAwareSampler implements Sampler {
  private readonly delegate: Sampler;

  constructor(ratio: number) {
    this.delegate = new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(ratio),
    });
  }

  shouldSample(...args: Parameters<Sampler['shouldSample']>): SamplingResult {
    const spanName = args[2];
    if (spanName.startsWith('chat.speech') || spanName.startsWith('speech.')) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }

    return this.delegate.shouldSample(...args);
  }

  toString() {
    return 'SpeechAwareSampler{speech=always_on,default=parent_based_ratio}';
  }
}

function withPath(endpoint: string, path: string) {
  return endpoint.endsWith(path) ? endpoint : `${endpoint.replace(/\/$/, '')}${path}`;
}

function isExportableLog(message: string) {
  return SPEECH_LOG_PREFIXES.some((prefix) => message.startsWith(prefix));
}

export function initTelemetry(config: TelemetryConfig) {
  if (!config.otlpEndpoint) {
    setTelemetryLogSink(null);
    logger.info('telemetry_initialized', {
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
      environment: config.environment,
      otlpEnabled: false,
      samplingRatio: config.samplingRatio,
    });

    return {
      shutdown: () => Promise.resolve(),
    };
  }

  const resource = resourceFromAttributes({
    'service.name': config.serviceName,
    'service.version': config.serviceVersion,
    'deployment.environment.name': config.environment,
  });
  const headers = config.otlpHeaders ?? {};
  const tracerProvider = new NodeTracerProvider({
    resource,
    sampler: new SpeechAwareSampler(Math.min(1, Math.max(0, config.samplingRatio ?? 0.1))),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: withPath(config.otlpEndpoint, '/v1/traces'),
          headers,
        }),
      ),
    ],
  });
  tracerProvider.register({ propagator: new W3CTraceContextPropagator() });

  const loggerProvider = new LoggerProvider({
    resource,
    processors: [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: withPath(config.otlpEndpoint, '/v1/logs'),
          headers,
        }),
      ),
    ],
  });
  logs.setGlobalLoggerProvider(loggerProvider);
  const otelLogger = loggerProvider.getLogger(config.serviceName, config.serviceVersion);
  setTelemetryLogSink((level, message, data) => {
    if (!isExportableLog(message)) return;

    const attributes: LogAttributes = { 'log.event': message, 'log.level': level };
    for (const [key, value] of Object.entries(data ?? {})) {
      if (
        SPEECH_LOG_ATTRIBUTES.has(key) &&
        (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      ) {
        attributes[key] = value;
      }
    }
    otelLogger.emit({
      eventName: message,
      severityText: level.toUpperCase(),
      body: message,
      attributes,
    });
  });

  logger.info('telemetry_initialized', {
    serviceName: config.serviceName,
    serviceVersion: config.serviceVersion,
    environment: config.environment,
    otlpEnabled: true,
    otlpProtocol: config.otlpProtocol,
    samplingRatio: config.samplingRatio,
  });

  return {
    shutdown: async () => {
      setTelemetryLogSink(null);
      await Promise.all([tracerProvider.shutdown(), loggerProvider.shutdown()]);
    },
  };
}
