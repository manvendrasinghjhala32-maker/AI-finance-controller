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
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {score}% High
        </span>
      );
    } else if (score >= 50) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          {score}% Med
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          {score}% Low
        </span>
      );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> RECONCILED
          </span>
        );
      case 'AMOUNT_MISMATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> PRICE VARIANCE
          </span>
        );
      case 'DATE_MISMATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" /> TIMING DRIFT
          </span>
        );
      case 'MISSING_INVOICE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <FileQuestion className="w-3 h-3" /> UNBILLED
          </span>
        );
      case 'MULTIPLE_MATCHES':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" /> MULTI-MATCH
          </span>
        );
      case 'DUPLICATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <AlertTriangle className="w-3 h-3" /> DUPLICATE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-[#141A27] border border-[#1E2638]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="figma-card flex flex-col h-full overflow-hidden shadow-sm bg-[#111622] border border-[#1E2638]">
      {/* 1. Header Toolbar */}
      <div className="p-4 border-b border-[#1E2638] bg-[#111622]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Exception & Variance Ledger
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                {filterCounts.EXCEPTIONS} Unresolved
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Forensic audit of amounts, settlement timing offsets, and unmatched disbursements
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter ID, vendor, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#141A27] border border-[#1E2638] rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
              />
            </div>

            {onExport && (
              <button
                onClick={() => onExport('exceptions')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-300 bg-[#141A27] hover:bg-[#1B2335] hover:text-white border border-[#1E2638] rounded transition-colors shrink-0"
                title="Download Variance CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-0.5 text-xs">
          <button
            onClick={() => handleFilterChange('EXCEPTIONS')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap ${
              currentFilter === 'EXCEPTIONS'
                ? 'bg-[#182030] text-amber-400 border border-amber-500/30 font-semibold'
                : 'bg-[#141A27] text-slate-400 border border-[#1E2638] hover:bg-[#182030] hover:text-slate-200'
            }`}
          >
            Active Variances ({filterCounts.EXCEPTIONS})
          </button>

          <button
            onClick={() => handleFilterChange('AMOUNT')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap ${
              currentFilter === 'AMOUNT'
                ? 'bg-[#182030] text-rose-400 border border-rose-500/30 font-semibold'
                : 'bg-[#141A27] text-slate-400 border border-[#1E2638] hover:bg-[#182030] hover:text-slate-200'
            }`}
          >
            Price Deltas ({filterCounts.AMOUNT})
          </button>

          <button
            onClick={() => handleFilterChange('DATE')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap ${
              currentFilter === 'DATE'
                ? 'bg-[#182030] text-blue-400 border border-blue-500/30 font-semibold'
                : 'bg-[#141A27] text-slate-400 border border-[#1E2638] hover:bg-[#182030] hover:text-slate-200'
            }`}
          >
            Timing Drift ({filterCounts.DATE})
          </button>

          <button
            onClick={() => handleFilterChange('MISSING')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap ${
              currentFilter === 'MISSING'
                ? 'bg-[#182030] text-purple-400 border border-purple-500/30 font-semibold'
                : 'bg-[#141A27] text-slate-400 border border-[#1E2638] hover:bg-[#182030] hover:text-slate-200'
            }`}
          >
            Unbilled Items ({filterCounts.MISSING})
          </button>

          {filterCounts.MULTIPLE > 0 && (
            <button
              onClick={() => handleFilterChange('MULTIPLE')}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap ${
                currentFilter === 'MULTIPLE'
                  ? 'bg-[#182030] text-amber-300 border border-amber-500/30 font-semibold'
                  : 'bg-[#141A27] text-slate-400 border border-[#1E2638] hover:bg-[#182030] hover:text-slate-200'
              }`}
            >
              Multi-Match ({filterCounts.MULTIPLE})
            </button>
          )}

          <button
            onClick={() => handleFilterChange('DUPLICATE')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap ${
              currentFilter === 'DUPLICATE'
                ? 'bg-[#182030] text-slate-300 border border-slate-500/30 font-semibold'
                : 'bg-[#141A27] text-slate-400 border border-[#1E2638] hover:bg-[#182030] hover:text-slate-200'
            }`}
          >
            Duplicates ({filterCounts.DUPLICATE})
          </button>

          <button
            onClick={() => handleFilterChange('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap ${
              currentFilter === 'ALL'
                ? 'bg-[#182030] text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'bg-[#141A27] text-slate-400 border border-[#1E2638] hover:bg-[#182030] hover:text-slate-200'
            }`}
          >
            Full Ledger ({filterCounts.ALL})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto bg-[#0E131E]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0E131E] border-b border-[#1E2638] text-[10px] font-mono uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort('transaction_id')}>
                <div className="flex items-center gap-1">
                  <span>TRANSACTION ID</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-2.5 px-3 font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort('vendor')}>
                <div className="flex items-center gap-1">
                  <span>COUNTERPARTY / ENTITY</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:text-white" onClick={() => toggleSort('amount')}>
                <div className="flex items-center justify-end gap-1">
                  <span>AMOUNT (₹)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-2.5 px-3 font-semibold">CONFIDENCE</th>
              <th className="py-2.5 px-3 font-semibold">STATUS</th>
              <th className="py-2.5 px-3 font-semibold text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2638] text-xs">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-10 text-center text-slate-400 font-mono text-xs">
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
                        ? 'bg-[#161E2E] border-l-2 border-emerald-500'
                        : 'hover:bg-[#141A27]'
                    } ${row.is_resolved ? 'opacity-50' : ''}`}
                  >
                    {/* 1. Transaction ID & Date */}
                    <td className="py-2.5 px-3">
                      <span className={`font-mono font-semibold ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {row.transaction_id}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {row.date || '—'}
                      </span>
                    </td>

                    {/* 2. Counterparty / Entity */}
                    <td className="py-2.5 px-3 max-w-[200px]">
                      <div className="font-medium text-white truncate font-sans" title={row.vendor}>
                        {row.vendor || 'Unknown Counterparty'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        Ref: {row.reference || 'N/A'}
                      </div>
                    </td>

                    {/* 3. Amount & Variance */}
                    <td className="py-2.5 px-3 text-right font-mono">
                      <div className="font-semibold text-white">
                        ₹{row.amount ? row.amount.toLocaleString('en-IN') : '0'}
                      </div>
                      {hasDelta && (
                        <div className="text-[10px] text-rose-400 font-medium">
                          Δ {deltaVal > 0 ? `+₹${deltaVal.toLocaleString('en-IN')}` : `-₹${Math.abs(deltaVal).toLocaleString('en-IN')}`}
                        </div>
                      )}
                    </td>

                    {/* 4. Match Score */}
                    <td className="py-2.5 px-3">
                      {getConfidenceBadge(row.confidence_score || 50)}
                    </td>

                    {/* 5. Status */}
                    <td className="py-2.5 px-3">
                      {getStatusBadge(row.status)}
                    </td>

                    {/* 6. Action */}
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {row.is_resolved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                          <Check className="w-3 h-3" /> RESOLVED
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectTransaction(row)}
                          className="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-[#141A27] hover:bg-[#1C2436] text-emerald-400 border border-[#1E2638] hover:border-emerald-500/30 transition-colors"
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
