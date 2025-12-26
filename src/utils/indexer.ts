/**
 * BM25 search index with Porter stemming and bigram support.
 */

import natural from "natural";
import { STOP_WORDS, PRESERVE_TERMS } from "./stopwords.js";

const { PorterStemmer } = natural;

/** Tokenization patterns */
const TOKEN_RE = /[A-Za-z0-9_]+(?:-[A-Za-z0-9_]+)*/g;
const CAMELCASE_RE = /(?<=[a-z])(?=[A-Z])/;

/** Markdown patterns for weighted extraction */
const MD_HEADER_RE = /^#{1,6}\s+(.+)$/gm;
const MD_CODE_BLOCK_RE = /```[\w]*\n([\s\S]*?)```/g;
const MD_INLINE_CODE_RE = /`([^`]+)`/g;
const MD_LINK_TEXT_RE = /\[([^\]]+)\]\([^)]+\)/g;

/** BM25 parameters */
const K1 = 1.5;
const B = 0.75;

/** Title boost constants */
const TITLE_BOOST_EMPTY = 8;
const TITLE_BOOST_SHORT = 5;
const TITLE_BOOST_LONG = 3;
const SHORT_PAGE_THRESHOLD = 800;

export interface Doc {
  uri: string;
  displayTitle: string;
  content: string;
  indexTitle: string;
}

export interface SearchResult {
  score: number;
  doc: Doc;
}

/**
 * Generate bigrams from a list of tokens.
 */
function generateBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return bigrams;
}

/**
 * Enhanced tokenization with stemming and stopword removal.
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const matches = text.match(TOKEN_RE) || [];

  for (const token of matches) {
    // Split hyphenated terms into parts
    const parts = token.includes("-") ? token.split("-") : [token];

    for (const part of parts) {
      const partLower = part.toLowerCase();

      // Skip empty parts or stop words
      if (!partLower || STOP_WORDS.has(partLower)) continue;

      // Preserve domain-specific terms without stemming
      if (PRESERVE_TERMS.has(partLower)) {
        tokens.push(partLower);
        continue;
      }

      // Split CamelCase tokens
      if (/[a-z][A-Z]/.test(part)) {
        const camelParts = part.split(CAMELCASE_RE);
        for (const camelPart of camelParts) {
          const camelLower = camelPart.toLowerCase();
          if (camelLower && !STOP_WORDS.has(camelLower)) {
            if (PRESERVE_TERMS.has(camelLower)) {
              tokens.push(camelLower);
            } else {
              const stemmed = PorterStemmer.stem(camelLower);
              if (!STOP_WORDS.has(stemmed)) {
                tokens.push(stemmed);
              }
            }
          }
        }
        // Also add stemmed original if meaningful
        const stemmedOriginal = PorterStemmer.stem(partLower);
        if (!STOP_WORDS.has(stemmedOriginal) && !tokens.includes(stemmedOriginal)) {
          tokens.push(stemmedOriginal);
        }
      } else {
        const stemmed = PorterStemmer.stem(partLower);
        if (!STOP_WORDS.has(stemmed)) {
          tokens.push(stemmed);
        }
      }
    }
  }

  return tokens;
}

/**
 * Get title boost factor based on content length.
 */
function getTitleBoost(doc: Doc): number {
  const n = doc.content.length;
  if (n === 0) return TITLE_BOOST_EMPTY;
  if (n < SHORT_PAGE_THRESHOLD) return TITLE_BOOST_SHORT;
  return TITLE_BOOST_LONG;
}

/**
 * Count occurrences of a token in text (case-insensitive).
 */
function countOccurrences(text: string, token: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = lower.indexOf(token, pos)) !== -1) {
    count++;
    pos += token.length;
  }
  return count;
}

/**
 * Extract all matches from regex and join them.
 */
function extractMatches(text: string, regex: RegExp): string {
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1] || match[0]);
  }
  return matches.join(" ");
}

/**
 * BM25 inverted index with Markdown awareness.
 */
export class IndexSearch {
  private docs: Doc[] = [];
  private docFrequency: Map<string, number> = new Map();
  private docIndices: Map<string, number[]> = new Map();
  private docLengths: number[] = [];
  private avgDocLength: number = 0;

  /**
   * Add a document to the search index.
   */
  add(doc: Doc): this {
    const idx = this.docs.length;
    this.docs.push(doc);

    const seen = new Set<string>();
    const docTokens: string[] = [];

    // Extract content parts
    const content = doc.content.toLowerCase();
    const titleText = doc.indexTitle.toLowerCase();

    // Extract headers, code, links
    const headers = extractMatches(doc.content, MD_HEADER_RE);
    const codeBlocks = extractMatches(doc.content, MD_CODE_BLOCK_RE);
    const inlineCode = extractMatches(doc.content, MD_INLINE_CODE_RE);
    const linkText = extractMatches(doc.content, MD_LINK_TEXT_RE);

    // Build weighted haystack
    const haystack = [
      titleText,
      headers.toLowerCase(),
      linkText.toLowerCase(),
      codeBlocks.toLowerCase(),
      inlineCode.toLowerCase(),
      content,
    ].filter(Boolean).join(" ");

    // Tokenize and generate bigrams
    const unigrams = tokenize(haystack);
    const bigrams = generateBigrams(unigrams);
    const allTokens = [...unigrams, ...bigrams];

    for (const tok of allTokens) {
      const indices = this.docIndices.get(tok) || [];
      indices.push(idx);
      this.docIndices.set(tok, indices);

      if (!seen.has(tok)) {
        this.docFrequency.set(tok, (this.docFrequency.get(tok) || 0) + 1);
        seen.add(tok);
      }
      docTokens.push(tok);
    }

    // Store document length
    this.docLengths.push(docTokens.length);

    // Update average document length
    const totalLength = this.docLengths.reduce((a, b) => a + b, 0);
    this.avgDocLength = totalLength / this.docLengths.length;

    return this;
  }

  /**
   * Search the index and return ranked results.
   */
  search(query: string, k: number = 8): SearchResult[] {
    if (this.docs.length === 0) return [];

    // Tokenize query
    const qUnigrams = tokenize(query);
    const qBigrams = generateBigrams(qUnigrams);
    const qTokens = [...qUnigrams, ...qBigrams];

    const scores = new Map<number, number>();

    for (const qt of qTokens) {
      const indices = this.docIndices.get(qt) || [];
      for (const idx of indices) {
        const doc = this.docs[idx];
        const score = this.calculateBM25Score(doc, qt, idx);
        scores.set(idx, (scores.get(idx) || 0) + score);
      }
    }

    // Sort by score descending
    const ranked = Array.from(scores.entries())
      .map(([idx, score]) => ({ score, doc: this.docs[idx] }))
      .sort((a, b) => b.score - a.score);

    return ranked.slice(0, k);
  }

  /**
   * Calculate BM25 score for a token in a document.
   */
  private calculateBM25Score(doc: Doc, token: string, docIdx: number): number {
    const contentLower = doc.content.toLowerCase();
    const titleLower = doc.indexTitle.toLowerCase();

    // Term frequencies
    const contentTf = countOccurrences(contentLower, token);
    const titleTf = countOccurrences(titleLower, token);

    // Header matches (4x weight)
    const headers = extractMatches(doc.content, MD_HEADER_RE);
    const headerTf = countOccurrences(headers.toLowerCase(), token);

    // Code matches (2x weight)
    const codeBlocks = extractMatches(doc.content, MD_CODE_BLOCK_RE);
    const codeTf = countOccurrences(codeBlocks.toLowerCase(), token);

    // Link text matches (2x weight)
    const linkText = extractMatches(doc.content, MD_LINK_TEXT_RE);
    const linkTf = countOccurrences(linkText.toLowerCase(), token);

    // Combined weighted TF
    const weightedTf =
      contentTf +
      titleTf * getTitleBoost(doc) +
      headerTf * 4 +
      codeTf * 2 +
      linkTf * 2;

    // Document length
    const docLength = this.docLengths[docIdx] || 1;
    const avgLen = Math.max(this.avgDocLength, 1);

    // BM25 IDF
    const nDocs = Math.max(this.docs.length, 1);
    const df = this.docFrequency.get(token) || 0;
    const idf = Math.log((nDocs - df + 0.5) / (df + 0.5) + 1.0);

    // BM25 TF with length normalization
    const tfComponent =
      (weightedTf * (K1 + 1)) /
      (weightedTf + K1 * (1 - B + B * (docLength / avgLen)));

    return idf * tfComponent;
  }

  /**
   * Get all indexed documents.
   */
  getDocs(): readonly Doc[] {
    return this.docs;
  }

  /**
   * Get the number of indexed documents.
   */
  get size(): number {
    return this.docs.length;
  }
}
