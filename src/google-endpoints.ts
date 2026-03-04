const GOOGLE_ENDPOINTS = {
  "google.calendar.calendars.insert": {
    ApiSystem: "GOOGLE",
    HttpMethod: "POST",
    endpoint: "calendar/v3/calendars",
    pickMeta: (raw: any) => ({
      kind: raw?.kind ?? "",
      id: raw?.id ?? "",
      summary: raw?.summary ?? ""
    })
  },
  "google.calendar.acl.insert": {
    ApiSystem: "GOOGLE",
    HttpMethod: "POST",
    endpoint: "calendar/v3/calendars/{calendarId}/acl",
    pickMeta: (raw: any) => ({
      kind: raw?.kind ?? "",
      id: raw?.id ?? "",
      role: raw?.role ?? ""
    })
  }
} as const;
export {GOOGLE_ENDPOINTS}