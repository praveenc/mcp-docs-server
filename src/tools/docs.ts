/**
 * MCP documentation search and retrieval tools.
 */

import {
  ensureReady,
  ensurePage,
  getIndex,
  getUrlCache,
  getSnippetHydrateMax,
} from "../utils/cache.js";
import { makeSnippet } from "../utils/text-processor.js";

export interface SearchResult {
  url: string;
  title: string;
  score: number;
  snippet: string;
}

export interface FetchResult {
  url: string;
  title: string;
  content: string;
  error?: string;
}

/**
 * Search MCP protocol documentation with ranked results.
 *
 * This tool searches the official MCP protocol documentation at modelcontextprotocol.io.
 * It uses BM25 ranking with Porter stemming for high-quality search results.
 *
 * @param query - Search query string (e.g., "tool input schema", "stdio transport")
 * @param k - Maximum number of results to return (default: 5)
 * @returns Array of search results with url, title, score, and snippet
 */
export async function searchMcpDocs(
  query: string,
  k: number = 5
): Promise<SearchResult[]> {
  await ensureReady();

  const index = getIndex();
  if (!index) {
    return [];
  }

  const results = index.search(query, k);
  const urlCache = getUrlCache();
  const hydrateMax = getSnippetHydrateMax();

  // Hydrate top results with content for snippets
  const topResults = results.slice(0, Math.min(results.length, hydrateMax));
  for (const { doc } of topResults) {
    const cached = urlCache.get(doc.uri);
    if (cached === undefined || cached === null) {
      await ensurePage(doc.uri);
    }
  }

  // Build response with snippets
  const searchResults: SearchResult[] = [];
  for (const { score, doc } of results) {
    const page = urlCache.get(doc.uri);
    const snippet = makeSnippet(page?.content ?? null, doc.displayTitle);

    searchResults.push({
      url: doc.uri,
      title: doc.displayTitle,
      score: Math.round(score * 1000) / 1000,
      snippet,
    });
  }

  return searchResults;
}

/**
 * Fetch full document content by URL from MCP protocol documentation.
 *
 * Retrieves complete documentation content from URLs found via searchMcpDocs
 * or provided directly. Only URLs from modelcontextprotocol.io are allowed.
 *
 * @param uri - Document URI (http/https URL from modelcontextprotocol.io)
 * @returns Object with url, title, content (or error if fetch failed)
 */
export async function fetchMcpDoc(uri: string): Promise<FetchResult> {
  await ensureReady();

  const page = await ensurePage(uri);

  if (!page) {
    return {
      url: uri,
      title: "",
      content: "",
      error: "Failed to fetch document",
    };
  }

  return {
    url: page.url,
    title: page.title,
    content: page.content,
  };
}
