/**
 * Text processing utilities for snippets and title normalization.
 */

/** Regex to collapse whitespace */
const WHITESPACE_RE = /\s+/g;

/** Regex to match code fences */
const CODE_FENCE_RE = /```[\s\S]*?```/g;

/**
 * Normalize whitespace in a string.
 */
export function normalize(s: string): string {
  return s.replace(WHITESPACE_RE, " ").trim();
}

/**
 * Generate a human-readable title from a URL path.
 */
export function titleFromUrl(url: string): string {
  const path = url.includes("://") ? url.split("://")[1] : url;
  const parts = path.split("/").filter(Boolean);

  // Remove trailing index.*
  if (parts.length > 0 && parts[parts.length - 1].startsWith("index.")) {
    parts.pop();
  }

  const slug = parts[parts.length - 1] || path;
  const title = slug.replace(/[-_]/g, " ").trim();

  // Title case
  return title
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Documentation";
}

/**
 * Determine the best display title for a document.
 *
 * Priority:
 * 1. Curated title from llms.txt (highest)
 * 2. URL-derived title if extracted is missing/generic
 * 3. Normalized extracted title
 */
export function formatDisplayTitle(
  url: string,
  extracted: string | null,
  urlTitles: Map<string, string>
): string {
  // Check curated first
  const curated = urlTitles.get(url);
  if (curated) return normalize(curated);

  // No extracted title or generic - use URL slug
  if (!extracted) return titleFromUrl(url);

  const t = extracted.trim();
  if (!t || t.toLowerCase() === "index" || t.toLowerCase() === "index.md" || t.endsWith(".md")) {
    return titleFromUrl(url);
  }

  return normalize(t);
}

/**
 * Generate searchable title variants for indexing.
 */
export function indexTitleVariants(displayTitle: string, url: string): string {
  const base = displayTitle;
  const slug = titleFromUrl(url);

  // Numeric-to-word variant: '2' -> 'to' (e.g., Agent2Agent)
  const variant = base.replace(/(\w)2(\w)/gi, "$1 to $2");

  // Build distinct set
  const variants: string[] = [];
  for (const v of [base, variant, slug]) {
    const normalized = normalize(v);
    if (normalized && !variants.some((x) => x.toLowerCase() === normalized.toLowerCase())) {
      variants.push(normalized);
    }
  }

  return variants.join(" ");
}

/**
 * Normalize string for case-insensitive comparison.
 */
function normalizeForComparison(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(WHITESPACE_RE, " ").trim();
}

/**
 * Create a contextual snippet from page content.
 */
export function makeSnippet(
  content: string | null,
  displayTitle: string,
  maxChars: number = 300
): string {
  if (!content) return displayTitle;

  let text = content.trim();
  // Remove fenced code blocks
  text = text.replace(CODE_FENCE_RE, "");

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Drop first line if it looks like a title or heading
  if (lines.length > 0) {
    const first = lines[0];
    if (
      first.startsWith("#") ||
      normalizeForComparison(first) === normalizeForComparison(displayTitle) ||
      normalizeForComparison(first).startsWith(normalizeForComparison(displayTitle))
    ) {
      lines.shift();
    }
  }

  // Skip headings/TOC bullets, collect first paragraph
  const buf: string[] = [];
  for (const line of lines) {
    const trimmed = line.trimStart();
    // Skip headings and list items
    if (trimmed.startsWith("#") || trimmed.startsWith("-") || trimmed.startsWith("*") || /^\d+\./.test(trimmed)) {
      if (buf.length > 0) break;
      continue;
    }
    buf.push(line);
    // Stop when we have a decent paragraph
    if (buf.join(" ").length >= 120 || line.endsWith(".")) {
      break;
    }
  }

  let snippet = buf.length > 0 ? buf.join(" ") : displayTitle;
  snippet = snippet.replace(WHITESPACE_RE, " ").trim();

  if (snippet.length > maxChars) {
    snippet = snippet.slice(0, maxChars - 1).trimEnd() + "…";
  }

  return snippet;
}
