/**
 * Responsibility: Define Notion API endpoints used by the application.
 *
 * Each endpoint describes:
 * - the external system (NOTION)
 * - the HTTP method
 * - the logical endpoint name
 * - a pickMeta() function that extracts useful metadata
 *   from the raw API response for logging purposes
 *
 * These endpoint definitions allow network logs to include
 * structured information about Notion API interactions.
 */

import { EndpointSpec } from "./types";

const NOTION_ENDPOINTS: Record<string, EndpointSpec> = {
  "notion.pages.retrieve": {
    system: "NOTION",
    method: "GET",
    endpoint: "/v1/pages/{pageId}",
    pickMeta: (raw: unknown) => {
      const r = (raw ?? {}) as Record<string, any>;
      return {
        object: r.object ?? "",
        id: r.id ?? "",
        url: r.url ?? "",
      };
    },
  },

  "notion.pages.update": {
    system: "NOTION",
    method: "PATCH",
    endpoint: "/v1/pages/{pageId}",
    pickMeta: (raw: unknown) => {
      const r = (raw ?? {}) as Record<string, any>;
      return {
        id: r.id ?? "",
        archived: Boolean(r.archived),
        url: r.url ?? "",
      };
    },
  },
};

export { NOTION_ENDPOINTS };