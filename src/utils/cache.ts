/**
 * Cache management for documentation index and pages.
 */

import { parseLlmsTxt, fetchAndClean, Page } from "./doc-fetcher.js";
import { IndexSearch } from "./indexer.js";
import { normalize, indexTitleVariants, formatDisplayTitle } from "./text-processor.js";

/** Default llms.txt URL to index */
const LLMS_TXT_URL = "https://modelcontextprotocol.io/llms.txt";

/** Maximum number of results to hydrate with content for snippets */
const SNIPPET_HYDRATE_MAX = 5;

/** Global state */
let index: IndexSearch | null = null;
let urlCache: Map<string, Page | null> = new Map();
let urlTitles: Map<string, string> = new Map();
let linksLoaded = false;

/**
 * Parse llms.txt and index curated titles without fetching content.
 * Content is fetched on-demand for faster startup.
 */
export async function loadLinksOnly(): Promise<void> {
  if (index === null) {
    index = new IndexSearch();
  }

  const links = await parseLlmsTxt(LLMS_TXT_URL);

  for (const [title, url] of links) {
    // Record curated display title and placeholder cache
    urlTitles.set(url, title);
    if (!urlCache.has(url)) {
      urlCache.set(url, null);
    }

    // Normalize title for display and indexing
    const displayTitle = normalize(title);
    const indexTitle = indexTitleVariants(displayTitle, url);

    // Index with empty content for fast startup
    index.add({
      uri: url,
      displayTitle,
      content: "",
      indexTitle,
    });
  }

  linksLoaded = true;
}

/**
 * Ensure the search index is initialized and ready for use.
 */
export async function ensureReady(): Promise<void> {
  if (!linksLoaded) {
    await loadLinksOnly();
  }
}

/**
 * Ensure a page is cached, fetching it if necessary.
 */
export async function ensurePage(url: string): Promise<Page | null> {
  const cached = urlCache.get(url);
  if (cached !== undefined && cached !== null) {
    return cached;
  }

  try {
    const raw = await fetchAndClean(url);
    const displayTitle = formatDisplayTitle(url, raw.title, urlTitles);
    const page: Page = {
      url,
      title: displayTitle,
      content: raw.content,
    };
    urlCache.set(url, page);
    return page;
  } catch {
    urlCache.set(url, null);
    return null;
  }
}

/**
 * Get the current search index instance.
 */
export function getIndex(): IndexSearch | null {
  return index;
}

/**
 * Get the URL cache.
 */
export function getUrlCache(): Map<string, Page | null> {
  return urlCache;
}

/**
 * Get the curated URL titles mapping.
 */
export function getUrlTitles(): Map<string, string> {
  return urlTitles;
}

/**
 * Get the snippet hydrate max constant.
 */
export function getSnippetHydrateMax(): number {
  return SNIPPET_HYDRATE_MAX;
}

/**
 * Reset cache state (useful for testing).
 */
export function resetCache(): void {
  index = null;
  urlCache = new Map();
  urlTitles = new Map();
  linksLoaded = false;
}
