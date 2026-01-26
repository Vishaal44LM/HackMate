/**
 * MODEL LAYER: Idea Matcher
 * 
 * Matches user themes to relevant hackathon ideas using similarity-based retrieval.
 * 
 * Algorithm:
 * 1. Classify the theme to identify primary category
 * 2. Calculate similarity between theme and all ideas in dataset
 * 3. Rank ideas by combined score (category match + semantic similarity)
 * 4. Return top-k ideas with explanations
 * 
 * This implements a simple but effective information retrieval system.
 */

import { TFIDFVectorizer, TFIDFVector } from './tfidfVectorizer';
import { cosineSimilarity, combinedSimilarity, explainSimilarity } from './similarityEngine';
import { classifyTheme, CategoryCentroid } from './classifier';
import { hackathonDataset, IdeaEntry, allIdeas } from '../data/hackathonDataset';
import { preprocess } from '../preprocessing/textPreprocessor';

export interface MatchedIdea {
  idea: IdeaEntry;
  score: number;
  confidence: number;
  matchReasons: string[];
  keywordOverlap: string[];
}

export interface IdeaMatchResult {
  theme: string;
  category: string;
  categoryConfidence: number;
  matchedIdeas: MatchedIdea[];
  explanation: string;
  processingSteps: string[];
}

/**
 * Match a theme to relevant ideas from the dataset
 */
export function matchIdeasToTheme(
  theme: string,
  vectorizer: TFIDFVectorizer,
  centroids: CategoryCentroid[],
  topK: number = 5
): IdeaMatchResult {
  const processingSteps: string[] = [];
  
  // Step 1: Classify the theme
  processingSteps.push('Step 1: Classifying theme into categories...');
  const classification = classifyTheme(theme, vectorizer, centroids);
  processingSteps.push(`  → Detected category: ${classification.category} (${(classification.confidence * 100).toFixed(1)}% confidence)`);
  
  // Step 2: Vectorize the theme
  processingSteps.push('Step 2: Converting theme to TF-IDF vector...');
  const themeVector = vectorizer.transform(theme);
  const themeTokens = new Set(preprocess(theme));
  processingSteps.push(`  → Extracted ${themeVector.terms.size} unique terms`);
  
  // Step 3: Calculate similarity to all ideas
  processingSteps.push('Step 3: Calculating similarity to all ideas in dataset...');
  const scoredIdeas: MatchedIdea[] = [];
  
  for (const idea of allIdeas) {
    // Create idea text representation
    const ideaText = `${idea.title} ${idea.problem} ${idea.solution} ${idea.keywords.join(' ')}`;
    const ideaVector = vectorizer.transform(ideaText);
    
    // Calculate similarity
    const similarity = combinedSimilarity(themeVector, ideaVector, theme, ideaText);
    
    // Category boost if idea matches detected category
    const categoryBoost = idea.category === classification.category ? 0.2 : 0;
    const adjustedScore = Math.min(similarity.score + categoryBoost, 1);
    
    // Find overlapping keywords
    const ideaTokens = new Set(preprocess(ideaText));
    const keywordOverlap = [...themeTokens].filter(t => ideaTokens.has(t));
    
    // Generate match reasons
    const matchReasons: string[] = [];
    if (idea.category === classification.category) {
      matchReasons.push(`Same category: ${idea.category}`);
    }
    if (keywordOverlap.length > 0) {
      matchReasons.push(`Shared keywords: ${keywordOverlap.slice(0, 3).join(', ')}`);
    }
    if (similarity.score > 0.5) {
      matchReasons.push('High semantic similarity');
    }
    
    scoredIdeas.push({
      idea,
      score: adjustedScore,
      confidence: similarity.confidence,
      matchReasons,
      keywordOverlap,
    });
  }
  
  // Step 4: Sort and select top-k
  scoredIdeas.sort((a, b) => b.score - a.score);
  const topIdeas = scoredIdeas.slice(0, topK);
  processingSteps.push(`Step 4: Selected top ${topK} matching ideas`);
  
  // Generate explanation
  const explanation = generateMatchExplanation(theme, classification, topIdeas);
  
  return {
    theme,
    category: classification.category,
    categoryConfidence: classification.confidence,
    matchedIdeas: topIdeas,
    explanation,
    processingSteps,
  };
}

function generateMatchExplanation(
  theme: string,
  classification: { category: string; confidence: number; matchedKeywords: string[] },
  topIdeas: MatchedIdea[]
): string {
  let explanation = `
Theme Analysis: "${theme.slice(0, 50)}${theme.length > 50 ? '...' : ''}"
══════════════════════════════════════════════════════════

Category Detection:
• Primary category: ${classification.category.toUpperCase()}
• Confidence: ${(classification.confidence * 100).toFixed(1)}%
• Matched keywords: ${classification.matchedKeywords.length > 0 ? classification.matchedKeywords.join(', ') : 'Based on semantic analysis'}

Idea Matching Process:
1. Converted your theme to a numerical vector using TF-IDF
2. Calculated similarity to ${allIdeas.length} ideas in our curated dataset
3. Applied category boost (+20%) to ideas matching detected category
4. Ranked by combined similarity score

Top Matches:
`;
  
  for (let i = 0; i < Math.min(topIdeas.length, 3); i++) {
    const match = topIdeas[i];
    explanation += `
${i + 1}. ${match.idea.title} (${(match.score * 100).toFixed(1)}% match)
   Category: ${match.idea.category} | Difficulty: ${match.idea.difficulty}
   Why matched: ${match.matchReasons.join('; ') || 'General semantic similarity'}
`;
  }
  
  return explanation.trim();
}

/**
 * Generate ideas based on matched templates
 */
export function generateIdeasFromMatches(
  matchResult: IdeaMatchResult,
  customization: string = ''
): Array<{
  title: string;
  problem: string;
  solution: string;
  techStack: string[];
  difficulty: string;
  confidence: number;
  basedOn: string;
}> {
  return matchResult.matchedIdeas.map(match => {
    // Customize the idea based on the original theme
    const themeWords = preprocess(matchResult.theme);
    
    return {
      title: match.idea.title,
      problem: match.idea.problem,
      solution: match.idea.solution,
      techStack: match.idea.techStack,
      difficulty: match.idea.difficulty,
      confidence: match.score,
      basedOn: `Adapted from "${match.idea.title}" template (${(match.score * 100).toFixed(1)}% match)`,
    };
  });
}
