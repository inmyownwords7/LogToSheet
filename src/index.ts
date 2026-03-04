// src/index.ts

import { createLogger } from "./logger";
import { makeSheetsRowTransport, toOperationalRow, toNetworkRow, DEFAULT_NETWORK_HEADERS, DEFAULT_OPERATIONAL_HEADERS } from "./sheets";
import { Logger, LoggerConfig, LogInput, LogRecord } from "./types";

/**
 * Configuration provided by the consumer project when initializing the library.
 */
type InitConfig = {
    /** Spreadsheet ID where the log sheets exist (or will be created). */
    spreadsheetId: string;

    /** Sheet name for operational logs (default: "Operational_Log"). */
    operationalSheet?: string;

    /** Sheet name for network logs (default: "Network_Log"). */
    networkSheet?: string;

    operationalHeaders?: string[];
    networkHeaders?: string[];

    /** Minimum log level to emit (default: "INFO"). */
    level?: LoggerConfig["level"];
};

/** Internal singleton used by the simple `init()` + `log()` helpers. */
let singleton: Logger | null = null;

/**
 * Builds a configured logger instance with Sheets receivers.
 */
function buildLogger(config: InitConfig): Logger {
    const opName = config.operationalSheet ?? "Operational_Log";
    const netName = config.networkSheet ?? "Network_Log";
    const level = config.level ?? "INFO";

    const opHeaders = config.operationalHeaders ?? DEFAULT_OPERATIONAL_HEADERS;
    const netHeaders = config.networkHeaders ?? DEFAULT_NETWORK_HEADERS;
    const opTransport = makeSheetsRowTransport(config.spreadsheetId, opName);
    const netTransport = makeSheetsRowTransport(config.spreadsheetId, netName);

    return createLogger({
        level,
        pipelines: [
            {
                format: (r: LogRecord) => (r.kind === "operational" ? toOperationalRow(r) : null),
                transport: { name: "sheets", write: (row: any) => row && opTransport.write(row) },
            },
            {
                format: (r: LogRecord) => (r.kind === "network" ? toNetworkRow(r) : null),
                transport: { name: "sheets", write: (row: any) => row && netTransport.write(row) },
            },
        ],
    });
}

/**
 * Initializes the library singleton.
 * Call this once per execution in the consumer project (e.g., at the top of your entrypoint).
 */
function init(config: InitConfig): void {
    singleton = buildLogger(config);
}

/**
 * Creates an isolated logger instance (no singleton).
 * Useful if the consumer wants multiple destinations/configs.
 */
function create(config: InitConfig) {
    const logger = buildLogger(config);
    return {
        log: (input: LogInput) => logger.info(input),
        debug: (input: LogInput) => logger.debug(input),
        info: (input: LogInput) => logger.info(input),
        warn: (input: LogInput) => logger.warn(input),
        error: (input: any) => logger.error(input),
        http: (input: Parameters<Logger["http"]>[0]) => logger.http(input),
    };
}

/**
 * Writes an operational log using the singleton logger.
 * Requires `init()` to have been called first.
 */
function log(input: LogInput) {
    if (!singleton) throw new Error("LoggerLib not initialized. Call LoggerLib.init({ spreadsheetId }) first.");
    return singleton.info(input);
}

/**
 * Writes a network/HTTP log using the singleton logger.
 * Requires `init()` to have been called first.
 */
function http(input: Parameters<Logger["http"]>[0]) {
    if (!singleton) throw new Error("LoggerLib not initialized. Call LoggerLib.init({ spreadsheetId }) first.");
    return singleton.http(input);
}

function debug(input: LogInput) {
    if (!singleton) throw new Error("LoggerLib not initialized. Call LoggerLib.init({ spreadsheetId }) first.");
    return singleton.debug(input);
}

function info(input: LogInput) {
    if (!singleton) throw new Error("LoggerLib not initialized. Call LoggerLib.init({ spreadsheetId }) first.");
    return singleton.info(input);
}

function warn(input: LogInput) {
    if (!singleton) throw new Error("LoggerLib not initialized. Call LoggerLib.init({ spreadsheetId }) first.");
    return singleton.warn(input);
}

function error(input: any) {
    if (!singleton) throw new Error("LoggerLib not initialized. Call LoggerLib.init({ spreadsheetId }) first.");
    return singleton.error(input);
}

/**
 * Expose functions on global scope so GAS Library consumers can call:
 * `LoggerLib.init(...)`, `LoggerLib.log(...)`, etc.
 *
 * IMPORTANT: GAS libraries expose global functions, not ES module exports.
 */
(globalThis as any).init = init;
(globalThis as any).create = create;
(globalThis as any).log = log;
(globalThis as any).debug = debug;
(globalThis as any).info = info;
(globalThis as any).warn = warn;
(globalThis as any).error = error;
(globalThis as any).http = http;

/** Also expose a namespaced object for convenience. */
(globalThis as any).LoggerLib = { init, create, log, debug, info, warn, error, http };