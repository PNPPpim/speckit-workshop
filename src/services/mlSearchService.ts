/**
 * ML Search Service - TF-IDF Ranking & CTR-based Relevance
 * 
 * Implements machine learning-based search ranking using:
 * - TF-IDF (Term Frequency-Inverse Document Frequency) vectorization
 * - Cosine similarity calculation
 * - Click-through rate (CTR) weighted scoring
 * - Vector caching for performance optimization
 */

interface VectorData {
  terms: Map<string, number>;
  magnitude: number;
}

interface Interaction {
  id: string;
  clicked: boolean;
  timestamp: number;
}

interface MLSearchResult {
  id: string;
  title: string;
  description: string;
  relevanceScore: number;
  ctrWeight: number;
}

class MLSearchService {
  private vectorCache: Map<string, VectorData> = new Map();
  private interactions: Interaction[] = [];
  private idfCache: Map<string, number> = new Map();
  private documentFrequency: Map<string, number> = new Map();
  private totalDocuments: number = 0;

  /**
   * Index documents for search
   */
  indexDocuments(documents: Array<{ id: string; content: string }>): void {
    this.totalDocuments = documents.length;
    this.documentFrequency.clear();
    this.idfCache.clear();

    // Calculate document frequency
    documents.forEach((doc) => {
      const terms = this.tokenize(doc.content);
      const uniqueTerms = new Set(terms);
      
      uniqueTerms.forEach((term) => {
        const count = this.documentFrequency.get(term) || 0;
        this.documentFrequency.set(term, count + 1);
      });
    });

    // Pre-calculate IDF values
    this.documentFrequency.forEach((frequency, term) => {
      const idf = Math.log(this.totalDocuments / frequency);
      this.idfCache.set(term, idf);
    });
  }

  /**
   * Tokenize text into terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((term) => term.length > 0);
  }

  /**
   * Calculate TF-IDF vector for a piece of text
   */
  private calculateTFIDFVector(text: string): VectorData {
    const terms = this.tokenize(text);
    const termFrequency = new Map<string, number>();

    // Calculate term frequency
    terms.forEach((term) => {
      const count = termFrequency.get(term) || 0;
      termFrequency.set(term, count + 1);
    });

    // Calculate TF-IDF scores
    const vector = new Map<string, number>();
    let magnitude = 0;

    termFrequency.forEach((frequency, term) => {
      const tf = frequency / terms.length;
      const idf = this.idfCache.get(term) || Math.log(this.totalDocuments + 1);
      const tfidf = tf * idf;

      vector.set(term, tfidf);
      magnitude += tfidf * tfidf;
    });

    magnitude = Math.sqrt(magnitude);

    return { terms: vector, magnitude };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vector1: VectorData, vector2: VectorData): number {
    if (vector1.magnitude === 0 || vector2.magnitude === 0) {
      return 0;
    }

    let dotProduct = 0;

    vector1.terms.forEach((score1, term) => {
      const score2 = vector2.terms.get(term) || 0;
      dotProduct += score1 * score2;
    });

    return dotProduct / (vector1.magnitude * vector2.magnitude);
  }

  /**
   * Get vector for document (cached or calculated)
   */
  private getVector(id: string, content: string): VectorData {
    if (!this.vectorCache.has(id)) {
      this.vectorCache.set(id, this.calculateTFIDFVector(content));
    }
    return this.vectorCache.get(id)!;
  }

  /**
   * Calculate CTR weight for a document
   */
  private calculateCTRWeight(docId: string): number {
    const docInteractions = this.interactions.filter((i) => i.id === docId);
    if (docInteractions.length === 0) {
      return 1.0;
    }

    const clicks = docInteractions.filter((i) => i.clicked).length;
    const ctr = clicks / docInteractions.length;

    // Apply CTR weight with exponential scaling
    return 1.0 + Math.log(1 + ctr * 10);
  }

  /**
   * Search documents with ML ranking
   */
  search(
    query: string,
    documents: Array<{ id: string; title: string; description: string }>,
  ): MLSearchResult[] {
    const queryVector = this.calculateTFIDFVector(query);

    const results = documents
      .map((doc) => {
        const contentVector = this.getVector(doc.id, doc.description);
        const similarityScore = this.cosineSimilarity(queryVector, contentVector);
        const ctrWeight = this.calculateCTRWeight(doc.id);

        // Combine TF-IDF similarity (70%) with CTR weight (30%)
        const relevanceScore = similarityScore * 0.7 + (ctrWeight - 1.0) * 0.3;

        return {
          id: doc.id,
          title: doc.title,
          description: doc.description,
          relevanceScore: Math.max(0, relevanceScore),
          ctrWeight,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .filter((result) => result.relevanceScore > 0);

    return results;
  }

  /**
   * Record user interaction with search result
   */
  recordInteraction(docId: string, clicked: boolean): void {
    this.interactions.push({
      id: docId,
      clicked,
      timestamp: Date.now(),
    });

    // Keep only recent interactions (last 1000)
    if (this.interactions.length > 1000) {
      this.interactions = this.interactions.slice(-1000);
    }

    // Invalidate vector cache to account for CTR changes
    this.vectorCache.clear();
  }

  /**
   * Get search metrics for analytics
   */
  getMetrics(): {
    totalInteractions: number;
    uniqueDocuments: number;
    averageCTR: number;
    cachedVectors: number;
  } {
    const clicks = this.interactions.filter((i) => i.clicked).length;
    const totalInteractions = this.interactions.length;
    const averageCTR = totalInteractions > 0 ? clicks / totalInteractions : 0;

    return {
      totalInteractions,
      uniqueDocuments: new Set(this.interactions.map((i) => i.id)).size,
      averageCTR,
      cachedVectors: this.vectorCache.size,
    };
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.vectorCache.clear();
  }
}

export default new MLSearchService();
