
# LoggerLib

A structured logging library for **Google Apps Script** with support for:

- Operational logs (workflow events)
- Network/API logs (HTTP requests)
- Pipeline-based output
- Buffered Google Sheets transport
- Correlation IDs for tracing executions

LoggerLib is designed to make **Apps Script automation observable**, especially when working with APIs such as **Slack, Notion, and Google APIs**.

---

# Features

- Structured logging
- Operational + Network log separation
- Pipeline-based architecture
- Buffered sheet writes (`setValues()` batching)
- Automatic correlation IDs
- Flexible metadata (`meta`)
- Safe JSON serialization
- Endpoint registry support
- Multiple logger instances or singleton usage

---

# Architecture

LoggerLib is organized into layered modules:

```
types.ts
  └── Public contracts
      - log input and record shapes
      - endpoint specs
      - init config
      - public logger instance

internal-types.ts
  └── Internal contracts
      - pipelines
      - transports
      - internal logger engine types

logger.ts
  └── Core logging engine
      - record creation
      - severity filtering
      - pipeline routing

endpoints.ts
  └── Endpoint registry helpers
      - combined registry
      - system inference
      - method normalization

slack-endpoints.ts / notion-endpoints.ts / google-endpoints.ts
  └── Per-service endpoint definitions

sheets.ts
  └── Google Sheets transport
      - row formatting
      - buffered writes
      - header initialization

index.ts
  └── Public library API
      - GAS global exports
      - singleton helpers
      - LoggerLib namespace
```

---

# Log Types

LoggerLib supports two log categories.

## Operational Logs

Used for application workflow events.

Examples:

- sync started
- validation failed
- cache refreshed
- task skipped

Fields:

```
ts
logId
correlationId
parentLogId
level
system
action
target
outcome
message
metaJson
```

---

## Network Logs

Used for HTTP/API request events.

Examples:

- Slack API calls
- Notion database queries
- Google API requests

Fields:

```
ts
logId
correlationId
parentLogId
level
system
method
endpoint
url
status
durationMs
requestBytes
responseBytes
queryJson
metaJson
errorMessage
```

---

# Installation (Apps Script Library)

1. Build the library project so it produces `dist/Code.gs`.

2. Deploy that Apps Script project as a library.

3. In the consumer Apps Script project, add the deployed library and use its chosen identifier.

4. Create or choose a Google Spreadsheet where logs should be written, then copy its spreadsheet ID.

5. Initialize the library once per execution with that spreadsheet ID before calling any log methods.

Example build:

```javascript
esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/Code.gs",
  format: "iife",
  target: "es2019",
});
```

---

# Consumer Quick Start

From a consumer script, the normal flow is:

1. Add the library to the Apps Script project.
2. Call `LoggerLib.init({ spreadsheetId })` once near the start of the execution.
3. Call `LoggerLib.info()`, `warn()`, `error()`, or `http()` during the workflow.
4. Call `LoggerLib.flush()` in a `finally` block before the execution ends.

Example:

```javascript
function example() {
  LoggerLib.init({
    spreadsheetId: "YOUR_SPREADSHEET_ID"
  });

  try {
    LoggerLib.info({
      message: "Workflow started"
    });

    LoggerLib.warn({
      message: "Unexpected value",
      meta: { value: 42 }
    });
  } finally {
    LoggerLib.flush();
  }
}
```

---

# What Happens On Init

When `LoggerLib.init()` or `LoggerLib.create()` runs:

- the logger instance is created
- the target sheets are created if they do not already exist
- headers are added if the sheets are new or empty
- console logging is enabled by default unless `console: false` is passed

By default, the library uses these sheet names:

- `Operational_Log`
- `Network_Log`

You can override them with `operationalSheet` and `networkSheet`.

---

# Basic Usage

Initialize the logger once per execution, then flush before the script ends.

```javascript
function example() {
  LoggerLib.init({
    spreadsheetId: "YOUR_SPREADSHEET_ID"
  });

  try {
    LoggerLib.info({
      message: "Workflow started"
    });

    LoggerLib.warn({
      message: "Unexpected value",
      meta: { value: 42 }
    });
  } finally {
    LoggerLib.flush();
  }
}
```

---

# Network Logging

Use `http()` to log API calls.

```javascript
LoggerLib.http({
  system: "NOTION",
  method: "POST",
  url: { raw: "https://api.notion.com/v1/databases/query" },
  status: 200,
  durationMs: 520
});
```

---

# Correlation IDs

Each logger instance receives a default correlation ID.

This allows multiple logs during a workflow execution to be linked together.

Example flow:

```
syncUsers started
   └─ fetch users
   └─ update database
   └─ sync completed
```

All logs share the same correlation ID.

---

# Flushing Logs

Sheets writes are buffered for performance.

`flush()` writes buffered log rows to the spreadsheet.

It is still required even though sheet creation now happens automatically during
`init()` / `create()`.

In other words:

- sheet creation and header setup happen automatically
- row writes happen on `flush()`

Always flush at the end of a workflow.

```javascript
try {
  LoggerLib.info({
    message: "sync started"
  });

  // workflow logic
} finally {
  LoggerLib.flush();
}
```

---

# Creating Independent Logger Instances

You can create separate logger instances if needed.

```javascript
const logger = LoggerLib.create({
  spreadsheetId: "SHEET_ID"
});

logger.info({
  message: "Independent logger"
});

logger.flush();
```

---

# Endpoint Helpers

Endpoint helpers are exposed under the `LoggerLib` namespace.

They are not published as standalone Apps Script globals.

```javascript
const system = LoggerLib.inferSystemFromUrl("https://api.notion.com/v1/pages/123");
const method = LoggerLib.normalizeMethod("post");
const endpoint = LoggerLib.ENDPOINTS["notion.pages.retrieve"];

LoggerLib.info({
  message: "Endpoint resolved",
  meta: {
    system,
    method,
    endpoint: endpoint?.endpoint ?? ""
  }
});
```

Available registry objects:

- `LoggerLib.ENDPOINTS`
- `LoggerLib.GOOGLE_ENDPOINTS`
- `LoggerLib.NOTION_ENDPOINTS`
- `LoggerLib.SLACK_ENDPOINTS`

---

# Pipeline Design

LoggerLib uses a **pipeline architecture**.

This is an internal implementation detail.

Library consumers use `LoggerLib.init()` and `LoggerLib.create()` rather than
constructing pipelines or transports directly.

```
LogRecord
   ↓
filter()
   ↓
format()
   ↓
transport.write()
```

This allows future extensions such as:

- console transports
- file transports
- BigQuery transports
- Slack alert pipelines

---

# Example Sheets Output

## Operational_Log

| ts | logId | level | message |
|---|---|---|---|
| 2026-03-12 | a13f9 | INFO | sync started |

## Network_Log

| ts | system | method | status |
|---|---|---|---|
| 2026-03-12 | NOTION | POST | 200 |

---

# Performance

LoggerLib uses **buffered sheet writes**.

Instead of:

```
appendRow() per log
```

it performs:

```
setValues() batch writes
```

This dramatically improves performance for large workflows.

---

# Future Extensions

Potential future additions:

- automatic endpoint detection
- retry logging
- execution timing helpers
- alert pipelines
- structured error capture
- log sampling
- distributed tracing support

---

# License

MIT
