# MCP Docs Server

A Model Context Protocol (MCP) server for searching MCP protocol documentation. Built with TypeScript using the official MCP SDK.

[![npm version](https://img.shields.io/npm/v/@praveenc/mcp-docs-server.svg)](https://www.npmjs.com/package/@praveenc/mcp-docs-server)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.praveenc%2Fmcp-docs-server/versions/0.1.0)

## Features

- **BM25 Search** - High-quality ranked search using BM25 algorithm with Porter stemming
- **Fast Startup** - Indexes document titles at startup, fetches content on-demand
- **Markdown Aware** - Weights headers, code blocks, and links for better relevance
- **stdio Transport** - Runs as a local process for easy integration

## Installation

### Quick Start (Recommended)

Add to your MCP client configuration (Claude Desktop, Kiro, etc.):

```json
{
  "mcpServers": {
    "mcp-docs-server": {
      "command": "npx",
      "args": ["-y", "@praveenc/mcp-docs-server"]
    }
  }
}
```

That's it! The server will be downloaded and run automatically.

### Global Install

```bash
npm install -g @praveenc/mcp-docs-server
```

Then configure your MCP client:

```json
{
  "mcpServers": {
    "mcp-docs-server": {
      "command": "mcp-docs-server"
    }
  }
}
```

## Tools

### search_mcp_docs

Search MCP protocol documentation with ranked results.

**Parameters:**

- `query` (string, required): Search query string
- `k` (number, optional): Maximum results to return (default: 5). Returns fewer if fewer documents match.

**Example:**

```json
{
  "query": "transports",
  "k": 5
}
```

**Returns:**

```json
[
  {
    "url": "https://modelcontextprotocol.io/specification/2025-11-25/basic/transports.md",
    "title": "Transports",
    "score": 15.725,
    "snippet": "MCP uses JSON-RPC to encode messages..."
  }
]
```

### fetch_mcp_doc

Fetch full document content by URL.

**Parameters:**

- `uri` (string, required): Document URL from modelcontextprotocol.io

**Example:**

```json
{
  "uri": "https://modelcontextprotocol.io/specification/2025-11-25/server/tools.md"
}
```

**Returns:**

```json
{
  "url": "https://modelcontextprotocol.io/specification/2025-11-25/server/tools.md",
  "title": "Tools",
  "content": "# Tools\n\nTools enable servers to expose executable functionality..."
}
```

## Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector npx -y @praveenc/mcp-docs-server
```

## Development

Clone the repository for local development:

```bash
git clone https://github.com/praveenc/mcp-docs-server.git
cd mcp-docs-server
npm install
```

### Commands

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build

# Test with MCP Inspector (development)
npm run inspect:dev
```

### Local MCP Client Config (Development)

```json
{
  "mcpServers": {
    "mcp-docs-server": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-docs-server/src/index.ts"]
    }
  }
}
```

## Architecture

```text
src/
├── index.ts          # MCP server entry point
├── config.ts         # Configuration
├── tools/
│   └── docs.ts       # search_mcp_docs, fetch_mcp_doc
└── utils/
    ├── cache.ts      # Document caching
    ├── doc-fetcher.ts # HTTP fetching & HTML parsing
    ├── indexer.ts    # BM25 search index
    ├── logger.ts     # Logging utilities
    ├── stopwords.ts  # Stop words list
    ├── text-processor.ts # Text utilities
    └── url-validator.ts  # URL validation
```

## Search Algorithm

The search uses BM25 (Best Matching 25) with enhancements:

- **Porter Stemming** - Matches word variants (e.g., "running" → "run")
- **Bigrams** - Captures phrase matches (e.g., "tool input")
- **Weighted Scoring**:
  - Title matches: 3-8x boost
  - Header matches: 4x weight
  - Code blocks: 2x weight
  - Link text: 2x weight
- **Domain Term Preservation** - Technical terms like "mcp", "json", "stdio" are not stemmed

## License

MIT
