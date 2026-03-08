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
 *
 * Intended to stay easy to use:
 * - `message` is the only required field
 * - `meta` can hold extra structured data
 * - `correlationId` can link related logs across one workflow
 * - `parentLogId` can point back to a parent/main log record
 */
interface LogInput {
  /** Human-readable message describing the event. */
  message: string;

  /** Optional structured metadata attached to the record. */
  meta?: Record<string, unknown>;

  /** Shared ID linking multiple related logs together. */
  correlationId?: CorrelationId;

  /** Optional parent record ID used to associate child logs with a main log. */
  parentLogId?: LogId;
}

/**
 * Common base fields guaranteed on every emitted log record.
 *
 * The logger fills these automatically so consumers do not need to provide them.
 */
interface BaseLogRecord {
  /** Timestamp of when the record was created. */
  ts: Ts;

  /** Unique ID for this specific record. */
  logId: LogId;

  /** Shared ID linking related records in the same workflow/execution. */
  correlationId?: CorrelationId;

  /** Parent record ID for linking child logs to a main/parent record. */
  parentLogId?: LogId;

  /** Severity level used for filtering and visibility. */
  level: LogLevel;

  /** Human-readable message describing the event. */
  message: string;

  /** Structured metadata normalized to an object. */
  meta: Record<string, unknown>;
}

/**
 * Operational log record.
 *
 * Represents internal application/workflow events such as:
 * - sync started
 * - sync completed
 * - validation failed
 * - cache refreshed
 * - task skipped
 *
 * These records are typically written to `Operational_Log`.
 */
interface OperationalLogRecord extends BaseLogRecord {
  kind: "operational";

  /** Optional associated system if the operation relates to a known external domain. */
  system?: ApiSystem;

  /** Optional action name such as "syncUsers", "buildIndex", or "refreshCache". */
  action?: string;

  /** Optional target being acted upon such as a sheet, API resource, or subsystem. */
  target?: string;

  /** Optional coarse outcome for workflow reporting. */
  outcome?: "OK" | "NOOP" | "SKIP" | "FAIL";
}

/**
 * Structured URL parts used for analysis and reporting.
 *
 * Useful when consumers want to inspect:
 * - path segments
 * - query parameters
 * - normalized base URL
 */
interface UrlParts {
  /** Base domain or URL root, if available. */
  base?: string;

  /** Path segments of the request URL. */
  path: readonly string[];

  /** Parsed query string values, if available. */
  query?: Record<string, string>;
}

/**
 * Full request URL representation used in network logs.
 *
 * - `raw` stores the original request URL
 * - `parts` stores a structured representation for analytics/reporting
 */
interface UrlInfo {
  /** Exact request URL used by the caller. */
  raw: string;

  /** Optional structured breakdown of the request URL. */
  parts?: UrlParts;
}

/**
 * Network log record.
 *
 * Represents an HTTP/API request event such as:
 * - Slack API call
 * - Notion query
 * - Google API request
 * - failed HTTP response
 *
 * These records are typically written to `Network_Log`.
 */
interface NetworkLogRecord extends BaseLogRecord {
  kind: "network";

  /** External system being called. */
  system: ApiSystem;

  /** HTTP method used by the request. */
  method: HttpMethod;

  /** Final request URL information. */
  url: UrlInfo;

  /** HTTP response status code. */
  status: number;

  /** Total request duration in milliseconds. */
  durationMs: number;

  /**
   * Optional request-scoped identifier returned by the API or generated by the caller.
   *
   * This is different from `correlationId`:
   * - `requestId` identifies one request
   * - `correlationId` links many related records
   */
  requestId?: string;

  /** Optional request payload size in bytes. */
  requestBytes?: number;

  /** Optional response payload size in bytes. */
  responseBytes?: number;

  /** Optional logical endpoint name such as "users.list" or "queryDatabase". */
  endpoint?: string;

  /** Optional structured error information associated with the request. */
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
 *
 * Determines whether a pipeline wants to handle a given record.
 */
type Filter = (record: LogRecord) => boolean;

/**
 * Pipeline formatter function.
 *
 * Converts a matching log record into the payload shape expected by the transport.
 */
type Formatter<TPayload = unknown> = (record: LogRecord) => TPayload;

/**
 * Transport contract.
 *
 * A transport receives a formatted payload and writes/sends it somewhere,
 * such as:
 * - Google Sheets
 * - console
 * - file output
 * - external sink
 */
interface Transport<TPayload = unknown> {
  /** Human-readable transport name. */
  name: string;

  /** Write a formatted payload to the destination. */
  write(payload: TPayload): void;
}

/**
 * Extended transport contract for transports that buffer writes.
 *
 * Example future uses:
 * - batch sheet writes
 * - buffered file writes
 */
interface BufferedTransport<TPayload> extends Transport<TPayload> {
  /** Flush any buffered payloads to the destination. */
  flush(): void;
}

/**
 * Pipeline contract.
 *
 * A pipeline is one logging channel/sink.
 *
 * Each pipeline decides:
 * - which records it accepts
 * - how to format them
 * - where to send them
 */
interface Pipeline<TPayload = unknown> {
  /** Record acceptance rule for this pipeline. */
  filter: Filter;

  /** Formatter used after the record passes the filter. */
  format: Formatter<TPayload>;

  /** Output destination for formatted payloads. */
  transport: Transport<TPayload>;
}

/**
 * Internal logger configuration used by `createLogger()`.
 *
 * The logger applies:
 * - one global severity threshold (`level`)
 * - one or more pipelines for routing/output
 */
interface LoggerConfig<TPayload = unknown> {
  /** Minimum severity level required for a record to be emitted. */
  level: LogLevel;

  /** Pipelines/channels that process emitted records. */
  pipelines: Pipeline<TPayload>[];
}

/**
 * Public logger instance contract returned by `createLogger()`.
 *
 * Exposes:
 * - operational log methods
 * - a structured HTTP/network log method
 */
interface Logger {
  /**
   * Write an operational log with an explicit level.
   *
   * @param level Severity of the operational log.
   * @param input Minimal caller-provided operational log input.
   */
  log(level: LogLevel, input: LogInput): LogRecord;

  /** Write an operational DEBUG log. */
  debug(input: LogInput): LogRecord;

  /** Write an operational INFO log. */
  info(input: LogInput): LogRecord;

  /** Write an operational WARN log. */
  warn(input: LogInput): LogRecord;

  /**
   * Write an operational ERROR log.
   *
   * Accepts either:
   * - a standard `LogInput`
   * - an object containing a raw error plus message/meta
   */
  error(
    input: LogInput | { message: string; error: unknown; meta?: Record<string, unknown> }
  ): LogRecord;

  /**
   * Write a structured network/HTTP log record.
   *
   * Intended for recording the result of an external request that already happened.
   *
   * Consumers typically provide:
   * - system
   * - method
   * - url
   * - status
   * - duration
   * - optional metadata
   */
  http(
    input: Omit<NetworkLogRecord, keyof BaseLogRecord | "kind" | "level"> & {
      message?: string;
      meta?: Record<string, unknown>;
      correlationId?: CorrelationId;
      parentLogId?: LogId;
    }
  ): NetworkLogRecord;
}

export {
  LogId,
  CorrelationId,
  Ts,
  ApiSystem,
  LogLevel,
  HttpMethod,
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