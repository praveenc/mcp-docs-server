import { describe, it, expect, beforeEach } from "vitest";
import { IndexSearch, Doc } from "../src/utils/indexer.js";

describe("IndexSearch", () => {
  let index: IndexSearch;

  const testDocs: Doc[] = [
    {
      uri: "https://modelcontextprotocol.io/docs/tools",
      displayTitle: "Tools",
      content: "# Tools\n\nTools allow servers to expose executable functions that can be invoked by clients.",
      indexTitle: "Tools MCP",
    },
    {
      uri: "https://modelcontextprotocol.io/docs/transports/stdio",
      displayTitle: "stdio Transport",
      content: "# stdio Transport\n\nThe stdio transport uses standard input and output streams for communication.",
      indexTitle: "stdio Transport",
    },
    {
      uri: "https://modelcontextprotocol.io/docs/resources",
      displayTitle: "Resources",
      content: "# Resources\n\nResources represent data that servers can expose to clients for reading.",
      indexTitle: "Resources MCP",
    },
  ];

  beforeEach(() => {
    index = new IndexSearch();
  });

  describe("add", () => {
    it("should add documents to the index", () => {
      index.add(testDocs[0]);
      expect(index.size).toBe(1);
    });

    it("should support method chaining", () => {
      const result = index.add(testDocs[0]).add(testDocs[1]);
      expect(result).toBe(index);
      expect(index.size).toBe(2);
    });

    it("should index all documents", () => {
      for (const doc of testDocs) {
        index.add(doc);
      }
      expect(index.size).toBe(3);
    });
  });

  describe("search", () => {
    beforeEach(() => {
      for (const doc of testDocs) {
        index.add(doc);
      }
    });

    it("should return results for matching query", () => {
      const results = index.search("tools");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].doc.displayTitle).toBe("Tools");
    });

    it("should return empty array for no matches", () => {
      const results = index.search("xyznonexistent");
      expect(results).toEqual([]);
    });

    it("should rank title matches higher", () => {
      const results = index.search("stdio");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].doc.displayTitle).toBe("stdio Transport");
    });

    it("should respect k parameter", () => {
      const results = index.search("mcp", 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should handle stemmed queries", () => {
      // "functions" should match "function" via stemming
      const results = index.search("functions");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should handle multi-word queries", () => {
      const results = index.search("stdio transport");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].doc.displayTitle).toBe("stdio Transport");
    });

    it("should return results sorted by score descending", () => {
      const results = index.search("servers");
      if (results.length > 1) {
        for (let i = 1; i < results.length; i++) {
          expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
        }
      }
    });
  });

  describe("getDocs", () => {
    it("should return all indexed documents", () => {
      for (const doc of testDocs) {
        index.add(doc);
      }
      const docs = index.getDocs();
      expect(docs.length).toBe(3);
    });

    it("should return readonly array", () => {
      index.add(testDocs[0]);
      const docs = index.getDocs();
      expect(docs).toEqual([testDocs[0]]);
    });
  });

  describe("empty index", () => {
    it("should return empty results for empty index", () => {
      const results = index.search("anything");
      expect(results).toEqual([]);
    });

    it("should have size 0", () => {
      expect(index.size).toBe(0);
    });
  });
});
