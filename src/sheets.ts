// src/sheets.ts

import type { OperationalLogRecord, NetworkLogRecord } from "./types";
import type { Transport } from "./internal-types";

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
 */
const DEFAULT_OPERATIONAL_HEADERS = [
  "ts",
  "logId",
  "correlationId",
  "parentLogId",
  "level",
  "system",
  "action",
  "target",
  "outcome",
  "message",
  "metaJson",
];

/**
 * Default header schema for the network log sheet.
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
 */
type Row = (string | number | boolean | null | Date)[];

/**
 * Get or create a sheet inside the target spreadsheet.
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

  const isEmpty = sheet.getLastRow() === 0;

  if ((isNew || isEmpty) && headers?.length) {
    sheet.appendRow(headers);
  }

  return sheet;
}

/**
 * Safely serialize a value to JSON for storage in a spreadsheet cell.
 */
function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? null);
  } catch (e) {
    return JSON.stringify({ stringifyError: String(e) });
  }
}

/**
 * Ensure rows match header length.
 */
function assertRowsMatchHeaders(
  rows: Row[],
  headers: string[],
  context: string
): void {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length !== headers.length) {
      throw new Error(
        `${context}: row ${i + 1} has length ${rows[i].length}, but headers have length ${headers.length}`
      );
    }
  }
}

/**
 * Convert an operational log record into a spreadsheet row.
 */
function toOperationalRow(record: OperationalLogRecord): Row {
  return [
    record.ts,
    record.logId,
    record.correlationId ?? "",
    record.parentLogId ?? "",
    record.level,
    record.system ?? "",
    record.action ?? "",
    record.target ?? "",
    record.outcome ?? "",
    record.message,
    safeJson(record.meta),
  ];
}

/**
 * Convert a network log record into a spreadsheet row.
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
    safeJson(record.url.parts?.query ?? null),
    safeJson(record.meta),
    record.error?.message ?? "",
  ];
}

/**
 * Create a Google Sheets row transport with buffering.
 *
 * Rows are buffered and written in bulk using `setValues()` for performance.
 */
function makeSheetsRowTransport(
  spreadsheetId: string,
  sheetName: string,
  headers: string[] = []
): Transport<Row> {
  const buffer: Row[] = [];
  let sheetCache: GoogleAppsScript.Spreadsheet.Sheet | null = getSheet(
    spreadsheetId,
    sheetName,
    headers
  );

  function getCachedSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    if (!sheetCache) {
      sheetCache = getSheet(spreadsheetId, sheetName, headers);
    }
    return sheetCache;
  }

  function flush(): void {
    if (buffer.length === 0) return;

    assertRowsMatchHeaders(buffer, headers, `Sheet transport "${sheetName}"`);

    const sheet = getCachedSheet();
    const startRow = sheet.getLastRow() + 1;

    sheet
      .getRange(startRow, 1, buffer.length, headers.length)
      .setValues(buffer);

    buffer.length = 0;
  }

  return {
    name: "sheets",

    write: (row: Row) => {
      buffer.push(row);
    },

    flush,
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
