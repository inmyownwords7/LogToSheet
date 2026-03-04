const SLACK_ENDPOINTS = {
  "slack.users.info": {
    ApiSystem: "SLACK",
    HttpMethod: "GET",
    endpoint: "users.info?user={userId}",
    pickMeta: (raw: any) => ({
      ok: Boolean(raw?.ok),
      error: raw?.error ?? "",
      userId: raw?.user?.id ?? raw?.user?.profile?.email ?? ""
    })
  },
  "slack.chat.postMessage": {
    ApiSystem: "SLACK",
    HttpMethod: "POST",
    endpoint: "chat.postMessage",
    pickMeta: (raw: any) => ({
      ok: Boolean(raw?.ok),
      ts: raw?.ts ?? "",
      channel: raw?.channel ?? "",
      error: raw?.error ?? ""
    })
  }
} as const;

export {SLACK_ENDPOINTS}