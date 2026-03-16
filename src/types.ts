// src/types.ts

/**
 * Responsibility: Define the contracts and shapes used by LoggerLib.
 *
 * This file describes:
 * - what consumers are allowed to pass into the logger
 * - what structured records the logger produces
 * - how records move through pipelines
 * - what a logger instance must expose
 *
 * Core design:
 * - operational logs represent application/workflow events
 * - network logs represent HTTP/API request events
 * - all emitted records share a stable base envelope
 */

/** Unique identifier for a single log row/record. */
type LogId = string;

/** Shared identifier used to correlate multiple related log records. */
type CorrelationId = string;

/**
 * Timestamp stored in memory and written to Google Sheets as a real Date value.
 *
 * This allows sorting, filtering, and date formatting directly in Sheets.
 */
type Ts = Date;

/** Known external systems commonly used by this library's consumers. */
type KnownApiSystem =
  | "GOOGLE"
  | "SLACK"
  | "NOTION";

/**
 * External system name associated with an API call or operational action.
 *
 * Includes a flexible "OTHER" option for unsupported or custom systems.
 */
type ApiSystem = KnownApiSystem | "OTHER";

/**
 * Supported log severity levels.
 *
 * Used for:
 * - logger threshold filtering
 * - indicating the importance/severity of a record
 */
type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/** Supported HTTP methods for network logs. */
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Optional coarse outcome for workflow reporting. */
type Outcome = "OK" | "NOOP" | "SKIP" | "FAIL";

/**
 * Optional registry-style description of a known API endpoint.
 *
 * Useful when consumers want to standardize endpoint naming or extract
 * structured metadata from raw API responses.
 */
interface EndpointSpec {
  system: ApiSystem;
  method: HttpMethod;
  endpoint: string;
  pickMeta?: (raw: unknown) => Record<string, unknown>;
}

/**
 * Minimal operational log input accepted from the consumer.
 */
interface LogInput {
  message: string;
  meta?: Record<string, unknown>;
  correlationId?: CorrelationId;
  parentLogId?: LogId;

  system?: ApiSystem;
  action?: string;
  target?: string;
  outcome?: Outcome;
}

/**
 * Common base fields guaranteed on every emitted log record.
 *
 * The logger fills these automatically so consumers do not need to provide them.
 */
interface BaseLogRecord {
  ts: Ts;
  logId: LogId;
  correlationId?: CorrelationId;
  parentLogId?: LogId;
  level: LogLevel;
  message: string;
  meta: Record<string, unknown>;
}

/**
 * Operational log record.
 *
 * Represents internal application/workflow events.
 */
interface OperationalLogRecord extends BaseLogRecord {
  kind: "operational";
  system?: ApiSystem;
  action?: string;
  target?: string;
  outcome?: Outcome;
}

/**
 * Structured URL parts used for analysis and reporting.
 */
interface UrlParts {
  base?: string;
  path: readonly string[];
  query?: Record<string, string>;
}

/**
 * Full request URL representation used in network logs.
 */
interface UrlInfo {
  raw: string;
  parts?: UrlParts;
}

/**
 * Network log record.
 *
 * Represents an HTTP/API request event.
 */
interface NetworkLogRecord extends BaseLogRecord {
  kind: "network";
  system: ApiSystem;
  method: HttpMethod;
  url: UrlInfo;
  status: number;
  durationMs: number;
  requestId?: string;
  requestBytes?: number;
  responseBytes?: number;
  endpoint?: string;
  error?: {
    name?: string;
    message: string;
    code?: string | number;
  };
}

/** Any record the logger can emit. */
type LogRecord = OperationalLogRecord | NetworkLogRecord;

/**
 * Pipeline filter function.
 */
type Filter = (record: LogRecord) => boolean;

/**
 * Pipeline formatter function.
 */
type Formatter<TPayload = unknown> = (record: LogRecord) => TPayload;

/**
 * Transport contract.
 */
interface Transport<TPayload = unknown> {
  name: string;
  write(payload: TPayload): void;
  flush?(): void;
}

/**
 * Extended transport contract for transports that buffer writes.
 */
interface BufferedTransport<TPayload> extends Transport<TPayload> {
  flush(): void;
}

/**
 * Pipeline contract.
 */
interface Pipeline<TPayload = unknown> {
  filter: Filter;
  format: Formatter<TPayload>;
  transport: Transport<TPayload>;
}

/**
 * Internal logger configuration used by `createLogger()`.
 */
interface LoggerConfig<TPayload = unknown> {
  level: LogLevel;
  pipelines: Pipeline<TPayload>[];
}

/**
 * Public logger instance contract returned by `createLogger()`.
 *
 * Operational logs are the general ledger.
 * Network logs are specialized request records.
 */
interface Logger {
  log(level: LogLevel, input: LogInput): OperationalLogRecord;
  debug(input: LogInput): OperationalLogRecord;
  info(input: LogInput): OperationalLogRecord;
  warn(input: LogInput): OperationalLogRecord;
  error(
    input: LogInput | { message: string; error: unknown; meta?: Record<string, unknown> }
  ): OperationalLogRecord;

  http(
    input: Omit<NetworkLogRecord, keyof BaseLogRecord | "kind" | "level"> & {
      message?: string;
      meta?: Record<string, unknown>;
      correlationId?: CorrelationId;
      parentLogId?: LogId;
    }
  ): NetworkLogRecord;

  flush(): void;
}

export {
  LogId,
  CorrelationId,
  Ts,
  ApiSystem,
  LogLevel,
  HttpMethod,
  Outcome,
  LogInput,
  BaseLogRecord,
  OperationalLogRecord,
  UrlParts,
  UrlInfo,
  NetworkLogRecord,
  LogRecord,
  Filter,
  Formatter,
  Transport,
  BufferedTransport,
  Pipeline,
  LoggerConfig,
  Logger,
  EndpointSpec,
};