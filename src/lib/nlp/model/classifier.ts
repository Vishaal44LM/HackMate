/**
 * MODEL LAYER: Theme Classifier
 * 
 * Implements a centroid-based text classifier for hackathon themes.
 * 
 * Mathematical Foundation:
 * 
 * Centroid Classification:
 * 1. Training: Calculate centroid for each class
 *    centroid(C) = (1/|C|) × Σ(doc_vector for doc in C)
 *    The centroid is the average TF-IDF vector of all documents in a class
 * 
 * 2. Classification: Assign to nearest centroid
 *    class(doc) = argmax_C { cosine(doc_vector, centroid(C)) }
 *    The document is assigned to the class whose centroid is most similar
 * 
 * 3. Confidence: Based on margin between top classes
 *    confidence = (score₁ - score₂) / score₁
 *    Higher margin = higher confidence
 * 
 * This is a lightweight alternative to Naive Bayes or SVM that works well
 * for short text classification with limited training data.
 */

import { TFIDFVectorizer, TFIDFVector, getGlobalVectorizer } from './tfidfVectorizer';
import { cosineSimilarity } from './similarityEngine';
import { hackathonDataset, CategoryData } from '../data/hackathonDataset';
import { preprocess } from '../preprocessing/textPreprocessor';

export interface ClassificationResult {
  category: string;
  confidence: number;
  scores: Array<{ category: string; score: number }>;
  explanation: string;
  matchedKeywords: string[];
}

export interface CategoryCentroid {
  category: string;
  centroid: TFIDFVector;
  keywords: string[];
  documentCount: number;
}

/**
 * Build category centroids from the dataset
 */
export function buildCentroids(
  vectorizer: TFIDFVectorizer,
  dataset: CategoryData[]
): CategoryCentroid[] {
  const centroids: CategoryCentroid[] = [];
  
  for (const categoryData of dataset) {
    // Combine all text from category for centroid
    const allText = [
      categoryData.keywords.join(' '),
      ...categoryData.ideas.map(idea => 
        `${idea.title} ${idea.problem} ${idea.solution} ${idea.keywords.join(' ')}`
      )
    ].join(' ');
    
    const vector = vectorizer.transform(allText);
    
    centroids.push({
      category: categoryData.category,
      centroid: vector,
      keywords: categoryData.keywords,
      documentCount: categoryData.ideas.length,
    });
  }
  
  return centroids;
}

/**
 * Classify a text into a hackathon category
 */
export function classifyTheme(
  text: string,
  vectorizer: TFIDFVectorizer,
  centroids: CategoryCentroid[]
): ClassificationResult {
  const inputVector = vectorizer.transform(text);
  const inputTokens = new Set(preprocess(text));
  
  // Calculate similarity to each centroid
  const scores: Array<{ category: string; score: number; keywordMatches: string[] }> = [];
  
  for (const { category, centroid, keywords } of centroids) {
    const similarity = cosineSimilarity(inputVector, centroid);
    
    // Also check keyword matches for explainability
    const keywordMatches = keywords.filter(kw => {
      const kwTokens = preprocess(kw);
      return kwTokens.some(t => inputTokens.has(t));
    });
    
    // Boost score based on direct keyword matches
    const keywordBoost = Math.min(keywordMatches.length * 0.1, 0.3);
    const adjustedScore = Math.min(similarity + keywordBoost, 1);
    
    scores.push({
      category,
      score: adjustedScore,
      keywordMatches,
    });
  }
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  const topCategory = scores[0];
  const secondCategory = scores[1];
  
  // Calculate confidence based on margin
  const margin = topCategory.score - (secondCategory?.score || 0);
  const confidence = topCategory.score > 0 
    ? Math.min(margin / topCategory.score + topCategory.score * 0.5, 1)
    : 0;
  
  // Generate explanation
  const explanation = generateClassificationExplanation(
    text,
    topCategory,
    scores,
    confidence
  );
  
  return {
    category: topCategory.category,
    confidence,
    scores: scores.map(s => ({ category: s.category, score: s.score })),
    explanation,
    matchedKeywords: topCategory.keywordMatches,
  };
}

function generateClassificationExplanation(
  text: string,
  topCategory: { category: string; score: number; keywordMatches: string[] },
  allScores: Array<{ category: string; score: number; keywordMatches: string[] }>,
  confidence: number
): string {
  const topScores = allScores.slice(0, 3);
  
  let explanation = `
Classification Result: ${topCategory.category.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Confidence: ${(confidence * 100).toFixed(1)}%

How it works:
1. Your text was converted to a TF-IDF vector
2. We calculated cosine similarity to each category centroid
3. Keyword matches provided additional signal

Top 3 Categories:
`;
  
  for (let i = 0; i < topScores.length; i++) {
    const s = topScores[i];
    const bar = '█'.repeat(Math.round(s.score * 20));
    const space = '░'.repeat(20 - Math.round(s.score * 20));
    explanation += `${i + 1}. ${s.category}: [${bar}${space}] ${(s.score * 100).toFixed(1)}%\n`;
    if (s.keywordMatches.length > 0) {
      explanation += `   Matched keywords: ${s.keywordMatches.slice(0, 3).join(', ')}\n`;
    }
  }
  
  explanation += `
Why "${topCategory.category}"?
• Cosine similarity to category centroid: ${(topCategory.score * 100).toFixed(1)}%
• Direct keyword matches: ${topCategory.keywordMatches.length > 0 ? topCategory.keywordMatches.join(', ') : 'None (relying on semantic similarity)'}
• Margin over next category: ${((topCategory.score - (allScores[1]?.score || 0)) * 100).toFixed(1)}%
`;
  
  if (confidence < 0.5) {
    explanation += `
⚠ Low confidence: Your theme spans multiple categories. Consider:
- Being more specific about the problem domain
- Adding domain-specific keywords
`;
  }
  
  return explanation.trim();
}

// Singleton centroids
let globalCentroids: CategoryCentroid[] | null = null;

export function getGlobalCentroids(): CategoryCentroid[] {
  if (!globalCentroids) {
    globalCentroids = buildCentroids(getGlobalVectorizer(), hackathonDataset);
  }
  return globalCentroids;
}

export function initializeCentroids(vectorizer: TFIDFVectorizer): CategoryCentroid[] {
  globalCentroids = buildCentroids(vectorizer, hackathonDataset);
  return globalCentroids;
}
