# MCP Server Builder

A Model Context Protocol (MCP) server for searching MCP protocol documentation. Built with TypeScript using the official MCP SDK.

## Features

- **BM25 Search** - High-quality ranked search using BM25 algorithm with Porter stemming
- **Fast Startup** - Indexes document titles at startup, fetches content on-demand
- **Markdown Aware** - Weights headers, code blocks, and links for better relevance
- **stdio Transport** - Runs as a local process for easy integration

## Installation

```bash
npm install
npm run build
```

## Usage

### Testing with MCP Inspector

The easiest way to test the server is with the MCP Inspector:

```bash
# Build first
npm run build

# Run inspector with compiled JS
npx @modelcontextprotocol/inspector node dist/index.js

# Or run with tsx for development (no build needed)
npx @modelcontextprotocol/inspector npx tsx src/index.ts
```

### As an MCP Server

Add to your MCP client configuration (e.g., Claude Desktop, Kiro):

```json
{
  "mcpServers": {
    "mcp-server-builder": {
      "command": "node",
      "args": ["/path/to/mcp-builder-ts/dist/index.js"]
    }
  }
}
```

Or using tsx for development:

```json
{
  "mcpServers": {
    "mcp-server-builder": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-builder-ts/src/index.ts"]
    }
  }
}
```

### Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build

# Test with MCP Inspector (after build)
npm run inspect

# Test with MCP Inspector (development, no build needed)
npm run inspect:dev
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
