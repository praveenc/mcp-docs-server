/**
 * English stop words for search indexing.
 * These common words are filtered out during tokenization.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "as", "at", "be", "because", "been", "before", "being", "below",
  "between", "both", "but", "by", "can", "could", "did", "do", "does", "doing",
  "down", "during", "each", "few", "for", "from", "further", "had", "has",
  "have", "having", "he", "her", "here", "hers", "herself", "him", "himself",
  "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just",
  "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off",
  "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over",
  "own", "same", "she", "should", "so", "some", "such", "than", "that", "the",
  "their", "theirs", "them", "themselves", "then", "there", "these", "they",
  "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
  "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why",
  "will", "with", "would", "you", "your", "yours", "yourself", "yourselves",
  // Additional common stop words
  "also", "come", "even", "get", "got", "go", "going", "gone", "know", "like",
  "make", "made", "may", "might", "much", "must", "need", "new", "one", "see",
  "take", "thing", "think", "use", "used", "using", "want", "way", "well",
  "work", "year", "first", "last", "long", "great", "little", "old", "right",
  "big", "high", "small", "large", "next", "early", "young", "important",
  "public", "bad", "good",
]);

/**
 * Domain-specific terms to preserve without stemming.
 * These technical terms should not be modified by the Porter stemmer.
 */
export const PRESERVE_TERMS: ReadonlySet<string> = new Set([
  "mcp", "json", "rpc", "sse", "stdio", "http", "https", "uri", "url", "api",
  "sdk", "cli", "llm", "ai", "ml", "aws", "pydantic", "zod", "typescript", "ts",
]);
