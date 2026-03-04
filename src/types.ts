// src/types.ts

/** Stable identifiers */
type LogId = string;

/** Timestamp type (stored as Date in-memory; convert to ISO string for Sheets). */
type Ts = Date;

/** External systems your code talks to. */
type ApiSystem = "GOOGLE" | "SLACK" | "NOTION";

/** Log severity level (include HTTP like Winston/Morgan). */
type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "HTTP";

/** Supported HTTP methods */
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Minimal caller input (prototype-friendly).
 * You can log with just a message, and optionally attach meta.
 */
interface LogInput {
  message: string;
  meta?: Record<string, unknown>;
}

/**
 * Common base fields for all produced log records.
 * Your library guarantees these.
 */
interface BaseLogRecord {
  ts: Ts;
  logId: LogId;
  level: LogLevel;
  message: string;
  meta: Record<string, unknown>; // normalized to {}
}

/**
 * Operational log record: “an action happened”.
 * Goes to Operational_Log.
 */
interface OperationalLogRecord extends BaseLogRecord {
  kind: "operational";
  system?: ApiSystem;

  action?: string;
  target?: string;
  outcome?: "OK" | "NOOP" | "SKIP" | "FAIL";
}

/**
 * URL parts used for building + analytics.
 */
interface UrlParts {
  base?: string;
  path: readonly string[];
  query?: Record<string, string>;
}

/**
 * Final URL representation.
 * - raw = exact request URL
 * - parts = structured version for analytics
 */
interface UrlInfo {
  raw: string;
  parts?: UrlParts;
}

/**
 * Network log record: “an HTTP call happened”.
 * Goes to Network_Log.
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

/** Any record your logger can emit. */
type LogRecord = OperationalLogRecord | NetworkLogRecord;

type Formatter<TPayload = unknown> = (record: LogRecord) => TPayload | null;

type Transport<TPayload = unknown> = {
  name: "console" | "json" | "file" | "sheets";
  write: (payload: TPayload) => void;
};

type Pipeline<TPayload = unknown> = {
  format: Formatter<TPayload>;
  transport: Transport<TPayload>;
};

interface LoggerConfig {
  level: LogLevel;
  pipelines: Pipeline[];
}

/**
 * Logger instance returned by createLogger().
 */
interface Logger {
  log(level: LogLevel, input: LogInput): LogRecord;

  debug(input: LogInput): LogRecord;
  info(input: LogInput): LogRecord;
  warn(input: LogInput): LogRecord;
  error(input: LogInput | { message: string; error: unknown; meta?: Record<string, unknown> }): LogRecord;

  /**
   * Structured HTTP logger (used by UrlFetchApp wrapper).
   */
  http(
    input: Omit<NetworkLogRecord, keyof BaseLogRecord | "kind" | "level"> & {
      message?: string;
      meta?: Record<string, unknown>;
    }
  ): NetworkLogRecord;
}

export {
  LogId,
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
  Transport,
  LoggerConfig,
  Logger,
};