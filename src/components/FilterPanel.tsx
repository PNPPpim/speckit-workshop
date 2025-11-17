import React, { useState } from 'react';
import styles from './FilterPanel.module.css';

interface FilterPanelProps {
  onFilterChange: (filters: FilterState) => void;
  totalResults?: number;
}

export interface FilterState {
  dateFrom?: string;
  dateTo?: string;
  minPhotos?: number;
  maxPhotos?: number;
  status?: 'active' | 'archived' | 'all';
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  onFilterChange,
  totalResults = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
  });

  // Get current date for max value in date inputs
  const today = new Date().toISOString().split('T')[0];

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  // Reset filters
  const handleResetFilters = () => {
    const resetFilters: FilterState = { status: 'all' };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.dateFrom ||
    filters.dateTo ||
    filters.minPhotos ||
    filters.maxPhotos ||
    (filters.status && filters.status !== 'all');

  return (
    <div className={styles.filterContainer}>
      <button
        className={styles.filterButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle filters"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        <span>Filters</span>
        {hasActiveFilters && <span className={styles.badge} />}
      </button>

      {isOpen && (
        <div className={styles.filterPanel}>
          <div className={styles.panelHeader}>
            <h3>Filter Albums</h3>
            {hasActiveFilters && (
              <button
                className={styles.resetButton}
                onClick={handleResetFilters}
              >
                Reset
              </button>
            )}
          </div>

          {/* Date Range Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>Date Range</label>
            <div className={styles.dateInputs}>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) =>
                  handleFilterChange('dateFrom', e.target.value || undefined)
                }
                max={filters.dateTo || today}
                className={styles.input}
                aria-label="Date from"
              />
              <span className={styles.separator}>to</span>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) =>
                  handleFilterChange('dateTo', e.target.value || undefined)
                }
                min={filters.dateFrom || undefined}
                max={today}
                className={styles.input}
                aria-label="Date to"
              />
            </div>
          </div>

          {/* Photo Count Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>Number of Photos</label>
            <div className={styles.countInputs}>
              <input
                type="number"
                min="0"
                value={filters.minPhotos || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'minPhotos',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                placeholder="Min"
                className={styles.input}
                aria-label="Minimum photos"
              />
              <span className={styles.separator}>-</span>
              <input
                type="number"
                min="0"
                value={filters.maxPhotos || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'maxPhotos',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                placeholder="Max"
                className={styles.input}
                aria-label="Maximum photos"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.label}>Status</label>
            <select
              value={filters.status || 'all'}
              onChange={(e) =>
                handleFilterChange(
                  'status',
                  (e.target.value as 'active' | 'archived' | 'all') || 'all'
                )
              }
              className={styles.select}
              aria-label="Album status"
            >
              <option value="all">All Albums</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Results */}
          <div className={styles.results}>
            <p>{totalResults} albums match your filters</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
