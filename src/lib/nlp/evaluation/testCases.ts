/**
 * EVALUATION LAYER: Test Cases & Metrics
 * 
 * Provides evaluation framework for the NLP system.
 * 
 * Metrics:
 * 1. Classification Accuracy: % of themes correctly categorized
 * 2. Precision@K: Proportion of top-K results that are relevant
 * 3. Recall: Proportion of relevant items that were retrieved
 * 4. Mean Reciprocal Rank (MRR): How high the first relevant result appears
 * 
 * Test cases include expected outputs for validation.
 */

import { classifyThemeWithExplanation, generateIdeasWithNLP } from '../inference/nlpEngine';

export interface TestCase {
  id: string;
  input: string;
  expectedCategory: string;
  expectedKeywords: string[];
  description: string;
}

export interface EvaluationResult {
  testCase: TestCase;
  actualCategory: string;
  categoryCorrect: boolean;
  confidence: number;
  keywordRecall: number;
  matchedKeywords: string[];
  details: string;
}

export interface EvaluationSummary {
  totalTests: number;
  categoryAccuracy: number;
  averageConfidence: number;
  averageKeywordRecall: number;
  passedTests: number;
  failedTests: number;
  results: EvaluationResult[];
}

// Curated test cases with expected outputs
export const testCases: TestCase[] = [
  {
    id: 'test-1',
    input: 'Build an app to help patients track their medications and symptoms',
    expectedCategory: 'healthcare',
    expectedKeywords: ['health', 'patient', 'medication', 'symptoms', 'tracking'],
    description: 'Healthcare medication tracking app',
  },
  {
    id: 'test-2',
    input: 'Create a platform for students to find study buddies and collaborate',
    expectedCategory: 'education',
    expectedKeywords: ['student', 'study', 'learning', 'collaboration'],
    description: 'Education peer learning platform',
  },
  {
    id: 'test-3',
    input: 'Develop a carbon footprint calculator for daily activities',
    expectedCategory: 'environment',
    expectedKeywords: ['carbon', 'environment', 'sustainability', 'tracking'],
    description: 'Environmental carbon tracker',
  },
  {
    id: 'test-4',
    input: 'Build a smart budgeting app that categorizes expenses automatically',
    expectedCategory: 'finance',
    expectedKeywords: ['budget', 'finance', 'expense', 'money'],
    description: 'Finance budgeting application',
  },
  {
    id: 'test-5',
    input: 'Create a focus timer with productivity analytics',
    expectedCategory: 'productivity',
    expectedKeywords: ['productivity', 'focus', 'time', 'work'],
    description: 'Productivity focus tool',
  },
  {
    id: 'test-6',
    input: 'Platform to connect volunteers with local charities',
    expectedCategory: 'social',
    expectedKeywords: ['volunteer', 'community', 'help', 'charity'],
    description: 'Social volunteer matching',
  },
  {
    id: 'test-7',
    input: 'App to help wheelchair users find accessible venues',
    expectedCategory: 'accessibility',
    expectedKeywords: ['accessibility', 'wheelchair', 'mobility', 'accessible'],
    description: 'Accessibility venue finder',
  },
  {
    id: 'test-8',
    input: 'Recipe recommender based on available ingredients',
    expectedCategory: 'food',
    expectedKeywords: ['recipe', 'food', 'ingredients', 'cooking'],
    description: 'Food recipe matcher',
  },
  {
    id: 'test-9',
    input: 'Mental wellness app with mood tracking and meditation',
    expectedCategory: 'healthcare',
    expectedKeywords: ['mental health', 'wellness', 'mood', 'health'],
    description: 'Healthcare mental wellness',
  },
  {
    id: 'test-10',
    input: 'Smart task prioritizer with deadline management',
    expectedCategory: 'productivity',
    expectedKeywords: ['task', 'priority', 'deadline', 'management'],
    description: 'Productivity task manager',
  },
];

/**
 * Run a single test case
 */
export function runTestCase(testCase: TestCase): EvaluationResult {
  const classification = classifyThemeWithExplanation(testCase.input);
  
  // Check category match
  const categoryCorrect = classification.category === testCase.expectedCategory;
  
  // Calculate keyword recall
  const matchedExpected = testCase.expectedKeywords.filter(kw => 
    classification.matchedKeywords.some(mk => 
      mk.toLowerCase().includes(kw.toLowerCase()) ||
      kw.toLowerCase().includes(mk.toLowerCase())
    )
  );
  const keywordRecall = matchedExpected.length / testCase.expectedKeywords.length;
  
  // Generate detailed explanation
  const details = `
Test: ${testCase.description}
Input: "${testCase.input.slice(0, 50)}..."
Expected Category: ${testCase.expectedCategory}
Actual Category: ${classification.category}
Result: ${categoryCorrect ? '✅ PASS' : '❌ FAIL'}
Confidence: ${(classification.confidence * 100).toFixed(1)}%
Keyword Recall: ${(keywordRecall * 100).toFixed(1)}%
Expected Keywords: [${testCase.expectedKeywords.join(', ')}]
Matched Keywords: [${classification.matchedKeywords.join(', ')}]
  `.trim();
  
  return {
    testCase,
    actualCategory: classification.category,
    categoryCorrect,
    confidence: classification.confidence,
    keywordRecall,
    matchedKeywords: classification.matchedKeywords,
    details,
  };
}

/**
 * Run all test cases and generate summary
 */
export function runAllTests(): EvaluationSummary {
  const results = testCases.map(runTestCase);
  
  const passedTests = results.filter(r => r.categoryCorrect).length;
  const categoryAccuracy = passedTests / results.length;
  const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  const averageKeywordRecall = results.reduce((sum, r) => sum + r.keywordRecall, 0) / results.length;
  
  return {
    totalTests: results.length,
    categoryAccuracy,
    averageConfidence,
    averageKeywordRecall,
    passedTests,
    failedTests: results.length - passedTests,
    results,
  };
}

/**
 * Generate evaluation report
 */
export function generateEvaluationReport(summary: EvaluationSummary): string {
  let report = `
╔══════════════════════════════════════════════════════════════╗
║              NLP SYSTEM EVALUATION REPORT                    ║
╚══════════════════════════════════════════════════════════════╝

SUMMARY METRICS
───────────────────────────────────────────────────────────────
Total Test Cases:        ${summary.totalTests}
Passed:                  ${summary.passedTests} ✅
Failed:                  ${summary.failedTests} ❌

Classification Accuracy: ${(summary.categoryAccuracy * 100).toFixed(1)}%
Average Confidence:      ${(summary.averageConfidence * 100).toFixed(1)}%
Average Keyword Recall:  ${(summary.averageKeywordRecall * 100).toFixed(1)}%

DETAILED RESULTS
───────────────────────────────────────────────────────────────
`;

  for (const result of summary.results) {
    report += `
${result.categoryCorrect ? '✅' : '❌'} ${result.testCase.id}: ${result.testCase.description}
   Expected: ${result.testCase.expectedCategory} → Got: ${result.actualCategory}
   Confidence: ${(result.confidence * 100).toFixed(1)}% | Keyword Recall: ${(result.keywordRecall * 100).toFixed(1)}%
`;
  }

  report += `
INTERPRETATION
───────────────────────────────────────────────────────────────
${summary.categoryAccuracy >= 0.8 ? '✅ Excellent classification accuracy (≥80%)' : 
  summary.categoryAccuracy >= 0.6 ? '⚠️ Good classification accuracy (60-80%)' :
  '❌ Classification needs improvement (<60%)'}
${summary.averageConfidence >= 0.7 ? '✅ High confidence scores indicate reliable predictions' :
  '⚠️ Moderate confidence - consider expanding training data'}
${summary.averageKeywordRecall >= 0.5 ? '✅ Good keyword coverage' :
  '⚠️ Low keyword recall - domain vocabulary may need expansion'}
`;

  return report;
}
