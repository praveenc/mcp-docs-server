/**
 * Document fetching and parsing utilities.
 */

import { validateUrl, URLValidationError } from "./url-validator.js";

/** Regex patterns for parsing */
const MD_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const HTML_BLOCK_RE = /<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi;
const TAG_RE = /<[^>]+>/g;
const TITLE_TAG_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const H1_TAG_RE = /<h1[^>]*>([\s\S]*?)<\/h1>/i;
const META_OG_RE = /<meta[^>]+property=["']og:title["'][^>]+content=["']([\s\S]*?)["']/i;

export interface Page {
  url: string;
  title: string;
  content: string;
}

/** Default timeout for HTTP requests (ms) */
const DEFAULT_TIMEOUT = 30000;

/** User agent for HTTP requests */
const USER_AGENT = "mcp-server-builder/1.0";

/**
 * Fetch content from a URL.
 */
async function fetchUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse an llms.txt file and extract document links.
 * Returns array of [title, url] tuples.
 */
export async function parseLlmsTxt(url: string): Promise<[string, string][]> {
  const txt = await fetchUrl(url);
  const links: [string, string][] = [];

  let match: RegExpExecArray | null;
  MD_LINK_RE.lastIndex = 0;

  while ((match = MD_LINK_RE.exec(txt)) !== null) {
    const title = match[1].trim() || match[2].trim();
    const docUrl = match[2].trim();

    try {
      const validated = validateUrl(docUrl);
      links.push([title, validated]);
    } catch {
      // Skip invalid URLs silently
    }
  }

  return links;
}

/**
 * Convert HTML to plain text.
 */
function htmlToText(rawHtml: string): string {
  // Remove script/style blocks
  let stripped = rawHtml.replace(HTML_BLOCK_RE, "");
  // Drop tags
  stripped = stripped.replace(TAG_RE, " ");
  // Unescape HTML entities
  stripped = decodeHtmlEntities(stripped);
  // Normalize whitespace
  const lines = stripped.split("\n").map((ln) => ln.trim());
  return lines.filter(Boolean).join("\n");
}

/**
 * Decode common HTML entities.
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replaceAll(entity, char);
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));

  return result;
}

/**
 * Extract title from HTML content.
 */
function extractHtmlTitle(rawHtml: string): string | null {
  // Try <title> tag
  let match = TITLE_TAG_RE.exec(rawHtml);
  if (match) return decodeHtmlEntities(match[1]).trim();

  // Try og:title meta tag
  match = META_OG_RE.exec(rawHtml);
  if (match) return decodeHtmlEntities(match[1]).trim();

  // Try <h1> tag
  match = H1_TAG_RE.exec(rawHtml);
  if (match) {
    const inner = match[1].replace(TAG_RE, " ");
    return decodeHtmlEntities(inner).trim();
  }

  return null;
}

/**
 * Fetch a web page and return cleaned content.
 *
 * @throws URLValidationError if URL is not allowed
 */
export async function fetchAndClean(pageUrl: string): Promise<Page> {
  const validatedUrl = validateUrl(pageUrl);
  const raw = await fetchUrl(validatedUrl);
  const lower = raw.toLowerCase();

  // Check if it's HTML content
  if (lower.includes("<html") || lower.includes("<head") || lower.includes("<body")) {
    const extractedTitle = extractHtmlTitle(raw);
    const content = htmlToText(raw);
    const title = extractedTitle || validatedUrl.split("/").pop() || validatedUrl;
    return { url: validatedUrl, title, content };
  }

  // Plain text (e.g., markdown)
  const title = validatedUrl.split("/").pop() || validatedUrl;
  return { url: validatedUrl, title, content: raw };
}

export { URLValidationError };
