#!/usr/bin/env node
/**
 * MCP Server Builder - Search MCP protocol documentation.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { APP_NAME, APP_VERSION } from "./config.js";
import { searchMcpDocs, fetchMcpDoc } from "./tools/index.js";
import { ensureReady } from "./utils/cache.js";
import { logger } from "./utils/logger.js";

// Initialize MCP server
const server = new McpServer({
  name: APP_NAME,
  version: APP_VERSION,
});

// Register search_mcp_docs tool
server.registerTool(
  "search_mcp_docs",
  {
    description: "Search MCP protocol documentation with ranked results. Uses BM25 ranking with Porter stemming for high-quality search.",
    inputSchema: {
      query: z.string().describe("Search query string (e.g., 'tool input schema', 'stdio transport')"),
      k: z.number().optional().default(5).describe("Maximum number of results to return"),
    },
  },
  async ({ query, k }) => {
    try {
      logger.debug(`Searching for: "${query}" (k=${k})`);
      const results = await searchMcpDocs(query, k ?? 5);
      logger.debug(`Found ${results.length} results`);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error("Search failed", error);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: "Search failed", message: String(error) }),
          },
        ],
        isError: true,
      };
    }
  }
);

// Register fetch_mcp_doc tool
server.registerTool(
  "fetch_mcp_doc",
  {
    description: "Fetch full document content by URL from MCP protocol documentation. Only URLs from modelcontextprotocol.io are allowed.",
    inputSchema: {
      uri: z.string().describe("Document URI (http/https URL from modelcontextprotocol.io)"),
    },
  },
  async ({ uri }) => {
    try {
      logger.debug(`Fetching: ${uri}`);
      const result = await fetchMcpDoc(uri);
      if (result.error) {
        logger.warn(`Fetch failed for ${uri}: ${result.error}`);
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: !!result.error,
      };
    } catch (error) {
      logger.error("Fetch failed", error);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: "Fetch failed", message: String(error), url: uri }),
          },
        ],
        isError: true,
      };
    }
  }
);

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  logger.info(`Starting ${APP_NAME} v${APP_VERSION}`);

  try {
    await ensureReady();
    logger.info("Cache initialized successfully");
  } catch (error) {
    logger.warn("Cache initialization warning:", error);
  }

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("Server running on stdio");
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection:", reason);
  process.exit(1);
});

main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
