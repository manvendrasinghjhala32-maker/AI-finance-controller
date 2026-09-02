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
    if (!records) return { EXCEPTIONS: 0, ALL: 0, AMOUNT: 0, DATE: 0, MISSING: 0, DUPLICATE: 0 };
    return {
      EXCEPTIONS: records.filter(r => !['MATCH', 'DUPLICATE'].includes(r.status)).length,
      ALL: records.length,
      AMOUNT: records.filter(r => r.status === 'AMOUNT_MISMATCH').length,
      DATE: records.filter(r => r.status === 'DATE_MISMATCH').length,
      MISSING: records.filter(r => r.status === 'MISSING_INVOICE').length,
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
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-[#2F2F2F] text-emerald-400 border border-emerald-500/30">
          {score}% High
        </span>
      );
    } else if (score >= 50) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-[#2F2F2F] text-amber-400 border border-amber-500/30">
          {score}% Med
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-[#2F2F2F] text-rose-400 border border-rose-500/30">
          {score}% Low
        </span>
      );
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-[#2F2F2F] text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> MATCHED
          </span>
        );
      case 'AMOUNT_MISMATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-[#2F2F2F] text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" /> PRICE DELTA
          </span>
        );
      case 'DATE_MISMATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-[#2F2F2F] text-cyan-400 border border-cyan-500/30">
            <Clock className="w-3 h-3" /> DATE DELAY
          </span>
        );
      case 'MISSING_INVOICE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-[#2F2F2F] text-rose-400 border border-rose-500/30">
            <FileQuestion className="w-3 h-3" /> MISSING BILL
          </span>
        );
      case 'DUPLICATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-[#2F2F2F] text-purple-400 border border-purple-500/30">
            <AlertTriangle className="w-3 h-3" /> DUPLICATE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono text-slate-400 bg-[#2F2F2F] border border-[#3A3A3A]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="figma-card flex flex-col h-full overflow-hidden shadow-xl bg-[#171717] border border-[#2F2F2F]">
      {/* 1. Header Toolbar */}
      <div className="p-4 sm:p-5 border-b border-[#2F2F2F] bg-[#171717]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-white tracking-wide">
                Differences & Issues List
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#2F2F2F] text-amber-400 border border-amber-500/30 font-semibold">
                {filterCounts.EXCEPTIONS} Items to Fix
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Search, filter, and inspect payment differences, date delays, or missing bills
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transaction ID, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#2F2F2F] border border-[#3A3A3A] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
              />
            </div>

            {onExport && (
              <button
                onClick={() => onExport('exceptions')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#2F2F2F] hover:bg-[#3A3A3A] hover:text-white border border-[#3A3A3A] rounded-lg transition-colors shrink-0"
                title="Download Issues CSV"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono">CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-2 mt-3.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => handleFilterChange('EXCEPTIONS')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap font-mono ${
              currentFilter === 'EXCEPTIONS'
                ? 'bg-[#2F2F2F] text-amber-400 border border-amber-500/40 font-bold shadow-sm'
                : 'bg-[#212121] text-slate-400 border border-[#2F2F2F] hover:bg-[#3A3A3A] hover:text-slate-100'
            }`}
          >
            Issues to Fix ({filterCounts.EXCEPTIONS})
          </button>

          <button
            onClick={() => handleFilterChange('AMOUNT')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap font-mono ${
              currentFilter === 'AMOUNT'
                ? 'bg-[#2F2F2F] text-amber-400 border border-amber-500/40 font-bold shadow-sm'
                : 'bg-[#212121] text-slate-400 border border-[#2F2F2F] hover:bg-[#3A3A3A] hover:text-slate-100'
            }`}
          >
            Price Differences ({filterCounts.AMOUNT})
          </button>

          <button
            onClick={() => handleFilterChange('DATE')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap font-mono ${
              currentFilter === 'DATE'
                ? 'bg-[#2F2F2F] text-cyan-400 border border-cyan-500/40 font-bold shadow-sm'
                : 'bg-[#212121] text-slate-400 border border-[#2F2F2F] hover:bg-[#3A3A3A] hover:text-slate-100'
            }`}
          >
            Date Delays ({filterCounts.DATE})
          </button>

          <button
            onClick={() => handleFilterChange('MISSING')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap font-mono ${
              currentFilter === 'MISSING'
                ? 'bg-[#2F2F2F] text-rose-400 border border-rose-500/40 font-bold shadow-sm'
                : 'bg-[#212121] text-slate-400 border border-[#2F2F2F] hover:bg-[#3A3A3A] hover:text-slate-100'
            }`}
          >
            Missing Bills ({filterCounts.MISSING})
          </button>

          <button
            onClick={() => handleFilterChange('DUPLICATE')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap font-mono ${
              currentFilter === 'DUPLICATE'
                ? 'bg-[#2F2F2F] text-purple-400 border border-purple-500/40 font-bold shadow-sm'
                : 'bg-[#212121] text-slate-400 border border-[#2F2F2F] hover:bg-[#3A3A3A] hover:text-slate-100'
            }`}
          >
            Duplicates ({filterCounts.DUPLICATE})
          </button>

          <button
            onClick={() => handleFilterChange('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap font-mono ${
              currentFilter === 'ALL'
                ? 'bg-[#2F2F2F] text-white border border-emerald-500/40 font-bold shadow-sm'
                : 'bg-[#212121] text-slate-400 border border-[#2F2F2F] hover:bg-[#3A3A3A] hover:text-slate-100'
            }`}
          >
            All Records ({filterCounts.ALL})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto bg-[#171717]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-[#171717] border-b border-[#2F2F2F] text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-3 px-4 font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort('transaction_id')}>
                <div className="flex items-center gap-1">
                  <span>TRANSACTION ID</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-4 font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort('vendor')}>
                <div className="flex items-center gap-1">
                  <span>CUSTOMER / SELLER</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white" onClick={() => toggleSort('amount')}>
                <div className="flex items-center justify-end gap-1">
                  <span>AMOUNT (₹)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-4 font-semibold">MATCH SCORE</th>
              <th className="py-3 px-4 font-semibold">STATUS</th>
              <th className="py-3 px-4 font-semibold text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2F2F2F] text-xs">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-slate-400 font-mono">
                  No records match the selected criteria.
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
                        ? 'bg-[#2F2F2F] border-l-4 border-emerald-500'
                        : 'hover:bg-[#3A3A3A]/40'
                    } ${row.is_resolved ? 'opacity-50' : ''}`}
                  >
                    {/* 1. Transaction ID & Date */}
                    <td className="py-3 px-4">
                      <span className={`font-mono font-bold ${isSelected ? 'text-emerald-400' : 'text-slate-100'}`}>
                        {row.transaction_id}
                      </span>
                      <span className="text-[11px] text-slate-400 block font-mono">
                        {row.date || '—'}
                      </span>
                    </td>

                    {/* 2. Company / Description */}
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="font-semibold text-white truncate" title={row.vendor}>
                        {row.vendor || 'Unknown Customer'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        Ref: {row.reference || 'N/A'}
                      </div>
                    </td>

                    {/* 3. Amount & Variance */}
                    <td className="py-3 px-4 text-right font-mono">
                      <div className="font-bold text-white">
                        ₹{row.amount ? row.amount.toLocaleString('en-IN') : '0'}
                      </div>
                      {hasDelta && (
                        <div className="text-[11px] text-amber-400 font-semibold">
                          Δ {deltaVal > 0 ? `+₹${deltaVal.toLocaleString('en-IN')}` : `-₹${Math.abs(deltaVal).toLocaleString('en-IN')}`}
                        </div>
                      )}
                    </td>

                    {/* 4. Match Score */}
                    <td className="py-3 px-4">
                      {getConfidenceBadge(row.confidence_score || 50)}
                    </td>

                    {/* 5. Status */}
                    <td className="py-3 px-4">
                      {getStatusBadge(row.status)}
                    </td>

                    {/* 6. Action */}
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {row.is_resolved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 px-2.5 py-1 bg-[#2F2F2F] rounded-md border border-emerald-500/30">
                          <Check className="w-3 h-3" /> RESOLVED
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectTransaction(row)}
                          className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded-md bg-[#2F2F2F] hover:bg-[#3A3A3A] text-emerald-400 border border-[#3A3A3A] hover:border-emerald-500/40 transition-colors"
                        >
                          Review
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
