/**
 * PREPROCESSING LAYER: Text Preprocessing Pipeline
 * 
 * This module handles all text preprocessing operations:
 * 1. Tokenization - Breaking text into words
 * 2. Normalization - Lowercasing, removing punctuation
 * 3. Stopword Removal - Filtering common words
 * 4. Stemming - Reducing words to their root form (simplified Porter stemmer)
 * 
 * Mathematical Foundation:
 * - Tokenization: T(text) → {w₁, w₂, ..., wₙ}
 * - Normalization: N(w) → lowercase(remove_punctuation(w))
 * - Stopword Removal: S(T) → T \ STOPWORDS
 * - Stemming: stem(w) → root_form(w)
 */

// Common English stopwords
export const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where',
  'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
  'there', 'then', 'once', 'if', 'else', 'about', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'under',
  'again', 'further', 'while', 'any', 'up', 'down', 'out', 'off', 'over',
  'am', 'being', 'get', 'got', 'getting', 'make', 'made', 'want', 'like',
  'use', 'using', 'thing', 'things', 'way', 'ways', 'people', 'dont',
  "don't", 'doesnt', "doesn't", 'cant', "can't", 'wont', "won't"
]);

/**
 * Tokenize text into words
 * Splits on whitespace and punctuation, filters empty tokens
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Remove stopwords from token array
 */
export function removeStopwords(tokens: string[]): string[] {
  return tokens.filter(token => !STOPWORDS.has(token) && token.length > 2);
}

/**
 * Simplified Porter Stemmer
 * Handles common English suffixes
 * 
 * Algorithm:
 * 1. Handle -ing, -ed, -ly, -ment, -ness, -tion, -sion, -ity
 * 2. Handle -ies → -y, -ves → -f
 * 3. Handle plural -s, -es
 */
export function stem(word: string): string {
  if (word.length < 4) return word;
  
  let result = word;
  
  // Common suffix replacements
  const suffixRules: [string, string][] = [
    ['ational', 'ate'],
    ['tional', 'tion'],
    ['ization', 'ize'],
    ['iveness', 'ive'],
    ['fulness', 'ful'],
    ['ousness', 'ous'],
    ['ibility', 'ible'],
    ['ically', 'ic'],
    ['atively', 'ate'],
    ['iveness', 'ive'],
    ['ement', ''],
    ['ment', ''],
    ['ness', ''],
    ['ance', ''],
    ['ence', ''],
    ['able', ''],
    ['ible', ''],
    ['tion', ''],
    ['sion', ''],
    ['ally', ''],
    ['ful', ''],
    ['ive', ''],
    ['ous', ''],
    ['ing', ''],
    ['ity', ''],
    ['ies', 'y'],
    ['ves', 'f'],
    ['ed', ''],
    ['ly', ''],
    ['er', ''],
    ['es', ''],
    ['s', ''],
  ];
  
  for (const [suffix, replacement] of suffixRules) {
    if (result.endsWith(suffix) && result.length - suffix.length >= 3) {
      result = result.slice(0, -suffix.length) + replacement;
      break;
    }
  }
  
  return result;
}

/**
 * Full preprocessing pipeline
 * Combines tokenization, stopword removal, and stemming
 */
export function preprocess(text: string): string[] {
  const tokens = tokenize(text);
  const filtered = removeStopwords(tokens);
  const stemmed = filtered.map(stem);
  return stemmed;
}

/**
 * Get preprocessed text as a string (for display)
 */
export function preprocessToString(text: string): string {
  return preprocess(text).join(' ');
}

/**
 * Extract n-grams from tokens
 * N-gram: Contiguous sequence of n tokens
 */
export function extractNgrams(tokens: string[], n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join('_'));
  }
  return ngrams;
}

/**
 * Get preprocessing explanation for transparency
 */
export function explainPreprocessing(text: string): {
  original: string;
  tokenized: string[];
  afterStopwords: string[];
  afterStemming: string[];
  steps: string[];
} {
  const tokenized = tokenize(text);
  const afterStopwords = removeStopwords(tokenized);
  const afterStemming = afterStopwords.map(stem);
  
  return {
    original: text,
    tokenized,
    afterStopwords,
    afterStemming,
    steps: [
      `1. Tokenization: Split "${text.slice(0, 50)}..." into ${tokenized.length} tokens`,
      `2. Stopword Removal: Removed ${tokenized.length - afterStopwords.length} common words`,
      `3. Stemming: Reduced words to root forms (e.g., "${afterStopwords[0] || 'word'}" → "${afterStemming[0] || 'stem'}")`,
    ],
  };
}
