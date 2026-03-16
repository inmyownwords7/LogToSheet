
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
  └── Shared contracts and types

logger.ts
  └── Core logging engine
      - record creation
      - severity filtering
      - pipeline routing

sheets.ts
  └── Google Sheets transport
      - row formatting
      - buffered writes
      - header initialization

endpoint-registry.ts
  └── API classification helpers
      - Slack
      - Notion
      - Google

index.ts
  └── Public library API
      - GAS global exports
      - singleton helpers
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

1. Compile your project with **esbuild**

```
src/
dist/Code.gs
```

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

2. Deploy the script as a **Google Apps Script library**

3. Add the library to your GAS project.

---

# Basic Usage

Initialize the logger once per execution.

```javascript
function example() {

  LoggerLib.init({
    spreadsheetId: "YOUR_SPREADSHEET_ID"
  });

  LoggerLib.info({
    message: "Workflow started"
  });

  LoggerLib.warn({
    message: "Unexpected value",
    meta: { value: 42 }
  });

  LoggerLib.flush();
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

# Pipeline Design

LoggerLib uses a **pipeline architecture**.

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
