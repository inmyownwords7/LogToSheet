import type { LogInput } from "./types";

declare const LoggerLib: {
    log: (spreadsheet: string, entry: LogInput) => string;
};

export {};