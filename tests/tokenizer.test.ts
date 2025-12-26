import { describe, it, expect } from "vitest";
import { tokenize } from "../src/utils/indexer.js";

describe("tokenize", () => {
  it("should tokenize basic words", () => {
    const tokens = tokenize("hello world");
    expect(tokens).toContain("hello");
    expect(tokens).toContain("world");
  });

  it("should remove stop words", () => {
    const tokens = tokenize("the quick brown fox");
    expect(tokens).not.toContain("the");
    expect(tokens).toContain("quick");
    expect(tokens).toContain("brown");
    expect(tokens).toContain("fox");
  });

  it("should preserve domain-specific terms without stemming", () => {
    const tokens = tokenize("mcp json rpc stdio http");
    expect(tokens).toContain("mcp");
    expect(tokens).toContain("json");
    expect(tokens).toContain("rpc");
    expect(tokens).toContain("stdio");
    expect(tokens).toContain("http");
  });

  it("should apply Porter stemming to regular words", () => {
    const tokens = tokenize("running");
    expect(tokens).toContain("run");
    expect(tokens).not.toContain("running");
  });

  it("should split CamelCase tokens", () => {
    const tokens = tokenize("FastMCP");
    expect(tokens).toContain("fast");
    expect(tokens).toContain("mcp");
  });

  it("should handle hyphenated terms", () => {
    const tokens = tokenize("json-rpc");
    expect(tokens).toContain("json");
    expect(tokens).toContain("rpc");
  });

  it("should handle mixed content", () => {
    const tokens = tokenize("The MCP protocol uses stdio transport");
    expect(tokens).not.toContain("the");
    expect(tokens).toContain("mcp");
    expect(tokens).toContain("protocol");
    expect(tokens).toContain("stdio");
    expect(tokens).toContain("transport");
  });

  it("should handle empty input", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("should handle numbers and underscores", () => {
    const tokens = tokenize("version_2 test123");
    expect(tokens.length).toBeGreaterThan(0);
  });
});
