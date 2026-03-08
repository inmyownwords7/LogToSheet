import { SLACK_ENDPOINTS } from "./slack-endpoints";
import { NOTION_ENDPOINTS } from "./notion-endpoints";
import { GOOGLE_ENDPOINTS } from "./google-endpoints";
import { ApiSystem, HttpMethod } from "./types";

/**
 * Responsibility: Endpoint registry + request inference helpers.
 *
 * This module centralizes knowledge about external APIs used by the app.
 *
 * Provides:
 * - ENDPOINTS: a combined registry of all known API endpoints
 *   (Slack, Notion, Google).
 *
 * - EndpointKey: a type-safe union of all endpoint identifiers.
 *
 * - inferSystemFromUrl(url):
 *   Determines which external system a request belongs to
 *   by inspecting the hostname.
 *
 * - normalizeMethod(method):
 *   Ensures HTTP methods are normalized to valid uppercase
 *   HttpMethod values with a safe fallback ("GET").
 *
 * Why this exists:
 * - Allows network logging to classify requests automatically
 * - Enables consistent endpoint naming across services
 * - Keeps endpoint metadata separate from logger logic
 */

function inferSystemFromUrl(url: string): ApiSystem {
  const host = new URL(url).hostname;
  if(host.includes("slack.com")) return "SLACK";
  if(host.includes("notion.com")) return "NOTION";
  if(host.includes("googleapis.com")) return "GOOGLE";
  return "OTHER";
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function normalizeMethod(method?: string): HttpMethod {
  const m = (method ?? "GET").toUpperCase();
  return HTTP_METHODS.includes(m as HttpMethod) ? (m as HttpMethod) : "GET";
}

const ENDPOINTS = {
  ...SLACK_ENDPOINTS,
  ...NOTION_ENDPOINTS,
  ...GOOGLE_ENDPOINTS,
} as const;
export { ENDPOINTS, inferSystemFromUrl, normalizeMethod }
export type EndpointKey = keyof typeof ENDPOINTS;