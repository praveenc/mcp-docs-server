import { describe, it, expect, beforeAll } from "vitest";
import { IndexSearch, Doc } from "../src/utils/indexer.js";

/**
 * End-to-end search tests with realistic MCP documentation content.
 */
describe("Search E2E", () => {
  let index: IndexSearch;

  // Realistic test documents mimicking MCP documentation
  const mcpDocs: Doc[] = [
    {
      uri: "https://modelcontextprotocol.io/docs/concepts/tools",
      displayTitle: "Tools",
      content: `# Tools

Tools in MCP allow servers to expose executable functions that can be invoked by clients and used by LLMs to perform actions.

## Defining Tools

Each tool has a name, description, and input schema defined using JSON Schema.

\`\`\`typescript
server.registerTool("calculate", {
  description: "Perform calculations",
  inputSchema: { type: "object" }
});
\`\`\``,
      indexTitle: "Tools MCP Protocol",
    },
    {
      uri: "https://modelcontextprotocol.io/docs/concepts/resources",
      displayTitle: "Resources",
      content: `# Resources

Resources represent data that servers can expose to clients. Unlike tools, resources are read-only.

## Resource URIs

Each resource is identified by a unique URI.`,
      indexTitle: "Resources MCP Protocol",
    },
    {
      uri: "https://modelcontextprotocol.io/docs/transports/stdio",
      displayTitle: "stdio Transport",
      content: `# stdio Transport

The stdio transport is ideal for local integrations where the client spawns the server as a child process.

Communication occurs over standard input/output streams.

\`\`\`typescript
const transport = new StdioServerTransport();
await server.connect(transport);
\`\`\``,
      indexTitle: "stdio Transport Communication",
    },
    {
      uri: "https://modelcontextprotocol.io/docs/transports/http",
      displayTitle: "HTTP Transport",
      content: `# Streamable HTTP Transport

HTTP streaming provides efficient communication for networked deployments.

Supports request/response over HTTP POST and server-to-client notifications via SSE.`,
      indexTitle: "HTTP Transport Streaming SSE",
    },
    {
      uri: "https://modelcontextprotocol.io/docs/concepts/prompts",
      displayTitle: "Prompts",
      content: `# Prompts

Prompts are reusable conversation templates that help standardize interactions with AI models.

They define a sequence of messages with optional arguments.`,
      indexTitle: "Prompts Templates MCP",
    },
  ];

  beforeAll(() => {
    index = new IndexSearch();
    for (const doc of mcpDocs) {
      index.add(doc);
    }
  });

  describe("exact term matching", () => {
    it("should find tools documentation", () => {
      const results = index.search("tools");
      expect(results[0].doc.displayTitle).toBe("Tools");
    });

    it("should find stdio transport", () => {
      const results = index.search("stdio");
      expect(results[0].doc.displayTitle).toBe("stdio Transport");
    });

    it("should find resources", () => {
      const results = index.search("resources");
      expect(results[0].doc.displayTitle).toBe("Resources");
    });
  });

  describe("phrase matching", () => {
    it("should match 'input schema'", () => {
      const results = index.search("input schema");
      expect(results.length).toBeGreaterThan(0);
      // Tools doc mentions "input schema"
      expect(results.some((r) => r.doc.displayTitle === "Tools")).toBe(true);
    });

    it("should match 'http streaming'", () => {
      const results = index.search("http streaming");
      expect(results[0].doc.displayTitle).toBe("HTTP Transport");
    });
  });

  describe("stemming", () => {
    it("should match 'calculations' to 'calculate'", () => {
      const results = index.search("calculations");
      expect(results.some((r) => r.doc.displayTitle === "Tools")).toBe(true);
    });

    it("should match 'streaming' to 'stream'", () => {
      const results = index.search("streaming");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("domain term preservation", () => {
    it("should find MCP-related docs", () => {
      const results = index.search("mcp");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find SSE transport", () => {
      const results = index.search("sse");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].doc.displayTitle).toBe("HTTP Transport");
    });

    it("should find JSON schema", () => {
      const results = index.search("json schema");
      expect(results.some((r) => r.doc.displayTitle === "Tools")).toBe(true);
    });
  });

  describe("ranking quality", () => {
    it("should rank exact title matches highest", () => {
      const results = index.search("prompts");
      expect(results[0].doc.displayTitle).toBe("Prompts");
    });

    it("should rank documents with multiple term matches higher", () => {
      const results = index.search("transport communication");
      // stdio mentions both transport and communication
      expect(results[0].doc.uri).toContain("stdio");
    });
  });

  describe("edge cases", () => {
    it("should handle empty query", () => {
      const results = index.search("");
      expect(results).toEqual([]);
    });

    it("should handle query with only stop words", () => {
      const results = index.search("the and or");
      expect(results).toEqual([]);
    });

    it("should handle very long queries", () => {
      const longQuery = "tools resources prompts stdio http transport mcp protocol";
      const results = index.search(longQuery);
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
