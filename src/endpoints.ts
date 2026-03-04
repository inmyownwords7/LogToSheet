import { SLACK_ENDPOINTS } from "./slack-endpoints";
import { NOTION_ENDPOINTS } from "./notion-endpoints";
import { GOOGLE_ENDPOINTS } from "./google-endpoints";

const ENDPOINTS = {
  ...SLACK_ENDPOINTS,
  ...NOTION_ENDPOINTS,
  ...GOOGLE_ENDPOINTS,
} as const;
export {ENDPOINTS}
export type EndpointKey = keyof typeof ENDPOINTS;