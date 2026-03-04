const NOTION_ENDPOINTS = {
  "notion.pages.retrieve": {
    ApiSystem: "NOTION",
    HttpMethod: "GET",
    endpoint: "/v1/pages/{pageId}",
    pickMeta: (raw: any) => ({
      object: raw?.object ?? "",
      id: raw?.id ?? "",
      url: raw?.url ?? ""
    })
  },
  "notion.pages.update": {
    ApiSystem: "NOTION",
    HttpMethod: "PATCH",
    endpoint: "/v1/pages/{pageId}",
    pickMeta: (raw: any) => ({
      id: raw?.id ?? "",
      archived: Boolean(raw?.archived),
      url: raw?.url ?? ""
    })
  }
} as const;

export {NOTION_ENDPOINTS}