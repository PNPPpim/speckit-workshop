/**
 * Search History Service - Persistence & Management
 * 
 * Manages search history with:
 * - localStorage persistence
 * - Saved searches CRUD operations
 * - CSV export functionality
 * - Auto-suggestion generation
 */

interface SearchEntry {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
  clicked?: boolean;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  createdAt: number;
}

const STORAGE_KEY_HISTORY = 'photo_search_history';
const STORAGE_KEY_SAVED = 'photo_saved_searches';
const MAX_HISTORY_ENTRIES = 50;

class SearchHistoryService {
  private history: SearchEntry[] = [];
  private savedSearches: SavedSearch[] = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load history and saved searches from localStorage
   */
  private loadFromStorage(): void {
    try {
      const historyData = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (historyData) {
        this.history = JSON.parse(historyData);
      }

      const savedData = localStorage.getItem(STORAGE_KEY_SAVED);
      if (savedData) {
        this.savedSearches = JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Failed to load search history from storage:', error);
      this.history = [];
      this.savedSearches = [];
    }
  }

  /**
   * Save history and saved searches to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(this.history));
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(this.savedSearches));
    } catch (error) {
      console.error('Failed to save search history to storage:', error);
    }
  }

  /**
   * Add a search to history
   */
  addToHistory(query: string, resultCount: number): SearchEntry {
    const entry: SearchEntry = {
      id: `search_${Date.now()}_${Math.random()}`,
      query,
      timestamp: Date.now(),
      resultCount,
    };

    this.history.unshift(entry);

    // Keep only recent entries
    if (this.history.length > MAX_HISTORY_ENTRIES) {
      this.history = this.history.slice(0, MAX_HISTORY_ENTRIES);
    }

    this.saveToStorage();
    return entry;
  }

  /**
   * Record click on a search result
   */
  recordResultClick(searchId: string): void {
    const search = this.history.find((h) => h.id === searchId);
    if (search) {
      search.clicked = true;
      this.saveToStorage();
    }
  }

  /**
   * Get search history
   */
  getHistory(limit: number = 20): SearchEntry[] {
    return this.history.slice(0, limit);
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.history = [];
    this.saveToStorage();
  }

  /**
   * Save a search query for future use
   */
  saveSearch(name: string, query: string): SavedSearch {
    const saved: SavedSearch = {
      id: `saved_${Date.now()}_${Math.random()}`,
      name,
      query,
      createdAt: Date.now(),
    };

    this.savedSearches.push(saved);
    this.saveToStorage();
    return saved;
  }

  /**
   * Get all saved searches
   */
  getSavedSearches(): SavedSearch[] {
    return [...this.savedSearches];
  }

  /**
   * Update a saved search
   */
  updateSavedSearch(id: string, name: string, query: string): SavedSearch | null {
    const search = this.savedSearches.find((s) => s.id === id);
    if (!search) {
      return null;
    }

    search.name = name;
    search.query = query;
    this.saveToStorage();
    return search;
  }

  /**
   * Delete a saved search
   */
  deleteSavedSearch(id: string): boolean {
    const index = this.savedSearches.findIndex((s) => s.id === id);
    if (index === -1) {
      return false;
    }

    this.savedSearches.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  /**
   * Generate search suggestions from history
   */
  generateSuggestions(prefix: string, limit: number = 5): string[] {
    const lowerPrefix = prefix.toLowerCase();
    const suggestions = new Map<string, number>();

    this.history.forEach((entry) => {
      if (entry.query.toLowerCase().startsWith(lowerPrefix)) {
        const count = suggestions.get(entry.query) || 0;
        suggestions.set(entry.query, count + 1);
      }
    });

    return Array.from(suggestions.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([query]) => query)
      .slice(0, limit);
  }

  /**
   * Get trending searches
   */
  getTrendingSearches(limit: number = 10): { query: string; count: number }[] {
    const frequency = new Map<string, number>();

    this.history.forEach((entry) => {
      const count = frequency.get(entry.query) || 0;
      frequency.set(entry.query, count + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([query, count]) => ({ query, count }))
      .slice(0, limit);
  }

  /**
   * Export search history as CSV
   */
  exportAsCSV(): string {
    const headers = ['Query', 'Timestamp', 'Result Count', 'Clicked'];
    const rows = this.history.map((entry) => [
      `"${entry.query.replace(/"/g, '""')}"`,
      new Date(entry.timestamp).toISOString(),
      entry.resultCount.toString(),
      (entry.clicked ? 'Yes' : 'No'),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    return csvContent;
  }

  /**
   * Export saved searches as CSV
   */
  exportSavedSearchesAsCSV(): string {
    const headers = ['Name', 'Query', 'Created At'];
    const rows = this.savedSearches.map((search) => [
      `"${search.name.replace(/"/g, '""')}"`,
      `"${search.query.replace(/"/g, '""')}"`,
      new Date(search.createdAt).toISOString(),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    return csvContent;
  }

  /**
   * Download CSV file
   */
  downloadCSV(content: string, filename: string): void {
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute('download', filename);
    element.style.display = 'none';

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  /**
   * Get search statistics
   */
  getStatistics(): {
    totalSearches: number;
    uniqueQueries: number;
    averageResultsPerSearch: number;
    clickThroughRate: number;
    savedSearchesCount: number;
  } {
    const uniqueQueries = new Set(this.history.map((h) => h.query)).size;
    const totalSearches = this.history.length;
    const avgResults =
      totalSearches > 0
        ? this.history.reduce((sum, h) => sum + h.resultCount, 0) / totalSearches
        : 0;

    const clickedCount = this.history.filter((h) => h.clicked).length;
    const ctr = totalSearches > 0 ? clickedCount / totalSearches : 0;

    return {
      totalSearches,
      uniqueQueries,
      averageResultsPerSearch: parseFloat(avgResults.toFixed(2)),
      clickThroughRate: parseFloat((ctr * 100).toFixed(2)),
      savedSearchesCount: this.savedSearches.length,
    };
  }
}

export default new SearchHistoryService();
