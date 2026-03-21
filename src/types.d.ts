/**
 * Responsibility: Provide TypeScript type declarations for LoggerLib
 * when consumed as a compiled Google Apps Script library.
 *
 * This file allows editors (VSCode) to provide autocomplete
 * and type checking when LoggerLib is imported externally.
 *
 * Important:
 * This declaration file must match the actual runtime API
 * exposed in index.ts. If the signatures diverge,
 * editor hints will be incorrect.
 */

declare namespace LoggerLib {
  type LogId = string;
  type CorrelationId = string;
  type Ts = Date;

  type KnownApiSystem = "GOOGLE" | "SLACK" | "NOTION";
  type ApiSystem = KnownApiSystem | "OTHER";
  type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
  type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  type Outcome = "OK" | "NOOP" | "SKIP" | "FAIL";
  type EndpointKey = string;

  interface EndpointSpec {
    system: ApiSystem;
    method: HttpMethod;
    endpoint: string;
    pickMeta?: (raw: unknown) => Record<string, unknown>;
  }

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

  interface BaseLogRecord {
    ts: Ts;
    logId: LogId;
    correlationId?: CorrelationId;
    parentLogId?: LogId;
    level: LogLevel;
    message: string;
    meta: Record<string, unknown>;
  }

  interface OperationalLogRecord extends BaseLogRecord {
    kind: "operational";
    system?: ApiSystem;
    action?: string;
    target?: string;
    outcome?: Outcome;
  }

  interface UrlParts {
    base?: string;
    path: readonly string[];
    query?: Record<string, string>;
  }

  interface UrlInfo {
    raw: string;
    parts?: UrlParts;
  }

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

  interface InitConfig {
    spreadsheetId: string;
    operationalSheet?: string;
    networkSheet?: string;
    operationalHeaders?: string[];
    networkHeaders?: string[];
    level?: LogLevel;
    /** Whether accepted records should also be written to `console`. Defaults to true. */
    console?: boolean;
  }

  interface LoggerInstance {
    log(input: LogInput): OperationalLogRecord;
    debug(input: LogInput): OperationalLogRecord;
    info(input: LogInput): OperationalLogRecord;
    warn(input: LogInput): OperationalLogRecord;
    error(
      input:
        | LogInput
        | { message: string; error: unknown; meta?: Record<string, unknown> }
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
}

declare function init(config: LoggerLib.InitConfig): void;
declare function create(config: LoggerLib.InitConfig): LoggerLib.LoggerInstance;
declare function log(input: LoggerLib.LogInput): LoggerLib.OperationalLogRecord;
declare function debug(input: LoggerLib.LogInput): LoggerLib.OperationalLogRecord;
declare function info(input: LoggerLib.LogInput): LoggerLib.OperationalLogRecord;
declare function warn(input: LoggerLib.LogInput): LoggerLib.OperationalLogRecord;
declare function error(
  input:
    | LoggerLib.LogInput
    | { message: string; error: unknown; meta?: Record<string, unknown> }
): LoggerLib.OperationalLogRecord;
declare function http(
  input: Omit<LoggerLib.NetworkLogRecord, keyof LoggerLib.BaseLogRecord | "kind" | "level"> & {
    message?: string;
    meta?: Record<string, unknown>;
    correlationId?: LoggerLib.CorrelationId;
    parentLogId?: LoggerLib.LogId;
  }
): LoggerLib.NetworkLogRecord;
declare function flush(): void;

declare const ENDPOINTS: Record<string, LoggerLib.EndpointSpec>;
declare function inferSystemFromUrl(url: string): LoggerLib.ApiSystem;
declare function normalizeMethod(method?: string): LoggerLib.HttpMethod;
declare const GOOGLE_ENDPOINTS: Record<string, LoggerLib.EndpointSpec>;
declare const NOTION_ENDPOINTS: Record<string, LoggerLib.EndpointSpec>;
declare const SLACK_ENDPOINTS: Record<string, LoggerLib.EndpointSpec>;

declare const LoggerLib: LoggerLib.LoggerInstance & {
  init: typeof init;
  create: typeof create;
  ENDPOINTS: typeof ENDPOINTS;
  inferSystemFromUrl: typeof inferSystemFromUrl;
  normalizeMethod: typeof normalizeMethod;
  GOOGLE_ENDPOINTS: typeof GOOGLE_ENDPOINTS;
  NOTION_ENDPOINTS: typeof NOTION_ENDPOINTS;
  SLACK_ENDPOINTS: typeof SLACK_ENDPOINTS;
};
