# GAS LoggerLib

A structured logging library for **Google Apps Script** that writes
**operational logs** and **HTTP/network logs** to **Google Sheets**.

LoggerLib is inspired by logging tools such as **Winston** (structured
application logging) and **Morgan** (HTTP request logging), but designed
specifically for the **Google Apps Script + Google Sheets ecosystem**.

------------------------------------------------------------------------

# Overview

LoggerLib provides a consistent way to record:

-   application events
-   workflow execution steps
-   debugging information
-   API requests and responses
-   operational audit trails

Logs are stored in **Google Sheets**, making them easy to:

-   review
-   filter
-   sort
-   audit
-   export

------------------------------------------------------------------------

# Features

-   Structured log records
-   Separate **Operational Logs** and **Network Logs**
-   Google Sheets transport built-in
-   Configurable spreadsheet and sheet names
-   Customizable column headers
-   Singleton logger for simple scripts
-   Multiple logger instances for advanced workflows
-   TypeScript-first architecture
-   Native `Date` timestamps compatible with Google Sheets

------------------------------------------------------------------------

# Log Types

## Operational Logs

Operational logs represent **internal events in your script**.

Examples include:

-   workflow started
-   workflow finished
-   sync tasks
-   validation results
-   background jobs
-   state changes

### Example Row

  --------------------------------------------------------------------------
  ts         logId           level           message         metaJson
  ---------- --------------- --------------- --------------- ---------------
  3/4/2026   a8f3d21         INFO            Slack user sync {"count":24}
  12:10:25                                   completed       

  --------------------------------------------------------------------------

`ts` is stored as a **Google Sheets datetime value**, not just text.\
This allows sorting, filtering, and date calculations.

------------------------------------------------------------------------

## Network Logs

Network logs represent **HTTP or API requests**.

Examples include:

-   Slack API requests
-   Notion API queries
-   Google API responses
-   failed HTTP requests
-   request duration tracking

### Example Row

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  ts         logId     level   system   method   endpoint        url                                       status   durationMs   requestBytes   responseBytes   queryJson   metaJson          errorMessage
  ---------- --------- ------- -------- -------- --------------- ----------------------------------------- -------- ------------ -------------- --------------- ----------- ----------------- --------------
  3/4/2026   b1f2a31   HTTP    NOTION   POST     queryDatabase   https://api.notion.com/v1/databases/...   200      312                         2048            {}          {"cursor":true}   
  12:10:30                                                                                                                                                                                    

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# Installation

## Option 1 --- Google Apps Script Library

1.  Open your Apps Script project
2.  Open **Libraries**
3.  Add the **Script ID** of this library
4.  Set the identifier to:

```{=html}
<!-- -->
```
    LoggerLib

------------------------------------------------------------------------

# Quick Start

Initialize the logger once per execution.

``` javascript
function appInitLogger() {

  LoggerLib.init({
    spreadsheetId: "YOUR_SPREADSHEET_ID",
    operationalSheet: "Operational_Log",
    networkSheet: "Network_Log",
    level: "INFO"
  });

}
```

------------------------------------------------------------------------

# Writing Logs

## Operational Log

``` javascript
LoggerLib.log({
  message: "Identity sync started",
  meta: { source: "identityBuild" }
});
```

------------------------------------------------------------------------

## Debug Log

``` javascript
LoggerLib.debug({
  message: "Fetched Slack users",
  meta: { count: users.length }
});
```

------------------------------------------------------------------------

## Info Log

``` javascript
LoggerLib.info({
  message: "Sync completed",
  meta: { processed: 24 }
});
```

------------------------------------------------------------------------

## Warning Log

``` javascript
LoggerLib.warn({
  message: "Record missing optional field",
  meta: { field: "teamName" }
});
```

------------------------------------------------------------------------

## Error Log

``` javascript
LoggerLib.error({
  message: "Slack API failed",
  meta: { operation: "users.list" }
});
```

------------------------------------------------------------------------

# HTTP Logging

Use HTTP logging to record external API calls.

``` javascript
LoggerLib.http({
  system: "SLACK",
  method: "GET",
  url: { raw: "https://slack.com/api/users.list" },
  status: 200,
  durationMs: 180
});
```

Common uses:

-   tracking API latency
-   monitoring API errors
-   auditing integrations
-   debugging network calls

------------------------------------------------------------------------

# How Timestamps Work

LoggerLib stores timestamps internally as **JavaScript `Date` objects**.

When logs are written to Google Sheets:

-   the value is stored as a **real datetime**
-   Sheets controls how the date appears
-   the column remains sortable and filterable

Example display:

    2/27/2026 13:37:56

This is better than storing timestamps as ISO strings when using Google
Sheets.

------------------------------------------------------------------------

# Initialization Options

``` javascript
LoggerLib.init({
  spreadsheetId: "SHEET_ID",
  operationalSheet: "Operational_Log",
  networkSheet: "Network_Log",
  level: "INFO"
});
```

Options:

  Option             Description
  ------------------ ----------------------------
  spreadsheetId      Target spreadsheet
  operationalSheet   Sheet for operational logs
  networkSheet       Sheet for network logs
  level              Minimum log level emitted

------------------------------------------------------------------------

# Custom Headers

You can override the default headers.

``` javascript
LoggerLib.init({
  spreadsheetId: "SHEET_ID",

  operationalHeaders: [
    "ts",
    "logId",
    "level",
    "message",
    "metaJson"
  ],

  networkHeaders: [
    "ts",
    "method",
    "url",
    "status",
    "durationMs"
  ]
});
```

If not provided, LoggerLib automatically creates default schemas.

------------------------------------------------------------------------

# Creating a Custom Logger Instance

For advanced usage you can create independent loggers.

``` javascript
const logger = LoggerLib.create({
  spreadsheetId: "SHEET_ID"
});

logger.info({
  message: "Custom logger started"
});
```

Useful when:

-   different modules use separate logs
-   multiple spreadsheets are required
-   different log levels are needed

------------------------------------------------------------------------

# Project Structure

    src/
    ├── index.ts
    ├── logger.ts
    ├── sheets.ts
    ├── types.ts

### index.ts

Public API entry point.

Handles:

-   initialization
-   singleton logger
-   helper methods

------------------------------------------------------------------------

### logger.ts

Core logging engine.

Responsible for:

-   building log records
-   applying log levels
-   routing logs through transports

------------------------------------------------------------------------

### sheets.ts

Google Sheets transport implementation.

Responsible for:

-   creating sheets
-   initializing headers
-   writing rows

------------------------------------------------------------------------

### types.ts

Shared TypeScript types for:

-   log record structures
-   row types
-   logger interfaces
-   transport definitions

------------------------------------------------------------------------

# Logger Pipeline

LoggerLib follows a simple pipeline architecture:

    LogRecord
       ↓
    Row Formatter
       ↓
    Sheets Transport
       ↓
    Google Sheets

Example:

    BaseLogRecord
       ↓
    toOperationalRow()
       ↓
    SheetsTransport
       ↓
    Operational_Log

------------------------------------------------------------------------

# Example Sheet Layout

## Operational_Log

    ts | logId | level | message | metaJson

## Network_Log

    ts | logId | level | system | method | endpoint | url | status | durationMs | requestBytes | responseBytes | queryJson | metaJson | errorMessage

------------------------------------------------------------------------

# Planned Features

Future improvements may include:

-   console transport
-   JSON export transport
-   Google Drive log files
-   batched sheet writes
-   UrlFetchApp wrapper (`fetchWithLogger`)
-   structured endpoint registry

------------------------------------------------------------------------

# License

MIT

------------------------------------------------------------------------

# Why This Library Exists

Google Apps Script lacks a robust structured logging system similar to:

-   **Winston** (Node.js logging)
-   **Morgan** (HTTP request logging)

LoggerLib provides a **GAS-native structured logging solution** built on
top of **Google Sheets**.
