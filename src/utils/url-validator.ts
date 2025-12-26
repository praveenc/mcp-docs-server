/**
 * URL validation for domain restriction.
 * Only allows URLs from approved documentation domains.
 */

/** Allowed domain prefixes for documentation URLs */
const ALLOWED_DOMAINS: readonly string[] = [
  "https://modelcontextprotocol.io/",
];

export class URLValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "URLValidationError";
  }
}

/**
 * Check if a URL is from an allowed domain.
 */
export function isUrlAllowed(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  return ALLOWED_DOMAINS.some((prefix) => url.startsWith(prefix));
}

/**
 * Validate a URL and return it if allowed.
 * Converts relative URLs to absolute URLs (defaults to modelcontextprotocol.io).
 *
 * @throws URLValidationError if URL is not from an allowed domain
 */
export function validateUrl(url: string): string {
  // Convert relative URLs to absolute
  let processedUrl = url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    processedUrl = `https://modelcontextprotocol.io${url.startsWith("/") ? "" : "/"}${url}`;
  }

  if (!isUrlAllowed(processedUrl)) {
    throw new URLValidationError(
      `URL not allowed: ${url}. Allowed domains: ${ALLOWED_DOMAINS.join(", ")}`
    );
  }

  return processedUrl;
}

/**
 * Validate multiple URLs and return valid ones.
 *
 * @throws URLValidationError if any URL is not allowed
 */
export function validateUrls(urls: string[]): string[] {
  return urls.map(validateUrl);
}
