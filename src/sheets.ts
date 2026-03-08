// src/sheets.ts

import type { OperationalLogRecord, NetworkLogRecord, Transport } from "./types";

/**
 * Responsibility: Convert structured log records into Google Sheets rows
 * and provide a Sheets transport for logger pipelines.
 *
 * This module is the Google Sheets output layer ("sink") for LoggerLib.
 *
 * It handles:
 * - defining default column schemas for operational and network logs
 * - converting structured records into row arrays
 * - safely serializing objects into JSON strings
 * - ensuring destination sheets exist
 * - initializing headers when a sheet is first created or empty
 *
 * This file does NOT create log records.
 * It only formats and writes records that were already created upstream.
 */

/**
 * Default header schema for the operational log sheet.
 *
 * Intended for internal application/workflow events such as:
 * - sync started
 * - sync completed
 * - validation warnings
 * - task failures
 */
const DEFAULT_OPERATIONAL_HEADERS = [
  "ts",
  "logId",
  "correlationId",
  "parentLogId",
  "level",
  "message",
  "metaJson",
];

/**
 * Default header schema for the network log sheet.
 *
 * Intended for structured HTTP/API request logs such as:
 * - method
 * - endpoint
 * - response status
 * - duration
 * - payload size
 * - error message
 */
const DEFAULT_NETWORK_HEADERS = [
  "ts",
  "logId",
  "correlationId",
  "parentLogId",
  "level",
  "system",
  "method",
  "endpoint",
  "url",
  "status",
  "durationMs",
  "requestBytes",
  "responseBytes",
  "queryJson",
  "metaJson",
  "errorMessage",
];

/**
 * A row payload that can be safely written to Google Sheets.
 *
 * Includes Date so timestamps can be stored as real spreadsheet date values.
 */
type Row = (string | number | boolean | null | Date)[];

/**
 * Get or create a sheet inside the target spreadsheet.
 *
 * Behavior:
 * - opens the spreadsheet by ID
 * - creates the sheet if it does not already exist
 * - writes header row if the sheet is new or empty
 *
 * This ensures logger transports can append rows safely without needing
 * separate setup code in consumer scripts.
 *
 * @param spreadsheetId Target spreadsheet ID.
 * @param name Sheet name to read or create.
 * @param headers Header row to initialize if the sheet is new or empty.
 * @returns The target Google Sheets sheet.
 */
function getSheet(
  spreadsheetId: string,
  name: string,
  headers: string[]
): GoogleAppsScript.Spreadsheet.Sheet {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sheet = ss.getSheetByName(name);

  const isNew = !sheet;
  if (!sheet) sheet = ss.insertSheet(name);

  // Initialize headers once (new sheet OR empty sheet)
  const isEmpty = sheet.getLastRow() === 0;
  if ((isNew || isEmpty) && headers?.length) {
    sheet.appendRow(headers);
  }

  return sheet;
}

/**
 * Safely serialize a value to JSON for storage in a spreadsheet cell.
 *
 * Used for fields such as:
 * - meta
 * - query parameters
 * - fallback structured data
 *
 * If serialization fails, a fallback JSON object is returned containing
 * the serialization error message.
 *
 * @param value Value to serialize.
 * @returns JSON string safe for writing into a single sheet cell.
 */
function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch (e) {
    return JSON.stringify({ stringifyError: String(e) });
  }
}

/**
 * Convert an operational log record into a spreadsheet row.
 *
 * The resulting row order must match `DEFAULT_OPERATIONAL_HEADERS`
 * unless a consumer intentionally overrides the schema.
 *
 * @param record Structured operational log record.
 * @returns Google Sheets row payload for the operational sheet.
 */
function toOperationalRow(record: OperationalLogRecord): Row {
  return [
    record.ts,
    record.logId,
    record.correlationId ?? "",
    record.parentLogId ?? "",
    record.level,
    record.message,
    safeJson(record.meta),
  ];
}

/**
 * Convert a network log record into a spreadsheet row.
 *
 * The resulting row order must match `DEFAULT_NETWORK_HEADERS`
 * unless a consumer intentionally overrides the schema.
 *
 * Notes:
 * - `queryJson` is derived from `record.url.parts?.query`
 * - nullable numeric fields remain nullable
 * - missing strings are normalized to empty strings
 *
 * @param record Structured network log record.
 * @returns Google Sheets row payload for the network sheet.
 */
function toNetworkRow(record: NetworkLogRecord): Row {
  return [
    record.ts,
    record.logId,
    record.correlationId ?? "",
    record.parentLogId ?? "",
    record.level,
    record.system,
    record.method,
    record.endpoint ?? "",
    record.url.raw,
    record.status,
    record.durationMs,
    record.requestBytes ?? null,
    record.responseBytes ?? null,
    safeJson(record.url.parts?.query ?? {}),
    safeJson(record.meta),
    record.error?.message ?? "",
  ];
}

/**
 * Create a Google Sheets row transport.
 *
 * This transport is used by logger pipelines to append formatted row payloads
 * to a destination sheet.
 *
 * Behavior:
 * - resolves the sheet lazily on write
 * - ensures the sheet exists
 * - ensures headers are initialized
 * - appends the provided row payload
 *
 * @param spreadsheetId Target spreadsheet ID.
 * @param sheetName Destination sheet name.
 * @param headers Header row used when the destination sheet is created or empty.
 * @returns A transport that writes rows into Google Sheets.
 */
function makeSheetsRowTransport(
  spreadsheetId: string,
  sheetName: string,
  headers: string[] = []
): Transport<Row> {
  return {
    name: "sheets",
    write: (row: Row) => {
      const sheet = getSheet(spreadsheetId, sheetName, headers);
      sheet.appendRow(row);
    },
  };
}

export {
  Row,
  getSheet,
  safeJson,
  toOperationalRow,
  toNetworkRow,
  makeSheetsRowTransport,
  DEFAULT_NETWORK_HEADERS,
  DEFAULT_OPERATIONAL_HEADERS,
};