// src/logger.ts

import type {
  BaseLogRecord,
  CorrelationId,
  LogId,
  LogInput,
  LogLevel,
  NetworkLogRecord,
  OperationalLogRecord,
  Ts,
} from "./types";
import type {
  InternalLogger,
  LoggerConfig,
  LogRecord,
} from "./internal-types";

/**
 * Responsibility: Build structured log records and emit them through configured pipelines.
 *
 * This module is the core logging engine.
 *
 * It handles:
 * - generating timestamps and unique log IDs
 * - assigning default correlation IDs
 * - normalizing caller metadata
 * - applying global severity filtering
 * - creating operational and network log records
 * - sending accepted records through the configured pipeline chain
 *
 * This module does NOT know anything about Google Sheets or storage.
 * It only creates records and hands them off to transports through pipelines.
 */

/**
 * Generate a unique identifier for a single log record.
 *
 * Used for `logId`, which should be unique per emitted row/record.
 *
 * @returns A short unique log identifier.
 */
function newLogId(): LogId {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    `${Date.now()}-${Math.random()}`
  );

  return bytes
    .slice(0, 5)
    .map((b) => (b & 0xff).toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Return the current timestamp as a Date object.
 *
 * The timestamp is stored as a real Date value so transports like
 * Google Sheets can preserve date behavior such as sorting/filtering.
 *
 * @returns Current timestamp.
 */
function now(): Ts {
  return new Date();
}

/**
 * Numeric severity ordering used for global level filtering.
 *
 * Higher numbers represent more severe/important records.
 * A record is emitted only if:
 *
 * `recordLevel >= configLevel`
 *
 * Example:
 * - config = INFO
 * - record = DEBUG -> skipped
 * - record = WARN  -> emitted
 */
const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

/**
 * Determine whether a record should be emitted based on the configured
 * minimum severity level.
 *
 * @param configLevel Minimum configured level for the logger instance.
 * @param recordLevel Severity of the record being evaluated.
 * @returns True if the record should continue through the pipeline chain.
 */
function shouldEmit(configLevel: LogLevel, recordLevel: LogLevel): boolean {
  return LEVEL_ORDER[recordLevel] >= LEVEL_ORDER[configLevel];
}

/**
 * Normalize arbitrary metadata into a plain object.
 *
 * The logger guarantees that `meta` is always an object on emitted records.
 * Non-object inputs are replaced with an empty object.
 *
 * @param meta Caller-provided metadata.
 * @returns A plain object safe to attach to a record.
 */
function normalizeMeta(meta: unknown): Record<string, unknown> {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

/**
 * Write an accepted record to the runtime console.
 *
 * Console output is enabled by default so callers get immediate visibility
 * during execution in addition to any configured transports.
 *
 * @param record Structured log record to print.
 */
function writeToConsole(record: LogRecord): void {
  const consoleApi = globalThis.console;
  if (!consoleApi) return;

  const prefix = `[${record.level}] ${record.kind}`;
  const line = `${prefix} ${record.message}`;

  switch (record.level) {
    case "DEBUG":
      (consoleApi.debug ?? consoleApi.log).call(consoleApi, line, record);
      return;
    case "INFO":
      (consoleApi.info ?? consoleApi.log).call(consoleApi, line, record);
      return;
    case "WARN":
      (consoleApi.warn ?? consoleApi.log).call(consoleApi, line, record);
      return;
    case "ERROR":
      (consoleApi.error ?? consoleApi.log).call(consoleApi, line, record);
      return;
  }
}

/**
 * Create a logger instance with a fixed global level threshold and one or more pipelines.
 *
 * Each logger instance automatically receives a default `correlationId`.
 * If a caller does not provide one, that default ID is reused across records
 * emitted by this logger instance, allowing related records to be traced together.
 *
 * Pipelines are responsible for:
 * - deciding whether they want a record (`filter`)
 * - converting it to an output payload (`format`)
 * - sending it to a destination (`transport`)
 *
 * @param config Internal logger configuration.
 * @returns A logger instance implementing the Logger contract.
 */
function createLogger<TPayload = unknown>(config: LoggerConfig<TPayload>): InternalLogger {
  /**
   * Default workflow-level correlation ID for this logger instance.
   *
   * Used when the caller does not provide `correlationId` explicitly.
   * This allows multiple related records created during one execution
   * to share the same correlation value by default.
   */
  const defaultCorrelationId = Utilities.getUuid();

  /**
   * Emit a record through the configured pipeline chain.
   *
   * Flow:
   * 1. apply global severity filter
   * 2. ask each pipeline whether it accepts the record
   * 3. format the record for accepted pipelines
   * 4. write the formatted payload through the pipeline transport
   *
   * @param record Structured log record to emit.
   */
  function emit(record: LogRecord): void {
    if (!shouldEmit(config.level, record.level)) return;
    if (config.console !== false) writeToConsole(record);

    for (const p of config.pipelines) {
      if (!p.filter(record)) continue;
      const payload = p.format(record);
      p.transport.write(payload);
    }
  }

  /**
   * Flush any buffered transports used by the configured pipelines.
   *
   * Transports that do not buffer writes may omit `flush()`.
   * This method safely calls `flush()` only when it exists.
   */
  function flush(): void {
    for (const p of config.pipelines) {
      if (typeof p.transport.flush === "function") {
        p.transport.flush();
      }
    }
  }

  /**
   * Build the common/base fields shared by all emitted records.
   *
   * This is used primarily by operational logs, but the same field model
   * also applies conceptually to network logs.
   *
   * Default behavior:
   * - `logId` is always unique per record
   * - `correlationId` is inherited from input if provided, otherwise defaults
   *   to the logger instance correlation ID
   * - `parentLogId` is passed through unchanged if provided
   * - `meta` is normalized into a plain object
   *
   * @param level Severity for the record.
   * @param input Caller-provided operational log input.
   * @returns A normalized base record envelope.
   */
  function base(level: LogLevel, input: LogInput): BaseLogRecord {
    return {
      ts: now(),
      logId: newLogId(),
      correlationId: input.correlationId ?? defaultCorrelationId,
      parentLogId: input.parentLogId,
      level,
      message: input.message,
      meta: normalizeMeta(input.meta),
    };
  }

  /**
   * Create and emit an operational log record.
   *
   * Operational records represent internal application/workflow events such as:
   * - sync started
   * - task completed
   * - validation failed
   * - cache refreshed
   *
   * @param level Severity of the operational event.
   * @param input Caller-provided operational log input.
   * @returns The emitted operational log record.
   */
  function log(level: LogLevel, input: LogInput): OperationalLogRecord {
    const record: OperationalLogRecord = {
      kind: "operational",
      ...base(level, input),
      system: input.system,
      action: input.action,
      target: input.target,
      outcome: input.outcome,
    };

    emit(record);
    return record;
  }

  /**
   * Create and emit a structured network/HTTP log record.
   *
   * Network records represent completed external requests such as:
   * - Slack API calls
   * - Notion queries
   * - Google API requests
   *
   * This function does NOT perform the HTTP request itself.
   * It only records the details of a request/result that already happened.
   *
   * Default behavior:
   * - assigns a unique `logId`
   * - inherits caller `correlationId` if present, otherwise uses the logger default
   * - optionally links to a parent/main record via `parentLogId`
   * - defaults severity to `INFO`
   * - builds a default message if one was not provided
   *
   * @param input Structured network log input.
   * @returns The emitted network log record.
   */
  function http(
    input: Omit<NetworkLogRecord, keyof BaseLogRecord | "kind" | "level"> & {
      message?: string;
      meta?: Record<string, unknown>;
      correlationId?: CorrelationId;
      parentLogId?: LogId;
    }
  ): NetworkLogRecord {
    const record: NetworkLogRecord = {
      kind: "network",
      ts: now(),
      logId: newLogId(),
      correlationId: input.correlationId ?? defaultCorrelationId,
      parentLogId: input.parentLogId,
      level: "INFO",
      message:
        input.message ??
        `${input.method} ${input.url.raw} ${input.status} - ${input.durationMs}ms`,
      meta: normalizeMeta(input.meta),

      system: input.system,
      method: input.method,
      url: input.url,
      status: input.status,
      durationMs: input.durationMs,

      requestId: input.requestId,
      requestBytes: input.requestBytes,
      responseBytes: input.responseBytes,
      endpoint: input.endpoint,
      error: input.error,
    };

    emit(record);
    return record;
  }

  /**
   * Return the public logger API.
   *
   * Operational helper methods (`debug`, `info`, `warn`, `error`) are thin wrappers
   * around the generic `log()` function.
   *
   * `http()` creates structured network records.
   */
  return {
    log,

    debug: (input) => log("DEBUG", input),

    info: (input) => log("INFO", input),

    warn: (input) => log("WARN", input),

    error: (input) => {
      if ("error" in input) {
        const msg =
          input.error instanceof Error
            ? input.error.message
            : String(input.error);

        return log("ERROR", {
          ...input,
          message: `${input.message}: ${msg}`,
          meta: input.meta,
        });
      }

      return log("ERROR", input);
    },

    http,
    flush,
  };
}

export { createLogger };
