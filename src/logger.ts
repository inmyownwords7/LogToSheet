// src/logger.ts
import {
  LogId,
  Ts,
  LogLevel,
  LogInput,
  LogRecord,
  OperationalLogRecord,
  NetworkLogRecord,
  Logger,
  LoggerConfig,
} from "./types";

/** Simple ID generator for logs */
function newLogId(): LogId {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    `${Date.now()}-${Math.random()}`
  );
  return bytes.slice(0, 5).map(b => (b & 0xff).toString(16).padStart(2, "0")).join("");
}

function now(): Ts {
  return new Date();
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 10,
  HTTP: 15,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

function shouldEmit(configLevel: LogLevel, recordLevel: LogLevel): boolean {
  return LEVEL_ORDER[recordLevel] >= LEVEL_ORDER[configLevel];
}

function normalizeMeta(meta: unknown): Record<string, unknown> {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

function createLogger(config: LoggerConfig): Logger {

  function emit(record: LogRecord): void {
    if (!shouldEmit(config.level, record.level)) return;

    for (const p of config.pipelines) {
      const payload = p.format(record);
      p.transport.write(payload);
    }
  }

  function base(level: LogLevel, input: LogInput) {
    return {
      ts: now(),
      logId: newLogId(),
      level,
      message: input.message,
      meta: normalizeMeta(input.meta),
    };
  }

  function log(level: LogLevel, input: LogInput): LogRecord {
    const record: OperationalLogRecord = {
      kind: "operational",
      ...base(level, input),
    };

    emit(record);
    return record;
  }

  function http(
    input: Omit<NetworkLogRecord, "kind" | "level" | keyof import("./types").BaseLogRecord> & {
      message?: string;
      meta?: Record<string, unknown>;
    }
  ): NetworkLogRecord {

    const record: NetworkLogRecord = {
      kind: "network",
      ts: now(),
      logId: newLogId(),
      level: "HTTP",
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
          message: `${input.message}: ${msg}`,
          meta: input.meta,
        });
      }

      return log("ERROR", input);
    },
    http,
  };
}
export { createLogger };