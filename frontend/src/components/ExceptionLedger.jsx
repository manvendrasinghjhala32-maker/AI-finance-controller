import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileQuestion, 
  Check, 
  Download,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export function ExceptionLedger({ 
  records = [], 
  selectedTxId, 
  onSelectTransaction, 
  activeFilter = 'EXCEPTIONS',
  setActiveFilter,
  onExport 
}) {
  const [localFilter, setLocalFilter] = useState('EXCEPTIONS');
  const currentFilter = setActiveFilter ? activeFilter : localFilter;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('transaction_id');
  const [sortAsc, setSortAsc] = useState(true);

  const handleFilterChange = (newFilter) => {
    if (setActiveFilter) {
      setActiveFilter(newFilter);
    } else {
      setLocalFilter(newFilter);
    }

    if (records && records.length > 0 && onSelectTransaction) {
      const matching = records.filter(item => {
        if (newFilter === 'EXCEPTIONS') return !['MATCH', 'DUPLICATE'].includes(item.status);
        if (newFilter === 'AMOUNT') return item.status === 'AMOUNT_MISMATCH';
        if (newFilter === 'DATE') return item.status === 'DATE_MISMATCH';
        if (newFilter === 'MISSING') return item.status === 'MISSING_INVOICE';
        if (newFilter === 'MULTIPLE') return item.status === 'MULTIPLE_MATCHES';
        if (newFilter === 'DUPLICATE') return item.status === 'DUPLICATE';
        return true;
      });
      if (matching.length > 0) {
        const currInMatching = matching.find(r => r.transaction_id === selectedTxId);
        if (!currInMatching) {
          onSelectTransaction(matching[0]);
        }
      }
    }
  };

  // Filter Counts
  const filterCounts = useMemo(() => {
    if (!records) return { EXCEPTIONS: 0, ALL: 0, AMOUNT: 0, DATE: 0, MISSING: 0, MULTIPLE: 0, DUPLICATE: 0 };
    return {
      EXCEPTIONS: records.filter(r => !['MATCH', 'DUPLICATE'].includes(r.status)).length,
      ALL: records.length,
      AMOUNT: records.filter(r => r.status === 'AMOUNT_MISMATCH').length,
      DATE: records.filter(r => r.status === 'DATE_MISMATCH').length,
      MISSING: records.filter(r => r.status === 'MISSING_INVOICE').length,
      MULTIPLE: records.filter(r => r.status === 'MULTIPLE_MATCHES').length,
      DUPLICATE: records.filter(r => r.status === 'DUPLICATE').length,
    };
  }, [records]);

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    if (!records) return [];

    let list = records.filter(item => {
      // Tab Category
      if (currentFilter === 'EXCEPTIONS' && ['MATCH', 'DUPLICATE'].includes(item.status)) return false;
      if (currentFilter === 'AMOUNT' && item.status !== 'AMOUNT_MISMATCH') return false;
      if (currentFilter === 'DATE' && item.status !== 'DATE_MISMATCH') return false;
      if (currentFilter === 'MISSING' && item.status !== 'MISSING_INVOICE') return false;
      if (currentFilter === 'MULTIPLE' && item.status !== 'MULTIPLE_MATCHES') return false;
      if (currentFilter === 'DUPLICATE' && item.status !== 'DUPLICATE') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const txId = (item.transaction_id || '').toLowerCase();
        const vendor = (item.vendor || '').toLowerCase();
        const ref = (item.reference || '').toLowerCase();
        if (!txId.includes(q) && !vendor.includes(q) && !ref.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    return list;
  }, [records, currentFilter, searchQuery, sortField, sortAsc]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getConfidenceBadge = (score) => {
    if (score >= 85) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          {score}% High
        </span>
      );
    } else if (score >= 50) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200">
          {score}% Med
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-50 text-rose-700 border border-rose-200">
          {score}% Low
        </span>
      );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> RECONCILED
          </span>
        );
      case 'AMOUNT_MISMATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" /> PRICE VARIANCE
          </span>
        );
      case 'DATE_MISMATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> TIMING DRIFT
          </span>
        );
      case 'MISSING_INVOICE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <FileQuestion className="w-3 h-3 text-slate-500" /> UNBILLED
          </span>
        );
      case 'MULTIPLE_MATCHES':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <AlertTriangle className="w-3 h-3 text-purple-600" /> MULTI-MATCH
          </span>
        );
      case 'DUPLICATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <AlertTriangle className="w-3 h-3 text-gray-500" /> DUPLICATE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-gray-600 bg-gray-50 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl flex flex-col h-full overflow-hidden shadow-sm font-sans">
      {/* 1. Header Toolbar */}
      <div className="p-4 border-b border-[#E5E7EB] bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#1A1F36] tracking-tight font-sans">
                Differences & Exceptions Ledger
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                {filterCounts.EXCEPTIONS} Unresolved
              </span>
            </div>
            <p className="text-xs text-[#6B7280] font-sans mt-0.5">
              Forensic audit of amounts, settlement timing offsets, and unmatched disbursements
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter ID, vendor, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#F9FAFB] dark:bg-[#0E131E] border border-[#D1D5DB] dark:border-[#1E2638] rounded-lg text-[#1A1F36] dark:text-white placeholder-[#9CA3AF] focus:bg-white dark:focus:bg-[#141A27] focus:outline-none focus:border-[#528FF0] font-sans transition-all"
              />
            </div>

            {onExport && (
              <button
                onClick={() => onExport('exceptions')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#374151] bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-all shadow-xs shrink-0"
                title="Download Variance CSV"
              >
                <Download className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-0.5 text-xs">
          <button
            onClick={() => handleFilterChange('EXCEPTIONS')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentFilter === 'EXCEPTIONS'
                ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-blue-200 font-semibold shadow-xs'
                : 'bg-white text-[#4B5563] border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Active Variances ({filterCounts.EXCEPTIONS})
          </button>

          <button
            onClick={() => handleFilterChange('AMOUNT')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentFilter === 'AMOUNT'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold shadow-xs'
                : 'bg-white text-[#4B5563] border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Price Deltas ({filterCounts.AMOUNT})
          </button>

          <button
            onClick={() => handleFilterChange('DATE')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentFilter === 'DATE'
                ? 'bg-amber-50 text-amber-700 border border-amber-200 font-semibold shadow-xs'
                : 'bg-white text-[#4B5563] border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Timing Drift ({filterCounts.DATE})
          </button>

          <button
            onClick={() => handleFilterChange('MISSING')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentFilter === 'MISSING'
                ? 'bg-slate-100 text-slate-800 border border-slate-200 font-semibold shadow-xs'
                : 'bg-white text-[#4B5563] border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Unbilled Items ({filterCounts.MISSING})
          </button>

          {filterCounts.MULTIPLE > 0 && (
            <button
              onClick={() => handleFilterChange('MULTIPLE')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                currentFilter === 'MULTIPLE'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold shadow-xs'
                  : 'bg-white text-[#4B5563] border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Multi-Match ({filterCounts.MULTIPLE})
            </button>
          )}

          <button
            onClick={() => handleFilterChange('DUPLICATE')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentFilter === 'DUPLICATE'
                ? 'bg-gray-100 text-gray-800 border border-gray-300 font-semibold shadow-xs'
                : 'bg-white text-[#4B5563] border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Duplicates ({filterCounts.DUPLICATE})
          </button>

          <button
            onClick={() => handleFilterChange('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentFilter === 'ALL'
                ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-blue-200 font-semibold shadow-xs'
                : 'bg-white text-[#4B5563] border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Full Ledger ({filterCounts.ALL})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-[#F9FAFB] dark:bg-[#141A27] border-b border-[#E5E7EB] dark:border-[#1E2638] text-[11px] font-sans font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
            <tr>
              <th className="py-3 px-3.5 cursor-pointer hover:text-[#1A1F36]" onClick={() => toggleSort('transaction_id')}>
                <div className="flex items-center gap-1">
                  <span>TRANSACTION ID</span>
                  <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                </div>
              </th>
              <th className="py-3 px-3.5 cursor-pointer hover:text-[#1A1F36]" onClick={() => toggleSort('vendor')}>
                <div className="flex items-center gap-1">
                  <span>COUNTERPARTY / ENTITY</span>
                  <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                </div>
              </th>
              <th className="py-3 px-3.5 text-right cursor-pointer hover:text-[#1A1F36]" onClick={() => toggleSort('amount')}>
                <div className="flex items-center justify-end gap-1">
                  <span>AMOUNT (₹)</span>
                  <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                </div>
              </th>
              <th className="py-3 px-3.5">CONFIDENCE</th>
              <th className="py-3 px-3.5">STATUS</th>
              <th className="py-3 px-3.5 text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] text-xs font-sans">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-[#6B7280] font-sans text-xs">
                  No records match the active filter criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map((row) => {
                const isSelected = selectedTxId === row.transaction_id;
                const hasDelta = row.amount_delta && Math.abs(row.amount_delta) > 0;
                const deltaVal = row.amount_delta || 0;

                return (
                  <tr
                    key={row.transaction_id}
                    onClick={() => onSelectTransaction(row)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#EFF6FF] border-l-4 border-[#2563EB]'
                        : 'hover:bg-[#F8FAFC] dark:hover:bg-[#141A27]'
                    } ${row.is_resolved ? 'opacity-60 bg-gray-50/50' : ''}`}
                  >
                    {/* 1. Transaction ID & Date */}
                    <td className="py-3 px-3.5">
                      <span className={`font-mono font-semibold ${isSelected ? 'text-[#1D4ED8]' : 'text-[#1A1F36]'}`}>
                        {row.transaction_id}
                      </span>
                      <span className="text-[11px] text-[#6B7280] block font-mono">
                        {row.date || '—'}
                      </span>
                    </td>

                    {/* 2. Counterparty / Entity */}
                    <td className="py-3 px-3.5 max-w-[200px]">
                      <div className="font-medium text-[#1A1F36] truncate font-sans" title={row.vendor}>
                        {row.vendor || 'Unknown Counterparty'}
                      </div>
                      <div className="text-[11px] text-[#6B7280] font-mono truncate">
                        Ref: {row.reference || 'N/A'}
                      </div>
                    </td>

                    {/* 3. Amount & Variance */}
                    <td className="py-3 px-3.5 text-right font-mono">
                      <div className="font-semibold text-[#1A1F36]">
                        ₹{row.amount ? row.amount.toLocaleString('en-IN') : '0'}
                      </div>
                      {hasDelta && (
                        <div className="text-[11px] text-rose-600 font-medium">
                          Δ {deltaVal > 0 ? `+₹${deltaVal.toLocaleString('en-IN')}` : `-₹${Math.abs(deltaVal).toLocaleString('en-IN')}`}
                        </div>
                      )}
                    </td>

                    {/* 4. Match Score */}
                    <td className="py-3 px-3.5">
                      {getConfidenceBadge(row.confidence_score || 50)}
                    </td>

                    {/* 5. Status */}
                    <td className="py-3 px-3.5">
                      {getStatusBadge(row.status)}
                    </td>

                    {/* 6. Action */}
                    <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      {row.is_resolved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200 font-medium">
                          <Check className="w-3 h-3" /> RESOLVED
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectTransaction(row)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white hover:bg-blue-50 text-[#1D4ED8] border border-blue-200 transition-all shadow-xs"
                        >
                          Inspect
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
