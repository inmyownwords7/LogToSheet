// src/index.ts

import { createLogger } from "./logger";
import {
  makeSheetsRowTransport,
  toOperationalRow,
  toNetworkRow,
  DEFAULT_NETWORK_HEADERS,
  DEFAULT_OPERATIONAL_HEADERS,
  Row
} from "./sheets";

import type {
  Logger,
  LoggerConfig,
  LogInput,
  LogRecord,
  NetworkLogRecord,
  OperationalLogRecord
} from "./types";

/**
 * Public initialization config for LoggerLib.
 *
 * Used by consumer scripts when calling `LoggerLib.init()` or `LoggerLib.create()`.
 *
 * @property spreadsheetId Target spreadsheet where log sheets will be created or updated.
 * @property operationalSheet Optional sheet name for operational logs. Defaults to "Operational_Log".
 * @property networkSheet Optional sheet name for network logs. Defaults to "Network_Log".
 * @property operationalHeaders Optional custom headers for the operational log sheet.
 * @property networkHeaders Optional custom headers for the network log sheet.
 * @property level Minimum log severity to emit. Defaults to "INFO".
 */
type InitConfig = {
  spreadsheetId: string;
  operationalSheet?: string;
  networkSheet?: string;
  operationalHeaders?: string[];
  networkHeaders?: string[];
  level?: LoggerConfig["level"];
};

/**
 * Singleton logger used by the simple global helper functions:
 * `log`, `debug`, `info`, `warn`, `error`, and `http`.
 */
let singleton: Logger | null = null;

/**
 * Build a configured logger instance with two Sheets pipelines:
 *
 * - operational records -> Operational_Log
 * - network records -> Network_Log
 *
 * This function wires together:
 * - level filtering
 * - per-pipeline filtering
 * - row formatting
 * - Google Sheets transports
 *
 * @param config Consumer-provided logger initialization settings.
 * @returns A fully configured Logger instance.
 */
function buildLogger(config: InitConfig): Logger {
  const opName = config.operationalSheet ?? "Operational_Log";
  const netName = config.networkSheet ?? "Network_Log";
  const level = config.level ?? "INFO";

  const opHeaders = config.operationalHeaders ?? DEFAULT_OPERATIONAL_HEADERS;
  const netHeaders = config.networkHeaders ?? DEFAULT_NETWORK_HEADERS;

  const opTransport = makeSheetsRowTransport(config.spreadsheetId, opName, opHeaders);
  const netTransport = makeSheetsRowTransport(config.spreadsheetId, netName, netHeaders);

  return createLogger<Row>({
    level,
    pipelines: [
      {
        filter: (r: LogRecord) => r.kind === "operational",
        format: (r: LogRecord) => toOperationalRow(r as OperationalLogRecord),
        transport: { name: "sheets", write: (row: Row) => opTransport.write(row) },
      },
      {
        filter: (r: LogRecord) => r.kind === "network",
        format: (r: LogRecord) => toNetworkRow(r as NetworkLogRecord),
        transport: { name: "sheets", write: (row: Row) => netTransport.write(row) },
      },
    ],
  });
}

/**
 * Initialize the LoggerLib singleton.
 *
 * Call this once near the start of a script execution before using
 * any of the singleton helpers like `LoggerLib.info()` or `LoggerLib.http()`.
 *
 * @param config Logger initialization settings.
 */
function init(config: InitConfig): void {
  singleton = buildLogger(config);
}

/**
 * Create an independent logger instance without using the singleton.
 *
 * Useful when:
 * - you want multiple logger instances
 * - you want different spreadsheets or sheet names
 * - you want isolated logger configurations
 *
 * @param config Logger initialization settings.
 * @returns A logger instance with operational and network logging methods.
 */
function create(config: InitConfig) {
  const logger = buildLogger(config);

  return {
    /**
     * Write a standard operational INFO log.
     *
     * @param input Basic log input containing a message and optional metadata.
     */
    log: (input: LogInput) => logger.info(input),

    /**
     * Write an operational DEBUG log.
     *
     * @param input Basic log input containing a message and optional metadata.
     */
    debug: (input: LogInput) => logger.debug(input),

    /**
     * Write an operational INFO log.
     *
     * @param input Basic log input containing a message and optional metadata.
     */
    info: (input: LogInput) => logger.info(input),

    /**
     * Write an operational WARN log.
     *
     * @param input Basic log input containing a message and optional metadata.
     */
    warn: (input: LogInput) => logger.warn(input),

    /**
     * Write an operational ERROR log.
     *
     * Accepts either a standard log input or an object containing an error.
     *
     * @param input Error log input.
     */
    error: (input: Parameters<Logger["error"]>[0]) => logger.error(input),

    /**
     * Write a network/HTTP log record.
     *
     * Use this after making an external API call when you want to record:
     * - system
     * - HTTP method
     * - URL
     * - status code
     * - duration
     * - optional request/response metadata
     *
     * @param input Structured HTTP/network log input.
     */
    http: (input: Parameters<Logger["http"]>[0]) => logger.http(input),
  };
}

/**
 * Write an operational INFO log using the initialized singleton.
 *
 * Equivalent to `singleton.info(input)`.
 *
 * @param input Basic log input containing a message and optional metadata.
 * @returns The emitted operational log record.
 * @throws Error if LoggerLib has not been initialized.
 */
function log(input: LogInput) {
  if (!singleton) throw new Error("LoggerLib not initialized. Call LoggerLib.init({ spreadsheetId }) first.");
  return singleton.info(input);
}

/**
 * Write a network/HTTP log using the initialized singleton.
 *
 * @param input Structured HTTP/network log input.
 * @returns The emitted network log record.
 * @throws Error if LoggerLib has not been initialized.
 */
function http(input: Parameters<Logger["http"]>[0]) {
  if (!singleton) throw new Error("LoggerLib not initialized. Call LoggerLib.init({ spreadsheetId }) first.");
  return singleton.http(input);
}

/**
 * Write an operational DEBUG log using the singleton.
 *
 * @param input Basic log input containing a message and optional metadata.
 * @returns The emitted operational log record.
 * @throws Error if LoggerLib has not been initialized.
 */
function debug(input: LogInput) {
  if (!singleton) throw new Error("LoggerLib not initialized. Call LoggerLib.init({ spreadsheetId }) first.");
  return singleton.debug(input);
}

/**
 * Write an operational INFO log using the singleton.
 *
 * @param input Basic log input containing a message and optional metadata.
 * @returns The emitted operational log record.
 * @throws Error if LoggerLib has not been initialized.
 */
function info(input: LogInput) {
  if (!singleton) throw new Error("LoggerLib not initialized. Call LoggerLib.init({ spreadsheetId }) first.");
  return singleton.info(input);
}

/**
 * Write an operational WARN log using the singleton.
 *
 * @param input Basic log input containing a message and optional metadata.
 * @returns The emitted operational log record.
 * @throws Error if LoggerLib has not been initialized.
 */
function warn(input: LogInput) {
  if (!singleton) throw new Error("LoggerLib not initialized. Call LoggerLib.init({ spreadsheetId }) first.");
  return singleton.warn(input);
}

/**
 * Write an operational ERROR log using the singleton.
 *
 * @param input Error log input.
 * @returns The emitted operational log record.
 * @throws Error if LoggerLib has not been initialized.
 */
function error(input: Parameters<Logger["error"]>[0]) {
  if (!singleton) throw new Error("LoggerLib not initialized. Call LoggerLib.init({ spreadsheetId }) first.");
  return singleton.error(input);
}

/**
 * Expose LoggerLib functions globally for Google Apps Script library consumers.
 */
(globalThis as any).init = init;
(globalThis as any).create = create;
(globalThis as any).log = log;
(globalThis as any).debug = debug;
(globalThis as any).info = info;
(globalThis as any).warn = warn;
(globalThis as any).error = error;
(globalThis as any).http = http;

/**
 * Namespaced convenience object for library consumers.
 */
(globalThis as any).LoggerLib = { init, create, log, debug, info, warn, error, http };