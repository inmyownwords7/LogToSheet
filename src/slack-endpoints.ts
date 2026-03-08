/**
 * Responsibility: Define Slack API endpoints used by the application.
 *
 * Each endpoint describes:
 * - the external system (SLACK)
 * - the HTTP method
 * - the logical endpoint name
 * - a pickMeta() function that extracts useful metadata
 *   from the raw API response for logging purposes
 *
 * These definitions support structured HTTP logging.
 */

import { EndpointSpec } from "./types";

const SLACK_ENDPOINTS: Record<string, EndpointSpec> = {
  "slack.users.info": {
    system: "SLACK",
    method: "GET",
    endpoint: "users.info?user={userId}",
    pickMeta: (raw: unknown) => {
      const r = (raw ?? {}) as Record<string, any>;
      return {
        ok: Boolean(r.ok),
        error: r.error ?? "",
        userId: r.user?.id ?? r.user?.profile?.email ?? "",
      };
    },
  },

  "slack.chat.postMessage": {
    system: "SLACK",
    method: "POST",
    endpoint: "chat.postMessage",
    pickMeta: (raw: unknown) => {
      const r = (raw ?? {}) as Record<string, any>;
      return {
        ok: Boolean(r.ok),
        ts: r.ts ?? "",
        channel: r.channel ?? "",
        error: r.error ?? "",
      };
    },
  },
};

export { SLACK_ENDPOINTS };