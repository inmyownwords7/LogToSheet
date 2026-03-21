import type {
  BaseLogRecord,
  CorrelationId,
  LogId,
  LogInput,
  LogLevel,
  NetworkLogRecord,
  OperationalLogRecord,
} from "./types";

/** Any record the logger can emit internally. */
type LogRecord = OperationalLogRecord | NetworkLogRecord;

/** Pipeline filter function. */
type Filter = (record: LogRecord) => boolean;

/** Pipeline formatter function. */
type Formatter<TPayload = unknown> = (record: LogRecord) => TPayload;

/** Transport contract. */
interface Transport<TPayload = unknown> {
  name: string;
  write(payload: TPayload): void;
  flush?(): void;
}

/** Extended transport contract for transports that buffer writes. */
interface BufferedTransport<TPayload> extends Transport<TPayload> {
  flush(): void;
}

/** Pipeline contract. */
interface Pipeline<TPayload = unknown> {
  filter: Filter;
  format: Formatter<TPayload>;
  transport: Transport<TPayload>;
}

/** Internal logger configuration used by `createLogger()`. */
interface LoggerConfig<TPayload = unknown> {
  level: LogLevel;
  console?: boolean;
  pipelines: Pipeline<TPayload>[];
}

/** Internal logger instance used by the runtime implementation. */
interface InternalLogger {
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

export type {
  BufferedTransport,
  Filter,
  Formatter,
  InternalLogger,
  LoggerConfig,
  LogRecord,
  Pipeline,
  Transport,
};
