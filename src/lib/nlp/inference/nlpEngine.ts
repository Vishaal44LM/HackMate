/**
 * INFERENCE LAYER: NLP Engine
 * 
 * Main entry point for all NLP operations.
 * Coordinates between model components and provides unified API.
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      NLP Engine                             │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
 * │  │ Preprocessor│→ │  TF-IDF     │→ │ Similarity/Classify │ │
 * │  │  Pipeline   │  │  Vectorizer │  │      Engine         │ │
 * │  └─────────────┘  └─────────────┘  └─────────────────────┘ │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * This layer:
 * - Initializes all model components
 * - Provides high-level API for UI components
 * - Tracks all operations for explainability
 * - Maintains evaluation metrics
 */

import { TFIDFVectorizer, initializeVectorizer, getGlobalVectorizer } from '../model/tfidfVectorizer';
import { CategoryCentroid, initializeCentroids, getGlobalCentroids, classifyTheme } from '../model/classifier';
import { matchIdeasToTheme, IdeaMatchResult, generateIdeasFromMatches } from '../model/ideaMatcher';
import { cosineSimilarity, combinedSimilarity, explainSimilarity } from '../model/similarityEngine';
import { explainPreprocessing, preprocess } from '../preprocessing/textPreprocessor';
import { hackathonDataset, allIdeas, IdeaEntry } from '../data/hackathonDataset';

export interface NLPEngineState {
  initialized: boolean;
  vocabularySize: number;
  documentCount: number;
  categoryCount: number;
  ideaCount: number;
}

export interface GeneratedIdea {
  id: string;
  title: string;
  problem: string;
  solution: string;
  techStack: string[];
  difficulty: string;
  uniqueness: string;
  confidence: number;
  explanation: string;
  basedOn?: string;
}

export interface GenerationResult {
  ideas: GeneratedIdea[];
  theme: string;
  category: string;
  categoryConfidence: number;
  processingSteps: string[];
  metrics: {
    totalCandidates: number;
    averageConfidence: number;
    processingTimeMs: number;
  };
}

let engineInitialized = false;
let vectorizer: TFIDFVectorizer;
let centroids: CategoryCentroid[];

/**
 * Initialize the NLP engine with the hackathon dataset
 */
export function initializeNLPEngine(): NLPEngineState {
  const startTime = performance.now();
  
  // Build corpus from all ideas
  const corpus = allIdeas.map(idea => 
    `${idea.title} ${idea.problem} ${idea.solution} ${idea.keywords.join(' ')}`
  );
  
  // Add category keywords to corpus
  hackathonDataset.forEach(cat => {
    corpus.push(cat.keywords.join(' '));
  });
  
  // Initialize vectorizer
  vectorizer = initializeVectorizer(corpus);
  
  // Build centroids
  centroids = initializeCentroids(vectorizer);
  
  engineInitialized = true;
  
  const endTime = performance.now();
  console.log(`NLP Engine initialized in ${(endTime - startTime).toFixed(2)}ms`);
  
  return {
    initialized: true,
    vocabularySize: vectorizer.getVocabularySize(),
    documentCount: vectorizer.getDocumentCount(),
    categoryCount: centroids.length,
    ideaCount: allIdeas.length,
  };
}

/**
 * Ensure engine is initialized
 */
function ensureInitialized(): void {
  if (!engineInitialized) {
    initializeNLPEngine();
  }
}

/**
 * Generate hackathon ideas using custom NLP (no external LLM)
 */
export function generateIdeasWithNLP(theme: string): GenerationResult {
  ensureInitialized();
  
  const startTime = performance.now();
  const processingSteps: string[] = [];
  
  // Step 1: Preprocess and explain
  processingSteps.push('═══ NLP IDEA GENERATION ═══');
  const preprocessing = explainPreprocessing(theme);
  processingSteps.push(`Input: "${theme}"`);
  processingSteps.push(`Preprocessed tokens: [${preprocessing.afterStemming.join(', ')}]`);
  
  // Step 2: Match ideas
  const matchResult = matchIdeasToTheme(theme, vectorizer, centroids, 5);
  processingSteps.push(...matchResult.processingSteps);
  
  // Step 3: Transform matched ideas into generated ideas with explanations
  const generatedIdeas: GeneratedIdea[] = matchResult.matchedIdeas.map((match, index) => {
    const idea = match.idea;
    
    // Generate uniqueness statement based on the match
    const uniqueness = generateUniquenessStatement(idea, match.keywordOverlap, theme);
    
    return {
      id: `gen-${Date.now()}-${index}`,
      title: idea.title,
      problem: idea.problem,
      solution: idea.solution,
      techStack: idea.techStack,
      difficulty: idea.difficulty,
      uniqueness,
      confidence: match.score,
      explanation: `
This idea was selected because:
• Similarity Score: ${(match.score * 100).toFixed(1)}%
• Confidence Level: ${(match.confidence * 100).toFixed(1)}%
• Category Match: ${idea.category === matchResult.category ? 'Yes (primary category)' : 'No (cross-category suggestion)'}
• Matching Reasons: ${match.matchReasons.join(', ')}
• Shared Keywords: ${match.keywordOverlap.length > 0 ? match.keywordOverlap.join(', ') : 'Based on semantic similarity'}

The score was calculated using:
1. TF-IDF vectorization of your theme
2. Cosine similarity (50% weight)
3. Jaccard similarity (30% weight)  
4. Euclidean similarity (20% weight)
${idea.category === matchResult.category ? '5. Category bonus (+20%)' : ''}
      `.trim(),
      basedOn: idea.title,
    };
  });
  
  const endTime = performance.now();
  
  // Calculate metrics
  const averageConfidence = generatedIdeas.reduce((sum, i) => sum + i.confidence, 0) / generatedIdeas.length;
  
  processingSteps.push(`\n═══ GENERATION COMPLETE ═══`);
  processingSteps.push(`Generated ${generatedIdeas.length} ideas in ${(endTime - startTime).toFixed(2)}ms`);
  processingSteps.push(`Average confidence: ${(averageConfidence * 100).toFixed(1)}%`);
  
  return {
    ideas: generatedIdeas,
    theme,
    category: matchResult.category,
    categoryConfidence: matchResult.categoryConfidence,
    processingSteps,
    metrics: {
      totalCandidates: allIdeas.length,
      averageConfidence,
      processingTimeMs: endTime - startTime,
    },
  };
}

function generateUniquenessStatement(idea: IdeaEntry, overlap: string[], theme: string): string {
  const uniqueAspects = [
    `Uses ${idea.techStack[0] || 'modern web technologies'} for a seamless user experience`,
    `Addresses a real-world problem with practical, implementable solutions`,
    `Combines ${idea.keywords.slice(0, 2).join(' and ')} in an innovative way`,
  ];
  
  if (overlap.length > 2) {
    uniqueAspects.push(`Directly addresses key aspects: ${overlap.slice(0, 3).join(', ')}`);
  }
  
  return uniqueAspects[Math.floor(Math.random() * uniqueAspects.length)];
}

/**
 * Get preprocessing explanation for a text
 */
export function getPreprocessingExplanation(text: string) {
  return explainPreprocessing(text);
}

/**
 * Classify a theme into categories
 */
export function classifyThemeWithExplanation(theme: string) {
  ensureInitialized();
  return classifyTheme(theme, vectorizer, centroids);
}

/**
 * Calculate similarity between two texts
 */
export function calculateSimilarity(textA: string, textB: string) {
  ensureInitialized();
  const vecA = vectorizer.transform(textA);
  const vecB = vectorizer.transform(textB);
  
  const result = combinedSimilarity(vecA, vecB, textA, textB);
  const details = explainSimilarity(textA, textB, result.score);
  
  return {
    ...result,
    ...details,
  };
}

/**
 * Get TF-IDF explanation for a term
 */
export function explainTermImportance(document: string, term: string) {
  ensureInitialized();
  return vectorizer.explainTFIDF(document, term);
}

/**
 * Get engine state for display
 */
export function getEngineState(): NLPEngineState {
  if (!engineInitialized) {
    return {
      initialized: false,
      vocabularySize: 0,
      documentCount: 0,
      categoryCount: 0,
      ideaCount: 0,
    };
  }
  
  return {
    initialized: true,
    vocabularySize: vectorizer.getVocabularySize(),
    documentCount: vectorizer.getDocumentCount(),
    categoryCount: centroids.length,
    ideaCount: allIdeas.length,
  };
}

/**
 * Get all categories for display
 */
export function getCategories(): string[] {
  return hackathonDataset.map(cat => cat.category);
}

/**
 * Get ideas for a specific category
 */
export function getIdeasByCategory(category: string): IdeaEntry[] {
  return allIdeas.filter(idea => idea.category === category);
}
