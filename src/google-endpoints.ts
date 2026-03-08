/**
 * Responsibility: Define Google API endpoints used by the application.
 *
 * Each endpoint describes:
 * - the external system (GOOGLE)
 * - the HTTP method
 * - the logical endpoint name
 * - a pickMeta() function that extracts useful metadata
 *   from the raw API response for logging purposes
 *
 * These definitions enable structured logging of Google API requests.
 */
import { EndpointSpec } from "./types";

const GOOGLE_ENDPOINTS: Record<string, EndpointSpec> = {
  "google.calendar.calendars.insert": {
    system: "GOOGLE",
    method: "POST",
    endpoint: "calendar/v3/calendars",
    pickMeta: (raw: unknown) => {
      const r = (raw ?? {}) as Record<string, any>;
      return {
        kind: r.kind ?? "",
        id: r.id ?? "",
        summary: r.summary ?? "",
      };
    },
  },

  "google.calendar.acl.insert": {
    system: "GOOGLE",
    method: "POST",
    endpoint: "calendar/v3/calendars/{calendarId}/acl",
    pickMeta: (raw: unknown) => {
      const r = (raw ?? {}) as Record<string, any>;
      return {
        kind: r.kind ?? "",
        id: r.id ?? "",
        role: r.role ?? "",
      };
    },
  },
};

export { GOOGLE_ENDPOINTS };