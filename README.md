# LogToSheet
GAS LoggerLib

A structured logging library for Google Apps Script that writes operational and HTTP/network logs to Google Sheets.

Inspired by Winston and Morgan, this library provides:

Structured logs

Network request logging

Google Sheets transports

Extendable transports (console, JSON, file, etc.)

Strong TypeScript typings

Features

Structured logs (ts, logId, level, message, meta)

HTTP/network logging

Google Sheets log transport

Customizable sheet names

Overrideable column headers

Singleton logger for simple usage

Multiple logger instances if needed

TypeScript-first design

Log Types
Operational Logs

Represents application events such as:

workflows

tasks

background processes

internal state changes

Example row:

ts	logId	level	system	action	target	outcome	message	metaJson

Example:

2026-03-04T17:10:25Z | a8f3d21 | INFO | SLACK | syncUsers | IDX_Slack | OK | Slack user sync completed | {"count": 24}
Network Logs

Represents HTTP/API requests.

Example row:

ts	logId	level	system	method	endpoint	url	status	durationMs	requestBytes	responseBytes	queryJson	metaJson	errorMessage

Example:

2026-03-04T17:10:30Z | b1f2a31 | HTTP | NOTION | POST | queryDatabase | https://api.notion.com/v1/databases/... | 200 | 312 | | 2048 | {} | {"cursor":true} |
Installation
Option 1 — Google Apps Script Library

Open your GAS project

Go to Extensions → Apps Script → Libraries

Add the Script ID of this library

Set identifier:

LoggerLib
Basic Usage

Initialize the logger once per execution.

function appInitLogger() {

  LoggerLib.init({
    spreadsheetId: "YOUR_SPREADSHEET_ID",
    operationalSheet: "Operational_Log",
    networkSheet: "Network_Log",
    level: "INFO"
  });

}
Writing Logs
Operational Log
LoggerLib.log({
  message: "Identity sync started",
  meta: { source: "identityBuild" }
});
Debug Log
LoggerLib.debug({
  message: "Fetched Slack users",
  meta: { count: users.length }
});
Error Log
LoggerLib.error({
  message: "Slack API failed",
  error: err
});
HTTP Logging

Used to log external API calls.

LoggerLib.http({
  system: "SLACK",
  method: "GET",
  url: { raw: "https://slack.com/api/users.list" },
  status: 200,
  durationMs: 180
});
Custom Headers

Headers can be overridden when initializing.

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

If not provided, default headers are used.

Creating a Custom Logger Instance

You can create separate loggers.

const logger = LoggerLib.create({
  spreadsheetId: "SHEET_ID"
});

logger.info({ message: "Custom logger started" });
Project Structure
src/
│
├── index.ts
├── logger.ts
├── sheets.ts
├── types.ts
index.ts

Public library API.

Handles:

initialization

singleton logger

convenience methods

logger.ts

Core logging engine.

Responsible for:

log record creation

pipelines

routing records to transports

sheets.ts

Google Sheets transport implementation.

Handles:

sheet creation

header initialization

row formatting

types.ts

Shared TypeScript types.

Defines:

log record structures

logger interface

transport types

Design

The logger uses a pipeline architecture:

LogRecord
   ↓
Formatter
   ↓
Transport
   ↓
Destination

Example:

LogRecord
   ↓
toOperationalRow()
   ↓
SheetsTransport
   ↓
Google Sheets
Future Features

Planned extensions:

Console transport

JSON export transport

Google Drive file transport

Batched sheet writes (high performance)

UrlFetchApp wrapper (fetchWithLogger)

Structured API endpoint registry

Example Sheet Layout

Operational_Log

ts | logId | level | system | action | target | outcome | message | metaJson

Network_Log

ts | logId | level | system | method | endpoint | url | status | durationMs | requestBytes | responseBytes | queryJson | metaJson | errorMessage
License

MIT

Why This Library Exists

Google Apps Script lacks a structured logging system similar to:

Winston (Node.js)

Morgan (HTTP middleware)

This library fills that gap while staying native to GAS + Google Sheets.
