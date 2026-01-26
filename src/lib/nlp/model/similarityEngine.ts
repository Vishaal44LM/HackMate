/**
 * MODEL LAYER: Similarity Engine
 * 
 * Implements various similarity metrics for comparing text vectors.
 * 
 * Mathematical Foundation:
 * 
 * 1. Cosine Similarity:
 *    cos(A, B) = (A · B) / (||A|| × ||B||)
 *    Where A · B = Σ(aᵢ × bᵢ) is the dot product
 *    ||A|| = √Σ(aᵢ²) is the magnitude
 *    Range: [-1, 1], where 1 = identical, 0 = orthogonal, -1 = opposite
 * 
 * 2. Jaccard Similarity:
 *    J(A, B) = |A ∩ B| / |A ∪ B|
 *    Measures overlap between two sets
 *    Range: [0, 1], where 1 = identical sets
 * 
 * 3. Euclidean Distance:
 *    d(A, B) = √Σ(aᵢ - bᵢ)²
 *    Measures geometric distance between vectors
 */

import { TFIDFVector } from './tfidfVectorizer';
import { preprocess } from '../preprocessing/textPreprocessor';

export interface SimilarityResult {
  score: number;
  method: string;
  explanation: string;
  confidence: number;
}

/**
 * Calculate cosine similarity between two TF-IDF vectors
 */
export function cosineSimilarity(vecA: TFIDFVector, vecB: TFIDFVector): number {
  let dotProduct = 0;
  
  // Only iterate over terms in the smaller vector
  const [smaller, larger] = vecA.terms.size <= vecB.terms.size 
    ? [vecA.terms, vecB.terms] 
    : [vecB.terms, vecA.terms];
  
  for (const [term, valueA] of smaller) {
    const valueB = larger.get(term);
    if (valueB !== undefined) {
      dotProduct += valueA * valueB;
    }
  }
  
  // Normalize by magnitudes
  const similarity = dotProduct / (vecA.magnitude * vecB.magnitude);
  
  // Clamp to [-1, 1] to handle floating point errors
  return Math.max(-1, Math.min(1, similarity));
}

/**
 * Calculate Jaccard similarity between two token sets
 */
export function jaccardSimilarity(textA: string, textB: string): number {
  const tokensA = new Set(preprocess(textA));
  const tokensB = new Set(preprocess(textB));
  
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  
  // Calculate intersection
  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }
  
  // Calculate union
  const union = tokensA.size + tokensB.size - intersection;
  
  return intersection / union;
}

/**
 * Calculate Euclidean distance between two TF-IDF vectors
 */
export function euclideanDistance(vecA: TFIDFVector, vecB: TFIDFVector): number {
  const allTerms = new Set([...vecA.terms.keys(), ...vecB.terms.keys()]);
  let sumSquares = 0;
  
  for (const term of allTerms) {
    const valueA = vecA.terms.get(term) || 0;
    const valueB = vecB.terms.get(term) || 0;
    sumSquares += Math.pow(valueA - valueB, 2);
  }
  
  return Math.sqrt(sumSquares);
}

/**
 * Convert Euclidean distance to similarity score
 */
export function euclideanSimilarity(vecA: TFIDFVector, vecB: TFIDFVector): number {
  const distance = euclideanDistance(vecA, vecB);
  // Convert distance to similarity using exponential decay
  return Math.exp(-distance);
}

/**
 * Combined similarity score using multiple metrics
 * Weighted average with confidence estimation
 */
export function combinedSimilarity(
  vecA: TFIDFVector,
  vecB: TFIDFVector,
  textA: string,
  textB: string
): SimilarityResult {
  const cosine = cosineSimilarity(vecA, vecB);
  const jaccard = jaccardSimilarity(textA, textB);
  const euclidean = euclideanSimilarity(vecA, vecB);
  
  // Weighted combination (cosine is most reliable for TF-IDF)
  const weights = { cosine: 0.5, jaccard: 0.3, euclidean: 0.2 };
  const score = (
    cosine * weights.cosine +
    jaccard * weights.jaccard +
    euclidean * weights.euclidean
  );
  
  // Confidence based on agreement between methods
  const variance = (
    Math.pow(cosine - score, 2) +
    Math.pow(jaccard - score, 2) +
    Math.pow(euclidean - score, 2)
  ) / 3;
  const confidence = Math.max(0, 1 - Math.sqrt(variance) * 2);
  
  return {
    score,
    method: 'combined',
    explanation: `
Similarity Analysis:
├─ Cosine Similarity: ${(cosine * 100).toFixed(1)}% (weight: ${weights.cosine * 100}%)
│  └─ Measures: Angle between TF-IDF vectors
├─ Jaccard Similarity: ${(jaccard * 100).toFixed(1)}% (weight: ${weights.jaccard * 100}%)
│  └─ Measures: Token overlap ratio
└─ Euclidean Similarity: ${(euclidean * 100).toFixed(1)}% (weight: ${weights.euclidean * 100}%)
   └─ Measures: Geometric proximity

Combined Score: ${(score * 100).toFixed(1)}%
Confidence: ${(confidence * 100).toFixed(1)}%
${confidence > 0.7 ? '✓ High agreement between methods' : '⚠ Methods show some disagreement'}
    `.trim(),
    confidence,
  };
}

/**
 * Explain why two texts are similar or different
 */
export function explainSimilarity(
  textA: string,
  textB: string,
  similarity: number
): {
  sharedTerms: string[];
  uniqueToA: string[];
  uniqueToB: string[];
  interpretation: string;
} {
  const tokensA = new Set(preprocess(textA));
  const tokensB = new Set(preprocess(textB));
  
  const sharedTerms = [...tokensA].filter(t => tokensB.has(t));
  const uniqueToA = [...tokensA].filter(t => !tokensB.has(t));
  const uniqueToB = [...tokensB].filter(t => !tokensA.has(t));
  
  let interpretation: string;
  if (similarity > 0.7) {
    interpretation = `High similarity (${(similarity * 100).toFixed(1)}%): These texts share many key concepts (${sharedTerms.slice(0, 5).join(', ')}). They are likely about the same topic or related ideas.`;
  } else if (similarity > 0.4) {
    interpretation = `Moderate similarity (${(similarity * 100).toFixed(1)}%): Some shared concepts (${sharedTerms.slice(0, 3).join(', ')}), but also distinct elements. They may be related but approach the topic differently.`;
  } else if (similarity > 0.2) {
    interpretation = `Low similarity (${(similarity * 100).toFixed(1)}%): Few shared terms. These texts discuss different aspects or use different vocabulary.`;
  } else {
    interpretation = `Very low similarity (${(similarity * 100).toFixed(1)}%): These texts appear to be about different topics with minimal conceptual overlap.`;
  }
  
  return {
    sharedTerms,
    uniqueToA: uniqueToA.slice(0, 10),
    uniqueToB: uniqueToB.slice(0, 10),
    interpretation,
  };
}
