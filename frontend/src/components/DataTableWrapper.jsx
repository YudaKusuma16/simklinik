import React, { useState, useMemo } from 'react';
import { useI18n } from '../i18n';

/**
 * Reusable DataTableWrapper component replicating jQuery DataTables in simrs-backup.
 * Generates identical markup:
 * - .dataTables_wrapper
 * - .dt-top-row (.dataTables_length + customControls + .dataTables_filter)
 * - table.dataTable.datatable.no-auto-num with th.sorting / th.sorting_asc / th.sorting_desc
 * - .dataTables_info ("Menampilkan 1–N dari Total data" / "Showing 1-N of Total entries")
 * - .dataTables_paginate ("Awal", "Sebelumnya", "1", "Berikutnya", "Akhir")
 */
export default function DataTableWrapper({
  columns = [],
  data = [],
  defaultPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  searchable = true,
  searchPlaceholder = null,
  customControls = null,
  sortButtons = null,
  emptyText = null,
  rowKey = 'id',
  tfootRows = null, // Optional array of footer row cell arrays for report totals
}) {
  const { t, isEn } = useI18n();
  const effectiveEmptyText = emptyText || t('datatable.empty');
  const effectiveSearchPlaceholder = searchPlaceholder || t('datatable.search_placeholder');
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase().trim();
    return data.filter((row) => {
      return columns.some((col) => {
        const val = row[col.key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm, columns]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();

      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  // Total pages and slice for pagination
  const totalRecords = sortedData.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const safeCurrentPage = totalPages === 0 ? 1 : Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    if (totalRecords === 0) return [];
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safeCurrentPage, pageSize, totalRecords]);

  const handleSort = (key, sortable) => {
    if (sortable === false) return;
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const startRecord = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, totalRecords);

  // Generate pagination buttons: 1, 2, 3... (empty when 0 records)
  const getPaginationPages = () => {
    if (totalRecords === 0) return [];
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, safeCurrentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      pages.push(p);
    }
    return pages;
  };

  return (
    <div className="dataTables_wrapper">
      {/* Top Controls Row */}
      <div className="dt-top-row">
        <div className="dataTables_length">
          <label>
            {t('datatable.show')}{' '}
            <select
              className="dt-custom-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>{' '}
            {t('datatable.length')}
          </label>
        </div>

        {sortButtons && sortButtons.length > 0 && (
          <div className="dt-custom-sort">
            <span className="dt-sort-label">{t('datatable.sort')}</span>
            <div className="dt-sort-btn-group">
              {sortButtons.map((b) => {
                const isSorted = sortConfig.key === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    className={`dt-sort-btn ${isSorted ? 'active' : ''}`}
                    onClick={() => handleSort(b.key, true)}
                  >
                    <span>{b.label}</span>
                    <span className="sort-icon">
                      {isSorted ? (
                        sortConfig.direction === 'asc' ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: 'block' }}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: 'block' }}><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                        )
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, display: 'block' }}><path d="M7 4v16M7 4l-4 4M7 4l4 4M17 20V4M17 20l4-4M17 20l-4-4" /></svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {customControls && (
          React.isValidElement(customControls) && (customControls.props?.className?.includes('dt-custom-sort') || customControls.type === 'div')
            ? customControls
            : <div className="dt-custom-dropdown">{customControls}</div>
        )}

        {searchable && (
          <div className="dataTables_filter">
            <label>
              {t('datatable.search')}
              <input
                type="search"
                placeholder={effectiveSearchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </label>
          </div>
        )}
      </div>

      {/* Main Table */}
      <table className="dataTable datatable dt-noscroll no-auto-num" style={{ width: '100%' }}>
        <thead>
          <tr>
            {columns.map((col, idx) => {
              const isSorted = sortConfig.key === col.key;
              const isSortable = col.sortable !== false;
              let sortClass = 'no-sort';
              if (isSortable) {
                sortClass = isSorted
                  ? sortConfig.direction === 'asc'
                    ? 'sorting_asc'
                    : 'sorting_desc'
                  : 'sorting';
              }
              return (
                <th
                  key={col.key || idx}
                  className={`${sortClass} ${col.thClassName || ''}`}
                  style={{
                    cursor: isSortable ? 'pointer' : 'default',
                    ...(col.style || {}),
                  }}
                  onClick={() => isSortable && handleSort(col.key, col.sortable)}
                >
                  {col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {paginatedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="dataTables_empty"
                style={{ textAlign: 'center', padding: '16px', color: 'var(--muted)' }}
              >
                {searchTerm ? t('datatable.no_matching') : effectiveEmptyText}
              </td>
            </tr>
          ) : (
            paginatedData.map((row, rowIdx) => (
              <tr key={row[rowKey] || rowIdx}>
                {columns.map((col, cIdx) => (
                  <td key={col.key || cIdx} className={col.className || ''} style={col.tdStyle || {}}>
                    {col.render
                      ? col.render(row, (safeCurrentPage - 1) * pageSize + rowIdx + 1)
                      : (row[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {tfootRows && tfootRows.length > 0 && (
          <tfoot>
            {tfootRows.map((rowCells, rowIdx) => (
              <tr key={rowIdx} className="report-total-row">
                {rowCells.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    style={cell.style || {}}
                    colSpan={cell.colSpan}
                  >
                    {cell.content}
                  </td>
                ))}
              </tr>
            ))}
          </tfoot>
        )}
      </table>

      {/* Bottom Info and Pagination */}
      <div className="dataTables_info">
        {totalRecords === 0
          ? effectiveEmptyText
          : isEn
            ? `Showing ${startRecord} to ${endRecord} of ${totalRecords} entries${searchTerm ? ` (filtered from ${data.length} total entries)` : ''
            }`
            : `Menampilkan ${startRecord}–${endRecord} dari ${totalRecords} data${searchTerm ? ` (disaring dari ${data.length} total data)` : ''
            }`}
      </div>

      <div className="dataTables_paginate">
        <button
          type="button"
          className={`paginate_button first ${safeCurrentPage <= 1 || totalRecords === 0 ? 'disabled' : ''}`}
          onClick={() => safeCurrentPage > 1 && setCurrentPage(1)}
          disabled={safeCurrentPage <= 1 || totalRecords === 0}
        >
          {t('datatable.first')}
        </button>
        <button
          type="button"
          className={`paginate_button previous ${safeCurrentPage <= 1 || totalRecords === 0 ? 'disabled' : ''}`}
          onClick={() => safeCurrentPage > 1 && setCurrentPage(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1 || totalRecords === 0}
        >
          {t('datatable.previous')}
        </button>
        <span>
          {getPaginationPages().map((p) => (
            <button
              key={p}
              type="button"
              className={`paginate_button ${p === safeCurrentPage ? 'current' : ''}`}
              onClick={() => setCurrentPage(p)}
            >
              {p}
            </button>
          ))}
        </span>
        <button
          type="button"
          className={`paginate_button next ${safeCurrentPage >= totalPages || totalRecords === 0 ? 'disabled' : ''}`}
          onClick={() => safeCurrentPage < totalPages && setCurrentPage(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages || totalRecords === 0}
        >
          {t('datatable.next')}
        </button>
        <button
          type="button"
          className={`paginate_button last ${safeCurrentPage >= totalPages || totalRecords === 0 ? 'disabled' : ''}`}
          onClick={() => safeCurrentPage < totalPages && setCurrentPage(totalPages)}
          disabled={safeCurrentPage >= totalPages || totalRecords === 0}
        >
          {t('datatable.last')}
        </button>
      </div>
    </div>
  );
}
