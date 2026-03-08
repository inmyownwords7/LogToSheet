
# LoggerLib

A **structured logging library for Google Apps Script** that writes operational and HTTP/network logs into **Google Sheets**.

LoggerLib brings a **Winston-style logging architecture** to the GAS ecosystem while staying lightweight and native to Apps Script.

---

# Overview

LoggerLib separates logging into **three layers**:

Caller Code → Logger → Pipelines → Formatter → Transport → Google Sheets

This architecture allows logs to be:

- filtered
- formatted
- routed to multiple destinations

---

# Log Types

LoggerLib emits two types of records.

## Operational Logs

Operational logs represent **internal application events** such as:

- workflow execution
- sync tasks
- validation results
- background operations

Example:

| ts | logId | correlationId | parentLogId | level | message | metaJson |
|----|------|------|------|------|------|------|
| 2026‑03‑04 17:10:25 | a8f3d21 | 43d1... | | INFO | Slack user sync completed | {"count":24} |

---

## Network Logs

Network logs represent **HTTP/API requests**.

Example:

| ts | logId | correlationId | parentLogId | level | system | method | endpoint | url | status | durationMs |
|----|------|------|------|------|------|------|------|------|------|------|
| 2026‑03‑04 17:10:30 | b1f2a31 | 43d1... | a8f3d21 | INFO | NOTION | POST | queryDatabase | https://api.notion.com/... | 200 | 312 |

---

# Features

- Structured logs
- Correlation IDs for workflow tracing
- Parent/child log relationships
- Pipeline-based architecture
- Google Sheets transport
- HTTP request logging
- TypeScript-first design
- Works as a GAS Library

---

# Installation

## Option 1 — Google Apps Script Library

1. Open your Apps Script project
2. Go to **Extensions → Apps Script → Libraries**
3. Add the Script ID of this library
4. Set the identifier to:

LoggerLib

---

# Basic Usage

Initialize once per execution.

```javascript
function initLogger() {
  LoggerLib.init({
    spreadsheetId: "YOUR_SPREADSHEET_ID",
    operationalSheet: "Operational_Log",
    networkSheet: "Network_Log",
    level: "INFO"
  });
}
```

---

# Writing Logs

## Operational Log

```javascript
LoggerLib.info({
  message: "Identity sync started",
  meta: { source: "identityBuild" }
});
```

## Debug Log

```javascript
LoggerLib.debug({
  message: "Fetched Slack users",
  meta: { count: users.length }
});
```

## Error Log

```javascript
LoggerLib.error({
  message: "Slack API failed",
  error: err
});
```

---

# HTTP / Network Logging

```javascript
LoggerLib.http({
  system: "SLACK",
  method: "GET",
  url: { raw: "https://slack.com/api/users.list" },
  status: 200,
  durationMs: 180
});
```

---

# Correlation IDs

Correlation IDs link logs belonging to the **same workflow or execution**.

```javascript
const correlationId = Utilities.getUuid();

LoggerLib.info({
  correlationId,
  message: "Sync started"
});

LoggerLib.http({
  correlationId,
  system: "NOTION",
  method: "POST",
  url: { raw: "https://api.notion.com/v1/databases/query" },
  status: 200,
  durationMs: 240
});
```

---

# Parent Log Relationships

```javascript
const main = LoggerLib.info({
  message: "Sync started"
});

LoggerLib.http({
  parentLogId: main.logId,
  system: "SLACK",
  method: "GET",
  url: { raw: "https://slack.com/api/users.list" },
  status: 200,
  durationMs: 180
});
```

---

# Project Structure

src/
│
├── index.ts
├── logger.ts
├── sheets.ts
└── types.ts

---

## types.ts

Defines:

- log record structures
- pipeline contracts
- transport interfaces
- logger interface

---

## logger.ts

Core logging engine.

Responsibilities:

- generate timestamps
- generate log IDs
- apply severity filtering
- create operational and network records
- emit records through pipelines

---

## sheets.ts

Google Sheets output layer.

Responsibilities:

- convert records to rows
- ensure sheets exist
- initialize headers
- append rows

---

## index.ts

Public library entry point.

Responsibilities:

- configure pipelines
- initialize singleton logger
- expose LoggerLib API

---

# Example Sheet Layout

## Operational_Log

ts
logId
correlationId
parentLogId
level
message
metaJson

---

## Network_Log

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

---

# License

MIT
