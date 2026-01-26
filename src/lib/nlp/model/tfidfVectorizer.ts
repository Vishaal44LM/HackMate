/**
 * MODEL LAYER: TF-IDF Vectorizer
 * 
 * Implements Term Frequency-Inverse Document Frequency (TF-IDF) vectorization.
 * This is a fundamental NLP technique that converts text to numerical vectors.
 * 
 * Mathematical Foundation:
 * 
 * TF (Term Frequency):
 *   tf(t, d) = count(t in d) / total_terms(d)
 *   Measures how frequently a term appears in a document
 * 
 * IDF (Inverse Document Frequency):
 *   idf(t, D) = log(N / (1 + df(t)))
 *   Where N = total documents, df(t) = documents containing term t
 *   Measures how important a term is across all documents
 * 
 * TF-IDF:
 *   tfidf(t, d, D) = tf(t, d) × idf(t, D)
 *   Higher values indicate terms that are important to a specific document
 *   but not common across all documents
 */

import { preprocess } from '../preprocessing/textPreprocessor';

export interface TFIDFVector {
  terms: Map<string, number>;
  magnitude: number;
}

export interface VocabularyStats {
  term: string;
  documentFrequency: number;
  idf: number;
}

export class TFIDFVectorizer {
  private vocabulary: Map<string, number> = new Map(); // term -> index
  private idfValues: Map<string, number> = new Map();  // term -> idf
  private documentCount: number = 0;
  private documentFrequency: Map<string, number> = new Map(); // term -> doc count
  
  /**
   * Fit the vectorizer on a corpus of documents
   * Builds vocabulary and calculates IDF values
   */
  fit(documents: string[]): void {
    this.documentCount = documents.length;
    this.vocabulary.clear();
    this.documentFrequency.clear();
    this.idfValues.clear();
    
    let vocabIndex = 0;
    
    // First pass: Build vocabulary and count document frequencies
    for (const doc of documents) {
      const terms = new Set(preprocess(doc));
      
      for (const term of terms) {
        // Add to vocabulary
        if (!this.vocabulary.has(term)) {
          this.vocabulary.set(term, vocabIndex++);
        }
        
        // Update document frequency
        this.documentFrequency.set(
          term,
          (this.documentFrequency.get(term) || 0) + 1
        );
      }
    }
    
    // Calculate IDF for each term
    // Using smoothed IDF: log((N + 1) / (df + 1)) + 1
    for (const [term, df] of this.documentFrequency) {
      const idf = Math.log((this.documentCount + 1) / (df + 1)) + 1;
      this.idfValues.set(term, idf);
    }
  }
  
  /**
   * Transform a single document into a TF-IDF vector
   */
  transform(document: string): TFIDFVector {
    const terms = preprocess(document);
    const termCounts = new Map<string, number>();
    
    // Count term frequencies
    for (const term of terms) {
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    }
    
    // Calculate TF-IDF values
    const tfidfVector = new Map<string, number>();
    let sumSquares = 0;
    
    for (const [term, count] of termCounts) {
      // Term Frequency (normalized by document length)
      const tf = count / terms.length;
      
      // Get IDF (use default for unseen terms)
      const idf = this.idfValues.get(term) || Math.log(this.documentCount + 1) + 1;
      
      // TF-IDF
      const tfidf = tf * idf;
      tfidfVector.set(term, tfidf);
      sumSquares += tfidf * tfidf;
    }
    
    // Calculate magnitude for normalization
    const magnitude = Math.sqrt(sumSquares);
    
    return {
      terms: tfidfVector,
      magnitude: magnitude || 1, // Avoid division by zero
    };
  }
  
  /**
   * Get vocabulary statistics
   */
  getVocabularyStats(): VocabularyStats[] {
    return Array.from(this.vocabulary.keys()).map(term => ({
      term,
      documentFrequency: this.documentFrequency.get(term) || 0,
      idf: this.idfValues.get(term) || 0,
    }));
  }
  
  /**
   * Get vocabulary size
   */
  getVocabularySize(): number {
    return this.vocabulary.size;
  }
  
  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.documentCount;
  }
  
  /**
   * Get top terms by IDF (most distinctive terms)
   */
  getTopTermsByIDF(n: number = 10): Array<{ term: string; idf: number }> {
    return Array.from(this.idfValues.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([term, idf]) => ({ term, idf }));
  }
  
  /**
   * Explain TF-IDF calculation for a specific term in a document
   */
  explainTFIDF(document: string, term: string): {
    termFrequency: number;
    inverseDocumentFrequency: number;
    tfidf: number;
    explanation: string;
  } {
    const terms = preprocess(document);
    const termCount = terms.filter(t => t === term).length;
    const tf = termCount / terms.length;
    const df = this.documentFrequency.get(term) || 0;
    const idf = this.idfValues.get(term) || Math.log(this.documentCount + 1) + 1;
    const tfidf = tf * idf;
    
    return {
      termFrequency: tf,
      inverseDocumentFrequency: idf,
      tfidf,
      explanation: `
Term: "${term}"
Term Frequency (TF): ${termCount}/${terms.length} = ${tf.toFixed(4)}
Document Frequency: ${df}/${this.documentCount} documents contain this term
Inverse Document Frequency (IDF): log((${this.documentCount}+1)/(${df}+1))+1 = ${idf.toFixed(4)}
TF-IDF Score: ${tf.toFixed(4)} × ${idf.toFixed(4)} = ${tfidf.toFixed(4)}

Interpretation: ${tfidf > 0.1 ? 'High' : tfidf > 0.05 ? 'Medium' : 'Low'} importance term
${df < this.documentCount * 0.1 ? 'This is a distinctive/rare term' : 'This is a common term'}
      `.trim(),
    };
  }
}

// Singleton instance for the hackathon dataset
let globalVectorizer: TFIDFVectorizer | null = null;

export function getGlobalVectorizer(): TFIDFVectorizer {
  if (!globalVectorizer) {
    globalVectorizer = new TFIDFVectorizer();
  }
  return globalVectorizer;
}

export function initializeVectorizer(documents: string[]): TFIDFVectorizer {
  globalVectorizer = new TFIDFVectorizer();
  globalVectorizer.fit(documents);
  return globalVectorizer;
}
