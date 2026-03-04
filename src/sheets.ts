// src/sheets.ts

import { OperationalLogRecord, NetworkLogRecord, Transport } from "./types";

const DEFAULT_OPERATIONAL_HEADERS = [
  "ts",
  "logId",
  "level",
  "system",
  "action",
  "target",
  "outcome",
  "message",
  "metaJson",
];

const DEFAULT_NETWORK_HEADERS = [
  "ts",
  "logId",
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
type Row = (string | number | boolean | null)[];

function getSheet(
  spreadsheetId: string,
  name: string,
  headers: string[]
): GoogleAppsScript.Spreadsheet.Sheet {

  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sheet = ss.getSheetByName(name);

  const isNew = !sheet;
  if (!sheet) sheet = ss.insertSheet(name);

//   // Initialize headers once
//   if (isNew && headers?.length) {
//     sheet.appendRow(headers);
//   }

  // Initialize headers once (new sheet OR empty sheet)
  const isEmpty = sheet.getLastRow() === 0;
  if ((isNew || isEmpty) && headers?.length) {
    sheet.appendRow(headers);
  }

  return sheet;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch (e) {
    return JSON.stringify({ stringifyError: String(e) });
  }
}

function iso(date: Date): string {
  return date.toISOString();
}

function toOperationalRow(record: OperationalLogRecord): Row {
  return [
    iso(record.ts),
    record.logId,
    record.level,
    record.system ?? "",
    record.action ?? "",
    record.target ?? "",
    record.outcome ?? "",
    record.message,
    safeJson(record.meta),
  ];
}

function toNetworkRow(record: NetworkLogRecord): Row {
  return [
    iso(record.ts),
    record.logId,
    record.level,
    record.system,
    record.method,
    record.endpoint ?? "",
    record.url.raw,
    record.status,
    record.durationMs,
    record.requestBytes ?? "",
    record.responseBytes ?? "",
    safeJson(record.url.parts?.query ?? {}),
    safeJson(record.meta),
    record.error?.message ?? "",
  ];
}

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
  iso,
  toOperationalRow,
  toNetworkRow,
  makeSheetsRowTransport,
  DEFAULT_NETWORK_HEADERS,
  DEFAULT_OPERATIONAL_HEADERS,
};